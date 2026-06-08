/**
 * Misa & Ray wedding RSVP → Google Sheet
 *
 * Setup:
 * 1. Create a new Google Sheet (e.g. "Wedding RSVPs")
 * 2. Row 1 headers: Timestamp | Name | Email | Attending | Party size | Dietary | Travel | Song | Note
 * 3. Extensions → Apps Script → paste this file → Save
 * 4. Run setupSheet once (authorize when prompted)
 * 5. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web app URL into index.html → RSVP_CONFIG.googleScriptUrl
 * 7. Share the Sheet with your wife (Editor or Viewer)
 */

function setupSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Name', 'Email', 'Attending', 'Party size',
      'Dietary', 'Travel', 'Song', 'Note'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'RSVP endpoint is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
