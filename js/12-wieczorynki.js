/* ---------- START: najbliższa wieczorynka ---------- */
function renderNext(){
  const box=$("nextbody"),fu=firstUpcoming();
  if(fu<0){box.innerHTML='<div class="note">Brak zaplanowanych wieczorynek.</div><div style="margin-top:8px"><button class="b g" data-go="new">➕ Zaplanuj wieczorynkę</button></div>';return}
  const r=sorted[fu],g=rsvps[r.id]||[],goes=!!session&&g.includes(uid);
  box.innerHTML='<div style="font-size:18px;font-weight:700">'+esc(r.title)+'</div>'
   +'<div class="meta">🕖 '+esc(relWhen(r.when))+' · 📍 '+esc(r.place||"miejsce do ustalenia")+' · '+esc(r.pace||"")+'</div>'
   +changedHtml(r)
   +'<div class="meta">Jedzie: <b>'+g.length+'</b>'+(session&&g.length?nkList(g):'')+'</div>'
   +(session&&favNames(g).length?'<div class="favline">⭐ Jadą Twoi ulubieni: '+esc(favNames(g).join(", "))+'</div>':'')
   +'<div class="row" style="margin-top:10px"><button class="b'+(goes?' g':'')+'" data-go="join" data-id="'+esc(r.id)+'">'+(goes?'Rezygnuję':'Jadę!')+'</button><button class="b g" data-go="ride" data-i="'+fu+'">Szczegóły i mapa →</button></div>';
}
/* ---------- START: odliczanie do najbliższej wieczorynki ---------- */
let cdKey="";
/* 👀 obserwujący goście (KROK 21) — licznik bez logowania, raz na urządzenie */
let watchOk=false,watchN={};
const devId=(()=>{try{let d=localStorage.getItem("devId");if(!d){d=(crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^Math.random()*16>>c/4).toString(16)));localStorage.setItem("devId",d)}return d}catch(e){return ""}})();
const myWatch=new Set((()=>{try{return JSON.parse(localStorage.getItem("watched")||"[]")}catch(e){return []}})());
const saveWatch=()=>{try{localStorage.setItem("watched",JSON.stringify([...myWatch].slice(-50)))}catch(e){}};
// najbliższa wieczorynka, która jeszcze się NIE zaczęła, i ta, która właśnie trwa (do 3 h po starcie)
function cdState(){
  const now=Date.now();
  const ni=sorted.findIndex(r=>new Date(r.when).getTime()>now);
  let li=-1;sorted.forEach((r,i)=>{const t=new Date(r.when).getTime();if(t<=now&&t>=now-3*36e5)li=i});
  const live=li>=0?{r:sorted[li],i:li}:null;
  if(ni<0)return {mode:"none",live};
  const r=sorted[ni],s=Math.floor((new Date(r.when).getTime()-now)/1000);
  return {mode:s<86400?(s<=900?"soon":"day"):"far",r,i:ni,s,live};
}
function cdDigits(st){
  if(st.mode==="none")return ["--","--","--"];
  const s=st.s;
  if(st.mode==="far")return [pad(Math.min(99,Math.floor(s/86400))),pad(Math.floor(s%86400/3600)),pad(Math.floor(s%3600/60))];
  return [pad(Math.floor(s/3600)),pad(Math.floor(s%3600/60)),pad(s%60)];
}
function renderCountdown(){
  const box=$("cdbody");if(!box)return;
  // odliczanie tylko, gdy wieczorynki są dla tej osoby dostępne (KROK 36 — inaczej baza i tak ich nie odda)
  box.classList.toggle("hide",!tabOk(1));if(!tabOk(1))return;
  const st=cdState(),r=st.r,g=r?(rsvps[r.id]||[]):[],goes=!!session&&g.includes(uid),wn=r?(watchN[r.id]||0):0,wme=!!r&&myWatch.has(r.id);
  const key=[tabOk(1),st.mode,st.live?st.live.r.id+st.live.r.title:"",r?r.id+r.when+r.title+(r.place||""):"",g.length,goes,wn,wme,favNames(g).join(),!!session].join("|");
  if(key!==cdKey){
    cdKey=key;
    const liveHtml=st.live?'<button type="button" class="cdlive" data-go="ride" data-i="'+st.live.i+'">🚴 Teraz jedzie: <b>'+esc(st.live.r.title)+'</b> · start '+esc(hhmm(new Date(st.live.r.when)))+(tabOk(1)?' ›':'')+'</button>':'';
    const lbls=st.mode==="far"||st.mode==="none"?["DNI","GODZ","MIN"]:["GODZ","MIN","SEK"];
    let lab,ev,btn,who="";
    if(st.mode==="none"){
      lab='<div class="cdlab mut">⏳ Do najbliższej wieczorynki</div>';
      ev='<div class="cdev"><div>Brak zaplanowanych wieczorynek</div></div>';
      btn='<button class="b g cdbtn" data-go="new">➕ Zaplanuj wieczorynkę</button>';
    }else{
      const w=new Date(r.when),n=dayDiff(w);
      const badge=n===0?' <span class="cdbadge">DZIŚ</span>':n===1&&st.mode!=="far"?' <span class="cdbadge">JUTRO</span>':'';
      lab=st.mode==="soon"?'<div class="cdlab">🚴 Start za chwilę!</div>':'<div class="cdlab">⏳ Do '+(badge?'wieczorynki':'najbliższej wieczorynki')+badge+'</div>';
      const wd=w.toLocaleDateString("pl-PL",{weekday:"long"});
      const day=n>=0&&n<=1?relDay(w):wd.charAt(0).toUpperCase()+wd.slice(1)+" "+w.getDate()+" "+MON3[w.getMonth()].toLowerCase();
      ev='<div class="cdev"><b>'+esc(r.title)+'</b><div>'+esc(day+" · "+hhmm(w)+(r.place?" · "+r.place:"")+(r.pace?" · "+r.pace:""))+'</div></div>';
      const fn=session?favNames(g):[];
      who='<div class="cdwho"><span class="cdn">🚴 Jedzie <b>'+g.length+'</b></span>'+(wn?'<span class="cdn">👀 '+wn+' '+plf(wn,["gość obserwuje","gości obserwuje","gości obserwuje"])+'</span>':'')
        +(fn.length?'<div class="cdfav">⭐ '+esc(fn.join(", "))+'</div>':'')+'</div>';
      btn=session
        ?'<div class="cdacts"><button class="b join cdjoin'+(goes?' g':'')+'" data-go="join" data-id="'+esc(r.id)+'">'+(goes?'✓ Jedziesz · Rezygnuję':'Jadę!')+'</button>'
          +(tabOk(1)?'<button class="b g cdmore" data-go="ride" data-i="'+st.i+'">Szczegóły ›</button>':'')+'</div>'
        :'<div class="cdacts"><button class="b join cdjoin'+(wme?' g':'')+'" data-go="watch" data-id="'+esc(r.id)+'"'+(watchOk?'':' disabled')+'>'+(wme?'✓ Obserwujesz':'👀 Obserwuję')+'</button>'
          +(tabOk(1)?'<button class="b g cdmore" data-go="ride" data-i="'+st.i+'">Szczegóły ›</button>':'')+'</div>'
          +'<div class="note cdnote">Żeby się zapisać („Jadę!”) i dostawać powiadomienia, <button type="button" class="lnk" data-go="login">zaloguj się ›</button></div>';
    }
    box.innerHTML=liveHtml+lab+'<div class="cdclock'+(st.mode==="soon"?' soon':'')+'">'+cdDigits(st).map((x,i)=>(i?'<div class="cdcol">:</div>':'')+'<div class="cdu"><div class="fcard cdt">'+x+'</div><small>'+lbls[i]+'</small></div>').join("")+'</div>'+ev+who+btn;
    if(!tabOk(1))box.querySelectorAll(".cdlive").forEach(b=>b.disabled=true);
    return;
  }
  if(st.mode==="none")return;
  const d=cdDigits(st);
  box.querySelectorAll(".cdt").forEach((el,i)=>flipCard(el,d[i]));
}
setInterval(()=>{if(!document.hidden&&!$("p0").classList.contains("hide"))renderCountdown()},1000);
$("cdbody").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-go]");if(!b)return;
  const go=b.dataset.go;
  if(go==="ride"){if(!tabOk(1))return;show(1);showRide(+b.dataset.i);return}
  if(go==="login"){setGuest(false);renderChrome();return}
  if(go==="new"){
    if(!session){say("Zaloguj się, aby zaplanować wieczorynkę.");return}
    if(!tabOk(1)){say("Planowanie wieczorynek jest jeszcze w testach.");return}
    show(1);$("newbox").open=true;$("newbox").scrollIntoView({behavior:"smooth"});return;
  }
  b.disabled=true;
  try{
    if(go==="join"){await toggleRsvp(b.dataset.id);try{navigator.vibrate&&navigator.vibrate(30)}catch(err){}}
    else if(go==="watch"){
      const id=b.dataset.id,on=!myWatch.has(id);
      const r=await sb.rpc("ride_watch",{r:id,dev:devId,on_:on});if(r.error)throw r.error;
      on?myWatch.add(id):myWatch.delete(id);saveWatch();watchN[id]=+r.data||0;cdKey="";renderCountdown();
      say(on?"👀 Obserwujesz — organizator widzi, że ktoś jeszcze może przyjechać.":"Cofnięto obserwowanie.");
    }
  }catch(err){say("Operacja nie powiodła się"+(err&&err.message?": "+err.message:"."))}
  finally{b.disabled=false}
});
$("nextbody").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-go]");if(!b)return;
  try{
    if(b.dataset.go==="join")await toggleRsvp(b.dataset.id);
    else if(b.dataset.go==="ride"){show(1);showRide(+b.dataset.i)}
    else if(b.dataset.go==="new"){show(1);$("newbox").open=true;$("newbox").scrollIntoView({behavior:"smooth"})}
  }catch(err){say("Operacja nie powiodła się"+(err&&err.message?": "+err.message:"."))}
});
async function toggleRsvp(id){
  if(!session){say("Zaloguj się, aby dołączyć.");return}
  if(needProfile()){askNick();return}
  const mine=(rsvps[id]||[]).includes(uid);
  const res=mine?await sb.from("rsvps").delete().eq("ride_id",id).eq("user_id",uid):await sb.from("rsvps").insert({ride_id:id});
  if(res.error)throw res.error;
  await syncNow();
}

/* ---------- WIECZORYNKI: widok ---------- */
/* pasek wieczorynek (karuzela nazw z dystansem i czasem) */
let rcarKey="",rcarProg=false,rcarT=null;
const rideTag=(r,i)=>isUpcoming(r)?(i===firstUpcoming()?["Najbliższa","up"]:["Nadchodząca","up"]):["Archiwalna","old"];
function durTxt(min){min=Math.max(5,Math.round(min/5)*5);const h=Math.floor(min/60),m=min%60;return h?(h+" h"+(m?" "+m+" min":"")):m+" min"}
function rideStatsHtml(r){
  const pts=routeCache[r.id];
  if(pts===undefined)return '<span class="rst ld">📏 …</span>';
  if(!pts)return '<span class="rst mut">bez trasy</span>';
  const km=routeKm(pts);
  return '<span class="rst">📏 '+km.toFixed(1).replace(".",",")+' km</span><span class="rst">⏱ ≈ '+durTxt(km/paceKmh(r.pace)*60)+'</span>';
}
function ensureStats(i){
  const r=sorted[i];if(!r||!sb||(r.id in routeCache))return;
  getRoute(r.id).catch(()=>{routeCache[r.id]=false}).then(()=>{
    const el=document.querySelector('#rcar .rchip[data-id="'+r.id+'"] .rsts');if(el)el.innerHTML=rideStatsHtml(r);
  });
}
function rcarScrollTo(i,smooth){
  const c=$("rcar"),it=c&&c.children[i];if(!it)return;
  rcarProg=true;clearTimeout(rcarT);
  c.scrollTo({left:it.offsetLeft-c.offsetLeft-(c.clientWidth-it.offsetWidth)/2,behavior:smooth?"smooth":"auto"});
  rcarT=setTimeout(()=>{rcarProg=false},smooth?450:60);
}
function renderNav(){
  const n=sorted.length,c=$("rcar");
  $("prev").classList.toggle("off",!(cur>0));
  $("next").classList.toggle("off",!(cur>=0&&cur<n-1));
  if(!n){c.innerHTML="";rcarKey="";$("pos").textContent="";$("notice").classList.add("hide");$("nearest").classList.add("hide");return}
  const key=sorted.map(r=>r.id+r.when+r.title+(r.pace||"")+(r.edited_at||"")).join("|")+firstUpcoming();
  if(key!==rcarKey){
    rcarKey=key;
    c.innerHTML=sorted.map((r,i)=>{const [t,k]=rideTag(r,i),d=new Date(r.when);
      return '<div class="rchip'+(i===cur?' on':'')+'" data-i="'+i+'" data-id="'+esc(r.id)+'"><div class="rtag '+k+'">'+t+(r.edited_at?' · ⚠️ zmieniona':'')+'</div>'
       +'<div class="rname">'+esc(r.title)+'</div>'
       +'<div class="rwhen">'+esc(relDay(d)+" · "+hhmm(d))+'</div>'
       +'<div class="rsts">'+rideStatsHtml(r)+'</div></div>'}).join("");
    rcarScrollTo(cur,false);
  }else{
    [...c.children].forEach((x,i)=>x.classList.toggle("on",i===cur));
    if(!rcarProg){const it=c.children[cur];if(it&&Math.abs((it.offsetLeft-c.offsetLeft-(c.clientWidth-it.offsetWidth)/2)-c.scrollLeft)>4)rcarScrollTo(cur,true)}
  }
  for(let k=cur-2;k<=cur+2;k++)ensureStats(k);
  $("pos").textContent=(cur+1)+" z "+n;
  const fu=firstUpcoming(),nt=$("notice");
  if(fu<0){nt.textContent="Brak nadchodzących wieczorynek — pokazuję ostatnią archiwalną.";nt.classList.remove("hide")}
  else nt.classList.add("hide");
  const target=fu>=0?fu:n-1;
  $("nearest").classList.toggle("hide",cur===target);
  $("nearest").textContent=fu>=0?"↺ Wróć do najbliższej":"↺ Wróć do ostatniej";
}
$("rcar").addEventListener("scroll",()=>{
  if(rcarProg)return;
  clearTimeout(rcarT);
  rcarT=setTimeout(()=>{
    const c=$("rcar");if(!c.children.length)return;
    const mid=c.scrollLeft+c.clientWidth/2;let best=0,bd=1e9;
    [...c.children].forEach((x,i)=>{const d=Math.abs(x.offsetLeft-c.offsetLeft+x.offsetWidth/2-mid);if(d<bd){bd=d;best=i}});
    if(best!==cur)showRide(best);
  },140);
},{passive:true});
window.addEventListener("resize",()=>{if(curTab===1)rcarScrollTo(cur,false)});
$("rcar").addEventListener("click",e=>{const ch=e.target.closest(".rchip");if(ch&&+ch.dataset.i!==cur)showRide(+ch.dataset.i)});
/* ikony przycisków (SVG, kolor z currentColor) */
const SVG=p=>'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const ICON={
  gcal:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18" stroke="currentColor" stroke-width="2"/><path d="M8 2.5v4M16 2.5v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="12" y="18.6" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="9.5" font-weight="800" fill="currentColor">G</text></svg>',
  share:SVG('<path d="M12 3v12"/><path d="M7.5 7.5 12 3l4.5 4.5"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16"/>'),
  gpx:SVG('<path d="M12 3v12"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>'),
  edit:SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  addp:SVG('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M18 8v6M15 11h6"/>'),
  heart:SVG('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
  dup:SVG('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  del:SVG('<path d="M4 6.5h16"/><path d="M9.5 6.5V4.5h5v2"/><path d="M6 6.5l1 13a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5l1-13"/><path d="M10 10.5v6.5M14 10.5v6.5"/>')
};
function renderCard(){
  const box=$("ridecard"),r=sorted[cur];
  if(!r){box.innerHTML='<div class="notice">Brak zaplanowanych wieczorynek. '+(session?'Dodaj pierwszą w sekcji „➕ Nowa wieczorynka”.':'Zaloguj się, aby dodać pierwszą.')+'</div>';return}
  const g=rsvps[r.id]||[],goes=!!session&&g.includes(uid);
  let h='<div class="meta" style="margin-top:10px">🕖 '+esc(fmtWhen(r.when))+' · 📍 '+esc(r.place||"miejsce do ustalenia")+' · '+esc(r.pace||"")+'</div>'
   +changedHtml(r)
   +(r.note?'<div>'+esc(r.note)+'</div>':'')
   +'<div class="meta">Organizuje: '+(nicks[r.creator]?nk(r.creator):esc(r.owner||"?"))+'</div>'
   +(session?joinedHtml("ride"+r.id,g,"Na razie nikt się nie zapisał.","Jedzie","🚴 Jedzie"):'<div class="meta">Jedzie: <b>'+g.length+'</b></div>')
   +'<div class="acts">'
   +'<button class="b join'+(goes?' g':'')+'" data-act="join" data-id="'+esc(r.id)+'">'+(goes?'Rezygnuję':'Jadę!')+'</button>'
   +'<a class="ib" target="_blank" rel="noopener" href="'+esc(gcalUrl(r))+'" title="Dodaj do Google Kalendarza" aria-label="Dodaj do Google Kalendarza">'+ICON.gcal+'</a>'
   +'<button class="ib" data-act="share" data-id="'+esc(r.id)+'" title="Udostępnij" aria-label="Udostępnij">'+ICON.share+'</button>'
   +(routeCache[r.id]?'<button class="ib" data-act="gpx" data-id="'+esc(r.id)+'" title="Pobierz trasę GPX" aria-label="Pobierz trasę GPX">'+ICON.gpx+'</button>':'')
   +(canEdit(r)?'<button class="ib" data-act="edit" data-id="'+esc(r.id)+'" title="Edytuj" aria-label="Edytuj">'+ICON.edit+'</button><button class="ib del'+(r.creator===uid?'':' adm')+'" data-act="del" data-id="'+esc(r.id)+'" title="Usuń" aria-label="Usuń">'+ICON.del+'</button>':'')
   +'</div>';
  if(shareFor===r.id){
    const u=shareUrl(r),t=shareText(r);
    h+='<div class="sharebox"><b>Udostępnij:</b> <div class="row" style="margin-top:6px">'
     +'<a class="b" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(t+"\n"+u)+'">WhatsApp</a>'
     +'<a class="b" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(u)+'">Facebook</a>'
     +'<button class="b g" data-act="copy" data-id="'+esc(r.id)+'">Kopiuj link</button></div>'
     +'<div class="note" style="margin-top:6px">Facebook wstawia sam link — treść wiadomości dopisz ręcznie.</div></div>';
  }
  box.innerHTML=h;
}
function renderList(){
  const box=$("list");
  if(!sorted.length){box.innerHTML='<div class="note">Na razie pusto.</div>';return}
  const was=box.querySelector("details"),wasOpen=was?was.open:false;
  const item=(r,i)=>'<div class="item'+(i===cur?' cur':'')+'" data-i="'+i+'"><b>'+esc(r.title)+'</b>'+(r.edited_at?' <span title="zmieniono">⚠️</span>':'')+'<span class="note"> · '+esc(fmtWhen(r.when))+' · jedzie: '+(rsvps[r.id]||[]).length+'</span></div>';
  const up=[],old=[];
  sorted.forEach((r,i)=>(isUpcoming(r)?up:old).push(item(r,i)));
  old.reverse();
  const open=wasOpen||(cur>=0&&!isUpcoming(sorted[cur]));
  box.innerHTML=(up.length?'<h3>Nadchodzące</h3>'+up.join(""):'<div class="note">Brak nadchodzących wieczorynek.</div>')
   +(old.length?'<details'+(open?' open':'')+' style="margin-top:8px"><summary>Archiwalne ('+old.length+')</summary><div style="margin-top:6px">'+old.join("")+'</div></details>':"");
}

/* ---------- biblioteka tras (UI) ---------- */
function renderLibUi(){
  $("libbox").classList.toggle("hide",!session);
  // lista w Zaawansowane
  $("liblist").innerHTML=lib.length?lib.map(l=>'<div class="lib"><b>'+esc(l.title)+'</b> <span class="note">· '+(l.km!=null?Number(l.km).toFixed(1)+' km · ':'')+'autor: '+nk(l.creator)+'</span><div>'+esc(l.description)+'</div>'
    +'<div class="row" style="margin-top:6px"><button class="b g" data-l="show" data-id="'+esc(l.id)+'">🗺 Pokaż na mapie</button><button class="b g" data-l="gpx" data-id="'+esc(l.id)+'">⬇ GPX</button>'
    +((l.creator===uid||isAdmin)?'<button class="b g" data-l="del" data-id="'+esc(l.id)+'">Usuń</button>':'')+'</div></div>').join(""):'<div class="note">Biblioteka jest pusta. Dodaj pierwszą trasę poniżej.</div>';
  // lista wyboru w formularzu
  const s=$("rlib"),v=s.value;
  s.innerHTML='<option value="">— nie wybrano —</option>'+lib.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.title)+(l.km!=null?' — '+Number(l.km).toFixed(1)+' km':'')+'</option>').join("");
  s.value=v;
}
$("liblist").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-l]");if(!b)return;
  const id=b.dataset.id,l=lib.find(x=>x.id===id);if(!l)return;
  try{
    if(b.dataset.l==="show"){
      const pts=await getLibRoute(id);
      if(!pts){say("Nie udało się wczytać trasy.");return}
      advBase=thin(pts,500);advRev=false;advPts=advBase.slice();advRender(true);
      $("awi").textContent="Wczytano trasę z biblioteki: "+l.title+".";
      $("map2").scrollIntoView({behavior:"smooth",block:"center"});
    }else if(b.dataset.l==="gpx"){
      const pts=await getLibRoute(id);
      if(!pts){say("Nie udało się wczytać trasy.");return}
      say(saveFile(makeGpx(pts,l.title),slug(l.title)+".gpx","application/gpx+xml")?"Pobrano: "+slug(l.title)+".gpx":"Nie udało się pobrać pliku.");
    }else{
      askDelete("route",id);
    }
  }catch(err){say("Operacja nie powiodła się"+(err&&err.message?": "+err.message:"."))}
});
$("lf").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  const p=parseGpx(await f.text());
  if(p.length<2){libFile=null;$("linfo").textContent="Nie znaleziono punktów trasy w pliku GPX.";return}
  libFile=p;$("linfo").textContent="Wczytano: "+routeKm(p).toFixed(1)+" km. Uzupełnij nazwę i opis.";
};
$("ladd").onclick=async()=>{
  const inf=$("linfo"),t=$("lt").value.trim(),d=$("ld").value.trim();
  if(!session){inf.textContent="Zaloguj się.";return}
  if(needProfile()){askNick();return}
  if(!libFile){inf.textContent="Najpierw wybierz plik GPX.";return}
  if(t.length<3){inf.textContent="Podaj nazwę trasy (min. 3 znaki).";return}
  if(d.length<10){inf.textContent="Opis trasy jest obowiązkowy (min. 10 znaków) — bez niego trasy nie można dodać.";return}
  try{
    const res=await sb.from("routes").insert({title:t,description:d,km:+routeKm(libFile).toFixed(1),route:routeJson(libFile)});
    if(res.error)throw res.error;
    libFile=null;$("lf").value="";$("lt").value="";$("ld").value="";inf.textContent="";
    await syncNow();say("Trasa dodana do biblioteki ✔");
  }catch(e){inf.textContent="Nie udało się dodać: "+(e&&e.message?e.message:"błąd")}
};

