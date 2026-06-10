/**
 * Misa & Ray wedding — RSVP + shared guest leaderboards
 *
 * Setup:
 * 1. Google Sheet with RSVP tab (default) — see setupSheet()
 * 2. Extensions → Apps Script → paste this file → Save
 * 3. Run setupSheet and setupLeaderboard once (authorize when prompted)
 * 4. Deploy → Manage deployments → Edit → New version → Deploy
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web app URL into index.html:
 *    - RSVP_CONFIG.googleScriptUrl
 *    - LEADERBOARD_CONFIG.apiUrl (same URL)
 */

var LB_SHEET_NAME = 'GuestLeaderboard';
var LB_TOP_N = 10;
var LB_STORE_N = 80;
var LB_NAME_MAX = 24;
var LB_MIN_SUBMIT_GAP_MS = 15000;

var LB_CATEGORIES = {
  flappy: { higherBetter: true, min: 0, max: 100000 },
  backrooms: { higherBetter: false, min: 3000, max: 3600000 },
  clicker: { higherBetter: true, min: 0, max: 50000000000 }
};

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Name', 'Email', 'Attending', 'Party size',
      'Dietary', 'Travel', 'Song', 'Note'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function setupLeaderboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LB_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LB_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Category', 'Name', 'Score', 'Timestamp']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function getLeaderboardSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LB_SHEET_NAME);
  if (!sheet) {
    setupLeaderboard();
    sheet = ss.getSheetByName(LB_SHEET_NAME);
  }
  return sheet;
}

function sanitizeLbName(raw) {
  var s = String(raw || '').replace(/<[^>]*>/g, '').replace(/[\x00-\x1f\x7f]/g, '').trim();
  if (s.length > LB_NAME_MAX) s = s.slice(0, LB_NAME_MAX);
  return s;
}

function validateLbScore(category, score) {
  var cat = LB_CATEGORIES[category];
  if (!cat) return null;
  var n = Number(score);
  if (!isFinite(n) || n < cat.min || n > cat.max) return null;
  return n;
}

function isBetterScore(category, a, b) {
  var cat = LB_CATEGORIES[category];
  if (!cat) return false;
  if (a !== b) return cat.higherBetter ? a > b : a < b;
  return false;
}

function readLeaderboard(category) {
  var sheet = getLeaderboardSheet();
  var rows = sheet.getDataRange().getValues();
  var bestByName = {};
  var i;
  for (i = 1; i < rows.length; i++) {
    var rowCat = String(rows[i][0] || '');
    if (rowCat !== category) continue;
    var name = sanitizeLbName(rows[i][1]);
    var score = Number(rows[i][2]);
    var at = rows[i][3] ? new Date(rows[i][3]).getTime() : 0;
    if (!name || !isFinite(score) || score < 0) continue;
    if (!bestByName[name] || isBetterScore(category, score, bestByName[name].score)) {
      bestByName[name] = { name: name, score: score, at: at };
    }
  }
  var entries = Object.keys(bestByName).map(function (k) { return bestByName[k]; });
  entries.sort(function (a, b) {
    if (a.score !== b.score) {
      return LB_CATEGORIES[category].higherBetter ? b.score - a.score : a.score - b.score;
    }
    return a.at - b.at;
  });
  return entries.slice(0, LB_TOP_N);
}

function rewriteCategoryRows(category, entries) {
  var sheet = getLeaderboardSheet();
  var rows = sheet.getDataRange().getValues();
  var kept = [rows[0]];
  var i;
  for (i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '') !== category) kept.push(rows[i]);
  }
  entries.slice(0, LB_STORE_N).forEach(function (e) {
    kept.push([category, e.name, e.score, new Date(e.at || Date.now())]);
  });
  sheet.clearContents();
  if (kept.length) {
    sheet.getRange(1, 1, kept.length, kept[0].length).setValues(kept);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function recentSubmitTooSoon(category, name) {
  var sheet = getLeaderboardSheet();
  var rows = sheet.getDataRange().getValues();
  var now = Date.now();
  var i;
  for (i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0] || '') !== category) continue;
    if (sanitizeLbName(rows[i][1]) !== name) continue;
    var at = rows[i][3] ? new Date(rows[i][3]).getTime() : 0;
    if (now - at < LB_MIN_SUBMIT_GAP_MS) return true;
    break;
  }
  return false;
}

function submitLeaderboard(category, name, score) {
  if (!LB_CATEGORIES[category]) {
    return { ok: false, error: 'invalid_category' };
  }
  var safeName = sanitizeLbName(name);
  if (!safeName) return { ok: false, error: 'invalid_name' };
  var validScore = validateLbScore(category, score);
  if (validScore === null) return { ok: false, error: 'invalid_score' };
  if (recentSubmitTooSoon(category, safeName)) {
    return { ok: false, error: 'rate_limited' };
  }

  var sheet = getLeaderboardSheet();
  sheet.appendRow([category, safeName, validScore, new Date()]);

  var entries = readLeaderboard(category);
  var found = false;
  var j;
  for (j = 0; j < entries.length; j++) {
    if (entries[j].name === safeName) {
      found = true;
      if (!isBetterScore(category, validScore, entries[j].score)) {
        entries[j] = { name: safeName, score: validScore, at: Date.now() };
      }
      break;
    }
  }
  if (!found) {
    entries.push({ name: safeName, score: validScore, at: Date.now() });
  }
  entries.sort(function (a, b) {
    if (a.score !== b.score) {
      return LB_CATEGORIES[category].higherBetter ? b.score - a.score : a.score - b.score;
    }
    return a.at - b.at;
  });
  entries = entries.slice(0, LB_STORE_N);
  rewriteCategoryRows(category, entries);

  return { ok: true, entries: entries.slice(0, LB_TOP_N) };
}

function doGet(e) {
  e = e || {};
  var p = e.parameter || {};
  if (p.action === 'leaderboard') {
    var category = String(p.category || '');
    if (!LB_CATEGORIES[category]) {
      return jsonOut({ ok: false, error: 'invalid_category' });
    }
    return jsonOut({ ok: true, entries: readLeaderboard(category), shared: true });
  }
  return jsonOut({ ok: true, message: 'Wedding API running.', actions: ['rsvp', 'leaderboard'] });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'leaderboard_submit') {
      var result = submitLeaderboard(data.category, data.name, data.score);
      return jsonOut(result);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) setupSheet();

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.attending || '',
      data.party || '',
      data.diet || '',
      data.travel || '',
      data.song || '',
      data.note || ''
    ]);

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}
