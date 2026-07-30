/* הדף השבועי של בני עקיבא — Service Worker
   מבוסס על המנגנון שהוכח ב"יגדיל תורה".
   בכל העלאת שינוי — להעלות את המספר כאן (v1 ← v2), אחרת מכשירים
   ימשיכו להגיש את הגרסה השמורה.                                     */
var CACHE_NAME = 'hadaf-v7';
var CORE = ['./', './index.html', './data.js', './links.js',
            './manifest.json', './icon-192.png', './icon-512.png'];

// התקנה — בלי skipWaiting. הגרסה החדשה ממתינה עד שנלחץ פס העדכון,
// כדי לא לרענן תלמיד באמצע חידה.
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

/* מוגש מיד מהמטמון, ובמקביל נבדק ברקע אם יש גרסה חדשה — כך הפתיחה
   מיידית בלי לוותר על עדכונים. בקשות לשרת הנתונים לא עוברות כאן. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return null; });

      return cached || net;
    })
  );
});
