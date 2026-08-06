/* ============================================================
   הדף השבועי של בני עקיבא — הגשר בין האפליקציה לגיליון
   ============================================================

   מה זה עושה
   ----------
   1. הרשמות  — ראש חטיבה לוחץ "שליחת ההרשמה", והשורה מופיעה
                בלשונית "הרשמות". שום וואטסאפ לא נפתח לו.
   2. חידות   — תשובות התלמידים ללשונית "חידות".
   3. טקסטים  — עריכת המלל מ-/admin ← טקסטים נכתבת ללשונית
                "טקסטים", וכל מי שפותח את האפליקציה רואה אותה.

   התקנה — 4 שלבים, בערך שלוש דקות
   --------------------------------
   1. פתח את גיליון המוסדות:
      https://docs.google.com/spreadsheets/d/1OdC-qFaX3sK6nZMgmWWXb8LDUvQSir2ItZKt-f1yop0

   2. תפריט  Extensions ← Apps Script.
      מחק את מה שיש שם, הדבק את כל הקובץ הזה, ושמור.

   3. כפתור  Deploy ← New deployment  (או Manage deployments ←
      עריכה ← New version, אם כבר פרסמת פעם).
      גלגל השיניים ← Web app.
        Execute as:      Me
        Who has access:  Anyone            ← חייב "Anyone", אחרת ייחסם
      Deploy, ואשר את ההרשאות.

   4. העתק את ה-Web app URL (מסתיים ב-/exec),
      וב-/admin של האפליקציה ← הגדרות ← "כתובת שרת" ← הדבק.

   חשוב לטקסטים
   ------------
   לשונית "טקסטים" נוצרת לבד בפרסום הראשון. כדי שהאפליקציה תוכל
   לקרוא ממנה, הגיליון חייב להיות משותף כ:
      "כל מי שיש לו הקישור — מציג".
   אפשר גם לערוך אותה ישירות בגיליון: עמודה A מפתח, עמודה B נוסח.
   מחיקת שורה מחזירה את הנוסח שבקוד.
   ============================================================ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);

    if (d.action === 'register') {
      /* עמודה לכל צירוף מסכת-מהדורה. שמות השדות מגיעים מהאפליקציה
         בצורה 'תענית-ושננתם' וכו', ולכן אין כאן רשימה קשוחה. */
      return writeRow_('הרשמות',
        ['תאריך', 'ישיבה', 'קוד', 'איש קשר', 'טלפון',
         'תענית · ושננתם', 'תענית · הסוגיה היומית',
         'מגילה · ושננתם', 'מגילה · הסוגיה היומית',
         'סה"כ גמרות', 'פירוט'],
        [new Date(), d.inst, d.code, d.who, "'" + (d.phone || ''),
         d['taanit-veshinantam'] || 0, d['taanit-sugya'] || 0,
         d['megila-veshinantam'] || 0, d['megila-sugya'] || 0,
         d.total || 0, d.seferName || '']);
    }

    if (d.action === 'quiz') return writeRow_('חידות',
      ['תאריך', 'שבוע', 'ישיבה', 'שם', 'טלפון', 'תשובה', 'נכון'],
      [new Date(), d.week, d.inst, d.name, "'" + (d.phone || ''),
       (d.answer + 1), d.correct ? 'נכון' : 'לא נכון']);

    if (d.action === 'texts') return writeTexts_(JSON.parse(d.rows || '[]'));

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
  var sh = sheet_(tab, header);
  sh.appendRow(row);
  return json_({ status: 'success' });
}

/* המלל אינו יומן אלא טבלת הגדרות: כותבים אותה מחדש בכל פרסום,
   אחרת נוסח שנמחק היה נשאר בגיליון וממשיך לדרוס את הקוד. */
function writeTexts_(rows) {
  var sh = sheet_('טקסטים', ['מפתח', 'נוסח']);
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 2).clearContent();
  if (rows.length) {
    sh.getRange(2, 1, rows.length, 2).setValues(
      rows.map(function (r) { return [r.key, r.value]; }));
  }
  return json_({ status: 'success', count: rows.length });
}

function sheet_(tab, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(tab);
  if (!sh) {
    sh = ss.insertSheet(tab);
    sh.appendRow(header);
    sh.getRange(1, 1, 1, header.length)
      .setFontWeight('bold').setBackground('#17468F').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
