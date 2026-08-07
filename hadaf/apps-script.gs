/* ============================================================
   הדף השבועי של בני עקיבא — הגשר בין האפליקציה לגיליון
   ============================================================

   הרעיון: הסקריפט הזה טיפש בכוונה.
   -------------------------------
   בגרסאות הקודמות הוא ידע דברים על האפליקציה — אילו עמודות יש
   בהרשמה, אילו לשוניות קיימות — ולכן כל שינוי קטן באפליקציה חייב
   הדבקה ופריסה מחדש ביד.

   כאן זה נגמר. הסקריפט לא יודע דבר על התוכן: הוא מקבל רשימת
   עמודות מסודרת מהאפליקציה, וכותב אותה. עמודה חדשה? הוא יוסיף
   אותה לבד. לשונית חדשה? הוא ייצור אותה לבד. כל שינוי עתידי קורה
   בקוד האפליקציה בלבד.

   *** זו הפריסה האחרונה שנדרשת ממך. ***

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
      אחר כך: הגדרות ← "בדיקת חיבור". אמור להופיע SCRIPT_VERSION
      שלמטה. הופיע — סיימת.

   חשוב לטקסטים
   ------------
   לשונית "טקסטים" נוצרת לבד בפרסום הראשון. כדי שהאפליקציה תוכל
   לקרוא ממנה, הגיליון חייב להיות משותף כ:
      "כל מי שיש לו הקישור — מציג".
   אפשר גם לערוך אותה ישירות בגיליון: עמודה A מפתח, עמודה B נוסח.
   מחיקת שורה מחזירה את הנוסח שבקוד.
   ============================================================ */

/* מספר שמוצג ב"בדיקת חיבור". אם מה שרואים במסך הניהול נמוך מזה —
   הפריסה בגוגל ישנה, ויש ללחוץ Deploy ← Manage deployments ←
   עריכה ← New version. */
var SCRIPT_VERSION = 3;

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);

    /* ---- הצורה הכללית: האפליקציה נוקבת בלשונית ובעמודות ---- */
    if (d.action === 'row')   return appendCols_(d.tab, parse_(d.cols));
    if (d.action === 'table') return writeTable_(d.tab, parse_(d.cols), parse_(d.rows));

    /* ---- הצורות הישנות. נשארות כדי שמכשיר שמחזיק גרסה ישנה
            של האפליקציה במטמון לא יאבד הרשמה. ---- */
    if (d.action === 'register') return appendCols_('הרשמות', d.cols ? parse_(d.cols) : [
      ['ישיבה', d.inst], ['קוד', d.code], ['איש קשר', d.who], ['טלפון', d.phone],
      ['תענית · ושננתם', d['taanit-veshinantam'] || 0],
      ['תענית · הסוגיה היומית', d['taanit-sugya'] || 0],
      ['מגילה · ושננתם', d['megila-veshinantam'] || 0],
      ['מגילה · הסוגיה היומית', d['megila-sugya'] || 0],
      ['סה"כ גמרות', d.total || 0], ['פירוט', d.seferName || '']
    ]);

    if (d.action === 'quiz') return appendCols_('חידות', d.cols ? parse_(d.cols) : [
      ['שבוע', d.week], ['ישיבה', d.inst], ['שם', d.name], ['טלפון', d.phone],
      ['תשובה', d.answer + 1], ['נכון', d.correct ? 'נכון' : 'לא נכון']
    ]);

    if (d.action === 'texts') {
      var rows = parse_(d.rows).map(function (r) {
        return r.key !== undefined ? [r.key, r.value] : r;   /* שתי הצורות */
      });
      return writeTable_('טקסטים', ['מפתח', 'נוסח'], rows);
    }

    return json_({ status: 'ignored', action: d.action || '' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* בדיקת חיבור. פתיחת ה-URL בדפדפן, או כפתור "בדיקת חיבור" בניהול,
   מחזירה את הגרסה הפרוסה ואת הלשוניות שהסקריפט רואה — כך שאין
   צורך לנחש אם הפריסה עלתה ואם היא מעודכנת.

   ?callback=foo מחזיר JavaScript במקום JSON. הסיבה: Apps Script
   מפנה את /exec לדומיין אחר, ודפדפנים חוסמים לעיתים את הקריאה
   הרגילה בגלל CORS. טעינה כתגית <script> עוקפת את זה תמיד. */
function doGet(e) {
  var out = { status: 'ok', version: SCRIPT_VERSION, tabs: [] };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    out.sheet = ss.getName();
    out.tabs = ss.getSheets().map(function (s) {
      return { name: s.getName(), rows: Math.max(0, s.getLastRow() - 1) };
    });
  } catch (err) { out.status = 'no-sheet'; out.message = String(err); }

  var cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(out) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(out);
}

/* ---------- הליבה ----------
   `cols` הוא מערך מסודר של [כותרת, ערך]. הכותרות הן מקור האמת:
   כותרת שכבר קיימת בשורה 1 מקבלת את הערך בעמודה שלה, וכותרת
   חדשה נוספת בסוף. כך שדה חדש באפליקציה מייצר עמודה חדשה לבדו,
   בלי לגעת כאן ובלי לשבש שורות שכבר נכתבו. */
function appendCols_(tab, cols) {
  var sh = sheet_(tab);
  var head = headers_(sh);
  var row = [];

  /* "תאריך" תמיד ראשונה — שעון השרת ולא שעון המכשיר */
  put_(row, idx_(sh, head, 'תאריך'), new Date());
  cols.forEach(function (c) {
    if (!c || c[0] == null || c[0] === '') return;
    put_(row, idx_(sh, head, String(c[0])), cell_(c[1]));
  });

  for (var i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = '';
  sh.appendRow(row);
  return json_({ status: 'success', tab: tab, columns: row.length });
}

/* טבלת הגדרות (כרגע: המלל) — נכתבת מחדש בשלמותה בכל פרסום,
   אחרת נוסח שנמחק היה נשאר בגיליון וממשיך לדרוס את הקוד. */
function writeTable_(tab, cols, rows) {
  var sh = sheet_(tab);
  if (!sh.getLastRow()) headRow_(sh, cols);
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
  if (rows.length) {
    var w = cols.length;
    sh.getRange(2, 1, rows.length, w).setValues(rows.map(function (r) {
      var out = [];
      for (var i = 0; i < w; i++) out.push(r[i] === undefined ? '' : cell_(r[i]));
      return out;
    }));
  }
  return json_({ status: 'success', tab: tab, count: rows.length });
}

/* ---------- עזר ---------- */
function parse_(v) {
  if (v == null || v === '') return [];
  return typeof v === 'string' ? JSON.parse(v) : v;
}

/* מספר טלפון שמתחיל באפס — גוגל מוחקת לו את האפס. גרש מוביל
   מכריח אותה להתייחס אליו כטקסט. */
function cell_(v) {
  if (v == null) return '';
  if (typeof v === 'string' && /^0\d{7,}$/.test(v.replace(/[-\s]/g, ''))) return "'" + v;
  return v;
}

function headers_(sh) {
  if (!sh.getLastRow() || !sh.getLastColumn()) return [];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
           .map(function (h) { return String(h).trim(); });
}

/* מאתר עמודה לפי הכותרת, ויוצר אותה אם אינה קיימת */
function idx_(sh, head, name) {
  for (var i = 0; i < head.length; i++) if (head[i] === name) return i;
  head.push(name);
  var col = head.length;
  sh.getRange(1, col).setValue(name)
    .setFontWeight('bold').setBackground('#17468F').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  return col - 1;
}

function put_(row, i, v) {
  while (row.length <= i) row.push('');
  row[i] = v;
}

function headRow_(sh, cols) {
  sh.getRange(1, 1, 1, cols.length).setValues([cols])
    .setFontWeight('bold').setBackground('#17468F').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
}

function sheet_(tab) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(tab) || ss.insertSheet(tab);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
