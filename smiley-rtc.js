/* mca-rtc.js — Cedar Ridge Dental (AEHub) NATIVE video conferencing (own WebRTC, no third party)
   ------------------------------------------------------------------------
   Real multi-party audio/video on the browser's own WebRTC. Peers connect
   directly (a mesh); signaling (SDP + ICE) rides on /api/connect (rtc*), and the
   room roster says who's connected. Same public API as before:

     ESPOMeet.open({ room, displayName, subject, outreach, onClose })  (alias: LCPMeet)
     ESPOMeet.pairRoom(a,b) · groupRoom(name) · outreachRoom(label) · inviteURL(room)
     ESPOMeet.close() · LCPMeet.isOpen()

   inviteURL points at OUR /meet.html. NAT traversal uses public STUN; add TURN to
   the ICE list for hard networks. Premium studio UI (adaptive grid, active-speaker
   glow, frosted controls). Built by Accelerated Experiences, LLC.
*/
(function () {
  'use strict';
  var PREFIX = 'SLEEVES';
  var ICE = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
    // , { urls:'turn:YOUR_TURN_HOST:3478', username:'u', credential:'p' }  // add for hard NATs
  ];
  var API = (window.SLEEVES_API||'https://ae-connect-api.vercel.app')+'/api/connect';
  var overlay = null, myId = '', myName = 'Guest', curRoom = '', curSubject = '', outreach = false, onCloseCb = null;
  var localStream = null, screenStream = false, pollTimer = null, joined = false;
  var peers = {};   // peerId -> { pc, tile, name, remote, pending:[] }
  var AC = null, meters = [], speakTimer = null, hideTimer = null;
  var TOKEN = (new URLSearchParams(location.search).get('sess')) || (function () { try { return localStorage.getItem('aehub_sess') || ''; } catch (e) { return ''; } })();

  function slug(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase(); }
  function hash(s){ var h=5381; for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0; return h.toString(36); }
  function pairRoom(a,b){ var x=slug(a)||'a',y=slug(b)||'b'; return PREFIX+'-p-'+hash(PREFIX+':pair:'+[x,y].sort().join('~')); }
  function groupRoom(name){ var n=slug(name)||'room'; return PREFIX+'-g-'+n+'-'+hash(PREFIX+':group:'+n); }
  function outreachRoom(label){ var n=slug(label)||'guest'; return PREFIX+'-o-'+n+'-'+hash(PREFIX+':out:'+n+':'+Date.now()+':'+Math.random()); }
  function inviteURL(room){ return location.origin + '/meet.html?room=' + encodeURIComponent(room); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function initials(n){ var p=String(n||'').trim().split(/\s+/); return ((p[0]||'?')[0]+((p[1]||'')[0]||'')).toUpperCase(); }
  function hue(n){ var h=0,s=String(n||''); for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360; return h; }

  var MARK = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='24'%20fill='%236c78ff'/%3E%3Ctext%20x='50'%20y='64'%20font-family='Inter,sans-serif'%20font-size='42'%20font-weight='700'%20fill='%23fff'%20text-anchor='middle'%3Ees%3C/text%3E%3C/svg%3E";

  function css() {
    if (document.getElementById('lcprtc-css')) return;
    var s = document.createElement('style'); s.id = 'lcprtc-css';
    s.textContent = [
      "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');",
      '#lcprtc{position:fixed;inset:0;z-index:6000;display:none;flex-direction:column;font-family:Inter,system-ui,sans-serif;background:radial-gradient(1400px 720px at 50% -12%,#161a22,#0a0c10 62%)}',
      '#lcprtc.on{display:flex}',
      '#lcprtc *{box-sizing:border-box}',
      /* top bar (floats, fades with idle) */
      '#lcprtc .top{position:absolute;top:0;left:0;right:0;z-index:4;display:flex;align-items:center;gap:12px;padding:16px 20px;color:#eef2f5;background:linear-gradient(180deg,rgba(6,8,11,.72),rgba(6,8,11,0));transition:opacity .3s,transform .3s}',
      '#lcprtc .top img{width:30px;height:30px;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4)}',
      '#lcprtc .tt{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:16px;color:#fff;line-height:1.05}',
      '#lcprtc .live{display:inline-flex;align-items:center;gap:7px;margin-top:3px;font-size:11px;color:#c7d2dc;letter-spacing:.02em}',
      '#lcprtc .live .rd{width:8px;height:8px;border-radius:50%;background:#e5352b;box-shadow:0 0 0 0 rgba(229,53,43,.6);animation:lrpulse 1.6s infinite}',
      '@keyframes lrpulse{0%{box-shadow:0 0 0 0 rgba(229,53,43,.5)}70%{box-shadow:0 0 0 7px rgba(229,53,43,0)}100%{box-shadow:0 0 0 0 rgba(229,53,43,0)}}',
      '#lcprtc .topr{margin-left:auto;display:flex;align-items:center;gap:9px}',
      '#lcprtc .chip{display:inline-flex;align-items:center;gap:8px;background:rgba(20,26,34,.6);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.09);border-radius:99px;padding:7px 9px 7px 14px;max-width:46vw}',
      '#lcprtc .chip span{font-size:11.5px;color:#aeb9c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:26vw}',
      '#lcprtc .chip button{border:none;background:#6c78ff;color:#0b1030;border-radius:99px;padding:6px 13px;font:inherit;font-weight:700;font-size:12px;cursor:pointer;transition:filter .15s}',
      '#lcprtc .chip button:hover{filter:brightness(1.07)}',
      /* stage + adaptive grid */
      '#lcprtc .stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:14px;overflow:hidden}',
      '#lcprtc .grid{display:grid;gap:12px;margin:auto;place-content:center}',
      /* tiles */
      '#lcprtc .tile{position:relative;background:#0e1218;border:1px solid rgba(255,255,255,.05);border-radius:18px;overflow:hidden;aspect-ratio:16/9;box-shadow:0 10px 30px rgba(0,0,0,.35);animation:lrpop .32s cubic-bezier(.2,.8,.3,1);transition:box-shadow .2s,border-color .2s;cursor:pointer}',
      '@keyframes lrpop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}',
      '#lcprtc .tile video{width:100%;height:100%;object-fit:cover;display:block;background:#0e1218}',
      '#lcprtc .tile.self video{transform:scaleX(-1)}',
      '#lcprtc .tile.speaking{border-color:#6c78ff;box-shadow:0 0 0 3px rgba(108,120,255,.9),0 0 26px rgba(108,120,255,.35),0 10px 30px rgba(0,0,0,.4)}',
      '#lcprtc .tile .grad{position:absolute;left:0;right:0;bottom:0;height:64px;background:linear-gradient(0deg,rgba(6,8,11,.62),transparent);pointer-events:none}',
      '#lcprtc .tile .nm{position:absolute;left:11px;bottom:10px;display:flex;align-items:center;gap:7px;color:#fff;font-size:12.5px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.5);max-width:82%}',
      '#lcprtc .tile .nm b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#lcprtc .tile .mic{width:22px;height:22px;flex:none;border-radius:50%;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:12px}',
      '#lcprtc .tile.muted .mic{background:#d33f36;color:#fff}',
      '#lcprtc .tile .avoff{position:absolute;inset:0;display:none;align-items:center;justify-content:center}',
      '#lcprtc .tile .avoff i{width:34%;max-width:120px;min-width:52px;aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:Fraunces,Georgia,serif;font-weight:700;font-style:normal;font-size:clamp(20px,4vw,40px);box-shadow:inset 0 0 0 3px rgba(255,255,255,.14)}',
      '#lcprtc .tile.off video{opacity:0}',
      '#lcprtc .tile.off .avoff{display:flex}',
      '#lcprtc .tile .pin{position:absolute;top:9px;right:10px;opacity:0;background:rgba(10,13,17,.6);color:#e7edf2;border-radius:8px;font-size:10.5px;padding:3px 8px;transition:opacity .2s}',
      '#lcprtc .tile:hover .pin{opacity:1}',
      /* control bar (frosted, floats, fades with idle) */
      '#lcprtc .bar{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:4;display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(16,20,27,.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:20px;box-shadow:0 16px 44px rgba(0,0,0,.5);transition:opacity .3s,transform .3s}',
      '#lcprtc .cbtn{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;width:60px;padding:8px 4px 6px;border:none;background:transparent;color:#e7edf2;font:inherit;cursor:pointer;border-radius:13px;transition:background .15s}',
      '#lcprtc .cbtn:hover{background:rgba(255,255,255,.07)}',
      '#lcprtc .cbtn .ic{width:46px;height:46px;border-radius:50%;background:#232c37;display:flex;align-items:center;justify-content:center;font-size:20px;transition:background .15s,transform .1s}',
      '#lcprtc .cbtn:active .ic{transform:scale(.94)}',
      '#lcprtc .cbtn .lb{font-size:10.5px;color:#aeb9c4;letter-spacing:.01em}',
      '#lcprtc .cbtn.off .ic{background:#d33f36;color:#fff}',
      '#lcprtc .cbtn.hang .ic{background:#d33f36;color:#fff;width:auto;padding:0 22px;border-radius:24px;font-weight:700;font-family:Inter;font-size:14px}',
      '#lcprtc .cbtn.hang .lb{color:#e7a19b}',
      '#lcprtc .cbtn .ic svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
      '#lcprtc .sep{width:1px;height:34px;background:rgba(255,255,255,.1);margin:0 2px}',
      /* idle: hide chrome */
      '#lcprtc.idle .top,#lcprtc.idle .bar{opacity:0;pointer-events:none}',
      '#lcprtc.idle .top{transform:translateY(-8px)}',
      '#lcprtc.idle .bar{transform:translateX(-50%) translateY(10px)}',
      '#lcprtc.idle{cursor:none}',
      /* connecting / message layer */
      '#lcprtc .msg{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#c2ccd6;gap:14px;text-align:center;padding:24px}',
      '#lcprtc .msg img{width:52px;height:52px;border-radius:50%;box-shadow:0 8px 24px rgba(0,0,0,.4)}',
      '#lcprtc .msg .sp{width:30px;height:30px;border:3px solid rgba(108,120,255,.25);border-top-color:#6c78ff;border-radius:50%;animation:lrsp .9s linear infinite}',
      '@keyframes lrsp{to{transform:rotate(360deg)}}',
      '#lcprtc .msg .big{font-family:Fraunces,Georgia,serif;font-size:19px;color:#fff}',
      '#lcprtc .msg button{border:1px solid #33404c;background:#1a222c;color:#e7edf2;border-radius:11px;padding:10px 16px;font:inherit;cursor:pointer}',
      '@media(max-width:640px){#lcprtc .cbtn{width:52px}#lcprtc .cbtn .ic{width:42px;height:42px}#lcprtc .chip span{max-width:30vw}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // inline SVG icons (crisp, not emoji) — Zoom-grade control glyphs
  var IC = {
    mic:  '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    micoff:'<svg viewBox="0 0 24 24"><line x1="4" y1="4" x2="20" y2="20"/><path d="M15 9V6a3 3 0 0 0-5.6-1.5"/><path d="M9 9v2a3 3 0 0 0 4.5 2.6"/><path d="M6 11a6 6 0 0 0 9 5.2M18 11a6 6 0 0 1-.3 1.9"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    cam:  '<svg viewBox="0 0 24 24"><rect x="2.5" y="6.5" width="13" height="11" rx="2.5"/><path d="M15.5 10l5-2.5v9L15.5 14"/></svg>',
    camoff:'<svg viewBox="0 0 24 24"><line x1="3" y1="3" x2="21" y2="21"/><path d="M15.5 10l5-2.5v9M4 6.6A2.5 2.5 0 0 0 2.5 9v6.5A2.5 2.5 0 0 0 5 18h9.5"/></svg>',
    share:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><path d="M12 8v5M12 8l-2.5 2.5M12 8l2.5 2.5"/></svg>',
    invite:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><line x1="19" y1="7" x2="19" y2="13"/><line x1="16" y1="10" x2="22" y2="10"/></svg>',
    hang: '<svg viewBox="0 0 24 24"><path d="M4.5 13.5c4-3.2 11-3.2 15 0l1 1.4-2.6 2.2-2.3-1.8v-1.7c-2.2-.9-5-0.9-7.2 0v1.7l-2.3 1.8L2.5 14.9z"/></svg>'
  };

  function build() {
    css();
    if (overlay) return;
    overlay = document.createElement('div'); overlay.id = 'lcprtc';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="top"><img src="' + MARK + '" alt=""><div><div class="tt" id="lcprtc-tt">Live video</div>' +
        '<div class="live"><span class="rd"></span><span id="lcprtc-live">Live · 1 in the room</span></div></div>' +
        '<div class="topr"><div class="chip"><span id="lcprtc-url"></span><button id="lcprtc-copy" type="button">Copy link</button></div></div></div>' +
      '<div class="stage"><div class="grid" id="lcprtc-grid"></div></div>' +
      '<div class="msg" id="lcprtc-msg" style="display:none"></div>' +
      '<div class="bar">' +
        '<button class="cbtn" id="lcprtc-mic" title="Mute (M)"><span class="ic">' + IC.mic + '</span><span class="lb">Mute</span></button>' +
        '<button class="cbtn" id="lcprtc-cam" title="Stop video"><span class="ic">' + IC.cam + '</span><span class="lb">Video</span></button>' +
        '<button class="cbtn" id="lcprtc-share" title="Share screen"><span class="ic">' + IC.share + '</span><span class="lb">Share</span></button>' +
        '<button class="cbtn" id="lcprtc-invite" title="Copy invite link"><span class="ic">' + IC.invite + '</span><span class="lb">Invite</span></button>' +
        '<div class="sep"></div>' +
        '<button class="cbtn hang" id="lcprtc-hang" title="Leave"><span class="ic">' + IC.hang + '</span><span class="lb">Leave</span></button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#lcprtc-copy').addEventListener('click', copyInvite);
    overlay.querySelector('#lcprtc-invite').addEventListener('click', copyInvite);
    overlay.querySelector('#lcprtc-hang').addEventListener('click', close);
    overlay.querySelector('#lcprtc-mic').addEventListener('click', toggleMic);
    overlay.querySelector('#lcprtc-cam').addEventListener('click', toggleCam);
    overlay.querySelector('#lcprtc-share').addEventListener('click', toggleShare);
    // double-click a tile → fullscreen it
    overlay.querySelector('#lcprtc-grid').addEventListener('dblclick', function (e) {
      var t = e.target.closest ? e.target.closest('.tile') : null; if (!t) return;
      if (document.fullscreenElement) { document.exitFullscreen(); } else if (t.requestFullscreen) { t.requestFullscreen().catch(function () {}); }
    });
    // auto-hide chrome when idle
    ['mousemove', 'touchstart', 'keydown'].forEach(function (ev) { overlay.addEventListener(ev, wake, { passive: true }); });
    window.addEventListener('resize', relayout);
  }

  function wake() { if (!overlay) return; overlay.classList.remove('idle'); if (hideTimer) clearTimeout(hideTimer); hideTimer = setTimeout(function () { if (overlay && isOpen()) overlay.classList.add('idle'); }, 3500); }

  function msg(html, retry) {
    var m = document.getElementById('lcprtc-msg'); if (!m) return;
    m.style.display = 'flex'; m.innerHTML = html + (retry ? '<button id="lcprtc-retry">Try again</button>' : '');
    if (retry) { var b = document.getElementById('lcprtc-retry'); if (b) b.addEventListener('click', retry); }
  }
  function clearMsg() { var m = document.getElementById('lcprtc-msg'); if (m) { m.style.display = 'none'; m.innerHTML = ''; } }

  function copyInvite() {
    var url = inviteURL(curRoom), btn = document.getElementById('lcprtc-copy');
    function ok() { if (btn) { var t = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = t; }, 1600); } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { prompt('Copy this invite link:', url); });
    else prompt('Copy this invite link:', url);
  }

  // ---- adaptive grid: pick the column count that makes every face as large as possible ----
  function relayout() {
    var grid = document.getElementById('lcprtc-grid'); if (!grid) return;
    var n = grid.children.length; if (!n) return;
    var stage = grid.parentNode, gap = 12, ar = 16 / 9;
    var W = stage.clientWidth - 28, H = stage.clientHeight - 28;
    var best = 1, bestArea = 0, bw = 0;
    for (var c = 1; c <= n; c++) {
      var r = Math.ceil(n / c);
      var tw = (W - (c - 1) * gap) / c, th = tw / ar;
      if (th * r + (r - 1) * gap > H) { th = (H - (r - 1) * gap) / r; tw = th * ar; }
      var area = tw * th; if (area > bestArea) { bestArea = area; best = c; bw = tw; }
    }
    grid.style.gridTemplateColumns = 'repeat(' + best + ', 1fr)';
    grid.style.width = Math.floor(bw * best + (best - 1) * gap) + 'px';
    var live = document.getElementById('lcprtc-live'); if (live) live.textContent = 'Live · ' + n + (n === 1 ? ' in the room' : ' in the room');
  }

  function makeTile(id, name, isSelf) {
    var grid = document.getElementById('lcprtc-grid');
    var t = document.createElement('div'); t.className = 'tile off' + (isSelf ? ' self' : ''); t.id = 'tile-' + id;
    var col = 'hsl(' + hue(name) + ',42%,42%)';
    t.innerHTML = '<video autoplay playsinline' + (isSelf ? ' muted' : '') + '></video>' +
      '<div class="avoff"><i style="background:' + col + '">' + esc(initials(name)) + '</i></div>' +
      '<div class="grad"></div>' +
      '<div class="nm"><span class="mic">' + IC.mic + '</span><b>' + esc(name || 'Guest') + (isSelf ? ' (you)' : '') + '</b></div>' +
      '<div class="pin">Double-click for full screen</div>';
    if (isSelf) grid.insertBefore(t, grid.firstChild); else grid.appendChild(t);
    return t;
  }

  // ---- active-speaker detection (Web Audio) → gold glow on the loudest tile ----
  function meter(stream, tileEl) {
    if (!stream || !stream.getAudioTracks || !stream.getAudioTracks().length) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      var src = AC.createMediaStreamSource(stream), an = AC.createAnalyser();
      an.fftSize = 512; an.smoothingTimeConstant = 0.7; src.connect(an);
      meters.push({ an: an, data: new Uint8Array(an.frequencyBinCount), tile: tileEl });
    } catch (e) {}
  }
  function speakTick() {
    var loud = null, max = 12;
    meters.forEach(function (m) { if (!m.tile || !m.tile.isConnected) return; m.an.getByteFrequencyData(m.data); var sum = 0; for (var i = 0; i < m.data.length; i++) sum += m.data[i]; var avg = sum / m.data.length; if (avg > max) { max = avg; loud = m.tile; } });
    meters.forEach(function (m) { if (m.tile) m.tile.classList.toggle('speaking', m.tile === loud); });
  }

  // ---- signaling transport ----
  function sig(action, extra) {
    var body = Object.assign({ do: action, sess: TOKEN, room: curRoom, peer: myId, name: myName }, extra || {});
    return fetch(API + '?do=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  function tileFor(id, name) {
    if (peers[id] && peers[id].tile) return peers[id].tile;
    var t = makeTile(id, name, false); relayout(); return t;
  }

  function makePeer(id, name, polite) {
    if (peers[id] && peers[id].pc) return peers[id];
    var pc = new RTCPeerConnection({ iceServers: ICE });
    var tile = tileFor(id, name);
    var video = tile.querySelector('video');
    var rec = { pc: pc, tile: tile, name: name, remote: new MediaStream(), pending: [], metered: false };
    peers[id] = rec;
    video.srcObject = rec.remote;
    if (localStream) localStream.getTracks().forEach(function (tr) { try { pc.addTrack(tr, localStream); } catch (e) {} });
    pc.onicecandidate = function (e) { if (e.candidate) sig('rtcSignal', { to: id, kind: 'ice', data: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.ontrack = function (e) {
      (e.streams && e.streams[0] ? e.streams[0].getTracks() : [e.track]).forEach(function (tr) { try { rec.remote.addTrack(tr); } catch (x) {} });
      tile.classList.toggle('off', rec.remote.getVideoTracks().length === 0); // audio-only → show avatar
      if (!rec.metered && rec.remote.getAudioTracks().length) { rec.metered = true; meter(rec.remote, tile); }
    };
    pc.onconnectionstatechange = function () { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') dropPeer(id); };
    if (!polite) { // deterministic offerer (smaller id) starts the negotiation
      pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () { sig('rtcSignal', { to: id, kind: 'offer', data: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } }); }).catch(function () {});
    }
    return rec;
  }
  function dropPeer(id) { var r = peers[id]; if (!r) return; try { r.pc.close(); } catch (e) {} if (r.tile && r.tile.parentNode) r.tile.parentNode.removeChild(r.tile); delete peers[id]; relayout(); }

  function handleSignal(s) {
    var id = s.from; if (!id || id === myId) return;
    var polite = myId < id;
    var rec = peers[id] && peers[id].pc ? peers[id] : makePeer(id, s.fromName || 'Guest', true);
    var pc = rec.pc;
    if (s.kind === 'offer') {
      pc.setRemoteDescription(new RTCSessionDescription(s.data))
        .then(function () { return pc.createAnswer(); })
        .then(function (a) { return pc.setLocalDescription(a); })
        .then(function () { sig('rtcSignal', { to: id, kind: 'answer', data: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } }); flushIce(rec); })
        .catch(function () {});
    } else if (s.kind === 'answer') {
      pc.setRemoteDescription(new RTCSessionDescription(s.data)).then(function () { flushIce(rec); }).catch(function () {});
    } else if (s.kind === 'ice') {
      if (pc.remoteDescription && pc.remoteDescription.type) { pc.addIceCandidate(new RTCIceCandidate(s.data)).catch(function () {}); }
      else { rec.pending.push(s.data); }
    }
  }
  function flushIce(rec) { (rec.pending || []).forEach(function (c) { rec.pc.addIceCandidate(new RTCIceCandidate(c)).catch(function () {}); }); rec.pending = []; }

  function loop() {
    sig('rtcPoll', {}).then(function (j) {
      if (!j || !j.ok) return;
      var here = {};
      (j.peers || []).forEach(function (p) { here[p.peer] = 1; if (!peers[p.peer]) { if (myId < p.peer) makePeer(p.peer, p.name, false); } if (peers[p.peer]) peers[p.peer].name = p.name; });
      Object.keys(peers).forEach(function (id) { if (!here[id]) dropPeer(id); });
      (j.signals || []).forEach(handleSignal);
    });
  }

  function localTile() {
    var t = makeTile('self', myName, true);
    var v = t.querySelector('video'); if (localStream) { v.srcObject = localStream; if (localStream.getVideoTracks().length) t.classList.remove('off'); }
    meter(localStream, t);
    relayout();
    return t;
  }

  function start() {
    msg('<img src="' + MARK + '" alt=""><div class="sp"></div><div class="big">Joining the room…</div><div>Getting your camera and mic ready.</div>');
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .catch(function () { return navigator.mediaDevices.getUserMedia({ audio: true }); })
      .then(function (stream) { localStream = stream; clearMsg(); localTile(); begin(); })
      .catch(function () { localStream = null; clearMsg(); localTile(); begin(); });
  }
  function begin() {
    joined = true; sig('rtcJoin', {}); loop();
    if (pollTimer) clearInterval(pollTimer); pollTimer = setInterval(loop, 1500);
    if (speakTimer) clearInterval(speakTimer); speakTimer = setInterval(speakTick, 240);
    wake();
  }

  function toggleMic() { if (!localStream) return; var on = false; localStream.getAudioTracks().forEach(function (t) { t.enabled = !t.enabled; on = t.enabled; }); var b = document.getElementById('lcprtc-mic'); b.classList.toggle('off', !on); b.querySelector('.ic').innerHTML = on ? IC.mic : IC.micoff; b.querySelector('.lb').textContent = on ? 'Mute' : 'Unmute'; var st = document.getElementById('tile-self'); if (st) { st.classList.toggle('muted', !on); st.querySelector('.mic').innerHTML = on ? IC.mic : IC.micoff; } }
  function toggleCam() { if (!localStream) return; var on = false; localStream.getVideoTracks().forEach(function (t) { t.enabled = !t.enabled; on = t.enabled; }); var b = document.getElementById('lcprtc-cam'); b.classList.toggle('off', !on); b.querySelector('.ic').innerHTML = on ? IC.cam : IC.camoff; b.querySelector('.lb').textContent = on ? 'Video' : 'Start'; var st = document.getElementById('tile-self'); if (st) st.classList.toggle('off', !on); }
  function toggleShare() {
    if (screenStream) { stopShare(); return; }
    if (!navigator.mediaDevices.getDisplayMedia) return;
    navigator.mediaDevices.getDisplayMedia({ video: true }).then(function (ds) {
      screenStream = ds; var track = ds.getVideoTracks()[0];
      Object.keys(peers).forEach(function (id) { var snd = peers[id].pc.getSenders().find(function (s) { return s.track && s.track.kind === 'video'; }); if (snd) snd.replaceTrack(track); });
      var self = document.getElementById('tile-self'); var sv = self && self.querySelector('video'); if (sv) { sv.srcObject = ds; self.classList.remove('self', 'off'); }
      var b = document.getElementById('lcprtc-share'); b.classList.add('off'); b.querySelector('.lb').textContent = 'Stop';
      track.onended = stopShare;
    }).catch(function () {});
  }
  function stopShare() {
    if (!screenStream) return; try { screenStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    screenStream = false;
    var camTrack = localStream && localStream.getVideoTracks()[0];
    Object.keys(peers).forEach(function (id) { var snd = peers[id].pc.getSenders().find(function (s) { return s.track && s.track.kind === 'video'; }); if (snd && camTrack) snd.replaceTrack(camTrack); });
    var self = document.getElementById('tile-self'); var sv = self && self.querySelector('video'); if (sv && localStream) { sv.srcObject = localStream; self.classList.add('self'); if (!localStream.getVideoTracks().length || !localStream.getVideoTracks()[0].enabled) self.classList.add('off'); }
    var b = document.getElementById('lcprtc-share'); b.classList.remove('off'); b.querySelector('.lb').textContent = 'Share';
  }

  function open(opts) {
    opts = opts || {};
    curRoom = opts.room || groupRoom(opts.subject || 'room');
    curSubject = opts.subject || 'Live call';
    outreach = !!opts.outreach;
    onCloseCb = opts.onClose || null;
    myName = opts.displayName || 'Guest';
    myId = (slug(myName) || 'p').slice(0, 20) + '-' + Math.random().toString(36).slice(2, 8);
    build();
    document.getElementById('lcprtc-tt').textContent = opts.title || curSubject;
    document.getElementById('lcprtc-url').textContent = inviteURL(curRoom);
    document.getElementById('lcprtc-grid').innerHTML = '';
    peers = {}; meters = [];
    overlay.classList.remove('idle');
    overlay.classList.add('on');
    start();
    return curRoom;
  }
  function close() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (speakTimer) { clearInterval(speakTimer); speakTimer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (joined) { try { sig('rtcLeave', {}); } catch (e) {} joined = false; }
    Object.keys(peers).forEach(dropPeer);
    meters = [];
    if (screenStream) { try { screenStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} screenStream = false; }
    if (localStream) { try { localStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} localStream = null; }
    if (overlay) overlay.classList.remove('on', 'idle');
    if (onCloseCb) { var c = onCloseCb; onCloseCb = null; try { c(); } catch (e) {} }
  }
  function isOpen() { return !!(overlay && overlay.classList.contains('on')); }
  window.addEventListener('beforeunload', function () { if (joined) { try { navigator.sendBeacon && navigator.sendBeacon(API + '?do=rtcLeave', JSON.stringify({ do: 'rtcLeave', room: curRoom, peer: myId })); } catch (e) {} } });
  document.addEventListener('keydown', function (e) { if (!isOpen()) return; if (e.key === 'Escape') close(); else if (e.key === 'm' || e.key === 'M') toggleMic(); });

  var ESPOAPI = { open: open, close: close, isOpen: isOpen, pairRoom: pairRoom, groupRoom: groupRoom, outreachRoom: outreachRoom, inviteURL: inviteURL, NATIVE: true };
  window.SmileyMeet = ESPOAPI; window.MCAMeet = ESPOAPI; window.ESPOMeet = ESPOAPI; window.LCPMeet = ESPOAPI;
})();
