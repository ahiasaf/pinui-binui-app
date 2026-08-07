/* הדף השבועי של בני עקיבא — Service Worker
   ============================================================
   CACHE_NAME מסונכרן אוטומטית מ-APP_VERSION שב-index.html
   על ידי סקריפט הבנייה. אין צורך לעדכן אותו ביד.

   אסטרטגיה: קוד מהרשת קודם, נכסים מהמטמון קודם.

   קבצי הקוד (index.html, data.js, links.js, logo.js) נטענים
   מהרשת ורק בכישלון מהמטמון. הסיבה: גרסה מעורבת — index.html
   ישן עם data.js חדש — שוברת מסכים שלמים, וזה בדיוק מה שקרה
   כשגרסת המטמון לא עודכנה. עדיף המתנה של חצי שנייה על שבירה.

   גם תמונות הספרים (sfarim/) נטענות מהרשת קודם: הן מתחלפות תוך
   כדי עבודה — כריכה חדשה, גרסה חדה להגדלה — ומטמון שהקדים את
   הרשת החזיק במכשיר כריכה ישנה וגרסה חדה שכלל לא קיימת אצלו.

   שקפי המצגות והאייקונים נטענים מהמטמון קודם. הם כבדים ולעולם
   לא משתנים בשקט — שם מהירות עדיפה.

   ל"מהרשת קודם" יש פסק זמן, וזה קריטי: fetch על חיבור תקוע אינו
   נכשל — הוא פשוט תלוי, עשרות שניות, עד שהדפדפן מוותר. בלי פסק
   זמן data.js לא הגיע, boot() לא רץ, ומסך הכניסה נתקע על הלוגו.
   עכשיו הרשת מתחרה בשעון: לא ענתה בזמן — מגישים מיד את העותק
   השמור, והרשת ממשיכה ברקע ומעדכנת את המטמון לפעם הבאה.
   ============================================================ */
var CACHE_NAME = 'hadaf-v6.1.0';
var CORE = ['./', './index.html', './data.js', './links.js',
            './logo.js', './manifest.json', './icon-192.png', './icon-512.png'];

// מהרשת קודם: קוד, ותמונות הספרים
var CODE = /\.(html|js)$|\/$|\/sfarim\//;

// כמה להמתין לרשת לפני שנופלים למטמון. מספיק לחיבור סביר, קצר מכדי להרגיז.
var NET_TIMEOUT = 2500;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(CORE); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE_NAME; })
                           .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // גוגל שיטס וכד' — ישר לרשת

  var save = function (res) {
    if (res && res.status === 200) {
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
    }
    return res;
  };

  if (req.mode === 'navigate' || CODE.test(url.pathname)) {
    /* הרשת מקבלת הזדמנות ראשונה — אבל לא בלי הגבלה.
       אם היא איטית או תקועה, העותק השמור מנצח, והרשת ממשיכה
       ברקע לעדכן את המטמון. אין עותק שמור — ממתינים לרשת עד הסוף,
       כי אין למה ליפול. */
    var live = fetch(req).then(save).catch(function () { return null; });

    e.respondWith(
      caches.match(req).then(function (m) {
        return m || caches.match('./index.html');
      }).then(function (cached) {
        if (!cached) return live;   // אין למה ליפול — ממתינים לרשת עד הסוף

        return new Promise(function (done) {
          var settled = false;
          var finish = function (r) { if (!settled) { settled = true; done(r); } };
          live.then(function (r) { finish(r || cached); });   // כולל כישלון מיידי
          setTimeout(function () { finish(cached); }, NET_TIMEOUT);
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(save).catch(function () { return null; });
      return cached || net;
    })
  );
});
