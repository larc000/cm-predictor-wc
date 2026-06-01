const SPREADSHEET_ID = '15dHH6_GHu7oKnVkQTzo53aWXRWtIFTf8DiiXK29SOCw';
const GOOGLE_CLIENT_ID = '22101400405-22n609tqgo9nptnsu6mf5r93v62im26p.apps.googleusercontent.com';
const ALLOWED_GOOGLE_HOSTED_DOMAIN = '';
const POINTS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const POINTS_REFRESHED_AT_PROPERTY = 'POINTS_REFRESHED_AT';
const POINTS_RESULTS_FINGERPRINT_PROPERTY = 'POINTS_RESULTS_FINGERPRINT';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Quiniela Mundialista 2026 - CM LATAM');
}

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function isBlankRow(row) {
  return row.every(value => value === '' || value === null);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isGoogleClientIdConfigured() {
  return GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_ID.indexOf('REEMPLAZA_CON_TU_CLIENT_ID') === -1 &&
    GOOGLE_CLIENT_ID.indexOf('.apps.googleusercontent.com') !== -1;
}

function getAuthConfig() {
  return {
    googleClientId: isGoogleClientIdConfigured() ? GOOGLE_CLIENT_ID : '',
    authConfigured: isGoogleClientIdConfigured(),
    allowedDomain: ALLOWED_GOOGLE_HOSTED_DOMAIN
  };
}

function verifyGoogleIdToken(idToken) {
  if (!isGoogleClientIdConfigured()) {
    throw new Error('Falta configurar GOOGLE_CLIENT_ID en Code.gs.');
  }

  if (!idToken) {
    throw new Error('Inicia sesión con Google para continuar.');
  }

  const response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error('No se pudo verificar tu sesión de Google.');
  }

  const payload = JSON.parse(response.getContentText());

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Esta sesión de Google fue emitida para otra aplicación.');
  }

  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('El emisor de la sesión de Google no es válido.');
  }

  if (Number(payload.exp) * 1000 < Date.now()) {
    throw new Error('Tu sesión de Google expiró. Inicia sesión de nuevo.');
  }

  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('Tu correo de Google no está verificado.');
  }

  if (
    ALLOWED_GOOGLE_HOSTED_DOMAIN &&
    normalizeEmail(payload.hd) !== normalizeEmail(ALLOWED_GOOGLE_HOSTED_DOMAIN)
  ) {
    throw new Error('Debes ingresar con una cuenta del dominio autorizado.');
  }

  return {
    email: normalizeEmail(payload.email),
    name: payload.name || payload.email,
    picture: payload.picture || '',
    hostedDomain: payload.hd || ''
  };
}

function getRegisteredUser(identity) {
  const usersSheet = getSheet('Users');
  const data = usersSheet.getDataRange().getValues();
  const headers = data.shift();

  const emailIndex = headers.indexOf('Email');
  const nameIndex = headers.indexOf('Name');
  const roleIndex = headers.indexOf('Role');
  const activeIndex = headers.indexOf('Active');

  const userRow = data.find(row =>
    normalizeEmail(row[emailIndex]) === identity.email
  );

  if (!userRow) {
    return {
      authenticated: false,
      code: 'USER_NOT_REGISTERED',
      email: identity.email,
      name: identity.name,
      message: 'Tu correo no está registrado para participar en la quiniela.'
    };
  }

  if (String(userRow[activeIndex]).toUpperCase() !== 'TRUE') {
    return {
      authenticated: false,
      code: 'USER_INACTIVE',
      email: identity.email,
      name: userRow[nameIndex] || identity.name,
      message: 'Tu usuario está inactivo.'
    };
  }

  return {
    authenticated: true,
    email: identity.email,
    name: userRow[nameIndex] || identity.name,
    role: userRow[roleIndex],
    picture: identity.picture,
    hostedDomain: identity.hostedDomain
  };
}

function requireCurrentUser(idToken) {
  const currentUser = getCurrentUser(idToken);

  if (!currentUser.authenticated) {
    throw new Error(currentUser.message);
  }

  return currentUser;
}

function parseSheetDate(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(Math.round((value - 25569) * 24 * 60 * 60 * 1000));
  }

  if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
    const serialDate = Number(value);
    return new Date(Math.round((serialDate - 25569) * 24 * 60 * 60 * 1000));
  }

  return new Date(value);
}

function formatDateTime(value) {
  const date = parseSheetDate(value);

  if (isNaN(date.getTime())) {
    return value;
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd HH:mm'
  );
}

function getMatchEditState(status, dateTime) {
  const normalizedStatus = String(status || '').trim();

  if (normalizedStatus !== 'Open') {
    return {
      canEdit: false,
      reason: 'Este partido ya no está abierto para predicciones.'
    };
  }

  const matchDate = parseSheetDate(dateTime);

  if (isNaN(matchDate.getTime())) {
    return {
      canEdit: false,
      reason: 'No se pudo validar la fecha del partido.'
    };
  }

  const hoursBeforeMatch = (matchDate - new Date()) / (1000 * 60 * 60);

  if (hoursBeforeMatch < 24) {
    return {
      canEdit: false,
      reason: 'Cerró 24 horas antes del partido.'
    };
  }

  return {
    canEdit: true,
    reason: ''
  };
}

function getFinalResultsFingerprint() {
  const matchesSheet = getSheet('Matches');
  const matchesData = matchesSheet.getDataRange().getValues();
  const headers = matchesData.shift();

  const matchIdIndex = headers.indexOf('MatchID');
  const scoreAIndex = headers.indexOf('ScoreA');
  const scoreBIndex = headers.indexOf('ScoreB');
  const statusIndex = headers.indexOf('Status');

  return JSON.stringify(
    matchesData
      .filter(row => !isBlankRow(row) && String(row[statusIndex]).trim() === 'Final')
      .map(row => [
        row[matchIdIndex],
        row[scoreAIndex],
        row[scoreBIndex],
        row[statusIndex]
      ])
  );
}

function refreshPointsIfNeeded(force) {
  const properties = PropertiesService.getScriptProperties();
  const now = Date.now();
  const lastRefresh = Number(properties.getProperty(POINTS_REFRESHED_AT_PROPERTY)) || 0;
  const currentFingerprint = getFinalResultsFingerprint();
  const previousFingerprint = properties.getProperty(POINTS_RESULTS_FINGERPRINT_PROPERTY);

  if (
    !force &&
    currentFingerprint === previousFingerprint &&
    now - lastRefresh < POINTS_REFRESH_INTERVAL_MS
  ) {
    return;
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    return;
  }

  try {
    calculateAllPoints();
    properties.setProperty(POINTS_REFRESHED_AT_PROPERTY, String(now));
    properties.setProperty(POINTS_RESULTS_FINGERPRINT_PROPERTY, currentFingerprint);
  } finally {
    lock.releaseLock();
  }
}

function handleMatchResultsEdit(e) {
  const range = e && e.range;

  if (!range || range.getSheet().getName() !== 'Matches') {
    return;
  }

  const sheet = range.getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const watchedColumns = ['ScoreA', 'ScoreB', 'Status']
    .map(header => headers.indexOf(header) + 1)
    .filter(column => column > 0);

  const startColumn = range.getColumn();
  const endColumn = startColumn + range.getNumColumns() - 1;
  const touchedResultsColumn = watchedColumns.some(column =>
    column >= startColumn && column <= endColumn
  );

  if (touchedResultsColumn) {
    refreshPointsIfNeeded(true);
  }
}

function installMatchResultsTrigger() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'handleMatchResultsEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('handleMatchResultsEdit')
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();
}

function getMatches() {
  const sheet = getSheet('Matches');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data.filter(row => !isBlankRow(row)).map(row => {
    const item = {};
    headers.forEach((h, i) => {
      let value = row[i];

      if (h === 'DateTime') {
        value = formatDateTime(value);
      }

      item[h] = value;
    });
    return item;
  });
}

function getMatchesWithMyPredictions(idToken) {
  const currentUser = requireCurrentUser(idToken);

  refreshPointsIfNeeded(false);

  const email = currentUser.email;

  const matchesSheet = getSheet('Matches');
  const predictionsSheet = getSheet('Predictions');

  const matchesData = matchesSheet.getDataRange().getValues();
  const predictionsData = predictionsSheet.getDataRange().getValues();

  const matchHeaders = matchesData.shift();
  const predictionHeaders = predictionsData.shift();

  const predictionIdIndex = predictionHeaders.indexOf('PredictionID');
  const predEmailIndex = predictionHeaders.indexOf('Email');
  const predMatchIdIndex = predictionHeaders.indexOf('MatchID');
  const predScoreAIndex = predictionHeaders.indexOf('PredScoreA');
  const predScoreBIndex = predictionHeaders.indexOf('PredScoreB');
  const pointsIndex = predictionHeaders.indexOf('Points');
  const matchIdIndex = matchHeaders.indexOf('MatchID');
  const dateTimeIndex = matchHeaders.indexOf('DateTime');
  const statusIndex = matchHeaders.indexOf('Status');

  const myPredictionsMap = {};

  predictionsData.filter(row => !isBlankRow(row)).forEach(row => {
    const rowEmail = normalizeEmail(row[predEmailIndex]);

    if (rowEmail === normalizeEmail(email)) {
      const matchId = row[predMatchIdIndex];

      myPredictionsMap[matchId] = {
        predictionId: row[predictionIdIndex],
        predScoreA: row[predScoreAIndex],
        predScoreB: row[predScoreBIndex],
        points: row[pointsIndex]
      };
    }
  });

  return matchesData.filter(row => !isBlankRow(row) && row[matchIdIndex]).map(row => {
    const match = {};

    matchHeaders.forEach((h, i) => {
      let value = row[i];

      if (h === 'DateTime') {
        value = formatDateTime(value);
      }

      match[h] = value;
    });

    const myPrediction = myPredictionsMap[match.MatchID];
    const editState = getMatchEditState(row[statusIndex], row[dateTimeIndex]);

    match.hasPrediction = !!myPrediction;
    match.myPredScoreA = myPrediction ? myPrediction.predScoreA : '';
    match.myPredScoreB = myPrediction ? myPrediction.predScoreB : '';
    match.myPoints = myPrediction ? myPrediction.points : 0;
    match.canEdit = editState.canEdit;
    match.lockReason = editState.reason;

    return match;
  });
}

function submitPrediction(idToken, matchId, predScoreA, predScoreB) {
  const currentUser = getCurrentUser(idToken);

  if (!currentUser.authenticated) {
    return {
      success: false,
      message: currentUser.message
    };
  }

  const email = currentUser.email;

  const matchesSheet = getSheet('Matches');
  const predictionsSheet = getSheet('Predictions');

  const matches = matchesSheet.getDataRange().getValues();
  const headers = matches.shift();

  const matchIdIndex = headers.indexOf('MatchID');
  const dateTimeIndex = headers.indexOf('DateTime');
  const statusIndex = headers.indexOf('Status');

  const match = matches.find(row => row[matchIdIndex] === matchId);

  if (!match) {
    return { success: false, message: 'Partido no encontrado.' };
  }

  const editState = getMatchEditState(match[statusIndex], match[dateTimeIndex]);

  if (!editState.canEdit) {
    return {
      success: false,
      message: editState.reason
    };
  }

  const scoreA = Number(predScoreA);
  const scoreB = Number(predScoreB);

  if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
    return {
      success: false,
      message: 'Ingresa marcadores válidos.'
    };
  }

  const predictionId = email + '_' + matchId;

  const predictions = predictionsSheet.getDataRange().getValues();
  const predictionHeaders = predictions.shift();
  const predictionIdIndex = predictionHeaders.indexOf('PredictionID');
  const predEmailIndex = predictionHeaders.indexOf('Email');
  const predMatchIdIndex = predictionHeaders.indexOf('MatchID');
  const predScoreAIndex = predictionHeaders.indexOf('PredScoreA');
  const predScoreBIndex = predictionHeaders.indexOf('PredScoreB');
  const submittedAtIndex = predictionHeaders.indexOf('SubmittedAt');
  const pointsIndex = predictionHeaders.indexOf('Points');

  for (let i = 0; i < predictions.length; i++) {
    const row = predictions[i];
    const rowEmail = normalizeEmail(row[predEmailIndex]);

    if (rowEmail === normalizeEmail(email) && row[predMatchIdIndex] === matchId) {
      const sheetRow = i + 2;

      predictionsSheet.getRange(sheetRow, predScoreAIndex + 1).setValue(scoreA);
      predictionsSheet.getRange(sheetRow, predScoreBIndex + 1).setValue(scoreB);
      predictionsSheet.getRange(sheetRow, submittedAtIndex + 1).setValue(new Date());
      predictionsSheet.getRange(sheetRow, pointsIndex + 1).setValue(0);

      return {
        success: true,
        action: 'updated',
        message: 'Pronóstico actualizado correctamente.'
      };
    }
  }

  predictionsSheet.appendRow([
    predictionId,
    email,
    matchId,
    scoreA,
    scoreB,
    new Date(),
    0
  ]);

  return {
    success: true,
    action: 'created',
    message: 'Pronóstico guardado correctamente.'
  };
}

function calculateAllPoints() {
  const matchesSheet = getSheet('Matches');
  const predictionsSheet = getSheet('Predictions');

  const matchesData = matchesSheet.getDataRange().getValues();
  const predictionsData = predictionsSheet.getDataRange().getValues();

  const matchHeaders = matchesData.shift();
  const predictionHeaders = predictionsData.shift();

  const matchMap = {};

  matchesData.filter(row => !isBlankRow(row)).forEach(row => {
    const match = {};
    matchHeaders.forEach((h, i) => match[h] = row[i]);
    matchMap[match.MatchID] = match;
  });

  const pointsIndex = predictionHeaders.indexOf('Points');
  const pointsColumnIndex = pointsIndex + 1;
  const pointsValues = predictionsData.map(row => {
    if (isBlankRow(row)) {
      return [row[pointsIndex] || ''];
    }

    const prediction = {};
    predictionHeaders.forEach((h, i) => prediction[h] = row[i]);

    const match = matchMap[prediction.MatchID];

    if (
      !match ||
      String(match.Status).trim() !== 'Final' ||
      match.ScoreA === '' ||
      match.ScoreA === null ||
      match.ScoreB === '' ||
      match.ScoreB === null
    ) {
      return [0];
    }

    const points = calculatePoints(
      Number(prediction.PredScoreA),
      Number(prediction.PredScoreB),
      Number(match.ScoreA),
      Number(match.ScoreB)
    );

    return [points];
  });

  if (pointsValues.length > 0) {
    predictionsSheet.getRange(2, pointsColumnIndex, pointsValues.length, 1)
      .setValues(pointsValues);
  }
}

function calculatePoints(predA, predB, realA, realB) {
  let points = 0;

  const predictedResult = getResult(predA, predB);
  const realResult = getResult(realA, realB);

  if (predictedResult === realResult) {
    points += 3;
  }

  if (predA === realA && predB === realB) {
    points += 2;
  }

  return points;
}

function getResult(scoreA, scoreB) {
  if (scoreA > scoreB) return 'A_WIN';
  if (scoreA < scoreB) return 'B_WIN';
  return 'DRAW';
}

function getLeaderboard(idToken) {
  requireCurrentUser(idToken);

  refreshPointsIfNeeded(false);

  const usersSheet = getSheet('Users');
  const predictionsSheet = getSheet('Predictions');

  const usersData = usersSheet.getDataRange().getValues();
  const predictionsData = predictionsSheet.getDataRange().getValues();

  const usersHeaders = usersData.shift();
  const predictionsHeaders = predictionsData.shift();

  const emailIndex = usersHeaders.indexOf('Email');
  const nameIndex = usersHeaders.indexOf('Name');

  const predEmailIndex = predictionsHeaders.indexOf('Email');
  const pointsIndex = predictionsHeaders.indexOf('Points');

  const leaderboard = {};

  usersData.filter(row => !isBlankRow(row)).forEach(row => {
    const email = row[emailIndex];

    if (!email) {
      return;
    }

    leaderboard[email] = {
      email,
      name: row[nameIndex],
      points: 0
    };
  });

  predictionsData.filter(row => !isBlankRow(row)).forEach(row => {
    const email = row[predEmailIndex];

    if (!email) {
      return;
    }

    const points = Number(row[pointsIndex]) || 0;

    if (!leaderboard[email]) {
      leaderboard[email] = {
        email,
        name: email,
        points: 0
      };
    }

    leaderboard[email].points += points;
  });

  return Object.values(leaderboard)
    .sort((a, b) => b.points - a.points);
}

function getCurrentUser(idToken) {
  try {
    const identity = verifyGoogleIdToken(idToken);
    return getRegisteredUser(identity);
  } catch (error) {
    return {
      authenticated: false,
      code: 'GOOGLE_LOGIN_REQUIRED',
      message: error.message
    };
  }
}
