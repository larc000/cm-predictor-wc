'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { allowedEmailDomain, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { formatMatchDate, isAllowedEmail, mergeMatchesWithPredictions } from '@/lib/domain';
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
    return matches.reduce<Record<string, MatchWithPrediction[]>>((groups, match) => {
      const group = match.group_name || 'Sin grupo';
      groups[group] = groups[group] || [];
      groups[group].push(match);
      return groups;
    }, {});
  }, [matches]);

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
      await Promise.all([loadMatches(profile), loadLeaderboard()]);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function ensureProfile(user: User) {
    if (!supabase) {
      throw new Error('Supabase no está configurado.');
    }

    const email = user.email || '';
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return existing as AppUser;
    }

    const name =
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      email.split('@')[0];

    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email,
        name,
        role: 'Player',
        active: true
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    return inserted as AppUser;
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

    const { data, error: leaderboardError } = await supabase
      .from('leaderboard')
      .select('*')
      .order('points', { ascending: false });

    if (leaderboardError) {
      throw leaderboardError;
    }

    setLeaderboard((data || []) as LeaderboardRow[]);
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
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setMessage('Revisa tu correo para confirmar la cuenta.');
      }

      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    });

    if (signInError) {
      setError(signInError.message);
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
      await Promise.all([loadMatches(), activeTab === 'ranking' ? loadLeaderboard() : Promise.resolve()]);
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
      loadLeaderboard().catch((caught) => setError(getErrorMessage(caught)));
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
              .map((group) => (
                <div key={group}>
                  <h3 className="group-title">Grupo {group}</h3>
                  {groupedMatches[group].map((match) => (
                    <MatchCard
                      key={match.match_id}
                      match={match}
                      draft={draftScores[match.match_id] || { a: '', b: '' }}
                      editing={Boolean(editing[match.match_id])}
                      saving={savingMatchId === match.match_id}
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

      {activeTab === 'ranking' ? <Ranking leaderboard={leaderboard} /> : null}

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
        <div>
          <h1>Quiniela Mundialista 2026 - CM LATAM</h1>
          <p className="subtitle">Registra y edita tus marcadores antes del cierre de cada partido.</p>
        </div>

        <div className="account-box">
          <span>Mi cuenta</span>
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
  onDraftChange,
  onSubmit,
  onEdit,
  onCancel
}: {
  match: MatchWithPrediction;
  draft: { a: string; b: string };
  editing: boolean;
  saving: boolean;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
  onSubmit: (match: MatchWithPrediction) => void;
  onEdit: (match: MatchWithPrediction) => void;
  onCancel: (match: MatchWithPrediction) => void;
}) {
  const saved = match.hasPrediction;
  const inputDisabled = !match.canEdit || (saved && !editing);
  const statusClass =
    match.status === 'Open' ? 'status-open' : match.status === 'Final' ? 'status-final' : 'status-closed';
  const pointsLabel = !saved
    ? 'Sin pronóstico'
    : match.status === 'Final'
      ? `Puntos: ${match.myPoints || 0}`
      : 'Puntos pendientes';

  return (
    <article className="match">
      <div className="match-header">
        <div>
          <div className="teams">
            {match.team_a} vs {match.team_b}
          </div>
          <div className="date">Fecha: {formatMatchDate(match.date_time)}</div>
          <div className="match-meta">
            <span className={`status-chip ${statusClass}`}>{getStatusLabel(match.status)}</span>
            <span className="points-chip">{pointsLabel}</span>
          </div>
          {match.status === 'Final' && match.score_a !== null && match.score_b !== null ? (
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
            type="number"
            min="0"
            value={draft.a}
            disabled={inputDisabled}
            onChange={(event) => onDraftChange(match.match_id, 'a', event.target.value)}
          />
        </div>

        <div className="separator">-</div>

        <div className="score-box">
          <label>{match.team_b}</label>
          <input
            type="number"
            min="0"
            value={draft.b}
            disabled={inputDisabled}
            onChange={(event) => onDraftChange(match.match_id, 'b', event.target.value)}
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
          <p className="section-copy">La edición cierra 24 horas antes de cada partido.</p>
        </div>
      </div>

      <div className="rules-grid">
        <div className="rule-card">
          <strong>3 pts</strong>
          <p>Por acertar el resultado: ganador, perdedor o empate.</p>
        </div>
        <div className="rule-card">
          <strong>+2 pts</strong>
          <p>Extra por acertar el marcador exacto del partido.</p>
        </div>
        <div className="rule-card">
          <strong>24 h</strong>
          <p>Antes del partido se bloquea el registro y la edición.</p>
        </div>
      </div>
    </section>
  );
}

function Ranking({ leaderboard }: { leaderboard: LeaderboardRow[] }) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Ranking</h2>
          <p className="section-copy">Puntos acumulados por participante.</p>
        </div>
      </div>

      <div className="leaderboard">
        {leaderboard.length === 0 ? (
          <div className="notice">Todavía no hay puntos registrados.</div>
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
  if (status === 'Open') return 'Abierto';
  if (status === 'Final') return 'Final';
  return 'Cerrado';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
}
