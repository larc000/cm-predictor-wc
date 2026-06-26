'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthCard } from '@/components/auth/AuthCard';
import { Toast } from '@/components/feedback/Toast';
import { MainNav } from '@/components/layout/MainNav';
import { MobileHomeMenu } from '@/components/layout/MobileHomeMenu';
import { Shell } from '@/components/layout/Shell';
import { MatchList } from '@/components/matches/MatchList';
import { MatchResultFilterNav } from '@/components/matches/MatchResultFilterNav';
import { MatchWinnersModal } from '@/components/matches/MatchWinnersModal';
import { PerformanceTable } from '@/components/performance/PerformanceTable';
import { CustomLeaderboard } from '@/components/ranking/CustomLeaderboard';
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
import { DEFAULT_USER_TIMEZONE } from '@/lib/timezones';
import type {
  AppUser,
  AppSection,
  AuthMode,
  DraftScores,
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
  PendingMatchParticipation,
  PendingMatchParticipationByMatch,
  PredictionAuditRow,
  PerformanceReportRow,
  Prediction
} from '@/lib/types';

type QuinielaClientProps = {
  activeSection: AppSection;
};

const PREDICTION_CLOSED_MESSAGE =
  'Predictions for this match are already closed. Predictions must be submitted at least 1 hour before kickoff.';

export default function QuinielaClient({ activeSection }: QuinielaClientProps) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('sign-up');
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
  const [pendingParticipationByMatch, setPendingParticipationByMatch] =
    useState<PendingMatchParticipationByMatch>({});
  const [matchResultFilter, setMatchResultFilter] = useState<MatchResultFilter>('pending');
  const [draftScores, setDraftScores] = useState<DraftScores>({});
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
    if ((activeSection === 'leaderboard' || activeSection === 'custom-leaderboard') && appUser) {
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
    if (activeSection === 'fase-eliminatoria' && matchResultFilter === 'final' && appUser) {
      loadFinalMatchResultData().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, appUser?.id, matchResultFilter, matches]);

  useEffect(() => {
    if (activeSection === 'fase-eliminatoria' && matchResultFilter === 'pending' && appUser) {
      loadPendingMatchParticipation().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, appUser?.id, matchResultFilter, matches]);

  const groupedMatches = useMemo(() => {
    const timezone = appUser?.timezone || DEFAULT_USER_TIMEZONE;

    return matches
      .filter((match) => {
        const stage = String(match.stage || '').toLowerCase();

        if (activeSection === 'fase-eliminatoria') {
          return isKnockoutStage(stage) && matchMatchesResultFilter(match, matchResultFilter);
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date_time).getTime();
        const dateB = new Date(b.date_time).getTime();

        if (activeSection === 'fase-eliminatoria' && matchResultFilter === 'final') {
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

  const knockoutEmptyMessage =
    matchResultFilter === 'pending'
      ? 'There are no pending matches to show.'
      : 'There are no final results yet.';

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

  function renderStickyNav() {
    return (
      <div className="sticky-nav">
        <div className="mobile-nav-top">
          <div className="mobile-nav-title">
            <button className="mobile-nav-back" type="button" aria-label="Back" onClick={handleMobileBack}>
              ←
            </button>
            <strong>{getMobileSectionTitle(activeSection)}</strong>
          </div>
        </div>

        <MainNav />

        <div className="sticky-nav-meta">
          <div className="score-summary" aria-label="My score">
            <span className="score-summary-label">Your score: <strong>{myPoints} pts</strong></span>
            <div className="score-summary-value">
              <span>Position &nbsp;</span>
              <strong>{myLeaderboardPosition ? `# ${myLeaderboardPosition}` : '-'}</strong>
            </div>
          </div>
        </div>

        <Toast message={toast} />
      </div>
    );
  }

  async function loadProfileAndData(user: User) {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const email = user.email || '';

      if (!isAllowedEmail(email, allowedEmailDomain)) {
        await supabase.auth.signOut();
        throw new Error(`You must sign in with an @${allowedEmailDomain} email.`);
      }

      const profile = await ensureProfile(user);

      if (!profile.active) {
        setAppUser(profile);
        throw new Error('Your user is inactive.');
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
      throw new Error('Supabase is not configured.');
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
      throw new Error('Your email is not registered for this predictor.');
    }

    const profile = allowedProfile as AppUser;

    if (profile.auth_user_id && profile.auth_user_id !== user.id) {
      throw new Error('This email is already linked to another account.');
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

      setPredictionAuditRows(
        ((data || []) as PredictionAuditRow[])
          .map(normalizePredictionAuditRow)
          .filter((row) => isAuditableMatchStatus(row.status))
      );
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

    const finalMatchIds = getFilteredKnockoutMatchIds(matches, 'final');

    if (finalMatchIds.length === 0) {
      setMatchResultStatsByMatch({});
      setMatchResultWinners([]);
      return;
    }

    const [
      { data: statsData, error: statsError },
      winnersData
    ] = await Promise.all([
      supabase.from('match_result_stats').select('*').in('match_id', finalMatchIds),
      fetchMatchResultWinners(finalMatchIds)
    ]);

    if (statsError) {
      throw statsError;
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

  async function loadPendingMatchParticipation() {
    if (!supabase) {
      return;
    }

    const pendingMatchIds = getFilteredKnockoutMatchIds(matches, 'pending');

    if (pendingMatchIds.length === 0) {
      setPendingParticipationByMatch({});
      return;
    }

    const { data, error: participationError } = await supabase
      .from('pending_match_participation')
      .select('*')
      .in('match_id', pendingMatchIds);

    if (participationError) {
      throw participationError;
    }

    setPendingParticipationByMatch(
      ((data || []) as PendingMatchParticipation[])
        .map(normalizePendingMatchParticipation)
        .reduce<PendingMatchParticipationByMatch>((participationByMatch, participation) => {
          participationByMatch[participation.match_id] = participation;
          return participationByMatch;
        }, {})
    );
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    if (!isAllowedEmail(authForm.email, allowedEmailDomain)) {
      setError(`Use your corporate @${allowedEmailDomain} email.`);
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
          'The account was created, but Supabase did not sign in automatically. Disable "Confirm email" in Supabase Auth so registration does not depend on emails.'
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
    setPendingParticipationByMatch({});
    setDraftScores({});
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
      setToast('Complete the score.');
      return;
    }

    if (requiresPenaltyWinner(match, draft) && !draft.penaltyWinner) {
      setToast('Select who wins on penalties.');
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

      setToast(match.hasPrediction ? 'Prediction updated.' : 'Prediction saved.');
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
  }

  function openMatchWinnersModal(matchId: string, winnerType: MatchWinnerType, title: string) {
    setMatchWinnersModal({ matchId, winnerType, title });
  }

  function handleMobileBack() {
    router.push(getMobileBackHref(activeSection));
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
        <div className="notice">Loading...</div>
      </Shell>
    );
  }

  if (sessionUser && appUser && !appUser.active) {
    return (
      <Shell appUser={appUser} allowedEmailDomain={allowedEmailDomain} onSignOut={signOut}>
        <div className="notice">
          <h3>Inactive user</h3>
          <p>Your account exists, but it is inactive for this predictor.</p>
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

  if (activeSection === 'home' && appUser) {
    return (
      <Shell appUser={appUser} allowedEmailDomain={allowedEmailDomain} onSignOut={signOut}>
        <MobileHomeMenu
          appUser={appUser}
          points={myPoints}
          leaderboardPosition={myLeaderboardPosition}
          totalParticipants={leaderboard.length}
          onSignOut={signOut}
        />

        <div className="desktop-home">
          {renderStickyNav()}

          <div className="notice desktop-home-notice">
            <h3>Choose a section</h3>
            <p>Use the navigation above to predict scores, review rules, or check the leaderboard.</p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell appUser={appUser} allowedEmailDomain={allowedEmailDomain} onSignOut={signOut}>
      {renderStickyNav()}

      {error ? <p className="error">{error}</p> : null}

      {activeSection === 'fase-eliminatoria' ? (
        <section>
          <div className="section-heading">
            <div>
              <h2>Knockout Stage</h2>
              <p className="section-copy">Your scores, statuses, and points by match.</p>
            </div>
          </div>
          <MatchResultFilterNav activeFilter={matchResultFilter} onFilterChange={setMatchResultFilter} />
          <MatchList
            groupedMatches={groupedMatches}
            draftScores={draftScores}
            savingMatchId={savingMatchId}
            timezone={appUser?.timezone || DEFAULT_USER_TIMEZONE}
            resultStatsByMatch={matchResultFilter === 'final' ? matchResultStatsByMatch : {}}
            participationByMatch={matchResultFilter === 'pending' ? pendingParticipationByMatch : {}}
            emptyMessage={knockoutEmptyMessage}
            dateSortDirection={matchResultFilter === 'final' ? 'desc' : 'asc'}
            showResultPanel={matchResultFilter === 'final'}
            onDraftChange={updateDraft}
            onPenaltyWinnerChange={updatePenaltyWinner}
            onSubmitPrediction={submitPrediction}
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

      {activeSection === 'custom-leaderboard' ? (
        leaderboardError ? (
          <div className="notice error">Could not load the leaderboard: {leaderboardError}</div>
        ) : leaderboardLoading && leaderboard.length === 0 ? (
          <div className="notice">Loading leaderboard...</div>
        ) : (
          <CustomLeaderboard leaderboard={leaderboard} activeUserId={appUser?.id || ''} />
        )
      ) : null}

      {activeSection === 'prediction-audit' ? (
        <PredictionAuditReport
          rows={predictionAuditRows}
          loading={predictionAuditLoading}
          error={predictionAuditError}
          timezone={appUser?.timezone || DEFAULT_USER_TIMEZONE}
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

      {shouldShowMobileRankBar(activeSection) ? (
        <div className="mobile-rank-bar">
          Your score rank: {myPoints} pts,{' '}
          {myLeaderboardPosition ? `position #${myLeaderboardPosition}` : 'position pending'}
        </div>
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

function isAuditableMatchStatus(status: string) {
  const normalizedStatus = String(status || '').toLowerCase();
  return normalizedStatus === 'closed' || normalizedStatus === 'final';
}

function getMobileSectionTitle(activeSection: AppSection) {
  if (activeSection === 'home') return 'World Cup 2026';
  if (activeSection === 'fase-eliminatoria') return 'Knockout Stage';
  if (activeSection === 'reglas') return 'Rules';
  if (activeSection === 'leaderboard') return 'Leaderboard';
  if (activeSection === 'custom-leaderboard') return 'Custom Leaderboard';
  if (activeSection === 'prediction-audit') return 'Predictions';
  if (activeSection === 'performance') return 'Performance';

  return 'World Cup 2026';
}

function getMobileBackHref(activeSection: AppSection) {
  if (
    activeSection === 'custom-leaderboard' ||
    activeSection === 'prediction-audit' ||
    activeSection === 'performance'
  ) {
    return '/leaderboard';
  }

  return '/';
}

function shouldShowMobileRankBar(activeSection: AppSection) {
  return ![
    'fase-eliminatoria',
    'leaderboard',
    'custom-leaderboard',
    'prediction-audit',
    'performance'
  ].includes(activeSection);
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

function normalizePendingMatchParticipation(row: PendingMatchParticipation) {
  return {
    ...row,
    predictions_submitted: Number(row.predictions_submitted) || 0,
    active_users: Number(row.active_users) || 0,
    participation_pct: Number(row.participation_pct) || 0
  };
}

function matchMatchesResultFilter(match: MatchWithPrediction, filter: MatchResultFilter) {
  const status = String(match.status || '').toLowerCase();

  if (filter === 'final') {
    return status === 'final';
  }

  return status === 'open' || status === 'closed' || status === 'pending_teams';
}

function getFilteredKnockoutMatchIds(matches: MatchWithPrediction[], filter: MatchResultFilter) {
  return matches
    .filter((match) => isKnockoutStage(match.stage) && matchMatchesResultFilter(match, filter))
    .map((match) => match.match_id);
}

async function fetchMatchResultWinners(matchIds: string[]) {
  if (!supabase) {
    return [];
  }

  const pageSize = 1000;
  const rows: MatchResultWinner[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('match_result_winners')
      .select('*')
      .in('match_id', matchIds)
      .range(from, to);

    if (error) {
      throw error;
    }

    const pageRows = (data || []) as MatchResultWinner[];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      return rows;
    }
  }
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
  const isTiedScore = draft.a !== '' && draft.b !== '' && Number(draft.a) === Number(draft.b);

  return isKnockoutStage(stage) && isTiedScore;
}

function isKnockoutStage(stage?: string | null) {
  return [
    'round_of_32',
    'round_of_16',
    'quarterfinal',
    'semifinal',
    'third_place',
    'final'
  ].includes(String(stage || '').toLowerCase());
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

  return 'An unexpected error occurred.';
}

function normalizeSupabaseMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return 'Your account exists, but Supabase is still asking for email confirmation. Disable "Confirm email" in Supabase Auth.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'This email already has an account. Sign in with your password.';
  }

  if (isPredictionPolicyMessage(message)) {
    return PREDICTION_CLOSED_MESSAGE;
  }

  if (
    normalized.includes('cerró 24 horas') ||
    normalized.includes('cerro 24 horas') ||
    normalized.includes('cerró 24 horas antes') ||
    normalized.includes('cerro 24 horas antes') ||
    normalized.includes('cerró 1 hora') ||
    normalized.includes('cerro 1 hora') ||
    normalized.includes('cerró 1 hora antes') ||
    normalized.includes('cerro 1 hora antes')
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
    message.includes('Debes ingresar con un correo') ||
    message.includes('not registered') ||
    message.includes('already linked') ||
    message.includes('must sign in with')
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
