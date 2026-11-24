const SUPABASE_URL="https://onhdnsjtszrbvlmqfgvi.supabase.co";
const SUPABASE_KEY="sb_publishable_ms2InCwXXoczxIqwkuAm1Q_HPS4uZv6";

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const R=6371,rad=x=>x*Math.PI/180;
function dist(a,b){const dl=rad(b.lat-a.lat),dn=rad(b.lon-a.lon);const h=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function brg(a,b){const y=Math.sin(rad(b.lon-a.lon))*Math.cos(rad(b.lat));const x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lon-a.lon));return (Math.atan2(y,x)*180/Math.PI+360)%360}
function localIso(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())}
function fmtWhen(s){try{return new Date(s).toLocaleString("pl-PL",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}catch(e){return s}}
const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
const dayDiff=d=>Math.round((startOfDay(d)-startOfDay(new Date()))/864e5);
const hhmm=d=>pad(d.getHours())+":"+pad(d.getMinutes());
function relDay(d){const n=dayDiff(d);return n===0?"Dziś":n===1?"Jutro":n===2?"Pojutrze":d.toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"})}
function relWhen(s){const d=new Date(s);return relDay(d)+" o "+hhmm(d)}
function slug(s){return String(s||"trasa").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ł/g,"l").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"trasa"}
// odpowiedź na zaproszenie, które w międzyczasie odwołano / zaczęło się / zmieniło (lista jeszcze się nie odświeżyła):
// baza odrzuca zapis (reguły dostępu albo brak zaproszenia) — zamiast technicznego komunikatu ludzki tekst i od razu odświeżenie
const SAY_GONE=/row-level security policy for table "(want_joins|want_declines|want_invitees)"|violates foreign key constraint "want_(joins|declines|invitees)_want_id/;
// 📱 okienko przerysowane po kliknięciu opcji nie skacze na górę (2026-11-24): zapamiętaj przewinięcie przewijanych części
// (lista, okienko) i przywróć po przerysowaniu — tylko gdy okienko było już otwarte (świeże otwarcie startuje od góry)
function shKeep(p){
  if(!p||p.classList.contains("hide"))return ()=>{};
  const S=[".bslist",".sheetbox",".bsbox",".sgpc"].map(c=>{const e=p.querySelector(c);return e?[c,e.scrollTop,e.scrollLeft]:null}).filter(x=>x&&(x[1]||x[2]));
  return ()=>S.forEach(([c,t,l])=>{const e=p.querySelector(c);if(e){if(t)e.scrollTop=t;if(l)e.scrollLeft=l}});
}
// opakowanie funkcji rysującej okienko: function renderX(){…} → renderX=shWrap(renderX,"xsheet") na końcu pliku
const shWrap=(fn,id,cond)=>function(...a){const r=(!cond||cond(...a))?shKeep(document.getElementById(id)):()=>{};const x=fn.apply(this,a);r();return x};
function say(t){if(SAY_GONE.test(String(t))){t="To zaproszenie zostało odwołane albo już się zaczęło — odświeżam listę.";setTimeout(()=>{try{if(typeof syncNow==="function")syncNow()}catch(e){}},50)}
  const m=$("toast");if(document.body.classList.contains("wfopen")){const f=document.querySelector(".wffoot");if(f)document.body.style.setProperty("--wffh",f.offsetHeight+"px")}m.textContent=t;m.classList.remove("hide");clearTimeout(say.t);say.t=setTimeout(()=>m.classList.add("hide"),6000)}
function routeKm(p){let s=0;for(let i=1;i<p.length;i++)s+=dist(p[i-1],p[i]);return s}
function paceKmh(p){const m=/(\d+)/.exec(p||"");return m?+m[1]:24}
const NICK_RE=/^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż ._-]{2,20}$/;

/* ---------- GPX ---------- */
function parseGpx(txt){
  const d=new DOMParser().parseFromString(txt,"application/xml");
  if(d.getElementsByTagName("parsererror").length)return [];
  let n=[...d.getElementsByTagName("trkpt")];
  if(!n.length)n=[...d.getElementsByTagName("rtept")];
  return n.map(e=>({lat:+e.getAttribute("lat"),lon:+e.getAttribute("lon"),ele:+((e.getElementsByTagName("ele")[0]||{}).textContent||0)})).filter(p=>isFinite(p.lat)&&isFinite(p.lon));
}
function thin(a,max){if(a.length<=max)return a;const s=(a.length-1)/(max-1);return Array.from({length:max},(_,i)=>a[Math.round(i*s)])}
const routeJson=pts=>JSON.stringify(thin(pts,300).map(p=>[+p.lat.toFixed(5),+p.lon.toFixed(5),Math.round(p.ele||0)]));
function parseRoute(str){
  try{const p=JSON.parse(str).map(a=>({lat:+a[0],lon:+a[1],ele:+a[2]||0})).filter(p=>isFinite(p.lat)&&isFinite(p.lon));return p.length>=2?p:false}catch(e){return false}
}
function makeGpx(a,name){
  const x=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Wieczorynki rowerowe" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>'+x(name||"Trasa")+'</name><trkseg>\n'+a.map(p=>'<trkpt lat="'+p.lat.toFixed(6)+'" lon="'+p.lon.toFixed(6)+'"><ele>'+Math.round(p.ele||0)+'</ele></trkpt>').join("\n")+'\n</trkseg></trk>\n</gpx>\n';
}
function saveFile(data,filename,type){
  try{
    const url=URL.createObjectURL(new Blob([data],{type}));
    const a=document.createElement("a");a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    return true;
  }catch(e){return false}
}

/* ---------- Google Calendar / udostępnianie ---------- */
function gcalUrl(r){
  const f=d=>d.toISOString().replace(/[-:]|\.\d{3}/g,"");
  const st=new Date(r.when),en=new Date(st.getTime()+2*36e5);
  const q=new URLSearchParams({action:"TEMPLATE",text:"🚲 "+(r.title||"Wieczorynki"),dates:f(st)+"/"+f(en),details:((r.pace||"")+(r.note?". "+r.note:"")).trim(),location:r.place||""});
  return "https://calendar.google.com/calendar/render?"+q.toString();
}
const shareUrl=r=>location.origin+location.pathname+"#ride="+r.id;
const shareText=r=>"🚲 "+r.title+"\n🕖 "+fmtWhen(r.when)+(r.place?"\n📍 "+r.place:"")+"\nJedziesz z nami?";

/* ---------- wiatr i analiza ---------- */
const NAMES=["północy","północnego wschodu","wschodu","południowego wschodu","południa","południowego zachodu","zachodu","północnego zachodu"];
const windLabel=d=>"z "+NAMES[Math.round(d/45)%8]+" ("+Math.round(d)+"°)";
function tipText(ws,h1,h2,total,reversible){
  if(ws<5)return "Wiatr słaby — kierunek jazdy nie ma większego znaczenia.";
  const thr=ws*total*0.15;
  if(h1>h2+thr)return "✅ Pierwsza połowa trasy pod wiatr, powrót z wiatrem — dobry układ: siły masz na początku, a wracasz z wiatrem w plecy.";
  if(h2>h1+thr)return reversible?"⚠️ Powrót będzie pod wiatr. Rozważ „Odwróć kierunek”, żeby wiatr pomagał na końcu.":"⚠️ Druga połowa trasy jest pod wiatr — miejcie zapas sił na powrót.";
  return "Wiatr rozkłada się mniej więcej równo na obie połowy trasy.";
}
function analyze(pts,wf,ws,bs,reversible){
  const D=[];for(let i=1;i<pts.length;i++)D.push(dist(pts[i-1],pts[i]));
  const sum=D.reduce((a,b)=>a+b,0);
  let acc=0,gain=0,tsec=0,head=0,h1=0,h2=0;const segs=[];
  for(let i=1;i<pts.length;i++){
    const d=D[i-1],h=ws*Math.cos(rad(brg(pts[i-1],pts[i])-wf));
    tsec+=d/Math.max(6,bs-0.55*h)*3600;
    if(h>3)head+=d;
    if(acc<sum/2)h1+=h*d;else h2+=h*d;
    acc+=d;
    const dz=pts[i].ele-pts[i-1].ele;if(dz>0)gain+=dz;
    const r=ws?h/ws:0;
    segs.push({col:r>0.35?"head":r<-0.35?"tail":"side"});
  }
  return {segs,total:sum,gain,tsec,headPct:sum?Math.round(head/sum*100):0,ws,back:ws>=5&&h2>h1+ws*sum*0.15,tip:tipText(ws,h1,h2,sum,reversible)};
}
function statsHtml(an){
  const m=Math.round(an.tsec/60);
  return [["Dystans",an.total.toFixed(1)+" km"],["Przewyższenie",Math.round(an.gain)+" m"],["Czas (szac.)",Math.floor(m/60)+" h "+pad(m%60)+" min"],["Pod wiatr",an.ws>0?an.headPct+"% trasy":"—"]].map(([a,b])=>'<div class="st"><b>'+b+'</b><span>'+a+'</span></div>').join("");
}
const windCache={};
async function getWxJ(lat,lon){
  const key=lat.toFixed(2)+","+lon.toFixed(2);
  if(!windCache[key]||Date.now()-windCache[key].t>6e5){
    const u="https://api.open-meteo.com/v1/forecast?latitude="+lat.toFixed(3)+"&longitude="+lon.toFixed(3)+"&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code&daily=sunrise,sunset&wind_speed_unit=kmh&timezone=auto&past_days=30&forecast_days=16";
    windCache[key]={t:Date.now(),p:fetch(u).then(r=>{if(!r.ok)throw new Error("http "+r.status);return r.json()})};
  }
  try{return await windCache[key].p}catch(e){delete windCache[key];throw e}
}
async function getWind(lat,lon,when){
  const J=await getWxJ(lat,lon);
  const H=J.hourly,off=(J.utc_offset_seconds||0)*1000;
  const k=new Date(when.getTime()+off+30*60000).toISOString().slice(0,13)+":00";
  const i=H.time.indexOf(k);
  if(i<0){
    const err=new Error(k<H.time[0]?"Brak danych o wietrze dla tak dawnego terminu (dostępne ok. 30 dni wstecz).":"Prognoza wiatru jest dostępna do 16 dni naprzód — wróć bliżej terminu.");
    err.code="range";throw err;
  }
  return {dir:H.wind_direction_10m[i],speed:H.wind_speed_10m[i],gust:H.wind_gusts_10m[i],temp:H.temperature_2m?H.temperature_2m[i]:null,rain:H.precipitation_probability?H.precipitation_probability[i]:null,code:H.weather_code?H.weather_code[i]:null,time:H.time[i].slice(11,16)};
}

/* ---------- mapa (Leaflet + OpenStreetMap) ---------- */
const COL={head:"#d64545",side:"#e0b83a",tail:"#2a9d5c",plain:"#2f7fd1"};
// Leaflet wczytywany dopiero przy pierwszej mapie, z sumą kontrolną (integrity) — oficjalne hashe Leaflet 1.9.4
const L_SRC={css:["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css","sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w=="],
  js:["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js","sha512-BwHfrr4c9kmRkLw6iXFdzcdWV/PGkVgiIyIWLLlTSXzWQzxuSg4DiQUCpauz/EWjgk5TYQqX/kvn9pG1NpYfqg=="]};
let lLoad=null;
function needL(){
  if(window.L)return Promise.resolve(true);
  if(lLoad)return lLoad;
  lLoad=new Promise(res=>{
    if(!document.getElementById("lcss")){const c=document.createElement("link");c.id="lcss";c.rel="stylesheet";c.href=L_SRC.css[0];c.integrity=L_SRC.css[1];c.crossOrigin="anonymous";document.head.appendChild(c)}
    const s=document.createElement("script");s.src=L_SRC.js[0];s.integrity=L_SRC.js[1];s.crossOrigin="anonymous";
    s.onload=()=>res(!!window.L);
    s.onerror=()=>{s.remove();lLoad=null;res(false)};   // brak sieci / zła suma — następna mapa spróbuje ponownie
    setTimeout(()=>{if(!window.L)lLoad=null;res(!!window.L)},20000);
    document.head.appendChild(s);
  });
  return lLoad;
}
function makeMap(elId){
  if(!window.L)return null;
  try{
    const m=L.map($(elId),{scrollWheelZoom:false});
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m);
    m.setView([52.23,21.01],11);
    return {m,g:L.layerGroup().addTo(m),p:L.layerGroup().addTo(m)};
  }catch(e){return null}
}
function drawRoute(mp,pts,segs,fit){
  mp.g.clearLayers();
  const ll=pts.map(p=>[p.lat,p.lon]),o={weight:5,opacity:.9,lineCap:"round"};
  if(!segs)L.polyline(ll,Object.assign({color:COL.plain},o)).addTo(mp.g);
  else{
    let run=[ll[0]],col=segs[0].col;
    segs.forEach((s,i)=>{
      if(s.col!==col){L.polyline(run,Object.assign({color:COL[col]},o)).addTo(mp.g);run=[ll[i]];col=s.col}
      run.push(ll[i+1]);
    });
    L.polyline(run,Object.assign({color:COL[col]},o)).addTo(mp.g);
  }
  L.circleMarker(ll[0],{radius:8,color:"#fff",weight:2,fillColor:"#1f7a4d",fillOpacity:1}).addTo(mp.g).bindTooltip("Start");
  if(fit)mp.m.fitBounds(L.latLngBounds(ll),{padding:[24,24]});
}
function setArrow(id,wf,ws){
  const el=$(id);
  if(wf==null){el.classList.add("hide");return}
  el.classList.remove("hide");
  el.innerHTML='<svg viewBox="0 0 40 40" width="38" height="38" style="transform:rotate('+((wf+180)%360)+'deg)"><path d="M20 3 L29 22 L22 20 L22 37 L18 37 L18 20 L11 22 Z" fill="var(--acc)"/></svg><div>'+Math.round(ws)+' km/h</div>';
}

/* ---------- miejscowości wzdłuż trasy (OpenStreetMap / Overpass) ---------- */
const placeCache={};
// o = {ms: limit czasu na serwer, post: wysyłka POST (długie zapytania)}
async function overpass(q,o){
  o=o||{};let last;
  for(const ep of ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"]){
    const ac=typeof AbortController!=="undefined"?new AbortController():null,tm=ac?setTimeout(()=>ac.abort(),o.ms||15000):0;
    try{const r=o.post?await fetch(ep,Object.assign({method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"data="+encodeURIComponent(q)},ac?{signal:ac.signal}:{}))
        :await fetch(ep+"?data="+encodeURIComponent(q),ac?{signal:ac.signal}:{});
      if(!r.ok)throw new Error(r.status===429?"serwer zajęty (429)":r.status===504?"serwer przeciążony (504)":"błąd serwera "+r.status);
      const j=await r.json();clearTimeout(tm);
      if(j&&j.remark&&/error|timed out|out of memory/i.test(j.remark))throw new Error(/timed out/i.test(j.remark)?"przekroczony czas na serwerze":"błąd zapytania");
      return j}catch(e){clearTimeout(tm);last=e&&e.name==="AbortError"?new Error("brak odpowiedzi"):e}
  }
  throw last;
}
async function placesAlong(pts,key){
  if(placeCache[key])return placeCache[key];
  let s=90,w=180,n=-90,e=-180;
  pts.forEach(p=>{s=Math.min(s,p.lat);n=Math.max(n,p.lat);w=Math.min(w,p.lon);e=Math.max(e,p.lon)});
  const bb=[s-0.03,w-0.05,n+0.03,e+0.05].map(x=>x.toFixed(4)).join(",");
  const J=await overpass('[out:json][timeout:20];node["place"~"^(city|town|village|suburb|hamlet)$"]["name"]('+bb+');out;');
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+dist(pts[i-1],pts[i]));
  const lim={city:4,town:3,village:1.5,suburb:1.2,hamlet:1},out=[];
  (J.elements||[]).forEach(el=>{
    if(el.lat==null||!el.tags)return;
    let best=1e9,bi=0;const o={lat:el.lat,lon:el.lon};
    for(let i=0;i<pts.length;i++){const d=dist(pts[i],o);if(d<best){best=d;bi=i}}
    if(best<=(lim[el.tags.place]||1))out.push({name:el.tags.name,type:el.tags.place,lat:el.lat,lon:el.lon,km:cum[bi]});
  });
  out.sort((a,b)=>a.km-b.km);
  const seen=new Set(),res=out.filter(p=>{if(seen.has(p.name))return false;seen.add(p.name);return true});
  placeCache[key]=res;return res;
}
const PICON={city:"city",town:"city",village:"pin",suburb:"pin",hamlet:"pin"},PTYPE={city:"miasto",town:"miasto",village:"wieś",suburb:"dzielnica",hamlet:"osada"};
function renderPlaces(boxId,mp,list,err){
  const box=$(boxId);
  if(mp)mp.p.clearLayers();
  if(err){box.innerHTML='<b>Miejscowości na trasie</b><div class="note">Nie udało się pobrać danych z OpenStreetMap. Spróbuj za chwilę.</div>';box.classList.remove("hide");return}
  if(!list.length){box.classList.add("hide");return}
  const kmt=k=>k<10?k.toFixed(1).replace(".",","):String(Math.round(k));
  box.innerHTML='<details class="plds"><summary>'+uiIcon("pin")+' Miejscowości na trasie <span class="plcnt">'+list.length+'</span></summary><div class="pllist">'
    +list.map(p=>'<div class="plit"><span class="plic">'+uiIcon(PICON[p.type]||"pin")+'</span><span class="plnm">'+esc(p.name)+'<small>'+(PTYPE[p.type]||"")+'</small></span><span class="plkm">'+(p.km<0.3?'start':kmt(p.km)+' km')+'</span></div>').join("")
    +'</div><div class="note" style="margin-top:6px">Kilometr od startu wzdłuż trasy · rozwinięta lista pokazuje punkty na mapie · dane: OpenStreetMap.</div></details>';
  box.classList.remove("hide");
  const d=box.querySelector("details");
  d.addEventListener("toggle",()=>{
    if(!mp)return;
    mp.p.clearLayers();
    if(d.open)list.forEach(p=>L.circleMarker([p.lat,p.lon],{radius:5,color:"#fff",weight:1.5,fillColor:"#7a4fd1",fillOpacity:1}).addTo(mp.p).bindTooltip(p.name+" · "+kmt(p.km)+" km"));
  });
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-eye]");if(!b)return;
  const i=$(b.dataset.eye),show=i.type==="password";
  i.type=show?"text":"password";
  b.innerHTML=uiIcon(show?"eyeoff":"eye");
  b.setAttribute("aria-label",show?"Ukryj hasło":"Pokaż hasło");
});
/* ✅ okno potwierdzenia w stylu aplikacji (zamiast systemowego confirm(), który część przeglądarek blokuje — wtedy nic się nie działo).
   askOk(tekst, napis przycisku, czerwony?) → Promise<true/false>. Pierwszy akapit (do „\n\n”) to pytanie, reszta — opis pod nim. Enter = potwierdź, Esc / tło = anuluj. */
function askOk(msg,ok,danger){
  return new Promise(res=>{
    const old=document.getElementById("cfm");if(old)old.remove();
    const [t,...rest]=String(msg).split("\n\n");
    const d=document.createElement("div");d.id="cfm";d.className="sheet cfm";d.setAttribute("role","alertdialog");d.setAttribute("aria-modal","true");
    d.innerHTML='<div class="sheetbox cfmbox"><div class="cfmt">'+esc(t)+'</div>'+(rest.length?'<div class="cfmd">'+esc(rest.join("\n\n"))+'</div>':'')
      +'<div class="cfmb"><button type="button" class="cfmno">Anuluj</button><button type="button" class="cfmok'+(danger?' bad':'')+'">'+esc(ok||"OK")+'</button></div></div>';
    const kd=e=>{if(e.key==="Escape"||e.key==="Enter"){e.preventDefault();e.stopPropagation();done(e.key==="Enter")}};
    const done=v=>{document.removeEventListener("keydown",kd,true);d.remove();res(v)};
    d.addEventListener("click",e=>{e.stopPropagation();if(e.target===d||e.target.closest(".cfmno"))done(false);else if(e.target.closest(".cfmok"))done(true)});
    document.addEventListener("keydown",kd,true);document.body.appendChild(d);d.querySelector(".cfmok").focus();
  });
}

// 📱 przeglądarka wbudowana w aplikację (Facebook, Messenger, Instagram, inne WebView) — pasek „Otwórz w przeglądarce” (js/16), statystyki demo (js/19)
function inAppKind(){const ua=navigator.userAgent||"";
  return /Messenger|Orca-Android/.test(ua)?"msg":/FBAN|FBAV|FB_IAB|FBIOS/.test(ua)?"fb":/Instagram/.test(ua)?"ig":/; wv\)/.test(ua)?"wv":""}
