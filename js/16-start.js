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
}
[0,1,2,3].forEach(i=>{$("t"+i).onclick=()=>show(i)});
/* przesuwanie palcem w bok przełącza zakładki (poza mapą, karuzelą zaproszeń, kartkami zegara i polami) */
(()=>{
  let x0=0,y0=0,lock=0,dx=0,sec=null;
  const tabs=visTabs;
  const skip=t=>!!t.closest(".leaflet-container,.mycar.multi,.dcar,.rstrip,#fclock,#fclock2,input,select,textarea,.sheet,#welcome");
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
    if(go&&ni>=0&&ni<t.length){show(t[ni],go)}
    else{sec.style.transition="transform .2s,opacity .2s";sec.style.transform="";sec.style.opacity=""}
  },{passive:true});
  document.addEventListener("touchcancel",()=>{if(sec){sec.style.transform="";sec.style.opacity=""}lock=0},{passive:true});
})();

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
  if(!sb)return;
  const r=await sb.auth.signInWithPassword({email:$("ae").value.trim(),password:$("ap").value});
  $("ainfo").textContent=r.error?amsg(r.error):"";
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

/* ---------- start aplikacji ---------- */
(async()=>{
  $("rw").value=defaultWhen();
  $("wt").value=localIso(new Date(Math.ceil(Date.now()/36e5)*36e5));
  $("wdt").value=localIso(new Date()).slice(0,10);
  advRender(false);refreshUi();
  if(!window.supabase){$("dbnote").textContent="Nie udało się załadować biblioteki bazy danych — sprawdź połączenie z internetem i odśwież stronę.";bootFail(navigator.onLine===false?"📡 Brak połączenia z internetem":"📡 Nie udało się wczytać aplikacji");return}
  // 👁 podgląd gościa: osobny klient bez sesji (nie rusza logowania 👑 w innych kartach)
  // 🧪 ?konto=N: osobne miejsce na zalogowanie dla tej karty (kilka kont naraz w jednej przeglądarce)
  sb=PV_GUEST?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:"pv-guest"}})
    :KONTO?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:"konto-"+KONTO}})
    :window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  if(PV_GUEST||KONTO)pvBar();
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
    if(fromSnap)await loadTail(null,null);else await loadRemote(m?m[1]:null);
    $("dbnote").textContent="";bootDone();if(evh)evGo(evh[1]);
    if(fromSnap)setTimeout(()=>syncDelta().catch(()=>{}),0);
  }
  catch(e){$("dbnote").textContent="Nie udało się połączyć ze wspólną bazą (sprawdź internet i konfigurację Supabase).";bootFail()}
  ready=true;
  setInterval(()=>{if(!document.hidden){lastTick=Date.now();try{ftLiveSync()}catch(e){}tick().catch(()=>{})}},60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&ready&&Date.now()-lastTick>60000){lastTick=Date.now();tick().catch(()=>{})}});
})();
