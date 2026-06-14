'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthCard } from '@/components/auth/AuthCard';
import { Toast } from '@/components/feedback/Toast';
import { MainNav } from '@/components/layout/MainNav';
import { Shell } from '@/components/layout/Shell';
import { MatchList } from '@/components/matches/MatchList';
import { MatchResultFilterNav } from '@/components/matches/MatchResultFilterNav';
import { MatchWinnersModal } from '@/components/matches/MatchWinnersModal';
import { PerformanceTable } from '@/components/performance/PerformanceTable';
import { PredictionAuditReport } from '@/components/ranking/PredictionAuditReport';
import { RankingTable } from '@/components/ranking/RankingTable';
import { Rules } from '@/components/rules/Rules';
import { allowedEmailDomain, isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  getMatchEditState,
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
  MatchResultFilter,
  MatchResultStat,
  MatchResultStatsByMatch,
  MatchResultWinner,
  MatchWinnerType,
  MatchWinnersModalState,
  PenaltyWinner,
  PredictionAuditRow,
  PerformanceReportRow,
  Prediction
} from '@/lib/types';

type QuinielaClientProps = {
  activeSection: AppSection;
};

const PREDICTION_CLOSED_MESSAGE =
  'Las predicciones para este partido ya están cerradas. Los pronósticos deben registrarse al menos 24 horas antes del inicio del partido.';

export default function QuinielaClient({ activeSection }: QuinielaClientProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [matches, setMatches] = useState<MatchWithPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [predictionAuditRows, setPredictionAuditRows] = useState<PredictionAuditRow[]>([]);
  const [predictionAuditLoading, setPredictionAuditLoading] = useState(false);
  const [predictionAuditError, setPredictionAuditError] = useState('');
  const [performanceRows, setPerformanceRows] = useState<PerformanceReportRow[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState('');
  const [matchResultStatsByMatch, setMatchResultStatsByMatch] = useState<MatchResultStatsByMatch>({});
  const [matchResultWinners, setMatchResultWinners] = useState<MatchResultWinner[]>([]);
  const [matchWinnersModal, setMatchWinnersModal] = useState<MatchWinnersModalState>(null);
  const [matchResultFilter, setMatchResultFilter] = useState<MatchResultFilter>('pending');
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

  useEffect(() => {
    if (activeSection === 'prediction-audit' && appUser) {
      loadPredictionAudit().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, appUser?.id]);

  useEffect(() => {
    if (activeSection === 'performance' && appUser) {
      loadPerformanceReport().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, appUser?.id]);

  useEffect(() => {
    if (activeSection === 'fase-grupos' && matchResultFilter === 'final' && appUser) {
      loadFinalMatchResultData().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, appUser?.id, matchResultFilter]);

  const groupedMatches = useMemo(() => {
    const timezone = appUser?.timezone || 'America/Costa_Rica';

    return matches
      .filter((match) => {
        const stage = String(match.stage || '').toLowerCase();

        if (activeSection === 'fase-grupos') {
          if (stage !== 'group') {
            return false;
          }

          return matchMatchesResultFilter(match, matchResultFilter);
        }

        if (activeSection === 'fase-eliminatoria') {
          return stage !== '' && stage !== 'group';
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date_time).getTime();
        const dateB = new Date(b.date_time).getTime();

        if (activeSection === 'fase-grupos' && matchResultFilter === 'final') {
          return dateB - dateA;
        }

        return dateA - dateB;
      })
      .reduce<Record<string, MatchWithPrediction[]>>((groups, match) => {
        const key = getMatchDateKey(match.date_time, timezone);
        groups[key] = groups[key] || [];
        groups[key].push(match);
        return groups;
      }, {});
  }, [activeSection, matches, appUser?.timezone, matchResultFilter]);

  const groupStageEmptyMessage =
    matchResultFilter === 'pending'
      ? 'No hay partidos pendientes por mostrar.'
      : 'Todavía no hay resultados finales.';

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

  const selectedMatchWinners = useMemo(() => {
    if (!matchWinnersModal) {
      return [];
    }

    return matchResultWinners.filter(
      (winner) =>
        winner.match_id === matchWinnersModal.matchId &&
        winner.winner_type === matchWinnersModal.winnerType
    );
  }, [matchResultWinners, matchWinnersModal]);

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

  async function loadMatches(profile = appUser, options: { preserveDrafts?: boolean } = {}) {
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

    setDraftScores((currentDrafts) => {
      const nextDrafts: DraftScores = {};

      merged.forEach((match) => {
        nextDrafts[match.match_id] =
          options.preserveDrafts && currentDrafts[match.match_id]
            ? currentDrafts[match.match_id]
            : getInitialDraft(match);
      });

      return nextDrafts;
    });

    setEditing((currentEditing) => {
      if (!options.preserveDrafts) {
        return {};
      }

      return merged.reduce<EditingMap>((nextEditing, match) => {
        if (match.canEdit && currentEditing[match.match_id]) {
          nextEditing[match.match_id] = true;
        }

        return nextEditing;
      }, {});
    });
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
          timezone: row.timezone || null,
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

    if (!rpcResult.error || !isMissingDatabaseFunction(rpcResult.error, 'get_leaderboard')) {
      return rpcResult;
    }

    return supabase
      .from('leaderboard')
      .select('user_id,email,name,points,timezone')
      .order('points', { ascending: false });
  }

  async function loadPredictionAudit() {
    if (!supabase) {
      return;
    }

    setPredictionAuditLoading(true);
    setPredictionAuditError('');

    try {
      const { data, error: auditQueryError } = await supabase.rpc('get_predictions_audit');

      if (auditQueryError) {
        throw auditQueryError;
      }

      setPredictionAuditRows(((data || []) as PredictionAuditRow[]).map(normalizePredictionAuditRow));
    } catch (caught) {
      setPredictionAuditError(getErrorMessage(caught));
      throw caught;
    } finally {
      setPredictionAuditLoading(false);
    }
  }

  async function loadPerformanceReport() {
    if (!supabase) {
      return;
    }

    setPerformanceLoading(true);
    setPerformanceError('');

    try {
      const { data, error: performanceQueryError } = await supabase
        .from('performance_report')
        .select('*');

      if (performanceQueryError) {
        throw performanceQueryError;
      }

      setPerformanceRows(
        ((data || []) as PerformanceReportRow[])
          .map(normalizePerformanceReportRow)
          .sort((a, b) => a.position - b.position)
      );
    } catch (caught) {
      setPerformanceError(getErrorMessage(caught));
      throw caught;
    } finally {
      setPerformanceLoading(false);
    }
  }

  async function loadFinalMatchResultData() {
    if (!supabase) {
      return;
    }

    const [
      { data: statsData, error: statsError },
      { data: winnersData, error: winnersError }
    ] = await Promise.all([
      supabase.from('match_result_stats').select('*'),
      supabase.from('match_result_winners').select('*')
    ]);

    if (statsError) {
      throw statsError;
    }

    if (winnersError) {
      throw winnersError;
    }

    setMatchResultStatsByMatch(
      ((statsData || []) as MatchResultStat[])
        .map(normalizeMatchResultStat)
        .reduce<MatchResultStatsByMatch>((statsByMatch, stat) => {
          statsByMatch[stat.match_id] = stat;
          return statsByMatch;
        }, {})
    );
    setMatchResultWinners(((winnersData || []) as MatchResultWinner[]).map(normalizeMatchResultWinner));
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
    setPredictionAuditRows([]);
    setPredictionAuditError('');
    setPredictionAuditLoading(false);
    setPerformanceRows([]);
    setPerformanceError('');
    setPerformanceLoading(false);
    setMatchResultStatsByMatch({});
    setMatchResultWinners([]);
    setMatchWinnersModal(null);
    setDraftScores({});
    setEditing({});
  }

  function updateDraft(matchId: string, side: 'a' | 'b', value: string) {
    setDraftScores((current) => ({
      ...current,
      [matchId]: {
        a: current[matchId]?.a || '',
        b: current[matchId]?.b || '',
        penaltyWinner: current[matchId]?.penaltyWinner || null,
        [side]: value
      }
    }));
  }

  function updatePenaltyWinner(matchId: string, penaltyWinner: PenaltyWinner) {
    setDraftScores((current) => ({
      ...current,
      [matchId]: {
        a: current[matchId]?.a || '',
        b: current[matchId]?.b || '',
        penaltyWinner
      }
    }));
  }

  async function submitPrediction(match: MatchWithPrediction) {
    if (!supabase || !appUser) {
      return;
    }

    const draft = draftScores[match.match_id] || { a: '', b: '', penaltyWinner: null };

    if (draft.a === '' || draft.b === '') {
      setToast('Completa el marcador.');
      return;
    }

    if (requiresPenaltyWinner(match, draft) && !draft.penaltyWinner) {
      setToast('Selecciona quién gana por penales.');
      return;
    }

    try {
      await refreshMatchPredictionStatuses();
    } catch (caught) {
      setToast(getErrorMessage(caught));
      return;
    }

    const editState = getMatchEditState(match);

    if (!editState.canEdit) {
      lockMatchForPredictions(match.match_id, editState.reason);
      setToast(editState.reason);
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
          pred_penalty_winner: getPenaltyWinnerForSubmission(match, draft),
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
      const nextError = getErrorMessage(caught);

      if (isPredictionPolicyError(caught)) {
        lockMatchForPredictions(match.match_id, nextError);
      }

      setToast(nextError);
    } finally {
      setSavingMatchId('');
    }
  }

  function lockMatchForPredictions(matchId: string, reason = PREDICTION_CLOSED_MESSAGE) {
    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.match_id === matchId
          ? {
            ...match,
            status: 'closed',
            canEdit: false,
            lockReason: reason
          }
          : match
      )
    );
    setEditing((current) => ({
      ...current,
      [matchId]: false
    }));
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
        b: match.myPredScoreB === '' ? '' : String(match.myPredScoreB),
        penaltyWinner: match.myPredPenaltyWinner
      }
    }));
    setEditing((current) => ({
      ...current,
      [match.match_id]: false
    }));
  }

  function openMatchWinnersModal(matchId: string, winnerType: MatchWinnerType, title: string) {
    setMatchWinnersModal({ matchId, winnerType, title });
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
            <strong>{myLeaderboardPosition ? `# ${myLeaderboardPosition}` : '-'}</strong>
          </div>
        </div>

        <Toast message={toast} />
      </div>

      {error ? <p className="error">{error}</p> : null}

      {activeSection === 'fase-grupos' ? (
        <section>
          <div className="section-heading">
            <div>
              <h2>Fase de Grupos</h2>
              <p className="section-copy">Tus marcadores, estados y puntos por partido.</p>
            </div>
          </div>
          <MatchResultFilterNav activeFilter={matchResultFilter} onFilterChange={setMatchResultFilter} />
          <MatchList
            groupedMatches={groupedMatches}
            draftScores={draftScores}
            editing={editing}
            savingMatchId={savingMatchId}
            timezone={appUser?.timezone || 'America/Costa_Rica'}
            resultStatsByMatch={matchResultFilter === 'final' ? matchResultStatsByMatch : {}}
            emptyMessage={groupStageEmptyMessage}
            dateSortDirection={matchResultFilter === 'final' ? 'desc' : 'asc'}
            onDraftChange={updateDraft}
            onPenaltyWinnerChange={updatePenaltyWinner}
            onSubmitPrediction={submitPrediction}
            onEditPrediction={startEdit}
            onCancelEdit={cancelEdit}
            onShowWinners={openMatchWinnersModal}
          />
        </section>
      ) : null}

      {activeSection === 'fase-eliminatoria' ? (
        <section>
          <div className="section-heading">
            <div>
              <h2>Fase Eliminatoria</h2>
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
            onPenaltyWinnerChange={updatePenaltyWinner}
            onSubmitPrediction={submitPrediction}
            onEditPrediction={startEdit}
            onCancelEdit={cancelEdit}
            onShowWinners={openMatchWinnersModal}
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

      {activeSection === 'prediction-audit' ? (
        <PredictionAuditReport
          rows={predictionAuditRows}
          loading={predictionAuditLoading}
          error={predictionAuditError}
          timezone={appUser?.timezone || 'America/Costa_Rica'}
          onRefresh={() => loadPredictionAudit().catch(() => undefined)}
        />
      ) : null}

      {activeSection === 'performance' ? (
        <PerformanceTable
          rows={performanceRows}
          loading={performanceLoading}
          error={performanceError}
          activeUserId={appUser?.id || ''}
          activeUserEmail={appUser?.email || ''}
          onRefresh={() => loadPerformanceReport().catch(() => undefined)}
        />
      ) : null}

      {matchWinnersModal ? (
        <MatchWinnersModal
          title={matchWinnersModal.title}
          winners={selectedMatchWinners}
          onClose={() => setMatchWinnersModal(null)}
        />
      ) : null}

    </Shell>
  );
}

function getPenaltyWinnerForSubmission(match: MatchWithPrediction, draft: DraftScores[string]) {
  if (!requiresPenaltyWinner(match, draft)) {
    return null;
  }

  return draft.penaltyWinner;
}

function getInitialDraft(match: MatchWithPrediction) {
  return {
    a: match.myPredScoreA === '' ? '' : String(match.myPredScoreA),
    b: match.myPredScoreB === '' ? '' : String(match.myPredScoreB),
    penaltyWinner: match.myPredPenaltyWinner
  };
}

function normalizePredictionAuditRow(row: PredictionAuditRow) {
  return {
    ...row,
    score_a: row.score_a === null ? null : Number(row.score_a),
    score_b: row.score_b === null ? null : Number(row.score_b),
    pred_score_a: Number(row.pred_score_a),
    pred_score_b: Number(row.pred_score_b),
    points: Number(row.points) || 0
  };
}

function normalizePerformanceReportRow(row: PerformanceReportRow) {
  return {
    ...row,
    position: Number(row.position) || 0,
    total_points: Number(row.total_points) || 0,
    result_count: Number(row.result_count) || 0,
    exact_score_count: Number(row.exact_score_count) || 0,
    penalties_count: Number(row.penalties_count) || 0
  };
}

function normalizeMatchResultStat(row: MatchResultStat) {
  return {
    ...row,
    total_active_users: Number(row.total_active_users) || 0,
    result_only_count: Number(row.result_only_count) || 0,
    exact_score_count: Number(row.exact_score_count) || 0,
    penalties_count: Number(row.penalties_count) || 0,
    result_only_pct: Number(row.result_only_pct) || 0,
    exact_score_pct: Number(row.exact_score_pct) || 0,
    penalties_pct: Number(row.penalties_pct) || 0
  };
}

function normalizeMatchResultWinner(row: MatchResultWinner) {
  return {
    ...row,
    pred_score_a: row.pred_score_a === null ? null : Number(row.pred_score_a),
    pred_score_b: row.pred_score_b === null ? null : Number(row.pred_score_b),
    points: row.points === null ? null : Number(row.points)
  };
}

function matchMatchesResultFilter(match: MatchWithPrediction, filter: MatchResultFilter) {
  const status = String(match.status || '').toLowerCase();

  if (filter === 'final') {
    return status === 'final';
  }

  return status === 'open' || status === 'closed';
}

async function refreshMatchPredictionStatuses() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc('refresh_match_prediction_statuses');

  if (error && !isMissingDatabaseFunction(error, 'refresh_match_prediction_statuses')) {
    throw error;
  }
}

function requiresPenaltyWinner(match: MatchWithPrediction, draft: DraftScores[string]) {
  const stage = String(match.stage || '').toLowerCase();
  const isKnockoutMatch = stage !== '' && stage !== 'group';
  const isTiedScore = draft.a !== '' && draft.b !== '' && Number(draft.a) === Number(draft.b);

  return isKnockoutMatch && isTiedScore;
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

  if (isPredictionPolicyMessage(message)) {
    return PREDICTION_CLOSED_MESSAGE;
  }

  if (
    normalized.includes('cerró 24 horas') ||
    normalized.includes('cerro 24 horas') ||
    normalized.includes('cerró 24 horas antes') ||
    normalized.includes('cerro 24 horas antes')
  ) {
    return PREDICTION_CLOSED_MESSAGE;
  }

  return message;
}

function isPredictionPolicyError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error ? String((error as { message?: unknown }).message || '') : '';
  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : '';

  return code === '42501' || isPredictionPolicyMessage(message);
}

function isPredictionPolicyMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('row-level security') &&
    normalized.includes('predictions')
  );
}

function shouldReturnToAuth(message: string) {
  return (
    message.includes('no está registrado') ||
    message.includes('ya está vinculado') ||
    message.includes('Debes ingresar con un correo')
  );
}

function isMissingDatabaseFunction(error: unknown, functionName: string) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message || '') : '';

  return code === 'PGRST202' || message.includes(functionName);
}
