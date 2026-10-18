/* AIMOS ROOM — the stockroom, inside a vertical operating system.  Accelerated Experiences LLC · Oct 18 2026.
   Anthony, Oct 18 2026: put AIMOS in the five systems that live off a shelf (Toolbelt, Steak n Eggs, Smiley,
   Stay@Home, Sleeves). This is the showroom form of AIMOS (aexperiences.studio/apps/aimos/): the same moves —
   find a supply, Pull −, Restock +, Set count, see what is low before it runs out, draft the reorder — on the
   trade's own sample shelf. The real stockroom (team join code, scan labels, Roz) is one tap away.

   One file, every system. A page sets window.AIMOS_ROOM = { os, engine, active, crumb, house, seed:[…] } and
   loads this after its engine. Supplies live in this browser only (localStorage "aimos-room:<os>"), so a
   showroom visitor can pull and restock freely; "Reset the shelf" puts the sample back.
   Canonical copy: aehub/machines/birdseye/aimos-room/aimos-room.js — copy it into each system beside its engine. */
(function () {
  "use strict";
  var C = window.AIMOS_ROOM || {};
  var E = window[C.engine];
  var KEY = "aimos-room:" + (C.os || "os");
  var APP = "https://aexperiences.studio/apps/aimos/";
  var UNITS = ["each", "box", "case", "pack", "bottle", "roll", "bag", "pair", "kit", "tube", "spool", "jar"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function now() { return Date.now(); }
  function ymd(t) { var d = new Date(t); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  var ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  function code() { var s = ""; for (var i = 0; i < 8; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return s; }

  /* ---------- the shelf ---------- */
  function fresh() {
    var t = now();
    return { items: (C.seed || []).map(function (x) { return { id: code(), name: x[0], cat: x[1], loc: x[2], unit: x[3], qty: x[4], min: x[5], par: x[6], sku: x[7] || "" }; }),
      moves: (C.seed || []).filter(function (x, i) { return i % 3 === 0; }).map(function (x, i) { return { ts: t - (i + 1) * 47 * 60000, kind: "pull", name: x[0], n: 1 + (i % 3), unit: x[3], who: (C.people || ["The team"])[i % (C.people || ["x"]).length] }; }),
      staged: false };
  }
  function read() { try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.items)) return d; } catch (e) {} return null; }
  var D = read() || fresh();
  function write() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  write();
  function byId(id) { return D.items.filter(function (x) { return x.id === id; })[0]; }
  function isOut(it) { return it.qty <= 0; }
  function isLow(it) { return it.min > 0 && it.qty <= it.min; }
  function orderQty(it) { return Math.max(0, (it.par || it.min * 2 || 0) - it.qty); }
  function lows() { return D.items.filter(isLow).sort(function (a, b) { return a.qty / (a.min || 1) - b.qty / (b.min || 1); }); }
  function cats() { var s = []; D.items.forEach(function (x) { if (x.cat && s.indexOf(x.cat) < 0) s.push(x.cat); }); return s.sort(); }
  function pulledToday() { var t = ymd(now()); return D.moves.filter(function (m) { return m.kind === "pull" && ymd(m.ts) === t; }).reduce(function (a, m) { return a + m.n; }, 0); }
  function flag(it) { return isOut(it) ? '<span class="am-flag out">OUT</span>' : isLow(it) ? '<span class="am-flag low">LOW</span>' : ""; }
  function toast(m, k) { if (E && E.toast) return E.toast(m, k); var w = document.getElementById("amToast"); if (!w) { w = document.createElement("div"); w.id = "amToast"; document.body.appendChild(w); } w.textContent = m; w.className = "on"; clearTimeout(w._t); w._t = setTimeout(function () { w.className = ""; }, 2600); }

  /* ---------- the page ---------- */
  var content = E && E.mount ? E.mount({ active: C.active || "aimos.html", crumb: C.crumb || "Stockroom" }) : document.body;
  var F = { q: "", cat: "all", view: "all" };
  try { var sv = JSON.parse(localStorage.getItem(KEY + ":filter")); if (sv) { F.cat = sv.cat || "all"; F.view = sv.view || "all"; } } catch (e) {}
  function keepF() { try { localStorage.setItem(KEY + ":filter", JSON.stringify({ cat: F.cat, view: F.view })); } catch (e) {} }
  var root = document.createElement("div"); root.className = "am"; content.appendChild(root);

  function render() {
    var lo = lows(), out = D.items.filter(isOut).length, cs = cats();
    if (F.cat !== "all" && cs.indexOf(F.cat) < 0) F.cat = "all";
    root.innerHTML =
      '<div class="am-head"><img class="am-mark" src="' + esc(C.mark || "marks/aimos.png") + '" alt="AIMOS">' +
        '<div><h1>' + esc(C.title || "Stockroom") + '</h1><p>' + esc(C.lede || "Every supply on one list, on every phone. Tap a supply to pull, restock or count it. What is running low shows before it runs out.") + '</p>' +
        '<div class="am-by">Runs on <b>AIMOS</b> · Accelerated Inventory</div></div></div>' +
      '<div class="am-stats">' +
        stat(D.items.length, "supplies on the list", "all") + stat(lo.length, lo.length === 1 ? "running low" : "running low", "low", lo.length ? "watch" : "good") +
        stat(out, "out", "out", out ? "bad" : "good") + stat(pulledToday(), "pulled today", "moves") + '</div>' +
      (lo.length ? '<section class="am-card am-alert"><div class="am-ch"><h2>Running low</h2><button class="am-btn am-pri" data-reorder>' + (D.staged ? "Reorder staged ✓" : "Draft the reorder") + '</button></div>' +
        lo.slice(0, 6).map(function (it) { return '<button class="am-row" data-it="' + it.id + '"><span class="x"><b>' + esc(it.name) + '</b>' + flag(it) + '<small>' + esc(it.loc) + ' · reorder at ' + it.min + '</small></span><span class="v">' + it.qty + ' <small>' + esc(it.unit) + '</small><small class="am-ord">order ' + orderQty(it) + '</small></span></button>'; }).join("") +
        (D.staged ? '<p class="am-note">The reorder is on the Approval Desk. Nothing is bought until the owner says yes.</p>' : "") + '</section>' : "") +
      '<section class="am-card"><div class="am-ch"><h2>The list</h2><button class="am-btn" data-add>Add a supply</button></div>' +
        '<div class="am-tools"><input class="am-q" id="amQ" placeholder="Find a supply, a shelf or a SKU" value="' + esc(F.q) + '">' +
        '<div class="am-chips">' + ['all'].concat(cs).map(function (c) { return '<button class="am-chip' + (F.cat === c ? " on" : "") + '" data-cat="' + esc(c) + '">' + (c === "all" ? "Everything" : esc(c)) + '</button>'; }).join("") + '</div></div>' +
        '<div id="amList"></div></section>' +
      '<section class="am-card"><div class="am-ch"><h2>Today on the shelf</h2></div><div id="amFeed"></div></section>' +
      '<section class="am-card am-real"><div><h2>The real stockroom</h2><p>Your whole team joins one stockroom with a six-letter code. Print a label for every bin; anyone scans it with their phone camera and taps Pull or Restock. Roz can do it by voice.</p></div>' +
        '<a class="am-btn am-pri" href="' + APP + '" target="_blank" rel="noopener">Open AIMOS</a></section>' +
      '<p class="am-foot">Sample shelf for this showroom. It lives in this browser only. <button class="am-link" data-reset>Reset the shelf</button></p>';
    list(); feed();
  }
  function stat(v, l, view, tone) { return '<button class="am-stat ' + (tone || "") + (F.view === view ? " on" : "") + '" data-view="' + view + '"><b>' + v + '</b><span>' + l + '</span></button>'; }
  function list() {
    var q = F.q.trim().toLowerCase();
    var rows = D.items.filter(function (it) {
      if (F.cat !== "all" && it.cat !== F.cat) return false;
      if (F.view === "low" && !isLow(it)) return false;
      if (F.view === "out" && !isOut(it)) return false;
      if (q && [it.name, it.cat, it.loc, it.sku, it.id].join(" ").toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return (a.cat || "").localeCompare(b.cat || "") || a.name.localeCompare(b.name); });
    document.getElementById("amList").innerHTML = rows.length ? rows.map(function (it) {
      var pct = it.par ? Math.min(100, Math.round(it.qty / it.par * 100)) : 0;
      return '<button class="am-row" data-it="' + it.id + '"><span class="x"><b>' + esc(it.name) + '</b>' + flag(it) + '<small>' + esc([it.cat, it.loc].filter(Boolean).join(" · ")) + '</small>' +
        '<i class="am-bar"><i style="width:' + pct + '%" class="' + (isOut(it) ? "bad" : isLow(it) ? "watch" : "good") + '"></i></i></span>' +
        '<span class="v">' + it.qty + ' <small>' + esc(it.unit) + '</small></span></button>';
    }).join("") : '<p class="am-note">Nothing matches. Clear the search or pick Everything.</p>';
  }
  function feed() {
    var m = D.moves.slice().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 8);
    document.getElementById("amFeed").innerHTML = m.length ? m.map(function (x) {
      var t = new Date(x.ts), hh = t.getHours() % 12 || 12, mm = ("0" + t.getMinutes()).slice(-2), ap = t.getHours() < 12 ? "a" : "p";
      var verb = x.kind === "pull" ? "pulled" : x.kind === "restock" ? "restocked" : "counted";
      return '<div class="am-feed"><span>' + hh + ":" + mm + ap + '</span><span><b>' + esc(x.who) + '</b> ' + verb + ' ' + x.n + ' ' + esc(x.unit) + ' of ' + esc(x.name) + '</span></div>';
    }).join("") : '<p class="am-note">Nothing has moved yet today.</p>';
  }

  /* ---------- the sheet ---------- */
  var back = document.createElement("div"); back.className = "am-back"; document.body.appendChild(back);
  back.addEventListener("click", function (e) { if (e.target === back) close(); });
  function close() { back.classList.remove("open"); }
  function sheet(it) {
    back.innerHTML = '<div class="am-sheet" role="dialog" aria-label="' + esc(it.name) + '">' +
      '<h3>' + esc(it.name) + flag(it) + '</h3><p class="am-sub">' + esc([it.cat, it.loc, it.sku ? "SKU " + it.sku : "", "code " + it.id].filter(Boolean).join(" · ")) + '</p>' +
      '<div class="am-big"><b>' + it.qty + '</b><span>' + esc(it.unit) + ' on hand' + (it.min ? ' · reorder at ' + it.min : '') + (it.par ? ' · full shelf ' + it.par : '') + '</span></div>' +
      '<div class="am-step"><button class="am-btn" data-st="-1">−</button><input id="amN" type="number" inputmode="numeric" min="1" value="1"><button class="am-btn" data-st="1">+</button></div>' +
      '<div class="am-two"><button class="am-btn am-pri" data-mv="pull">Pull −</button><button class="am-btn" data-mv="restock">Restock +</button></div>' +
      '<label class="am-lab">Counted the shelf? Type what is there now<input id="amC" type="number" inputmode="numeric" min="0" placeholder="' + it.qty + '"></label>' +
      '<button class="am-btn am-wide" data-mv="count">Set count</button>' +
      (isLow(it) && orderQty(it) ? '<p class="am-note">Order about <b>' + orderQty(it) + ' ' + esc(it.unit) + '</b> to get back to a full shelf.</p>' : '') +
      '<button class="am-btn am-wide am-quiet" data-x>Close</button></div>';
    back.classList.add("open");
    back.querySelector(".am-sheet").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-x")) return close();
      if (b.hasAttribute("data-st")) { var i = back.querySelector("#amN"); i.value = Math.max(1, (parseInt(i.value, 10) || 1) + parseInt(b.getAttribute("data-st"), 10)); return; }
      var kind = b.getAttribute("data-mv"); if (!kind) return;
      var n = parseInt(back.querySelector(kind === "count" ? "#amC" : "#amN").value, 10);
      if (kind === "count" ? isNaN(n) || n < 0 : !(n > 0)) { toast(kind === "count" ? "Type the number on the shelf first." : "How many?", "warn"); return; }
      var was = it.qty;
      it.qty = kind === "pull" ? Math.max(0, it.qty - n) : kind === "restock" ? it.qty + n : n;
      D.moves.push({ ts: now(), kind: kind, name: it.name, n: kind === "count" ? n : n, unit: it.unit, who: C.you || "You" });
      if (kind === "restock" && !lows().length) D.staged = false;
      write(); render();
      var msg = (kind === "pull" ? "Pulled " + n : kind === "restock" ? "Restocked " + n : "Counted " + n) + " " + it.unit + " of " + it.name + " · " + it.qty + " left" + (isLow(it) && !(was <= it.min) ? " · now LOW, the office knows" : "") + ".";
      toast(msg, isLow(it) ? "warn" : "ok"); sheet(it);
    };
  }
  function addSheet() {
    back.innerHTML = '<div class="am-sheet" role="dialog" aria-label="Add a supply"><h3>Add a supply</h3>' +
      '<label class="am-lab">Name<input id="aN" maxlength="120" placeholder="' + esc((C.seed && C.seed[0] && C.seed[0][0]) || "Nitrile gloves, medium") + '"></label>' +
      '<div class="am-two"><label class="am-lab">On hand<input id="aQ" type="number" inputmode="numeric" min="0" value="0"></label><label class="am-lab">Unit<select id="aU">' + UNITS.map(function (u) { return "<option>" + u + "</option>"; }).join("") + '</select></label></div>' +
      '<div class="am-two"><label class="am-lab">Reorder at<input id="aM" type="number" inputmode="numeric" min="0" value="0"></label><label class="am-lab">Full shelf<input id="aP" type="number" inputmode="numeric" min="0" value="0"></label></div>' +
      '<div class="am-two"><label class="am-lab">Category<input id="aC" maxlength="60" list="amCats"></label><label class="am-lab">Where it lives<input id="aL" maxlength="80" placeholder="Shelf B, bin 3"></label></div>' +
      '<datalist id="amCats">' + cats().map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + '</datalist>' +
      '<div class="am-two"><button class="am-btn am-pri" data-save>Add it</button><button class="am-btn am-quiet" data-x>Cancel</button></div></div>';
    back.classList.add("open");
    back.querySelector(".am-sheet").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-x")) return close();
      if (!b.hasAttribute("data-save")) return;
      var v = function (id) { return back.querySelector("#" + id).value.trim(); };
      if (!v("aN")) { toast("Give the supply a name first.", "warn"); return; }
      var it = { id: code(), name: v("aN"), qty: Math.max(0, parseInt(v("aQ"), 10) || 0), unit: v("aU"), min: Math.max(0, parseInt(v("aM"), 10) || 0), par: Math.max(0, parseInt(v("aP"), 10) || 0), cat: v("aC") || "Other", loc: v("aL"), sku: "" };
      D.items.push(it); write(); close(); render(); toast(it.name + " is on the list.", "ok");
    };
  }

  /* ---------- wiring ---------- */
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-it")) { var it = byId(b.getAttribute("data-it")); if (it) sheet(it); return; }
    if (b.hasAttribute("data-cat")) { F.cat = b.getAttribute("data-cat"); keepF(); render(); return; }
    if (b.hasAttribute("data-view")) { var v = b.getAttribute("data-view"); F.view = v === "moves" ? F.view : (F.view === v ? "all" : v); keepF(); render(); if (v === "moves") root.querySelector("#amFeed").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (b.hasAttribute("data-add")) return addSheet();
    if (b.hasAttribute("data-reorder")) { if (!D.staged) { D.staged = true; write(); render(); toast("Reorder drafted for " + lows().length + " supplies. It is on the Approval Desk; nothing is bought until the owner says yes.", "warn"); } return; }
    if (b.hasAttribute("data-reset")) { D = fresh(); write(); F = { q: "", cat: "all", view: "all" }; keepF(); render(); toast("The sample shelf is back.", "ok"); }
  });
  root.addEventListener("input", function (e) { if (e.target.id === "amQ") { F.q = e.target.value; list(); } });

  var s = document.createElement("style");
  s.textContent =
    ".am,.am-back{--am-c:var(--card,#fff);--am-i:var(--ink,#1d1d1f);--am-i2:var(--ink-2,#555);--am-m:var(--mut,#888);--am-l:var(--line,#e5e2ea);--am-s:var(--sunk,#f1eef4);--am-g:var(--good,#2f8f6b);--am-w:var(--watch,#c99a3c);--am-b:var(--bad,#b8324a)}.am{color:var(--am-i);max-width:1100px}" +
    ".am *,.am-back *{box-sizing:border-box}" +
    ".am-head{display:flex;gap:14px;align-items:center;margin:4px 0 16px}.am-mark{width:64px;height:64px;border-radius:16px;flex:0 0 64px;box-shadow:0 4px 14px rgba(0,0,0,.12)}" +
    ".am-head h1{margin:0 0 4px;font-size:26px;line-height:1.1}.am-head p{margin:0;color:var(--am-i2);font-size:14px;line-height:1.45}.am-by{margin-top:6px;font-size:12px;color:var(--am-m)}" +
    ".am-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}" +
    ".am-stat{font:inherit;color:inherit;text-align:left;background:var(--am-c);border:1px solid var(--am-l);border-radius:var(--r,12px);padding:12px 14px;cursor:pointer;min-width:0}" +
    ".am-stat b{display:block;font-size:26px;line-height:1.1}.am-stat span{font-size:12px;color:var(--am-m)}.am-stat.watch b{color:var(--am-w)}.am-stat.bad b{color:var(--am-b)}.am-stat.on{outline:2px solid var(--am-i2);outline-offset:-2px}" +
    ".am-card{background:var(--am-c);border:1px solid var(--am-l);border-radius:var(--r-lg,16px);padding:16px;margin-bottom:14px}.am-alert{border-left:4px solid var(--am-w)}" +
    ".am-ch{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.am-ch h2{margin:0;font-size:17px}" +
    ".am-btn{font:600 14px/1 inherit;font-family:inherit;color:var(--am-i);background:var(--am-s);border:1px solid var(--am-l);border-radius:10px;padding:11px 14px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:44px}" +
    ".am-pri{background:var(--am-i);color:var(--am-c);border-color:var(--am-i)}.am-quiet{background:transparent}.am-wide{width:100%;margin-top:8px}" +
    ".am-tools{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}.am-q{font:inherit;font-size:16px;width:100%;padding:11px 12px;border:1px solid var(--am-l);border-radius:10px;background:var(--am-c);color:var(--am-i)}" +
    ".am-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch}.am-chip{font:600 12.5px inherit;font-family:inherit;white-space:nowrap;background:var(--am-s);color:var(--am-i2);border:1px solid transparent;border-radius:20px;padding:7px 12px;cursor:pointer}.am-chip.on{background:var(--am-i);color:var(--am-c)}" +
    ".am-row{display:flex;width:100%;align-items:center;gap:12px;font:inherit;color:inherit;text-align:left;background:none;border:0;border-top:1px solid var(--am-l);padding:11px 2px;cursor:pointer}.am-row:first-child{border-top:0}" +
    ".am-row .x{flex:1;min-width:0}.am-row .x b{font-size:15px}.am-row small{display:block;color:var(--am-m);font-size:12px;margin-top:2px}.am-row .v{text-align:right;font-weight:700;font-size:18px;white-space:nowrap}.am-row .v small{display:inline;font-weight:500}.am-row .v .am-ord{display:block;color:var(--am-w)}" +
    ".am-bar{display:block;height:4px;border-radius:3px;background:var(--am-s);margin-top:6px;max-width:220px;overflow:hidden}.am-bar i{display:block;height:100%}.am-bar .good{background:var(--am-g)}.am-bar .watch{background:var(--am-w)}.am-bar .bad{background:var(--am-b)}" +
    ".am-flag{display:inline-block;margin-left:8px;font-size:10.5px;font-weight:800;letter-spacing:.5px;padding:2px 7px;border-radius:6px;vertical-align:2px}.am-flag.low{background:var(--watch-w,rgba(201,154,60,.17));color:var(--am-w)}.am-flag.out{background:var(--bad-w,rgba(184,50,74,.12));color:var(--am-b)}" +
    ".am-feed{display:flex;gap:12px;padding:8px 0;border-top:1px solid var(--am-l);font-size:13.5px}.am-feed:first-child{border-top:0}.am-feed span:first-child{color:var(--am-m);min-width:54px;font-variant-numeric:tabular-nums}" +
    ".am-real{display:flex;align-items:center;justify-content:space-between;gap:16px}.am-real h2{margin:0 0 4px;font-size:17px}.am-real p{margin:0;color:var(--am-i2);font-size:14px;line-height:1.45}" +
    ".am-note{color:var(--am-i2);font-size:13px;margin:10px 0 0}.am-foot{color:var(--am-m);font-size:12px;margin:4px 0 20px}.am-link{font:inherit;background:none;border:0;color:var(--am-i2);text-decoration:underline;cursor:pointer;padding:0}" +
    ".am-back{position:fixed;inset:0;background:rgba(10,10,14,.5);z-index:400;display:flex;align-items:flex-end;justify-content:center;visibility:hidden;opacity:0;transition:opacity .18s}.am-back.open{visibility:visible;opacity:1}" +
    ".am-sheet{background:var(--card,#fff);color:var(--ink,#1d1d1f);width:100%;max-width:520px;max-height:90vh;overflow:auto;border-radius:18px 18px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.2)}" +
    "@media(min-width:721px){.am-back{align-items:center}.am-sheet{border-radius:18px}}" +
    ".am-sheet h3{margin:0;font-size:20px}.am-sub{margin:4px 0 12px;color:var(--mut,#888);font-size:12.5px}.am-big{display:flex;align-items:baseline;gap:10px;margin-bottom:12px}.am-big b{font-size:44px;line-height:1}.am-big span{color:var(--ink-2,#555);font-size:13px}" +
    ".am-step{display:grid;grid-template-columns:56px 1fr 56px;gap:8px;margin-bottom:8px}.am-step input,.am-lab input,.am-lab select{font:inherit;font-size:16px;width:100%;padding:11px 12px;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--card,#fff);color:inherit;text-align:center}.am-lab input,.am-lab select{text-align:left}" +
    ".am-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.am-lab{display:block;font-size:12.5px;color:var(--ink-2,#555);margin-top:12px}.am-lab input,.am-lab select{margin-top:5px}" +
    "#amToast{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);background:#1d1d1f;color:#fff;padding:10px 14px;border-radius:10px;font-size:14px;opacity:0;transition:opacity .2s;z-index:500;max-width:90vw}#amToast.on{opacity:1}" +
    "@media(max-width:720px){.am-stats{grid-template-columns:repeat(2,1fr)}.am-head h1{font-size:22px}.am-mark{width:52px;height:52px;flex-basis:52px}.am-real{flex-direction:column;align-items:stretch}}";
  document.head.appendChild(s);
  render();
  window.AIMOSRoom = { db: function () { return D; }, lows: lows, isLow: isLow, isOut: isOut };
})();
