const SPREADSHEET_ID = '15dHH6_GHu7oKnVkQTzo53aWXRWtIFTf8DiiXK29SOCw';

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

function getMatchesWithMyPredictions() {
  const currentUser = getCurrentUser();

  if (!currentUser.authenticated) {
    return [];
  }

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

function submitPrediction(matchId, predScoreA, predScoreB) {
  const currentUser = getCurrentUser();

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

  matchesData.forEach(row => {
    const match = {};
    matchHeaders.forEach((h, i) => match[h] = row[i]);
    matchMap[match.MatchID] = match;
  });

  const pointsColumnIndex = predictionHeaders.indexOf('Points') + 1;

  predictionsData.forEach((row, index) => {
    const prediction = {};
    predictionHeaders.forEach((h, i) => prediction[h] = row[i]);

    const match = matchMap[prediction.MatchID];

    if (!match || match.Status !== 'Final') {
      return;
    }

    const points = calculatePoints(
      Number(prediction.PredScoreA),
      Number(prediction.PredScoreB),
      Number(match.ScoreA),
      Number(match.ScoreB)
    );

    predictionsSheet.getRange(index + 2, pointsColumnIndex).setValue(points);
  });
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

function getLeaderboard() {
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

function getCurrentUser() {
  const email = Session.getActiveUser().getEmail();

  if (!email) {
    return {
      authenticated: false,
      message: 'No se pudo detectar tu correo. Debes ingresar con una cuenta de Google.'
    };
  }

  const usersSheet = getSheet('Users');
  const data = usersSheet.getDataRange().getValues();
  const headers = data.shift();

  const emailIndex = headers.indexOf('Email');
  const nameIndex = headers.indexOf('Name');
  const roleIndex = headers.indexOf('Role');
  const activeIndex = headers.indexOf('Active');

  const userRow = data.find(row =>
    String(row[emailIndex]).toLowerCase() === email.toLowerCase()
  );

  if (!userRow) {
    return {
      authenticated: false,
      email,
      message: 'Tu correo no está registrado para participar en la quiniela.'
    };
  }

  if (String(userRow[activeIndex]).toUpperCase() !== 'TRUE') {
    return {
      authenticated: false,
      email,
      message: 'Tu usuario está inactivo.'
    };
  }

  return {
    authenticated: true,
    email,
    name: userRow[nameIndex],
    role: userRow[roleIndex]
  };
}
