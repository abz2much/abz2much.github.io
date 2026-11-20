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
  if (answer.guest && answer.guest.checkOut < today) return { guest: null, weather: answer.weather };
  return answer;
}

function isoToday(d) {
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}

if (typeof module !== "undefined") {
  module.exports = { formatStay: formatStay, weatherLabel: weatherLabel, clockText: clockText, stillShowable: stillShowable };
}

// ---------------------------------------------------------------- the page

function $(id) { return document.getElementById(id); }

var shownTime = "";
function drawClock() {
  var t = clockText(new Date());
  if (t === shownTime) return;
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

function render(answer) {
  var guest = answer && answer.guest;
  $("title").textContent = guest ? "Welcome, " + guest.name : "Welcome";
  $("stay").textContent = guest ? formatStay(guest.checkIn, guest.checkOut) : "";
  $("stay").hidden = !guest;

  var w = answer && answer.weather;
  $("weather").hidden = !w;
  if (w) {
    $("wx-now").textContent = w.now + "°";
    $("wx-label").textContent = weatherLabel(w.code);
    $("wx-range").textContent = "H " + w.high + "°  L " + w.low + "°";
  }
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
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    drawClock();
    setInterval(drawClock, 1000);
  });
  setInterval(show, 60 * 1000);
  window.addEventListener("resize", function () { shownTime = ""; drawClock(); });
  refresh();
  setInterval(refresh, REFRESH_MS);
}
