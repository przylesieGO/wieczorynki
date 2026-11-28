/* ---------- zakładki ---------- */
let curTab=0;
function show(n,dir){
  [0,1,2,3].forEach(i=>{$("p"+i).classList.toggle("hide",i!==n);$("t"+i).classList.toggle("on",i===n)});
  const p=$("p"+n);p.style.transition="";p.style.transform="";p.style.opacity="";
  if(dir){p.classList.remove("slin-l","slin-r");void p.offsetWidth;p.classList.add(dir>0?"slin-r":"slin-l");setTimeout(()=>p.classList.remove("slin-l","slin-r"),300)}
  if(n===3&&curTab!==3)evStick=new Set();
  curTab=n;
  window.scrollTo({top:0});
  updateFab();
  if(n===0)renderCountdown();
  if(n===3)renderEvents();
  if(n===1)requestAnimationFrame(()=>rcarScrollTo(cur,false));
  setTimeout(()=>{if(n===1&&map1)map1.m.invalidateSize();if(n===2&&map2)map2.m.invalidateSize()},60);
  try{tdLay()}catch(e){}   // 🃏 talia kart w nagłówku pokazuje tę samą zakładkę (try: show() bywa wołane, zanim talia powstanie)
}
// 📍 wejście użytkownika w Imprezy (przycisk, przesunięcie, talia kart) — okienko „W okolicy” (KROK 114, js/08); bez evGo i wyników wyszukiwania
const tabIn=i=>{if(i===3&&typeof evAreaAsk==="function")setTimeout(evAreaAsk,350)};
[0,1,2,3].forEach(i=>{$("t"+i).onclick=()=>{show(i);tabIn(i)}});
/* przesuwanie palcem w bok przełącza zakładki (poza mapą, karuzelą zaproszeń, kartkami zegara i polami) */
(()=>{
  let x0=0,y0=0,lock=0,dx=0,sec=null;
  const tabs=visTabs;
  const skip=t=>!!t.closest("#tdeck,.leaflet-container,.mycar.multi,.dcar,.rstrip,#fclock,#fclock2,input,select,textarea,.sheet,#welcome");
  document.addEventListener("touchstart",e=>{
    lock=0;dx=0;sec=null;
    if(e.touches.length!==1||gearOpen||skip(e.target))return;
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;sec=$("p"+curTab);lock=-1;
  },{passive:true});
  document.addEventListener("touchmove",e=>{
    if(!lock||!sec)return;
    const mx=e.touches[0].clientX-x0,my=e.touches[0].clientY-y0;
    if(lock===-1){
      if(Math.abs(mx)<10&&Math.abs(my)<10)return;
      lock=Math.abs(mx)>Math.abs(my)*1.4?1:0;
      if(!lock)return;
    }
    const t=tabs(),i=t.indexOf(curTab),edge=(mx>0&&i===0)||(mx<0&&i===t.length-1);
    dx=mx;sec.style.transition="none";sec.style.transform="translateX("+(edge?mx*.25:mx*.9)+"px)";sec.style.opacity=String(1-Math.min(.4,Math.abs(mx)/900));
  },{passive:true});
  document.addEventListener("touchend",()=>{
    if(lock!==1||!sec){lock=0;return}
    const t=tabs(),i=t.indexOf(curTab),go=Math.abs(dx)>70?(dx<0?1:-1):0,ni=i+go;
    lock=0;
    if(go&&ni>=0&&ni<t.length){show(t[ni],go);tabIn(t[ni])}
    else{sec.style.transition="transform .2s,opacity .2s";sec.style.transform="";sec.style.opacity=""}
  },{passive:true});
  document.addEventListener("touchcancel",()=>{if(sec){sec.style.transform="";sec.style.opacity=""}lock=0},{passive:true});
})();
/* ---------- 🃏 talia kart zakładek (v274) — przełącznik w nagłówku obok nicku (zalogowani, min. 2 zakładki; css: .tdeck) ----------
   Karta z wierzchu = bieżąca zakładka; następne wystają z prawej, poprzednia z lewej. Przesunięcie palcem / strzałki ← → / klik w kartę.
   Puste karty (zakładka wyłączona) zostają w talii z przerywaną ramką; przesuwanie je pomija. Plakietki: 🟢 Zaproszenia = biorę udział,
   Imprezy 🔴 nieprzeczytane ⇄ 🟠 nadchodzące (14 dni) co 30 s; im głębiej karta, tym ciemniej. Podpowiedź gestu co 45 s do pierwszego przesunięcia. */
const TD_T=[[0,"Zaproszenia"],[3,"Imprezy"],[1,"Wieczorynki"],[2,"Zaawansowane"]],TD_HK="tdHintDone";
let tdA=0,tdPh=0;
(()=>{const hin=document.querySelector(".hdr .hin");if(!hin)return;
  const d=document.createElement("div");d.id="tdeck";d.className="tdeck";d.setAttribute("role","tablist");d.setAttribute("aria-label","Zakładki — przesuń palcem w bok");
  d.innerHTML=TD_T.map(([,t],k)=>'<button type="button" class="tdc" role="tab" data-td="'+k+'"><span class="tdl">'+t+'</span><b class="tdb tdz"></b></button>').join("");
  const h=document.createElement("div");h.id="tdhint";h.className="tdhint";h.setAttribute("aria-hidden","true");h.innerHTML='<span class="tdtr"></span>'+uiIcon("pointer");
  hin.appendChild(d);hin.appendChild(h);
  let sx=null,mv=false;
  const up=e=>{if(sx===null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>30){const g=dx<0?1:-1;tdGo(tdA+g,g);tdHintDone();try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}setTimeout(()=>mv=false,60)}};
  d.addEventListener("pointerdown",e=>{sx=e.clientX;mv=false});
  d.addEventListener("pointermove",e=>{if(sx!==null&&Math.abs(e.clientX-sx)>8)mv=true});
  d.addEventListener("pointerup",up);d.addEventListener("pointerleave",e=>{if(sx!==null)up(e)});d.addEventListener("pointercancel",()=>{sx=null});
  d.addEventListener("click",e=>{const b=e.target.closest(".tdc");if(!b||mv)return;const k=+b.dataset.td;if(k!==tdA)tdGo(k,0)});
  d.addEventListener("keydown",e=>{if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft")return;e.preventDefault();const g=e.key==="ArrowRight"?1:-1;tdGo(tdA+g,g);const t=d.querySelector(".tdc.top");if(t)t.focus()});
})();
const tdCards=()=>[...document.querySelectorAll("#tdeck .tdc")];
// liczby na plakietkach: Zaproszenia = te same co „biorę udział” w liczniku (#wstat), Imprezy = 🔔 nieprzeczytane / nadchodzące 14 dni
function tdCnt(i){
  if(i===0){const b=document.querySelector('#wstat [data-ws="part"]');return{p:b?(+b.textContent||0):0}}
  if(i===3&&typeof evs!=="undefined"){const now=Date.now(),s=evs.filter(e=>{const a=new Date(e.date_from).getTime(),z=new Date(e.date_to||e.date_from).getTime();return z>=now-864e5&&a<=now+14*864e5}).length;
    return{u:typeof evBellUn==="function"?evBellUn().length:0,s}}
  return{}}
function tdBadges(anim){tdCards().forEach((e,k)=>{const b=e.querySelector(".tdb"),i=TD_T[k][0],v=tabOk(i)?tdCnt(i):{};let c="",m=0;
  if(v.p){c="tdg";m=v.p}else if(v.u&&v.s){c=tdPh?"tdo":"tdr";m=tdPh?v.s:v.u}else if(v.u){c="tdr";m=v.u}else if(v.s){c="tdo";m=v.s}
  const cls="tdb "+(m?c:"tdz"),was=b.className;b.className=cls;b.textContent=m?(m>99?"99+":String(m)):"";
  if(anim&&m&&was!==cls){void b.offsetWidth;b.classList.add("pop")}
  e.setAttribute("aria-label",TD_T[k][1]+(tabOk(i)?"":" — wkrótce")+(m?(c==="tdr"?", nieprzeczytane: ":c==="tdo"?", nadchodzące: ":", bierzesz udział: ")+m:""))})}
function tdLay(){const E=tdCards(),n=E.length;if(!n)return;const k0=TD_T.findIndex(([i])=>i===curTab);if(k0>=0)tdA=k0;
  E.forEach((e,k)=>{e.classList.toggle("tdempty",!tabOk(TD_T[k][0]));e.classList.toggle("top",k===tdA);e.setAttribute("aria-selected",k===tdA?"true":"false");e.tabIndex=k===tdA?0:-1});
  tdBadges(false);
  requestAnimationFrame(()=>{const tw=E[tdA].offsetWidth,S=20;$("tdeck").style.width=(S+tw+(n-2)*S)+"px";
    for(let r=0;r<n;r++){const e=E[(tdA+r)%n],L=r===n-1,dp=L?1:r,x=r===0?S:L?0:S+tw-44+r*S;
      e.classList.toggle("tdleft",L);e.style.transformOrigin=L?"left center":"right center";
      e.style.transform="translateX("+x+"px) scale("+(r?Math.pow(.9,dp):1)+")";e.style.zIndex=L?9:10-r;
      e.style.opacity=r?Math.max(.5,1-dp*.17):1;e.style.setProperty("--tdd",[1,1,.75,.55][dp]||.55)}})}
// dir: 1 / -1 = przesunięcie (pomija puste karty), 0 = klik w kartę (pusta karta tylko się zatrzęsie — „Wkrótce”)
function tdGo(k,dir){const n=TD_T.length;
  for(let s=0;s<n;s++){const kk=((k+s*(dir||1))%n+n)%n,i=TD_T[kk][0];
    if(tabOk(i)){if(i!==curTab){show(i);tabIn(i)}else tdLay();return}
    if(!dir){const e=tdCards()[kk];e.classList.remove("wob");void e.offsetWidth;e.classList.add("wob");return}}}
function tdHintDone(){lsSet(TD_HK,"1");const h=$("tdhint");if(h)h.remove()}
const tdHint=()=>{const h=$("tdhint"),d=$("tdeck");if(!h||!d)return;if(lsGet(TD_HK)){h.remove();return}
  if(document.hidden||!session||$("hdr").classList.contains("compact")||document.documentElement.classList.contains("sheetlock"))return;
  h.classList.remove("go");d.classList.remove("nudge");void h.offsetWidth;h.classList.add("go");d.classList.add("nudge");
  setTimeout(()=>{h.classList.remove("go");d.classList.remove("nudge")},3000)};
tdLay();setTimeout(tdHint,4000);setInterval(tdHint,45000);
setInterval(()=>{if(!document.hidden)tdBadges(false)},5000);
setInterval(()=>{if(!document.hidden){tdPh^=1;tdBadges(true)}},30000);

/* ---------- logowanie ---------- */
let nickAskedFor="";
function setSession(s){
  const prevUid=uid;
  session=s;uid=s?s.user.id:"";
  if(!s||prevUid&&prevUid!==uid){snapClear();syncN=null}
  if(!s){me.nick=null;isAdmin=false;adminIds=[]}
}
const amsg=e=>({"Invalid login credentials":"Nieprawidłowy e-mail lub hasło.","User already registered":"Konto z tym adresem już istnieje — zaloguj się."}[e.message]||e.message);
$("login").onclick=async()=>{
  const b=$("login");if(!sb||b.disabled)return;b.disabled=true;   // jedno żądanie naraz (szybkie klikanie wysyłało kilka prób)
  try{const r=await sb.auth.signInWithPassword({email:$("ae").value.trim(),password:$("ap").value});
    $("ainfo").textContent=r.error?amsg(r.error):""}
  finally{b.disabled=false}
};
$("signup").onclick=async()=>{
  if(!sb)return;
  const r=await sb.auth.signUp({email:$("ae").value.trim(),password:$("ap").value});
  $("ainfo").textContent=r.error?amsg(r.error):(r.data.session?"Konto założone.":"Sprawdź skrzynkę i potwierdź adres e-mail.");
};

$("forgot").onclick=async()=>{
  if(!sb)return;
  const em=$("ae").value.trim(),inf=$("ainfo");
  if(!em){inf.textContent="Wpisz swój e-mail w polu powyżej, a potem kliknij „Nie pamiętam hasła”.";return}
  const r=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
  inf.textContent=r.error?("Nie udało się wysłać: "+r.error.message):"Wysłano wiadomość z linkiem do ustawienia nowego hasła. Link działa jednorazowo — kliknij go ręcznie w przeglądarce, na której używasz aplikacji.";
};
$("pwsave").onclick=async()=>{
  const p=$("pw1").value,inf=$("pwinfo");
  if(p.length<6){inf.textContent="Hasło musi mieć min. 6 znaków.";return}
  const r=await sb.auth.updateUser({password:p});
  if(r.error){inf.textContent="Nie udało się zapisać: "+r.error.message;return}
  pwMode=false;$("pw1").value="";inf.textContent="";
  try{history.replaceState(null,"",location.pathname)}catch(e){}
  refreshUi();say("Nowe hasło zapisane ✔ — jesteś zalogowany.");
};

if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));

/* ---------- ekran ładowania ---------- */
let bootTimer=0;
function bootDone(){
  clearTimeout(bootTimer);const b=$("boot");if(!b||b.classList.contains("out"))return;
  b.classList.add("out");setTimeout(()=>{b.remove()},350);
}
function bootFail(msg){
  const b=$("boot");if(!b||b.classList.contains("out"))return;
  b.classList.add("stop");$("boottx").classList.add("hide");
  $("bootmsg").textContent=msg||(navigator.onLine===false?"📡 Brak połączenia z internetem":"📡 Słabe połączenie — dane jeszcze się wczytują");
  $("booterr").classList.remove("hide");
}
$("bootretry").onclick=()=>location.reload();
$("bootskip").onclick=()=>bootDone();
bootTimer=setTimeout(()=>bootFail(),8000);

/* ---------- 📱 pasek „Otwórz w przeglądarce” (Facebook / Messenger / Instagram / WebView) ----------
   W przeglądarce wbudowanej nie da się zainstalować aplikacji, logowanie potrafi zniknąć po zamknięciu, a pobieranie GPX
   i linki do Telegrama bywają zablokowane. Android: przycisk otwiera Chrome (intent); iPhone: kopiowanie linku + podpowiedź.
   ✕ chowa pasek do końca tej sesji karty. Kliknięcia liczą się w APP DEMO (id: iaopen, iacopy, iax). */
let iaOff=false;   // ✕ chowa pasek tylko na tym ekranie — po wejściu do demo / odświeżeniu wraca (nie zapamiętujemy w telefonie)
function iaBar(){
  const k=inAppKind(),b=$("iabar");if(!b)return;
  if(!k||iaOff){b.classList.add("hide");b.innerHTML="";return}
  const ua=navigator.userAgent||"",and=/Android/.test(ua),ios=/iPhone|iPad|iPod/.test(ua);
  const app={fb:"Facebooku",msg:"Messengerze",ig:"Instagramie"}[k]||"aplikacji";
  const u=location.href.split("#")[0],intent="intent://"+u.replace(/^https?:\/\//,"")+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(u)+";end";
  b.innerHTML='<div class="iain">'+uiIcon("globe")+'<div class="iatx"><b>Otwierasz w '+app+'</b><span>W przeglądarce działa pełna wersja: instalacja na ekranie, stałe logowanie, pobieranie tras.'
    +(ios?' Albo stuknij ⋯ → „Otwórz w Safari”.':'')+'</span></div><button type="button" class="iax" id="iax" aria-label="Ukryj">✕</button></div>'
    +'<div class="iabtns">'+(and?'<a class="b" id="iaopen" href="'+esc(intent)+'">Otwórz w Chrome</a>':'')
    +'<button type="button" class="b'+(and?' w':'')+'" id="iacopy">'+uiIcon("copy")+' Kopiuj link</button></div>';
  b.classList.remove("hide");
}
$("iabar").addEventListener("click",e=>{
  if(e.target.closest("#iax")){iaOff=true;iaBar();return}
  if(e.target.closest("#iacopy")){const u=location.href.split("#")[0];
    const done=()=>say(/iPhone|iPad|iPod/.test(navigator.userAgent)?"Link skopiowany — wklej go w Safari":"Link skopiowany — wklej go w przeglądarce");
    try{navigator.clipboard.writeText(u).then(done,()=>prompt("Skopiuj link:",u))}catch(err){prompt("Skopiuj link:",u)}}
});
iaBar();

/* ---------- start aplikacji ---------- */
(async()=>{
  $("rw").value=defaultWhen();
  $("wt").value=localIso(new Date(Math.ceil(Date.now()/36e5)*36e5));
  $("wdt").value=localIso(new Date()).slice(0,10);
  advRender(false);refreshUi();
  // 🎮 tryb demo: plik js/19 wczytywany tylko tutaj (ta sama wersja ?v= co ten plik), klient z danymi w pamięci zamiast bazy
  if(DEMO){const v=((document.querySelector('script[src*="16-start"]')||{}).src||"").split("?")[1]||"";
    await new Promise(res=>{const s=document.createElement("script");s.src="js/19-demo-gosc.js"+(v?"?"+v:"");s.onload=res;s.onerror=res;document.head.appendChild(s)})}
  if(DEMO&&typeof demoClient!=="function"){bootFail("📡 Nie udało się wczytać trybu demo");return}
  if(!DEMO&&!window.supabase){$("dbnote").textContent="Nie udało się załadować biblioteki bazy danych — sprawdź połączenie z internetem i odśwież stronę.";bootFail(navigator.onLine===false?"📡 Brak połączenia z internetem":"📡 Nie udało się wczytać aplikacji");return}
  // 👁 podgląd gościa: osobny klient bez sesji (nie rusza logowania 👑 w innych kartach)
  // 🧪 ?konto=N: osobne miejsce na zalogowanie dla tej karty (kilka kont naraz w jednej przeglądarce)
  sb=DEMO?demoClient():PV_GUEST?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:"pv-guest"}})
    :KONTO?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:"konto-"+KONTO}})
    :window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  if(PV_GUEST||KONTO||DEMO)pvBar();
  try{const r=await sb.auth.getSession();setSession(r.data.session)}catch(e){}
  if(RECOVERY&&session)pwMode=true;
  if(HASH_EXPIRED&&!session){$("ainfo").textContent="Link z maila wygasł albo został już użyty. Wpisz e-mail i kliknij „Nie pamiętam hasła”, żeby wysłać nowy.";try{history.replaceState(null,"",location.pathname)}catch(e){}}
  refreshUi();
  sb.auth.onAuthStateChange((ev,s)=>{
    if(ev==="PASSWORD_RECOVERY"){pwMode=true;setTimeout(refreshUi,0)}
    const nid=s?s.user.id:"";
    if(nid===uid){session=s;return}
    setSession(s);
    if(ready)setTimeout(()=>loadRemote().catch(()=>{}),0);
  });
  const m=/#ride=([0-9a-f-]{36})/i.exec(location.hash||"");
  const rp=/#report=([0-9a-f-]{36})/i.exec(location.hash||"");if(rp){repHash=rp[1];try{history.replaceState(null,"",location.pathname)}catch(e){}}
  const evh=/#event=([0-9a-f-]{36})/i.exec(location.hash||"");if(evh){try{history.replaceState(null,"",location.pathname)}catch(e){}}
  try{
    const fromSnap=!!session&&!m&&snapLoad();   // ⚡ ostatni stan z telefonu — od razu na ekranie
    if(fromSnap){const p=loadTail(null,null);bootDone();await p}   // ⚡ stan z telefonu już narysowany — ekran ładowania znika od razu
    else await loadRemote(m?m[1]:null);
    $("dbnote").textContent="";bootDone();if(evh)evGo(evh[1]);
    if(fromSnap)setTimeout(()=>syncDelta().catch(()=>{}),0);
  }
  catch(e){$("dbnote").textContent="Nie udało się połączyć ze wspólną bazą (sprawdź internet i konfigurację Supabase).";bootFail()}
  ready=true;
  setInterval(()=>{if(!document.hidden){lastTick=Date.now();try{ftLiveSync()}catch(e){}tick().catch(()=>{})}},60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&ready&&Date.now()-lastTick>60000){lastTick=Date.now();tick().catch(()=>{})}});
})();

/* ---------- 🔙 v328: ostrzeżenie przed wyjściem przyciskiem „wstecz” (Android, gest „wstecz”) ----------
   Na wierzchu historii leży „strażnik” (pushState). Pierwsze „wstecz” zdejmuje go i pokazuje komunikat; drugie w ciągu 3 s wychodzi z aplikacji.
   Strażnik zakładany przy dotknięciu / klawiszu — Chrome pomija wpisy historii dodane bez działania użytkownika. */
(()=>{if(!history.pushState)return;
  let asking=false,leaving=false;
  const arm=()=>{if(asking||leaving)return;try{if(!(history.state&&history.state.pgGuard))history.pushState({pgGuard:1},"",location.href)}catch(e){}};
  ["pointerdown","keydown"].forEach(ev=>addEventListener(ev,arm,{capture:true,passive:true}));
  addEventListener("popstate",e=>{if(e.state&&e.state.pgGuard)return;if(asking||leaving)return;
    // okno na środku ekranu (askOk, js/01) zamiast dymku; strażnik wraca od razu, żeby nic się nie wyjdzie bez zgody
    asking=true;try{history.pushState({pgGuard:1},"",location.href)}catch(x){}
    askOk("Wyjść z aplikacji?\n\nNaciśnij „Wyjdź”, żeby zamknąć aplikację, albo „Zostań”, żeby zostać.","Wyjdź",false,"Zostań").then(ok=>{asking=false;if(!ok)return;leaving=true;history.go(-2);setTimeout(()=>{leaving=false},3000)})});
})();
