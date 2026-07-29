/* The Owner's Manual panel — a slide-in guide plus a plain-text question box that
   answers from the same articles. No backend, no external calls. */
(function(){
  function boot(){
    var S=window.Smiley; if(!S||!document.body) return;
    if(document.getElementById("manualBtn")) return;
    var b=document.createElement("button");
    b.id="manualBtn"; b.className="manualbtn"; b.type="button";
    b.setAttribute("aria-label","Open the owner's manual");
    b.innerHTML="?";
    document.body.appendChild(b);
    var p=document.createElement("div");
    p.className="manualpanel"; p.id="manualPanel"; p.hidden=true;
    p.innerHTML='<div class="mp-head"><b>Owner’s manual</b><button class="mp-x" id="mpX" aria-label="Close">×</button></div>'+
      '<div class="mp-ask"><input id="mpQ" type="search" placeholder="Ask a question…" autocomplete="off"><div id="mpA"></div></div>'+
      '<div class="mp-body" id="mpBody"></div>'+
      '<div class="mp-foot">Support &amp; documentation by <b>Accelerated Experiences LLC</b></div>';
    document.body.appendChild(p);
    function list(items){
      return items.map(function(a){
        return '<details><summary>'+S.esc(a.t)+'</summary><p>'+S.esc(a.b)+'</p></details>'; }).join("");
    }
    document.getElementById("mpBody").innerHTML=list(S.manual());
    b.addEventListener("click",function(){ p.hidden=!p.hidden; if(!p.hidden) document.getElementById("mpQ").focus(); });
    document.getElementById("mpX").addEventListener("click",function(){ p.hidden=true; });
    document.getElementById("mpQ").addEventListener("input",function(e){
      var v=e.target.value.trim(), out=document.getElementById("mpA");
      if(!v){ out.innerHTML=""; document.getElementById("mpBody").innerHTML=list(S.manual()); return; }
      var hits=S.askManual(v);
      out.innerHTML = hits.length ? "" : '<p class="mut">Nothing in the manual matches that. Try a plainer word — "money", "recall", "braces", "denied".</p>';
      document.getElementById("mpBody").innerHTML=list(hits.length?hits:S.manual());
    });
    document.addEventListener("keydown",function(e){ if(e.key==="Escape") p.hidden=true; });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){ setTimeout(boot,0); });
  else setTimeout(boot,0);
})();
