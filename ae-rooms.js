/* AE ROOMS — the back office every Accelerated Operating System carries.  Accelerated Experiences LLC · Oct 19 2026.
   Anthony, Oct 19 2026: "They all should have the default rooms … everything. They need to be pimped out, and we are
   showing the mothership." So every system gets the whole back office, not a stub: the Owner's Manual, IT · System
   Health, HR · People Ops, Law · Contracts, Documents, e-Sign, the Master List, Mail and Skins — in its own trade's words.

   One file, every system, nine rooms. A page sets
     window.AE_ROOM = { kind, os, engine, active, crumb, title, lede, you, seed:{…} }
   and loads this after its engine. It asks the engine for exactly two things: mount({active, crumb}) for the chrome,
   and toast() for a message. Everything else lives here, so a room can never disagree with its siblings.
   Room data lives in this browser only (localStorage "ae-room:<os>:<kind>"); "Reset" puts the sample back.
   Canonical copy: aehub/machines/birdseye/office-rooms/ae-rooms.js — copy it into each system beside its engine. */
(function () {
  "use strict";
  var C = window.AE_ROOM || {};
  var E = window[C.engine] || {};
  var OS = C.os || "os", KIND = C.kind || "manual", SEED = C.seed || {};
  var KEY = "ae-room:" + OS + ":" + KIND;
  var YOU = C.you || "You";

  /* ---------------- helpers ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function noon(d) { var x = new Date(d || Date.now()); x.setHours(12, 0, 0, 0); return x; }
  function iso(d) { var m = d.getMonth() + 1, day = d.getDate(); return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day; }
  function rel(n) { var d = noon(); d.setDate(d.getDate() + n); return iso(d); }        /* seed dates are offsets from today, so a sample never goes stale */
  function parse(s) { return new Date(String(s).slice(0, 10) + "T12:00:00"); }
  function until(s) { return Math.round((parse(s) - noon()) / 864e5); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function nice(s) { var d = parse(s); return MON[d.getMonth()] + " " + d.getDate(); }
  function when(n) { return n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : n < 0 ? (-n) + " days ago" : "in " + n + " days"; }
  function clock(ts) { var t = new Date(ts), h = t.getHours() % 12 || 12; return h + ":" + ("0" + t.getMinutes()).slice(-2) + (t.getHours() < 12 ? "a" : "p"); }
  function stamp(ts) { var t = new Date(ts), n = until(iso(t)); return (n === 0 ? "" : nice(iso(t)) + " · ") + clock(ts); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  function toast(m, k) { if (E.toast) return E.toast(m, k); var w = document.getElementById("arToast"); if (!w) { w = document.createElement("div"); w.id = "arToast"; document.body.appendChild(w); } w.textContent = m; w.className = "on"; clearTimeout(w._t); w._t = setTimeout(function () { w.className = ""; }, 2800); }
  function load(make) { try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 1) return d; } catch (e) {} var f = make(); f.v = 1; return f; }
  var D, MAKE;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  function reset() { D = MAKE(); D.v = 1; save(); }
  function log(text) { (D.log = D.log || []).unshift({ ts: Date.now(), who: YOU, text: text }); D.log = D.log.slice(0, 40); }
  function shell() { return window.BirdseyeShell; }
  function cfg() { return window.BIRDSEYE || null; }

  /* ---------------- the page ---------------- */
  var content = E.mount ? E.mount({ active: C.active || KIND + ".html", crumb: C.crumb || C.title || KIND }) : document.body;
  var root = document.createElement("div"); root.className = "ar ar-k-" + KIND; content.appendChild(root);
  var ICON = { manual: "📘", it: "🛰️", hr: "🤝", law: "⚖️", documents: "🗂️", masterlist: "📝", skins: "🎨", mail: "✉️", sign: "✍️" };

  function head(sub) {
    return '<header class="ar-head"><div class="ar-badge" aria-hidden="true">' + (C.glyph || ICON[KIND] || "◎") + '</div><div class="ar-ht">' +
      '<div class="ar-kick">' + esc(C.kicker || (cfg() && cfg().brand && cfg().brand.name) || "") + '</div>' +
      '<h1>' + esc(C.title || KIND) + '</h1><p>' + esc(C.lede || "") + '</p>' + (sub || "") + '</div></header>';
  }
  function stats(list) {
    return '<div class="ar-stats">' + list.map(function (s) {
      return '<button type="button" class="ar-stat ' + (s.tone || "") + (s.on ? " on" : "") + '"' + (s.go ? ' data-go="' + esc(s.go) + '"' : "") + '><b>' + esc(s.v) + '</b><span>' + esc(s.l) + '</span></button>';
    }).join("") + '</div>';
  }
  function card(title, body, right, cls) { return '<section class="ar-card ' + (cls || "") + '"><div class="ar-ch"><h2>' + title + '</h2>' + (right || "") + '</div>' + body + '</section>'; }
  function chip(state) {
    var s = String(state || ""), t = /^(CLEAR|Signed|Done|Approved|Active|Filed|Current|Closed|Complete|Acknowledged|Paid|Sent)$/i.test(s) ? "good" :
      /^(INTERVENE|Declined|Expired|High|Overdue|Denied|Breach|Lost)$/i.test(s) ? "bad" :
      /^(WATCH|Pending|Waiting|Draft|Medium|Onboarding|Out for signature|Due soon|Open|Requested|Viewed)$/i.test(s) ? "watch" : "plain";
    return '<span class="ar-chip ' + t + '">' + esc(s) + '</span>';
  }
  function foot(extra) { return '<p class="ar-foot">' + (extra ? extra + " " : "") + 'Sample data for this showroom. It lives in this browser only. <button type="button" class="ar-link" data-reset>Reset this room</button></p>'; }
  function fence(html, tone) { return '<div class="ar-fence ' + (tone || "") + '">' + html + '</div>'; }

  /* ---------------- the sheet (one modal for every room) ---------------- */
  var back = document.createElement("div"); back.className = "ar-back"; document.body.appendChild(back);
  back.addEventListener("click", function (e) { if (e.target === back) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
  function closeSheet() { back.classList.remove("open"); back.innerHTML = ""; }
  function sheet(html, onClick, label) {
    back.innerHTML = '<div class="ar-sheet" role="dialog" aria-modal="true" aria-label="' + esc(label || "Details") + '">' + html + '</div>';
    back.classList.add("open");
    var s = back.querySelector(".ar-sheet");
    s.onclick = function (e) { var b = e.target.closest("button"); if (!b) return; if (b.hasAttribute("data-x")) return closeSheet(); if (onClick) onClick(b, s); };
    var f = s.querySelector("input,textarea,select"); if (f && window.innerWidth > 720) setTimeout(function () { f.focus(); }, 60);
    return s;
  }
  function need(s, ids) {  /* never a blocking alert: list what is missing, inline */
    var miss = ids.filter(function (p) { var el = s.querySelector("#" + p[0]); return !el || !String(el.value).trim(); }).map(function (p) { return p[1]; });
    var box = s.querySelector(".ar-miss"); if (box) box.remove();
    if (!miss.length) return true;
    box = document.createElement("div"); box.className = "ar-miss"; box.setAttribute("role", "alert");
    box.innerHTML = "<b>Still needed:</b> " + miss.map(esc).join(", ") + ".";
    s.insertBefore(box, s.querySelector(".ar-two:last-of-type") || null); box.scrollIntoView({ block: "nearest" });
    return false;
  }
  function val(s, id) { var el = s.querySelector("#" + id); return el ? String(el.value).trim() : ""; }

  /* =====================================================================================================
     THE ROOMS
     ===================================================================================================== */
  var ROOMS = {};

  /* ---------------- 1. OWNER'S MANUAL ---------------- */
  ROOMS.manual = {
    make: function () { return { read: [] }; },
    render: function () {
      var arts = (E.manual ? E.manual() : []).map(function (a) { return { t: a.t || a.title, c: a.c || a.b || a.body || a.text || "", g: a.g || a.group || "", k: a.k || "" }; });
      (SEED.articles || []).forEach(function (a) { arts.push({ t: a[0], c: a[1], g: a[2] || "" }); });
      (SEED.limits || []).length && arts.push({ t: "What this system does not do", c: SEED.limits.join(" "), g: "Straight answers" });
      var B = cfg(), rooms = B ? B.rooms.filter(function (r) { return !r.hidden; }) : [];
      var wings = B ? B.wings : [];
      var q = (ROOMS.manual.q || "").toLowerCase().trim();
      var words = q.split(/\s+/).filter(function (w) { return w.length > 2; });
      var hits = !q ? arts : arts.map(function (a) { var h = (a.t + " " + a.c + " " + (a.k || "")).toLowerCase(), s = 0; words.forEach(function (w) { if (h.indexOf(w) > -1) s += a.t.toLowerCase().indexOf(w) > -1 ? 3 : 1; }); return { a: a, s: s }; })
        .filter(function (x) { return x.s > 0; }).sort(function (x, y) { return y.s - x.s; }).map(function (x) { return x.a; });
      var roomHits = !q ? [] : rooms.filter(function (r) { return words.some(function (w) { return (r.label + " " + (r.blurb || "")).toLowerCase().indexOf(w) > -1; }); });
      root.innerHTML = head('<div class="ar-by">' + plural(arts.length, "article") + ' · ' + plural(rooms.length, "room") + ' · support by <b>Accelerated Experiences LLC</b></div>') +
        '<div class="ar-ask"><input id="arQ" type="search" autocomplete="off" placeholder="' + esc(SEED.ask || "Ask it anything — how do I…") + '" value="' + esc(ROOMS.manual.q || "") + '"><span>' + (q ? plural(hits.length + roomHits.length, "answer") : "Type a question. It searches every article and every room.") + '</span></div>' +
        (q && !hits.length && !roomHits.length ? card("No answer yet", '<p class="ar-note">Nothing in the manual matches. Write to <b>ae@aexperiences.studio</b> and a person answers — the question becomes the next article.</p>') : "") +
        (roomHits.length ? card("Rooms that do that", roomHits.map(function (r) { return '<a class="ar-row" href="' + esc(r.href) + '"><span class="ar-x"><b>' + esc(r.label) + '</b><small>' + esc(r.blurb || "") + '</small></span><span class="ar-go">Open ›</span></a>'; }).join("")) : "") +
        card(q ? "Answers" : "Start here", hits.slice(0, q ? 12 : 60).map(function (a, i) {
          var open = q ? i < 2 : false, done = D.read.indexOf(a.t) > -1;
          return '<details class="ar-art"' + (open ? " open" : "") + '><summary data-art="' + esc(a.t) + '"><b>' + esc(a.t) + '</b>' + (done ? '<span class="ar-tick">read</span>' : "") + (a.g ? '<small>' + esc(a.g) + '</small>' : "") + '</summary><p>' + esc(a.c) + '</p></details>';
        }).join("") || '<p class="ar-note">No articles shipped with this system yet.</p>') +
        (!q && rooms.length ? card("Every room, one line each", wings.map(function (w) {
          var rs = rooms.filter(function (r) { return r.wing === w.k; }); if (!rs.length) return "";
          return '<h3 class="ar-wing">' + esc(w.name) + '</h3>' + rs.map(function (r) { return '<a class="ar-row" href="' + esc(r.href) + '"><img class="ar-ric" src="' + esc(r.icon) + '" alt="" loading="lazy"><span class="ar-x"><b>' + esc(r.label) + '</b><small>' + esc(r.blurb || "Open the room to see it.") + '</small></span><span class="ar-go">›</span></a>'; }).join("");
        }).join("")) : "") +
        card("Talk to a person", '<p class="ar-note">The manual is the fast answer. A person is the right one for billing, a bug, or anything about your data. Write <b>ae@aexperiences.studio</b> — it reaches Accelerated Experiences LLC directly.</p>' +
          '<div class="ar-two"><a class="ar-btn ar-pri" href="mailto:ae@aexperiences.studio?subject=' + encodeURIComponent((B && B.brand ? B.brand.name : "OS") + " question") + '">Email support</a><a class="ar-btn" href="' + esc((B && B.brand && B.brand.store) || "https://aexperiences.studio/store.html") + '" target="_blank" rel="noopener">See the plans</a></div>') +
        '<p class="ar-foot">Nothing in this manual is legal, tax, clinical or financial advice.</p>';
    },
    click: function (b) { return false; },
    input: function (e) { if (e.target.id === "arQ") { ROOMS.manual.q = e.target.value; var pos = e.target.selectionStart; render(); var i = root.querySelector("#arQ"); i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) {} } }
  };
  root.addEventListener("toggle", function (e) {
    if (KIND !== "manual" || !e.target.open) return; var s = e.target.querySelector("[data-art]"); if (!s) return;
    var t = s.getAttribute("data-art"); if (D.read.indexOf(t) < 0) { D.read.push(t); save(); }
  }, true);

  /* ---------------- 2. IT · SYSTEM HEALTH ---------------- */
  ROOMS.it = {
    make: function () {
      return {
        services: (SEED.services || []).map(function (s) { return { id: uid(), name: s[0], state: s[1], signal: s[2], vendor: s[3] || "", planned: s[1] === "PLANNED" }; }),
        devices: (SEED.devices || []).map(function (d) { return { id: uid(), name: d[0], who: d[1], kind: d[2], status: d[3] || "Current", locked: false }; }),
        backups: (SEED.backups || []).map(function (b) { return { name: b[0], state: b[1], note: b[2] || "" }; }),
        checked: Date.now() - 38 * 60000, log: (SEED.log || []).map(function (l, i) { return { ts: Date.now() - (i + 1) * 97 * 60000, who: l[0], text: l[1] }; })
      };
    },
    render: function () {
      var live = D.services.filter(function (s) { return !s.planned; });
      var watch = live.filter(function (s) { return s.state === "WATCH"; }), bad = live.filter(function (s) { return s.state === "INTERVENE"; });
      var stale = D.devices.filter(function (d) { return d.status !== "Current"; });
      var tone = bad.length ? "bad" : watch.length ? "watch" : "good";
      root.innerHTML = head() +
        '<div class="ar-hero ' + tone + '"><b>' + (bad.length ? "INTERVENE" : watch.length ? "WATCH" : "ALL CLEAR") + '</b><span>' + (bad.length ? plural(bad.length, "system") + " need a person now" : watch.length ? plural(watch.length, "system") + " on watch · nothing down" : "every connected system is healthy") + ' · checked ' + stamp(D.checked) + '</span><button type="button" class="ar-btn" data-check>Run a check</button></div>' +
        stats([{ v: live.length, l: "systems watched" }, { v: watch.length, l: "on watch", tone: watch.length ? "watch" : "good" }, { v: D.devices.length, l: "devices on the account" }, { v: stale.length, l: "devices need attention", tone: stale.length ? "watch" : "good" }]) +
        card("The service board", D.services.map(function (s) {
          return '<button type="button" class="ar-row" data-svc="' + s.id + '"><span class="ar-dot ' + (s.planned ? "plain" : s.state === "CLEAR" ? "good" : s.state === "WATCH" ? "watch" : "bad") + '"></span><span class="ar-x"><b>' + esc(s.name) + '</b><small>' + esc(s.signal) + (s.vendor ? " · " + esc(s.vendor) : "") + '</small></span>' + chip(s.planned ? "Planned" : s.state) + '</button>';
        }).join("") + '<p class="ar-note">CLEAR is healthy. WATCH is slow or flaky but working. INTERVENE pages a human, no gate. PLANNED is not connected yet — it is shown so nobody assumes it is.</p>') +
        card("Devices", D.devices.map(function (d) {
          return '<button type="button" class="ar-row" data-dev="' + d.id + '"><span class="ar-x"><b>' + esc(d.name) + '</b><small>' + esc(d.who + " · " + d.kind) + (d.locked ? " · locked remotely" : "") + '</small></span>' + chip(d.locked ? "Locked" : d.status) + '</button>';
        }).join(""), '<button type="button" class="ar-btn" data-adddev>Add a device</button>') +
        card("Backups", '<div class="ar-grid">' + D.backups.map(function (b) { return '<div class="ar-tile"><b>' + esc(b.name) + '</b>' + chip(b.state) + (b.note ? '<small>' + esc(b.note) + '</small>' : "") + '</div>'; }).join("") + '</div>' +
          fence("<b>An unverified backup is not a backup.</b> Every line above says when it was last restored-and-checked, not just when it last ran.")) +
        card("The log", (D.log || []).slice(0, 10).map(function (l) { return '<div class="ar-feed"><span>' + stamp(l.ts) + '</span><span><b>' + esc(l.who) + '</b> ' + esc(l.text) + '</span></div>'; }).join("") || '<p class="ar-note">Nothing logged yet.</p>') +
        foot();
    },
    click: function (b) {
      if (b.hasAttribute("data-check")) { D.checked = Date.now(); log("ran a full check — " + D.services.filter(function (s) { return s.state === "WATCH"; }).length + " on watch"); save(); render(); toast("Checked every connected system just now.", "ok"); return true; }
      if (b.hasAttribute("data-svc")) {
        var s = D.services.filter(function (x) { return x.id === b.getAttribute("data-svc"); })[0]; if (!s) return true;
        sheet('<h3>' + esc(s.name) + '</h3><p class="ar-sub">' + (s.planned ? "Planned — not connected yet" : "State: " + s.state) + (s.vendor ? " · " + esc(s.vendor) : "") + '</p><div class="ar-big">' + chip(s.planned ? "Planned" : s.state) + '<span>' + esc(s.signal) + '</span></div>' +
          (s.planned ? '<p class="ar-note">This one shows on the board so nobody thinks it is live. When it is connected it starts reporting here on its own.</p>' :
            '<div class="ar-two">' + (s.state !== "CLEAR" ? '<button type="button" class="ar-btn ar-pri" data-fix>Mark it resolved</button>' : '<button type="button" class="ar-btn" data-watch>Put it on watch</button>') + '<button type="button" class="ar-btn" data-page>Page a person</button></div>') +
          '<button type="button" class="ar-btn ar-wide ar-quiet" data-x>Close</button>', function (x) {
            if (x.hasAttribute("data-fix")) { s.state = "CLEAR"; s.signal = "Resolved by " + YOU + " · " + clock(Date.now()); log("resolved " + s.name); save(); closeSheet(); render(); toast(s.name + " is CLEAR.", "ok"); }
            if (x.hasAttribute("data-watch")) { s.state = "WATCH"; log("put " + s.name + " on watch"); save(); closeSheet(); render(); toast(s.name + " is on WATCH.", "warn"); }
            if (x.hasAttribute("data-page")) { log("paged a person about " + s.name); save(); closeSheet(); render(); toast("Paged. A person owns " + s.name + " now.", "warn"); }
          }, s.name);
        return true;
      }
      if (b.hasAttribute("data-dev")) {
        var d = D.devices.filter(function (x) { return x.id === b.getAttribute("data-dev"); })[0]; if (!d) return true;
        sheet('<h3>' + esc(d.name) + '</h3><p class="ar-sub">' + esc(d.who + " · " + d.kind) + '</p><div class="ar-big">' + chip(d.locked ? "Locked" : d.status) + '<span>' + (d.status === "Current" ? "Up to date and signed in." : "Needs an update before it touches client data again.") + '</span></div>' +
          '<div class="ar-two">' + (d.status !== "Current" ? '<button type="button" class="ar-btn ar-pri" data-upd>Mark updated</button>' : '<span></span>') + '<button type="button" class="ar-btn" data-lock>' + (d.locked ? "Unlock it" : "Lost it? Lock it") + '</button></div>' +
          '<button type="button" class="ar-btn ar-wide ar-quiet" data-x>Close</button>', function (x) {
            if (x.hasAttribute("data-upd")) { d.status = "Current"; log("updated " + d.name); }
            else if (x.hasAttribute("data-lock")) { d.locked = !d.locked; log((d.locked ? "locked " : "unlocked ") + d.name + " (" + d.who + ")"); }
            else return; save(); closeSheet(); render(); toast(d.name + (d.locked ? " is locked. Sessions ended." : " — done."), d.locked ? "warn" : "ok");
          }, d.name);
        return true;
      }
      if (b.hasAttribute("data-adddev")) {
        sheet('<h3>Add a device</h3><label class="ar-lab">Device<input id="dN" maxlength="60" placeholder="Front desk iPad"></label><label class="ar-lab">Who uses it<input id="dW" maxlength="60" placeholder="' + esc(YOU) + '"></label><label class="ar-lab">Kind<select id="dK"><option>Phone</option><option>Tablet</option><option>Laptop</option><option>Desktop</option><option>Printer</option></select></label>' +
          '<div class="ar-two"><button type="button" class="ar-btn ar-pri" data-save>Add it</button><button type="button" class="ar-btn ar-quiet" data-x>Cancel</button></div>', function (x, s) {
            if (!x.hasAttribute("data-save") || !need(s, [["dN", "the device"], ["dW", "who uses it"]])) return;
            D.devices.push({ id: uid(), name: val(s, "dN"), who: val(s, "dW"), kind: val(s, "dK"), status: "Current", locked: false }); log("added " + val(s, "dN")); save(); closeSheet(); render(); toast("Device added.", "ok");
          }, "Add a device");
        return true;
      }
    }
  };

  /* ---------------- 3. HR · PEOPLE OPS ---------------- */
  ROOMS.hr = {
    make: function () {
      return {
        people: (SEED.people || []).map(function (p) { return { id: uid(), name: p[0], role: p[1], start: rel(p[2] || -400), status: p[3] || "Active", type: p[4] || "W-2" }; }),
        onboarding: (SEED.onboarding || []).map(function (o) { return { name: o[0], tasks: o[1].map(function (t, i) { return { t: t, done: i < (o[2] || 0) }; }) }; }),
        timeoff: (SEED.timeoff || []).map(function (t) { return { id: uid(), who: t[0], from: rel(t[1]), to: rel(t[2]), kind: t[3], state: t[4] || "Requested" }; }),
        policies: (SEED.policies || []).map(function (p) { return { name: p[0], acked: p[1], note: p[2] || "" }; }),
        reviews: (SEED.reviews || []).map(function (r) { return { who: r[0], due: rel(r[1]), kind: r[2] || "Annual review" }; }),
        log: []
      };
    },
    render: function () {
      var act = D.people.filter(function (p) { return p.status !== "Former"; }), onb = D.onboarding.filter(function (o) { return o.tasks.some(function (t) { return !t.done; }); });
      var asks = D.timeoff.filter(function (t) { return t.state === "Requested"; }), due = D.reviews.filter(function (r) { return until(r.due) <= 14; });
      var team = act.length, pol = D.policies.filter(function (p) { return p.acked < team; });
      root.innerHTML = head() +
        stats([{ v: team, l: "on the team" }, { v: onb.length, l: "onboarding now", tone: onb.length ? "watch" : "" }, { v: asks.length, l: "time-off asks waiting", tone: asks.length ? "watch" : "good" }, { v: due.length, l: "reviews due in 2 weeks", tone: due.length ? "watch" : "good" }]) +
        (asks.length ? card("Waiting on you", asks.map(function (t) {
          return '<div class="ar-row ar-static"><span class="ar-x"><b>' + esc(t.who) + ' · ' + esc(t.kind) + '</b><small>' + nice(t.from) + (t.to !== t.from ? " – " + nice(t.to) : "") + ' · starts ' + when(until(t.from)) + '</small></span><span class="ar-acts"><button type="button" class="ar-btn ar-pri ar-sm" data-to="' + t.id + '" data-ok="1">Approve</button><button type="button" class="ar-btn ar-sm" data-to="' + t.id + '" data-ok="0">Decline</button></span></div>';
        }).join(""), "", "ar-alert") : "") +
        card("The roster", D.people.map(function (p) {
          return '<div class="ar-row ar-static"><span class="ar-av">' + esc(p.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + '</span><span class="ar-x"><b>' + esc(p.name) + '</b><small>' + esc(p.role) + ' · ' + esc(p.type) + ' · since ' + nice(p.start) + '</small></span>' + chip(p.status) + '</div>';
        }).join(""), '<button type="button" class="ar-btn" data-hire>Add a person</button>') +
        (D.onboarding.length ? card("Onboarding", D.onboarding.map(function (o, oi) {
          var n = o.tasks.filter(function (t) { return t.done; }).length;
          return '<div class="ar-onb"><div class="ar-onbh"><b>' + esc(o.name) + '</b><span>' + n + ' of ' + o.tasks.length + '</span></div><i class="ar-bar"><i style="width:' + Math.round(n / o.tasks.length * 100) + '%" class="' + (n === o.tasks.length ? "good" : "watch") + '"></i></i>' +
            o.tasks.map(function (t, ti) { return '<button type="button" class="ar-task' + (t.done ? " done" : "") + '" data-task="' + oi + ':' + ti + '"><span class="ar-box">' + (t.done ? "✓" : "") + '</span>' + esc(t.t) + '</button>'; }).join("") + '</div>';
        }).join("")) : "") +
        card("Policies everyone signs", D.policies.map(function (p) {
          return '<div class="ar-row ar-static"><span class="ar-x"><b>' + esc(p.name) + '</b><small>' + p.acked + ' of ' + team + ' acknowledged' + (p.note ? " · " + esc(p.note) : "") + '</small></span>' + (p.acked < team ? '<button type="button" class="ar-btn ar-sm" data-nudge="' + esc(p.name) + '">Nudge ' + (team - p.acked) + '</button>' : chip("Acknowledged")) + '</div>';
        }).join("")) +
        card("Reviews coming up", D.reviews.slice().sort(function (a, b) { return until(a.due) - until(b.due); }).map(function (r) {
          var n = until(r.due); return '<div class="ar-row ar-static"><span class="ar-x"><b>' + esc(r.who) + '</b><small>' + esc(r.kind) + ' · ' + nice(r.due) + '</small></span>' + chip(n < 0 ? "Overdue" : n <= 14 ? "Due soon" : when(n)) + '</div>';
        }).join("") || '<p class="ar-note">No reviews scheduled.</p>') +
        (SEED.fence ? fence(SEED.fence) : "") + foot();
    },
    click: function (b) {
      if (b.hasAttribute("data-to")) { var t = D.timeoff.filter(function (x) { return x.id === b.getAttribute("data-to"); })[0]; if (!t) return true; t.state = b.getAttribute("data-ok") === "1" ? "Approved" : "Declined"; save(); render(); toast(t.who + "'s " + t.kind.toLowerCase() + " — " + t.state.toLowerCase() + ". It is on the calendar.", t.state === "Approved" ? "ok" : "warn"); return true; }
      if (b.hasAttribute("data-task")) { var p = b.getAttribute("data-task").split(":"), tk = D.onboarding[+p[0]].tasks[+p[1]]; tk.done = !tk.done; save(); render(); if (D.onboarding[+p[0]].tasks.every(function (x) { return x.done; })) toast(D.onboarding[+p[0]].name + " is fully onboarded.", "ok"); return true; }
      if (b.hasAttribute("data-nudge")) { toast("Reminder sent to everyone who has not signed " + b.getAttribute("data-nudge") + ".", "ok"); return true; }
      if (b.hasAttribute("data-hire")) {
        sheet('<h3>Add a person</h3><label class="ar-lab">Name<input id="hN" maxlength="60"></label><label class="ar-lab">Role<input id="hR" maxlength="60" placeholder="' + esc((SEED.people && SEED.people[0] && SEED.people[0][1]) || "Role") + '"></label><label class="ar-lab">Type<select id="hT"><option>W-2</option><option>1099</option><option>Part-time</option></select></label>' +
          '<div class="ar-two"><button type="button" class="ar-btn ar-pri" data-save>Add and start onboarding</button><button type="button" class="ar-btn ar-quiet" data-x>Cancel</button></div>', function (x, s) {
            if (!x.hasAttribute("data-save") || !need(s, [["hN", "a name"], ["hR", "a role"]])) return;
            var nm = val(s, "hN"); D.people.push({ id: uid(), name: nm, role: val(s, "hR"), start: rel(0), status: "Onboarding", type: val(s, "hT") });
            D.onboarding.unshift({ name: nm, tasks: (SEED.checklist || ["Offer letter signed", "I-9 and W-4", "Direct deposit", "Handbook acknowledged", "Accounts and devices", "First-week buddy"]).map(function (t) { return { t: t, done: false }; }) });
            save(); closeSheet(); render(); toast(nm + " is on the roster. The onboarding checklist is started.", "ok");
          }, "Add a person");
        return true;
      }
    }
  };

  /* ---------------- 4. LAW · CONTRACTS ---------------- */
  ROOMS.law = {
    make: function () {
      return {
        matters: (SEED.matters || []).map(function (m) { return { id: uid(), title: m[0], kind: m[1], risk: m[2], state: m[3] || "Open", note: m[4] || "" }; }),
        contracts: (SEED.contracts || []).map(function (c) { return { id: uid(), name: c[0], party: c[1], renews: rel(c[2]), auto: !!c[3], note: c[4] || "" }; }),
        deadlines: (SEED.deadlines || []).map(function (d) { return { id: uid(), what: d[0], due: rel(d[1]), rule: d[2] || "", done: false }; }),
        log: []
      };
    },
    render: function () {
      var open = D.matters.filter(function (m) { return m.state === "Open"; }), high = open.filter(function (m) { return m.risk === "High"; });
      var soon = D.contracts.filter(function (c) { return until(c.renews) <= 60; }), dl = D.deadlines.filter(function (d) { return !d.done; }).sort(function (a, b) { return until(a.due) - until(b.due); });
      root.innerHTML = head() +
        stats([{ v: open.length, l: "open matters" }, { v: high.length, l: "high risk", tone: high.length ? "bad" : "good" }, { v: soon.length, l: "contracts renew in 60 days", tone: soon.length ? "watch" : "good" }, { v: dl.filter(function (d) { return until(d.due) <= 30; }).length, l: "deadlines this month", tone: "watch" }]) +
        fence(SEED.fence || "<b>Advisory only.</b> This room reads the rules and flags the risk. It does not give legal advice and it never stands in for a licensed attorney — anything marked High goes to one.", "bad") +
        card("Matters", D.matters.slice().sort(function (a, b) { return (a.state === "Open" ? 0 : 1) - (b.state === "Open" ? 0 : 1) || ["High", "Medium", "Low"].indexOf(a.risk) - ["High", "Medium", "Low"].indexOf(b.risk); }).map(function (m) {
          return '<button type="button" class="ar-row" data-mat="' + m.id + '"><span class="ar-dot ' + (m.state !== "Open" ? "plain" : m.risk === "High" ? "bad" : m.risk === "Medium" ? "watch" : "good") + '"></span><span class="ar-x"><b>' + esc(m.title) + '</b><small>' + esc(m.kind) + (m.note ? " · " + esc(m.note) : "") + '</small></span>' + chip(m.state === "Open" ? m.risk : m.state) + '</button>';
        }).join(""), '<button type="button" class="ar-btn" data-addmat>Open a matter</button>') +
        card("Contracts and renewals", D.contracts.slice().sort(function (a, b) { return until(a.renews) - until(b.renews); }).map(function (c) {
          var n = until(c.renews); return '<div class="ar-row ar-static"><span class="ar-x"><b>' + esc(c.name) + '</b><small>' + esc(c.party) + ' · ' + (c.auto ? "auto-renews " : "ends ") + nice(c.renews) + (c.note ? " · " + esc(c.note) : "") + '</small></span>' + chip(n < 0 ? "Expired" : n <= 30 ? "Due soon" : when(n)) + '</div>';
        }).join("") + '<p class="ar-note">Auto-renewals are the expensive ones. Each one flags 60 days out so there is time to say no.</p>') +
        card("Compliance calendar", dl.map(function (d) {
          var n = until(d.due); return '<button type="button" class="ar-row" data-dl="' + d.id + '"><span class="ar-box">' + '</span><span class="ar-x"><b>' + esc(d.what) + '</b><small>' + esc(d.rule) + ' · due ' + nice(d.due) + '</small></span>' + chip(n < 0 ? "Overdue" : n <= 14 ? "Due soon" : when(n)) + '</button>';
        }).join("") || '<p class="ar-note">Every deadline is done.</p>') + foot();
    },
    click: function (b) {
      if (b.hasAttribute("data-dl")) { var d = D.deadlines.filter(function (x) { return x.id === b.getAttribute("data-dl"); })[0]; if (d) { d.done = true; save(); render(); toast(d.what + " — done and filed.", "ok"); } return true; }
      if (b.hasAttribute("data-mat")) {
        var m = D.matters.filter(function (x) { return x.id === b.getAttribute("data-mat"); })[0]; if (!m) return true;
        sheet('<h3>' + esc(m.title) + '</h3><p class="ar-sub">' + esc(m.kind) + ' · ' + esc(m.state) + '</p><div class="ar-big">' + chip(m.risk) + '<span>' + esc(m.note || "No notes yet.") + '</span></div>' +
          (m.risk === "High" && m.state === "Open" ? fence("<b>This one goes to a licensed attorney.</b> The room drafted the summary; a person signs off.", "bad") : "") +
          '<div class="ar-two">' + (m.state === "Open" ? '<button type="button" class="ar-btn ar-pri" data-close>Close the matter</button><button type="button" class="ar-btn" data-atty>Send to counsel</button>' : '<button type="button" class="ar-btn" data-reopen>Reopen it</button><span></span>') + '</div>' +
          '<button type="button" class="ar-btn ar-wide ar-quiet" data-x>Close</button>', function (x) {
            if (x.hasAttribute("data-close")) m.state = "Closed"; else if (x.hasAttribute("data-reopen")) m.state = "Open"; else if (x.hasAttribute("data-atty")) { m.note = "With counsel since " + nice(rel(0)); } else return;
            save(); closeSheet(); render(); toast(m.title + " — " + (x.hasAttribute("data-atty") ? "summary sent to counsel." : m.state.toLowerCase() + "."), "ok");
          }, m.title);
        return true;
      }
      if (b.hasAttribute("data-addmat")) {
        sheet('<h3>Open a matter</h3><label class="ar-lab">What is it<input id="mT" maxlength="90"></label><label class="ar-lab">Kind<input id="mK" maxlength="60" placeholder="' + esc((SEED.matters && SEED.matters[0] && SEED.matters[0][1]) || "Dispute") + '"></label><label class="ar-lab">Risk<select id="mR"><option>Low</option><option>Medium</option><option>High</option></select></label><label class="ar-lab">Notes<textarea id="mN" rows="3" maxlength="400"></textarea></label>' +
          '<div class="ar-two"><button type="button" class="ar-btn ar-pri" data-save>Open it</button><button type="button" class="ar-btn ar-quiet" data-x>Cancel</button></div>', function (x, s) {
            if (!x.hasAttribute("data-save") || !need(s, [["mT", "what it is"], ["mK", "the kind"]])) return;
            D.matters.unshift({ id: uid(), title: val(s, "mT"), kind: val(s, "mK"), risk: val(s, "mR"), state: "Open", note: val(s, "mN") }); save(); closeSheet(); render(); toast("Matter opened.", val(s, "mR") === "High" ? "warn" : "ok");
          }, "Open a matter");
        return true;
      }
    }
  };

  /* ---------------- 5. DOCUMENTS ---------------- */
  ROOMS.documents = {
    make: function () {
      return {
        templates: (SEED.templates || []).map(function (t) { return { id: uid(), name: t[0], cat: t[1], fields: t[2] || [], body: t[3] || "" }; }),
        files: (SEED.files || []).map(function (f) { return { id: uid(), name: f[0], cat: f[1], who: f[2], date: rel(f[3] || 0), status: f[4] || "Filed" }; })
      };
    },
    render: function () {
      var F = ROOMS.documents.f = ROOMS.documents.f || { q: "", cat: "All" };
      var cats = ["All"]; D.templates.concat(D.files).forEach(function (x) { if (cats.indexOf(x.cat) < 0) cats.push(x.cat); });
      var q = F.q.toLowerCase(), m = function (x) { return (F.cat === "All" || x.cat === F.cat) && (!q || (x.name + " " + x.cat + " " + (x.who || "")).toLowerCase().indexOf(q) > -1); };
      var drafts = D.files.filter(function (f) { return f.status === "Draft"; }), out = D.files.filter(function (f) { return f.status === "Out for signature"; });
      root.innerHTML = head() +
        stats([{ v: D.files.length, l: "documents filed" }, { v: D.templates.length, l: "templates ready" }, { v: drafts.length, l: "drafts", tone: drafts.length ? "watch" : "" }, { v: out.length, l: "out for signature", tone: out.length ? "watch" : "" }]) +
        '<div class="ar-tools"><input class="ar-q" id="dQ" type="search" placeholder="Find a document or a template" value="' + esc(F.q) + '"><div class="ar-chips">' + cats.map(function (c) { return '<button type="button" class="ar-chipb' + (F.cat === c ? " on" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join("") + '</div></div>' +
        card("Start from a template", '<div class="ar-grid">' + D.templates.filter(m).map(function (t) { return '<button type="button" class="ar-tile ar-tbtn" data-tpl="' + t.id + '"><b>' + esc(t.name) + '</b><small>' + esc(t.cat) + ' · ' + plural(t.fields.length, "blank") + '</small><span class="ar-go">Fill it ›</span></button>'; }).join("") + '</div>' || '<p class="ar-note">No template matches.</p>') +
        card("The cabinet", D.files.filter(m).sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (f) {
          return '<button type="button" class="ar-row" data-file="' + f.id + '"><span class="ar-doc">' + esc((f.name.split(".").pop() || "doc").slice(0, 4).toUpperCase()) + '</span><span class="ar-x"><b>' + esc(f.name) + '</b><small>' + esc(f.cat) + ' · ' + esc(f.who) + ' · ' + nice(f.date) + '</small></span>' + chip(f.status) + '</button>';
        }).join("") || '<p class="ar-note">Nothing matches. Clear the search or pick All.</p>') + foot();
    },
    click: function (b) {
      var F = ROOMS.documents.f;
      if (b.hasAttribute("data-cat")) { F.cat = b.getAttribute("data-cat"); render(); return true; }
      if (b.hasAttribute("data-tpl")) {
        var t = D.templates.filter(function (x) { return x.id === b.getAttribute("data-tpl"); })[0]; if (!t) return true;
        sheet('<h3>' + esc(t.name) + '</h3><p class="ar-sub">' + esc(t.cat) + ' · fill the blanks, it files itself</p>' + t.fields.map(function (f, i) { return '<label class="ar-lab">' + esc(f) + '<input id="f' + i + '" maxlength="120"></label>'; }).join("") +
          (t.body ? '<div class="ar-paper">' + esc(t.body) + '</div>' : "") +
          '<div class="ar-two"><button type="button" class="ar-btn ar-pri" data-save="sign">' + (C.signHref ? "Save and send to e-Sign" : "Save and file it") + '</button><button type="button" class="ar-btn" data-save="draft">Save as draft</button></div><button type="button" class="ar-btn ar-wide ar-quiet" data-x>Cancel</button>', function (x, s) {
            if (!x.hasAttribute("data-save") || !need(s, t.fields.map(function (f, i) { return ["f" + i, f]; }))) return;
            var who = val(s, "f0"), sign = x.getAttribute("data-save") === "sign" && C.signHref;
            var f = { id: uid(), name: t.name + " — " + who, cat: t.cat, who: YOU, date: rel(0), status: x.getAttribute("data-save") === "draft" ? "Draft" : sign ? "Out for signature" : "Filed" };
            D.files.unshift(f); save();
            if (sign) { try { var k = "ae-room:" + OS + ":sign-queue", qd = JSON.parse(localStorage.getItem(k) || "[]"); qd.push({ doc: f.name, to: who }); localStorage.setItem(k, JSON.stringify(qd)); } catch (e) {} }
            closeSheet(); render(); toast(f.name + (f.status === "Draft" ? " saved as a draft." : sign ? " is on its way to e-Sign." : " is filed."), "ok");
            if (sign) setTimeout(function () { location.href = C.signHref; }, 900);
          }, t.name);
        return true;
      }
      if (b.hasAttribute("data-file")) {
        var f = D.files.filter(function (x) { return x.id === b.getAttribute("data-file"); })[0]; if (!f) return true;
        sheet('<h3>' + esc(f.name) + '</h3><p class="ar-sub">' + esc(f.cat) + ' · ' + esc(f.who) + ' · ' + nice(f.date) + '</p><div class="ar-big">' + chip(f.status) + '<span>' + (f.status === "Draft" ? "Not sent. Only you can see a draft." : f.status === "Out for signature" ? "Waiting on a signature." : "Filed in the cabinet.") + '</span></div>' +
          '<div class="ar-two">' + (f.status === "Draft" ? '<button type="button" class="ar-btn ar-pri" data-file-file>File it</button>' : '<button type="button" class="ar-btn" data-file-dl>Download</button>') + '<button type="button" class="ar-btn" data-file-del>Remove</button></div><button type="button" class="ar-btn ar-wide ar-quiet" data-x>Close</button>', function (x) {
            if (x.hasAttribute("data-file-file")) { f.status = "Filed"; save(); closeSheet(); render(); toast("Filed.", "ok"); }
            if (x.hasAttribute("data-file-dl")) { toast("In the live system this downloads the PDF. The showroom keeps the sample.", "ok"); }
            if (x.hasAttribute("data-file-del")) { D.files = D.files.filter(function (y) { return y !== f; }); save(); closeSheet(); render(); toast("Removed from the cabinet.", "ok"); }
          }, f.name);
        return true;
      }
    },
    input: function (e) { if (e.target.id === "dQ") { ROOMS.documents.f.q = e.target.value; var p = e.target.selectionStart; render(); var i = root.querySelector("#dQ"); i.focus(); try { i.setSelectionRange(p, p); } catch (x) {} } }
  };

  /* ---------------- 6. e-SIGN ---------------- */
  ROOMS.sign = {
    make: function () {
      return { env: (SEED.envelopes || []).map(function (e, i) { return { id: uid(), doc: e[0], to: e[1], state: e[2], sent: rel(e[3] || -1), trail: [[Date.now() - (i + 2) * 3600000 * 7, "Sent to " + e[1]]].concat(e[2] === "Signed" ? [[Date.now() - (i + 1) * 3600000 * 3, "Signed by " + e[1]]] : e[2] === "Viewed" ? [[Date.now() - (i + 1) * 3600000 * 2, "Opened by " + e[1]]] : []) }; }) };
    },
    render: function () {
      try { var k = "ae-room:" + OS + ":sign-queue", qd = JSON.parse(localStorage.getItem(k) || "[]"); if (qd.length) { qd.forEach(function (q) { D.env.unshift({ id: uid(), doc: q.doc, to: q.to, state: "Out for signature", sent: rel(0), trail: [[Date.now(), "Sent to " + q.to + " from Documents"]] }); }); localStorage.removeItem(k); save(); } } catch (e) {}
      var waiting = D.env.filter(function (e) { return e.state === "Out for signature" || e.state === "Viewed"; }), signed = D.env.filter(function (e) { return e.state === "Signed"; });
      root.innerHTML = head() +
        stats([{ v: waiting.length, l: "waiting on a signature", tone: waiting.length ? "watch" : "good" }, { v: signed.length, l: "signed" }, { v: D.env.filter(function (e) { return e.state === "Declined"; }).length, l: "declined" }, { v: D.env.length, l: "envelopes in all" }]) +
        card("Envelopes", D.env.map(function (e) {
          return '<button type="button" class="ar-row" data-env="' + e.id + '"><span class="ar-doc">✍</span><span class="ar-x"><b>' + esc(e.doc) + '</b><small>to ' + esc(e.to) + ' · sent ' + nice(e.sent) + '</small></span>' + chip(e.state) + '</button>';
        }).join("") || '<p class="ar-note">No envelopes yet.</p>', '<button type="button" class="ar-btn ar-pri" data-new>Send for signature</button>') +
        fence((SEED.consent || "Every signature carries the signer's consent to sign electronically, a timestamp and the device it was signed on — the audit trail an e-signature needs to hold up.")) + foot();
    },
    click: function (b) {
      if (b.hasAttribute("data-new")) {
        sheet('<h3>Send for signature</h3><label class="ar-lab">Document<input id="sD" maxlength="100" list="sDl" placeholder="' + esc((SEED.envelopes && SEED.envelopes[0] && SEED.envelopes[0][0]) || "Agreement") + '"></label><datalist id="sDl">' + (SEED.docs || []).map(function (d) { return '<option value="' + esc(d) + '">'; }).join("") + '</datalist><label class="ar-lab">Signer\'s name<input id="sT" maxlength="60"></label><label class="ar-lab">Signer\'s email<input id="sE" type="email" maxlength="90"></label>' +
          '<div class="ar-two"><button type="button" class="ar-btn ar-pri" data-save>Send it</button><button type="button" class="ar-btn ar-quiet" data-x>Cancel</button></div>', function (x, s) {
            if (!x.hasAttribute("data-save") || !need(s, [["sD", "the document"], ["sT", "the signer's name"], ["sE", "the signer's email"]])) return;
            D.env.unshift({ id: uid(), doc: val(s, "sD"), to: val(s, "sT"), state: "Out for signature", sent: rel(0), trail: [[Date.now(), "Sent to " + val(s, "sT") + " <" + val(s, "sE") + ">"]] }); save(); closeSheet(); render(); toast("Sent. You will see it the moment they open it.", "ok");
          }, "Send for signature");
        return true;
      }
      if (b.hasAttribute("data-env")) {
        var e = D.env.filter(function (x) { return x.id === b.getAttribute("data-env"); })[0]; if (!e) return true;
        var canSign = e.state === "Out for signature" || e.state === "Viewed";
        var s = sheet('<h3>' + esc(e.doc) + '</h3><p class="ar-sub">to ' + esc(e.to) + ' · ' + esc(e.state) + '</p>' +
          (canSign ? '<p class="ar-note">Signing in person? Hand them the screen.</p><canvas class="ar-pad" id="sPad" width="560" height="170" aria-label="Signature pad"></canvas><label class="ar-chk"><input type="checkbox" id="sOk"> ' + esc(e.to) + ' agrees to sign electronically</label>' +
            '<div class="ar-two"><button type="button" class="ar-btn ar-pri" data-sign>Sign it</button><button type="button" class="ar-btn" data-clear>Clear</button></div><button type="button" class="ar-btn ar-wide" data-remind>Send a reminder</button>' : "") +
          '<h4 class="ar-h4">Audit trail</h4>' + e.trail.map(function (t) { return '<div class="ar-feed"><span>' + stamp(t[0]) + '</span><span>' + esc(t[1]) + '</span></div>'; }).join("") +
          '<button type="button" class="ar-btn ar-wide ar-quiet" data-x>Close</button>', function (x, sh) {
            var pad = sh.querySelector("#sPad");
            if (x.hasAttribute("data-clear") && pad) { pad.getContext("2d").clearRect(0, 0, pad.width, pad.height); pad._inked = false; return; }
            if (x.hasAttribute("data-remind")) { e.trail.push([Date.now(), "Reminder sent to " + e.to]); save(); toast("Reminder sent to " + e.to + ".", "ok"); closeSheet(); return; }
            if (x.hasAttribute("data-sign")) {
              var miss = []; if (!pad || !pad._inked) miss.push("a signature on the pad"); if (!sh.querySelector("#sOk").checked) miss.push("their consent to sign electronically");
              var bx = sh.querySelector(".ar-miss"); if (bx) bx.remove();
              if (miss.length) { bx = document.createElement("div"); bx.className = "ar-miss"; bx.setAttribute("role", "alert"); bx.innerHTML = "<b>Still needed:</b> " + esc(miss.join(" and ")) + "."; pad.parentNode.insertBefore(bx, pad); return; }
              e.state = "Signed"; e.trail.push([Date.now(), "Signed by " + e.to + " in person · consent recorded · " + (navigator.userAgent.indexOf("Mobile") > -1 ? "phone" : "computer")]); save(); closeSheet(); render(); toast(e.doc + " is signed. A copy is filed.", "ok");
            }
          }, e.doc);
        var pad = s.querySelector("#sPad");
        if (pad) {
          var g = pad.getContext("2d"), down = false; g.lineWidth = 2.4; g.lineCap = "round"; g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--bs-ink") || "#1e1813";
          var pt = function (ev) { var r = pad.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev; return [(p.clientX - r.left) * pad.width / r.width, (p.clientY - r.top) * pad.height / r.height]; };
          var start = function (ev) { down = true; var p = pt(ev); g.beginPath(); g.moveTo(p[0], p[1]); ev.preventDefault(); };
          var move = function (ev) { if (!down) return; var p = pt(ev); g.lineTo(p[0], p[1]); g.stroke(); pad._inked = true; ev.preventDefault(); };
          var end = function () { down = false; };
          pad.addEventListener("mousedown", start); pad.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
          pad.addEventListener("touchstart", start, { passive: false }); pad.addEventListener("touchmove", move, { passive: false }); pad.addEventListener("touchend", end);
        }
        if (e.state === "Out for signature") { e.state = "Viewed"; e.trail.push([Date.now(), "Opened by " + YOU]); save(); render(); }
        return true;
      }
    }
  };

  /* ---------------- 7. MASTER LIST ---------------- */
  ROOMS.masterlist = {
    make: function () { return { items: (SEED.items || []).map(function (x) { return { id: uid(), text: x[0], note: x[1] || "", pri: x[2] || "Soon", done: !!x[3] }; }), pri: "Now" }; },
    render: function () {
      var PRIS = ["Now", "Soon", "Someday"], open = D.items.filter(function (i) { return !i.done; });
      root.innerHTML = head('<div class="ar-by">🔒 Private to the ' + esc(SEED.who || "owner") + '. Nobody else sees this room.</div>') +
        stats(PRIS.map(function (p) { var n = open.filter(function (i) { return i.pri === p; }).length; return { v: n, l: p.toLowerCase(), tone: p === "Now" && n ? "watch" : "" }; }).concat([{ v: D.items.length - open.length, l: "crossed off", tone: "good" }])) +
        '<section class="ar-card ar-add"><input id="mlT" maxlength="140" placeholder="Write it down before it wakes you up at 2am…"><div class="ar-chips">' + PRIS.map(function (p) { return '<button type="button" class="ar-chipb' + (D.pri === p ? " on" : "") + '" data-pri="' + p + '">' + p + '</button>'; }).join("") + '</div><button type="button" class="ar-btn ar-pri" data-add>Add</button></section>' +
        PRIS.map(function (p) {
          var rows = D.items.filter(function (i) { return i.pri === p; }); if (!rows.length) return "";
          return card(p, rows.sort(function (a, b) { return a.done - b.done; }).map(function (i) {
            return '<div class="ar-ml' + (i.done ? " done" : "") + '"><button type="button" class="ar-box" data-tgl="' + i.id + '" aria-label="' + (i.done ? "Undo" : "Done") + '">' + (i.done ? "✓" : "") + '</button><span class="ar-x"><b>' + esc(i.text) + '</b>' + (i.note ? '<small>' + esc(i.note) + '</small>' : "") + '</span><button type="button" class="ar-del" data-mv="' + i.id + '" title="Move">⇅</button><button type="button" class="ar-del" data-del="' + i.id + '" aria-label="Remove">×</button></div>';
          }).join(""));
        }).join("") +
        card("Private means private", '<p class="ar-note">Not a job board and not the Approval Desk — this is the napkin in your pocket, kept where you actually run the ' + esc(C.house || "business") + '. Staff seats, the portal and the agents never see it.</p>') + foot();
    },
    click: function (b) {
      if (b.hasAttribute("data-pri")) { D.pri = b.getAttribute("data-pri"); save(); render(); return true; }
      if (b.hasAttribute("data-add")) { var t = root.querySelector("#mlT").value.trim(); if (!t) { toast("Write something first.", "warn"); return true; } D.items.unshift({ id: uid(), text: t, note: "", pri: D.pri, done: false }); save(); render(); toast("On the list — " + D.pri.toLowerCase() + ".", "ok"); return true; }
      var id = b.getAttribute("data-tgl") || b.getAttribute("data-del") || b.getAttribute("data-mv"); if (!id) return;
      var it = D.items.filter(function (x) { return x.id === id; })[0]; if (!it) return true;
      if (b.hasAttribute("data-tgl")) it.done = !it.done;
      if (b.hasAttribute("data-del")) D.items = D.items.filter(function (x) { return x !== it; });
      if (b.hasAttribute("data-mv")) it.pri = { Now: "Soon", Soon: "Someday", Someday: "Now" }[it.pri];
      save(); render(); return true;
    },
    keydown: function (e) { if (e.target.id === "mlT" && e.key === "Enter") { var b = root.querySelector("[data-add]"); if (b) b.click(); } }
  };

  /* ---------------- 8. MAIL ---------------- */
  ROOMS.mail = {
    make: function () {
      return { box: "Inbox", open: null, msgs: (SEED.mail || []).map(function (m, i) { return { id: uid(), box: m[5] || "Inbox", from: m[0], subj: m[1], body: m[2], ts: Date.now() - (m[3] || i * 2) * 3600000, tag: m[4] || "", read: i > 2, star: false }; }) };
    },
    render: function () {
      var BOX = ["Inbox", "Starred", "Sent", "Drafts", "Archive"];
      var unread = D.msgs.filter(function (m) { return m.box === "Inbox" && !m.read; }).length;
      var list = D.msgs.filter(function (m) { return D.box === "Starred" ? m.star : m.box === D.box; }).sort(function (a, b) { return b.ts - a.ts; });
      var cur = D.msgs.filter(function (m) { return m.id === D.open; })[0];
      root.innerHTML = head('<div class="ar-by">' + esc(SEED.address || "office@yourbusiness.com") + ' · ' + plural(unread, "unread") + '</div>') +
        '<div class="ar-mail"><nav class="ar-folders">' + BOX.map(function (b) { var n = b === "Inbox" ? unread : b === "Starred" ? D.msgs.filter(function (m) { return m.star; }).length : D.msgs.filter(function (m) { return m.box === b; }).length; return '<button type="button" class="ar-fold' + (D.box === b ? " on" : "") + '" data-box="' + b + '">' + b + (n ? '<i' + (b === "Inbox" ? "" : ' class="q"') + '>' + n + '</i>' : "") + '</button>'; }).join("") + '<button type="button" class="ar-btn ar-pri ar-compose" data-compose>Write</button></nav>' +
        '<div class="ar-list">' + (list.map(function (m) {
          return '<button type="button" class="ar-msg' + (m.read ? "" : " unread") + (cur && cur.id === m.id ? " on" : "") + '" data-msg="' + m.id + '"><span class="ar-mh"><b>' + esc(D.box === "Sent" || D.box === "Drafts" ? "To " + m.from : m.from) + '</b><span>' + (m.star ? "★ " : "") + stamp(m.ts) + '</span></span><span class="ar-ms">' + esc(m.subj) + (m.tag ? ' <em>' + esc(m.tag) + '</em>' : "") + '</span><span class="ar-mp">' + esc(m.body.slice(0, 110)) + '</span></button>';
        }).join("") || '<p class="ar-note ar-padin">' + (D.box === "Inbox" ? "Inbox zero. Go do something fun." : "Nothing in " + D.box + ".") + '</p>') + '</div>' +
        '<article class="ar-read">' + (cur ? '<div class="ar-rh"><button type="button" class="ar-btn ar-sm ar-back-btn" data-msg-close>‹ Back</button><h2>' + esc(cur.subj) + '</h2><p class="ar-sub">' + esc(cur.box === "Sent" ? "To " : "From ") + esc(cur.from) + ' · ' + stamp(cur.ts) + '</p></div><div class="ar-body">' + esc(cur.body).replace(/\n/g, "<br>") + '</div>' +
          '<div class="ar-two"><button type="button" class="ar-btn ar-pri" data-reply>Reply</button><button type="button" class="ar-btn" data-star>' + (cur.star ? "Unstar" : "★ Star") + '</button></div>' + (cur.box !== "Archive" ? '<button type="button" class="ar-btn ar-wide" data-arch>Archive</button>' : "")
          : '<div class="ar-empty"><b>' + esc(D.box) + '</b><span>Pick a message to read it.</span></div>') + '</article></div>' +
        foot(SEED.honest || "The showroom mailbox never sends anything. In the live system this is your real business inbox.");
      root.querySelector(".ar-mail").classList.toggle("reading", !!cur);
    },
    click: function (b) {
      if (b.hasAttribute("data-box")) { D.box = b.getAttribute("data-box"); D.open = null; save(); render(); return true; }
      if (b.hasAttribute("data-msg")) { D.open = b.getAttribute("data-msg"); var m = D.msgs.filter(function (x) { return x.id === D.open; })[0]; if (m) m.read = true; save(); render(); var r = root.querySelector(".ar-read"); if (r && window.innerWidth <= 720) r.scrollIntoView({ block: "start" }); return true; }
      if (b.hasAttribute("data-msg-close")) { D.open = null; save(); render(); return true; }
      var cur = D.msgs.filter(function (x) { return x.id === D.open; })[0];
      if (b.hasAttribute("data-star") && cur) { cur.star = !cur.star; save(); render(); return true; }
      if (b.hasAttribute("data-arch") && cur) { cur.box = "Archive"; D.open = null; save(); render(); toast("Archived.", "ok"); return true; }
      if (b.hasAttribute("data-compose") || (b.hasAttribute("data-reply") && cur)) {
        var to = cur && b.hasAttribute("data-reply") ? cur.from : "", sj = cur && b.hasAttribute("data-reply") ? (/^re:/i.test(cur.subj) ? cur.subj : "Re: " + cur.subj) : "";
        sheet('<h3>' + (to ? "Reply" : "New message") + '</h3><label class="ar-lab">To<input id="cT" maxlength="90" value="' + esc(to) + '"></label><label class="ar-lab">Subject<input id="cS" maxlength="120" value="' + esc(sj) + '"></label><label class="ar-lab">Message<textarea id="cB" rows="7" maxlength="4000"></textarea></label>' +
          '<div class="ar-two"><button type="button" class="ar-btn ar-pri" data-send>Send</button><button type="button" class="ar-btn" data-draft>Save draft</button></div><button type="button" class="ar-btn ar-wide ar-quiet" data-x>Cancel</button>', function (x, s) {
            var dr = x.hasAttribute("data-draft"); if (!x.hasAttribute("data-send") && !dr) return;
            if (!dr && !need(s, [["cT", "who it is to"], ["cS", "a subject"], ["cB", "the message"]])) return;
            D.msgs.push({ id: uid(), box: dr ? "Drafts" : "Sent", from: val(s, "cT") || "(no one yet)", subj: val(s, "cS") || "(no subject)", body: val(s, "cB"), ts: Date.now(), tag: "", read: true, star: false });
            save(); closeSheet(); render(); toast(dr ? "Draft saved." : "Sent — it is in Sent.", "ok");
          }, "Write");
        return true;
      }
    }
  };

  /* ---------------- 9. SKINS ---------------- */
  ROOMS.skins = {
    make: function () { return {}; },
    render: function () {
      var BS = shell();
      if (!BS || !BS.SKINS) { root.innerHTML = head() + '<p class="ar-note">Loading the skins…</p>'; return setTimeout(render, 150); }
      var B = cfg() || {}, all = Object.assign({}, BS.SKINS, B.skins || {}), keys = Object.keys(all), cur = "";
      try { cur = localStorage.getItem("birdseye:" + B.id + ":skin") || B.defaultSkin || "studio"; } catch (e) { cur = "studio"; }
      if (!all[cur]) cur = keys[0];
      var dark = function (k) { return !!all[k].dark || /night|dark/i.test(k); };
      function sw(k) {
        var s = all[k], v = s.v;
        return '<button type="button" class="ar-skin' + (k === cur ? " on" : "") + '" data-skin="' + esc(k) + '">' +
          '<span class="ar-skp" style="background:' + v.paper + '"><i class="r" style="background:' + v.char + '"></i><i class="h" style="background:' + v.card + ';border-color:' + v.rule + '"><em style="background:' + v.red + '"></em><em style="background:' + v.gold + '"></em></i><i class="c" style="background:' + v.card + ';border-color:' + v.rule + '"></i><i class="d" style="background:' + v.ink + '"></i></span>' +
          '<b>' + esc(s.name) + (k === cur ? '<span class="ar-on">On</span>' : "") + '</b><small>' + esc(s.note || "") + '</small></button>';
      }
      var light = keys.filter(function (k) { return !dark(k); }), night = keys.filter(dark);
      root.innerHTML = head('<div class="ar-by">Now wearing <b>' + esc(all[cur].name) + '</b> · ' + plural(keys.length, "skin") + ', every one with a light or dark twin</div>') +
        '<div class="ar-hero plain"><b>' + esc(all[cur].name) + '</b><span>One tap repaints every room, the floor plan, the dock and the helper — on this device, right now.</span><button type="button" class="ar-btn" data-twin>Flip to the ' + (dark(cur) ? "light" : "dark") + ' twin ◐</button></div>' +
        card("Light", '<div class="ar-skins">' + light.map(sw).join("") + '</div>') +
        card("Dark", '<div class="ar-skins">' + night.map(sw).join("") + '</div>') +
        card("Why a skin and not a theme", '<p class="ar-note">' + esc(SEED.why || "A skin is the whole look at once — paper, ink, cards, the accent and the gold — tuned so every number stays readable. The Studio skin (cream, red and gold) is what a new system wakes up in. Each person picks their own; it is remembered on their device.") + '</p>');
    },
    click: function (b) {
      var BS = shell(); if (!BS) return true;
      if (b.hasAttribute("data-skin")) { BS.setSkin(b.getAttribute("data-skin")); render(); toast((BS.SKINS[b.getAttribute("data-skin")] || {}).name + " — on.", "ok"); return true; }
      if (b.hasAttribute("data-twin")) { var B = cfg() || {}, all = Object.assign({}, BS.SKINS, B.skins || {}), k = "studio"; try { k = localStorage.getItem("birdseye:" + B.id + ":skin") || B.defaultSkin || "studio"; } catch (e) {} var t = (all[k] || {}).twin; if (t && all[t]) { BS.setSkin(t); render(); toast(all[t].name + " — on.", "ok"); } return true; }
    }
  };

  /* =====================================================================================================
     WIRING
     ===================================================================================================== */
  var R = ROOMS[KIND] || ROOMS.manual;
  MAKE = R.make; D = load(MAKE); save();
  function render() { R.render(); }
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || !root.contains(b)) return;
    if (b.hasAttribute("data-reset")) { reset(); if (ROOMS.documents.f) ROOMS.documents.f = { q: "", cat: "All" }; render(); toast("This room is back to its sample.", "ok"); return; }
    if (b.hasAttribute("data-go")) { var g = root.querySelector(b.getAttribute("data-go")); if (g) g.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (R.click) R.click(b);
  });
  root.addEventListener("input", function (e) { if (R.input) R.input(e); });
  root.addEventListener("keydown", function (e) { if (R.keydown) R.keydown(e); });

  var css = document.createElement("style");
  css.textContent =
    ".ar,.ar-back{--a-c:var(--bs-card,#fffdf8);--a-p:var(--bs-paper,#f8f3ea);--a-i:var(--bs-ink,#1e1813);--a-i2:var(--bs-ink2,#54493f);--a-m:var(--bs-mut,#8a7d70);--a-l:var(--bs-rule,#e8dccb);--a-s:var(--bs-rule2,#f1e8da);--a-r:var(--bs-red,#a8312a);--a-gd:var(--bs-gold,#c9a24a);--a-g:var(--bs-ok,#2f8f6b);--a-w:var(--bs-warn,#c4892a);--a-b:var(--bs-bad,#b8324a);--a-serif:var(--bs-serif,'Instrument Serif',Georgia,serif)}" +
    ".ar{color:var(--a-i);max-width:1100px;font-family:var(--bs-sans,Manrope,system-ui,sans-serif)}.ar *,.ar-back *{box-sizing:border-box}" +
    ".ar-head{display:flex;gap:16px;align-items:center;margin:6px 0 18px}.ar-badge{width:66px;height:66px;flex:0 0 66px;border-radius:18px;display:grid;place-items:center;font-size:32px;background:linear-gradient(150deg,var(--a-c),var(--a-s));border:1px solid var(--a-l);box-shadow:0 6px 18px rgba(30,24,19,.10)}" +
    ".ar-kick{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--a-r)}.ar-head h1{margin:2px 0 4px;font:400 34px/1.05 var(--a-serif);letter-spacing:-.01em}.ar-head p{margin:0;color:var(--a-i2);font-size:14.5px;line-height:1.5;max-width:720px}.ar-by{margin-top:7px;font-size:12.5px;color:var(--a-m)}" +
    ".ar-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.ar-stat{font:inherit;color:inherit;text-align:left;background:var(--a-c);border:1px solid var(--a-l);border-radius:14px;padding:13px 15px;min-width:0;cursor:default}.ar-stat[data-go]{cursor:pointer}" +
    ".ar-stat b{display:block;font:400 32px/1 var(--a-serif)}.ar-stat span{font-size:12px;color:var(--a-m)}.ar-stat.watch b{color:var(--a-w)}.ar-stat.bad b{color:var(--a-b)}.ar-stat.good b{color:var(--a-g)}" +
    ".ar-card{background:var(--a-c);border:1px solid var(--a-l);border-radius:18px;padding:16px 18px;margin-bottom:14px}.ar-alert{border-left:4px solid var(--a-w)}.ar-ch{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.ar-ch h2{margin:0;font:400 22px/1.15 var(--a-serif)}" +
    ".ar-hero{display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-radius:18px;padding:16px 18px;margin-bottom:14px;background:var(--a-c);border:1px solid var(--a-l);border-left:6px solid var(--a-g)}.ar-hero.watch{border-left-color:var(--a-w)}.ar-hero.bad{border-left-color:var(--a-b)}.ar-hero.plain{border-left-color:var(--a-gd)}" +
    ".ar-hero b{font:400 26px/1 var(--a-serif)}.ar-hero.good b{color:var(--a-g)}.ar-hero.watch b{color:var(--a-w)}.ar-hero.bad b{color:var(--a-b)}.ar-hero span{flex:1;min-width:200px;color:var(--a-i2);font-size:13.5px}" +
    ".ar-btn{font:700 14px/1 inherit;font-family:inherit;color:var(--a-i);background:var(--a-s);border:1px solid var(--a-l);border-radius:12px;padding:11px 15px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;transition:transform .12s}.ar-btn:active{transform:scale(.97)}" +
    ".ar-pri{background:var(--a-r);color:#fff;border-color:var(--a-r)}.ar-quiet{background:transparent}.ar-wide{width:100%;margin-top:8px}.ar-sm{min-height:36px;padding:8px 12px;font-size:13px}" +
    ".ar-row{display:flex;width:100%;align-items:center;gap:12px;font:inherit;color:inherit;text-align:left;background:none;border:0;border-top:1px solid var(--a-s);padding:12px 2px;cursor:pointer;text-decoration:none}.ar-row:first-child,.ar-wing+.ar-row{border-top:0}.ar-row.ar-static{cursor:default}button.ar-row:hover,a.ar-row:hover{background:linear-gradient(90deg,transparent,var(--a-s),transparent)}" +
    ".ar-x{flex:1;min-width:0}.ar-x b{font-size:15px;display:block;overflow:hidden;text-overflow:ellipsis}.ar-x small{display:block;color:var(--a-m);font-size:12.5px;margin-top:2px;line-height:1.4}.ar-go{color:var(--a-r);font-weight:700;font-size:13px;white-space:nowrap}.ar-acts{display:flex;gap:6px}" +
    ".ar-chip{display:inline-block;white-space:nowrap;font-size:11px;font-weight:800;letter-spacing:.04em;padding:4px 9px;border-radius:999px;background:var(--a-s);color:var(--a-i2)}.ar-chip.good{background:rgba(47,143,107,.14);color:var(--a-g)}.ar-chip.watch{background:rgba(196,137,42,.16);color:var(--a-w)}.ar-chip.bad{background:rgba(184,50,74,.13);color:var(--a-b)}" +
    ".ar-dot{width:10px;height:10px;border-radius:50%;flex:0 0 10px;background:var(--a-m)}.ar-dot.good{background:var(--a-g);box-shadow:0 0 0 4px rgba(47,143,107,.15)}.ar-dot.watch{background:var(--a-w);box-shadow:0 0 0 4px rgba(196,137,42,.18)}.ar-dot.bad{background:var(--a-b);box-shadow:0 0 0 4px rgba(184,50,74,.18);animation:arP 1.6s infinite}@keyframes arP{50%{box-shadow:0 0 0 8px rgba(184,50,74,0)}}" +
    ".ar-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.ar-tile{display:flex;flex-direction:column;gap:6px;align-items:flex-start;background:var(--a-p);border:1px solid var(--a-l);border-radius:14px;padding:13px;font:inherit;color:inherit;text-align:left}.ar-tile small{color:var(--a-m);font-size:12px}.ar-tbtn{cursor:pointer}.ar-tbtn:hover{border-color:var(--a-r)}" +
    ".ar-fence{border-radius:14px;padding:13px 15px;margin:10px 0 14px;background:rgba(201,162,74,.12);border:1px solid rgba(201,162,74,.35);font-size:13.5px;line-height:1.55;color:var(--a-i2)}.ar-fence.bad{background:rgba(168,49,42,.07);border-color:rgba(168,49,42,.25)}" +
    ".ar-feed{display:flex;gap:12px;padding:8px 0;border-top:1px solid var(--a-s);font-size:13.5px}.ar-feed:first-child{border-top:0}.ar-feed span:first-child{color:var(--a-m);min-width:88px;font-variant-numeric:tabular-nums;font-size:12.5px}" +
    ".ar-note{color:var(--a-i2);font-size:13.5px;line-height:1.55;margin:8px 0 0}.ar-foot{color:var(--a-m);font-size:12px;margin:4px 0 24px}.ar-link{font:inherit;background:none;border:0;color:var(--a-i2);text-decoration:underline;cursor:pointer;padding:0}" +
    ".ar-ask{position:sticky;top:0;z-index:3;background:var(--a-p);padding:4px 0 12px;margin-bottom:4px}.ar-ask input,.ar-q,.ar-add input{font:inherit;font-size:16px;width:100%;padding:14px 16px;border:1px solid var(--a-l);border-radius:14px;background:var(--a-c);color:var(--a-i);box-shadow:0 4px 14px rgba(30,24,19,.06)}.ar-ask span{display:block;font-size:12px;color:var(--a-m);margin-top:6px}" +
    ".ar-art{border-top:1px solid var(--a-s);padding:2px 0}.ar-art:first-of-type{border-top:0}.ar-art summary{list-style:none;cursor:pointer;padding:12px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}.ar-art summary::-webkit-details-marker{display:none}.ar-art summary:before{content:'+';font-weight:800;color:var(--a-r);width:14px}.ar-art[open] summary:before{content:'–'}.ar-art summary b{flex:1;min-width:60%}.ar-art summary small{color:var(--a-m);font-size:11.5px;width:100%;padding-left:24px}.ar-art p{margin:0 0 14px 24px;color:var(--a-i2);font-size:14px;line-height:1.65}.ar-tick{font-size:10.5px;font-weight:800;color:var(--a-g);text-transform:uppercase;letter-spacing:.06em}" +
    ".ar-wing{margin:16px 0 2px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--a-m)}.ar-ric{width:40px;height:40px;border-radius:11px;flex:0 0 40px;object-fit:cover}" +
    ".ar-av{width:38px;height:38px;flex:0 0 38px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:13px;background:var(--a-s);color:var(--a-r)}.ar-doc{width:38px;height:44px;flex:0 0 38px;border-radius:7px;display:grid;place-items:center;font-size:10px;font-weight:800;background:var(--a-p);border:1px solid var(--a-l);color:var(--a-r)}" +
    ".ar-bar{display:block;height:6px;border-radius:4px;background:var(--a-s);margin:6px 0 8px;overflow:hidden}.ar-bar i{display:block;height:100%;border-radius:4px}.ar-bar .good{background:var(--a-g)}.ar-bar .watch{background:var(--a-gd)}" +
    ".ar-onb{padding:10px 0;border-top:1px solid var(--a-s)}.ar-onb:first-of-type{border-top:0}.ar-onbh{display:flex;justify-content:space-between;font-size:14px}.ar-onbh span{color:var(--a-m);font-size:12.5px}" +
    ".ar-task{display:flex;gap:10px;align-items:center;width:100%;font:inherit;font-size:14px;color:var(--a-i);background:none;border:0;padding:7px 0;cursor:pointer;text-align:left}.ar-task.done{color:var(--a-m);text-decoration:line-through}" +
    ".ar-box{width:24px;height:24px;flex:0 0 24px;border-radius:7px;border:2px solid var(--a-l);display:grid;place-items:center;font-weight:800;font-size:13px;color:#fff;background:var(--a-c);cursor:pointer;padding:0;font-family:inherit}.done .ar-box,.ar-task.done .ar-box{background:var(--a-g);border-color:var(--a-g)}" +
    ".ar-tools{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}.ar-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch}.ar-chipb{font:700 12.5px inherit;font-family:inherit;white-space:nowrap;background:var(--a-c);color:var(--a-i2);border:1px solid var(--a-l);border-radius:999px;padding:8px 13px;cursor:pointer}.ar-chipb.on{background:var(--a-i);color:var(--a-c);border-color:var(--a-i)}" +
    ".ar-add{display:flex;flex-direction:column;gap:10px}.ar-ml{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--a-s)}.ar-ml:first-of-type{border-top:0}.ar-ml.done .ar-x b{text-decoration:line-through;color:var(--a-m)}.ar-del{background:none;border:0;color:var(--a-m);font-size:18px;cursor:pointer;width:34px;height:34px;border-radius:8px}.ar-del:hover{background:var(--a-s)}" +
    ".ar-mail{display:grid;grid-template-columns:170px minmax(240px,1fr) 1.3fr;gap:12px;align-items:start;margin-bottom:12px}.ar-folders{display:flex;flex-direction:column;gap:4px;background:var(--a-c);border:1px solid var(--a-l);border-radius:18px;padding:10px}" +
    ".ar-fold{display:flex;justify-content:space-between;align-items:center;font:700 14px inherit;font-family:inherit;color:var(--a-i2);background:none;border:0;border-radius:10px;padding:10px 12px;cursor:pointer;text-align:left}.ar-fold.on{background:var(--a-s);color:var(--a-i)}.ar-fold i.q{background:var(--a-s);color:var(--a-m)}.ar-fold i{font-style:normal;font-size:11px;background:var(--a-r);color:#fff;border-radius:999px;padding:2px 7px}.ar-compose{margin-top:8px}" +
    ".ar-list,.ar-read{background:var(--a-c);border:1px solid var(--a-l);border-radius:18px;overflow:hidden;min-height:360px}.ar-msg{display:flex;flex-direction:column;gap:3px;width:100%;font:inherit;color:inherit;text-align:left;background:none;border:0;border-top:1px solid var(--a-s);padding:12px 14px;cursor:pointer}.ar-msg:first-child{border-top:0}.ar-msg.on{background:var(--a-s)}.ar-msg.unread{box-shadow:inset 3px 0 0 var(--a-r)}.ar-msg.unread .ar-ms{font-weight:800}" +
    ".ar-mh{display:flex;justify-content:space-between;gap:8px;font-size:14px}.ar-mh span{color:var(--a-m);font-size:12px;white-space:nowrap}.ar-ms{font-size:13.5px}.ar-ms em{font-style:normal;font-size:10.5px;font-weight:800;color:var(--a-r);background:rgba(168,49,42,.08);border-radius:6px;padding:1px 6px}.ar-mp{font-size:12.5px;color:var(--a-m);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}" +
    ".ar-read{padding:18px}.ar-rh h2{margin:0;font:400 24px/1.15 var(--a-serif)}.ar-body{font-size:14.5px;line-height:1.7;color:var(--a-i2);margin:14px 0 16px;white-space:normal}.ar-empty{display:grid;place-items:center;align-content:center;gap:6px;height:320px;color:var(--a-m);text-align:center}.ar-empty b{font:400 28px var(--a-serif);color:var(--a-i)}.ar-back-btn{display:none;margin-bottom:10px}.ar-padin{padding:16px}" +
    ".ar-skins{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.ar-skin{font:inherit;color:inherit;text-align:left;background:var(--a-p);border:2px solid var(--a-l);border-radius:16px;padding:10px;cursor:pointer;display:flex;flex-direction:column;gap:4px;transition:transform .15s,border-color .15s}.ar-skin:hover{transform:translateY(-2px)}.ar-skin.on{border-color:var(--a-r);box-shadow:0 0 0 4px rgba(168,49,42,.12)}" +
    ".ar-skp{position:relative;display:block;height:92px;border-radius:10px;overflow:hidden;margin-bottom:4px}.ar-skp i{position:absolute;border-radius:6px}.ar-skp .r{left:0;top:0;bottom:0;width:22%;border-radius:0}.ar-skp .h{left:28%;right:6%;top:10%;height:34%;border:1px solid;display:flex;gap:4px;align-items:flex-end;padding:5px}.ar-skp .h em{width:14px;height:14px;border-radius:4px}.ar-skp .c{left:28%;width:40%;top:52%;bottom:10%;border:1px solid}.ar-skp .d{right:6%;width:20%;top:56%;height:6px;border-radius:3px}" +
    ".ar-skin small{color:var(--a-m);font-size:11.5px}.ar-on{margin-left:8px;font-size:10px;font-weight:800;color:#fff;background:var(--a-r);border-radius:999px;padding:2px 7px;vertical-align:2px}" +
    ".ar-back{position:fixed;inset:0;background:rgba(10,10,14,.5);z-index:9000;display:flex;align-items:flex-end;justify-content:center;visibility:hidden;opacity:0;transition:opacity .18s}.ar-back.open{visibility:visible;opacity:1}" +
    ".ar-sheet{background:var(--a-c);color:var(--a-i);width:100%;max-width:560px;max-height:90vh;overflow:auto;border-radius:20px 20px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.22)}@media(min-width:721px){.ar-back{align-items:center}.ar-sheet{border-radius:20px}}" +
    ".ar-sheet h3{margin:0;font:400 26px/1.1 var(--a-serif)}.ar-sub{margin:4px 0 12px;color:var(--a-m);font-size:12.5px}.ar-big{display:flex;align-items:center;gap:10px;margin:6px 0 12px}.ar-big span{color:var(--a-i2);font-size:13.5px;line-height:1.5}.ar-h4{margin:16px 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--a-m)}" +
    ".ar-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.ar-lab{display:block;font-size:12.5px;font-weight:700;color:var(--a-i2);margin-top:12px}.ar-lab input,.ar-lab select,.ar-lab textarea{display:block;margin-top:5px;font:inherit;font-size:16px;width:100%;padding:11px 12px;border:1px solid var(--a-l);border-radius:10px;background:var(--a-p);color:var(--a-i)}" +
    ".ar-paper{margin-top:12px;padding:14px;border:1px dashed var(--a-l);border-radius:10px;font-size:12.5px;line-height:1.6;color:var(--a-i2);background:var(--a-p)}.ar-pad{display:block;width:100%;height:auto;aspect-ratio:56/17;border:2px dashed var(--a-l);border-radius:12px;background:var(--a-p);touch-action:none;margin-top:8px;padding:0}.ar-chk{display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:10px}" +
    ".ar-miss{margin-top:12px;padding:11px 13px;border-radius:10px;background:rgba(184,50,74,.10);color:var(--a-b);font-size:13.5px}" +
    "#arToast{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);background:#1d1d1f;color:#fff;padding:10px 14px;border-radius:10px;font-size:14px;opacity:0;transition:opacity .2s;z-index:9500;max-width:90vw}#arToast.on{opacity:1}" +
    "@media(max-width:900px){.ar-mail{grid-template-columns:1fr}.ar-folders{flex-direction:row;overflow-x:auto}.ar-fold{white-space:nowrap}.ar-compose{margin:0 0 0 auto}.ar-read{display:none}.ar-mail.reading .ar-list{display:none}.ar-mail.reading .ar-read{display:block}.ar-back-btn{display:inline-flex}}" +
    "@media(max-width:720px){.ar-stats{grid-template-columns:repeat(2,1fr)}.ar-head h1{font-size:28px}.ar-badge{width:54px;height:54px;flex-basis:54px;font-size:26px}.ar-acts{flex-direction:column}.ar-two{grid-template-columns:1fr}.ar-skins{grid-template-columns:repeat(2,1fr)}}";
  document.head.appendChild(css);
  render();
  window.AERoom = { kind: KIND, db: function () { return D; }, render: render };
})();
