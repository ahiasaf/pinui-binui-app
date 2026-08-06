/* הדף השבועי של בני עקיבא — Service Worker
   ============================================================
   CACHE_NAME מסונכרן אוטומטית מ-APP_VERSION שב-index.html
   על ידי סקריפט הבנייה. אין צורך לעדכן אותו ביד.

   אסטרטגיה: קוד מהרשת קודם, נכסים מהמטמון קודם.

   קבצי הקוד (index.html, data.js, links.js, logo.js) נטענים
   מהרשת ורק בכישלון מהמטמון. הסיבה: גרסה מעורבת — index.html
   ישן עם data.js חדש — שוברת מסכים שלמים, וזה בדיוק מה שקרה
   כשגרסת המטמון לא עודכנה. עדיף המתנה של חצי שנייה על שבירה.

   שקפי המצגות והאייקונים נטענים מהמטמון קודם. הם כבדים ולעולם
   לא משתנים בשקט — שם מהירות עדיפה.
   ============================================================ */
var CACHE_NAME = 'hadaf-v5.7.0';
var CORE = ['./', './index.html', './data.js', './links.js',
            './logo.js', './manifest.json', './icon-192.png', './icon-512.png'];

// קוד = נטען מהרשת קודם
var CODE = /\.(html|js)$|\/$/;

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
    e.respondWith(
      fetch(req).then(save).catch(function () {
        return caches.match(req).then(function (m) {
          return m || caches.match('./index.html');
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
