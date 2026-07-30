/* ============================================================
   הדף השבועי של בני עקיבא — כתיבת הרשמות ותשובות חידה לגיליון
   ============================================================

   מה זה עושה
   ----------
   מקבל הרשמות מהאפליקציה וכותב אותן לגיליון. ראש חטיבה לוחץ
   "שליחת ההרשמה", והשורה מופיעה אצלך. שום וואטסאפ לא נפתח לו.

   התקנה — 4 שלבים, בערך שלוש דקות
   --------------------------------
   1. פתח את גיליון המוסדות:
      https://docs.google.com/spreadsheets/d/1OdC-qFaX3sK6nZMgmWWXb8LDUvQSir2ItZKt-f1yop0

   2. תפריט  Extensions ← Apps Script.
      מחק את מה שיש שם, הדבק את כל הקובץ הזה, ושמור.

   3. כפתור  Deploy ← New deployment.
      גלגל השיניים ← Web app.
        Execute as:      Me
        Who has access:  Anyone            ← חייב "Anyone", אחרת ייחסם
      Deploy, ואשר את ההרשאות.

   4. העתק את ה-Web app URL (מסתיים ב-/exec),
      וב-/admin של האפליקציה ← הגדרות ← "כתובת שרת" ← הדבק.

   מאותו רגע ההרשמות נכתבות ישר לגיליון, וכפתור הוואטסאפ נעלם.
   ============================================================ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);

    if (d.action === 'register') return writeRow_('הרשמות',
      ['תאריך', 'ישיבה', 'קוד', 'איש קשר', 'טלפון',
       'כיתות ז', 'כיתות ח', 'סה"כ גמרות', 'מהדורה', 'הערה'],
      [new Date(), d.inst, d.code, d.who, "'" + (d.phone || ''),
       d.z || 0, d.ch || 0, d.total || 0, d.seferName, d.note || '']);

    if (d.action === 'quiz') return writeRow_('חידות',
      ['תאריך', 'שבוע', 'ישיבה', 'שם', 'טלפון', 'תשובה', 'נכון'],
      [new Date(), d.week, d.inst, d.name, "'" + (d.phone || ''),
       (d.answer + 1), d.correct ? 'נכון' : 'לא נכון']);

    return json_({ status: 'ignored' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* בדיקה מהדפדפן: פתיחת ה-URL אמורה להחזיר ok */
function doGet() { return json_({ status: 'ok' }); }

function writeRow_(tab, header, row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(tab);
  if (!sh) {
    sh = ss.insertSheet(tab);
    sh.appendRow(header);
    sh.getRange(1, 1, 1, header.length)
      .setFontWeight('bold').setBackground('#17468F').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  sh.appendRow(row);
  return json_({ status: 'success' });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
