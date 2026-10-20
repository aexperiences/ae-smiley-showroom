/* AE ORG — the Agent Org Command Center, built like the mothership (aexperiences.studio/org.html), for every
   Accelerated Operating System.  Accelerated Experiences LLC · Oct 19 2026.

   Anthony, Oct 19 2026: "what's the deal with the agent org not being usable?" → "I want them built like mine" →
   "highly autonomous if used".

   Same five tabs as the mothership — Org · Event Bus · Proofing Area · Source of Truth · Calibration — and the same
   canon: Founder → COO → departments, each DH → AE → Triad (Pacemaker + two lenses that never confer).

   AUTONOMOUS WHEN USED. Ask any seat a question and the whole chain runs on its own, every hop logged on the bus:
   the COO routes it → the AE pulls this system's REAL numbers (Birdseye figures and needs, read from the engine) →
   the two lenses argue opposite reads → the Pacemaker rules a stance with a confidence derived from the evidence
   (data-backed reasons raise it; assumptions cap it under the gate) → it clears the gate or is marked "needs a human"
   → the AE files it → the DH owns the so-what → the COO packages ONE decision with 2–3 options → Proofing Area.
   "Run the org" (and Autopilot, if switched on) has every department sweep its own rooms and do all of that unasked.

   GHOST MODE. Seats do the work; only the founder disposes. Approve / Return in Proofing; Calibration then checks
   whether each seat's stated confidence is honest, and a seat earns autonomy there or not at all.

   HONEST BRAIN. A showroom is public and holds no AI key, so here the seats reason locally from this system's own
   data — rules, not a language model — and the page says so. In a live system the same chain runs on the hub's model.

   Reads two engine shapes: rich  SEATS = { coo, depts:[{key,name,gate,dh,ae,pace,lensA,lensB}] }  (Abode, Targeted …)
                            simple BRAIN = {name,role,line} + SEATS = [{dept, dh|head, ae|aes, focus}]  (Toolbelt …)
   Page: window.AE_ORG = { os, engine, founder }; load after the engine. Data per browser: "ae-org:<os>".
   Canonical copy: aehub/machines/birdseye/office-rooms/ae-org.js */
(function () {
  "use strict";
  var C = window.AE_ORG || {}, E = window[C.engine] || {}, OS = C.os || "os", KEY = "ae-org:" + OS, FOUNDER = C.founder || "the owner";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clock(ts) { var t = new Date(ts), h = t.getHours() % 12 || 12; return h + ":" + ("0" + t.getMinutes()).slice(-2) + (t.getHours() < 12 ? "a" : "p"); }
  function stamp(ts) { var t = new Date(ts), d = new Date(); return (t.toDateString() === d.toDateString() ? "" : (t.getMonth() + 1) + "/" + t.getDate() + " ") + clock(ts); }
  function toast(m, k) { if (E.toast) return E.toast(m, k); if (window.BirdseyeShell && BirdseyeShell.toast) return BirdseyeShell.toast(m); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function words(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 3 && STOP.indexOf(w) < 0; }); }
  var STOP = ["that", "this", "with", "what", "which", "from", "every", "where", "whether", "they", "their", "there", "into", "about", "have", "when", "your", "will", "should", "could", "would", "does", "doing", "much", "many", "next"];

  /* ---------------- the org, read from the engine ---------------- */
  var PACE = ["Cadence", "Tempo", "Pulse", "Metro", "Beat", "Measure", "Stride"];
  var LENS = [["Scout", "Skeptic"], ["Maker", "Breaker"], ["Signal", "Guard"], ["Upside", "Rigor"], ["Spark", "Anchor"], ["Reach", "Check"], ["Push", "Hold"]];
  var ORG = (function () {
    var S = E.SEATS, B = E.BRAIN || {}, cfg = window.BIRDSEYE || {}, depts = [], coo;
    if (S && S.coo && S.depts) {
      coo = { name: S.coo.name, role: S.coo.role || "Chief Operating Officer", line: S.coo.line || "" };
      S.depts.forEach(function (d) {
        depts.push({ key: d.key || d.name, name: d.name, gate: d.gate || 80, focus: [d.dh && d.dh.line, d.ae && d.ae.line].filter(Boolean).join(" "),
          dh: { name: d.dh.name, line: d.dh.line }, ae: { name: d.ae.name, line: d.ae.line },
          pace: { name: d.pace.name, line: d.pace.line }, lensA: { name: d.lensA.name, line: d.lensA.line }, lensB: { name: d.lensB.name, line: d.lensB.line } });
      });
    } else {
      coo = { name: B.name || (cfg.helper && cfg.helper.name) || "COO", role: B.role || "COO — the single point of contact", line: B.line || "" };
      (Array.isArray(S) ? S : []).forEach(function (d, i) {
        var dh = d.dh || d.head || "Head", ae = d.ae || (d.aes ? d.aes[0] + " desk" : "Desk"), focus = d.focus || (d.aes ? "Covers " + d.aes.join(", ").toLowerCase() + "." : "");
        var money = /money|billing|finance|accounting/i.test(d.dept), L = LENS[i % LENS.length];
        depts.push({ key: String(d.dept).toLowerCase().replace(/[^a-z]+/g, "-"), name: d.dept, gate: money ? 85 : 80, focus: focus,
          dh: { name: dh, line: "Owns " + d.dept.toLowerCase() + "'s so-what. " + focus },
          ae: { name: ae, line: "Pulls the numbers, packages the conclusion, files it and keeps the follow-ups." },
          pace: { name: PACE[i % PACE.length], line: "The only voice out of the " + d.dept + " triad. Passes up at ≥" + (money ? 85 : 80) + "%, else marks it 'needs a human'." },
          lensA: { name: L[0], line: "Opportunity lens — where is the upside in " + d.dept.toLowerCase() + ", and how fast?" },
          lensB: { name: L[1], line: "Rigor lens — is it real, measured, and safe? Argues against the opportunity read by design." } });
      });
    }
    var seats = { founder: { id: "founder", name: FOUNDER, title: "Founder · Sole Authority", tier: "Founder", gate: null, dept: "Executive", up: "—", down: coo.name + " (COO)", blurb: "Rules, spends, signs, publishes, files. Every seat proposes; only the founder disposes." },
      coo: { id: "coo", name: coo.name, title: coo.role, tier: "COO", gate: null, dept: "Executive", up: FOUNDER, down: "every Department Head", blurb: coo.line + " Routes every question to the right department, lets that chain do the work under its own gate, then packages one decision at a time." } };
    depts.forEach(function (d) {
      seats[d.key + ":dh"] = { id: d.key + ":dh", name: d.dh.name, title: "Department Head — " + d.name, tier: "DH", gate: 90, dept: d.key, up: coo.name + " (COO)", down: d.ae.name, blurb: d.dh.line };
      seats[d.key + ":ae"] = { id: d.key + ":ae", name: d.ae.name, title: "Administrative Executive — " + d.name, tier: "AE", gate: 95, dept: d.key, up: d.dh.name + " (DH)", down: d.pace.name + " (Pacemaker)", blurb: d.ae.line };
      seats[d.key + ":pace"] = { id: d.key + ":pace", name: d.pace.name, title: "Pacemaker — " + d.name + " triad", tier: "Pacemaker", gate: d.gate, dept: d.key, up: d.ae.name + " (AE) only", down: d.lensA.name + ", " + d.lensB.name, blurb: d.pace.line };
      seats[d.key + ":a"] = { id: d.key + ":a", name: d.lensA.name, title: "Lens · Opportunity", tier: "Lens", gate: d.gate, dept: d.key, up: d.pace.name + " (Pacemaker) only", down: "—", blurb: d.lensA.line };
      seats[d.key + ":b"] = { id: d.key + ":b", name: d.lensB.name, title: "Lens · Rigor", tier: "Lens", gate: d.gate, dept: d.key, up: d.pace.name + " (Pacemaker) only", down: "—", blurb: d.lensB.line };
    });
    return { coo: coo, depts: depts, seats: seats };
  })();

  /* ---------------- store ---------------- */
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 1) return d; } catch (e) {} return { v: 1, bus: [], proof: [], hall: [], record: {}, auto: false, lastSweep: 0 }; }
  var D = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  function bus(from, to, kind, dir, text, extra) { D.bus.unshift(Object.assign({ id: uid(), ts: Date.now(), from: from, to: to, kind: kind, dir: dir, text: text }, extra || {})); D.bus = D.bus.slice(0, 160); }

  /* ---------------- evidence: this system's real numbers, through Birdseye ---------------- */
  function BS() { return window.BirdseyeShell; }
  function cfg() { return window.BIRDSEYE; }
  function roomsFor(d) {
    var B = cfg(); if (!B) return [];
    var pin = C.map && (C.map[d.name] || C.map[d.key]);   /* an explicit department → rooms map beats word-matching */
    if (pin) return pin.map(function (k) { return B.rooms.filter(function (r) { return r.k === k; })[0]; }).filter(Boolean);
    var want = words(d.name + " " + d.focus + " " + d.dh.line + " " + d.ae.line);
    var scored = B.rooms.filter(function (r) { return !r.hidden && r.k !== "org"; }).map(function (r) {
      var have = words(r.label + " " + (r.blurb || "") + " " + r.k + " " + ((B.wings.filter(function (w) { return w.k === r.wing; })[0] || {}).name || ""));
      var s = 0; want.forEach(function (w) { have.forEach(function (h) { if (h === w || (w.length > 4 && h.indexOf(w.slice(0, 5)) === 0)) s++; }); });
      if (String(r.label).toLowerCase().indexOf(d.name.toLowerCase()) > -1) s += 4;
      return { r: r, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, 4).map(function (x) { return x.r; });
  }
  function needsAll() {
    var B = cfg(), sh = BS(); if (!B || !B.needs || !sh) return [];
    try { var seat = B.seats[sh.seat()] || {}; return B.needs(E, E.db ? E.db() : {}, sh.H, seat) || []; } catch (e) { return []; }
  }
  function evidence(d) {
    var sh = BS(), rooms = roomsFor(d), ks = rooms.map(function (r) { return r.k; });
    var figs = rooms.map(function (r) { var f = sh && sh.figure ? sh.figure(r.k) : null; return f && f[0] != null && f[0] !== "" && f[1] ? { room: r, v: f[0], line: f[1] } : null; }).filter(Boolean);
    var needs = needsAll().filter(function (n) { return ks.indexOf(n[2]) > -1; }).map(function (n) { return { tone: n[0], text: n[1], room: n[2] }; });
    return { rooms: rooms, figs: figs, needs: needs };
  }
  function routeTo(q) {
    var w = words(q), best = null, bs = 0;
    ORG.depts.forEach(function (d) {
      var hay = words(d.name + " " + d.focus + " " + d.dh.line + " " + roomsFor(d).map(function (r) { return r.label + " " + (r.blurb || ""); }).join(" "));
      var s = 0; w.forEach(function (x) { hay.forEach(function (h) { if (h === x || (x.length > 4 && h.indexOf(x.slice(0, 5)) === 0)) s++; }); });
      if (s > bs) { bs = s; best = d; }
    });
    return best;
  }

  /* ---------------- the chain (autonomous) ---------------- */
  function run(d, q, auto) {
    var ev = evidence(d), cooN = ORG.coo.name, dh = d.dh.name, ae = d.ae.name, pc = d.pace.name, A = d.lensA.name, Bn = d.lensB.name;
    var ask = q || ("Sweep " + d.name + ": what needs " + FOUNDER + " today?");
    bus(auto ? "Autopilot" : FOUNDER, cooN, auto ? "TASK" : "QUESTION", "DOWN", ask);
    bus(cooN, dh, "TASK", "DOWN", "Routed to " + d.name + (q ? " — best match for the question" : " — scheduled sweep"));
    bus(dh, ae, "TASK", "DOWN", "Pull the numbers for " + (ev.rooms.map(function (r) { return r.label; }).join(", ") || d.name));
    bus(ae, pc, "TASK", "DOWN", ev.figs.length + " live figure" + (ev.figs.length === 1 ? "" : "s") + " and " + ev.needs.length + " open item" + (ev.needs.length === 1 ? "" : "s") + " from this system's own records");
    var bad = ev.needs.filter(function (n) { return n.tone === "bad"; }), warn = ev.needs.filter(function (n) { return n.tone !== "bad"; });
    var reasons = [];
    bad.slice(0, 2).forEach(function (n) { reasons.push({ t: n.text, tag: "data", room: n.room }); });
    warn.slice(0, 3 - reasons.length).forEach(function (n) { reasons.push({ t: n.text, tag: "data", room: n.room }); });
    ev.figs.forEach(function (f) { if (reasons.length < 3 && !reasons.some(function (r) { return r.room === f.room.k; })) reasons.push({ t: f.room.label + ": " + f.v + " " + f.line, tag: "data", room: f.room.k }); });
    var opp = warn.length ? warn[0].text : ev.figs[0] ? ev.figs[0].room.label + " shows " + ev.figs[0].v + " " + ev.figs[0].line : "nothing pressing in the numbers";
    var rig = bad.length ? bad[0].text : warn.length > 1 ? warn[1].text : "no measured risk — but the sample is small";
    bus(A, pc, "CONCLUSION", "UP", "Opportunity read: " + opp, { lens: true });
    bus(Bn, pc, "CONCLUSION", "UP", "Rigor read: " + rig, { lens: true });
    if (!reasons.length) reasons.push({ t: "No live figure or open item reaches " + d.name + " from this system yet", tag: "assumption" });
    if (reasons.length < 2) reasons.push({ t: q ? "The question was matched to " + d.name + " by its words, not confirmed by " + FOUNDER : "A scheduled sweep, not a request from " + FOUNDER, tag: "assumption" });
    var stance = bad.length ? "ACT NOW" : warn.length ? "WATCH" : "HOLD STEADY";
    var nData = reasons.filter(function (r) { return r.tag === "data"; }).length;
    var conf = nData ? Math.min(94, 64 + nData * 9 + (bad.length ? 4 : 0)) : 58;   /* derived, never asserted: no data → capped below every gate */
    var passed = conf >= d.gate;
    var contract = { stance: stance, confidence: conf, reasons: reasons.slice(0, 3) };
    bus(pc, ae, "CONCLUSION", "UP", stance + " · " + conf + "% · " + (passed ? "clears the " + d.gate + "% bar" : "below the " + d.gate + "% bar — needs a human"), { contract: contract });
    bus(ae, dh, "CONCLUSION", "UP", "Packaged and filed. " + reasons.length + " reasons, each tagged data or assumption.");
    bus(dh, cooN, "CONCLUSION", "UP", d.name + ": " + stance + (passed ? "" : " (needs a human)"));
    var top = reasons[0], room = top && top.room ? cfg().rooms.filter(function (r) { return r.k === top.room; })[0] : ev.rooms[0];
    var options = stance === "ACT NOW" ? [["Do it now", room ? "Open " + room.label + " and clear it" : "Clear it today"], ["Hand it to " + dh, dh + " owns it; check back tomorrow"], ["Hold one day", "Only if something bigger is on fire"]]
      : stance === "WATCH" ? [["Schedule it", "Put it on the calendar this week"], ["Hand it to " + dh, dh + " keeps an eye on it"], ["Leave it", "Revisit at the next sweep"]]
      : [["Nothing to do", "The numbers are steady"], ["Ask a sharper question", "Consult a seat directly"]];
    var item = { id: uid(), ts: Date.now(), dept: d.key, deptName: d.name, seat: d.key + ":pace", q: ask, auto: !!auto, contract: contract, passed: passed, gate: d.gate, options: options, room: room ? room.href : "", roomLabel: room ? room.label : "", state: "Waiting" };
    D.proof.unshift(item); D.proof = D.proof.slice(0, 60);
    bus(cooN, FOUNDER, "CONCLUSION", "UP", "One decision waiting in Proofing — " + d.name + ": " + stance);
    save(); return item;
  }
  function sweep(auto) {
    var made = ORG.depts.map(function (d) { return run(d, null, auto); });
    D.lastSweep = Date.now(); save();
    return made;
  }

  /* ---------------- the bus validator (same rules as the runtime) ---------------- */
  function tierOf(id) { return (ORG.seats[id] || {}).tier; }
  function validate(m) {
    var f = ORG.seats[m.from], t = ORG.seats[m.to]; if (!f || !t) return [false, "Unknown seat."];
    if (m.from === m.to) return [false, "A seat cannot message itself."];
    if ((m.kind === "QUESTION" || m.kind === "TASK") && m.dir === "UP") return [false, "Questions and tasks go DOWN or ACROSS, never UP. Up is for conclusions."];
    if (m.kind === "CONCLUSION" && m.dir !== "UP") return [false, "Conclusions travel UP only."];
    if (m.kind === "CONCLUSION") {
      var c = m.contract || {}; if (!c.stance) return [false, "Rejected: an OutputContract needs a stance."];
      if (!(c.confidence >= 0 && c.confidence <= 100)) return [false, "Rejected: confidence must be a number 0–100."];
      if (!c.reasons || c.reasons.length < 2 || c.reasons.length > 3) return [false, "Rejected: 2–3 reasons."];
      if (c.reasons.some(function (r) { return !/\[(data|assumption)\]/i.test(r); })) return [false, "Rejected: every reason is tagged [data] or [assumption]."];
    }
    var order = { Lens: 0, Pacemaker: 1, AE: 2, DH: 3, COO: 4, Founder: 5 }, a = order[f.tier], b = order[t.tier];
    if (f.tier === "Lens" && !(t.id === f.dept + ":pace" || t.id === f.dept + (f.id.slice(-1) === "a" ? ":b" : ":a"))) return [false, "A lens speaks only to its own Pacemaker — the Pacemaker is the only voice out of the triad."];
    if (f.tier === "Lens" && t.tier === "Lens") return [false, "The two lenses never confer — opposing reads are the point."];
    if (f.tier === "Pacemaker" && t.id !== f.dept + ":ae" && t.tier !== "Lens") return [false, "A Pacemaker passes up to its own AE only."];
    if (m.dir === "UP" && b !== a + 1) return [false, "No layer-skipping: UP goes exactly one tier (" + f.tier + " → " + Object.keys(order).filter(function (k) { return order[k] === a + 1; })[0] + ")."];
    if (m.dir === "DOWN" && b !== a - 1) return [false, "No layer-skipping: DOWN goes exactly one tier."];
    if (m.dir === "DOWN" && f.dept !== "Executive" && t.dept !== f.dept) return [false, "DOWN stays inside the department's own chain."];
    if (m.dir === "UP" && t.dept !== "Executive" && t.dept !== f.dept) return [false, "UP stays inside the department's own chain until the COO."];
    if (m.dir === "ACROSS" && a !== b) return [false, "ACROSS is same position only: AE↔AE, DH↔DH."];
    if (m.dir === "ACROSS" && (f.tier === "COO" || f.tier === "Founder")) return [false, "The COO is apex — no lateral peer."];
    return [true, "Accepted. " + f.name + " → " + t.name + " · " + m.kind + " " + m.dir + "."];
  }

  /* ---------------- the page ---------------- */
  var content = E.mount ? E.mount({ active: "org.html", crumb: "Agent Org · Bus" }) : document.body;
  var root = document.createElement("div"); root.className = "ao"; content.appendChild(root);
  var TAB = "org";
  function seatCard(id, cls) { var s = ORG.seats[id]; return '<button type="button" class="ao-seat ' + cls + '" data-seat="' + esc(id) + '"><span class="t">' + esc(s.tier === "Lens" ? s.title : s.tier) + '</span><b>' + esc(s.name) + '</b><span class="g">' + (s.gate == null ? "apex" : "gate " + s.gate + "%") + '</span></button>'; }
  function head() {
    var waiting = D.proof.filter(function (p) { return p.state === "Waiting"; }).length;
    return '<header class="ao-head"><div><div class="ao-kick">Agent Org · Command Center</div><h1>The Organization</h1>' +
      '<p>' + esc(FOUNDER) + ' → <b>' + esc(ORG.coo.name) + '</b> (COO) → ' + ORG.depts.length + ' departments, each <b>DH → AE → Triad (Pacemaker + 2)</b>. Every seat loads the Source of Truth first and drafts only — nothing reaches the world without ' + esc(FOUNDER) + '.</p></div>' +
      '<div class="ao-run"><button type="button" class="ao-btn ao-pri" data-sweep>Run the org</button><label class="ao-auto"><input type="checkbox" id="aoAuto"' + (D.auto ? " checked" : "") + '> Autopilot</label>' +
      '<small>' + (D.lastSweep ? "Last sweep " + stamp(D.lastSweep) : "Never swept") + (waiting ? " · <b>" + waiting + " waiting on you</b>" : "") + '</small></div></header>' +
      '<nav class="ao-tabs">' + [["org", "Org"], ["bus", "Event Bus"], ["proof", "Proofing Area" + (waiting ? " (" + waiting + ")" : "")], ["sot", "Source of Truth"], ["cal", "Calibration"]].map(function (t) { return '<button type="button" data-tab="' + t[0] + '" class="' + (TAB === t[0] ? "on" : "") + '">' + esc(t[1]) + '</button>'; }).join("") + '</nav>';
  }
  function tabOrg() {
    return '<div class="ao-ask"><input id="aoQ" placeholder="Ask the org anything — ' + esc(ORG.coo.name) + ' routes it, the chain does the work, you get one decision" autocomplete="off"><button type="button" class="ao-btn ao-pri" data-ask>Ask ' + esc(ORG.coo.name) + '</button></div>' +
      '<div class="ao-tier"><button type="button" class="ao-node founder" data-seat="founder"><span class="t">Founder · Sole Authority</span><b>' + esc(FOUNDER) + '</b><span class="g">rules · spends · signs · publishes · files</span></button></div><div class="ao-conn"></div>' +
      '<div class="ao-tier"><button type="button" class="ao-node coo" data-seat="coo"><span class="t">' + esc(ORG.coo.role) + '</span><b>' + esc(ORG.coo.name) + '</b><span class="g">single point of contact · no lateral peer</span></button></div><div class="ao-conn"></div>' +
      '<div class="ao-depts">' + ORG.depts.map(function (d) {
        var ev = roomsFor(d).slice(0, 3).map(function (r) { return r.label; }).join(" · ");
        return '<div class="ao-col"><div class="ao-colh">' + esc(d.name) + '<small>' + esc(ev || d.focus) + '</small></div>' + seatCard(d.key + ":dh", "dh") + seatCard(d.key + ":ae", "ae") +
          '<div class="ao-triad"><div class="ao-tl">Triad</div>' + seatCard(d.key + ":pace", "pace") + seatCard(d.key + ":a", "lens") + seatCard(d.key + ":b", "lens") + '</div>' +
          '<button type="button" class="ao-btn ao-sm ao-wide" data-dsweep="' + esc(d.key) + '">Sweep ' + esc(d.name) + '</button></div>';
      }).join("") + '</div>' +
      '<p class="ao-honest"><b>How the seats think here:</b> this showroom is public and holds no AI key, so every seat reasons locally from this system\'s own records — the routing, the gates, the contract and the bus are the real mechanism; the language model is not running. In a live system the same chain runs on the hub\'s model. That is the honest line.</p>';
  }
  function busRow(m) {
    return '<div class="ao-ev k-' + esc(m.kind.toLowerCase()) + '"><span class="ao-ts">' + stamp(m.ts) + '</span><span class="ao-route"><b>' + esc(m.from) + '</b> → <b>' + esc(m.to) + '</b> <i>' + esc(m.kind) + ' · ' + esc(m.dir) + '</i></span><span class="ao-tx">' + esc(m.text) + '</span></div>';
  }
  function tabBus() {
    var ids = Object.keys(ORG.seats), opt = ids.map(function (i) { var s = ORG.seats[i]; return '<option value="' + esc(i) + '">' + esc(s.name + " — " + s.tier + (s.dept !== "Executive" ? " · " + (ORG.depts.filter(function (d) { return d.key === s.dept; })[0] || {}).name : "")) + '</option>'; }).join("");
    return '<section class="ao-card"><h2>Routing &amp; contract validator</h2><p class="ao-sub">QUESTIONS and TASKS go DOWN or ACROSS; CONCLUSIONS go UP as an OutputContract. The Pacemaker is the only voice out of a triad; no seat skips a layer. Compose a message to see the bus accept or reject it — the same rules every consult obeys.</p>' +
      '<div class="ao-grid"><label>FROM<select id="bF">' + opt + '</select></label><label>TO<select id="bT">' + opt + '</select></label><label>KIND<select id="bK"><option>QUESTION</option><option>TASK</option><option>CONCLUSION</option><option>ALERT</option></select></label><label>DIRECTION<select id="bD"><option>DOWN</option><option>UP</option><option>ACROSS</option></select></label></div>' +
      '<div id="bC" hidden><div class="ao-grid"><label>STANCE<input id="bS" placeholder="ACT NOW / WATCH / HOLD"></label><label>CONFIDENCE<input id="bN" inputmode="numeric" placeholder="0–100"></label></div><label>REASONS (2–3, one per line, each tagged [data] or [assumption])<textarea id="bR" rows="3"></textarea></label></div>' +
      '<button type="button" class="ao-btn ao-pri" data-validate>Send through the bus</button><div id="bV" class="ao-verdict" role="status"></div></section>' +
      '<section class="ao-card"><div class="ao-ch"><h2>Live event bus</h2><span class="ao-pill">' + D.bus.length + ' events</span></div>' + (D.bus.length ? D.bus.slice(0, 80).map(busRow).join("") : '<p class="ao-sub">The bus is quiet. Ask the org a question or press Run the org, and watch every hop land here as the audit trail.</p>') +
      (D.bus.length ? '<button type="button" class="ao-btn ao-sm" data-clearbus>Clear the bus</button>' : "") + '</section>';
  }
  function proofCard(p) {
    var c = p.contract, seat = ORG.seats[p.seat] || {};
    return '<article class="ao-proof ' + (p.state === "Waiting" ? "" : "done") + '"><div class="ao-ph"><span class="ao-stance s-' + esc(c.stance.replace(/ /g, "").toLowerCase()) + '">' + esc(c.stance) + '</span><b>' + esc(p.deptName) + '</b><span class="ao-conf ' + (p.passed ? "ok" : "low") + '">' + c.confidence + '% · ' + (p.passed ? "cleared " + p.gate + "%" : "needs a human") + '</span><small>' + (p.auto ? "Autopilot" : "Asked") + " · " + stamp(p.ts) + '</small></div>' +
      '<p class="ao-q">' + esc(p.q) + '</p><ul class="ao-reasons">' + c.reasons.map(function (r) { return '<li><i class="' + r.tag + '">' + r.tag + '</i>' + esc(r.t) + '</li>'; }).join("") + '</ul>' +
      '<div class="ao-opts">' + p.options.map(function (o, i) { return '<span><b>' + String.fromCharCode(65 + i) + '.</b> ' + esc(o[0]) + ' <small>' + esc(o[1]) + '</small></span>'; }).join("") + '</div>' +
      (p.state === "Waiting" ? '<div class="ao-acts"><button type="button" class="ao-btn ao-pri ao-sm" data-approve="' + p.id + '">Approve → Hall of Records</button><button type="button" class="ao-btn ao-sm" data-return="' + p.id + '">Return to ' + esc(seat.name || "the seat") + '</button>' + (p.room ? '<a class="ao-btn ao-sm" href="' + esc(p.room) + '">Open ' + esc(p.roomLabel) + ' ›</a>' : "") + '</div>' : '<div class="ao-acts"><span class="ao-done">' + esc(p.state) + '</span></div>') + '</article>';
  }
  function tabProof() {
    var w = D.proof.filter(function (p) { return p.state === "Waiting"; }), d = D.proof.filter(function (p) { return p.state !== "Waiting"; });
    return '<section class="ao-card"><h2>Proofing Area <span class="ao-pill">Ghost Mode gate</span></h2><p class="ao-sub">Where drafts wait for you. Seats propose; only you dispose. Approve files it to the Hall of Records; Return sends it back to the seat. Nothing publishes, sends, spends, or files-as-final until you approve it here.</p>' +
      (w.length ? w.map(proofCard).join("") : '<p class="ao-sub">Nothing waiting. Press <b>Run the org</b> and every department will sweep its rooms and bring you what it finds.</p>') + '</section>' +
      (d.length ? '<section class="ao-card"><h2>Decided</h2>' + d.slice(0, 12).map(proofCard).join("") + '</section>' : "") +
      (D.hall.length ? '<section class="ao-card"><h2>Hall of Records</h2>' + D.hall.slice(0, 12).map(function (h) { return '<div class="ao-ev"><span class="ao-ts">' + stamp(h.ts) + '</span><span class="ao-tx"><b>' + esc(h.dept) + '</b> — ' + esc(h.stance) + ' · ' + h.conf + '% · approved by ' + esc(FOUNDER) + '</span></div>'; }).join("") + '</section>' : "");
  }
  function tabSot() {
    var B = cfg() || {}, sys = (E.db && E.db().systems) || E.SYSTEMS || [];
    var lines = ["SOURCE OF TRUTH — " + ((B.brand && B.brand.name) || "this system"), "Trade: " + (B.trade || ""), "",
      "THE ORG", FOUNDER + " (Founder, sole authority) → " + ORG.coo.name + " (" + ORG.coo.role + ")"].concat(ORG.depts.map(function (d) { return "  " + d.name + ": " + d.dh.name + " (DH, gate 90%) → " + d.ae.name + " (AE, gate 95%) → " + d.pace.name + " (Pacemaker, gate " + d.gate + "%) + " + d.lensA.name + " / " + d.lensB.name + " (lenses)"; })).concat(["",
      "THE LAWS EVERY SEAT LOADS FIRST",
      "1. Never fabricate. Every reason is tagged [data] or [assumption]; an assumption never clears a gate on its own.",
      "2. Confidence is derived from the evidence, never asserted. No data → capped below every gate → 'needs a human'.",
      "3. QUESTIONS and TASKS go DOWN or ACROSS; CONCLUSIONS go UP; no layer-skipping; the Pacemaker is the only voice out of a triad.",
      "4. Ghost Mode: every seat proposes, only " + FOUNDER + " disposes. Nothing sends, spends, publishes or files-as-final without approval.",
      "5. One decision at a time, with 2–3 labelled options.", "6. If this Source of Truth cannot be read, every seat stops and says so.", "",
      "WHAT IS NATIVE AND WHAT IS A VENDOR HOP"]).concat(sys.map(function (s) { return "  " + (s.k || s.what || s.name) + " — " + (s.state || (s.native ? "Native" : "Vendor")) + (s.note || s.how ? ": " + (s.note || s.how) : ""); }));
    return '<section class="ao-card"><h2>Source of Truth <span class="ao-pill ok">loaded</span></h2><p class="ao-sub">The single document every seat — ' + esc(ORG.coo.name) + ' and every department seat — loads first. If it is missing, seats stop and alert rather than guess.</p><pre class="ao-sot">' + esc(lines.join("\n")) + '</pre></section>';
  }
  function tabCal() {
    var rows = Object.keys(D.record).map(function (k) { var r = D.record[k], s = ORG.seats[k] || {}; var n = r.a + r.r, rate = n ? r.a / n : 0, said = n ? r.conf / n / 100 : 0;
      var honest = n >= 3 && Math.abs(rate - said) <= 0.1; return { s: s, n: n, rate: rate, said: said, honest: honest }; }).sort(function (a, b) { return b.n - a.n; });
    return '<section class="ao-card"><h2>Calibration <span class="ao-pill">does ninety mean ninety</span></h2><p class="ao-sub">Every seat states a confidence. This is the only page that checks whether that number is honest. A seat earns autonomy here or not at all — and nothing extra is asked of you: approving and returning already decide it.</p>' +
      (rows.length ? rows.map(function (x) { return '<div class="ao-cal"><b>' + esc(x.s.name) + '</b><small>' + esc(x.s.title) + '</small><div class="ao-bars"><span>said <b>' + Math.round(x.said * 100) + '%</b></span><i style="width:' + Math.round(x.said * 100) + '%" class="said"></i><span>earned <b>' + Math.round(x.rate * 100) + '%</b></span><i style="width:' + Math.round(x.rate * 100) + '%" class="earned"></i></div><span class="ao-badge ' + (x.honest ? "ok" : "") + '">' + (x.n < 3 ? "needs " + (3 - x.n) + " more decisions" : x.honest ? "honest — autonomy earned" : "over/under-confident") + '</span></div>'; }).join("")
        : '<p class="ao-sub">No record yet. Approve or return a few decisions in the Proofing Area and each seat\'s honesty shows up here.</p>') + '</section>';
  }
  function render() {
    root.innerHTML = head() + '<div class="ao-body">' + (TAB === "org" ? tabOrg() : TAB === "bus" ? tabBus() : TAB === "proof" ? tabProof() : TAB === "sot" ? tabSot() : tabCal()) + '</div>';
    if (TAB === "bus") syncContract();
  }
  function syncContract() { var k = root.querySelector("#bK"), c = root.querySelector("#bC"); if (k && c) c.hidden = k.value !== "CONCLUSION"; }

  /* ---------------- the seat drawer: charter + live consult ---------------- */
  var scrim = document.createElement("div"); scrim.className = "ao-scrim"; document.body.appendChild(scrim);
  var drawer = document.createElement("aside"); drawer.className = "ao-drawer"; drawer.setAttribute("aria-label", "Seat"); document.body.appendChild(drawer);
  function closeSeat() { drawer.classList.remove("on"); scrim.classList.remove("on"); }
  scrim.onclick = closeSeat; document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSeat(); });
  function openSeat(id) {
    var s = ORG.seats[id]; if (!s) return; var d = ORG.depts.filter(function (x) { return x.key === s.dept; })[0];
    var ev = d ? evidence(d) : null;
    drawer.innerHTML = '<div class="ao-dh"><button type="button" class="ao-x" data-x aria-label="Close">×</button><small>' + esc(s.title) + '</small><h3>' + esc(s.name) + '</h3></div><div class="ao-db">' +
      '<dl><dt>Gate</dt><dd>' + (s.gate == null ? "apex" : s.gate + "%") + '</dd><dt>Reports up to</dt><dd>' + esc(s.up) + '</dd><dt>Directs</dt><dd>' + esc(s.down) + '</dd></dl>' +
      '<p class="ao-persona">' + esc(s.blurb) + '</p>' +
      (ev ? '<h4>What ' + esc(d.name) + ' is reading right now</h4>' + (ev.figs.length ? ev.figs.map(function (f) { return '<div class="ao-fig"><b>' + esc(f.v) + '</b> ' + esc(f.line) + ' <small>' + esc(f.room.label) + '</small></div>'; }).join("") : '<p class="ao-sub">No live figure maps to this department yet — its rooms show a description until first opened.</p>') +
        ev.needs.map(function (n) { return '<div class="ao-fig ' + n.tone + '">' + esc(n.text) + '</div>'; }).join("") : "") +
      (id === "founder" ? '<p class="ao-sub">You. Every decision waits for you in the Proofing Area.</p>' :
        '<h4>Consult this seat</h4><div class="ao-log" id="aoLog"></div><div class="ao-rowin"><input id="aoSQ" placeholder="Ask ' + esc(s.name) + '…" autocomplete="off"><button type="button" class="ao-btn ao-pri" data-consult="' + esc(id) + '">Ask</button></div>') + '</div>';
    drawer.classList.add("on"); scrim.classList.add("on");
  }
  drawer.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-x")) return closeSeat();
    if (b.hasAttribute("data-consult")) {
      var id = b.getAttribute("data-consult"), q = drawer.querySelector("#aoSQ").value.trim(); if (!q) { toast("Type a question first.", "warn"); return; }
      var s = ORG.seats[id], d = s.dept === "Executive" ? routeTo(q) || ORG.depts[0] : ORG.depts.filter(function (x) { return x.key === s.dept; })[0];
      var item = run(d, q, false), c = item.contract, log = drawer.querySelector("#aoLog");
      log.innerHTML += '<div class="ao-msg you">' + esc(q) + '</div><div class="ao-msg seat"><b>' + esc(s.name) + ':</b> ' + (s.dept === "Executive" ? "Routed to " + esc(d.name) + ". " : "") + 'The chain ran: <b>' + esc(c.stance) + '</b> at ' + c.confidence + '% — ' + (item.passed ? "cleared the " + item.gate + "% bar." : "below the " + item.gate + "% bar, so it is marked <b>needs a human</b>.") +
        '<ul>' + c.reasons.map(function (r) { return '<li><i class="' + r.tag + '">' + r.tag + '</i> ' + esc(r.t) + '</li>'; }).join("") + '</ul>It is waiting for ' + esc(FOUNDER) + ' in the Proofing Area.</div>';
      drawer.querySelector("#aoSQ").value = ""; render();
    }
  });
  drawer.addEventListener("keydown", function (e) { if (e.target.id === "aoSQ" && e.key === "Enter") { var b = drawer.querySelector("[data-consult]"); if (b) b.click(); } });

  /* ---------------- wiring ---------------- */
  function decide(id, ok) {
    var p = D.proof.filter(function (x) { return x.id === id; })[0]; if (!p || p.state !== "Waiting") return;
    p.state = ok ? "Approved" : "Returned"; var r = D.record[p.seat] = D.record[p.seat] || { a: 0, r: 0, conf: 0 }; r[ok ? "a" : "r"]++; r.conf += p.contract.confidence;
    if (ok) D.hall.unshift({ ts: Date.now(), dept: p.deptName, stance: p.contract.stance, conf: p.contract.confidence });
    bus(FOUNDER, ORG.coo.name, ok ? "TASK" : "QUESTION", "DOWN", (ok ? "Approved: " : "Returned: ") + p.deptName + " — " + p.contract.stance);
    save(); render(); toast(ok ? "Approved and filed to the Hall of Records." : "Returned to " + (ORG.seats[p.seat] || {}).name + ".", "ok");
  }
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-tab")) { TAB = b.getAttribute("data-tab"); render(); return; }
    if (b.hasAttribute("data-seat")) return openSeat(b.getAttribute("data-seat"));
    if (b.hasAttribute("data-sweep")) { var m = sweep(false); TAB = "proof"; render(); toast(ORG.coo.name + " ran all " + m.length + " departments. " + m.filter(function (x) { return x.contract.stance === "ACT NOW"; }).length + " need action now.", "ok"); return; }
    if (b.hasAttribute("data-dsweep")) { var d = ORG.depts.filter(function (x) { return x.key === b.getAttribute("data-dsweep"); })[0]; var it = run(d, null, false); TAB = "proof"; render(); toast(d.name + ": " + it.contract.stance + " at " + it.contract.confidence + "%.", "ok"); return; }
    if (b.hasAttribute("data-ask")) { var q = root.querySelector("#aoQ").value.trim(); if (!q) { toast("Type a question first.", "warn"); return; } var dd = routeTo(q) || ORG.depts[0]; var x = run(dd, q, false); TAB = "proof"; render(); toast(ORG.coo.name + " routed it to " + dd.name + ": " + x.contract.stance + " at " + x.contract.confidence + "%.", "ok"); return; }
    if (b.hasAttribute("data-approve")) return decide(b.getAttribute("data-approve"), true);
    if (b.hasAttribute("data-return")) return decide(b.getAttribute("data-return"), false);
    if (b.hasAttribute("data-clearbus")) { D.bus = []; save(); render(); return; }
    if (b.hasAttribute("data-validate")) {
      var g = function (i) { return root.querySelector("#" + i).value; };
      var msg = { from: g("bF"), to: g("bT"), kind: g("bK"), dir: g("bD"), contract: { stance: g("bS").trim(), confidence: parseFloat(g("bN")), reasons: g("bR").split("\n").map(function (x) { return x.trim(); }).filter(Boolean) } };
      var v = validate(msg), out = root.querySelector("#bV"); out.className = "ao-verdict " + (v[0] ? "ok" : "bad"); out.textContent = (v[0] ? "✓ " : "✕ ") + v[1];
      if (v[0]) { bus(ORG.seats[msg.from].name, ORG.seats[msg.to].name, msg.kind, msg.dir, "Composed in the validator" + (msg.kind === "CONCLUSION" ? ": " + msg.contract.stance + " · " + msg.contract.confidence + "%" : "")); save(); }
    }
  });
  root.addEventListener("change", function (e) {
    if (e.target.id === "bK") syncContract();
    if (e.target.id === "aoAuto") { D.auto = e.target.checked; save(); toast(D.auto ? "Autopilot on: the org sweeps every department when you open it, and every 15 minutes while it is open. Decisions still wait for you." : "Autopilot off.", "ok"); if (D.auto) autopilot(true); }
  });
  root.addEventListener("keydown", function (e) { if (e.target.id === "aoQ" && e.key === "Enter") { var b = root.querySelector("[data-ask]"); if (b) b.click(); } });

  function autopilot(force) { if (!D.auto) return; if (!force && Date.now() - D.lastSweep < 15 * 60000) return; var m = sweep(true); render(); toast("Autopilot swept " + m.length + " departments — " + m.filter(function (x) { return x.contract.stance !== "HOLD STEADY"; }).length + " decision(s) waiting.", "ok"); }

  var css = document.createElement("style");
  css.textContent =
    ".ao,.ao-drawer{--o-c:var(--bs-card,#fffdf8);--o-p:var(--bs-paper,#f8f3ea);--o-i:var(--bs-ink,#1e1813);--o-i2:var(--bs-ink2,#54493f);--o-m:var(--bs-mut,#8a7d70);--o-l:var(--bs-rule,#e8dccb);--o-s:var(--bs-rule2,#f1e8da);--o-r:var(--bs-red,#a8312a);--o-gd:var(--bs-gold,#c9a24a);--o-ch:var(--bs-char,#1e1813);--o-g:var(--bs-ok,#2f8f6b);--o-w:var(--bs-warn,#c4892a);--o-b:var(--bs-bad,#b8324a);--o-serif:var(--bs-serif,'Instrument Serif',Georgia,serif)}" +
    ".ao{color:var(--o-i);max-width:1200px;font-family:var(--bs-sans,Manrope,system-ui,sans-serif)}.ao *,.ao-drawer *{box-sizing:border-box}" +
    ".ao-head{display:flex;gap:18px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;margin:6px 0 12px}.ao-kick{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--o-r)}.ao-head h1{margin:2px 0 6px;font:400 36px/1.05 var(--o-serif)}.ao-head p{margin:0;max-width:720px;color:var(--o-i2);font-size:14px;line-height:1.55}" +
    ".ao-run{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.ao-run small{color:var(--o-m);font-size:12px}.ao-auto{display:flex;gap:6px;align-items:center;font-size:13px;font-weight:700;color:var(--o-i2)}" +
    ".ao-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--o-l);margin-bottom:16px;-webkit-overflow-scrolling:touch}.ao-tabs button{font:700 13.5px inherit;font-family:inherit;color:var(--o-m);background:none;border:0;border-bottom:3px solid transparent;padding:11px 12px;white-space:nowrap;cursor:pointer}.ao-tabs button.on{color:var(--o-i);border-color:var(--o-r)}" +
    ".ao-btn{font:700 14px/1 inherit;font-family:inherit;color:var(--o-i);background:var(--o-s);border:1px solid var(--o-l);border-radius:12px;padding:11px 15px;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none}.ao-pri{background:var(--o-r);border-color:var(--o-r);color:#fff}.ao-sm{min-height:36px;padding:8px 12px;font-size:13px}.ao-wide{width:100%;margin-top:8px}" +
    ".ao-ask{display:flex;gap:8px;margin-bottom:18px}.ao-ask input{flex:1;min-width:0;font:inherit;font-size:16px;padding:13px 15px;border:1px solid var(--o-l);border-radius:14px;background:var(--o-c);color:var(--o-i);box-shadow:0 4px 14px rgba(30,24,19,.06)}" +
    ".ao-tier{display:flex;justify-content:center}.ao-conn{width:2px;height:18px;background:var(--o-l);margin:0 auto}" +
    ".ao-node{font:inherit;color:var(--o-i);background:var(--o-c);border:1px solid var(--o-l);border-radius:16px;padding:12px 22px;text-align:center;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:240px;box-shadow:0 6px 18px rgba(30,24,19,.07)}.ao-node.founder{border-color:var(--o-gd)}.ao-node.coo{border:2px solid var(--o-r)}" +
    ".ao-node .t,.ao-seat .t{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--o-m)}.ao-node b{font:400 24px/1.1 var(--o-serif)}.ao-node .g,.ao-seat .g{font-size:11.5px;color:var(--o-m)}" +
    ".ao-depts{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:4px}.ao-col{background:var(--o-c);border:1px solid var(--o-l);border-radius:18px;padding:12px}.ao-colh{font:400 21px/1.1 var(--o-serif);margin:2px 2px 10px}.ao-colh small{display:block;font:600 11px/1.4 var(--bs-sans,Manrope,system-ui,sans-serif);color:var(--o-m);margin-top:4px}" +
    ".ao-seat{width:100%;font:inherit;color:var(--o-i);text-align:left;background:var(--o-p);border:1px solid var(--o-l);border-radius:12px;padding:9px 11px;margin-bottom:7px;cursor:pointer;display:flex;flex-direction:column;gap:1px;transition:transform .12s,border-color .12s}.ao-seat:hover{transform:translateY(-1px);border-color:var(--o-r)}.ao-seat b{font-size:15px}.ao-seat.dh{border-left:4px solid var(--o-r)}.ao-seat.ae{border-left:4px solid var(--o-gd)}" +
    ".ao-triad{border:1px dashed var(--o-l);border-radius:12px;padding:8px 8px 1px;margin-top:4px}.ao-tl{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--o-m);margin:0 0 6px 2px}.ao-seat.pace{border-left:4px solid var(--o-g)}.ao-seat.lens{background:var(--o-c)}" +
    ".ao-honest{margin:16px 0 24px;padding:13px 15px;border-radius:14px;background:rgba(201,162,74,.12);border:1px solid rgba(201,162,74,.35);font-size:13.5px;line-height:1.55;color:var(--o-i2)}" +
    ".ao-card{background:var(--o-c);border:1px solid var(--o-l);border-radius:18px;padding:16px 18px;margin-bottom:14px}.ao-card h2{margin:0 0 6px;font:400 24px/1.15 var(--o-serif)}.ao-ch{display:flex;justify-content:space-between;align-items:center;gap:10px}.ao-sub{color:var(--o-i2);font-size:13.5px;line-height:1.55;margin:4px 0 12px}" +
    ".ao-pill{display:inline-block;vertical-align:middle;font:800 10.5px/1 var(--bs-sans,Manrope,sans-serif);letter-spacing:.06em;text-transform:uppercase;color:var(--o-i2);background:var(--o-s);border-radius:999px;padding:5px 9px}.ao-pill.ok{background:rgba(47,143,107,.16);color:var(--o-i)}" +
    ".ao-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px}.ao label{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;color:var(--o-m);margin-bottom:10px}.ao select,.ao input:not([type=checkbox]),.ao textarea{display:block;margin-top:5px;width:100%;font:inherit;font-size:15px;padding:10px 11px;border:1px solid var(--o-l);border-radius:10px;background:var(--o-p);color:var(--o-i)}" +
    ".ao-verdict{margin-top:12px;font-weight:700;font-size:14px;padding:0}.ao-verdict.ok{color:var(--o-g)}.ao-verdict.bad{color:var(--o-b)}" +
    ".ao-ev{display:grid;grid-template-columns:78px 1fr;gap:2px 10px;padding:9px 0;border-top:1px solid var(--o-s);font-size:13.5px}.ao-ev:first-of-type{border-top:0}.ao-ts{color:var(--o-m);font-size:12px;font-variant-numeric:tabular-nums;grid-row:span 2}.ao-route i{font-style:normal;font-size:10.5px;font-weight:800;color:var(--o-m);margin-left:6px;letter-spacing:.05em}.ao-tx{color:var(--o-i2)}.k-conclusion .ao-route i{color:var(--o-g)}.k-task .ao-route i{color:var(--o-r)}" +
    ".ao-proof{border:1px solid var(--o-l);border-radius:16px;padding:14px;margin:10px 0;background:var(--o-p)}.ao-proof.done{opacity:.7}.ao-ph{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ao-ph b{font:400 21px var(--o-serif)}.ao-ph small{color:var(--o-m);font-size:12px;margin-left:auto}" +
    ".ao-stance{font-size:11px;font-weight:800;letter-spacing:.06em;padding:5px 9px;border-radius:999px;color:#fff;background:var(--o-m)}.s-actnow{background:var(--o-b)}.s-watch{background:var(--o-w)}.s-holdsteady{background:var(--o-g)}" +
    ".ao-conf{font-size:12px;font-weight:800;padding:4px 8px;border-radius:8px}.ao-conf.ok{background:rgba(47,143,107,.16);color:var(--o-i);box-shadow:inset 3px 0 0 var(--o-g)}.ao-conf.low{background:rgba(184,50,74,.12);color:var(--o-i);box-shadow:inset 3px 0 0 var(--o-b)}.ao-q{margin:8px 0 6px;color:var(--o-i2);font-size:13.5px;font-style:italic}" +
    ".ao-reasons{margin:6px 0 10px;padding:0;list-style:none}.ao-reasons li,.ao-msg li{font-size:13.5px;line-height:1.5;padding:4px 0;color:var(--o-i)}.ao-reasons i,.ao-msg li i{font-style:normal;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:2px 6px;border-radius:5px;margin-right:7px}i.data{background:rgba(47,143,107,.16);color:var(--o-i);box-shadow:inset 2px 0 0 var(--o-g)}i.assumption{background:rgba(196,137,42,.18);color:var(--o-i);box-shadow:inset 2px 0 0 var(--o-w)}" +
    ".ao-opts{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;font-size:13.5px}.ao-opts small{color:var(--o-m)}.ao-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ao-done{font-weight:800;color:var(--o-g);font-size:13px}" +
    ".ao-sot{white-space:pre-wrap;font:12.5px/1.6 var(--bs-mono,ui-monospace,Menlo,monospace);background:var(--o-p);border:1px solid var(--o-l);border-radius:12px;padding:14px;color:var(--o-i);margin:0;max-height:560px;overflow:auto}" +
    ".ao-cal{display:grid;grid-template-columns:1fr 1.4fr auto;gap:4px 14px;align-items:center;padding:10px 0;border-top:1px solid var(--o-s)}.ao-cal small{color:var(--o-m);font-size:12px;grid-column:1}.ao-cal>b{grid-column:1}.ao-bars{grid-column:2;grid-row:1/span 2;display:grid;grid-template-columns:90px 1fr;gap:4px 8px;align-items:center;font-size:12px;color:var(--o-i2)}.ao-bars i{display:block;height:8px;border-radius:4px}.ao-bars .said{background:var(--o-gd)}.ao-bars .earned{background:var(--o-g)}.ao-badge{grid-column:3;grid-row:1/span 2;font-size:11.5px;font-weight:800;color:var(--o-m)}.ao-badge.ok{color:var(--o-g)}" +
    ".ao-scrim{position:fixed;inset:0;background:rgba(10,10,14,.45);z-index:8900;opacity:0;visibility:hidden;transition:opacity .18s}.ao-scrim.on{opacity:1;visibility:visible}" +
    ".ao-drawer{position:fixed;top:0;right:0;bottom:0;width:min(480px,100%);background:var(--o-c);color:var(--o-i);z-index:9000;transform:translateX(102%);transition:transform .22s ease;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(0,0,0,.2)}.ao-drawer.on{transform:none}" +
    ".ao-dh{padding:18px 20px 12px;border-bottom:1px solid var(--o-l);position:relative}.ao-dh small{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--o-r)}.ao-dh h3{margin:4px 0 0;font:400 30px/1.05 var(--o-serif)}.ao-x{position:absolute;right:12px;top:10px;border:0;background:none;font-size:26px;color:var(--o-m);cursor:pointer;width:44px;height:44px}" +
    ".ao-db{padding:14px 20px calc(24px + env(safe-area-inset-bottom));overflow:auto;flex:1}.ao-db dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;margin:0 0 12px}.ao-db dt{color:var(--o-m);font-weight:700}.ao-db dd{margin:0}.ao-persona{font-size:14px;line-height:1.6;color:var(--o-i2)}.ao-db h4{margin:16px 0 6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--o-m)}" +
    ".ao-fig{font-size:13.5px;padding:7px 10px;border-radius:10px;background:var(--o-p);margin-bottom:6px}.ao-fig small{color:var(--o-m);margin-left:4px}.ao-fig.bad{background:rgba(184,50,74,.09)}.ao-fig.warn{background:rgba(196,137,42,.12)}" +
    ".ao-log{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}.ao-msg{font-size:13.5px;line-height:1.55;padding:10px 12px;border-radius:12px}.ao-msg.you{align-self:flex-end;background:var(--o-r);color:#fff;max-width:85%}.ao-msg.seat{background:var(--o-p);border:1px solid var(--o-l)}.ao-msg ul{margin:6px 0;padding:0;list-style:none}.ao-rowin{display:flex;gap:8px}.ao-rowin input{flex:1;min-width:0;font:inherit;font-size:16px;padding:11px 12px;border:1px solid var(--o-l);border-radius:12px;background:var(--o-p);color:var(--o-i)}" +
    "@media(max-width:720px){.ao-head h1{font-size:30px}.ao-run{align-items:stretch;width:100%}.ao-ask{flex-direction:column}.ao-grid{grid-template-columns:1fr}.ao-node{min-width:0;width:100%}.ao-cal{grid-template-columns:1fr}.ao-bars,.ao-badge{grid-column:1;grid-row:auto}.ao-ev{grid-template-columns:1fr}.ao-ts{grid-row:auto}}";
  document.head.appendChild(css);

  render();
  /* Birdseye loads after the page script; wait for it, then repaint so departments show their real rooms, and run Autopilot if it is on */
  var tries = 0; (function wait() { if (window.BirdseyeShell && window.BIRDSEYE && BirdseyeShell.figure) { render(); autopilot(false); setInterval(function () { autopilot(false); }, 60000); return; } if (++tries < 80) setTimeout(wait, 100); })();
  window.AEOrg = { org: ORG, db: function () { return D; }, run: run, sweep: sweep, validate: validate };
})();
