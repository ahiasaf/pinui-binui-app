/* הדף השבועי של בני עקיבא — Service Worker
   כלל: מעלים את VERSION בכל שינוי בקבצים. המספר חייב להיות זהה
   ל-APP_VERSION שב-index.html ול-version שב-version.json.        */
var VERSION = '1.0.0';
var CACHE   = 'hadaf-' + VERSION;
var ASSETS  = ['./', 'index.html', 'data.js', 'manifest.json'];

self.addEventListener('install', function (e) {
  // דילוג על ההמתנה — הגרסה החדשה נכנסת לתוקף מיד.
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // version.json — תמיד מהרשת, אחרת בדיקת העדכון חסרת ערך.
  if (url.pathname.indexOf('version.json') !== -1) {
    e.respondWith(fetch(req, { cache:'no-store' }).catch(function () {
      return new Response('{}', { headers:{ 'Content-Type':'application/json' } });
    }));
    return;
  }

  // בקשות חוץ (ספריא וכד') — לא נוגעים.
  if (url.origin !== location.origin) return;

  // ניווט וקבצי הליבה: רשת קודם, מטמון כגיבוי.
  // כך משתמש מחובר מקבל תמיד את הגרסה העדכנית, ומנותק עדיין נפתח.
  if (req.mode === 'navigate' || /\.(html|js)$/.test(url.pathname) ||
      url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) {
          return m || caches.match('index.html');
        });
      })
    );
    return;
  }

  // שאר הקבצים: מטמון קודם.
  e.respondWith(
    caches.match(req).then(function (m) {
      return m || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
