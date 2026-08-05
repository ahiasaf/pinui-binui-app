/* ============================================================
   המסע — אב־טיפוס, סבב 2.

   שתי לחיצות ותשובה. הזהות נאספת אחר כך, כשיש סיבה לתת אותה
   (ההגרלה), ולא לפני שנתנו משהו.

   מבודד: קורא data.js / links.js בלבד, וכותב רק ל-masa:profile.
   שום מפתח של האפליקציה הראשית לא נקרא ולא נכתב.
   ============================================================ */
var MASA_VERSION = '0.2.0';

var BLANK = { track:'', pace:'', sefer:'', where:'', inst:'',
              who:'', phone:'', n:0, joined:false, seen:false };
var profile = load();

function load() {
  try {
    var v = JSON.parse(localStorage.getItem('masa:profile') || 'null');
    if (!v) return copy(BLANK);
    for (var k in BLANK) if (!(k in v)) v[k] = BLANK[k];
    return v;
  } catch (e) { return copy(BLANK); }
}
function save() {
  try { localStorage.setItem('masa:profile', JSON.stringify(profile)); } catch (e) {}
}
function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

/* ---------- עזר, מועתק כלשונו מ-index.html ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}
function weekIndex() {
  var start = new Date(PROGRAM.startDate + 'T00:00:00');
  var now = new Date(); now.setHours(0, 0, 0, 0);
  var days = Math.floor((now - start) / 86400000);
  if (days < 0) return -1;
  return Math.min(Math.floor(days / 7), CAL_TAANIT.length - 1);
}
function trackById(id) {
  for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === id) return TRACKS[i];
  return null;
}
function dafKey(d) { return String(d).replace(/["'׳״\s]/g, ''); }
function contentFor(id) {
  var tr = trackById(id), wi = weekIndex(), i = wi < 0 ? 0 : wi;
  return { tr:tr, i:i, row:tr.cal[i], c:CONTENT[id + '-' + (i + 1)] };
}
/* אותה חתימה כמו ב-index.html — האיחוד יהיה מחיקת הכפילות בלבד */
function priceOf(id) {
  var p = (typeof PRICES !== 'undefined' && PRICES[id]) ||
          { price:SFARIM_PRICE.group, list:SFARIM_PRICE.normal };
  return { price:p.price, list:p.list, off:p.list > p.price };
}
function shek(n) { return n.toLocaleString('he-IL') + ' ₪'; }
function sefById(id) { return SFARIM.filter(function (x) { return x.id === id; })[0] || null; }

function show(v) {
  var all = document.querySelectorAll('.view');
  for (var i = 0; i < all.length; i++) all[i].className = 'view';
  var el = document.getElementById('v-' + v);
  if (el) el.className = 'view on';
  window.scrollTo(0, 0);
}

/* ============================================================
   שלב 1 · המשפט שמשלים את עצמו.
   שתי מילים לחיצות במסך אחד. אין "הבא", אין נקודות התקדמות.
   ============================================================ */
var TRACK_WORDS = [
  { v:'taanit', t:'מסכת תענית', s:'כיתות ז׳ · 30 דפים' },
  { v:'megila', t:'מסכת מגילה', s:'כיתות ח׳ · 31 דפים' }
];
var PACE_WORDS = [
  { v:'twice',  t:'פעמיים בשבוע', s:'עמוד שלם בכל מפגש' },
  { v:'daily',  t:'קצת בכל יום',  s:'סוגיה קצרה, כמה דקות' },
  { v:'unsure', t:'עוד לא יודעים', s:'נראה את שתי האפשרויות' }
];
function wordOf(list, v) {
  return list.filter(function (x) { return x.v === v; })[0] || null;
}

/* הקצב קובע את המהדורה. זה הדבר היחיד שהמשתמש לא יודע לבד,
   ולכן זה כל מה ששווה לשאול לפני שנותנים ערך. */
function recommend() {
  if (profile.pace === 'twice')
    return { id:'veshinantam',
             why:'עמוד ביאור מול כל עמוד גמרא — בדיוק לקצב שבחרתם.' };
  if (profile.pace === 'daily')
    return { id:'sugya',
             why:'החוברת פורסת את הדף לסוגיות קצרות — אחת לכל יום.' };
  return null;
}

function renderSay() {
  var tw = wordOf(TRACK_WORDS, profile.track), pw = wordOf(PACE_WORDS, profile.pace);
  var done = !!(tw && pw);

  var h = '<div class="sentence"><span class="lead">אנחנו לומדים</span>' +
    blank('track', tw, 'באיזו מסכת?') +
    blank('pace',  pw, 'באיזה קצב?') + '</div>' +
    '<div class="beads"><i class="' + (tw ? 'on' : '') + '"></i>' +
    '<i class="' + (pw ? 'on' : '') + '"></i></div>';

  h += done ? answerHtml() : '<div class="note">שתי לחיצות, וזה הכול</div>';
  document.getElementById('say-body').innerHTML = h;
  show('say');
}

function blank(k, w, ph) {
  return '<button class="blank' + (w ? '' : ' empty') + '" onclick="fillBlank(\'' + k + '\')">' +
    '<u>' + esc(w ? w.t : ph) + '</u>' +
    (w ? '<span class="sub">' + esc(w.s) + '</span>' : '') + '</button>';
}

function fillBlank(k) {
  var list = k === 'track' ? TRACK_WORDS : PACE_WORDS;
  var title = k === 'track' ? 'באיזו מסכת תלמדו?' : 'באיזה קצב תלמדו?';
  sheet(title, list, profile[k], function (v) {
    profile[k] = v;
    if (k === 'pace') {          // הקצב משנה את ההמלצה — הבחירה הידנית נאפסת
      var r = recommend();
      profile.sefer = r ? r.id : '';
    }
    save(); renderSay();
  });
}

/* ---------- התשובה ---------- */
function answerHtml() {
  var r = recommend();
  if (!profile.sefer) return twoWays();

  var s = sefById(profile.sefer), p = priceOf(profile.sefer);
  var other = SFARIM.filter(function (x) { return x.id !== profile.sefer; })[0];
  var op = priceOf(other.id);
  var why = (r && r.id === profile.sefer) ? r.why
          : 'זו הבחירה שלכם, והיא שמורה.';

  return '<div class="answer"><span class="so">ולכן</span>' +
    '<h1' + (s.id === 'sugya' ? ' class="g"' : '') + '>' + esc(s.name) + '</h1>' +
    '<div class="pr">' + shek(p.price) + ' לחוברת' +
    (p.off ? ' · במקום <s>' + shek(p.list) + '</s>' : '') + '</div>' +
    '<p class="why">' + esc(why) + '</p></div>' +
    '<button class="swap" onclick="swap(\'' + other.id + '\')">' +
    'אפשר גם ' + esc(other.name) + ' · ' + shek(op.price) + '</button>' +
    actsHtml();
}

/* "עוד לא יודעים" — שתיהן זו לצד זו, בלי המלצה ובלי הטיה */
function twoWays() {
  return '<div class="answer"><span class="so">שתי הדרכים</span></div>' +
    '<div class="two">' + SFARIM.map(function (s) {
      var p = priceOf(s.id);
      return '<button onclick="swap(\'' + s.id + '\')"><b>' + esc(s.name) +
        '<em>' + shek(p.price) + '</em></b><small>' + esc(s.rhythm) +
        ' · ' + esc(s.tag) + '</small></button>';
    }).join('') + '</div>' + actsHtml();
}

function actsHtml() {
  return '<div class="acts">' +
    '<button class="btn gr" onclick="openJoin()">' +
    (profile.joined ? 'עדכון הפרטים' : 'להיכנס להגרלה ולהתחיל') + '</button>' +
    '<button class="quiet" onclick="justLearn()">רק לדף של השבוע</button></div>';
}

function swap(id) { profile.sefer = id; save(); renderSay(); }
function justLearn() { profile.seen = true; save(); renderMine(); }

/* ============================================================
   שלב 2 · ההרשמה — אחרי הערך, ועם סיבה.
   כאן נאספים הפרטים להגרלה, לספירת התלמידים ולמדידת ההתמדה.
   ============================================================ */
function openJoin() { renderJoin(); }
function backToSay() { renderSay(); }

function renderJoin() {
  var home = profile.where === 'home';
  var instName = (INSTITUTIONS.filter(function (i) {
    return i.code === profile.inst; })[0] || {}).name;

  var h = '<div class="hd"><h2>כדי להיכנס להגרלה השבועית</h2>' +
    '<p>ולדעת כמה גמרות להזמין. דקה אחת, והפרטים נשמרים במכשיר שלכם.</p></div>' +
    '<div class="form">' +

    '<div class="fld"><div class="label">שם</div>' +
    '<input type="text" id="j-who" placeholder="שם מלא" value="' + esc(profile.who) +
    '" onchange="setF(\'who\',this.value)"></div>' +

    '<div class="fld"><div class="label">טלפון</div>' +
    '<input type="tel" id="j-phone" placeholder="05X-XXXXXXX" value="' + esc(profile.phone) +
    '" onchange="setF(\'phone\',this.value)"></div>' +

    '<div class="fld"><div class="label">איפה לומדים</div><div class="seg">' +
    '<button class="' + (profile.where === 'yeshiva' ? 'on' : '') +
    '" onclick="setWhere(\'yeshiva\')">בישיבה</button>' +
    '<button class="' + (home ? 'on' : '') +
    '" onclick="setWhere(\'home\')">בבית</button></div></div>';

  if (profile.where) {
    h += '<div class="fld"><div class="label">' +
      (home ? 'דרך איזו ישיבה' : 'הישיבה') + '</div>' +
      '<button class="pk' + (instName ? '' : ' empty') + '" onclick="pickInst()">' +
      esc(instName || 'בחרו מהרשימה') + '</button>' +
      (home ? '<div class="label" style="color:var(--ink-3);font-weight:600">' +
              'ההזמנה מצטרפת להזמנה המרוכזת של הישיבה — ומשם המחיר המוזל.</div>' : '') +
      '</div>' +

      '<div class="fld"><div class="label">' +
      (home ? 'כמה עותקים' : 'כמה תלמידים') + '</div><div class="cnt">' +
      '<button onclick="stepN(-1)">−</button>' +
      '<input type="tel" id="j-n" value="' + (profile.n || 0) +
      '" onchange="setN(this.value)"><button onclick="stepN(1)">+</button></div></div>';

    if (profile.n && profile.sefer) {
      var p = priceOf(profile.sefer);
      h += '<div class="sum"><b>' + shek(profile.n * p.price) + '</b>' +
        '<span>' + profile.n + ' × ' + shek(p.price) + ' · ' + esc(sefById(profile.sefer).name) +
        (p.off ? ' · חסכון של ' + shek(profile.n * (p.list - p.price)) : '') + '</span></div>';
    }
  }

  h += '</div>';

  var ready = profile.who && profile.phone && profile.where && profile.inst;
  h += '<div class="acts"><button class="btn gr" ' + (ready ? '' : 'disabled') +
    ' onclick="sendJoin()">' + (profile.joined ? 'עדכון' : 'סיימנו — קדימה ללימוד') +
    '</button></div>' +
    '<div id="j-done"></div>' +
    '<div class="note">נשמר במכשיר שלכם</div>';

  document.getElementById('join-body').innerHTML = h;
  show('join');
}

function setF(k, v) { profile[k] = v; save(); }
function setWhere(v) { profile.where = v; save(); renderJoin(); }
function setN(v) { profile.n = Math.max(0, parseInt(v, 10) || 0); save(); renderJoin(); }
function stepN(d) { setN((profile.n || 0) + d * (profile.where === 'home' ? 1 : 5)); }
function pickInst() {
  var items = INSTITUTIONS.map(function (i) { return { v:i.code, t:i.name }; });
  sheet('הישיבה', items, profile.inst, function (v) {
    profile.inst = v; save(); renderJoin();
  });
}
function sendJoin() {
  profile.joined = true; profile.seen = true;
  save();
  renderMine();
}

/* ============================================================
   המסך האישי — מה שרואים בכניסה חוזרת
   ============================================================ */
function kitFor(trackId) {
  var w = contentFor(trackId), daf = w.row[2];
  if (!daf || daf === 'סיום') return [];
  var lk = (DAF_LINKS[trackId] || {})[dafKey(daf)] || [];
  var sg = SUGYA[trackId] || {}, page = (sg.pages || {})[dafKey(daf)];
  var sgHref = (sg.base && sg.fmt && page) ? sg.fmt.replace('{p}', page) : (sg.base || '');
  return [
    { href:lk[0], ic:'⤓', t:'צורת הדף',     s:'הדף להדפסה' },
    { href:lk[1], ic:'פ', t:'פירוש חברותא', s:'ביאור על הדף' },
    { href:sgHref, ic:'◆', t:'הסוגיה היומית',
      s:page ? 'עמוד ' + page + ' בחוברת' : 'החוברת הדיגיטלית', cls:'gr' }
  ];
}
function notYet() { alert('הקישור יתווסף בקרוב.'); return false; }

function renderMine() {
  var t = profile.track || 'taanit', w = contentFor(t), c = w.c;
  var wi = weekIndex();
  var when = wi < 0 ? 'נפתח בפרשת בראשית' : 'שבוע ' + (wi + 1) + ' מתוך ' + w.tr.cal.length;

  var h = '<div class="hi"><span class="m"><img id="mine-mark" alt=""></span>' +
    '<span class="w"><b>' + (profile.who ? esc(profile.who.split(' ')[0]) + ', ' : '') +
    'הלימוד שלכם השבוע</b><small>' + esc(w.tr.masechet) + '</small></span>' +
    '<button class="ed" onclick="renderSay()">שינוי</button></div>';

  h += '<div class="stage"><div class="eyebrow">' + esc(when) + '<s></s>' +
    (w.row[2] && w.row[2] !== 'סיום' ? 'דף ' + esc(w.row[2]) : '') + '</div>' +
    '<h2>' + esc(c ? c.title : (w.row[2] ? 'דף ' + w.row[2] : w.row[1])) + '</h2>' +
    '<div class="meta">' + esc(w.row[1]) + ' · ' + esc(w.row[0]) + '</div>';
  if (c && c.deck) {
    h += '<div class="frame" onclick="deckOpen(0)"><img src="' + c.deck.dir +
      '/01.jpg" alt="השקף הראשון"></div>' +
      '<button class="go" onclick="deckOpen(0)">▶ הצגה על המסך</button>';
  } else {
    h += '<div class="frame"><div class="empty">המצגת לשבוע זה בהכנה</div></div>';
  }
  h += '</div>';

  var k = kitFor(t);
  if (k.length) {
    h += '<div class="sec"><b>הדף עצמו</b><i></i></div><div class="kit">' +
      k.map(function (l) {
        return l.href
          ? '<a class="lnk ' + (l.cls || '') + '" href="' + l.href +
            '" target="_blank" rel="noopener"><span class="ic">' + l.ic +
            '</span><span><b>' + esc(l.t) + '</b><small>' + esc(l.s) + '</small></span></a>'
          : '<a class="lnk dim" href="#" onclick="return notYet()">' +
            '<span class="ic">' + l.ic + '</span><span><b>' + esc(l.t) +
            '</b><small>בקרוב</small></span></a>';
      }).join('') + '</div>';
  }

  if (profile.sefer) {
    var p = priceOf(profile.sefer);
    h += '<div class="sec"><b>הגמרא שלכם</b><i></i></div>' +
      '<div class="mine-sef"><b>' + esc(sefById(profile.sefer).name) + '</b>' +
      '<span>' + shek(p.price) + (profile.n ? ' × ' + profile.n +
        ' = ' + shek(profile.n * p.price) : ' לחוברת') + '</span></div>';
  }

  if (!profile.joined)
    h += '<div class="acts"><button class="btn g" onclick="openJoin()">' +
      'להיכנס להגרלה השבועית</button></div>';

  document.getElementById('mine-body').innerHTML = h;
  show('mine');
  var mk = document.getElementById('mine-mark');
  if (mk) mk.src = LOGO_MARK;
}

/* ============================================================
   גיליון בחירה + מצגת
   ============================================================ */
var sheetCb = null;
function sheet(title, items, value, cb) {
  sheetCb = cb;
  document.getElementById('sheet-t').textContent = title;
  document.getElementById('sheet-l').innerHTML = items.map(function (it) {
    return '<div class="it' + (it.v === value ? ' on' : '') +
      '" onclick="sheetPick(\'' + it.v + '\')"><span class="v">✓</span>' +
      '<span><b>' + esc(it.t) + '</b>' +
      (it.s ? '<small>' + esc(it.s) + '</small>' : '') + '</span></div>';
  }).join('');
  document.getElementById('sheet').className = 'on';
}
function sheetPick(v) { sheetClose(); if (sheetCb) sheetCb(v); }
function sheetClose() { document.getElementById('sheet').className = ''; }

var deck = { imgs:[], i:0 };
function deckOpen(i) {
  var t = profile.track || 'taanit', c = contentFor(t).c;
  if (!c || !c.deck) return;
  deck.imgs = [];
  for (var n = 1; n <= c.deck.n; n++)
    deck.imgs.push(c.deck.dir + '/' + (n < 10 ? '0' + n : n) + '.jpg');
  deck.i = i || 0;
  document.getElementById('d-where').textContent =
    'מסכת ' + trackById(t).masechet + ' · דף ' + contentFor(t).row[2];
  document.getElementById('deck').className = 'on';
  deckPaint();
}
function deckClose() { document.getElementById('deck').className = ''; }
function deckGo(d) {
  var n = deck.i + d;
  if (n < 0 || n >= deck.imgs.length) return;
  deck.i = n; deckPaint();
}
function deckPaint() {
  document.getElementById('d-img').src = deck.imgs[deck.i];
  var nx = deck.imgs[deck.i + 1];
  if (nx) { var pre = new Image(); pre.src = nx; }
  document.getElementById('d-prev').disabled = deck.i === 0;
  document.getElementById('d-next').disabled = deck.i === deck.imgs.length - 1;
}
document.addEventListener('keydown', function (e) {
  if (document.getElementById('deck').className !== 'on') return;
  if (e.key === 'Escape') deckClose();
  if (e.key === 'ArrowLeft')  deckGo(1);
  if (e.key === 'ArrowRight') deckGo(-1);
});

/* ---------- הפעלה ---------- */
(function () {
  var bm = document.getElementById('brand-mark');
  if (bm) bm.src = LOGO_MARK;
  if (profile.seen && profile.track) renderMine();
  else renderSay();
})();
