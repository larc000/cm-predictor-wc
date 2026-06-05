'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import quinelaLogo from '@/assets/QuinelaLogo.png';
import { allowedEmailDomain, isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  formatMatchDate,
  getMatchDateGroup,
  getMatchDateKey,
  getStageLabel,
  isAllowedEmail,
  mergeMatchesWithPredictions
} from '@/lib/domain';
import type { AppUser, LeaderboardRow, Match, MatchWithPrediction, Prediction } from '@/lib/types';

type Tab = 'quiniela' | 'reglas' | 'ranking';
type AuthMode = 'sign-in' | 'sign-up';
type DraftScores = Record<string, { a: string; b: string }>;
type EditingMap = Record<string, boolean>;

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('quiniela');
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [matches, setMatches] = useState<MatchWithPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [draftScores, setDraftScores] = useState<DraftScores>({});
  const [editing, setEditing] = useState<EditingMap>({});
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [savingMatchId, setSavingMatchId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null;
      setSessionUser(nextUser);
      if (!nextUser) {
        clearSessionData();
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setSessionUser(nextUser);
      if (!nextUser) {
        clearSessionData();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionUser) {
      loadProfileAndData(sessionUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser]);

  useEffect(() => {
    if (toast) {
      const timeout = window.setTimeout(() => setToast(''), 2500);
      return () => window.clearTimeout(timeout);
    }
  }, [toast]);

  const groupedMatches = useMemo(() => {
    const timezone = appUser?.timezone || 'America/Costa_Rica';

    return [...matches]
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
      .reduce<Record<string, MatchWithPrediction[]>>((groups, match) => {
        const key = getMatchDateKey(match.date_time, timezone);
        groups[key] = groups[key] || [];
        groups[key].push(match);
        return groups;
      }, {});
  }, [matches, appUser?.timezone]);

  const myPoints = useMemo(() => {
    const leaderboardRow = leaderboard.find((row) => row.user_id === appUser?.id);

    if (leaderboardRow) {
      return leaderboardRow.points || 0;
    }

    return matches.reduce((total, match) => total + (Number(match.myPoints) || 0), 0);
  }, [appUser?.id, leaderboard, matches]);

  async function loadProfileAndData(user: User) {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado.');
      }

      const email = user.email || '';

      if (!isAllowedEmail(email, allowedEmailDomain)) {
        await supabase.auth.signOut();
        throw new Error(`Debes ingresar con un correo @${allowedEmailDomain}.`);
      }

      const profile = await ensureProfile(user);

      if (!profile.active) {
        setAppUser(profile);
        throw new Error('Tu usuario está inactivo.');
      }

      setAppUser(profile);
      await Promise.all([loadMatches(profile), loadLeaderboard().catch(() => undefined)]);
    } catch (caught) {
      const nextError = getErrorMessage(caught);
      setError(nextError);

      if (shouldReturnToAuth(nextError) && supabase) {
        await supabase.auth.signOut();
        setSessionUser(null);
        clearSessionData();
      }
    } finally {
      setLoading(false);
    }
  }

  async function ensureProfile(user: User) {
    if (!supabase) {
      throw new Error('Supabase no está configurado.');
    }

    const email = (user.email || '').trim().toLowerCase();
    const { data: linkedProfile, error: linkedError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (linkedError) {
      throw linkedError;
    }

    if (linkedProfile) {
      return linkedProfile as AppUser;
    }

    const { data: allowedProfile, error: allowedError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (allowedError) {
      throw allowedError;
    }

    if (!allowedProfile) {
      throw new Error('Tu correo no está registrado para participar en la quiniela.');
    }

    const profile = allowedProfile as AppUser;

    if (profile.auth_user_id && profile.auth_user_id !== user.id) {
      throw new Error('Este correo ya está vinculado a otra cuenta.');
    }

    const name =
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      email.split('@')[0];

    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({
        auth_user_id: user.id,
        name: profile.name || name
      })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedProfile as AppUser;
  }

  async function loadMatches(profile = appUser) {
    if (!supabase || !profile) {
      return;
    }

    const [{ data: matchRows, error: matchesError }, { data: predictionRows, error: predictionsError }] =
      await Promise.all([
        supabase.from('matches').select('*').order('date_time', { ascending: true }),
        supabase.from('predictions').select('*').eq('user_id', profile.id)
      ]);

    if (matchesError) {
      throw matchesError;
    }

    if (predictionsError) {
      throw predictionsError;
    }

    const merged = mergeMatchesWithPredictions(
      (matchRows || []) as Match[],
      (predictionRows || []) as Prediction[]
    );

    setMatches(merged);

    const nextDrafts: DraftScores = {};
    merged.forEach((match) => {
      nextDrafts[match.match_id] = {
        a: match.myPredScoreA === '' ? '' : String(match.myPredScoreA),
        b: match.myPredScoreB === '' ? '' : String(match.myPredScoreB)
      };
    });
    setDraftScores(nextDrafts);
    setEditing({});
  }

  async function loadLeaderboard() {
    if (!supabase) {
      return;
    }

    setLeaderboardLoading(true);
    setLeaderboardError('');

    try {
      const { data, error: leaderboardQueryError } = await fetchLeaderboardRows();

      if (leaderboardQueryError) {
        throw leaderboardQueryError;
      }

      const rows = ((data || []) as LeaderboardRow[])
        .map((row) => ({
          ...row,
          points: Number(row.points) || 0
        }))
        .sort((a, b) => b.points - a.points);

      setLeaderboard(rows);
    } catch (caught) {
      setLeaderboardError(getErrorMessage(caught));
      throw caught;
    } finally {
      setLeaderboardLoading(false);
    }
  }

  async function fetchLeaderboardRows() {
    if (!supabase) {
      return { data: [], error: null };
    }

    const rpcResult = await supabase.rpc('get_leaderboard');

    if (!rpcResult.error || !isMissingDatabaseFunction(rpcResult.error)) {
      return rpcResult;
    }

    return supabase
      .from('leaderboard')
      .select('user_id,email,name,points')
      .order('points', { ascending: false });
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!supabase) {
      setError('Supabase no está configurado.');
      return;
    }

    if (!isAllowedEmail(authForm.email, allowedEmailDomain)) {
      setError(`Usa tu correo corporativo @${allowedEmailDomain}.`);
      return;
    }

    if (authMode === 'sign-up') {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          data: {
            name: authForm.name
          }
        }
      });

      if (signUpError) {
        setError(getErrorMessage(signUpError));
        return;
      }

      if (!data.session) {
        setError(
          'La cuenta se creó, pero Supabase no inició sesión automáticamente. Desactiva "Confirm email" en Supabase Auth para que el registro no dependa de correos.'
        );
        return;
      }

      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    });

    if (signInError) {
      setError(getErrorMessage(signInError));
    }
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSessionUser(null);
    clearSessionData();
  }

  function clearSessionData() {
    setAppUser(null);
    setMatches([]);
    setLeaderboard([]);
    setLeaderboardError('');
    setLeaderboardLoading(false);
    setDraftScores({});
    setEditing({});
  }

  function updateDraft(matchId: string, side: 'a' | 'b', value: string) {
    setDraftScores((current) => ({
      ...current,
      [matchId]: {
        a: current[matchId]?.a || '',
        b: current[matchId]?.b || '',
        [side]: value
      }
    }));
  }

  async function submitPrediction(match: MatchWithPrediction) {
    if (!supabase || !appUser) {
      return;
    }

    const draft = draftScores[match.match_id] || { a: '', b: '' };

    if (draft.a === '' || draft.b === '') {
      setToast('Completa el marcador.');
      return;
    }

    setSavingMatchId(match.match_id);

    try {
      const { error: upsertError } = await supabase.from('predictions').upsert(
        {
          user_id: appUser.id,
          match_id: match.match_id,
          pred_score_a: Number(draft.a),
          pred_score_b: Number(draft.b),
          submitted_at: new Date().toISOString(),
          points: 0
        },
        {
          onConflict: 'user_id,match_id'
        }
      );

      if (upsertError) {
        throw upsertError;
      }

      setToast(match.hasPrediction ? 'Pronóstico actualizado.' : 'Pronóstico guardado.');
      await Promise.all([
        loadMatches(),
        activeTab === 'ranking' ? loadLeaderboard().catch(() => undefined) : Promise.resolve()
      ]);
    } catch (caught) {
      setToast(getErrorMessage(caught));
    } finally {
      setSavingMatchId('');
    }
  }

  function startEdit(match: MatchWithPrediction) {
    setEditing((current) => ({
      ...current,
      [match.match_id]: true
    }));
  }

  function cancelEdit(match: MatchWithPrediction) {
    setDraftScores((current) => ({
      ...current,
      [match.match_id]: {
        a: match.myPredScoreA === '' ? '' : String(match.myPredScoreA),
        b: match.myPredScoreB === '' ? '' : String(match.myPredScoreB)
      }
    }));
    setEditing((current) => ({
      ...current,
      [match.match_id]: false
    }));
  }

  function changeTab(tab: Tab) {
    setActiveTab(tab);

    if (tab === 'ranking' && appUser) {
      loadLeaderboard().catch(() => undefined);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Shell appUser={appUser} onSignOut={signOut}>
        <div className="notice">
          <h3>Falta configurar Supabase</h3>
          <p>
            Crea <strong>app/.env.local</strong> usando <strong>app/.env.example</strong> como base.
          </p>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell appUser={appUser} onSignOut={signOut}>
        <div className="notice">Cargando...</div>
      </Shell>
    );
  }

  if (sessionUser && appUser && !appUser.active) {
    return (
      <Shell appUser={appUser} onSignOut={signOut}>
        <div className="notice">
          <h3>Usuario inactivo</h3>
          <p>Tu cuenta existe, pero está inactiva para participar en la quiniela.</p>
        </div>
      </Shell>
    );
  }

  if (!sessionUser) {
    return (
      <Shell appUser={appUser} onSignOut={signOut}>
        <AuthCard
          authMode={authMode}
          form={authForm}
          error={error}
          message={message}
          onModeChange={setAuthMode}
          onFormChange={setAuthForm}
          onSubmit={handleAuth}
        />
      </Shell>
    );
  }

  return (
    <Shell appUser={appUser} onSignOut={signOut}>
      <div className="sticky-nav">
        <nav className="tabs" aria-label="Secciones">
          <button
            className={`tab-button ${activeTab === 'quiniela' ? 'active' : ''}`}
            type="button"
            onClick={() => changeTab('quiniela')}
          >
            Mi Quiniela
          </button>
          <button
            className={`tab-button ${activeTab === 'reglas' ? 'active' : ''}`}
            type="button"
            onClick={() => changeTab('reglas')}
          >
            Reglas
          </button>
          <button
            className={`tab-button ${activeTab === 'ranking' ? 'active' : ''}`}
            type="button"
            onClick={() => changeTab('ranking')}
          >
            Ranking
          </button>
        </nav>

        <div className="score-summary" aria-label="Mi puntaje">
          <span>Mi Puntaje</span>
          <strong>{myPoints} pts</strong>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {activeTab === 'quiniela' ? (
        <section>
          <div className="section-heading">
            <div>
              <h2>Mi Quiniela</h2>
              <p className="section-copy">Tus marcadores, estados y puntos por partido.</p>
            </div>
          </div>
          {Object.keys(groupedMatches).length === 0 ? (
            <div className="notice">No hay partidos disponibles.</div>
          ) : (
            Object.keys(groupedMatches)
              .sort()
              .map((dateKey) => (
                <div key={dateKey}>
                  <h3 className="group-title">
                    {getMatchDateGroup(
                      groupedMatches[dateKey][0].date_time,
                      appUser?.timezone || 'America/Costa_Rica'
                    )}
                  </h3>
                  {groupedMatches[dateKey].map((match) => (
                    <MatchCard
                      key={match.match_id}
                      match={match}
                      draft={draftScores[match.match_id] || { a: '', b: '' }}
                      editing={Boolean(editing[match.match_id])}
                      saving={savingMatchId === match.match_id}
                      timezone={appUser?.timezone || 'America/Costa_Rica'}
                      onDraftChange={updateDraft}
                      onSubmit={submitPrediction}
                      onEdit={startEdit}
                      onCancel={cancelEdit}
                    />
                  ))}
                </div>
              ))
          )}
        </section>
      ) : null}

      {activeTab === 'reglas' ? <Rules /> : null}

      {activeTab === 'ranking' ? (
        <Ranking
          leaderboard={leaderboard}
          loading={leaderboardLoading}
          error={leaderboardError}
          onRefresh={() => loadLeaderboard().catch(() => undefined)}
        />
      ) : null}

      <div id="toast" style={{ display: toast ? 'block' : 'none' }}>
        {toast}
      </div>
    </Shell>
  );
}

function Shell({
  appUser,
  onSignOut,
  children
}: {
  appUser: AppUser | null;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Image
            className="brand-mark"
            src={quinelaLogo}
            alt="Quiniela CM LATAM"
            priority
          />
          <div>
            <h1>Quiniela Mundialista 2026</h1>
            <p className="subtitle">Pronostica el resultado, suma puntos y demuestra quién es el verdadero experto del Mundial</p>
          </div>
        </div>

        <div className="account-box">
        
          <strong>{appUser?.name || (appUser ? appUser.email : 'Sin sesión')}</strong>
          <small>{appUser?.email || `Requiere correo @${allowedEmailDomain}`}</small>
          {appUser ? (
            <button className="button subtle" type="button" onClick={onSignOut}>
              Salir
            </button>
          ) : null}
        </div>
      </header>

      {children}
    </main>
  );
}

function AuthCard({
  authMode,
  form,
  error,
  message,
  onModeChange,
  onFormChange,
  onSubmit
}: {
  authMode: AuthMode;
  form: { name: string; email: string; password: string };
  error: string;
  message: string;
  onModeChange: (mode: AuthMode) => void;
  onFormChange: (form: { name: string; email: string; password: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="auth-card">
      <h2>{authMode === 'sign-in' ? 'Ingresar' : 'Crear cuenta'}</h2>
      <p className="section-copy">Usa tu correo corporativo @{allowedEmailDomain}.</p>

      <form className="form-stack" onSubmit={onSubmit}>
        {authMode === 'sign-up' ? (
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              required
            />
          </div>
        ) : null}

        <div className="form-field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => onFormChange({ ...form, email: event.target.value })}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => onFormChange({ ...form, password: event.target.value })}
            required
          />
        </div>

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}

        <button className="button" type="submit">
          {authMode === 'sign-in' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </form>

      <button
        className="button subtle"
        type="button"
        onClick={() => onModeChange(authMode === 'sign-in' ? 'sign-up' : 'sign-in')}
      >
        {authMode === 'sign-in' ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}
      </button>
    </section>
  );
}

function MatchCard({
  match,
  draft,
  editing,
  saving,
  timezone,
  onDraftChange,
  onSubmit,
  onEdit,
  onCancel
}: {
  match: MatchWithPrediction;
  draft: { a: string; b: string };
  editing: boolean;
  saving: boolean;
  timezone: string;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
  onSubmit: (match: MatchWithPrediction) => void;
  onEdit: (match: MatchWithPrediction) => void;
  onCancel: (match: MatchWithPrediction) => void;
}) {
  const saved = match.hasPrediction;
  const inputDisabled = !match.canEdit || (saved && !editing);
  const normalizedStatus = match.status.toLowerCase();

  const statusClass =
    normalizedStatus === 'open'
      ? 'status-open'
      : normalizedStatus === 'final'
        ? 'status-final'
        : normalizedStatus === 'pending_teams'
          ? 'status-pending'
          : 'status-closed';
  const pointsLabel = !saved
    ? 'Sin pronóstico'
    : normalizedStatus === 'final'
      ? `Puntos: ${match.myPoints || 0}`
      : 'Puntos pendientes';

  return (
    <article className="match">
      <div className="match-header">
        <div>
          <div className="match-stage">
            {getStageLabel(match.stage)}
            {match.group_name ? ` - Grupo ${match.group_name}` : ''}
          </div>

          <div className="teams">
            {match.team_a} vs {match.team_b}
          </div>
          <div className="date">Fecha: {formatMatchDate(match.date_time, timezone)}</div>
          <div className="match-meta">
            <span className={`status-chip ${statusClass}`}>{getStatusLabel(match.status)}</span>
            <span className="points-chip">{pointsLabel}</span>
          </div>
          {normalizedStatus === 'final' && match.score_a !== null && match.score_b !== null ? (
            <div className="match-note">
              Resultado final: {match.team_a} {match.score_a} - {match.score_b} {match.team_b}
            </div>
          ) : null}
        </div>
      </div>

      <div className="prediction-row">
        <div className="score-box">
          <label>{match.team_a}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={draft.a}
            disabled={inputDisabled}
            onChange={(event) => onDraftChange(match.match_id, 'a', onlyDigits(event.target.value))}
          />
        </div>

        <div className="separator">-</div>

        <div className="score-box">
          <label>{match.team_b}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={draft.b}
            disabled={inputDisabled}
            onChange={(event) => onDraftChange(match.match_id, 'b', onlyDigits(event.target.value))}
          />
        </div>

        <div className="actions">
          {!saved || editing ? (
            <button
              className="button"
              type="button"
              disabled={!match.canEdit || saving}
              onClick={() => onSubmit(match)}
            >
              {saving ? 'Guardando...' : saved ? 'Guardar cambios' : 'Guardar'}
            </button>
          ) : null}

          {saved && match.canEdit && !editing ? (
            <button className="button secondary" type="button" onClick={() => onEdit(match)}>
              Editar
            </button>
          ) : null}

          {saved && editing ? (
            <button className="button secondary" type="button" onClick={() => onCancel(match)}>
              Cancelar
            </button>
          ) : null}

          {saved && !match.canEdit ? (
            <button className="button" type="button" disabled>
              Guardado
            </button>
          ) : null}
        </div>
      </div>

      {!match.canEdit ? <div className="match-note">{match.lockReason}</div> : null}
    </article>
  );
}

function Rules() {
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Reglas</h2>
          <p className="section-copy">Es importante tener en cuenta las siguientes reglas para participar en la quiniela:</p>
        </div>
      </div>
      <h3>General</h3>
      <div className="rules-grid">
        <div className="rule-card">
          <strong>24 h</strong>
          <p>Antes del partido se bloquea el registro y la edición.</p>
        </div>
      </div>

      <h3>Puntuación - FASE DE GRUPOS</h3>
      <div className="rules-grid">
        
        <div className="rule-card">
          <strong>+1 pt</strong>
          <p>Por acertar el resultado: ganador, perdedor o empate.</p>
        </div>
        <div className="rule-card">
          <strong>+2 pts</strong>
          <p>Extra por acertar el marcador exacto del partido.</p>
        </div>
      </div>

      <h3>Puntuación - FASE DE ELIMINACIÓN DIRECTA (dieciseisavos, octavos, cuartos, semifinales y final)</h3>
      <div className="rules-grid">
        
        <div className="rule-card">
          <strong>+1 pt</strong>
          <p>Por acertar el resultado: ganador, perdedor o empate.</p>
        </div>
        <div className="rule-card">
          <strong>+2 pts</strong>
          <p>Extra por acertar el marcador exacto del partido.</p>
        </div>
        <div className="rule-card">
          <strong>+1 pt</strong>
          <p>Por acertar ganador en caso de penales.</p>
        </div>
      </div>
      <h3>Importante sobre la fase de eliminación directa</h3>
      <p>
        <ul>
          <li>En la fase de eliminación directa, si el usuario predice un empate (por ejemplo 2-2) para un partido que termina empatado en el tiempo regular, entonces su predicción avanzará a la ronda de penales.</li>
          <li>Si el usuario predice un ganador directo (por ejemplo 2-1) para un partido que termina empatado en el tiempo regular, entonces su predicción no avanzará a la ronda de penales y no podrá ganar puntos por esa fase.</li>
        </ul>
      </p>
    </section>
  );
}

function Ranking({
  leaderboard,
  loading,
  error,
  onRefresh
}: {
  leaderboard: LeaderboardRow[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Ranking</h2>
          <p className="section-copy">Puntos acumulados por participante.</p>
        </div>
        <button className="button subtle" type="button" disabled={loading} onClick={onRefresh}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div className="leaderboard">
        {error ? (
          <div className="notice error">No se pudo cargar el ranking: {error}</div>
        ) : loading && leaderboard.length === 0 ? (
          <div className="notice">Cargando ranking...</div>
        ) : leaderboard.length === 0 ? (
          <div className="notice">Todavía no hay participantes en el ranking.</div>
        ) : (
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Posición</th>
                <th>Participante</th>
                <th className="points-cell">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr key={row.user_id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{row.name || row.email}</strong>
                    <br />
                    <small>{row.email}</small>
                  </td>
                  <td className="points-cell">{row.points || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function getStatusLabel(status: string) {
  const value = status.toLowerCase();

  if (value === 'open') return 'Abierto';
  if (value === 'pending_teams') return 'Equipos por definir';
  if (value === 'final') return 'Final';
  return 'Cerrado';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return normalizeSupabaseMessage(error.message);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim() !== '') {
      return normalizeSupabaseMessage(message);
    }
  }

  return 'Ocurrió un error inesperado.';
}

function normalizeSupabaseMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return 'Tu cuenta existe, pero Supabase todavía está pidiendo confirmación por correo. Desactiva "Confirm email" en Supabase Auth.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'Este correo ya tiene cuenta. Ingresa con tu contraseña.';
  }

  return message;
}

function shouldReturnToAuth(message: string) {
  return (
    message.includes('no está registrado') ||
    message.includes('ya está vinculado') ||
    message.includes('Debes ingresar con un correo')
  );
}

function isMissingDatabaseFunction(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message || '') : '';

  return code === 'PGRST202' || message.includes('get_leaderboard');
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}
