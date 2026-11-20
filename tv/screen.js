// guest-tv-lite, the TV screen. Pure helpers at the top (tested in Node), the page below.

var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var REFRESH_MS = 5 * 60 * 1000;

// "2026-11-21" as a local calendar day (new Date("2026-11-21") would be UTC midnight and can shift a day).
function calendarDay(iso) {
  var p = String(iso).split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

// "Saturday 21 – Tuesday 24 November"; both months across a month end; both years across a year end.
function formatStay(checkIn, checkOut) {
  var a = calendarDay(checkIn), b = calendarDay(checkOut);
  var sameYear = a.getFullYear() === b.getFullYear();
  var sameMonth = sameYear && a.getMonth() === b.getMonth();
  var start = DAYS[a.getDay()] + " " + a.getDate();
  if (!sameMonth) start += " " + MONTHS[a.getMonth()];
  if (!sameYear) start += " " + a.getFullYear();
  var end = DAYS[b.getDay()] + " " + b.getDate() + " " + MONTHS[b.getMonth()];
  if (!sameYear) end += " " + b.getFullYear();
  return start + " – " + end;
}

// WMO weather code (Open-Meteo) -> a short word.
function weatherLabel(code) {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 80 && code <= 82) return "Showers";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 95 && code <= 99) return "Storm";
  return "";
}

// 24 hour clock: "9:05", "14:32".
function clockText(d) {
  return d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2);
}

// A kept answer, minus the guest once their check-out day has passed, so an old guest is never
// shown to the next one while the script cannot be reached. today: "YYYY-MM-DD".
function stillShowable(answer, today) {
  if (!answer) return null;
  if (!(answer.guest && answer.guest.checkOut < today)) return answer;
  var out = {};
  for (var k in answer) if (Object.prototype.hasOwnProperty.call(answer, k)) out[k] = answer[k];
  out.guest = null;
  if ("wifi" in out) out.wifi = null;
  if ("checkoutTime" in out) out.checkoutTime = null;
  return out;
}

function isoToday(d) {
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}

// ---- layout A wording ----

function greeting(hour) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

// Whole days from a to b, both "YYYY-MM-DD" (UTC arithmetic, so clock changes never shift it).
function daysBetween(a, b) {
  var p = String(a).split("-"), q = String(b).split("-");
  return Math.round((Date.UTC(+q[0], q[1] - 1, +q[2]) - Date.UTC(+p[0], p[1] - 1, +p[2])) / 86400000);
}

// "Thu 19 to Sun 22 Nov · Night 2 of 3"; "· Check-out day" on the last day.
function stayLine(checkIn, checkOut, today) {
  var a = calendarDay(checkIn), b = calendarDay(checkOut);
  var sameYear = a.getFullYear() === b.getFullYear();
  var sameMonth = sameYear && a.getMonth() === b.getMonth();
  var start = DAYS[a.getDay()].slice(0, 3) + " " + a.getDate();
  if (!sameMonth) start += " " + MONTHS[a.getMonth()].slice(0, 3);
  if (!sameYear) start += " " + a.getFullYear();
  var end = DAYS[b.getDay()].slice(0, 3) + " " + b.getDate() + " " + MONTHS[b.getMonth()].slice(0, 3);
  if (!sameYear) end += " " + b.getFullYear();
  var nights = daysBetween(checkIn, checkOut);
  var night = daysBetween(checkIn, today) + 1;
  var tail = today >= checkOut ? "Check-out day" : "Night " + night + " of " + nights;
  return start + " to " + end + " · " + tail;
}

// "Out Sunday 10am", or "" when no time is set.
function checkoutLine(checkOut, time) {
  var t = typeof time === "string" ? time.trim() : "";
  if (!t) return "";
  return "Out " + DAYS[calendarDay(checkOut).getDay()] + " " + t;
}

// "Friday 20 November"
function dateLine(d) {
  return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
}

// WMO weather code -> a small icon, in the same groups as weatherLabel.
function weatherIcon(code) {
  if (code === 0) return "☀";
  if (code === 1 || code === 2) return "⛅";
  if (code === 3) return "☁";
  if (code === 45 || code === 48) return "🌫";
  if (code >= 51 && code <= 67) return "🌧";
  if (code >= 80 && code <= 82) return "🌦";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "❄";
  if (code >= 95 && code <= 99) return "⛈";
  return "";
}

// QR rows of "1"/"0" -> an SVG, one square per dark module, with the standard 4-module quiet border.
function qrSvg(rows) {
  if (!rows || !rows.length) return "";
  var n = rows.length, size = n + 8, path = "";
  for (var r = 0; r < n; r++) {
    if (typeof rows[r] !== "string" || rows[r].length !== n || /[^01]/.test(rows[r])) return "";
    for (var c = 0; c < n; c++) if (rows[r][c] === "1") path += "M" + (c + 4) + " " + (r + 4) + "h1v1h-1z";
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + " " + size + '" shape-rendering="crispEdges">' +
    '<rect width="' + size + '" height="' + size + '" fill="#fff"/><path fill="#111" d="' + path + '"/></svg>';
}

// ---- app buttons ----

// The only apps that get a button, in this order. Nothing else can be launched from the page.
var APP_BUTTONS = [
  { pkg: "com.netflix.ninja", name: "Netflix" },
  { pkg: "com.amazon.amazonvideo.livingroom", name: "Prime Video" },
  { pkg: "com.apple.atve.androidtv.appletv", name: "Apple TV" },
];

// TVOS.apps() JSON -> the buttons to draw: only APP_BUTTONS the TV has, in APP_BUTTONS order.
function appButtons(appsJson) {
  var list;
  try { list = JSON.parse(appsJson); } catch (e) { return []; }
  if (!Array.isArray(list)) return [];
  var have = {};
  list.forEach(function (a) { if (a && typeof a.package === "string") have[a.package] = a; });
  var out = [];
  APP_BUTTONS.forEach(function (b) {
    var a = have[b.pkg];
    if (!a) return;
    out.push({ pkg: b.pkg, name: b.name, banner: a.hasBanner ? "http://tvos.invalid/banner/" + b.pkg : null });
  });
  return out;
}

// Left and Right along the row, no wrap; any other key leaves focus where it is (kept inside the row).
function moveFocus(index, key, count) {
  if (count <= 0) return 0;
  var i = Math.min(Math.max(index, 0), count - 1);
  if (key === "ArrowLeft") i = Math.max(i - 1, 0);
  if (key === "ArrowRight") i = Math.min(i + 1, count - 1);
  return i;
}

// A key event -> "ArrowLeft", "ArrowRight", "Enter" or null. TV remotes may send only a key code
// (37/21 left, 39/22 right, 13/23 OK), as guest-tv's page handles them.
function remoteKey(e) {
  var k = e && e.key, c = e && e.keyCode;
  if (k === "ArrowLeft" || c === 37 || c === 21) return "ArrowLeft";
  if (k === "ArrowRight" || c === 39 || c === 22) return "ArrowRight";
  if (k === "Enter" || c === 13 || c === 23) return "Enter";
  return null;
}

if (typeof module !== "undefined") {
  module.exports = {
    remoteKey: remoteKey,
    APP_BUTTONS: APP_BUTTONS, appButtons: appButtons, moveFocus: moveFocus,
    formatStay: formatStay, weatherLabel: weatherLabel, clockText: clockText, stillShowable: stillShowable,
    greeting: greeting, stayLine: stayLine, checkoutLine: checkoutLine, dateLine: dateLine,
    weatherIcon: weatherIcon, qrSvg: qrSvg,
  };
}

// ---------------------------------------------------------------- the page

function $(id) { return document.getElementById(id); }

var shownTime = "";
function drawClock() {
  var t = clockText(new Date());
  if (t === shownTime) return;
  if (shownTime) render(current);   // a new minute: greeting and date line follow
  shownTime = t;
  var c = $("clock");
  c.innerHTML = "";
  ["fill", "sheen", "rim"].forEach(function (kind) {
    var s = document.createElement("span");
    s.className = kind;
    s.textContent = t;
    c.appendChild(s);
  });
  // The fill shows the frosted photo through the digits, lined up with the photo behind.
  var f = c.firstChild;
  f.style.backgroundPosition = -(c.offsetLeft + f.offsetLeft) + "px " + -(c.offsetTop + f.offsetTop) + "px";
}

var current = null;   // what is on screen now, so the greeting and date can follow the clock

function render(answer) {
  current = answer;
  var now = new Date();
  var guest = answer && answer.guest;
  var w = answer && answer.weather;

  var line = dateLine(now);
  if (w) line += " · " + (weatherIcon(w.code) ? weatherIcon(w.code) + " " : "") + w.now + "°";
  $("dateline").textContent = line;

  var place = answer && answer.place;
  $("place").textContent = place || "";
  $("place").hidden = !place;
  $("title").textContent = greeting(now.getHours()) + (guest ? ", " + guest.name : "");
  $("stay").textContent = guest ? stayLine(guest.checkIn, guest.checkOut, isoToday(now)) : "";
  $("stay").hidden = !guest;

  var out = guest ? checkoutLine(guest.checkOut, answer.checkoutTime) : "";
  $("checkout").textContent = out;
  $("stay-card").hidden = !out;

  var wifi = guest && answer.wifi;
  var qr = wifi ? qrSvg(wifi.qr) : "";
  $("wifi-qr").innerHTML = qr;
  $("wifi-name").textContent = wifi ? wifi.name : "";
  $("wifi-card").hidden = !qr;

  $("weather-card").hidden = !w;
  if (w) {
    $("wx-now").textContent = w.now + "°";
    var label = weatherLabel(w.code);
    $("wx-more").textContent = (label ? label + " · " : "") + "H " + w.high + "°  L " + w.low + "°";
  }
}

// ---- the app row ----
var apps = [];       // the buttons on screen
var appFocus = 0;    // which one has the white ring

function drawApps() {
  var tv = window.TVOS;
  var next = [];
  if (tv && typeof tv.apps === "function") {
    try { next = appButtons(tv.apps()); } catch (e) { next = []; }
  }
  var same = next.map(function (b) { return b.pkg + b.banner; }).join() === apps.map(function (b) { return b.pkg + b.banner; }).join();
  if (same && $("apps").childNodes.length === apps.length) return;
  var focusedPkg = apps[appFocus] && apps[appFocus].pkg;
  apps = next;
  var at = 0;
  apps.forEach(function (b, i) { if (b.pkg === focusedPkg) at = i; });
  appFocus = at;
  var row = $("apps");
  row.innerHTML = "";
  apps.forEach(function (b) {
    var el = document.createElement("div");
    el.className = "app";
    var name = document.createElement("span");
    name.textContent = b.name;
    el.appendChild(name);
    if (b.banner) {
      var img = new Image();
      img.alt = b.name;
      img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };   // the name shows instead
      img.src = b.banner;
      el.appendChild(img);
    }
    row.appendChild(el);
  });
  row.hidden = !apps.length;
  document.body.classList.toggle("has-apps", apps.length > 0);
  shownTime = "";   // the clock moved: line its frosted fill up again
  drawClock();
  markFocus();
}

function markFocus() {
  var els = $("apps").childNodes;
  for (var i = 0; i < els.length; i++) els[i].classList.toggle("focus", i === appFocus);
}

function onKey(e) {
  if (!apps.length) return;
  var k = remoteKey(e);
  if (!k) return;
  e.preventDefault();
  if (k === "Enter") {
    var b = apps[appFocus];
    if (b && window.TVOS && typeof window.TVOS.launch === "function") window.TVOS.launch(b.pkg);
    return;
  }
  appFocus = moveFocus(appFocus, k, apps.length);
  markFocus();
}

// The last good answer. Shown again while the script cannot be reached, until the guest's stay ends.
var lastGood = null;
function show() {
  render(stillShowable(lastGood, isoToday(new Date())));
}

function refresh() {
  var url = (window.LITE && window.LITE.scriptUrl) || "";
  if (!url || url.indexOf("PASTE_") === 0) return;
  fetch(url, { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (answer) { if (answer && !answer.error) lastGood = answer; })
    .catch(function () {})
    .then(show);
}

function start() {
  render(null);
  drawApps();
  document.addEventListener("keydown", onKey);
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    drawClock();
    setInterval(drawClock, 1000);
  });
  setInterval(show, 60 * 1000);
  window.addEventListener("resize", function () { shownTime = ""; drawClock(); });
  refresh();
  setInterval(refresh, REFRESH_MS);
  setInterval(drawApps, REFRESH_MS);   // an app installed or removed shows up within 5 minutes
}
