'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthCard } from '@/components/auth/AuthCard';
import { Toast } from '@/components/feedback/Toast';
import { MainNav } from '@/components/layout/MainNav';
import { Shell } from '@/components/layout/Shell';
import { MatchList } from '@/components/matches/MatchList';
import { RankingTable } from '@/components/ranking/RankingTable';
import { Rules } from '@/components/rules/Rules';
import { allowedEmailDomain, isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  getMatchDateKey,
  isAllowedEmail,
  mergeMatchesWithPredictions
} from '@/lib/domain';
import type {
  AppUser,
  AppSection,
  AuthMode,
  DraftScores,
  EditingMap,
  LeaderboardRow,
  Match,
  MatchWithPrediction,
  Prediction
} from '@/lib/types';

type QuinielaClientProps = {
  activeSection: AppSection;
};

export default function QuinielaClient({ activeSection }: QuinielaClientProps) {
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

  useEffect(() => {
    if (activeSection === 'leaderboard' && appUser) {
      loadLeaderboard().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, appUser?.id]);

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

  const myLeaderboardPosition = useMemo(() => {
    const index = leaderboard.findIndex((row) => row.user_id === appUser?.id);

    return index === -1 ? null : index + 1;
  }, [appUser?.id, leaderboard]);

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
        activeSection === 'leaderboard' ? loadLeaderboard().catch(() => undefined) : Promise.resolve()
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

  if (!isSupabaseConfigured) {
    return (
      <Shell appUser={appUser} allowedEmailDomain={allowedEmailDomain} onSignOut={signOut}>
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
      <Shell appUser={appUser} allowedEmailDomain={allowedEmailDomain} onSignOut={signOut}>
        <div className="notice">Cargando...</div>
      </Shell>
    );
  }

  if (sessionUser && appUser && !appUser.active) {
    return (
      <Shell appUser={appUser} allowedEmailDomain={allowedEmailDomain} onSignOut={signOut}>
        <div className="notice">
          <h3>Usuario inactivo</h3>
          <p>Tu cuenta existe, pero está inactiva para participar en la quiniela.</p>
        </div>
      </Shell>
    );
  }

  if (!sessionUser) {
    return (
      <Shell appUser={appUser} allowedEmailDomain={allowedEmailDomain} onSignOut={signOut}>
        <AuthCard
          authMode={authMode}
          allowedEmailDomain={allowedEmailDomain}
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
    <Shell appUser={appUser} allowedEmailDomain={allowedEmailDomain} onSignOut={signOut}>
      <div className="sticky-nav">
        <MainNav />

        <div className="score-summary" aria-label="Mi puntaje">
          <div className="score-summary-item">
            <span>Mi Puntaje</span>
            <strong>{myPoints} pts</strong>
          </div>
          <div className="score-summary-item">
            <span>Posición</span>
            <strong>{myLeaderboardPosition ? `#${myLeaderboardPosition}` : '-'}</strong>
          </div>
        </div>

        <Toast message={toast} />
      </div>

      {error ? <p className="error">{error}</p> : null}

      {activeSection === 'quiniela' ? (
        <section>
          <div className="section-heading">
            <div>
              <h2>Mi Quiniela</h2>
              <p className="section-copy">Tus marcadores, estados y puntos por partido.</p>
            </div>
          </div>
          <MatchList
            groupedMatches={groupedMatches}
            draftScores={draftScores}
            editing={editing}
            savingMatchId={savingMatchId}
            timezone={appUser?.timezone || 'America/Costa_Rica'}
            onDraftChange={updateDraft}
            onSubmitPrediction={submitPrediction}
            onEditPrediction={startEdit}
            onCancelEdit={cancelEdit}
          />
        </section>
      ) : null}

      {activeSection === 'reglas' ? <Rules /> : null}

      {activeSection === 'leaderboard' ? (
        <RankingTable
          leaderboard={leaderboard}
          loading={leaderboardLoading}
          error={leaderboardError}
          activeUserId={appUser?.id || ''}
          onRefresh={() => loadLeaderboard().catch(() => undefined)}
        />
      ) : null}

    </Shell>
  );
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
