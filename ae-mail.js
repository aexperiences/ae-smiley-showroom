/* =====================================================================================================
   AE MAIL — the company mailbox inside a firm's own system (Accelerated Experiences LLC · Oct 24 2026)

   Anthony, Oct 24 2026: "1" (connect the mailbox the firm already has), then "Make the mail better than mine and make
   sure it's optimized for the phone. Make it a really nice system." / "Make the Mail system slick as fuck with everything
   I have, but slick as fuck" / "Back buttons or key on every screen in the system, including mail and inside the inbox".

   Loaded by ae-rooms.js only when the engine runs a firm's OWN book (E.own()); the showroom keeps its sample mailbox.
   Talks to /api/os-mail (the firm's own IMAP/SMTP, its sign-in sealed at the hub). Every screen inside it (a message,
   compose, folders, settings) is a step on the browser history, so the header back arrow, the phone's back swipe and
   Escape all step back one screen. Nothing sends by itself: Send is a tap, with five seconds to undo.

   Everything his own mail does is here: folders (make, empty, delete), search, older pages, unread only, read, files,
   reply / reply all / forward (with the files), Cc and Bcc, drafts, archive, junk, trash, star, unread, many at once,
   mark all read, add the sender to contacts, print. Plus: swipe a row to archive or mark read, conversations, pictures
   held back until you trust a sender, file a message to a project, a signature, undo send, keyboard keys on a laptop.
   ===================================================================================================== */
(function () {
  "use strict";
  var API = "/api/os-mail";
  var AEMail = window.AEMail = {};

  AEMail.mount = function (root, o) {
    var E = o.E, OS = o.os, CODE = o.code, toastX = o.toast || function () {};
    var BS = function () { return window.BirdseyeShell || {}; };
    var S = { view: "list", box: "inbox", boxPath: "", boxName: "Inbox", folders: [], list: [], more: false, offset: 0, total: 0, unseen: 0,
      q: "", unread: false, sel: {}, selecting: false, msg: null, thread: [], acct: null, loading: false, err: "" };
    var LS = "ae-mail:" + OS + ":";
    function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(LS + k)); localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { return null; } }

    /* ---------------- helpers ---------------- */
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function qs(o) { return Object.keys(o).filter(function (k) { return o[k] !== undefined && o[k] !== null && o[k] !== ""; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(o[k]); }).join("&"); }
    function get(p) {
      return fetch(API + "?" + qs(Object.assign({ app: OS, code: CODE }, p)), { cache: "no-store", credentials: "same-origin" })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.ok === false) throw Object.assign(new Error(j.message || "That did not work."), { code: j.error, status: r.status }); return j; }); });
    }
    function post(b) {
      return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(Object.assign({ app: OS, code: CODE }, b)) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.ok === false) throw Object.assign(new Error(j.message || "That did not work."), { code: j.error }); return j; }); });
    }
    function toast(m, k, act) {
      var t = document.getElementById("amToast"); if (!t) { t = document.createElement("div"); t.id = "amToast"; t.className = "am-toast"; document.body.appendChild(t); }
      clearTimeout(t._h); t.innerHTML = '<span>' + esc(m) + '</span>' + (act ? '<button type="button">' + esc(act.label) + '</button>' : "");
      t.className = "am-toast on " + (k || ""); if (act) t.querySelector("button").onclick = function () { t.className = "am-toast"; act.fn(); };
      t._h = setTimeout(function () { t.className = "am-toast"; }, act ? (act.ms || 5000) : 2600);
    }
    function when(iso, long) {
      if (!iso) return ""; var d = new Date(iso), n = new Date(), day = 864e5;
      var same = d.toDateString() === n.toDateString(), y = new Date(n - day).toDateString() === d.toDateString();
      var t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      if (long) return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: d.getFullYear() !== n.getFullYear() ? "numeric" : undefined }) + " at " + t;
      if (same) return t; if (y) return "Yesterday"; if (n - d < 6 * day) return d.toLocaleDateString([], { weekday: "short" });
      return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== n.getFullYear() ? "2-digit" : undefined });
    }
    function initials(n) { var p = String(n || "?").replace(/[<>"]/g, "").trim().split(/[\s@.]+/).filter(function (w) { return /^[A-Za-z]/.test(w); }); if (!p.length) p = [String(n || "?").replace(/[^A-Za-z0-9]/g, "") || "?"]; return ((p[0] || "?")[0] + (p.length > 1 ? p[1][0] : "")).toUpperCase(); }
    function hue(s) { var h = 0; s = String(s || ""); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
    function avatar(name, email, big) { return '<span class="am-av' + (big ? " big" : "") + '" style="--h:' + hue(email || name) + '">' + esc(initials(name || email)) + "</span>"; }
    function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
    function book() { try { return E.db() || {}; } catch (e) { return {}; } }
    function saveBook(fn) { try { E.save(fn); } catch (e) {} }
    function mailData() { var r = (book().rooms || {}); return r.mailx || {}; }
    function saveMail(fn) { saveBook(function (b) { b.rooms = b.rooms || {}; b.rooms.mailx = b.rooms.mailx || {}; fn(b.rooms.mailx); }); }
    var ICON = {
      back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>', pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>',
      search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>', star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z"/></svg>',
      arch: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="4.5" rx="1.2"/><path d="M5 8.5V19a1 1 0 001 1h12a1 1 0 001-1V8.5M10 12.5h4"/></svg>',
      trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/></svg>', reply: '<svg viewBox="0 0 24 24"><path d="M10 6L4 12l6 6M4.5 12H14a6 6 0 016 6v1"/></svg>',
      all: '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M13 7l-5 5 5 5M8.5 12H15a5 5 0 015 5v1"/></svg>', fwd: '<svg viewBox="0 0 24 24"><path d="M14 6l6 6-6 6M19.5 12H10a6 6 0 00-6 6v1"/></svg>',
      more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>', clip: '<svg viewBox="0 0 24 24"><path d="M20 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.3 3.3 0 014.7 4.7L9.7 17.2a1.7 1.7 0 01-2.4-2.4L15 7"/></svg>',
      folder: '<svg viewBox="0 0 24 24"><path d="M3.5 6.5a1.5 1.5 0 011.5-1.5h4.5l2 2.5H19a1.5 1.5 0 011.5 1.5v8.5A1.5 1.5 0 0119 19H5a1.5 1.5 0 01-1.5-1.5z"/></svg>',
      mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>', x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>', gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/></svg>',
      refresh: '<svg viewBox="0 0 24 24"><path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4.5v4h-4"/></svg>', pin: '<svg viewBox="0 0 24 24"><path d="M4.5 9.5L12 4l7.5 5.5V19a1 1 0 01-1 1h-13a1 1 0 01-1-1z"/><path d="M9.5 20v-5.5h5V20"/></svg>',
      person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0114 0"/></svg>', print: '<svg viewBox="0 0 24 24"><path d="M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2M7 14h10v6H7z"/></svg>',
      unread: '<svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="15" height="13" rx="2"/><path d="M3.5 7l7 5 7-5"/><circle cx="19.5" cy="5.5" r="2.5" class="f"/></svg>'
    };

    /* ---------------- history: every screen is a step back ---------------- */
    function push(state) { history.pushState(Object.assign({ bsIn: 1, am: 1 }, state), ""); if (BS().paintBack) BS().paintBack(); }
    window.addEventListener("popstate", function (e) {
      var st = e.state || {};
      closeSheet(true);
      if (st.am && st.v === "read" && S.msg && S.msg.uid === st.uid) { S.view = "read"; if (compose.open) closeCompose(true); paint(); return; }
      if (st.am && st.v === "compose") return;
      if (compose.open) { closeCompose(true); if (S.msg && st.v === "read") { S.view = "read"; } else S.view = "list"; paint(); return; }
      S.view = "list"; S.msg = null; paint();
      if (BS().paintBack) BS().paintBack();
    });
    function back() { history.back(); }

    /* ---------------- the frame ---------------- */
    root.innerHTML = '<div class="am" id="am"><div class="am-panes"><section class="am-list" id="amList"></section><section class="am-read" id="amRead"></section></div>' +
      '<div class="am-sheetback" id="amSheetBack"><div class="am-sheet" id="amSheet" role="dialog"></div></div><div class="am-compose" id="amCompose" role="dialog" aria-label="New message"></div></div>';
    var EL = { am: root.querySelector("#am"), list: root.querySelector("#amList"), read: root.querySelector("#amRead"), sb: root.querySelector("#amSheetBack"), sheet: root.querySelector("#amSheet"), comp: root.querySelector("#amCompose") };
    /* the sheets and the write screen sit on the page itself, above the system's header and dock (inside the room they
       were trapped under the header, so Send could not be tapped) */
    EL.sb.classList.add("am-root"); EL.comp.classList.add("am-root"); document.body.appendChild(EL.sb); document.body.appendChild(EL.comp);
    EL.sb.addEventListener("click", function (e) { if (e.target === EL.sb) back(); });

    function paint() {
      EL.am.classList.toggle("reading", S.view === "read");
      if (S.view === "connect") { EL.list.innerHTML = connectHTML(); wireConnect(); EL.read.innerHTML = ""; return; }
      paintList(); paintRead();
    }

    /* ---------------- connect ---------------- */
    var LINKS = { google: "https://myaccount.google.com/apppasswords", microsoft: "https://account.microsoft.com/security", icloud: "https://account.apple.com/account/manage", yahoo: "https://login.yahoo.com/account/security", zoho: "https://accounts.zoho.com/home#security/app_password" };
    function connectHTML() {
      return '<div class="am-connect"><div class="am-c-hero">' + ICON.mail + '<h2>Bring your company mail in</h2><p>Connect the mailbox your firm already uses (Google, Microsoft 365, iCloud, GoDaddy and others). Your mail stays where it is; this is a better window onto it, for everyone on your team.</p></div>' +
        '<label class="am-lab">Mailbox address<input id="amCEmail" type="email" autocomplete="email" inputmode="email" placeholder="office@yourfirm.com"></label>' +
        '<div class="am-prov" id="amCProv"></div>' +
        '<label class="am-lab">App password<input id="amCPass" type="password" autocomplete="off" placeholder="16 letters from your mail service"></label>' +
        '<label class="am-lab">Name on your mail<input id="amCName" autocomplete="organization" placeholder="' + esc(((book().own || {}).firm) || "Your firm") + '"></label>' +
        '<details class="am-adv"><summary>Server names (only if it asks)</summary><div class="am-two"><label class="am-lab">Incoming (IMAP)<input id="amCImap" placeholder="imap.yourhost.com"></label><label class="am-lab">Port<input id="amCImapP" inputmode="numeric" placeholder="993"></label></div>' +
        '<div class="am-two"><label class="am-lab">Outgoing (SMTP)<input id="amCSmtp" placeholder="smtp.yourhost.com"></label><label class="am-lab">Port<input id="amCSmtpP" inputmode="numeric" placeholder="465"></label></div></details>' +
        '<button type="button" class="am-btn am-pri am-wide" id="amCGo">Connect the mailbox</button>' +
        '<p class="am-fine">Use a shared company mailbox (like office@ or info@): everyone with your team link reads and sends from it. The password is sealed at the hub the moment it is checked, and it is never shown again.</p></div>';
    }
    function wireConnect() {
      var em = root.querySelector("#amCEmail"), pv = root.querySelector("#amCProv"), go = root.querySelector("#amCGo"), last = "";
      function detect() {
        var v = em.value.trim(); if (!/@.+\./.test(v) || v === last) return; last = v;
        pv.innerHTML = '<span class="am-spin"></span> Checking your mail service…';
        post({ a: "detect", email: v }).then(function (d) {
          pv.innerHTML = '<b>' + esc(d.label) + '</b><p>' + esc(d.help) + '</p>' + (LINKS[d.provider] ? '<a class="am-btn am-sm" target="_blank" rel="noopener" href="' + LINKS[d.provider] + '">Make an app password</a>' : "");
          if (d.provider === "other" && d.imap) { root.querySelector("#amCImap").value = d.imap.host; root.querySelector("#amCSmtp").value = d.smtp.host; root.querySelector(".am-adv").open = true; }
        }).catch(function () { pv.innerHTML = ""; });
      }
      em.addEventListener("blur", detect); em.addEventListener("change", detect);
      go.onclick = function () {
        var b = { a: "connect", email: em.value.trim(), password: root.querySelector("#amCPass").value, name: root.querySelector("#amCName").value.trim() || ((book().own || {}).firm) || "" };
        var ih = root.querySelector("#amCImap").value.trim(), sh = root.querySelector("#amCSmtp").value.trim();
        if (ih) b.imap = { host: ih, port: Number(root.querySelector("#amCImapP").value) || 993, secure: (Number(root.querySelector("#amCImapP").value) || 993) === 993 };
        if (sh) { var sp = Number(root.querySelector("#amCSmtpP").value) || 465; b.smtp = { host: sh, port: sp, secure: sp === 465 }; }
        go.disabled = true; go.innerHTML = '<span class="am-spin"></span> Checking the mailbox…';
        post(b).then(function (r) { S.acct = { email: r.email, name: r.name }; toast("Connected. Here is your mail.", "ok"); S.view = "list"; start(); })
          .catch(function (e) { go.disabled = false; go.textContent = "Connect the mailbox"; toast(e.message, "bad"); });
      };
    }

    /* ---------------- the list ---------------- */
    function folderLabel(f) { return f.use ? { inbox: "Inbox", drafts: "Drafts", sent: "Sent", archive: "Archive", junk: "Junk", trash: "Trash" }[f.use] : f.name; }
    function curFolder() { return S.folders.filter(function (f) { return f.use === S.box || f.path === S.box; })[0]; }
    function paintList() {
      var f = curFolder(), name = f ? folderLabel(f) : S.boxName, sel = Object.keys(S.sel).length;
      var head = S.selecting
        ? '<div class="am-bar sel"><button type="button" class="am-ib" data-x="unsel" aria-label="Done">' + ICON.x + '</button><b>' + sel + ' picked</b><span class="am-sp"></span>' +
          '<button type="button" class="am-ib" data-x="bulk" data-op="archive" aria-label="Archive">' + ICON.arch + '</button><button type="button" class="am-ib" data-x="bulk" data-op="read" aria-label="Mark read">' + ICON.check + '</button>' +
          '<button type="button" class="am-ib" data-x="bulk" data-op="unread" aria-label="Mark unread">' + ICON.unread + '</button><button type="button" class="am-ib" data-x="bulk" data-op="star" aria-label="Star">' + ICON.star + '</button>' +
          '<button type="button" class="am-ib" data-x="bulk" data-op="move" aria-label="Move">' + ICON.folder + '</button><button type="button" class="am-ib danger" data-x="bulk" data-op="trash" aria-label="Delete">' + ICON.trash + '</button></div>'
        : '<div class="am-bar"><button type="button" class="am-boxbtn" data-x="folders"><span>' + esc(name) + '</span>' + (S.unseen ? '<i>' + S.unseen + '</i>' : "") + '<svg viewBox="0 0 24 24" class="car"><path d="M7 10l5 5 5-5"/></svg></button><span class="am-sp"></span>' +
          '<button type="button" class="am-ib" data-x="refresh" aria-label="Check for new mail">' + ICON.refresh + '</button><button type="button" class="am-ib" data-x="settings" aria-label="Mail settings">' + ICON.gear + '</button></div>' +
          '<div class="am-search"><span>' + ICON.search + '</span><input id="amQ" type="search" enterkeyhint="search" placeholder="Search ' + esc(name) + '" value="' + esc(S.q) + '">' + (S.q ? '<button type="button" class="am-ib sm" data-x="clearq" aria-label="Clear">' + ICON.x + "</button>" : "") + '</div>' +
          '<div class="am-chips"><button type="button" class="am-chip' + (!S.unread ? " on" : "") + '" data-x="all">All</button><button type="button" class="am-chip' + (S.unread ? " on" : "") + '" data-x="unreadonly">Unread' + (S.unseen ? " · " + S.unseen : "") + '</button>' +
          (f && (f.use === "trash" || f.use === "junk") && S.total ? '<button type="button" class="am-chip warn" data-x="empty">Empty ' + esc(name) + '</button>' : "") +
          (S.unseen && !S.q ? '<button type="button" class="am-chip" data-x="allread">Mark all read</button>' : "") + '<button type="button" class="am-chip" data-x="select">Select</button></div>';
      var rows = S.list.map(rowHTML).join("");
      var body = S.err ? '<div class="am-empty bad"><b>' + esc(S.err) + '</b><button type="button" class="am-btn am-sm" data-x="refresh">Try again</button></div>'
        : (!S.list.length ? (S.loading ? skeleton() : '<div class="am-empty">' + ICON.mail + '<b>' + (S.q ? "Nothing matches “" + esc(S.q) + "”" : S.unread ? "No unread mail" : "Nothing in " + esc(name)) + '</b>' + (S.box === "inbox" && !S.q && !S.unread ? "<span>Inbox zero. Go do something fun.</span>" : "") + '</div>')
        : '<div class="am-rows" id="amRows">' + rows + '</div>' + (S.more ? '<button type="button" class="am-more" data-x="older">' + (S.loading ? '<span class="am-spin"></span>' : "Load older mail") + '</button>' : '<div class="am-end">That is everything in ' + esc(name) + '.</div>'));
      EL.list.innerHTML = head + '<div class="am-scroll" id="amScroll">' + body + '</div>' + (S.selecting ? "" : '<button type="button" class="am-fab" data-x="compose" aria-label="New message">' + ICON.pen + '<span>Write</span></button>');
      var q = EL.list.querySelector("#amQ");
      if (q) { q.onkeydown = function (e) { if (e.key === "Enter") { S.q = q.value.trim(); load(true); q.blur(); } }; q.onsearch = function () { if (!q.value) { S.q = ""; load(true); } }; }
      wireRows();
    }
    function rowHTML(m) {
      var links = mailData().links || {}, link = links[m.uid + "@" + (S.boxPath || "")];
      var who = S.box === "sent" || S.box === "drafts" ? (m.to ? "To " + m.to : "(no one yet)") : (m.from || m.fromEmail || "(unknown)");
      var on = S.msg && S.msg.uid === m.uid;
      return '<div class="am-row' + (m.seen ? "" : " unread") + (S.sel[m.uid] ? " picked" : "") + (on ? " on" : "") + '" data-uid="' + m.uid + '">' +
        '<div class="am-swipe l">' + ICON.check + '<span>' + (m.seen ? "Unread" : "Read") + '</span></div><div class="am-swipe r"><span>Archive</span>' + ICON.arch + '</div>' +
        '<div class="am-rowin">' + (S.selecting ? '<span class="am-tick">' + (S.sel[m.uid] ? ICON.check : "") + '</span>' : avatar(m.from, m.fromEmail)) +
        '<div class="am-rt"><div class="am-r1"><b>' + esc(who) + '</b><time>' + esc(when(m.date)) + '</time></div>' +
        '<div class="am-r2">' + (m.flagged ? '<i class="am-st">' + ICON.star + "</i>" : "") + esc(m.subject) + (m.att ? '<i class="am-cl">' + ICON.clip + "</i>" : "") + '</div>' +
        '<div class="am-r3">' + (m.draft ? '<em>Draft</em> ' : "") + (link ? '<em class="pj">' + esc(link.name) + '</em> ' : "") + esc(m.snippet || "") + '</div></div></div></div>';
    }
    function skeleton() { var s = ""; for (var i = 0; i < 7; i++) s += '<div class="am-row sk"><div class="am-rowin"><span class="am-av"></span><div class="am-rt"><div class="am-r1"><b></b></div><div class="am-r2"></div><div class="am-r3"></div></div></div></div>'; return s; }

    function wireRows() {
      var rows = EL.list.querySelectorAll(".am-row[data-uid]");
      Array.prototype.forEach.call(rows, function (r) {
        var uid = Number(r.getAttribute("data-uid")), inner = r.querySelector(".am-rowin"), x0 = 0, y0 = 0, dx = 0, drag = false, lp = null, moved = false;
        r.addEventListener("touchstart", function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; drag = false; moved = false; lp = setTimeout(function () { if (!moved) { navigator.vibrate && navigator.vibrate(12); S.selecting = true; S.sel[uid] = 1; paintList(); } }, 480); }, { passive: true });
        r.addEventListener("touchmove", function (e) {
          var t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
          if (Math.abs(mx) > 8 || Math.abs(my) > 8) { moved = true; clearTimeout(lp); }
          if (S.selecting) return;
          if (!drag && Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.4) drag = true;
          if (drag) { dx = Math.max(-140, Math.min(140, mx)); inner.style.transition = "none"; inner.style.transform = "translateX(" + dx + "px)"; r.classList.toggle("goL", dx > 70); r.classList.toggle("goR", dx < -70); e.preventDefault && e.cancelable && e.preventDefault(); }
        }, { passive: false });
        r.addEventListener("touchend", function () {
          clearTimeout(lp); inner.style.transition = "";
          if (drag) { drag = false; if (dx < -70) { inner.style.transform = "translateX(-110%)"; setTimeout(function () { act("archive", [uid]); }, 180); return; } if (dx > 70) { inner.style.transform = ""; var m = byUid(uid); act(m && m.seen ? "unread" : "read", [uid]); return; } inner.style.transform = ""; }
        });
        r.addEventListener("click", function () { if (moved) return; if (S.selecting) { if (S.sel[uid]) delete S.sel[uid]; else S.sel[uid] = 1; if (!Object.keys(S.sel).length) S.selecting = false; paintList(); return; } openMsg(uid); });
        r.addEventListener("contextmenu", function (e) { e.preventDefault(); S.selecting = true; S.sel[uid] = 1; paintList(); });
      });
      var sc = EL.list.querySelector("#amScroll");
      if (sc) {
        var py = null; sc.addEventListener("touchstart", function (e) { py = sc.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
        sc.addEventListener("touchend", function (e) { if (py !== null && e.changedTouches[0].clientY - py > 90) refresh(); py = null; });
        sc.addEventListener("scroll", function () { if (S.more && !S.loading && sc.scrollTop + sc.clientHeight > sc.scrollHeight - 300) older(); });
      }
    }
    window.addEventListener("scroll", onWinScroll, { passive: true });
    function onWinScroll() { if (S.view !== "list" || !S.more || S.loading) return; if (window.innerHeight + window.scrollY > document.body.scrollHeight - 400) older(); }
    function byUid(u) { return S.list.filter(function (m) { return m.uid === u; })[0]; }

    /* ---------------- loading ---------------- */
    function start() {
      S.loading = true; paint();
      get({ a: "folders" }).then(function (j) { S.folders = j.folders || []; S.acct = { email: j.email, name: j.name }; return load(true); })
        .catch(function (e) { S.loading = false; if (e.code === "NOT_CONNECTED") { S.view = "connect"; paint(); } else { S.err = e.message; paint(); } });
    }
    function load(reset) {
      if (reset) { S.offset = 0; S.list = []; S.sel = {}; S.selecting = false; }
      S.loading = true; S.err = ""; if (reset) paintList();
      return get({ a: "list", box: S.box, offset: S.offset, limit: 30, q: S.q, unread: S.unread ? "1" : "" }).then(function (j) {
        S.boxPath = j.box; S.list = reset ? j.messages : S.list.concat(j.messages.filter(function (m) { return !byUid(m.uid); }));
        S.list.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });   /* newest first, whatever order the server keeps */
        S.more = j.more; S.total = j.total; S.unseen = j.unseen; S.offset = S.list.length; S.loading = false;
        var f = curFolder(); if (f && f.use === "inbox") f.unseen = j.unseen;
        if (S.view !== "read") paintList(); else paintList();
        badge();
      }).catch(function (e) { S.loading = false; S.err = e.message; paintList(); });
    }
    function older() { S.loading = true; paintList(); load(false); }
    function refresh() { toast("Checking for new mail…"); get({ a: "list", box: S.box, offset: 0, limit: 30, q: S.q, unread: S.unread ? "1" : "" }).then(function (j) {
      var fresh = j.messages.filter(function (m) { return !byUid(m.uid); });
      j.messages.forEach(function (m) { var o = byUid(m.uid); if (o) { o.seen = m.seen; o.flagged = m.flagged; } });
      S.list = fresh.concat(S.list); S.list.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }); S.unseen = j.unseen; S.total = j.total; S.offset = S.list.length; paintList(); badge();
      toast(fresh.length ? fresh.length + " new" : "You're up to date", "ok");
    }).catch(function (e) { toast(e.message, "bad"); }); }
    function badge() { try { var b = (S.folders.filter(function (f) { return f.use === "inbox"; })[0] || {}).unseen || 0; document.title = (b ? "(" + b + ") " : "") + document.title.replace(/^\(\d+\)\s*/, ""); } catch (e) {} }

    /* ---------------- reading ---------------- */
    function openMsg(uid, fromPop) {
      var m = byUid(uid);
      if (S.box === "drafts") { return get({ a: "read", box: S.box, uid: uid }).then(function (r) {
        openCompose({ draftUid: uid, to: addrs(r.to), cc: addrs(r.cc), subject: r.subject === "(no subject)" ? "" : r.subject, text: r.text });
        bringFiles(r, uid);   /* a draft keeps its files */
      }).catch(function (e) { toast(e.message, "bad"); }); }
      S.msg = { uid: uid, loading: true, head: m }; S.thread = []; S.view = "read";
      if (!fromPop) push({ v: "read", uid: uid });
      if (m && !m.seen) { m.seen = true; S.unseen = Math.max(0, S.unseen - 1); badge(); }
      paint(); window.scrollTo(0, 0);
      get({ a: "read", box: S.box, uid: uid }).then(function (r) { if (!S.msg || S.msg.uid !== uid) return; S.msg = r; paintRead(); paintList();
        get({ a: "thread", box: S.box, uid: uid }).then(function (t) { if (!S.msg || S.msg.uid !== uid) return; S.thread = (t.items || []).filter(function (x) { return !(x.uid === uid && x.box === r.box); }); paintRead(); }).catch(function () {}); })
        .catch(function (e) { S.msg = { uid: uid, error: e.message }; paintRead(); });
    }
    function addrs(list) { return (list || []).map(function (a) { return a.name ? a.name + " <" + a.email + ">" : a.email; }).join(", "); }
    function trusted(email) { var t = mailData().trust || ls("trust") || {}; return !!t[String(email || "").toLowerCase()]; }
    function paintRead() {
      var m = S.msg;
      if (!m) { EL.read.innerHTML = '<div class="am-pick">' + ICON.mail + '<span>Pick a message to read it.</span></div>'; return; }
      var top = '<div class="am-rbar"><button type="button" class="am-ib am-rback" data-x="back" aria-label="Back to ' + esc(S.boxName) + '">' + ICON.back + '</button><span class="am-sp"></span>' +
        '<button type="button" class="am-ib" data-x="r-arch" aria-label="Archive">' + ICON.arch + '</button><button type="button" class="am-ib" data-x="r-trash" aria-label="Delete">' + ICON.trash + '</button>' +
        '<button type="button" class="am-ib" data-x="r-unread" aria-label="Mark unread">' + ICON.unread + '</button><button type="button" class="am-ib" data-x="r-more" aria-label="More">' + ICON.more + '</button></div>';
      if (m.error) { EL.read.innerHTML = top + '<div class="am-empty bad"><b>' + esc(m.error) + '</b></div>'; return; }
      if (m.loading) { var h = m.head || {}; EL.read.innerHTML = top + '<div class="am-rhead"><h1>' + esc(h.subject || "") + '</h1></div><div class="am-loadbody"><span class="am-spin"></span></div>'; return; }
      var f = (m.fromList && m.fromList[0]) || {}, link = (mailData().links || {})[m.uid + "@" + m.box];
      var thread = S.thread.length ? '<div class="am-thread"><div class="am-tlab">' + (S.thread.length + 1) + ' in this conversation</div>' + S.thread.map(function (t) {
        return '<button type="button" class="am-tmsg" data-tuid="' + t.uid + '" data-tbox="' + esc(t.box) + '">' + avatar(t.from, t.from) + '<span><b>' + esc(t.sent ? "You" : t.from) + '</b><time>' + esc(when(t.date)) + '</time><em>' + esc(t.snippet) + '</em></span></button>'; }).join("") + '</div>' : "";
      var to = addrs(m.to), cc = addrs(m.cc);
      var att = m.attachments && m.attachments.length ? '<div class="am-atts">' + m.attachments.map(function (a) {
        return '<button type="button" class="am-att" data-ai="' + a.i + '"><span class="am-ext">' + esc((a.filename.split(".").pop() || "file").slice(0, 4).toUpperCase()) + '</span><span><b>' + esc(a.filename) + '</b><em>' + esc(size(a.size || 0)) + ' · tap to open</em></span></button>'; }).join("") + '</div>' : "";
      var hasImg = /<img\b[^>]*src=["']?https?:/i.test(m.html || ""), showImg = trusted(f.email) || m._imgs;
      EL.read.innerHTML = top + '<article class="am-art">' + thread +
        '<div class="am-rhead"><h1>' + esc(m.subject) + (m.flagged ? ' <i class="am-st">' + ICON.star + '</i>' : "") + '</h1>' + (link ? '<button type="button" class="am-pj" data-x="r-file">' + ICON.pin + esc(link.name) + '</button>' : "") +
        '<div class="am-from">' + avatar(f.name, f.email, true) + '<div><b>' + esc(f.name || f.email) + '</b><span>' + esc(f.name ? f.email : "") + '</span><details class="am-to"><summary>to ' + esc((m.to[0] || {}).name || (m.to[0] || {}).email || "you") + (m.to.length + m.cc.length > 1 ? " and " + (m.to.length + m.cc.length - 1) + " more" : "") + '</summary><p>To: ' + esc(to) + (cc ? '<br>Cc: ' + esc(cc) : "") + '<br>' + esc(when(m.date, true)) + '</p></details></div><time>' + esc(when(m.date)) + '</time></div></div>' +
        (hasImg && !showImg ? '<div class="am-imgbar"><span>Pictures are held back so senders can\'t tell you opened this.</span><button type="button" class="am-btn am-sm" data-x="imgs">Show pictures</button><button type="button" class="am-btn am-sm am-quiet" data-x="imgs-always">Always for this sender</button></div>' : "") +
        (m.html ? '<iframe class="am-frame" id="amFrame" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" title="The message"></iframe>' : '<div class="am-text">' + textHTML(m.text) + '</div>') + att +
        '<div class="am-acts"><button type="button" class="am-btn" data-x="reply">' + ICON.reply + 'Reply</button>' + (m.to.length + m.cc.length > 1 ? '<button type="button" class="am-btn" data-x="replyall">' + ICON.all + 'Reply all</button>' : "") + '<button type="button" class="am-btn" data-x="forward">' + ICON.fwd + 'Forward</button></div></article>';
      if (m.html) frame(m.html, showImg);
      Array.prototype.forEach.call(EL.read.querySelectorAll(".am-text .am-qt"), function (q) { q.onclick = function () { q.classList.toggle("open"); }; });
    }
    function textHTML(t) {
      var lines = String(t || "").replace(/\r/g, "").split("\n"), out = [], quote = [];
      function flush() { if (quote.length) { out.push('<div class="am-qt"><span>•••</span><div>' + quote.join("<br>") + "</div></div>"); quote = []; } }
      lines.forEach(function (l) { if (/^\s*>/.test(l) || /^On .{4,160}wrote:\s*$/.test(l.trim())) quote.push(link(esc(l))); else { flush(); out.push(link(esc(l))); } });
      flush(); return out.join("<br>").replace(/(<br>){3,}/g, "<br><br>");
    }
    function link(s) { return s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/([\w.+-]+@[\w-]+\.[\w.-]+)/g, '<a href="mailto:$1">$1</a>'); }
    function frame(html, showImg) {
      var f = EL.read.querySelector("#amFrame"); if (!f) return;
      var body = showImg ? html : html.replace(/(<img\b[^>]*?)\ssrc=(["']?)(https?:)/gi, "$1 data-held=$2$3").replace(/url\((["']?)https?:[^)]*\)/gi, "none");
      f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>' +
        'html,body{margin:0;padding:0;background:#fff;color:#1e1b18;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow-wrap:anywhere;word-break:break-word}' +
        'body{padding:2px 2px 8px}img{max-width:100%!important;height:auto!important}img[data-held]{display:inline-block;min-width:24px;min-height:24px;background:#f1ece4;border-radius:6px}' +
        'table{max-width:100%!important}td,th{word-break:break-word}pre{white-space:pre-wrap}a{color:#2459c8}blockquote{margin:8px 0;padding-left:10px;border-left:3px solid #ddd;color:#555}</style></head><body>' + body + '</body></html>';
      f.onload = function () {
        try {
          var d = f.contentDocument, w = d.documentElement, sw = Math.max(w.scrollWidth, d.body.scrollWidth), cw = f.clientWidth;
          if (sw > cw + 4) { var z = cw / sw; d.body.style.zoom = z; }   /* a newsletter wider than the phone is shrunk to fit, never cut off */
          f.style.height = Math.min(Math.max(120, d.body.scrollHeight * (parseFloat(d.body.style.zoom) || 1) + 16), 60000) + "px";
          setTimeout(function () { f.style.height = Math.max(120, d.body.scrollHeight * (parseFloat(d.body.style.zoom) || 1) + 16) + "px"; }, 600);
        } catch (e) { f.style.height = "70vh"; }
      };
    }

    /* ---------------- actions ---------------- */
    function act(op, uids, toPath, fromBox) {
      /* fromBox: a message opened from another folder (a conversation reaches into Sent) is acted on in ITS folder */
      var other = fromBox && fromBox !== S.boxPath, box = other ? fromBox : S.box;
      var ms = other ? [] : uids.map(byUid).filter(Boolean), body;
      if (op === "read" || op === "unread") { body = { a: "flag", box: box, uids: uids, seen: op === "read" }; ms.forEach(function (m) { if (m.seen !== (op === "read")) { S.unseen += op === "read" ? -1 : 1; m.seen = op === "read"; } }); }
      else if (op === "star" || op === "unstar") { body = { a: "flag", box: box, uids: uids, flagged: op === "star" }; ms.forEach(function (m) { m.flagged = op === "star"; }); }
      else { var to = op === "move" ? toPath : op; body = { a: "move", box: box, uids: uids, to: to };
        if (!other) S.list = S.list.filter(function (m) { return uids.indexOf(m.uid) < 0; }); S.total = Math.max(0, S.total - uids.length); S.offset = S.list.length;
        ms.forEach(function (m) { if (!m.seen) S.unseen = Math.max(0, S.unseen - 1); }); }
      S.sel = {}; S.selecting = false; paintList(); badge();
      var label = { archive: "Archived", trash: "Moved to Trash", junk: "Moved to Junk", move: "Moved", read: "Marked read", unread: "Marked unread", star: "Starred", unstar: "Unstarred", inbox: "Back in the Inbox" }[op] || "Done";
      return post(body).then(function () {
        toast((uids.length > 1 ? uids.length + " " : "") + label, "ok");
      }).catch(function (e) { toast(e.message, "bad"); load(true); });
    }
    function bulk(op) {
      var uids = Object.keys(S.sel).map(Number); if (!uids.length) return;
      if (op === "move") return moveSheet(uids);
      if (op === "star") { var all = uids.every(function (u) { var m = byUid(u); return m && m.flagged; }); return act(all ? "unstar" : "star", uids); }
      act(op, uids);
    }

    /* ---------------- sheets (folders, move, more, settings, file to project) ---------------- */
    function openSheet(html, wire, label) { EL.sheet.innerHTML = '<div class="am-grab"></div>' + html; EL.sb.classList.add("on"); EL.sheet.setAttribute("aria-label", label || "Options"); push({ v: "sheet" }); if (wire) wire(EL.sheet); }
    function closeSheet(fromPop) { if (!EL.sb.classList.contains("on")) return; EL.sb.classList.remove("on"); if (!fromPop) history.back(); }
    function sheetDone(fn) { EL.sb.classList.remove("on"); history.back(); if (fn) setTimeout(fn, 160); }
    function folderIcon(f) { return { inbox: ICON.mail, sent: ICON.fwd, drafts: ICON.pen, archive: ICON.arch, junk: ICON.x, trash: ICON.trash }[f.use] || ICON.folder; }
    function foldersSheet() {
      openSheet('<h3>Folders</h3><div class="am-flist">' + S.folders.map(function (f) {
        var on = f.use === S.box || f.path === S.box;
        return '<button type="button" class="am-fold' + (on ? " on" : "") + '" data-f="' + esc(f.use || f.path) + '" data-fn="' + esc(folderLabel(f)) + '">' + folderIcon(f) + '<span>' + esc(folderLabel(f)) + '</span>' + (f.unseen ? '<i>' + f.unseen + '</i>' : f.total ? '<em>' + f.total + '</em>' : "") +
          (!f.use && !f.total ? '<span class="am-fdel" data-del="' + esc(f.path) + '" role="button" aria-label="Remove this empty folder">' + ICON.x + '</span>' : "") + '</button>'; }).join("") + '</div>' +
        '<div class="am-two"><input id="amNF" placeholder="New folder name" maxlength="60"><button type="button" class="am-btn" id="amNFgo">Make it</button></div>', function (s) {
        Array.prototype.forEach.call(s.querySelectorAll(".am-fold"), function (b) { b.onclick = function (e) {
          var del = e.target.closest("[data-del]");
          if (del) { e.stopPropagation(); post({ a: "deleteFolder", path: del.getAttribute("data-del") }).then(function () { toast("Folder removed", "ok"); S.folders = S.folders.filter(function (f) { return f.path !== del.getAttribute("data-del"); }); sheetDone(foldersSheet); }).catch(function (er) { toast(er.message, "bad"); }); return; }
          S.box = b.getAttribute("data-f"); S.boxName = b.getAttribute("data-fn"); S.q = ""; S.unread = false; S.msg = null; sheetDone(function () { load(true); }); }; });
        s.querySelector("#amNFgo").onclick = function () { var n = s.querySelector("#amNF").value.trim(); if (!n) return; post({ a: "newFolder", name: n }).then(function (r) { S.folders.push({ path: r.folder, name: r.folder, use: "", unseen: 0, total: 0 }); toast("Made " + r.folder, "ok"); sheetDone(foldersSheet); }).catch(function (er) { toast(er.message, "bad"); }); };
      }, "Folders");
    }
    function moveSheet(uids, fromBox) {
      openSheet('<h3>Move ' + (uids.length > 1 ? uids.length + " messages" : "it") + ' to</h3><div class="am-flist">' + S.folders.filter(function (f) { return !(f.use === S.box || f.path === S.box) && f.use !== "drafts"; }).map(function (f) {
        return '<button type="button" class="am-fold" data-to="' + esc(f.use || f.path) + '">' + folderIcon(f) + '<span>' + esc(folderLabel(f)) + '</span></button>'; }).join("") + '</div>', function (s) {
        Array.prototype.forEach.call(s.querySelectorAll("[data-to]"), function (b) { b.onclick = function () { var to = b.getAttribute("data-to"); sheetDone(function () { if (S.view === "read") { back(); setTimeout(function () { act("move", uids, to, fromBox); }, 80); } else act("move", uids, to); }); }; });
      }, "Move");
    }
    function moreSheet() {
      var m = S.msg || {}; var f = (m.fromList && m.fromList[0]) || {};
      openSheet('<h3>' + esc(m.subject || "") + '</h3><div class="am-flist">' +
        '<button type="button" class="am-fold" data-m="star">' + ICON.star + '<span>' + (m.flagged ? "Unstar" : "Star") + '</span></button>' +
        '<button type="button" class="am-fold" data-m="move">' + ICON.folder + '<span>Move to a folder</span></button>' +
        '<button type="button" class="am-fold" data-m="junk">' + ICON.x + '<span>Junk</span></button>' +
        '<button type="button" class="am-fold" data-m="file">' + ICON.pin + '<span>File to a project</span></button>' +
        (f.email ? '<button type="button" class="am-fold" data-m="contact">' + ICON.person + '<span>Add ' + esc(f.name || f.email) + ' to contacts</span></button>' : "") +
        '<button type="button" class="am-fold" data-m="print">' + ICON.print + '<span>Print</span></button></div>', function (s) {
        Array.prototype.forEach.call(s.querySelectorAll("[data-m]"), function (b) { b.onclick = function () {
          var k = b.getAttribute("data-m");
          if (k === "star") sheetDone(function () { act(m.flagged ? "unstar" : "star", [m.uid], null, m.box); m.flagged = !m.flagged; paintRead(); });
          if (k === "move") sheetDone(function () { moveSheet([m.uid], m.box); });
          if (k === "junk") sheetDone(function () { back(); setTimeout(function () { act("junk", [m.uid], null, m.box); }, 80); });
          if (k === "file") sheetDone(fileSheet);
          if (k === "contact") sheetDone(function () { addContact(f); });
          if (k === "print") sheetDone(printMsg);
        }; });
      }, "More");
    }
    function fileSheet() {
      var m = S.msg || {}, projects = (book().commissions || []);
      openSheet('<h3>File to a project</h3>' + (projects.length ? '<div class="am-flist">' + projects.map(function (p) {
        return '<button type="button" class="am-fold" data-p="' + esc(p.id) + '" data-pn="' + esc(p.name) + '">' + ICON.pin + '<span>' + esc(p.name) + (p.number ? ' <em>' + esc(p.number) + '</em>' : "") + '</span></button>'; }).join("") + '</div>'
        : '<p class="am-fine">No projects yet. Add them in Commissions (or the setup helper), then file mail to them.</p>'), function (s) {
        Array.prototype.forEach.call(s.querySelectorAll("[data-p]"), function (b) { b.onclick = function () {
          var key = m.uid + "@" + m.box, f = (m.fromList && m.fromList[0]) || {};
          saveMail(function (x) { x.links = x.links || {}; x.links[key] = { p: b.getAttribute("data-p"), name: b.getAttribute("data-pn"), subject: m.subject, from: f.name || f.email, date: m.date, messageId: m.messageId }; });
          sheetDone(function () { toast("Filed to " + b.getAttribute("data-pn"), "ok"); paintRead(); paintList(); });
        }; });
      }, "File to a project");
    }
    function addContact(f) {
      var b = book(), list = b.contacts || [], e = String(f.email || "").toLowerCase();
      if (list.some(function (c) { return String(c.e || "").toLowerCase() === e; })) return toast((f.name || f.email) + " is already in your contacts", "ok");
      saveBook(function (x) { x.contacts = (x.contacts || []).concat([{ n: f.name || f.email, e: f.email, v: "", c: "", st: "", p: "", w: "", f: "", note: "Added from Mail " + new Date().toLocaleDateString(), k: "Business" }]); });
      toast("Added " + (f.name || f.email) + " to contacts", "ok");
    }
    function printMsg() {
      var m = S.msg, w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups to print", "bad");
      w.document.write('<title>' + esc(m.subject) + '</title><body style="font:15px/1.5 -apple-system,sans-serif;max-width:720px;margin:24px auto;padding:0 16px"><h2>' + esc(m.subject) + '</h2><p style="color:#555">From: ' + esc(m.from) + '<br>To: ' + esc(addrs(m.to)) + '<br>' + esc(when(m.date, true)) + '</p><hr>' + (m.html || '<pre style="white-space:pre-wrap;font:inherit">' + esc(m.text) + '</pre>') + '</body>');
      w.document.close(); setTimeout(function () { w.print(); }, 400);
    }
    function settingsSheet() {
      var d = mailData(), a = S.acct || {};
      openSheet('<h3>Mail settings</h3><p class="am-fine">Connected: <b>' + esc(a.email || "") + '</b></p>' +
        '<label class="am-lab">Name on your mail<input id="amSName" value="' + esc(a.name || "") + '"></label>' +
        '<label class="am-lab">Signature (added to everything you write)<textarea id="amSSig" rows="4" placeholder="Kate Larkin, AIA&#10;Larkspur Architecture · (208) 555-0100">' + esc(d.sig || "") + '</textarea></label>' +
        '<button type="button" class="am-btn am-pri am-wide" id="amSSave">Save</button>' +
        '<button type="button" class="am-btn am-quiet am-wide danger" id="amSOff">Disconnect this mailbox</button>' +
        '<p class="am-fine am-keys">Keys on a laptop: C write · / search · E archive · # delete · R reply · A reply all · F forward · U unread · S star · J and K next and previous · Esc back.</p>', function (s) {
        s.querySelector("#amSSave").onclick = function () { var nm = s.querySelector("#amSName").value.trim(), sig = s.querySelector("#amSSig").value;
          saveMail(function (x) { x.sig = sig; }); post({ a: "setName", name: nm }).then(function () { S.acct.name = nm; }).catch(function () {}); sheetDone(function () { toast("Saved", "ok"); }); };
        s.querySelector("#amSOff").onclick = function () { if (!confirmTwice(this, "Tap again to disconnect")) return; post({ a: "disconnect" }).then(function () { sheetDone(function () { S.view = "connect"; S.list = []; S.folders = []; paint(); }); }); };
      }, "Mail settings");
    }
    function confirmTwice(btn, msg) { if (btn._armed) return true; btn._armed = 1; var t = btn.textContent; btn.textContent = msg; setTimeout(function () { btn._armed = 0; btn.textContent = t; }, 3500); return false; }

    /* ---------------- compose ---------------- */
    var compose = { open: false, f: null, files: [], timer: null };
    function contacts() {
      var seen = {}, out = [];
      (book().contacts || []).forEach(function (c) { if (c.e && !seen[c.e.toLowerCase()]) { seen[c.e.toLowerCase()] = 1; out.push({ n: c.n || "", e: c.e }); } });
      (book().consultants || []).forEach(function (c) { if (c.email && !seen[c.email.toLowerCase()]) { seen[c.email.toLowerCase()] = 1; out.push({ n: c.contact || c.name, e: c.email }); } });
      S.list.forEach(function (m) { if (m.fromEmail && !seen[m.fromEmail.toLowerCase()]) { seen[m.fromEmail.toLowerCase()] = 1; out.push({ n: m.from, e: m.fromEmail }); } });
      return out;
    }
    function quoteOf(m) { var f = (m.fromList && m.fromList[0]) || {}; return "\n\nOn " + when(m.date, true) + ", " + (f.name || f.email) + " wrote:\n" + String(m.text || "").split("\n").map(function (l) { return "> " + l; }).join("\n"); }
    function openCompose(o) {
      o = o || {}; var d = mailData(), sig = d.sig ? "\n\n" + d.sig : "";
      var draft = ls("draft");
      if (!o.fresh && !o.to && !o.subject && !o.text && !o.draftUid && draft && (draft.to || draft.text)) o = draft;
      compose.f = { to: o.to || "", cc: o.cc || "", bcc: o.bcc || "", subject: o.subject || "", text: o.text != null ? o.text : sig, inReplyTo: o.inReplyTo || "", references: o.references || "", draftUid: o.draftUid || null, replyUid: o.replyUid || null, replyBox: o.replyBox || "", kind: o.kind || "new", showCc: !!(o.cc || o.bcc) };
      compose.files = o.files || [];
      compose.open = true; push({ v: "compose" });
      EL.comp.innerHTML = '<div class="am-cbar"><button type="button" class="am-ib" data-c="close" aria-label="Close and keep a draft">' + ICON.back + '</button><b>' + esc({ new: "New message", reply: "Reply", replyall: "Reply all", forward: "Forward" }[compose.f.kind] || "Message") + '</b><span class="am-sp"></span>' +
        '<button type="button" class="am-ib" data-c="attach" aria-label="Attach a file">' + ICON.clip + '</button><button type="button" class="am-btn am-pri am-send" data-c="send">Send</button></div>' +
        '<div class="am-cform"><div class="am-cf"><label>To</label><input id="amTo" autocomplete="off" inputmode="email" value="' + esc(compose.f.to) + '"><button type="button" class="am-ccbtn" data-c="cc">' + (compose.f.showCc ? "" : "Cc Bcc") + '</button></div><div class="am-sug" id="amSug"></div>' +
        '<div class="am-cf cc"' + (compose.f.showCc ? "" : " hidden") + '><label>Cc</label><input id="amCc" autocomplete="off" inputmode="email" value="' + esc(compose.f.cc) + '"></div>' +
        '<div class="am-cf cc"' + (compose.f.showCc ? "" : " hidden") + '><label>Bcc</label><input id="amBcc" autocomplete="off" inputmode="email" value="' + esc(compose.f.bcc) + '"></div>' +
        '<div class="am-cf"><label>Subject</label><input id="amSubj" value="' + esc(compose.f.subject) + '"></div>' +
        '<div class="am-cfiles" id="amFiles"></div><textarea id="amBody" placeholder="Write here">' + esc(compose.f.text) + '</textarea>' +
        '<input type="file" id="amFileIn" multiple hidden></div>';
      EL.comp.classList.add("on"); document.documentElement.classList.add("am-lock");
      paintFiles();
      var to = EL.comp.querySelector("#amTo"), body = EL.comp.querySelector("#amBody");
      autoGrow(body); body.addEventListener("input", function () { autoGrow(body); keepDraft(); });
      ["#amTo", "#amCc", "#amBcc", "#amSubj"].forEach(function (s) { var i = EL.comp.querySelector(s); if (i) i.addEventListener("input", keepDraft); });
      [to, EL.comp.querySelector("#amCc"), EL.comp.querySelector("#amBcc")].forEach(function (inp) { if (inp) { inp.addEventListener("input", function () { suggest(inp); }); inp.addEventListener("focus", function () { suggest(inp); }); } });
      EL.comp.querySelector("#amFileIn").onchange = function (e) { addFiles(e.target.files); e.target.value = ""; };
      setTimeout(function () { (compose.f.to ? (compose.f.kind === "new" ? EL.comp.querySelector("#amSubj") : body) : to).focus(); if (compose.f.kind !== "new" && compose.f.kind !== "forward") { body.setSelectionRange(0, 0); body.scrollTop = 0; } }, 220);
    }
    function autoGrow(t) { t.style.height = "auto"; t.style.height = Math.max(220, t.scrollHeight + 4) + "px"; }
    function fields() { var g = function (s) { var i = EL.comp.querySelector(s); return i ? i.value : ""; }; return Object.assign({}, compose.f, { to: g("#amTo"), cc: g("#amCc"), bcc: g("#amBcc"), subject: g("#amSubj"), text: g("#amBody") }); }
    function keepDraft() { clearTimeout(compose.timer); compose.timer = setTimeout(function () { var f = fields(); ls("draft", { to: f.to, cc: f.cc, bcc: f.bcc, subject: f.subject, text: f.text }); }, 400); }
    function suggest(inp) {
      var box = EL.comp.querySelector("#amSug"), parts = inp.value.split(","), cur = parts[parts.length - 1].trim().toLowerCase();
      if (cur.length < 1) { box.innerHTML = ""; return; }
      var hits = contacts().filter(function (c) { return (c.n + " " + c.e).toLowerCase().indexOf(cur) >= 0; }).slice(0, 6);
      box.innerHTML = hits.map(function (c, i) { return '<button type="button" data-s="' + i + '">' + avatar(c.n, c.e) + '<span><b>' + esc(c.n || c.e) + '</b><em>' + esc(c.e) + '</em></span></button>'; }).join("");
      Array.prototype.forEach.call(box.querySelectorAll("[data-s]"), function (b) { b.onmousedown = b.ontouchstart = function (e) { e.preventDefault(); var c = hits[Number(b.getAttribute("data-s"))]; parts[parts.length - 1] = (parts.length > 1 ? " " : "") + (c.n ? c.n.replace(/[,<>"]/g, "") + " <" + c.e + ">" : c.e); inp.value = parts.join(",") + ", "; box.innerHTML = ""; inp.focus(); keepDraft(); }; });
    }
    function addFiles(list) {
      var total = compose.files.reduce(function (a, f) { return a + f.size; }, 0);
      Array.prototype.forEach.call(list, function (file) {
        if (total + file.size > 3.4 * 1048576) { toast(file.name + " is too big. Files can add up to about 3 MB per message.", "bad"); return; }
        total += file.size; var r = new FileReader(), rec = { filename: file.name, size: file.size, contentType: file.type, content: null };
        compose.files.push(rec); paintFiles();
        r.onload = function () { rec.content = String(r.result).split(",")[1] || ""; paintFiles(); }; r.readAsDataURL(file);
      });
    }
    function paintFiles() {
      var box = EL.comp.querySelector("#amFiles"); if (!box) return;
      box.innerHTML = compose.files.map(function (f, i) { return '<span class="am-chipf">' + ICON.clip + esc(f.filename) + ' <em>' + esc(size(f.size || 0)) + (f.content === null ? " · reading…" : "") + '</em><button type="button" data-rm="' + i + '" aria-label="Remove">' + ICON.x + '</button></span>'; }).join("");
      Array.prototype.forEach.call(box.querySelectorAll("[data-rm]"), function (b) { b.onclick = function () { compose.files.splice(Number(b.getAttribute("data-rm")), 1); paintFiles(); }; });
    }
    function closeCompose(fromPop) {
      if (!compose.open) return;
      var f = fields(); compose.open = false; EL.comp.classList.remove("on"); document.documentElement.classList.remove("am-lock");
      var sig = (mailData().sig || "").trim(), hasWords = (f.to || f.subject || String(f.text || "").replace(sig, "").trim());
      if (hasWords && !compose.sent) {
        post(Object.assign({ a: "draft", uid: f.draftUid || undefined, attachments: compose.files.filter(function (x) { return x.content; }) }, pick(f))).then(function () { toast("Saved to Drafts", "ok"); ls("draft", null); }).catch(function () { toast("Kept on this phone. It will be here next time you write.", "warn"); });
      } else ls("draft", null);
      compose.sent = false;
      if (!fromPop) history.back();
    }
    function pick(f) { return { to: f.to, cc: f.cc, bcc: f.bcc, subject: f.subject, text: f.text, html: toHtml(f.text), inReplyTo: f.inReplyTo, references: f.references }; }
    function toHtml(t) {
      var parts = String(t || "").split(/\n(?=On .{4,160}wrote:\n)/);
      var main = esc(parts[0]).replace(/\n/g, "<br>"), q = parts[1] ? esc(parts[1]).replace(/^&gt; ?/gm, "").replace(/\n/g, "<br>") : "";
      return '<div style="font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1e1b18">' + main + (q ? '<blockquote style="margin:12px 0 0;padding-left:12px;border-left:3px solid #ccc;color:#555">' + q + "</blockquote>" : "") + "</div>";
    }
    function sendNow() {
      var f = fields();
      if (!f.to.trim() && !f.cc.trim() && !f.bcc.trim()) return toast("Add who it goes to", "bad");
      if (compose.files.some(function (x) { return x.content === null; })) return toast("Still reading a file. One second.", "warn");
      if (!f.subject.trim() && !compose._nosubj) { compose._nosubj = 1; return toast("No subject. Tap Send again to send it anyway.", "warn"); }
      var files = compose.files.slice(), snapshot = Object.assign({}, f, { files: files });
      compose.sent = true; ls("draft", null); closeCompose(); compose._nosubj = 0;
      var undone = false, t = setTimeout(go, 5000);
      toast("Sending…", "", { label: "Undo", ms: 5000, fn: function () { undone = true; clearTimeout(t); setTimeout(function () { openCompose(Object.assign({}, snapshot, { files: files })); }, 120); } });
      function go() {
        if (undone) return;
        post(Object.assign({ a: "send", draftUid: f.draftUid || undefined, replyUid: f.replyUid || undefined, replyBox: f.replyBox || undefined, attachments: files }, pick(f)))
          .then(function () { toast("Sent", "ok"); if (S.box === "sent" || S.box === "drafts") load(true); })
          .catch(function (e) { toast("Not sent: " + e.message, "bad", { label: "Open it", fn: function () { openCompose(snapshot); } }); });
      }
    }
    function replyTo(kind) {
      var m = S.msg; if (!m || m.loading) return;
      var me = String((S.acct || {}).email || "").toLowerCase(), from = (m.replyTo && m.replyTo.length ? m.replyTo : m.fromList) || [];
      var fmt = function (a) { return a.name ? a.name.replace(/[,<>"]/g, "") + " <" + a.email + ">" : a.email; };
      var to = from.map(fmt), cc = [];
      if (kind === "replyall") { m.to.concat(m.cc).forEach(function (a) { if (String(a.email).toLowerCase() !== me && !from.some(function (x) { return x.email === a.email; })) cc.push(fmt(a)); }); }
      var sig = mailData().sig ? "\n\n" + mailData().sig : "";
      if (kind === "forward") {
        var files = [];
        var o = { kind: "forward", subject: /^fwd?:/i.test(m.subject) ? m.subject : "Fwd: " + m.subject, text: sig + "\n\n---------- Forwarded message ----------\nFrom: " + m.from + "\nDate: " + when(m.date, true) + "\nSubject: " + m.subject + "\nTo: " + addrs(m.to) + "\n\n" + (m.text || ""), files: files };
        openCompose(o); bringFiles(m, m.uid);   /* forwarding brings the files along */
        return;
      }
      openCompose({ kind: kind, to: to.join(", "), cc: cc.join(", "), subject: /^re:/i.test(m.subject) ? m.subject : "Re: " + m.subject, text: sig + quoteOf(m), inReplyTo: m.messageId, references: m.references, replyUid: m.uid, replyBox: m.box });
    }
    function bringFiles(m, uid) {
      (m.attachments || []).forEach(function (a) {
        if ((a.size || 0) > 3 * 1048576) return toast(a.filename + " is too big to carry along", "warn");
        var rec = { filename: a.filename, size: a.size || 0, contentType: a.type, content: null }; compose.files.push(rec); paintFiles();
        fetch(API + "?" + qs({ app: OS, code: CODE, a: "attachment", box: m.box || S.box, uid: uid, i: a.i }), { credentials: "same-origin" }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
          var rd = new FileReader(); rd.onload = function () { rec.content = String(rd.result).split(",")[1] || ""; paintFiles(); }; rd.readAsDataURL(b); })
          .catch(function () { compose.files.splice(compose.files.indexOf(rec), 1); paintFiles(); toast("Could not bring " + a.filename + " along", "warn"); });
      });
    }
    function openAttachment(i) {
      var m = S.msg, a = (m.attachments || [])[i]; if (!a) return;
      var w = window.open("", "_blank");
      fetch(API + "?" + qs({ app: OS, code: CODE, a: "attachment", box: S.box, uid: m.uid, i: a.i }), { credentials: "same-origin" }).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (b) { var u = URL.createObjectURL(b); if (w) w.location = u; else { var l = document.createElement("a"); l.href = u; l.download = a.filename; l.click(); } })
        .catch(function () { if (w) w.close(); toast("That file would not open", "bad"); });
    }

    /* ---------------- clicks & keys ---------------- */
    function onClick(e) {
      var b = e.target.closest("[data-x],[data-c],[data-ai],[data-tuid]"); if (!b || !(EL.am.contains(b) || EL.comp.contains(b) || EL.sb.contains(b))) return;
      var x = b.getAttribute("data-x"), c = b.getAttribute("data-c");
      if (b.hasAttribute("data-ai")) return openAttachment(Number(b.getAttribute("data-ai")));
      if (b.hasAttribute("data-tuid")) { var tb = b.getAttribute("data-tbox"), tu = Number(b.getAttribute("data-tuid"));
        var keep = S.box; S.box = tb === S.boxPath ? S.box : tb; get({ a: "read", box: S.box, uid: tu }).then(function (r) { S.msg = r; paintRead(); window.scrollTo(0, 0); }).catch(function (er) { toast(er.message, "bad"); }).then(function () { S.box = keep; }); return; }
      if (c === "close") return closeCompose();
      if (c === "send") return sendNow();
      if (c === "attach") return EL.comp.querySelector("#amFileIn").click();
      if (c === "cc") { compose.f.showCc = true; Array.prototype.forEach.call(EL.comp.querySelectorAll(".am-cf.cc"), function (r) { r.hidden = false; }); b.textContent = ""; EL.comp.querySelector("#amCc").focus(); return; }
      if (x === "back") return back();
      if (x === "folders") return foldersSheet();
      if (x === "settings") return settingsSheet();
      if (x === "refresh") { if (S.err) { S.err = ""; return start(); } return refresh(); }
      if (x === "clearq") { S.q = ""; return load(true); }
      if (x === "all") { S.unread = false; return load(true); }
      if (x === "unreadonly") { S.unread = true; return load(true); }
      if (x === "select") { S.selecting = true; return paintList(); }
      if (x === "unsel") { S.selecting = false; S.sel = {}; return paintList(); }
      if (x === "bulk") return bulk(b.getAttribute("data-op"));
      if (x === "older") return older();
      if (x === "compose") return openCompose({ fresh: false });
      if (x === "allread") return post({ a: "allRead", box: S.box }).then(function (r) { S.list.forEach(function (m) { m.seen = true; }); S.unseen = 0; paintList(); badge(); toast("Marked " + r.marked + " read", "ok"); }).catch(function (er) { toast(er.message, "bad"); });
      if (x === "empty") { if (!confirmTwice(b, "Tap again: gone for good")) return; return post({ a: "empty", box: S.box }).then(function (r) { S.list = []; S.total = 0; paintList(); toast("Emptied " + r.removed, "ok"); }).catch(function (er) { toast(er.message, "bad"); }); }
      var m = S.msg;
      if (x === "r-arch" && m) { back(); return setTimeout(function () { act("archive", [m.uid], null, m.box); }, 80); }
      if (x === "r-trash" && m) { back(); return setTimeout(function () { act("trash", [m.uid], null, m.box); }, 80); }
      if (x === "r-unread" && m) { back(); return setTimeout(function () { act("unread", [m.uid], null, m.box); }, 80); }
      if (x === "r-more") return moreSheet();
      if (x === "r-file") return fileSheet();
      if (x === "reply" || x === "replyall" || x === "forward") return replyTo(x);
      if (x === "imgs" || x === "imgs-always") { if (x === "imgs-always") { var f = (m.fromList && m.fromList[0]) || {}; var t = ls("trust") || {}; t[String(f.email).toLowerCase()] = 1; ls("trust", t); } m._imgs = true; return paintRead(); }
    }
    EL.am.addEventListener("click", onClick); EL.comp.addEventListener("click", onClick); EL.sb.addEventListener("click", onClick);
    document.addEventListener("keydown", function (e) {
      if (!document.body.contains(EL.am)) return;
      var tag = (e.target && e.target.tagName) || "";
      if (e.key === "Escape") { if (compose.open || EL.sb.classList.contains("on") || S.view === "read") { e.preventDefault(); back(); } return; }
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && compose.open) sendNow(); return; }
      var k = e.key, m = S.msg;
      if (k === "c") { e.preventDefault(); openCompose({}); }
      else if (k === "/") { var q = EL.list.querySelector("#amQ"); if (q) { e.preventDefault(); q.focus(); } }
      else if ((k === "j" || k === "k") && S.list.length) { var i = m ? S.list.findIndex(function (x) { return x.uid === m.uid; }) : -1; var n = S.list[Math.max(0, Math.min(S.list.length - 1, i + (k === "j" ? 1 : -1)))]; if (n) openMsg(n.uid, S.view === "read"); }
      else if (m && S.view === "read") {
        if (k === "e") { back(); setTimeout(function () { act("archive", [m.uid], null, m.box); }, 80); } else if (k === "#") { back(); setTimeout(function () { act("trash", [m.uid], null, m.box); }, 80); }
        else if (k === "r") replyTo("reply"); else if (k === "a") replyTo("replyall"); else if (k === "f") replyTo("forward");
        else if (k === "u") { back(); setTimeout(function () { act("unread", [m.uid], null, m.box); }, 80); } else if (k === "s") { act(m.flagged ? "unstar" : "star", [m.uid], null, m.box); m.flagged = !m.flagged; paintRead(); }
      }
    });
    /* new mail while you work: a quiet check every minute while the inbox is on screen */
    setInterval(function () { if (!document.hidden && S.view === "list" && !S.q && !S.selecting && !S.loading && S.acct) get({ a: "list", box: S.box, offset: 0, limit: 30, unread: S.unread ? "1" : "" }).then(function (j) {
      var fresh = j.messages.filter(function (m) { return !byUid(m.uid); }); if (!fresh.length) return; S.list = fresh.concat(S.list); S.unseen = j.unseen; S.offset = S.list.length; paintList(); badge(); toast(fresh.length + " new message" + (fresh.length > 1 ? "s" : ""), "ok"); }).catch(function () {}); }, 60000);

    css(); start();
  };

  function css() {
    if (document.getElementById("amCss")) return;
    var s = document.createElement("style"); s.id = "amCss";
    s.textContent = [
      ".ar.ar-k-mail{max-width:none}.ar-k-mail .ar-head{display:none}",
      ".am,.am-root{--c:var(--bs-card,#fffdf8);--p:var(--bs-paper,#f8f3ea);--i:var(--bs-ink,#1e1813);--i2:var(--bs-ink2,#54493f);--m:var(--bs-mut,#8a7d70);--l:var(--bs-rule,#e8dccb);--l2:var(--bs-rule2,#f1e8da);--r:var(--bs-red,#a8312a);--ok:var(--bs-ok,#3f7d4e);--bad:var(--bs-bad,#b4372a);--warn:var(--bs-warn,#b07a12);",
      "font-family:var(--bs-sans,Manrope,system-ui,sans-serif);color:var(--i)}.am{position:relative;margin:-6px -2px 0}",
      ".am *,.am-root *{box-sizing:border-box}.am svg,.am-root svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.am svg .f,.am-root svg .f{fill:currentColor;stroke:none}",
      ".am-panes{display:grid;grid-template-columns:minmax(320px,420px) 1fr;gap:0;background:var(--c);border:1px solid var(--l);border-radius:20px;overflow:hidden;min-height:calc(100vh - 210px)}",
      ".am-list{border-right:1px solid var(--l);min-width:0;display:flex;flex-direction:column;position:relative}.am-read{min-width:0;position:relative}",
      ".am-bar{display:flex;align-items:center;gap:4px;padding:12px 12px 6px;position:sticky;top:0;background:var(--c);z-index:3}.am-bar.sel{background:color-mix(in srgb,var(--r) 9%,var(--c));padding:10px 8px}",
      ".am-sp{flex:1}.am-ib{display:inline-grid;place-items:center;width:42px;height:42px;border-radius:12px;border:0;background:transparent;color:var(--i2);cursor:pointer;-webkit-tap-highlight-color:transparent}.am-ib:hover{background:var(--l2)}.am-ib:active{transform:scale(.92)}.am-ib.danger{color:var(--bad)}.am-ib.sm{width:32px;height:32px}.am-ib.sm svg{width:16px;height:16px}",
      ".am-boxbtn{display:flex;align-items:center;gap:8px;border:0;background:none;font:400 30px/1.05 var(--bs-serif,'Instrument Serif',Georgia,serif);color:var(--i);padding:2px 4px;cursor:pointer;min-width:0}.am-boxbtn span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".am-boxbtn i{font:800 12px/1 var(--bs-sans,Manrope,sans-serif);font-style:normal;background:var(--r);color:#fff;border-radius:99px;padding:4px 8px}.am-boxbtn .car{width:18px;height:18px;color:var(--m)}",
      ".am-search{display:flex;align-items:center;gap:8px;margin:4px 12px 8px;padding:0 6px 0 12px;background:var(--l2);border-radius:14px;color:var(--m)}.am-search svg{width:18px;height:18px}.am-search input{flex:1;min-width:0;border:0;background:transparent;font:16px/1 inherit;font-family:inherit;color:var(--i);padding:12px 0;outline:none}",
      ".am-chips{display:flex;gap:6px;padding:0 12px 10px;overflow-x:auto;scrollbar-width:none}.am-chips::-webkit-scrollbar{display:none}.am-chip{flex:0 0 auto;font:700 13px/1 inherit;font-family:inherit;border:1px solid var(--l);background:var(--c);color:var(--i2);padding:8px 12px;border-radius:99px;cursor:pointer}.am-chip.on{background:var(--i);color:var(--c);border-color:var(--i)}.am-chip.warn{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 40%,var(--l))}",
      ".am-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;max-height:calc(100vh - 330px);padding-bottom:90px}",
      ".am-row{position:relative;overflow:hidden;border-top:1px solid var(--l2);cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}",
      ".am-rowin{position:relative;z-index:1;display:flex;gap:12px;padding:13px 14px 13px 12px;background:var(--c);transition:transform .25s var(--bs-ease,ease)}.am-row:hover .am-rowin{background:color-mix(in srgb,var(--l2) 60%,var(--c))}.am-row.on .am-rowin{background:color-mix(in srgb,var(--r) 7%,var(--c))}.am-row.picked .am-rowin{background:color-mix(in srgb,var(--r) 12%,var(--c))}",
      ".am-swipe{position:absolute;inset:0;display:flex;align-items:center;gap:8px;padding:0 22px;font-weight:800;font-size:14px;color:#fff}.am-swipe.l{background:#3d6fd6;justify-content:flex-start}.am-swipe.r{background:var(--ok);justify-content:flex-end}.am-swipe svg{width:22px;height:22px}",
      ".am-row.goL .am-swipe.l,.am-row.goR .am-swipe.r{filter:brightness(1.12)}",
      ".am-av{flex:0 0 auto;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:hsl(var(--h,30) 45% 88%);color:hsl(var(--h,30) 45% 28%);font:800 15px/1 inherit;font-family:inherit;letter-spacing:.02em}.am-av.big{width:46px;height:46px;font-size:16px}",
      ".am-tick{flex:0 0 auto;width:42px;height:42px;border-radius:50%;border:2px solid var(--l);display:grid;place-items:center;color:#fff}.am-row.picked .am-tick{background:var(--r);border-color:var(--r)}",
      ".am-rt{flex:1;min-width:0}.am-r1{display:flex;align-items:baseline;gap:8px}.am-r1 b{flex:1;min-width:0;font-size:15.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-r1 time{flex:0 0 auto;font-size:12.5px;color:var(--m)}",
      ".am-r2{display:flex;align-items:center;gap:5px;font-size:14.5px;color:var(--i);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-r3{font-size:13.5px;color:var(--m);margin-top:3px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
      ".am-row.unread .am-r1 b{font-weight:800}.am-row.unread .am-r2{font-weight:700}.am-row.unread .am-r1 time{color:var(--r);font-weight:800}.am-row.unread .am-rowin::before{content:'';position:absolute;left:3px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:var(--r)}",
      ".am-r3 em{font-style:normal;font-weight:800;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--warn);margin-right:4px}.am-r3 em.pj{color:var(--r)}",
      ".am-st svg,.am-cl svg{width:15px;height:15px}.am-st{color:#d89a1a;display:inline-flex}.am-st svg{fill:currentColor}.am-cl{color:var(--m);display:inline-flex}.am-r2>*:not(i){overflow:hidden;text-overflow:ellipsis}",
      ".am-row.sk .am-av,.am-row.sk b,.am-row.sk .am-r2,.am-row.sk .am-r3{background:linear-gradient(90deg,var(--l2),var(--l),var(--l2));background-size:200% 100%;animation:amsh 1.2s infinite;border-radius:6px;color:transparent}.am-row.sk b{display:block;height:14px;width:45%}.am-row.sk .am-r2{height:13px;width:75%;margin-top:8px}.am-row.sk .am-r3{height:11px;width:90%;margin-top:8px}",
      "@keyframes amsh{to{background-position:-200% 0}}",
      ".am-more{display:block;width:calc(100% - 24px);margin:12px;padding:14px;border:1px dashed var(--l);border-radius:14px;background:none;font:700 14px/1 inherit;font-family:inherit;color:var(--i2);cursor:pointer}.am-end{text-align:center;font-size:12.5px;color:var(--m);padding:18px}",
      ".am-empty{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:56px 24px;color:var(--m)}.am-empty svg{width:44px;height:44px;stroke-width:1.4}.am-empty b{color:var(--i);font-size:16px}.am-empty.bad b{color:var(--bad)}",
      ".am-fab{position:absolute;right:16px;bottom:16px;z-index:4;display:flex;align-items:center;gap:8px;border:0;border-radius:18px;padding:15px 20px;background:var(--r);color:#fff;font:800 15px/1 inherit;font-family:inherit;box-shadow:0 10px 26px color-mix(in srgb,var(--r) 40%,transparent);cursor:pointer}.am-fab:active{transform:scale(.96)}",
      ".am-pick{height:100%;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--m)}.am-pick svg{width:48px;height:48px;stroke-width:1.3}",
      ".am-rbar{display:flex;align-items:center;gap:2px;padding:10px 10px 4px;position:sticky;top:0;background:var(--c);z-index:3;border-bottom:1px solid var(--l2)}.am-rback{display:none}",
      ".am-art{padding:6px 18px 28px}.am-rhead h1{font:400 28px/1.15 var(--bs-serif,'Instrument Serif',Georgia,serif);margin:12px 0 10px;overflow-wrap:anywhere}.am-rhead h1 .am-st svg{width:20px;height:20px}",
      ".am-from{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}.am-from>div{flex:1;min-width:0}.am-from>div>b{display:block;font-size:15.5px}.am-from>div>span{display:block;font-size:13px;color:var(--m);overflow-wrap:anywhere}.am-from time{font-size:12.5px;color:var(--m);white-space:nowrap}",
      ".am-to summary{font-size:13px;color:var(--m);cursor:pointer;list-style:none;margin-top:2px}.am-to summary::-webkit-details-marker{display:none}.am-to summary::after{content:' ▾'}.am-to p{font-size:13px;color:var(--i2);margin:6px 0 0;overflow-wrap:anywhere;background:var(--l2);padding:8px 10px;border-radius:10px}",
      ".am-pj{display:inline-flex;align-items:center;gap:6px;border:0;background:color-mix(in srgb,var(--r) 10%,var(--c));color:var(--r);font:800 12px/1 inherit;font-family:inherit;padding:7px 10px;border-radius:99px;margin:-2px 0 12px;cursor:pointer}.am-pj svg{width:14px;height:14px}",
      ".am-imgbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;background:var(--l2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:13px;color:var(--i2)}.am-imgbar span{flex:1 1 200px}",
      ".am-frame{display:block;width:1px;min-width:100%;max-width:100%;border:0;min-height:120px;background:#fff;border-radius:10px}",
      ".am-text{font-size:16px;line-height:1.6;overflow-wrap:anywhere;white-space:normal}.am-text a{color:var(--r)}.am-qt{margin:8px 0;cursor:pointer}.am-qt>span{display:inline-block;background:var(--l2);color:var(--m);border-radius:8px;padding:0 10px;font-weight:800;letter-spacing:.1em}.am-qt>div{display:none;border-left:3px solid var(--l);padding-left:10px;color:var(--m);margin-top:6px}.am-qt.open>div{display:block}",
      ".am-atts{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:16px 0 4px}.am-att{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid var(--l);background:var(--c);border-radius:14px;padding:10px 12px;cursor:pointer;font-family:inherit;color:inherit;min-width:0}",
      ".am-ext{flex:0 0 auto;display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:color-mix(in srgb,var(--r) 12%,var(--c));color:var(--r);font:800 11px/1 inherit;font-family:inherit}.am-att>span:last-child{min-width:0}.am-att b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-att em{font-style:normal;font-size:12px;color:var(--m)}",
      ".am-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.am-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 15px/1 inherit;font-family:inherit;color:var(--i);background:var(--c);border:1px solid var(--l);border-radius:14px;padding:13px 16px;cursor:pointer;text-decoration:none;min-height:46px}.am-btn svg{width:19px;height:19px}.am-btn:active{transform:scale(.97)}",
      ".am-pri{background:var(--r);color:#fff;border-color:var(--r)}.am-quiet{background:transparent}.am-sm{min-height:36px;padding:8px 12px;font-size:13px}.am-wide{width:100%;margin-top:10px}.danger{color:var(--bad)}.am-btn:disabled{opacity:.6}",
      ".am-thread{margin:10px 0 6px}.am-tlab{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--m);margin:0 0 6px}.am-tmsg{display:flex;gap:10px;width:100%;text-align:left;border:1px solid var(--l2);background:var(--p);border-radius:14px;padding:10px;margin-bottom:6px;cursor:pointer;font-family:inherit;color:inherit}",
      ".am-tmsg .am-av{width:32px;height:32px;font-size:12px}.am-tmsg>span:last-child{flex:1;min-width:0}.am-tmsg b{font-size:13.5px}.am-tmsg time{float:right;font-size:12px;color:var(--m)}.am-tmsg em{display:block;font-style:normal;font-size:13px;color:var(--m);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".am-loadbody{display:grid;place-items:center;padding:60px}.am-spin{display:inline-block;width:18px;height:18px;border:2.5px solid color-mix(in srgb,currentColor 25%,transparent);border-top-color:currentColor;border-radius:50%;animation:amsp .8s linear infinite;vertical-align:-3px}@keyframes amsp{to{transform:rotate(360deg)}}",
      ".am-sheetback{position:fixed;inset:0;z-index:900;background:rgba(20,16,12,.38);opacity:0;pointer-events:none;transition:opacity .2s}.am-sheetback.on{opacity:1;pointer-events:auto}",
      ".am-sheet{position:absolute;left:50%;bottom:0;transform:translate(-50%,100%);width:min(560px,100%);max-height:86vh;overflow-y:auto;background:var(--c);border-radius:22px 22px 0 0;padding:8px 16px calc(20px + env(safe-area-inset-bottom,0px));transition:transform .28s var(--bs-ease,ease)}.am-sheetback.on .am-sheet{transform:translate(-50%,0)}",
      ".am-grab{width:42px;height:5px;border-radius:9px;background:var(--l);margin:4px auto 10px}.am-sheet h3{font:400 24px/1.15 var(--bs-serif,'Instrument Serif',Georgia,serif);margin:4px 2px 12px;overflow-wrap:anywhere}",
      ".am-flist{display:flex;flex-direction:column;gap:2px;margin-bottom:12px}.am-fold{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;background:none;border-radius:12px;padding:13px 10px;font:600 16px/1.2 inherit;font-family:inherit;color:var(--i);cursor:pointer}.am-fold:hover,.am-fold.on{background:var(--l2)}.am-fold>span{flex:1;min-width:0}.am-fold em{font-style:normal;color:var(--m);font-size:13px;margin-left:6px}",
      ".am-fold i{font-style:normal;font:800 12px/1 inherit;font-family:inherit;background:var(--r);color:#fff;border-radius:99px;padding:4px 8px}.am-fold svg{color:var(--i2)}.am-fdel{flex:0 0 auto!important;display:grid;place-items:center;width:32px;height:32px;border-radius:9px;color:var(--m)}.am-fdel svg{width:16px;height:16px}",
      ".am-two{display:flex;gap:8px;align-items:flex-end}.am-two>*{flex:1;min-width:0}.am-two input{width:100%}.am-two .am-btn{flex:0 0 auto}",
      ".am-lab{display:block;font-size:12.5px;font-weight:800;color:var(--i2);margin:12px 0 0}.am-lab input,.am-lab textarea,.am-two>input{display:block;width:100%;margin-top:6px;font:16px/1.3 inherit;font-family:inherit;color:var(--i);background:var(--p);border:1px solid var(--l);border-radius:12px;padding:12px}.am-lab textarea{resize:vertical}",
      ".am-fine{font-size:12.5px;color:var(--m);line-height:1.5;margin:12px 2px 4px}",
      ".am-connect{max-width:520px;margin:0 auto;padding:22px 18px 28px}.am-c-hero{text-align:center}.am-c-hero svg{width:52px;height:52px;color:var(--r);stroke-width:1.5}.am-c-hero h2{font:400 32px/1.1 var(--bs-serif,'Instrument Serif',Georgia,serif);margin:8px 0}.am-c-hero p{color:var(--i2);margin:0 0 8px;line-height:1.5}",
      ".am-prov{font-size:13.5px;color:var(--i2);margin-top:8px;line-height:1.5}.am-prov p{margin:4px 0 8px}.am-adv{margin-top:12px}.am-adv summary{font-size:13px;font-weight:700;color:var(--m);cursor:pointer}",
      ".am-compose{position:fixed;inset:0;z-index:950;background:var(--c);transform:translateY(100%);transition:transform .3s var(--bs-ease,ease);display:flex;flex-direction:column;visibility:hidden}.am-compose.on{transform:none;visibility:visible}",
      "html.am-lock,html.am-lock body{overflow:hidden}",
      ".am-cbar{display:flex;align-items:center;gap:6px;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 8px;border-bottom:1px solid var(--l2)}.am-cbar b{font-size:16px}.am-send{min-height:40px;padding:10px 18px}",
      ".am-cform{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;max-width:820px;width:100%;margin:0 auto;padding-bottom:calc(30px + env(safe-area-inset-bottom,0px))}",
      ".am-cf{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--l2);padding:0 14px}.am-cf[hidden]{display:none}.am-cf label{flex:0 0 auto;font-size:14px;color:var(--m);width:56px}.am-cf input{flex:1;min-width:0;border:0;background:none;font:16px/1.3 inherit;font-family:inherit;color:var(--i);padding:14px 0;outline:none}",
      ".am-ccbtn{border:0;background:none;color:var(--m);font:700 13px/1 inherit;font-family:inherit;cursor:pointer}",
      ".am-sug{padding:0 8px}.am-sug button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:none;padding:8px;border-radius:12px;font-family:inherit;color:inherit;cursor:pointer}.am-sug button:hover{background:var(--l2)}.am-sug .am-av{width:34px;height:34px;font-size:12px}.am-sug b{display:block;font-size:14.5px}.am-sug em{font-style:normal;font-size:12.5px;color:var(--m)}",
      ".am-cfiles{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0}.am-chipf{display:inline-flex;align-items:center;gap:6px;background:var(--l2);border-radius:99px;padding:6px 6px 6px 10px;font-size:13px;max-width:100%}.am-chipf svg{width:15px;height:15px}.am-chipf em{font-style:normal;color:var(--m)}.am-chipf button{border:0;background:none;color:var(--m);display:grid;place-items:center;cursor:pointer}",
      ".am-cform textarea{display:block;width:100%;border:0;background:none;font:16px/1.55 inherit;font-family:inherit;color:var(--i);padding:14px;outline:none;resize:none;min-height:240px}",
      ".am-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);z-index:1000;display:flex;align-items:center;gap:14px;max-width:calc(100% - 32px);background:#1e1813;color:#fbf4e8;border-radius:14px;padding:12px 14px 12px 16px;font:600 14px/1.35 var(--bs-sans,Manrope,sans-serif);box-shadow:0 12px 30px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:all .22s}",
      ".am-toast.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}.am-toast.bad{background:#7e231c}.am-toast.warn{background:#6b4a0c}.am-toast button{border:0;background:none;color:#ffcf6e;font:800 14px/1 inherit;font-family:inherit;cursor:pointer;padding:6px}",
      "@media (max-width:820px){",
      " .am{margin:-10px -12px 0}.am-panes{display:block;border:0;border-radius:0;background:transparent;min-height:0}",
      " .am-list{border:0}.am-read{display:none}.am.reading .am-list{display:none}.am.reading .am-read{display:block;animation:amin .26s var(--bs-ease,ease)}",
      " .am-bar{background:var(--p);padding:6px 6px 4px}.am-search{margin:4px 8px 8px;background:var(--c);border:1px solid var(--l)}.am-chips{padding:0 8px 10px}",
      " .am-scroll{max-height:none;overflow:visible;padding-bottom:110px}.am-rows{background:var(--c);border-radius:18px;overflow:hidden;margin:0 6px;border:1px solid var(--l2)}.am-row:first-child{border-top:0}",
      " .am-fab{position:fixed;right:16px;bottom:calc(92px + env(safe-area-inset-bottom,0px))}",
      " .am-rbar{background:var(--p);border:0;padding:4px 4px}.am-rback{display:inline-grid}.am-art{background:var(--c);border-radius:18px;margin:0 6px 120px;padding:4px 14px 22px}.am-rhead h1{font-size:26px}",
      " .am-acts .am-btn{flex:1 1 30%;padding:13px 8px}.am-connect{padding-bottom:130px}.am-keys{display:none}",
      "}",
      "@keyframes amin{from{transform:translateX(24px);opacity:.4}to{transform:none;opacity:1}}",
      "@media (prefers-reduced-motion:reduce){.am *{animation:none!important;transition:none!important}}"
    ].join("");
    document.head.appendChild(s);
  }
})();
