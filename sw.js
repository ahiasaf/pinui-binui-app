// גרסת הקאש — יש להעלות את המספר בכל עדכון שמעלים לאוויר
const CACHE = 'pinui-binui-v5';
const CORE = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// הרענון קורה רק כשלוחצים על פס העדכון, ולא מעצמו באמצע סבב שיחות
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// קבצי האפליקציה מוגשים מיד מהמטמון ומתרעננים ברקע בשקט.
// בקשות אל Apps Script לא עוברות כאן כלל — הן תמיד ישירות לרשת,
// אחרת היינו מגישים נתוני דיירים ישנים במקום עדכניים.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => null);
      return cached || network;
    })
  );
});
