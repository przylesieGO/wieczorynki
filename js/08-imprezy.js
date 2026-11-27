/* ---------- 🏁 imprezy masowe — MVP (KROK 40; założenia właściciela 2026-11-15 20:58) ---------- */
let evGeoOk=false,evExtraOk=false,evOk=false,evs=[],evDist={},evPart={},evOpen="",evFlt="",evArchOpen=false,ef=null;
const EV_BIKE={gravel:["🪨","Gravel","Jadę"],road:["🛣","Szosa","Jadę"],mtb:["⛰","MTB","Jadę"],ebike:["⚡","E-bike","Jadę"],any:["🚲","Dowolny rower","Jadę"],run:["🏃","Bieg","Biegnę"],walk:["🚶","Marsz","Idę"],tri:["🏊","Triathlon","Startuję"],other:["🏅","Inne","Biorę udział"]};
const evVerb=b=>(EV_BIKE[b]||EV_BIKE.other)[2];
let evLikes={};
let evPub=false,evCnt={};   // 👤 imprezy dla gości (KROK 61): dane z events_pub(), evCnt = liczba zapisanych (bez nicków)
/* ---------- 🏁 NOWA / ZMIENIONA / ZAPROSZENIE (KROK 54; makieta mak_imprezy_*.png, właściciel 22:33) ----------
   „przeczytane” w tym urządzeniu (localStorage.evSeen: b = pierwsze uruchomienie, m = otwarte karty);
   po otwarciu karta zostaje na górze do wyjścia z zakładki (evStick), oznaczenie znika po 14 dniach */
let evNewOk=false,evInvOk=false,evInv=[],evStick=new Set();
let evPriceOk=false,evImpLeft=null;
let evLoaded=false,evLoading=false;   // 🏁 czy listy imprez są wczytane (np. zakładka włączona dopiero po starcie z pamięci telefonu)   // 💰 ceny i 🔗 „Wypełnij z linku” (KROK 55; evImpLeft = ile pobrań zostało dziś, null = brak/nie admin)
const EV_WIN=14*864e5;
function evSeenGet(){try{const o=JSON.parse(localStorage.getItem("evSeen")||"null");if(o&&o.b){o.m=o.m||{};return o}}catch(e){}
  const o={b:Date.now(),m:{}};try{localStorage.setItem("evSeen",JSON.stringify(o))}catch(e){}return o}
function evSeenMark(ids){const o=evSeenGet(),t=Date.now();ids.forEach(id=>{o.m[id]=t});for(const k in o.m)if(t-o.m[k]>60*864e5)delete o.m[k];try{localStorage.setItem("evSeen",JSON.stringify(o))}catch(e){}}
function evState(e){
  if(!session||evPast(e))return null;
  const o=evSeenGet(),seen=o.m[e.id]||0,now=Date.now();
  const inv=evInv.find(x=>x.event_id===e.id&&x.user_id===uid);
  if(inv){const t=Date.parse(inv.created_at);if(t>seen&&now-t<EV_WIN)return {k:"inv",at:t,by:inv.invited_by,msg:inv.msg}}
  if(!evNewOk)return null;
  const c=Date.parse(e.created_at||0)||0,ch=e.changed_at?Date.parse(e.changed_at):0;
  if(e.created_by!==uid&&c>o.b&&c>seen&&now-c<EV_WIN)return {k:"new",at:c};
  if(ch&&e.changed_by!==uid&&ch>o.b&&ch>seen&&now-ch<EV_WIN&&ch-c>5*6e4)return {k:"chg",at:ch,what:e.changed_what||[]};
  return null}
const evBadge=st=>'<span class="evp evp-n">'+(st.k==="inv"?'ZAPROSZENIE od '+esc(nicks[st.by]||"ktoś"):st.k==="new"?'NOWA':'ZMIENIONA')+'</span>';
const evInfo=st=>st.k==="inv"&&st.msg?'<span class="evinfo">💬 „'+esc(st.msg)+'”</span>':st.k==="chg"?'<span class="evinfo">✏️ zmieniono'+(st.what.length?': '+esc(st.what.join(", ")):'')+' · '+esc(agoTxt(new Date(st.at).toISOString()))+'</span>':'';
// kto widzi zakładkę Imprezy (tylko ich można zaprosić) — jak ev_access w bazie
function evAccess(id){const f=flags.tab_events;if(!f||adminIds.includes(id)||f.state==="all")return true;return f.state==="testers"&&(testerIds.has(id)||supers.has(id))}
async function evInvite(eid,ids,msg){
  const m=String(msg||"").trim().slice(0,120)||null,rows=ids.map(u=>({event_id:eid,user_id:u,msg:m}));
  const r=await sb.from("event_invites").upsert(rows,{onConflict:"event_id,user_id",ignoreDuplicates:true});if(r.error)throw r.error;
  const t=new Date().toISOString();ids.forEach(u=>{if(!evInv.some(x=>x.event_id===eid&&x.user_id===u))evInv.push({event_id:eid,user_id:u,invited_by:uid,msg:m,created_at:t})})}
function evGo(id){const e=evs.find(x=>x.id===id);if(!e||!tabOk(3))return;show(3);evOpen=id;
  if(evState(e)){evSeenMark([id]);evStick.add(id)}if(evPast(e))evArchOpen=true;renderEvents();renderBell();
  setTimeout(()=>{const c=document.querySelector('#p3 [data-ev="tog"][data-id="'+id+'"]');if(c)c.scrollIntoView({block:"center",behavior:"smooth"})},80)}
// 🔔 sekcja „Imprezy”: zaproszenia, nowe, zmienione + „przyjął(ęła) Twoje zaproszenie”
function evBellItems(){
  if(!session||!evOk||!tabOk(3))return [];
  const L=[];evs.forEach(e=>{const st=evState(e);if(st)L.push({e,st,at:st.at})});
  evInv.filter(x=>x.invited_by===uid).forEach(x=>{const e=evs.find(y=>y.id===x.event_id);if(!e||evPast(e))return;
    const pp=(evPart[e.id]||[]).find(y=>y.user_id===x.user_id),t=pp&&Date.parse(pp.created_at||0);
    if(!t||t<Date.parse(x.created_at)||Date.now()-t>EV_WIN)return;L.push({e,st:{k:"acc",u:x.user_id},at:t})});
  return L.sort((a,b)=>b.at-a.at)}
const evBellSeen=()=>Math.max(+(lsGet("evBell")||0),evSeenGet().b);
const evKey=x=>"ev:"+x.e.id+"|"+x.at;
const evBellUn=()=>{const s=evBellSeen(),D=bsDone();return evBellItems().filter(x=>x.at>s&&!D.has(evKey(x)))};
function evBellRow(x,un){const e=x.e,st=x.st,ago=esc(agoTxt(new Date(x.at).toISOString()));
  const t=st.k==="inv"?'<b>'+esc(nicks[st.by]||"Ktoś")+'</b> zaprasza Cię: <b>'+esc(e.name)+'</b><div class="w">'+esc(evDates(e))+' · '+ago+'</div>'+(st.msg?'<div class="w">💬 „'+esc(st.msg)+'”</div>':'')
    :st.k==="new"?'Nowa impreza: <b>'+esc(e.name)+'</b><div class="w">'+esc(evDates(e))+(e.created_by&&nicks[e.created_by]?' · dodał(a) '+esc(nicks[e.created_by]):'')+' · '+ago+'</div>'
    :st.k==="chg"?'Zmieniona: <b>'+esc(e.name)+'</b><div class="w">'+esc((st.what||[]).join(", ")||"szczegóły")+' · '+ago+'</div>'
    :'<b>'+esc(nicks[st.u]||"Ktoś")+'</b> '+(genders[st.u]==="K"?'przyjęła':'przyjął')+' Twoje zaproszenie — jedzie: <b>'+esc(e.name)+'</b><div class="w">'+ago+'</div>';
  return '<div class="nit'+(un?' new':'')+'" data-evb="'+esc(e.id)+'"><div class="ic">'+({inv:"✉️",new:"🏁",chg:"✏️",acc:"✅"}[st.k])+'</div><div class="tx">'+t+'</div>'+(un?bsMk(evKey(x)):'')+'</div>'}
const todayIso=()=>localIso(new Date()).slice(0,10);
const evEnd=e=>e.date_to||e.date_from;
const evPast=e=>evEnd(e)<todayIso();
const evDays=e=>Math.round((new Date(e.date_from+"T12:00")-new Date(todayIso()+"T12:00"))/864e5);
const evMine=e=>(evPart[e.id]||[]).find(x=>x.user_id===uid);
const evN=e=>evPub?(evCnt[e.id]||0):(evPart[e.id]||[]).length;   // 👥 ile z nas jedzie (gość: sama liczba z bazy)
const evCanEdit=e=>!!session&&(e.created_by===uid||isAdmin);
function evDates(e){const a=new Date(e.date_from+"T12:00"),b=e.date_to&&e.date_to!==e.date_from?new Date(e.date_to+"T12:00"):null;
  const f=d=>d.toLocaleDateString("pl-PL",{day:"numeric",month:"numeric"});
  return b?(f(a)+"–"+f(b)+"."+b.getFullYear()):a.toLocaleDateString("pl-PL",{day:"numeric",month:"numeric",year:"numeric"})}
function evReg(e){
  if(evPast(e))return "";
  if(e.reg_closed||(e.reg_until&&e.reg_until<todayIso()))return '<span class="evp evp-x">🔒 zapisy zakończone</span>';
  if(e.reg_until){const n=Math.round((new Date(e.reg_until+"T12:00")-new Date(todayIso()+"T12:00"))/864e5);
    return '<span class="evp evp-r">📝 zapisy do '+esc(new Date(e.reg_until+"T12:00").toLocaleDateString("pl-PL",{day:"numeric",month:"numeric"}))+(n<=14?' (za '+n+' '+plf(n,["dzień","dni","dni"])+')':'')+'</span>'}
  return '<span class="evp evp-r">📝 zapisy trwają</span>';
}
function evKmLine(e){const g={},o=[];(evDist[e.id]||[]).forEach(d=>{if(!g[d.bike]){g[d.bike]=[];o.push(d.bike)}g[d.bike].push(String(+d.km).replace(".",","))});
  return o.filter(k=>EV_BIKE[k]).map(k=>EV_BIKE[k][0]+" "+g[k].join(" / ")).join(" · ")+(Object.keys(g).length?" km":"")}
// ⏱ limit czasu w minutach ↔ tekst: „72” = 72 h, „6:30” / „6,5” = 6 h 30 min, „45 min” = 45 min
function limParse(t){t=String(t||"").trim().toLowerCase().replace(",",".");if(!t)return null;let m;
  if((m=t.match(/^(\d{1,3}):([0-5]\d)$/)))return +m[1]*60+ +m[2];
  if((m=t.match(/^(\d{1,4})\s*(min|m)$/)))return +m[1];
  if((m=t.match(/^(\d{1,3}(?:\.\d+)?)\s*(h|godz\.?)?$/)))return Math.round(+m[1]*60);
  return NaN}
const limTxt=n=>{n=+n;const h=Math.floor(n/60),m=n%60;return (h?h+" h":"")+(h&&m?" ":"")+(m?m+" min":"")};
const limEdit=n=>n==null?"":n%60?Math.floor(n/60)+":"+String(n%60).padStart(2,"0"):String(n/60);
const elevTxt=n=>Number(n).toLocaleString("pl-PL")+" m";
function evWhen(e){const n=evDays(e);if(n>1)return "🏁 start za "+n+" "+plf(n,["dzień","dni","dni"]);if(n===1)return "🏁 start jutro!";if(n===0)return "🏁 start dziś!";if(!evPast(e))return "🚴 trwa";return ""}
const evWhenCls=e=>{const n=evDays(e);return n<=0?" now":n<=7?" soon":""};
// ✏️ ostatnia zmiana imprezy — kto, kiedy, co (dane z KROKU 54; decyzja właściciela 2026-11-17 10:25: wariant A, bez pełnej historii)
function evLastChg(e){
  if(!e.changed_at)return "";
  const d=new Date(e.changed_at),p=n=>String(n).padStart(2,"0"),now=new Date();
  const when=p(d.getDate())+"."+p(d.getMonth()+1)+(d.getFullYear()!==now.getFullYear()?"."+d.getFullYear():"")+", "+p(d.getHours())+":"+p(d.getMinutes());
  const who=e.changed_by===uid?"Ty":e.changed_by&&nicks[e.changed_by]?nicks[e.changed_by]:"ktoś";
  const what=(e.changed_what||[]).join(", ");
  return '<div class="note" style="margin-top:2px">Ostatnia zmiana: '+esc(who)+' · '+esc(when)+(what?' · '+esc(what):'')+'</div>';
}
function evCard(e){
  const P=evPart[e.id]||[],D=evDist[e.id]||[],mine=evMine(e),open=evOpen===e.id,past=evPast(e),d=new Date(e.date_from+"T12:00"),st=evState(e);
  const head='<button type="button" class="evh" data-ev="tog" data-id="'+esc(e.id)+'"><span class="evdt"><b>'+d.getDate()+'</b><i>'+esc(d.toLocaleDateString("pl-PL",{month:"short"}).replace(".","").toUpperCase())+'</i></span><span class="evm"><span class="evn">'+esc(e.name)+'</span>'
   +'<span class="evl">'+(e.place?'📍 '+esc(e.place)+' · ':'')+esc(evDates(e))+'</span>'+(D.length?'<span class="evl">'+esc(evKmLine(e))+'</span>':'')
   +(st?evInfo(st):'')
   +'<span class="evps">'+(st?evBadge(st):'')+(evKm(e)!=null&&!past?'<span class="evp evp-d">📍 '+(evKm(e)<1?'na miejscu':nearKm(evKm(e))+' km')+'</span>':'')+(evWhen(e)&&!past?'<span class="evp evp-t'+evWhenCls(e)+'">'+evWhen(e)+'</span>':'')+(evN(e)?'<span class="evp evp-u">👥 '+evN(e)+' z nas</span>':'')+evReg(e)+(mine?'<span class="evp evp-m">✓ '+esc(evVerb(((D.find(x=>x.id===mine.distance_id))||{}).bike).toLowerCase())+'</span>':'')+((evLikes[e.id]||[]).length?'<span class="evp evp-l">❤ '+(evLikes[e.id]||[]).length+'</span>':'')+(e.delete_req_at?'<span class="evp evp-x">🗑 prośba o usunięcie</span>':'')+'</span></span><span class="evch">'+(open?'⌃':'⌄')+'</span></button>';
  if(!open)return '<div class="ev'+(mine?' mine':'')+(past?' past':'')+(st?' nw':'')+'">'+head+'</div>';
  const rows=D.map(x=>{const on=P.filter(p=>p.distance_id===x.id).map(p=>p.user_id),me=mine&&mine.distance_id===x.id;
    return '<div class="evd'+(me?' me':'')+'"><div class="evdl"><b>'+EV_BIKE[x.bike][0]+' '+esc(x.name||EV_BIKE[x.bike][1]+' '+String(+x.km).replace(".",","))+'</b><span>'+EV_BIKE[x.bike][1]+' · '+String(+x.km).replace(".",",")+' km'+(on.length?' · '+on.length+' z nas':'')+'</span>'
     +(x.elev!=null||x.limit_min!=null?'<span class="evdx2">'+(x.elev!=null?'<i>📈 '+elevTxt(x.elev)+'</i>':'')+(x.limit_min!=null?'<i>⏱ limit '+limTxt(x.limit_min)+'</i>':'')+'</span>':'')
     +(on.length?'<div class="evdn">'+favFirst(on).map(id=>nk(id)).join(" ")+'</div>':'')+'</div>'
     +(past||evPub?'':'<button type="button" class="b '+(me?'g':'')+' evj" data-ev="'+(me?'leave':'join')+'" data-id="'+esc(e.id)+'" data-d="'+esc(x.id)+'">'+(me?'✓ ':'')+esc(evVerb(x.bike))+'</button>')+'</div>'}).join("");
  const noD=P.filter(p=>!p.distance_id||!D.some(x=>x.id===p.distance_id)).map(p=>p.user_id);
  const myInv=evInv.find(x=>x.event_id===e.id&&x.user_id===uid),sent=evInv.filter(x=>x.event_id===e.id&&x.invited_by===uid).map(x=>x.user_id).filter(id=>nicks[id]);
  return '<div class="ev open'+(mine?' mine':'')+(past?' past':'')+(st?' nw':'')+'">'+head+'<div class="evb">'
   +(myInv?'<div class="evl2">✉️ Zaprasza Cię '+nk(myInv.invited_by)+(myInv.msg?' — „'+esc(myInv.msg)+'”':'')+'</div>':'')
   +(sent.length?'<div class="evl2">👥 '+(genders[uid]==="K"?'Zaprosiłaś':'Zaprosiłeś')+': '+sent.map(id=>nk(id)+(P.some(p=>p.user_id===id)?' <span class="note">jedzie</span>':'')).join(" ")+'</div>':'')
   +(e.url?'<div class="evl2">🌐 <a href="'+esc(e.url)+'" target="_blank" rel="noopener">'+esc(e.url.replace(/^https?:\/\/(www\.)?/i,"").replace(/\/$/,"").slice(0,48))+'</a></div>':'')
   +(e.price_info?'<div class="evl2">💰 '+esc(e.price_info)+'</div>':'')
   +(e.note?'<div class="evl2">💬 '+esc(e.note)+'</div>':'')
   +(e.delete_req_at?'<div class="evdel">🗑 '+esc(nicks[e.delete_req_by]||"Autor")+' prosi o usunięcie tej imprezy — decyduje admin.'
       +(isAdmin?'<div class="evdelb"><button type="button" class="b" style="background:var(--bad)" data-ev="del" data-id="'+esc(e.id)+'">Usuń</button><button type="button" class="b g" data-ev="delno" data-id="'+esc(e.id)+'">Odrzuć prośbę</button></div>'
         :e.delete_req_by===uid?'<div class="evdelb"><button type="button" class="b g" data-ev="delno" data-id="'+esc(e.id)+'">Cofnij prośbę</button></div>':'')+'</div>':'')
   +'<div class="bsgrp">Dystanse'+(past||evPub?'':' — wybierz i kliknij')+'</div>'+(rows||'<div class="note">Brak dystansów.</div>')
   +(evPub&&!past?'<div class="note cdnote">Żeby się zapisać i zobaczyć, kto z nas jedzie, <button type="button" class="lnk" data-ev="login">zaloguj się ›</button></div>':'')
   +(noD.length?'<div class="evl2">👥 Bez dystansu: '+noD.map(id=>nk(id)).join(" ")+'</div>':'')
   +(mine&&!past?'<button type="button" class="lnk evlv" data-ev="leave" data-id="'+esc(e.id)+'">Rezygnuję</button>':'')
   +(evPub?'':'<div class="acts evacts">'+(evInvOk&&!past?'<button class="ib" data-ev="inv" data-id="'+esc(e.id)+'" title="Zaproś na imprezę" aria-label="Zaproś na imprezę">'+ICON.addp+'</button>':'')+'<button class="ib evlike'+((evLikes[e.id]||[]).includes(uid)?' on':'')+'" data-ev="like" data-id="'+esc(e.id)+'" title="Lubię" aria-label="Lubię">'+ICON.heart+((evLikes[e.id]||[]).length?'<span class="lkn">'+(evLikes[e.id]||[]).length+'</span>':'')+'</button><button class="ib" data-ev="gcal" data-id="'+esc(e.id)+'" title="Google Kalendarz" aria-label="Google Kalendarz">'+ICON.gcal+'</button><button class="ib" data-ev="share" data-id="'+esc(e.id)+'" title="Udostępnij" aria-label="Udostępnij">'+ICON.share+'</button>'
   +('<button class="ib" data-ev="dup" data-id="'+esc(e.id)+'" title="Duplikuj (np. kolejna edycja)" aria-label="Duplikuj">'+ICON.dup+'</button>')
   +(evCanEdit(e)?'<button class="ib" data-ev="edit" data-id="'+esc(e.id)+'" title="Edytuj" aria-label="Edytuj">'+ICON.edit+'</button>'+((isAdmin||!e.delete_req_at)?'<button class="ib del'+(e.created_by===uid&&!isAdmin?'':' adm')+'" data-ev="'+(isAdmin?'del':'delreq')+'" data-id="'+esc(e.id)+'" title="'+(isAdmin?'Usuń':'Poproś o usunięcie')+'" aria-label="Usuń">'+ICON.del+'</button>':''):'')+'</div>')
   +(e.created_by&&nicks[e.created_by]?'<div class="note" style="margin-top:6px">Dodał(a): '+esc(nicks[e.created_by])+'</div>':'')
   +evLastChg(e)+'</div></div>';
}
/* ---------- 📍 „W okolicy” (KROK 43; decyzja właściciela 2026-11-16 10:56) ----------
   promień 50/100/200 km; odległość w linii prostej od „Mojej miejscowości” (⚙️, zapamiętana w tym telefonie)
   albo od GPS (tylko na tę wizytę); imprezy bez punktu na mapie nie przechodzą przez filtr */
// 📍 v270: „W okolicy” = Moja okolica (promień z plakietki, KROK 104), domyślnie włączone; wyłączone = cała Polska
let evNearOn=(()=>{try{return localStorage.getItem("evArea")!=="0"}catch(e){return true}})();
const homeGet=()=>{try{const h=JSON.parse(localStorage.getItem("home")||"null");return h&&isFinite(h.lat)&&isFinite(h.lon)?h:null}catch(e){return null}};
const gpsGet=()=>{try{const h=JSON.parse(sessionStorage.getItem("gpsOrigin")||"null");return h&&isFinite(h.lat)&&isFinite(h.lon)?h:null}catch(e){return null}};
const originGet=()=>gpsGet()||areaCur();   // środek okolicy (albo podgląd innej) — js/08 niżej
const evHasGeo=e=>e.lat!=null&&e.lon!=null&&isFinite(e.lat)&&isFinite(e.lon);
const evKm=e=>{const o=originGet();return o&&evHasGeo(e)?dist({lat:o.lat,lon:o.lon},{lat:+e.lat,lon:+e.lon}):null};
const nearKm=k=>k<10?String(Math.round(k*10)/10).replace(".",","):String(Math.round(k));
const nearOk=e=>{if(!evNearOn||!evGeoOk||!areaKm())return true;const k=evKm(e);return k!=null&&k<=areaKm()};
function evNearHtml(){
  if(!evGeoOk||!evNearOn)return "";
  const o=originGet(),g=gpsGet(),a=areaCur();
  return '<div class="evnear"><div class="evno">'+(g?'📡':a.peek?'👁':'📍')+' <b>'+esc(o.name)+' · '+areaKmTxt(a.km)+'</b>'+(g?' · <button type="button" class="lnk" data-evo="home">wróć do: '+esc(a.name)+'</button>':'')
       +' · <button type="button" class="lnk" data-evo="area">zmień okolicę</button>'+(g?'':' · <button type="button" class="lnk" data-evo="gps">📡 moja lokalizacja</button>')
       +' · <button type="button" class="lnk" data-evnear="1">pokaż dalej ›</button></div></div>';
}
// wyszukiwanie miejsc w OpenStreetMap (Nominatim) — tylko Polska
async function geoSearch(q){
  q=String(q||"").trim();if(q.length<2)return [];
  try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=pl&accept-language=pl&addressdetails=1&q="+encodeURIComponent(q));if(!r.ok)return null;
    return (await r.json()).map(x=>{const a=x.address||{},c=a.city||a.town||a.village||a.hamlet||a.municipality||x.name||"",reg=a.state?String(a.state).replace(/^województwo /,""):"";
      return {name:(x.name&&x.name!==c?x.name+", ":"")+c,full:[x.name&&x.name!==c?x.name:"",c,a.county||"",reg].filter(Boolean).join(", "),lat:+x.lat,lon:+x.lon}}).filter(x=>x.name&&isFinite(x.lat))}
  catch(e){return null}
}
// 📍 Moja okolica (KROK 104): środek = Moja miejscowość (w profilu, ~2 km), promień 5–50 km (0 = cała Polska),
// ulubione miejscowości i podgląd innej okolicy (tylko w tej wizycie; powiadomienia zawsze z Mojej okolicy)
let areaPeek=null,homeRes=[],homeMsg="",hmMode="peek",areaSaveT=0;
const areaDef=()=>{const c=window.areaDefC||{};return {name:c.name||"Pułtusk",lat:isFinite(c.lat)?+c.lat:52.70,lon:isFinite(c.lon)?+c.lon:21.08,def:true}};
const areaKmDef=()=>{const v=+window.areaDefKm;return v>=5&&v<=50?v:20};
// co jest poprawnym promieniem: dokładnie to, co dopuszcza baza (CHECK na profile_private.area_km):
// 0 = cała Polska albo pełne 5–50 km. Suwak ustawia co 1 km (od v308 u wszystkich), więc np. 36 km jest poprawne.
const areaKmOk=v=>v!=null&&isFinite(+v)&&Number.isInteger(+v)&&(+v===0||(+v>=5&&+v<=50));
const areaKm=()=>{let v=null;if(session&&profExOk)v=myPriv?myPriv.area_km:null;else try{const x=localStorage.getItem("areaKm");v=x==null?null:+x}catch(e){}
  return areaKmOk(v)?+v:areaKmDef()};
const areaHome=()=>{if(session&&myPriv&&myPriv.city&&myPriv.city_lat!=null)return {name:myPriv.city,lat:+myPriv.city_lat,lon:+myPriv.city_lon};return homeGet()||areaDef()};
const areaCur=()=>Object.assign({},areaPeek||areaHome(),{km:areaKm(),peek:!!areaPeek});
// v338: opisy pod suwakami i przy trasie zwinięte — rozwija je „?” przy nagłówku (oszczędza miejsce)
const arQ=(id,l)=>'<button type="button" class="arq" data-hm="q" data-q="'+id+'" aria-expanded="false" aria-controls="'+id+'" aria-label="'+l+'">?</button>';
const AREA_INFO='<div class="note" style="margin-top:8px">Promień decyduje, co widzisz i o czym dostajesz powiadomienia: otwarte zaproszenia, sygnały „Mam ochotę” i imprezy z tej odległości od Twojej miejscowości. Większy promień — więcej propozycji, ale też z dalszych miejsc. Zaproszenia prywatne i grupowe do Ciebie dochodzą zawsze.</div>';   // ℹ️ opis suwaka promienia (okno „Moja okolica” i ekran startowy js/23)
const areaIn=(a,lat,lon)=>lat==null||lon==null||!isFinite(+lat)||!isFinite(+lon)||!a.km||dist({lat:a.lat,lon:a.lon},{lat:+lat,lon:+lon})<=a.km;
const inArea=(lat,lon)=>areaIn(areaCur(),lat,lon);
const areaKmTxt=k=>k?k+" km":"cała Polska";
// wartość suwaka → km
const arKmFromSl=v=>+v>=51?0:Math.max(5,Math.round(+v));   // 🛰 v308: u wszystkich płynnie co 1 km (5–50), 51 = cała Polska
const arSlVal=k=>k?Math.max(5,Math.min(50,k)):51;
const areaFavs=()=>{let a;if(session&&profExOk)a=myPriv&&myPriv.area_places;else try{a=JSON.parse(localStorage.getItem("areaFavs")||"[]")}catch(e){a=[]}
  return Array.isArray(a)?a.filter(x=>x&&x.name&&isFinite(x.lat)&&isFinite(x.lon)):[]};
const areaRound=x=>Math.round(x/0.02)*0.02;
async function areaSave(patch){
  if(session&&profExOk){myPriv=Object.assign({},myPriv||{},patch);
    const r=await sb.from("profile_private").upsert(Object.assign({user_id:uid,updated_at:new Date().toISOString()},patch),{onConflict:"user_id"}).select(PRIV_COLS).maybeSingle();
    if(r.error){say("Nie udało się zapisać okolicy — spróbuj za chwilę.");return false}myPriv=r.data;return true}
  try{if("area_km" in patch)localStorage.setItem("areaKm",String(patch.area_km));if("area_places" in patch)localStorage.setItem("areaFavs",JSON.stringify(patch.area_places))}catch(e){}
  return true}
function areaSetHome(x){const h={name:x.name,lat:areaRound(x.lat),lon:areaRound(x.lon)};
  try{localStorage.setItem("home",JSON.stringify(h));sessionStorage.removeItem("gpsOrigin")}catch(e){}
  savePrivCity(h);if(myPriv)Object.assign(myPriv,{city:h.name,city_lat:h.lat,city_lon:h.lon});areaPeek=null;areaChanged()}
function areaChanged(){renderAreaChip();try{renderWants()}catch(e){}try{if(curTab===3)renderEvents()}catch(e){}
  try{if(!$("bellsheet").classList.contains("hide"))renderBellSheet()}catch(e){}try{if(!$("rbsheet").classList.contains("hide")&&!rb.open&&!rb.add)renderRb()}catch(e){}}
// 📍 v270: zaproszenie w okolicy — obszar ukrywa tylko otwarte zaproszenia innych; moje, te, na które jadę, prywatne i grupowe — zawsze
const wAreaOk=w=>w.user_id===uid||w.visibility==="private"||!!w.group_id||(joins[w.id]||[]).includes(uid)||inArea(w.place_lat,w.place_lon);
// 🔔 v283 (KROK 108): „Powiadamiaj mnie o” — otwarte zaproszenia i sygnały innych aktywności są ukryte u każdego, kto wybrał aktywności;
// nie wybrał (acts = null) → wszystko; 👑 widzi wszystko; actPeek = podgląd z lupy (do zamknięcia aplikacji)
let actPeek=false;
const myActs=()=>!actPeek&&session&&myPriv&&Array.isArray(myPriv.acts)&&myPriv.acts.length&&!isSuper(uid)?myPriv.acts:null;
const actOk=k=>{const A=myActs();return !A||A.includes(k||"bike")};
const wActShow=w=>w.user_id===uid||w.visibility==="private"||!!w.group_id||(joins[w.id]||[]).includes(uid)||(typeof wInvMe==="function"&&wInvMe(w))||actOk(w.activity);
// podpowiedź pod listą (ten sam wiersz co „Poza okolicą”): „Nie widzisz zaproszeń o: Rower · zmień ›”
function actHidHtml(keys,what){const K=[...new Set(keys.map(k=>k||"bike"))];if(!K.length)return "";
  return '<div class="note arout">'+uiIcon("heart")+' Nie widzisz '+what+' o: '+esc(K.map(k=>{const a=actOf(k);return a.name_many||a.name}).join(", "))
    +' · <button type="button" class="lnk" data-stgo="acts">zmień w Powiadamiaj mnie o ›</button></div>'}
// podgląd okolicy wybranego miejsca (z lupy: wynik spoza Mojej okolicy)
function areaReveal(lat,lon,name){if(lat==null||lon==null||inArea(lat,lon))return "";areaPeek={name:name||"miejsce",lat:+lat,lon:+lon};areaChanged();return "Pokazuję okolicę: "+areaPeek.name+" (podgląd — ✕ na plakietce wraca)."}
// punkty do obrazka i liczników: zaproszenia (nadchodzące, z miejscem), sygnały z dziś, imprezy nadchodzące
function areaPts(){const P=[],now=Date.now();
  (wants||[]).forEach(w=>{if(w.place_lat==null||!w.starts_at||Date.parse(w.starts_at)<now-3*36e5)return;P.push({k:"w",lat:+w.place_lat,lon:+w.place_lon,nm:[w.place,w.place_city].filter(Boolean).join(" · "),lab:arLab(w.place_city||w.place)})});
  try{sigListAll().forEach(x=>{if(x.lat!=null)P.push({k:"s",lat:+x.lat,lon:+x.lon})})}catch(e){}
  (evs||[]).forEach(e=>{if(evHasGeo(e)&&!evPast(e))P.push({k:"e",lat:+e.lat,lon:+e.lon,nm:e.place||"",lab:arLab(e.place)})});
  return P}
function areaCount(a){const c={w:0,s:0,e:0,out:0};areaPts().forEach(p=>{if(areaIn(a,p.lat,p.lon))c[p.k]++;else c.out++});return c}
const areaCntTxt=c=>[c.w?c.w+" "+plf(c.w,["zaproszenie","zaproszenia","zaproszeń"]):"",c.s?c.s+" "+plf(c.s,["sygnał","sygnały","sygnałów"]):"",c.e?c.e+" "+plf(c.e,["impreza","imprezy","imprez"]):""].filter(Boolean).join(" · ")||"na razie nic";
// 🛰 v308: RADAR okolicy — krąg obszaru zawsze tej samej wielkości, suwak „przybliża/oddala” punkty (na żywo).
// Kierunki i odległości prawdziwe (północ u góry). Na radarze: miejscowości z OpenStreetMap (które — suwak wielkości z dwoma uchwytami),
// miejscowości z imprezami (zawsze podpisane), a rzeczy spoza radaru przy brzegu z odnośnikiem: nazwa · km.
const AR_W=430,AR_H=290,AR_CX=215,AR_CY=145,AR_R0=75,AR_RB=105,AR_RM=101;   // R0 = promień okolicy, RB = brzeg radaru, RM = do niego dociągamy dalekie punkty
const arSlP=(v,mn,mx)=>(((+v)-mn)/(mx-mn)).toFixed(4);   // 0–1: pozycja suwaka radaru (wypełnienie skali)
// v335: suwak miejscowości z dwoma uchwytami — klasy wielkości (tys. mieszkańców): 0 = od 100 tys. … 6 = do 2 tys.; lewy uchwyt chowa największe, prawy dokłada mniejsze
const AR_CLS=[100,50,20,10,5,2,0],AR_CLN=AR_CLS.length-1,AR_CLT=["100+","50","20","10","5","2","wsie"];
const AR_DIR=["płn.","płn.-wsch.","wsch.","płd.-wsch.","płd.","płd.-zach.","zach.","płn.-zach."];
const arLab=t=>{t=String(t||"").split(/[,·(]/)[0].trim();return t.length>2?t:""};
const arCut=(t,n)=>t.length>n?t.slice(0,n-1)+"…":t;
let arLiveKm=null,arRaf=0;
// v336: płynnie — uchwyty stoją między kreskami, granice wielkości liczone pośrodku (skala logarytmiczna), miejscowości dochodzą pojedynczo
const AR_UP=[2000,100,50,20,10,5,2];   // tys.: górna granica przy lewym uchwycie w punktach skali (0 = bez granicy)
const arLog=(A,x)=>{const i=Math.max(0,Math.min(A.length-2,Math.floor(x))),t=x-i,a=Math.max(.5,A[i]),b=Math.max(.5,A[i+1]);return Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*t)};
const arPopUp=x=>x<=.01?Infinity:arLog(AR_UP,x),arPopLow=x=>x>=AR_CLN-.01?0:arLog(AR_CLS,x);
const arTys=v=>(v>=10?String(Math.round(v)):String(Math.round(v*10)/10).replace(".",","))+" tys.";
const arRng=()=>{let r=[0,4];try{const x=localStorage.getItem("arRng"),d=localStorage.getItem("arDens");   // dawny suwak gęstości (arDens 0–7) → zbliżony przedział
    if(x){const v=x.split("-").map(Number);if(v.length===2&&v.every(isFinite))r=v}else if(d!=null&&d!==""&&isFinite(+d))r=[0,+d<1?3:+d<4?4:+d<6?5:6]}catch(e){}
  r=r.map(n=>Math.max(0,Math.min(AR_CLN,+n)));return r[0]>r[1]?[r[1],r[0]]:r};
const arRngTxt=([lo,hi])=>{const a=lo<=.01,b=hi>=AR_CLN-.01;return a&&b?"wszystkie":b?"do "+arTys(arPopUp(lo)):a?"od "+arTys(arPopLow(hi)):"od "+arTys(arPopLow(hi)).replace(" tys.","")+" do "+arTys(arPopUp(lo))};
const arAutoS=()=>arTwOn()?1+(AR_SMAX-1)*arRng()[0]/AR_CLN:1;   // „sam się przybliża”: im mniejsze największe miejscowości (lewy uchwyt w prawo), tym bliżej
const arHomeView=()=>({z:1,x:0,y:0,s:arAutoS()});
// v337: 🗺️ trasa GPX na radarze (podgląd, tylko w tej karcie): kreska rysuje się od startu do mety, miejscowości po drodze podpisane
let arRoute=null;const AR_RT_MS=3000;
function arRouteSet(pts,name){pts=thin(pts,400);const T=arTownsGet(),on=[];
  T.forEach(t=>{let b=1e9,bi=0;for(let i=0;i<pts.length;i++){const d=dist({lat:t[1],lon:t[2]},pts[i]);if(d<b){b=d;bi=i}}if(b<=1.2)on.push([bi,t])});   // zapas: miejscowości z listy radaru do 1,2 km od śladu
  arRoute={pts,name:String(name||"Trasa").slice(0,60),km:routeKm(pts),places:on.sort((u,v)=>u[0]-v[0]).map(([i,t])=>({name:t[0],lat:t[1],lon:t[2],type:t[3]===2?"city":t[3]===1?"town":"village"})),osm:null,t0:performance.now()};
  if($("homesheet").classList.contains("hide"))openHome();else renderHome();arRouteFit();arRedraw();arRouteOsm()}
// v339: pełna lista miejscowości przy trasie z OpenStreetMap (jak w Bazie tras: placesAlong, ta sama lista „Miejscowości na trasie”); do odpowiedzi — zapas z listy radaru
function arRouteOsm(){const R=arRoute;if(!R)return;R.osm=null;arRoutePlacesUi();
  placesAlong(R.pts,"ar:"+R.name+":"+R.pts.length+":"+R.pts[0].lat.toFixed(4)).then(l=>{if(arRoute!==R)return;R.osm=l;if(l.length)R.places=l;arRoutePlacesUi();arRedraw()})
    .catch(()=>{if(arRoute!==R)return;R.osm=false;arRoutePlacesUi()})}
function arRoutePlacesUi(){const R=arRoute,box=$("arplaces");if(!R||!box)return;
  if(R.osm&&R.osm.length){renderPlaces("arplaces",null,R.osm);return}
  const fb=R.places.length?'<div class="note">'+R.places.map(p=>esc(p.name)).join(" → ")+'</div>':'';
  box.innerHTML=R.osm===null?fb+'<div class="note">Szukam wszystkich miejscowości w OpenStreetMap…</div>'
    :R.osm===false?fb+'<div class="note">Nie udało się pobrać pełnej listy z OpenStreetMap. <button type="button" class="lnk" data-hm="rtosm">Spróbuj ponownie ›</button></div>'
    :'<div class="note">Brak miejscowości blisko trasy.</div>';box.classList.remove("hide")}
// v338: dopasuj radar do trasy — środek widoku na środku trasy, skala treści (z) tak, żeby cała trasa zmieściła się w kole; start animacji od nowa
function arRouteFit(){const R=arRoute,a=areaCur();if(!R)return;const S=(arLiveKm!=null?arLiveKm:a.km)||300,k=Math.cos(a.lat*Math.PI/180);
  const P=R.pts.map(p=>[(p.lon-a.lon)*111.2*k,(p.lat-a.lat)*111.2]),X=P.map(q=>q[0]),Y=P.map(q=>q[1]),cx=(Math.min(...X)+Math.max(...X))/2,cy=(Math.min(...Y)+Math.max(...Y))/2;
  const h=Math.max(.5,...P.map(q=>Math.hypot(q[0]-cx,q[1]-cy))),z=Math.max(.1,Math.min(12,AR_RB*.78/h/(AR_R0/S))),f=AR_R0/S*z;
  arView={z,x:-cx*f,y:cy*f,s:1};R.t0=performance.now()}
const arRouteHtml=a=>{const R=arRoute,far=R&&a.km?Math.max(...R.pts.map(p=>dist(a,p))):0;
  return '<div class="bsgrp">Trasa na radarze'+(R?'':arQ("artinfo","Jak działa trasa na radarze?"))+'</div><div class="wrrow"><label class="wrfile"><input type="file" id="argpx" accept=".gpx,application/gpx+xml,text/xml"><span title="'+(R?'Zmień plik GPX':'Wczytaj plik GPX')+'" aria-label="'+(R?'Zmień plik GPX':'Wczytaj plik GPX')+'">'+uiIcon("map")+' GPX</span></label>'
   +(typeof rbOk!=="undefined"&&rbOk?'<div class="wrbase"><button type="button" class="wrbb" data-hm="rtbase" aria-label="Baza tras" title="Baza tras">'+rbBtnIn()+'</button></div>':'')
   +(R?'<button type="button" class="ib del" data-hm="rtdel" aria-label="Usuń trasę z radaru" title="Usuń trasę z radaru">'+ICON.del+'</button>':'')+'</div>'
   +(R?'<div class="routeinfo arrti"><div><b>'+esc(R.name)+'</b> · '+kmTxt(R.km)+' km <button type="button" class="lnk" data-hm="rtplay">'+uiIcon("play")+' Odtwórz</button></div>'
     +'<div id="arplaces"></div>'
     +(far>a.km?'<div class="note">Trasa sięga '+Math.round(far)+' km od Twojej miejscowości — dalej niż Twój promień.</div>':'')+'</div>'
    :'<div class="note hide" id="artinfo" style="margin-top:6px">Podejrzyj trasę na radarze: kreska narysuje się od startu do mety, a miejscowości po drodze dostaną podpis. Nic nie zapisujemy.</div>')};
const arBear=(a,b)=>{const y=Math.sin(rad(b.lon-a.lon))*Math.cos(rad(b.lat)),x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lon-a.lon));return (Math.atan2(y,x)*180/Math.PI+360)%360};
const arKmT=d=>(d<10?d.toFixed(1).replace(".",","):String(Math.round(d)))+" km";
// miejscowości na radarze: wbudowana lista (miasta Polski + całe Mazowsze z wsiami gminnymi), „nazwa|szer.|dł.|tys. mieszkańców|stała”;
// stała (1) = pierwsza w kolejce do podpisu (miasta od 15 tys. i siedziby powiatów Mazowsza, plus Serock, Nasielsk); które klasy wielkości — wg suwaka.
// współrzędne z OpenStreetMap (Nominatim, 2026-11-27). Bez zapytań do serwera — radar rysuje się od razu i bez internetu.
const AR_TOWNS_RAW="Warszawa|52.232|21.007|1860|1;Radom|51.402|21.154|200|1;Płock|52.546|19.701|115|1;Siedlce|52.166|22.277|77|1;Pruszków|52.163|20.808|62|1;Legionowo|52.395|20.931|54|1;Ostrołęka|53.084|21.567|51|1;Piaseczno|52.075|21.027|50|1;Otwock|52.104|21.268|45|1;Ciechanów|52.882|20.619|43|1;Żyrardów|52.054|20.444|40|1;Mińsk Mazowiecki|52.181|21.559|41|1;Wołomin|52.347|21.242|38|1;Marki|52.325|21.105|39|1;Ząbki|52.293|21.116|41|1;Kobyłka|52.339|21.197|26|1;Sochaczew|52.23|20.238|36|1;Grodzisk Mazowiecki|52.107|20.631|32|1;Mława|53.112|20.383|30|1;Nowy Dwór Mazowiecki|52.431|20.715|28|1;Płońsk|52.623|20.371|22|1;Ostrów Mazowiecka|52.8|21.898|22|1;Józefów|52.136|21.235|21|1;Sulejówek|52.243|21.278|20|1;Wyszków|52.593|21.458|27|1;Piastów|52.181|20.842|22|1;Konstancin-Jeziorna|52.083|21.121|17|1;Łomianki|52.336|20.895|17|1;Ożarów Mazowiecki|52.208|20.794|12|1;Węgrów|52.399|22.017|12|1;Sokołów Podlaski|52.408|22.253|18|1;Gostynin|52.429|19.461|18|1;Pułtusk|52.705|21.084|19|1;Garwolin|51.897|21.615|17|1;Kozienice|51.585|21.55|17|1;Grójec|51.866|20.868|16|1;Przasnysz|53.019|20.88|17|1;Żuromin|53.067|19.908|9|1;Sierpc|52.853|19.668|18|1;Łosice|52.212|22.717|7|1;Białobrzegi|51.648|20.95|7|1;Lipsko|51.159|21.649|5|1;Zwoleń|51.356|21.584|8|1;Szydłowiec|51.224|20.858|11|1;Pionki|51.473|21.444|18|1;Przysucha|51.359|20.629|6|1;Mszczonów|51.974|20.513|6|0;Tłuszcz|52.43|21.436|8|0;Radzymin|52.418|21.181|13|0;Karczew|52.078|21.251|10|0;Góra Kalwaria|51.984|21.214|12|0;Nasielsk|52.587|20.813|7|1;Serock|52.514|21.073|4|1;Maków Mazowiecki|52.866|21.101|10|1;Różan|52.889|21.399|3|0;Gąbin|52.399|19.731|4|0;Raciąż|52.781|20.118|4|0;Drobin|52.738|19.989|3|0;Bieżuń|52.962|19.89|2|0;Glinojeck|52.819|20.286|3|0;Wyszogród|52.388|20.191|3|0;Zakroczym|52.433|20.612|3|0;Kałuszyn|52.209|21.812|6|0;Łochów|52.53|21.685|7|0;Kosów Lacki|52.596|22.147|2|0;Brok|52.699|21.86|2|0;Chorzele|53.261|20.898|3|0;Myszyniec|53.383|21.342|3|0;Tarczyn|51.98|20.834|4|0;Warka|51.785|21.183|12|0;Halinów|52.226|21.353|4|0;Zielonka|52.311|21.152|17|1;Milanówek|52.126|20.664|16|1;Brwinów|52.143|20.717|13|0;Błonie|52.195|20.617|12|0;Nowe Miasto nad Pilicą|51.617|20.58|4|0;Łaskarzew|51.789|21.592|5|0;Żelechów|51.81|21.896|4|0;Pilawa|51.96|21.527|4|0;Pomiechówek|52.472|20.734|5|0;Jabłonna|52.377|20.918|2|0;Wieliszew|52.45|20.969|2|0;Nieporęt|52.423|21.035|2|0;Pokrzywnica|52.923|21.609|1|0;Obryte|52.717|21.255|1|0;Zatory|52.606|21.184|1|0;Winnica|52.644|20.941|1|0;Gzy|52.74|20.943|1|0;Świercze|52.671|20.767|1|0;Gołymin-Ośrodek|52.809|20.873|1|0;Karniewo|52.836|20.991|1|0;Szelków|52.816|21.171|1|0;Rzewnie|52.835|21.339|1|0;Somianka|52.562|21.3|1|0;Zabrodzie|53.106|21.537|1|0;Długosiodło|52.76|21.593|1|0;Rząśnik|52.713|21.368|1|0;Joniec|52.602|20.58|1|0;Czosnów|52.391|20.734|1|0;Naruszewo|52.527|20.357|1|0;Baboszewo|52.681|20.258|1|0;Krasne|52.923|20.967|1|0;Opinogóra Górna|52.904|20.714|1|0;Sońsk|52.781|20.696|1|0;Sochocin|52.69|20.471|1|0;Nowe Miasto|52.656|20.631|1|0;Krasnosielc|53.034|21.158|1|0;Sypniewo|53.005|21.306|1|0;Płoniawy-Bramura|52.98|21.063|1|0;Młynarze|52.532|21.366|1|0;Goworowo|52.901|21.557|1|0;Zaręby Kościelne|52.757|22.125|1|0;Wąsewo|52.873|21.674|1|0;Jadów|52.478|21.633|1|0;Strachówka|52.431|21.633|1|0;Klembów|52.406|21.332|1|0;Wierzbica|51.249|21.079|1|0;Kraków|50.062|19.937|800|1;Tarnów|50.012|20.988|105|1;Nowy Sącz|49.625|20.691|83|1;Oświęcim|50.038|19.221|37|1;Chrzanów|50.141|19.403|36|1;Olkusz|50.279|19.56|35|1;Nowy Targ|49.482|20.031|33|1;Bochnia|49.969|20.431|30|1;Gorlice|49.658|21.159|27|1;Zakopane|49.297|19.95|26|1;Wadowice|49.883|19.493|19|1;Wieliczka|49.982|20.06|24|1;Myślenice|49.835|19.938|18|1;Limanowa|49.706|20.422|15|1;Katowice|50.26|19.022|280|1;Częstochowa|50.812|19.113|210|1;Sosnowiec|50.278|19.134|190|1;Gliwice|50.294|18.666|170|1;Zabrze|50.309|18.786|155|1;Bielsko-Biała|49.822|19.045|165|1;Bytom|50.347|18.923|160|1;Rybnik|50.096|18.542|135|1;Ruda Śląska|50.286|18.875|135|1;Tychy|50.114|18.997|125|1;Dąbrowa Górnicza|50.331|19.208|115|1;Chorzów|50.298|18.954|105|1;Jaworzno|50.203|19.272|89|1;Jastrzębie-Zdrój|49.952|18.602|86|1;Żory|50.045|18.694|62|1;Siemianowice Śląskie|50.305|19.028|66|1;Będzin|50.323|19.132|55|1;Racibórz|50.092|18.22|54|1;Świętochłowice|50.291|18.92|49|1;Zawiercie|50.484|19.433|48|1;Wodzisław Śląski|50.002|18.463|47|1;Mikołów|50.169|18.904|41|1;Cieszyn|49.749|18.633|34|1;Żywiec|49.689|19.203|31|1;Lubliniec|50.669|18.683|23|1;Myszków|50.574|19.322|31|1;Wrocław|51.109|17.033|670|1;Wałbrzych|50.766|16.283|108|1;Legnica|51.208|16.16|98|1;Jelenia Góra|50.903|15.734|78|1;Lubin|51.397|16.205|70|1;Głogów|51.663|16.086|66|1;Świdnica|50.842|16.487|56|1;Bolesławiec|51.263|15.565|38|1;Oleśnica|51.21|17.38|37|1;Dzierżoniów|50.728|16.651|32|1;Kłodzko|50.439|16.655|26|1;Oława|50.943|17.296|33|1;Zgorzelec|51.148|15.008|30|1;Poznań|52.408|16.934|540|1;Kalisz|51.762|18.09|98|1;Konin|52.23|18.252|72|1;Piła|53.151|16.738|72|1;Ostrów Wielkopolski|51.65|17.817|70|1;Gniezno|52.536|17.596|67|1;Leszno|51.844|16.574|62|1;Śrem|52.089|17.016|30|1;Września|52.325|17.565|30|1;Krotoszyn|51.696|17.437|28|1;Turek|52.016|18.502|27|1;Koło|52.202|18.636|22|1;Słupca|52.287|17.871|13|0;Gdańsk|54.348|18.654|470|1;Gdynia|54.516|18.54|240|1;Słupsk|54.465|17.028|88|1;Tczew|54.087|18.8|59|1;Starogard Gdański|53.967|18.532|47|1;Wejherowo|54.603|18.248|47|1;Rumia|54.57|18.393|50|1;Sopot|54.445|18.568|35|1;Chojnice|53.695|17.561|40|1;Malbork|54.036|19.037|38|1;Kwidzyn|53.734|18.932|38|1;Lębork|54.539|17.747|35|1;Kościerzyna|54.121|17.978|23|1;Szczecin|53.43|14.551|390|1;Koszalin|54.191|16.177|105|1;Stargard|53.338|15.035|67|1;Kołobrzeg|54.176|15.576|46|1;Świnoujście|53.91|14.251|40|1;Szczecinek|53.708|16.694|40|1;Police|53.549|14.566|32|1;Wałcz|53.27|16.467|25|1;Bydgoszcz|53.122|18|330|1;Toruń|53.01|18.605|195|1;Włocławek|52.66|19.072|105|1;Grudziądz|53.488|18.756|92|1;Inowrocław|52.795|18.26|70|1;Brodnica|53.258|19.399|28|1;Świecie|53.407|18.446|26|1;Chełmno|53.349|18.424|19|1;Rypin|53.067|19.406|16|1;Lipno|52.847|19.179|14|0;Golub-Dobrzyń|53.114|19.054|12|0;Wąbrzeźno|53.28|18.947|13|0;Nakło nad Notecią|53.139|17.6|18|1;Aleksandrów Kujawski|52.877|18.694|12|0;Lublin|51.251|22.57|330|1;Zamość|50.717|23.253|61|1;Chełm|51.134|23.471|60|1;Biała Podlaska|52.034|23.119|56|1;Puławy|51.417|21.972|46|1;Świdnik|51.22|22.7|39|1;Kraśnik|50.925|22.229|34|1;Łuków|51.93|22.379|29|1;Biłgoraj|50.542|22.721|26|1;Lubartów|51.466|22.605|22|1;Tomaszów Lubelski|50.447|23.417|19|1;Międzyrzec Podlaski|51.985|22.784|17|1;Hrubieszów|50.805|23.887|17|1;Radzyń Podlaski|51.783|22.621|15|1;Ryki|51.627|21.936|9|0;Dęblin|51.562|21.865|15|1;Zielona Góra|51.938|15.505|140|1;Gorzów Wielkopolski|52.731|15.24|120|1;Żary|51.639|15.142|37|1;Nowa Sól|51.802|15.718|38|1;Żagań|51.615|15.32|25|1;Świebodzin|52.25|15.532|21|1;Międzyrzecz|52.445|15.579|18|1;Białystok|53.132|23.159|290|1;Suwałki|54.099|22.928|69|1;Łomża|53.175|22.073|62|1;Augustów|53.844|22.98|30|1;Bielsk Podlaski|52.769|23.193|25|1;Zambrów|52.986|22.241|22|1;Grajewo|53.647|22.455|22|1;Hajnówka|52.737|23.588|20|1;Sokółka|53.405|23.5|18|1;Siemiatycze|52.428|22.863|14|0;Wysokie Mazowieckie|52.915|22.513|9|0;Kolno|53.411|21.931|10|0;Ciechanowiec|52.679|22.499|4|0;Mielnik|52.331|23.049|1|0;Rzeszów|50.037|22.005|200|1;Przemyśl|49.782|22.775|59|1;Stalowa Wola|50.565|22.064|58|1;Mielec|50.29|21.423|59|1;Tarnobrzeg|50.573|21.679|45|1;Krosno|49.694|21.765|46|1;Dębica|50.051|21.41|45|1;Jarosław|50.016|22.68|37|1;Sanok|49.561|22.207|37|1;Jasło|49.747|21.474|35|1;Łańcut|50.069|22.232|18|1;Kielce|50.872|20.631|185|1;Ostrowiec Świętokrzyski|50.94|21.387|66|1;Starachowice|51.052|21.076|47|1;Skarżysko-Kamienna|51.114|20.858|44|1;Sandomierz|50.679|21.75|23|1;Końskie|51.191|20.407|19|1;Busko-Zdrój|50.468|20.719|16|1;Jędrzejów|50.639|20.305|15|1;Łódź|51.769|19.457|660|1;Piotrków Trybunalski|51.408|19.696|71|1;Pabianice|51.664|19.354|64|1;Tomaszów Mazowiecki|51.532|20.008|60|1;Bełchatów|51.367|19.369|56|1;Zgierz|51.856|19.405|55|1;Skierniewice|51.957|20.143|47|1;Radomsko|51.067|19.445|45|1;Kutno|52.232|19.357|42|1;Zduńska Wola|51.603|18.933|41|1;Sieradz|51.594|18.738|41|1;Łowicz|52.108|19.945|28|1;Wieluń|51.22|18.57|22|1;Łęczyca|52.059|19.202|14|0;Rawa Mazowiecka|51.762|20.252|17|1;Opole|50.667|17.924|125|1;Kędzierzyn-Koźle|50.345|18.211|59|1;Nysa|50.474|17.332|43|1;Brzeg|50.861|17.47|35|1;Kluczbork|50.973|18.214|23|1;Olsztyn|53.777|20.477|170|1;Elbląg|54.156|19.404|115|1;Ełk|53.825|22.362|61|1;Ostróda|53.703|19.962|32|1;Iława|53.598|19.561|32|1;Giżycko|54.04|21.771|29|1;Kętrzyn|54.076|21.375|26|1;Szczytno|53.565|20.992|23|1;Bartoszyce|54.252|20.814|23|1;Mrągowo|53.866|21.305|21|1;Działdowo|53.235|20.182|21|1;Pisz|53.629|21.808|19|1;Lidzbark Warmiński|54.126|20.581|15|1;Nidzica|53.361|20.428|13|0;Braniewo|54.383|19.827|17|1";
let arTownsL=null;
const arTownsGet=()=>arTownsL||(arTownsL=AR_TOWNS_RAW.split(";").map(x=>{const v=x.split("|"),p=+v[3];return [v[0],+v[1],+v[2],p>=50?2:p>=5?1:0,p,v[4]==="1"]}));
// 🤏 przybliżanie i przesuwanie radaru (dwa palce / kółko myszy / jeden palec lub mysz); „Wyśrodkuj” i dwuklik wracają do skali i środka
let arView={z:1,x:0,y:0,s:1};   // z — zawsze 1, s — skala całego radaru z pierścieniem (1…AR_SMAX)
const AR_SMAX=2.4,arZmT=s=>'translate('+AR_CX+' '+AR_CY+') scale('+s.toFixed(3)+') translate('+(-AR_CX)+' '+(-AR_CY)+')';
// v340: legenda radaru do odklikania — ukryte rodzaje kropek (w/s/e), „Wyśrodkuj” przywraca
const arHide=new Set();
const arLegHtml=()=>'<div class="hleg arleg">'+[["w","w","zaproszenia"],["s","s","sygnały"],["e","ev","imprezy"]].map(([k,c,t])=>'<button type="button" class="arlg'+(arHide.has(k)?' off':'')+'" data-hm="lg" data-k="'+k+'" aria-pressed="'+!arHide.has(k)+'"><i class="hc '+c+'"></i> '+t+'</button>').join("")+'</div>';
// v349: teren (lasy, woda, rzeki — js/25) — legenda pionowo po prawej obok licznika, do odklikania; stan w localStorage („arTerOff”: litery f/w/r; domyślnie wszystko wyłączone — decyzja właściciela). Nie liczy się do arViewMoved, więc „Wyśrodkuj” nie świeci na czerwono
const arTerOff=()=>{let v="fwr";try{const x=localStorage.getItem("arTerOff");if(x!=null)v=x}catch(e){}return new Set(v.split("").filter(x=>"fwr".includes(x)))};
const arTerLegHtml=()=>{const o=arTerOff();return '<div class="hleg arleg arlegr">'+[["f","tf","lasy"],["w","tw","woda"],["r","tr","rzeki"]].map(([k,c,t])=>'<button type="button" class="arlg'+(o.has(k)?' off':'')+'" data-hm="tlg" data-k="'+k+'" aria-pressed="'+!o.has(k)+'">'+t+' <i class="hc '+c+'"></i></button>').join("")+'</div>'};
// v349: przełączniki przy suwakach — „Miejscowości na radarze” i „Pogoda” (wyłączone: radar czystszy, suwak schowany)
const arTwOn=()=>{try{return localStorage.getItem("arTwOn")!=="0"}catch(e){return true}};
const arTgl=(k,on,l)=>'<button type="button" class="tgl'+(on?' on':'')+'" data-hm="'+k+'" role="switch" aria-checked="'+on+'" aria-label="'+l+'"><span></span></button>';
const arViewMoved=()=>arHide.size>0||arView.s>1.01||Math.abs((arView.z||1)-1)>.01||Math.abs(arView.x)>.5||Math.abs(arView.y)>.5;
// 🧭 pierścień kompasu wokół radaru (półprzezroczysty, nieruchomy przy przybliżaniu): N/E/S/W, co 30° liczby, co 10° kreski; delikatny jasny łuk krąży (animacja),
// a pomarańczowy znacznik pokazuje, w którą stronę patrzy telefon (jeśli ma kompas) — północ na radarze zawsze u góry, jak w prawdziwych kierunkach
const AR_CI=108,AR_CO=128;let arCmpHtml="";
function arCompass(){if(arCmpHtml)return arCmpHtml;const CX=AR_CX,CY=AR_CY,pt=(d,r)=>{const t=d*Math.PI/180;return [(CX+r*Math.sin(t)).toFixed(1),(CY-r*Math.cos(t)).toFixed(1)]};
  const cm=(AR_CI+AR_CO)/2,w=AR_CO-AR_CI;let t="";
  for(let d=0;d<360;d+=10){const big=d%30===0,a=pt(d,AR_CO-1),b=pt(d,AR_CO-(big?7:4));t+='<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/>'}
  const L={0:"N",90:"E",180:"S",270:"W"};let lb="";
  for(let d=0;d<360;d+=30){const q=pt(d,cm-1),c=L[d];lb+='<text class="'+(c?'arcl'+(d?'':' n'):'arcd')+'" x="'+q[0]+'" y="'+q[1]+'" transform="rotate('+d+' '+q[0]+' '+q[1]+')" text-anchor="middle" dominant-baseline="central">'+(c||d)+'</text>'}
  return arCmpHtml='<g class="arcmp" aria-hidden="true"><circle class="arcmb" cx="'+CX+'" cy="'+CY+'" r="'+cm+'" stroke-width="'+w+'"/><circle class="arcsw" cx="'+CX+'" cy="'+CY+'" r="'+cm+'" stroke-width="'+w+'" stroke-dasharray="110 '+(Math.round(2*Math.PI*cm)-110)+'"/>'
    +'<circle class="arco1" cx="'+CX+'" cy="'+CY+'" r="'+AR_CO+'"/><circle class="arco1" cx="'+CX+'" cy="'+CY+'" r="'+AR_CI+'"/><g class="arct">'+t+'</g>'+lb
    +'<g class="arhd off" id="arhd"><path d="M'+CX+' '+(CY-AR_CI-1)+'l-5 -9h10z"/></g></g>'}
// kierunek, w który patrzy telefon (Android: zdarzenie absolutne; iPhone: webkitCompassHeading po zgodzie — prosimy przy „Gdzie jestem”)
let arHeadOnF=false,arHeadRaf=0;
let arHeadCur=null;   // wygładzony kierunek: lekki filtr (ok. 25 % różnicy na odczyt) i martwa strefa 1,5° — mniej drgań czujnika
function arHeadSet(h){if(arHeadRaf)return;arHeadRaf=requestAnimationFrame(()=>{arHeadRaf=0;const g=document.getElementById("arhd");if(!g)return;
  if(arHeadCur==null)arHeadCur=h;else{const d=((h-arHeadCur+540)%360)-180;if(Math.abs(d)<1.5)return;arHeadCur=(arHeadCur+d*.25+360)%360}
  g.classList.remove("off");g.setAttribute("transform","rotate("+arHeadCur.toFixed(1)+" "+AR_CX+" "+AR_CY+")")})}
function arHeadOn(){if(arHeadOnF||typeof window.DeviceOrientationEvent==="undefined")return;arHeadOnF=true;
  const f=e=>{const h=typeof e.webkitCompassHeading==="number"?e.webkitCompassHeading:(e.absolute||e.type==="deviceorientationabsolute")&&e.alpha!=null?(360-e.alpha)%360:null;if(h!=null&&isFinite(h))arHeadSet(h)};
  window.addEventListener("deviceorientationabsolute",f,true);window.addEventListener("deviceorientation",f,true)}
function arHeadAsk(){try{const D=window.DeviceOrientationEvent;if(D&&typeof D.requestPermission==="function")D.requestPermission().then(r=>{if(r==="granted")arHeadOn()}).catch(()=>{});else arHeadOn()}catch(e){}}
// v340: 🌦 mapa cieplna pogody wokół radaru — 16 kierunków co 22,5° (na brzegu okolicy, 8–60 km) + środek, Open-Meteo, pamięć 30 min;
// rozmyte klinki pod pierścieniem kompasu, legenda tylko z warunkami, które występują, i linijka o wietrze. Czas: teraz / +3 h / jutro 12:00
let arWx={k:"",at:0,d:null,busy:false,err:false};
const AR_WXC=[["sun","słonecznie"],["part","częściowe zachmurzenie"],["cloud","pochmurno"],["fog","mgła"],["rain","deszcz"],["snow","śnieg"],["storm","burza"]];
const arWxOn=()=>{try{return localStorage.getItem("arWxOn")!=="0"}catch(e){return true}};
// v342: czas pogody suwakiem — 0…48 h do przodu (płynnie, dane co godzinę); dawny wybór Teraz/+3 h/Jutro przeliczany na godziny
const arWxH=()=>{let v=0;try{const x=localStorage.getItem("arWxH"),t=localStorage.getItem("arWxT");
    if(x!=null&&x!=="")v=+x;else if(t==="3")v=3;else if(t==="j"){const d=new Date(),j=new Date(d);j.setDate(d.getDate()+1);j.setHours(12,0,0,0);v=Math.round((j-d)/36e5)}}catch(e){}
  return Math.max(0,Math.min(48,isFinite(v)?v:0))};
const arWxHTxt=h=>{h=Math.round(h);if(!h)return "teraz";const d=new Date(Date.now()+h*36e5);return "+"+h+" h · "+d.toLocaleDateString("pl-PL",{weekday:"short"})+" "+pad(d.getHours())+":00"};
function arWxPts(a){const S=a.km||300,D=Math.max(8,Math.min(60,S)),k=Math.cos(a.lat*Math.PI/180),out=[[a.lat,a.lon]];
  for(let i=0;i<16;i++){const b=i*22.5*Math.PI/180;out.push([a.lat+D*Math.cos(b)/111.2,a.lon+D*Math.sin(b)/(111.2*k)])}return {D,out}}
async function arWxLoad(a){if(!arWxOn())return;const {D,out}=arWxPts(a),k=a.lat.toFixed(2)+","+a.lon.toFixed(2)+":"+D;
  if(arWx.k===k&&(arWx.busy||(arWx.d&&Date.now()-arWx.at<18e5)))return;
  arWx={k,at:Date.now(),d:arWx.k===k?arWx.d:null,busy:true,err:false};
  try{const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+out.map(p=>p[0].toFixed(3)).join(",")+"&longitude="+out.map(p=>p[1].toFixed(3)).join(",")
      +"&hourly=weather_code,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,temperature_2m&forecast_days=3&timezone=auto");
    if(!r.ok)throw new Error(r.status);let j=await r.json();if(!Array.isArray(j))j=[j];if(arWx.k!==k)return;
    arWx.d=j;arWx.busy=false;arWx.at=Date.now()}
  catch(e){if(arWx.k!==k)return;arWx.busy=false;arWx.err=true;arWx.at=0}
  arRedraw()}
// godzina z wybranego czasu → indeks w danych godzinowych (czas lokalny miejsca, timezone=auto)
function arWxIdx(h){const t=h&&h.time;if(!t||!t.length)return -1;const d=new Date(Date.now()+Math.round(arWxH())*36e5);
  const s=d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":00",i=t.indexOf(s);return i>=0?i:Math.min(t.length-1,Math.max(0,t.findIndex(x=>x>s)))}
const arWxCat=(c,p,cl)=>c>=95?["storm",1]:(c>=71&&c<=77)||c===85||c===86?["snow",.8]:(c>=51&&c<=67)||(c>=80&&c<=82)||p>=.1?["rain",Math.min(1,.35+(p||0)/3)]
  :c===45||c===48?["fog",.7]:c===3||cl>=85?["cloud",.6]:c===1||c===2||cl>=35?["part",.5]:["sun",.6];
function arWxGet(){if(!arWxOn()||!arWx.d)return null;const P=arWx.d.map(j=>{const h=j&&j.hourly,i=arWxIdx(h);if(i<0)return null;
    return {cat:arWxCat(h.weather_code[i],h.precipitation[i],h.cloud_cover[i]),w:h.wind_speed_10m[i],wd:h.wind_direction_10m[i]}});
  return P.every(Boolean)?P:null}
// v343: 🌡 temperatura przy głównych miejscowościach na radarze (do 10 największych podpisanych) i przy środku — wg suwaka pogody
const arTmpC={};let arTmpQ=0;
const arTmpTxt=v=>v==null||!isFinite(v)?"":" "+String(Math.round(v)).replace("-","−")+"°";
function arTmpOf(n){if(!arWxOn())return "";const c=arTmpC[n];if(!c||!c.h)return "";const i=arWxIdx(c.h);return i<0?"":arTmpTxt(c.h.temperature_2m[i])}
function arTmpHome(){if(!arWxOn()||!arWx.d||!arWx.d[0])return "";const h=arWx.d[0].hourly,i=arWxIdx(h);return i<0||!h.temperature_2m?"":arTmpTxt(h.temperature_2m[i])}
function arTmpLoad(L){if(!arWxOn())return;const need=L.filter(o=>{const c=arTmpC[o.n];return !c||(!c.busy&&Date.now()-c.at>18e5)});if(!need.length)return;
  clearTimeout(arTmpQ);arTmpQ=setTimeout(async()=>{const N=need.slice(0,10);N.forEach(o=>arTmpC[o.n]=Object.assign(arTmpC[o.n]||{},{busy:true,at:Date.now()}));
    try{const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+N.map(o=>o.lat.toFixed(3)).join(",")+"&longitude="+N.map(o=>o.lon.toFixed(3)).join(",")+"&hourly=temperature_2m&forecast_days=3&timezone=auto");
      if(!r.ok)throw 0;let j=await r.json();if(!Array.isArray(j))j=[j];N.forEach((o,i)=>{arTmpC[o.n]={h:j[i]&&j[i].hourly,at:Date.now(),busy:false}})}
    catch(e){N.forEach(o=>{arTmpC[o.n]={at:Date.now()-15e5,busy:false}})}   // błąd: spróbujemy znów za ok. 5 min
    arRedraw()},400)}
function arWxSvg(){const P=arWxGet();if(!P)return "";const CX=AR_CX,CY=AR_CY,r1=AR_RB-2,r2=AR_CO+8,
    pt=(a,r)=>(CX+r*Math.sin(a)).toFixed(1)+' '+(CY-r*Math.cos(a)).toFixed(1);
  return '<defs><filter id="arwxb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs><g filter="url(#arwxb)">'
    +P.slice(1).map((q,i)=>{const b=i*22.5,a0=(b-13)*Math.PI/180,a1=(b+13)*Math.PI/180;
      return '<path class="arwxs '+q.cat[0]+'" style="opacity:'+(q.cat[1]*.55).toFixed(2)+'" d="M'+pt(a0,r1)+'A'+r1+' '+r1+' 0 0 1 '+pt(a1,r1)+'L'+pt(a1,r2)+'A'+r2+' '+r2+' 0 0 0 '+pt(a0,r2)+'Z"/>'}).join("")+'</g>'}
function arWxLeg(){if(!arWxOn())return "";const P=arWxGet();
  if(!P)return '<span class="note">'+(arWx.err?'Nie udało się pobrać pogody — spróbuj za chwilę.':'Pobieram pogodę…')+'</span>';
  const c=P[0],strong=Math.max(...P.map(q=>q.w))>=40,nm=(AR_WXC.find(([k])=>k===c.cat[0])||[,""])[1];
  return 'u Ciebie: <b>'+nm+'</b>'+(arTmpHome()?' ·'+arTmpHome():'')+' · <span class="arwxw">'+uiIcon("wind")+' '+Math.round(c.w)+' km/h '+AR_DIR[Math.round(c.wd/45)%8]+(strong?' · <b>silny</b>':'')+'</span>'}   // v344: jeden wiersz, skracany „…” (CSS)
// v343: pasek-gradient warunków (słonecznie → … → burza) zamiast kropek: kreski = 16 kierunków wokół, znacznik = u Ciebie (płynnie z suwakiem)
const arWxPos=q=>{const i=AR_WXC.findIndex(([k])=>k===q.cat[0]);return ((Math.max(0,i)+(q.cat[0]==="rain"?.15+.7*Math.min(1,(q.cat[1]-.35)/.65):.5))/AR_WXC.length*100).toFixed(1)};
function arWxGr(){const g=$("arwxgr");if(!g)return;const P=arWxOn()?arWxGet():null;if(!P){g.innerHTML="";return}
  const tk=P.slice(1).map(q=>'<i style="left:'+arWxPos(q)+'%"></i>').join(""),mk=g.querySelector(".arwxm");
  if(mk){mk.style.left=arWxPos(P[0])+"%";g.querySelector(".arwxtk").innerHTML=tk;return}   // ten sam znacznik — przesuwa się płynnie (CSS transition)
  g.innerHTML='<div class="arwxgb"><div class="arwxtk">'+tk+'</div><b class="arwxm" style="left:'+arWxPos(P[0])+'%" title="u Ciebie"></b></div>'
    +'<div class="arslt"><span>słonecznie</span><span>pochmurno</span><span>deszcz</span><span>burza</span></div>'}
const arSlOff=()=>!arTwOn()&&!arWxOn();   // v352: oba przełączniki wyłączone → wiersze z przełącznikami się chowają (włączy je coś innego)
const arWxSl=()=>{if(arSlOff())return '';const on=arWxOn(),h=arWxH();
  return '<div class="arslh arsl2"><span>Pogoda</span><b id="arwxhv">'+(on?arWxHTxt(h):'wyłączona')+'</b>'+arTgl("wxon",on,"Pogoda na radarze")+'</div>'
    +(on?'<input id="arwxh" class="arrng" type="range" min="0" max="48" step="any" value="'+h+'" style="--p:'+arSlP(h,0,48)+';--tk:12.5%" aria-label="Pogoda za ile godzin (do 48)">'
    +'<div class="arslt"><span>teraz</span><span>+24 h</span><span>+48 h</span></div>':'')};
// v342 → v349: wiersz pogody pod radarem (bez przycisku — włącza się przełącznikiem przy suwaku „Pogoda”)
const arWxBar=()=>arWxOn()?'<div class="hleg arleg arwxleg">'+uiIcon("cloudsun")+'<span id="arwxleg">'+arWxLeg()+'</span></div><div id="arwxgr" class="arwxgr"></div>':'';
function areaSvg(a){return '<svg class="arsvg'+(typeof isKingReal==="function"&&isKingReal()?' kg':'')+(arView.s>1.01?' zm':'')+'" viewBox="0 0 '+AR_W+' '+AR_H+'" role="img" aria-label="Radar okolicy: '+esc(a.name||"")+', '+areaKmTxt(a.km)+' — przesuń palcem, przybliż dwoma palcami">'+'<g class="arzm" transform="'+arZmT(arView.s)+'"><g class="arwx">'+arWxSvg()+'</g>'+arCompass()+'<g class="arin">'+areaSvgIn(a)+'</g></g></svg>'}
function areaSvgIn(a){const V={z:arView.z||1,x:arView.x,y:arView.y},S=a.km||300,CX=AR_CX,CY=AR_CY,f=AR_R0/S*V.z,G={},far={},B=[],K=typeof isKingReal==="function"&&isKingReal();
  const OX=CX+V.x,OY=CY+V.y,R0=AR_R0*V.z,homeIn=Math.hypot(V.x,V.y)<AR_RB-14;   // OX/OY — gdzie na radarze jest środek okolicy po przesunięciu
  const xy=(lat,lon)=>{const dy=(lat-a.lat)*111.2,dx=(lon-a.lon)*111.2*Math.cos(a.lat*Math.PI/180);return {x:dx*f+V.x,y:-dy*f+V.y,d:Math.hypot(dx,dy)}};
  const hit=b=>B.some(o=>b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y);
  const inR=b=>[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].every(([x,y])=>Math.hypot(x-CX,y-CY)<AR_RB-2);
  // napis obok punktu: próbujemy prawo, lewo, nad, pod — pierwszy wolny i mieszczący się w radarze
  // v335: napisy i kropki miejscowości w stałej wielkości na ekranie — przy przybliżeniu nie rosną, więc mieści się ich więcej
  const Z=Math.max(1,arView.s),label=(x,y,t,fs,cls,suf)=>{fs/=Z;suf=suf||"";const w=(t+suf).length*fs*.56,h=fs*1.15,o=5/Z;
    for(const [lx,ly,an,bx] of [[x+o,y+fs*.35,"start",x+o],[x-o,y+fs*.35,"end",x-o-w],[x,y-6/Z,"middle",x-w/2],[x,y+fs+4/Z,"middle",x-w/2]]){
      const b={x:bx-1/Z,y:ly-fs*.85,w:w+2/Z,h};if(hit(b)||!inR(b))continue;B.push(b);
      return '<text class="'+cls+'" x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="'+an+'" font-size="'+fs.toFixed(2)+'"'+(Z>1.01?' style="stroke-width:'+(3/Z).toFixed(2)+'px"':'')+'>'+esc(t)+(suf?'<tspan class="artmp">'+esc(suf)+'</tspan>':'')+'</text>'}
    return null};
  // punkty: zaproszenia, sygnały, imprezy (kropki w tym samym miejscu łączą się w jedną większą)
  const PTS=areaPts().filter(p=>!arHide.has(p.k));
  PTS.forEach(p=>{let {x,y,d}=xy(p.lat,p.lon);const m=Math.hypot(x,y),edge=m>AR_RM;if(edge){x*=AR_RM/m;y*=AR_RM/m}
    const key=p.k+Math.round(x/4)+"_"+Math.round(y/4),g=(G[key]=G[key]||{k:p.k,x,y,n:0,nm:[],out:!!a.km&&d>S});g.n++;if(p.nm)g.nm.push(p.nm);
    if(edge&&p.lab&&p.k!=="s"){const o=far[p.lab];if(!o||d<o.d)far[p.lab]={k:p.k,x,y,d,lab:p.lab,n:(o?o.n:0)+1};else o.n++}});
  // środek: pinezka i nazwa mojej (albo podglądanej) miejscowości
  const hn=arCut(a.name||"",18),hfs=12.5,hw=hn.length*hfs*.58;if(homeIn)B.push({x:OX-13,y:OY-25,w:26,h:26},{x:OX-hw/2-2,y:OY+5,w:hw+4,h:hfs*1.2});
  B.push({x:CX-6,y:CY-AR_RB+2,w:12,h:12});   // „N”
  const ringT=a.km?Math.round(S/2)+" km":"";if(ringT)B.push({x:OX+2,y:OY-R0/2-11,w:ringT.length*5.4+2,h:11});
  // podpisy: najpierw miejscowości z imprezami (zawsze), potem miejscowości z OSM z przedziału wielkości (suwak) — od największych, ile się zmieści
  let lab="",seen=new Set([String(a.name||"").toLowerCase()]);
  PTS.filter(p=>p.k==="e"&&p.lab).forEach(p=>{const q=xy(p.lat,p.lon);if(Math.hypot(q.x,q.y)>AR_RM||seen.has(p.lab.toLowerCase()))return;
    const t=label(CX+q.x,CY+q.y,arCut(p.lab,16),11.5,"arte");if(t){lab+=t;seen.add(p.lab.toLowerCase())}});
  let rt="";const RT=arRoute;
  if(RT){const P=RT.pts.map(p=>xy(p.lat,p.lon)),d=P.map((q,i)=>(i?'L':'M')+(CX+q.x).toFixed(1)+' '+(CY+q.y).toFixed(1)).join(""),el=performance.now()-RT.t0,s0=P[0],s1=P[P.length-1];
    rt='<g clip-path="url(#arclip)"><path class="arrtc" d="'+d+'" style="stroke-width:'+(6/Z).toFixed(2)+'px"/><path class="arrt'+(el<AR_RT_MS?' an':'')+'" pathLength="1" d="'+d+'" style="stroke-width:'+(3/Z).toFixed(2)+'px'+(el<AR_RT_MS?';animation-delay:-'+Math.round(el)+'ms':'')+'"/>'
      +'<circle class="arrts" cx="'+(CX+s0.x).toFixed(1)+'" cy="'+(CY+s0.y).toFixed(1)+'" r="'+(4.5/Z).toFixed(2)+'"/><circle class="arrtm'+(el<AR_RT_MS?' an':'')+'" cx="'+(CX+s1.x).toFixed(1)+'" cy="'+(CY+s1.y).toFixed(1)+'" r="'+(4.5/Z).toFixed(2)+'" style="stroke-width:'+(2.5/Z).toFixed(2)+'px'+(el<AR_RT_MS?';animation-delay:'+Math.round(2900-el)+'ms':'')+'"/></g>';
    const RK={city:0,town:1,village:2,suburb:3,hamlet:4},rk=p=>RK[p.type]!=null?RK[p.type]:2;   // najpierw miasta, potem wsie i osady — ile się zmieści
    RT.places.slice().sort((u,v)=>rk(u)-rk(v)).forEach(p=>{const n=String(p.name||"");if(!n||seen.has(n.toLowerCase()))return;const q=xy(p.lat,p.lon);if(Math.hypot(q.x,q.y)>AR_RM-3)return;
      const x=CX+q.x,y=CY+q.y,l=label(x,y,arCut(n,16),rk(p)<2?11.5:10.5,"artn rt");if(!l)return;seen.add(n.toLowerCase());rt+='<circle class="artd rt" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+((rk(p)<2?2.4:1.8)/Z).toFixed(2)+'"/>'+l})}
  const [lo,hi]=arRng(),pU=arPopUp(lo),pL=arPopLow(hi),T=arTownsGet();let tw="",nT=0;const TM=[];
  if(T&&arTwOn())T.map(t=>Object.assign({t},xy(t[1],t[2]))).filter(o=>{const p=o.t[4];return p<pU&&p>=pL&&o.d>1.5&&Math.hypot(o.x,o.y)<AR_RM-3&&!seen.has(o.t[0].toLowerCase())})
    .sort((u,v)=>(v.t[5]-u.t[5])||(v.t[4]-u.t[4])).forEach(o=>{const x=CX+o.x,y=CY+o.y,big=o.t[3]===2,out=!!a.km&&o.d>S;
      const main=(o.t[5]||big)&&nT<10,tp=main?arTmpOf(o.t[0]):"";   // temperatura przy 10 największych głównych na radarze
      const t=label(x,y,arCut(o.t[0],16),big?12:11,"artn"+(big?" big":"")+(out?" out":""),tp);if(!t)return;seen.add(o.t[0].toLowerCase());if(main){nT++;TM.push({n:o.t[0],lat:o.t[1],lon:o.t[2]})}
      tw+='<circle class="artd'+(out?' out':'')+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+((big?2.6:2)/Z).toFixed(2)+'"/>'+t});
  if(TM.length&&arWxOn())arTmpLoad(TM);
  // spoza radaru: odnośniki na boki — po 4 z każdej strony, najbliższe
  let co="";const F=Object.values(far).sort((u,v)=>u.d-v.d).slice(0,8);
  [1,-1].forEach(sd=>{const L=F.filter(o=>(o.x>=0?1:-1)===sd).slice(0,4).sort((u,v)=>u.y-v.y);let prev=-1e9;
    L.forEach(o=>{o.ly=Math.max(CY+o.y,prev+27);prev=o.ly});const over=L.length?L[L.length-1].ly-(AR_H-16):0;if(over>0)L.forEach(o=>o.ly-=over);
    L.forEach(o=>{const x0=CX+o.x,y0=CY+o.y,xe=CX+sd*(AR_RB+8),xl=CX+sd*(AR_CO+3),xt=CX+sd*(AR_CO+6),an=sd>0?"start":"end";
      co+='<g class="arco '+o.k+'"><polyline points="'+x0.toFixed(1)+','+y0.toFixed(1)+' '+xe.toFixed(1)+','+o.ly.toFixed(1)+' '+xl.toFixed(1)+','+o.ly.toFixed(1)+'"/>'
        +'<text class="arcon" x="'+xt.toFixed(1)+'" y="'+(o.ly-1).toFixed(1)+'" text-anchor="'+an+'">'+esc(arCut(o.lab,10))+'</text>'
        +'<text class="arcok" x="'+xt.toFixed(1)+'" y="'+(o.ly+11).toFixed(1)+'" text-anchor="'+an+'">'+arKmT(o.d)+(o.n>1?' · '+o.n:'')+'</text></g>'})});
  // kropki (👑: dymek z nazwami po najechaniu, większe pole trafienia)
  const dots=Object.values(G).sort((u,v)=>v.n-u.n).map(g=>{const r0=4.5+Math.min(7,2*Math.log2(g.n)),cx=(CX+g.x).toFixed(1),cy=(CY+g.y).toFixed(1),tip=K&&g.nm.length?'<title>'+esc([...new Set(g.nm)].slice(0,6).join("\n"))+'</title>':"";
    const at='class="ardot '+g.k+(g.out?' out':'')+'" cx="'+cx+'" cy="'+cy+'" r="'+r0.toFixed(1)+'"';
    if(!K)return tip?'<circle '+at+'>'+tip+'</circle>':'<circle '+at+'/>';
    return '<g class="ardg">'+tip+'<circle class="ardhit" cx="'+cx+'" cy="'+cy+'" r="'+(r0+9).toFixed(1)+'"/><circle '+at+'/></g>'}).join("");
  return '<defs><clipPath id="arclip"><circle cx="'+CX+'" cy="'+CY+'" r="'+AR_RB+'"/></clipPath></defs>'
   +'<circle class="arbg" cx="'+CX+'" cy="'+CY+'" r="'+AR_RB+'"/>'
   +'<line class="arax" x1="'+CX+'" y1="'+(CY-AR_RB+14)+'" x2="'+CX+'" y2="'+(CY+AR_RB-4)+'"/><line class="arax" x1="'+(CX-AR_RB+4)+'" y1="'+CY+'" x2="'+(CX+AR_RB-4)+'" y2="'+CY+'"/>'
   +'<g clip-path="url(#arclip)"><circle class="arring" cx="'+OX+'" cy="'+OY+'" r="'+R0+'"/>'+(a.km?'<circle class="arhalf" cx="'+OX+'" cy="'+OY+'" r="'+R0/2+'"/>':'')
   +'<circle class="arpulse" cx="'+OX+'" cy="'+OY+'" r="'+R0+'"/></g>'+(typeof terSvg==="function"?terSvg(xy,Z,arTerOff()):"")+'<g class="arsweep"><path d="M'+CX+' '+CY+'L'+CX+' '+(CY-AR_RB)+'A'+AR_RB+' '+AR_RB+' 0 0 1 '+(CX+AR_RB*Math.sin(.6)).toFixed(1)+' '+(CY-AR_RB*Math.cos(.6)).toFixed(1)+'Z"/></g>'
   +(ringT&&Math.hypot(V.x,V.y-R0/2)<AR_RB-12?'<text class="arrk" x="'+(OX+3)+'" y="'+(OY-R0/2-3)+'">'+ringT+'</text>':'')
   +tw+rt+co+dots+lab
   +(homeIn?'<g class="arpin" transform="translate('+(OX-12)+' '+(OY-22)+')"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></g>'
   +'<text class="arhome" x="'+OX+'" y="'+(OY+16)+'" text-anchor="middle" font-size="'+hfs+'">'+esc(hn)+(arTmpHome()?'<tspan class="artmp">'+arTmpHome()+'</tspan>':'')+'</text>':'')}
// licznik pod radarem
const arCntInner=(k,c)=>'<b>'+(k?'W promieniu '+Math.round(k)+' km':'Cała Polska')+'</b><span>'+areaCntTxt(c)+'</span>'+(k&&c.out?'<small>dalej: '+c.out+'</small>':'');
// „Najbliżej”: sygnał, zaproszenie, impreza — odległość od środka okolicy i kierunek (strzałka obrócona jak na radarze)
function areaNearHtml(a){const c={lat:a.lat,lon:a.lon},best={};
  areaPts().forEach(p=>{const d=dist(c,p);if(!best[p.k]||d<best[p.k].d)best[p.k]={d,p}});
  const ar='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l6 16-6-4-6 4z"/></svg>';
  const tile=(k,t)=>{const b=best[k];
    if(!b)return '<div class="arnr off"><span class="arna '+k+'">'+ar+'</span><div><small>'+t+'</small><b>brak</b><span>na razie nic</span></div></div>';
    const deg=Math.round(arBear(c,b.p)),here=b.d<1.5;
    return '<div class="arnr"><span class="arna '+k+'"'+(here?'':' style="transform:rotate('+deg+'deg)"')+'>'+(here?uiIcon("pin"):ar)+'</span><div><small>'+t+'</small><b>'+(here?'tutaj':arKmT(b.d))+'</b>'
      +'<span>'+(here?esc(a.name||""):AR_DIR[Math.round(deg/45)%8]+(b.p.lab&&k!=="s"?' · '+esc(arCut(b.p.lab,14)):''))+'</span></div></div>'};
  // v349: las i woda z siatki terenu (js/25) — kafelki jak wyżej, bez nazwy (OSM nie zawsze ją ma)
  const tt=(k,t,ic)=>{const q=typeof terNear==="function"?terNear(a,k):null;
    if(!q)return '<div class="arnr off"><span class="arna t'+k+'">'+uiIcon(ic)+'</span><div><small>'+t+'</small><b>daleko</b><span>ponad 60 km</span></div></div>';
    const d=dist(c,q),deg=Math.round(arBear(c,q)),here=d<1;
    return '<div class="arnr"><span class="arna t'+k+'"'+(here?'':' style="transform:rotate('+deg+'deg)"')+'>'+(here?uiIcon(ic):ar)+'</span><div><small>'+t+'</small><b>'+(here?'tutaj':arKmT(d))+'</b><span>'+(here?'w okolicy środka':AR_DIR[Math.round(deg/45)%8])+'</span></div></div>'};
  return '<div class="bsgrp">Najbliżej</div><div class="arnear">'+tile("s","Sygnał")+tile("w","Zaproszenie")+tile("e","Impreza")+tt("f","Las","tree")+tt("w","Woda","droplet")+'</div>'}
// odrysowanie samego radaru i licznika (suwaki, dociągnięte miejscowości) — bez przebudowy całego okna
function arRedraw(){const p=$("homesheet");if(!p||p.classList.contains("hide"))return;const s=p.querySelector(".arsvg");if(!s)return;
  const a=Object.assign(areaCur(),arLiveKm!=null?{km:arLiveKm}:{});const zm=s.querySelector(".arzm");if(zm)zm.setAttribute("transform",arZmT(arView.s));s.classList.toggle("zm",arView.s>1.01);const ia=s.querySelector(".arin");if(ia)ia.innerHTML=areaSvgIn(a);const wx=s.querySelector(".arwx");if(wx)wx.innerHTML=arWxSvg();const wl=$("arwxleg");if(wl)wl.innerHTML=arWxLeg();arWxGr();const c=p.querySelector(".arctr[data-hm=center]");if(c)c.classList.toggle("off",!arViewMoved());   // zawsze widoczny; przygaszony, gdy radar jest w środku
  const t=p.querySelector(".arcnt");if(t)t.innerHTML=arCntInner(a.km,areaCount(a))}
// plakietka w nagłówku: „📍 Pułtusk · 20 km”, w podglądzie „👁 Serock · 20 km ✕”
function renderAreaChip(){const el=$("mearea");if(!el)return;const a=areaCur();
  el.classList.toggle("peek",a.peek);el.classList.remove("hide");
  el.innerHTML=uiIcon(a.peek?"eye":"radar")+'<span class="arname">'+esc(a.name)+'</span><span class="arkm">'+areaKmTxt(a.km)+'</span>'
    +(a.peek?'<span class="arx" data-area-off="1" role="button" aria-label="Wróć do mojej okolicy">'+uiIcon("x")+'</span>':'');
  el.title=a.peek?"Podgląd okolicy: "+a.name+" — kliknij ✕, żeby wrócić do swojej":"Twoja okolica — kliknij, żeby zmienić promień albo podejrzeć inną"}
function openHome(mode){arView=arHomeView();homeRes=[];homeMsg="";hmMode=mode||"peek";renderHome();if(mode==="home")setTimeout(()=>{const i=$("homeq");if(i)i.focus()},120)}
// v335: suwak z dwoma uchwytami = dwa .arrng nałożone na siebie; dolny (#arlo) rysuje ścieżkę z wypełnieniem między uchwytami (--a…--b)
const arRngHtml=()=>{const [lo,hi]=arRng(),i=(id,v,l)=>'<input id="'+id+'" class="arrng" type="range" min="0" max="'+AR_CLN+'" step="any" value="'+v+'" aria-label="'+l+'">';
  return '<div class="ar2" style="--a:'+(lo/AR_CLN).toFixed(4)+';--b:'+(hi/AR_CLN).toFixed(4)+';--tk:'+(100/AR_CLN).toFixed(3)+'%">'+i("arlo",lo,"Największe miejscowości na radarze")+i("arhi",hi,"Najmniejsze miejscowości na radarze")+'</div>'};
function renderHome(){arHeadOn();
  // v349: przebudowa otwartego okna (Szukaj, przełączniki, ulubione) zostawia listę w tym samym miejscu — wcześniej skakała na górę
  const pv=$("homesheet"),ol=pv&&!pv.classList.contains("hide")?pv.querySelector(".bslist"):null,st=ol?ol.scrollTop:0;
  arLiveKm=null;const p=$("homesheet"),a=areaCur(),h=areaHome(),c=areaCount(a),q=$("homeq")?$("homeq").value:"",favs=areaFavs(),fk=x=>x.name+"|"+areaRound(x.lat).toFixed(2)+"|"+areaRound(x.lon).toFixed(2);
  const isFav=x=>favs.some(f=>fk(f)===fk(x));
  const srch='<div class="hmrow" style="margin-top:8px"><input id="homeq" maxlength="80" placeholder="'+(hmMode==="home"?"Twoja miejscowość, np. Pułtusk":"Miejscowość, np. Serock")+'" value="'+esc(q)+'" enterkeyhint="search"><button type="button" class="b" data-hm="find">Szukaj</button></div>'
    +(homeMsg?'<div class="note" style="margin-top:8px">'+homeMsg+'</div>':'')
    +homeRes.map((x,i)=>'<div class="hmresw"><button type="button" class="hmres" data-hm="pick" data-i="'+i+'"><b>'+esc(x.name)+'</b><span>'+esc(x.full)+'</span></button>'
      +(hmMode==="peek"?'<button type="button" class="hmfav'+(isFav(x)?' on':'')+'" data-hm="fav" data-i="'+i+'" aria-label="Ulubiona miejscowość">'+uiIcon(isFav(x)?"starf":"star")+'</button>':'')+'</div>').join("");
  p.innerHTML='<div class="bsbox" role="dialog" aria-modal="true" aria-label="Moja okolica"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-hm="close">Zamknij</button><b>'+uiIcon("pin")+' Moja okolica</b><span style="min-width:64px"></span></div><div class="bslist">'
   // v351: podgląd (też „Gdzie jestem”) można zatwierdzić jako Moją miejscowość — wcześniej było tylko „Wróć”
   +(a.peek?'<div class="hmcur arpeek">'+uiIcon(areaPeek&&areaPeek.gps?"locate":"eye")+'<span>'+(areaPeek&&areaPeek.gps?'Tu jesteś':'Podgląd')+': <b>'+esc(a.name)+'</b></span><div class="arpkb">'
     +(areaPeek&&areaPeek.name&&areaPeek.name!=="Tu jesteś"&&areaPeek.name!==h.name?'<button type="button" class="lnk" data-hm="sethome">Ustaw jako moją</button>':'')
     +'<button type="button" class="lnk" data-hm="unpeek">Wróć do: '+esc(h.name)+'</button></div></div>':'')
   +'<div class="arvis">'+areaSvg(a)+'<button type="button" class="fch arctr arloc'+(areaPeek&&areaPeek.gps?' on':'')+'" data-hm="gpspeek">'+uiIcon("locate")+' Gdzie jestem</button>'+'<button type="button" class="fch arctr'+(arViewMoved()?'':' off')+'" data-hm="center">'+uiIcon("target")+' Wyśrodkuj</button>'+(arRoute?'<button type="button" class="fch arctr arplay" data-hm="rtplay">'+uiIcon("play")+' Odtwórz</button>':'')+'</div><div class="arcntrow">'+arLegHtml()+'<div class="arcnt">'+arCntInner(a.km,c)+'</div>'+arTerLegHtml()+'</div>'
   +arWxBar()
   +'<div class="arsl"><div class="arslh"><span>Promień'+arQ("arinfo","Co daje promień?")+'</span><b id="arkmv">'+areaKmTxt(a.km)+'</b></div><input id="arkm" class="arrng" type="range" min="5" max="51" step="any" value="'+arSlVal(a.km)+'" style="--p:'+arSlP(arSlVal(a.km),5,51)+'" aria-label="Promień okolicy"><div class="arslt"><span>5 km</span><span>50 km</span><span>Polska</span></div>'
   +(arSlOff()?'':'<div class="arslh arsl2"><span>Miejscowości na radarze</span><b id="ardensv">'+(arTwOn()?arRngTxt(arRng()):'wyłączone')+'</b>'+arTgl("twon",arTwOn(),"Miejscowości na radarze")+'</div>')+(arTwOn()?arRngHtml()+'<div class="arslt ar2t">'+AR_CLT.map(t=>'<span>'+t+'</span>').join("")+'</div>':'')+arWxSl()+AREA_INFO.replace('<div class="note"','<div class="note hide" id="arinfo"')+'</div>'
   +arRouteHtml(a)+areaNearHtml(a)
   +'<div class="bsgrp">Moja miejscowość</div>'
   +'<div class="hmcur">'+uiIcon("pin")+'<span><b>'+esc(h.name)+'</b>'+(h.def?' <small>(domyślnie)</small>':'')+'</span><button type="button" class="lnk" data-hm="'+(hmMode==="home"?"mpeek":"mhome")+'">'+(hmMode==="home"?"Anuluj":"Zmień")+'</button></div>'
   +(hmMode==="home"?srch+'<button type="button" class="b g big" data-hm="gps" style="margin-top:10px">'+uiIcon("globe")+' Użyj mojej lokalizacji</button>':'')
   +'<div class="note" style="margin-top:6px">Od niej liczymy Twoją okolicę: zaproszenia, sygnały, imprezy i powiadomienia. Zapisana w profilu z dokładnością do ok. 2 km — widzisz ją tylko Ty.</div>'
   +'<div class="bsgrp">Podejrzyj inną okolicę</div>'
   +(favs.length?'<div class="arfavs">'+favs.map((x,i)=>'<button type="button" class="fch'+(a.peek&&areaPeek&&fk(areaPeek)===fk(x)?' on':'')+'" data-hm="fpick" data-i="'+i+'">'+uiIcon("starf")+' '+esc(x.name)+'</button>').join("")+'</div>':'')
   +(hmMode==="peek"?srch:'')
   +'<div class="note" style="margin-top:6px">Podgląd pokazuje, co dzieje się w innej okolicy. Nie zmienia powiadomień i kończy się po ponownym wejściu do aplikacji. '+uiIcon("star")+' dodaje miejscowość do ulubionych (do 10).</div>'
   +'</div><button type="button" class="totop hmtop'+(st>260?' on':'')+'" data-hm="top" aria-label="Na górę okna" title="Na górę"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14.5l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
  p.classList.remove("hide");if(ol){const l=p.querySelector(".bslist"),bx=p.querySelector(".bsbox");if(bx)bx.classList.add("bsstay");if(l)l.scrollTop=st}if(arRoute)arRoutePlacesUi();arWxGr();arWxLoad(areaCur());
}
function closeHome(){const p=$("homesheet");p.classList.add("hide");p.innerHTML="";areaChanged();if(gearOpen&&(gearView==="main"||gearView==="nick"))renderGear()}
async function homeFind(){const q=$("homeq")?$("homeq").value.trim():"";if(q.length<2){homeMsg="Wpisz nazwę miejscowości.";renderHome();return}
  homeMsg="Szukam…";homeRes=[];renderHome();const r=await geoSearch(q);
  homeRes=r||[];homeMsg=r===null?"Brak połączenia z OpenStreetMap — spróbuj za chwilę.":r.length?(hmMode==="home"?"Wybierz swoją miejscowość:":"Kliknij, żeby podejrzeć okolicę:"):"Nic nie znaleziono — spróbuj inaczej (np. sama nazwa miejscowości).";renderHome()}
function useGps(after){
  if(!navigator.geolocation){say("Ta przeglądarka nie udostępnia lokalizacji.");return}
  say("📡 Szukam Twojej lokalizacji…");
  navigator.geolocation.getCurrentPosition(async pos=>{
    const la=pos.coords.latitude,lo=pos.coords.longitude,g=await revGeo(la,lo);
    try{sessionStorage.setItem("gpsOrigin",JSON.stringify({name:(g&&g.city)||"Twoja lokalizacja",lat:la,lon:lo}))}catch(e){}
    evNearOn=true;try{localStorage.setItem("evNearOn","1")}catch(e){}
    say("📡 Odległości liczone od: "+((g&&g.city)||"Twojej lokalizacji"));after&&after({name:(g&&g.city)||"",lat:la,lon:lo});if(curTab===3)renderEvents()},
   err=>{say(err&&err.code===1?"Brak zgody na lokalizację — zezwól na nią w ustawieniach przeglądarki (ikona kłódki obok adresu) albo wpisz miejscowość ręcznie.":"Nie udało się ustalić lokalizacji — sprawdź, czy lokalizacja w telefonie jest włączona.")},
   {enableHighAccuracy:false,timeout:12000,maximumAge:600000});
}
// suwaki: radar na żywo (najwyżej raz na klatkę), promień zapisany po puszczeniu (oszczędnie dla serwera)
$("homesheet").addEventListener("input",e=>{const id=e.target.id;
  if(e.target.classList&&e.target.classList.contains("arrng"))e.target.style.setProperty("--p",arSlP(e.target.value,+e.target.min,+e.target.max));
  if(id==="arlo"||id==="arhi"){const L=$("arlo"),H=$("arhi");let lo=+L.value,hi=+H.value;if(lo>hi){if(id==="arlo")H.value=hi=lo;else L.value=lo=hi}   // uchwyt popycha drugi — nigdy się nie zakleszczą
    try{localStorage.setItem("arRng",lo.toFixed(2)+"-"+hi.toFixed(2))}catch(x){}const w=L.parentNode;w.style.setProperty("--a",(lo/AR_CLN).toFixed(4));w.style.setProperty("--b",(hi/AR_CLN).toFixed(4));
    const v=$("ardensv");if(v)v.textContent=arRngTxt([lo,hi]);arView.s=arAutoS();const V=arView,m=AR_RB,d=Math.hypot(V.x,V.y);if(d>m){V.x*=m/d;V.y*=m/d}}
  else if(id==="arwxh"){const h=+e.target.value;try{localStorage.setItem("arWxH",h.toFixed(2))}catch(x){}const v=$("arwxhv");if(v)v.textContent=arWxHTxt(h)}
  else if(id==="arkm"){const k=+e.target.value;arLiveKm=k>=50.5?0:Math.max(5,k);const v=$("arkmv");if(v)v.textContent=areaKmTxt(arKmFromSl(k))}   // v336: radar płynnie, napis i zapis co 1 km
  else return;
  if(!arRaf)arRaf=requestAnimationFrame(()=>{arRaf=0;arRedraw()})});
// 🤏 gesty na radarze: 1 palec / mysz — przesuwanie, 2 palce — przybliżanie, kółko — przybliżanie pod kursorem, dwuklik — wyśrodkuj
const arPt=new Map();let arG=null;
const arU=(s,e)=>{const r=s.getBoundingClientRect(),k=AR_W/r.width;return {x:(e.clientX-r.left)*k-AR_CX,y:(e.clientY-r.top)*k-AR_CY}};   // punkt względem środka radaru, w jednostkach rysunku
function arZoomAt(p,z){arView.s=Math.max(1,Math.min(AR_SMAX,z));arClamp()}   // skala całego radaru razem z pierścieniem (do ok. 2,4× — aż pierścień kompasu zniknie poza ekranem)
function arClamp(){const V=arView,m=arRoute?1e4:AR_RB,d=Math.hypot(V.x,V.y);if(d>m){V.x*=m/d;V.y*=m/d}if(d<3){V.x=0;V.y=0}
  if(!arRaf)arRaf=requestAnimationFrame(()=>{arRaf=0;arRedraw()})}
$("homesheet").addEventListener("pointerdown",e=>{const s=e.target.closest(".arsvg");if(!s)return;try{s.setPointerCapture(e.pointerId)}catch(x){}
  arPt.set(e.pointerId,arU(s,e));arG=null});
$("homesheet").addEventListener("pointermove",e=>{if(!arPt.has(e.pointerId))return;const s=$("homesheet").querySelector(".arsvg");if(!s)return;
  const p=arU(s,e),q=arPt.get(e.pointerId);
  if(arPt.size===1){arView.x+=(p.x-q.x)/arView.s;arView.y+=(p.y-q.y)/arView.s;arPt.set(e.pointerId,p);arClamp();return}
  arPt.set(e.pointerId,p);const [A,B]=[...arPt.values()],dd=Math.hypot(A.x-B.x,A.y-B.y),mid={x:(A.x+B.x)/2,y:(A.y+B.y)/2};
  if(!arG){arG={d:dd,z:arView.s,mid};return}
  arView.x+=(mid.x-arG.mid.x)/arView.s;arView.y+=(mid.y-arG.mid.y)/arView.s;arG.mid=mid;arZoomAt(mid,arG.z*dd/Math.max(1,arG.d))});
["pointerup","pointercancel"].forEach(t=>$("homesheet").addEventListener(t,e=>{arPt.delete(e.pointerId);arG=null}));
$("homesheet").addEventListener("wheel",e=>{const s=e.target.closest(".arsvg");if(!s)return;e.preventDefault();arZoomAt(arU(s,e),arView.s*Math.exp(-e.deltaY*.0015))},{passive:false});
$("homesheet").addEventListener("dblclick",e=>{if(!e.target.closest(".arsvg"))return;arView={z:1,x:0,y:0,s:1};arRedraw()});
$("homesheet").addEventListener("change",async e=>{
  if(e.target.id==="argpx"){const f=e.target.files&&e.target.files[0];e.target.value="";if(!f)return;const p=parseGpx(await f.text());
    if(p.length<2){say("Nie znaleziono punktów trasy w pliku GPX.");return}arRouteSet(p,f.name.replace(/\.gpx$/i,""));return}
  if(e.target.id!=="arkm")return;const k=arKmFromSl(e.target.value);if(await areaSave({area_km:k})){arLiveKm=null;areaChanged()}});
$("homesheet").addEventListener("click",async e=>{
  if(e.target===$("homesheet")){closeHome();return}
  const b=e.target.closest("[data-hm]");if(!b)return;const k=b.dataset.hm;
  if(k==="close"){closeHome();return}
  if(k==="top"){const l=$("homesheet").querySelector(".bslist");if(l)l.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});try{navigator.vibrate&&navigator.vibrate(8)}catch(err){}return}   // v349: ⬆ jak w formularzu zaproszenia (.totop)
  if(k==="center"){arView={z:1,x:0,y:0,s:1};if(arHide.size){arHide.clear();renderHome();return}arRedraw();return}
  if(k==="lg"){const t=b.dataset.k;if(arHide.has(t))arHide.delete(t);else arHide.add(t);b.classList.toggle("off",arHide.has(t));b.setAttribute("aria-pressed",String(!arHide.has(t)));arRedraw();return}   // v339: pełny widok (suwak dalej decyduje, które miejscowości)
  if(k==="q"){const n=$(b.dataset.q);if(n){const on=n.classList.toggle("hide")===false;b.setAttribute("aria-expanded",String(on))}return}
  if(k==="rtbase"){openRb("radar");return}
  if(k==="rtosm"){arRouteOsm();return}
  if(k==="tlg"){const o=arTerOff(),t=b.dataset.k;if(o.has(t))o.delete(t);else o.add(t);try{localStorage.setItem("arTerOff",[...o].join(""))}catch(err){}b.classList.toggle("off",o.has(t));b.setAttribute("aria-pressed",String(!o.has(t)));arRedraw();return}
  if(k==="twon"){try{localStorage.setItem("arTwOn",arTwOn()?"0":"1")}catch(err){}arView.s=arAutoS();arClamp();renderHome();return}
  if(k==="wxon"){try{localStorage.setItem("arWxOn",arWxOn()?"0":"1")}catch(err){}renderHome();return}
  if(k==="rtdel"){arRoute=null;arView=arHomeView();renderHome();return}
  if(k==="rtplay"){if(arRoute){arRoute.t0=performance.now();arRedraw()}return}   // v339: odtwórz = tylko narysuj od nowa, widok (przybliżenie, przesunięcie) zostaje
  // 📡 radar od mojej lokalizacji z telefonu: podgląd okolicy (nic nie zapisujemy, powiadomienia dalej z Mojej miejscowości)
  if(k==="gpspeek"){arHeadAsk();useGps(x=>{if(!x)return;areaPeek={name:x.name||"Tu jesteś",lat:+x.lat,lon:+x.lon,gps:true};arView=arHomeView();areaChanged();renderHome()});return}
  if(k==="find"){homeFind();return}
  if(k==="mhome"||k==="mpeek"){homeRes=[];homeMsg="";hmMode=k==="mhome"?"home":"peek";renderHome();if(hmMode==="home")setTimeout(()=>{const i=$("homeq");if(i)i.focus()},60);return}
  if(k==="unpeek"){areaPeek=null;areaChanged();renderHome();return}
  if(k==="sethome"){const x=areaPeek;if(!x||!x.name)return;areaSetHome({name:x.name,lat:+x.lat,lon:+x.lon});hmMode="peek";arView=arHomeView();renderHome();say("📍 Moja miejscowość: "+x.name);return}
  if(k==="pick"){const x=homeRes[+b.dataset.i];if(!x)return;
    if(hmMode==="home"){areaSetHome(x);evNearOn=true;try{localStorage.setItem("evNearOn","1")}catch(err){}homeRes=[];homeMsg="";hmMode="peek";renderHome();say("📍 Moja miejscowość: "+x.name);return}
    areaPeek={name:x.name,lat:x.lat,lon:x.lon};areaChanged();homeRes=[];homeMsg="";renderHome();return}
  if(k==="fpick"){const x=areaFavs()[+b.dataset.i];if(!x)return;areaPeek=(areaPeek&&areaPeek.name===x.name)?null:{name:x.name,lat:+x.lat,lon:+x.lon};areaChanged();renderHome();return}
  if(k==="fav"){const x=homeRes[+b.dataset.i];if(!x)return;const fk=y=>y.name+"|"+areaRound(y.lat).toFixed(2)+"|"+areaRound(y.lon).toFixed(2);
    let f=areaFavs();const on=f.some(y=>fk(y)===fk(x));
    if(on)f=f.filter(y=>fk(y)!==fk(x));else{if(f.length>=10){say("Najwyżej 10 ulubionych miejscowości — usuń którąś.");return}f=f.concat([{name:x.name.slice(0,60),lat:areaRound(x.lat),lon:areaRound(x.lon)}])}
    await areaSave({area_places:f});renderHome();return}
  if(k==="gps"){useGps(x=>{if(x&&x.name){areaSetHome(x);hmMode="peek";renderHome();say("📍 Moja miejscowość: "+x.name)}});return}
});
// v349: ⬆ w lewym dolnym rogu okna „Moja okolica” — pokazuje się po przewinięciu (scroll nie bąbelkuje, więc nasłuch w fazie przechwytywania)
$("homesheet").addEventListener("scroll",e=>{const l=e.target;if(!l.classList||!l.classList.contains("bslist"))return;const t=$("homesheet").querySelector(".hmtop");if(t)t.classList.toggle("on",l.scrollTop>260)},{capture:true,passive:true});
$("homesheet").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="homeq"){e.preventDefault();homeFind()}});
document.addEventListener("click",e=>{if(e.target.closest("[data-home]")){openHome("home");return}
  if(e.target.closest("[data-arout]")){openHome();return}
  const ar=e.target.closest("#mearea");if(ar){if(e.target.closest("[data-area-off]")){areaPeek=null;areaChanged();say("📍 Wróciłeś do swojej okolicy: "+areaHome().name)}else openHome();}});
// filtr imprez = wspólny silnik Filtrów (fltEvOk, js/10 — etap C) + „W okolicy” + 🗑 „Do usunięcia” (admin, tylko tutaj)
function evMatch(e){
  if(!nearOk(e))return false;
  if(evFlt==="delreq"&&!e.delete_req_at)return false;
  return typeof fltEvOk!=="function"||fltEvOk(e);
}
const evFltOn=()=>evFlt==="delreq"||(typeof fltActiveFor==="function"&&fltActiveFor("ev"));
// szybkie bomble nad listą — skróty do tych samych filtrów co w oknie „Filtry imprez”
const EV_QUICK=[["gravel","🪨 Gravel"],["road","🛣 Szosa"],["mtb","⛰ MTB"],["ebike","⚡ E-bike"],["run","🏃 Bieg"],["walk","🚶 Marsz"]];
function evQuickOn(v){if(v==="")return !evFltOn();if(v==="delreq")return evFlt==="delreq";if(v==="mine")return flt.who==="mine";
  return v==="run"||v==="walk"?flt.act===v:flt.act==="bike"&&flt.bike===v}
function evQuick(v){
  if(v===""){(FLT_KINDS.ev||[]).forEach(k=>{flt[k]=FLT_MULTI.includes(k)?[]:""});flt.date="";evFlt=""}
  else if(v==="delreq")evFlt=evFlt==="delreq"?"":"delreq";
  else if(v==="mine")flt.who=flt.who==="mine"?"":"mine";
  else if(v==="run"||v==="walk"){flt.act=flt.act===v?"":v;flt.bike=""}
  else if(evQuickOn(v)){flt.act="";flt.bike=""}else{flt.act="bike";flt.bike=v}
  fltSave();fltRefresh();
}
/* 🔢 licznik imprez (decyzja właściciela 2026-11-17 05:30: wariant B, liczba zmienia się z filtrami)
   bez filtra: „24 imprezy w kalendarzu · 18 nadchodzących · 3 w okolicy (100 km)”; z filtrem: „Pasuje 12 z 24 imprez · 9 nadchodzących” */
function evCountHtml(){
  const all=evs.length;if(!all)return "";
  const UP=["nadchodząca","nadchodzące","nadchodzących"],fon=evFltOn()||(evNearOn&&evGeoOk);
  const M=fon?evs.filter(evMatch):evs,up=M.filter(e=>!evPast(e)).length;
  const P=[fon?'Pasuje <b>'+M.length+'</b> z '+all+' '+(all===1?'imprezy':'imprez'):'<b>'+all+'</b> '+plf(all,["impreza","imprezy","imprez"])+' w kalendarzu',up+' '+plf(up,UP)];
  if(!fon&&evGeoOk&&areaKm()){const k=evs.filter(e=>{if(evPast(e))return false;const d=evKm(e);return d!=null&&d<=areaKm()}).length;if(k)P.push(k+' w okolicy ('+areaKm()+' km)')}
  return P.map(x=>x.replace(/ (?![^<]*>)/g,"\u00a0")).join(' · ');   // części nie łamią się w środku
}
function renderEvents(){
  // zakładka Imprezy włączona później (np. „Funkcje testowe: Pokaż” po starcie z pamięci telefonu) — dociągnij imprezy raz
  if(!evLoaded&&!evLoading&&tabOk(3)){evLoading=true;(session?loadEvents():loadEventsPub()).then(()=>{evLoading=false;renderEvents();try{snapSave()}catch(e){}}).catch(()=>{evLoading=false})}
  const box=$("evlist");if(!box)return;
  $("evbeta").innerHTML=betaTag("tab_events");$("evadd").classList.toggle("hide",!session);
  $("evchips").innerHTML=(evGeoOk?'<button type="button" class="fch near'+(evNearOn?' on':'')+'" data-evnear="1">📍 '+(evNearOn?(areaCur().peek?esc(areaCur().name)+' · ':'W okolicy · ')+areaKmTxt(areaKm()):'W okolicy')+'</button>':'')
   +(session?'<button type="button" class="fch evfb'+(evFltOn()?' on':'')+'" data-evflt="1">'+uiIcon("sliders")+'Filtry'+(fltKeysFor("ev").length?'<span class="fcn">'+fltKeysFor("ev").length+'</span>':'')+'</button>':'')
   +[["","Wszystkie"]].concat(EV_QUICK).concat(session?[["mine","🙋 Moje"]]:[]).concat(isAdmin&&evs.some(x=>x.delete_req_at)?[["delreq","🗑 Do usunięcia ("+evs.filter(x=>x.delete_req_at).length+")"]]:[]).map(([v,t])=>'<button type="button" class="fch'+(evQuickOn(v)?' on':'')+'" data-evf="'+v+'">'+t+'</button>').join("");
  const fb=$("evfltbar");if(fb){const K=session?fltKeysFor("ev"):[];fb.classList.toggle("hide",!K.length);   // aktywne filtry (też ustawione w Zaproszeniach) — każdy z ✕
    fb.innerHTML=K.length?'<div class="fltchips">'+K.map(k=>'<button type="button" class="fac" data-fx="'+k+'">'+esc(fltLabel(k))+' ✕</button>').join("")+'<button type="button" class="lnk fclr" data-fx="*">Wyczyść</button></div>':''}
  $("evnear").innerHTML=evNearHtml();
  $("evcnt").innerHTML=evOk?evCountHtml():"";
  if(!evOk){box.innerHTML='<div class="note" style="margin-top:12px">Imprezy jeszcze niedostępne (KROK 40 w bazie).</div>';$("evarch").innerHTML="";return}
  const up=evs.filter(e=>!evPast(e)&&evMatch(e)).sort((a,b)=>a.date_from.localeCompare(b.date_from)),past=evs.filter(e=>evPast(e)&&evMatch(e)).sort((a,b)=>b.date_from.localeCompare(a.date_from));
  let m="",h="";
  const tops=up.filter(e=>evState(e)||evStick.has(e.id)),topSet=new Set(tops.map(e=>e.id)),nTop=tops.filter(e=>evState(e)).length;
  if(tops.length)h+='<div class="evmon evtop"><span>Nowe i zmienione'+(nTop?' ('+nTop+')':'')+'</span>'+(nTop?'<button type="button" class="lnk" data-ev="seenall">Oznacz jako przeczytane</button>':'')+'</div>'+tops.map(evCard).join("");
  up.filter(e=>!topSet.has(e.id)).forEach(e=>{const d=new Date(e.date_from+"T12:00"),k=d.toLocaleDateString("pl-PL",{month:"long",year:"numeric"});if(k!==m){m=k;h+='<div class="evmon">'+esc(k)+'</div>'}h+=evCard(e)});
  const noGeo=evNearOn&&evGeoOk&&originGet()?evs.filter(e=>!evPast(e)&&!evHasGeo(e)).length:0;
  box.innerHTML=(evNearOn&&evGeoOk&&!originGet()?'<div class="note" style="margin-top:12px">Ustaw swoją miejscowość albo użyj lokalizacji, żeby zobaczyć imprezy w okolicy.</div>':
     h||'<div class="note" style="margin-top:12px">'+(evNearOn&&evGeoOk&&areaKm()?'Brak imprez w promieniu '+areaKm()+' km. <button type="button" class="lnk" data-evnear="1">Pokaż dalej ›</button>':evFltOn()?'Brak imprez dla tych filtrów. <button type="button" class="lnk" data-fxall="1">Wyczyść filtry</button>':(session?'Nie ma jeszcze imprez. Dodaj pierwszą — „＋ Dodaj imprezę”.':'Nie ma jeszcze imprez.'))+'</div>')
   +(noGeo?'<div class="note evnogeo">'+noGeo+' '+plf(noGeo,["impreza","imprezy","imprez"])+' bez miejsca na mapie (np. „do ogłoszenia”) — nie wiadomo, czy '+(noGeo===1?'jest':'są')+' blisko.</div>':'');
  $("evarch").innerHTML=past.length?'<div class="arch"><button type="button" class="ah" data-ev="arch">🗄 Minione imprezy<span>'+past.length+' '+(evArchOpen?'⌃':'⌄')+'</span></button>'+(evArchOpen?past.map(evCard).join(""):'')+'</div>':'';
}
async function evJoin(e,did){
  try{const mine=evMine(e);
    const r=mine?await sb.from("event_participants").update({distance_id:did}).eq("event_id",e.id).eq("user_id",uid):await sb.from("event_participants").insert({event_id:e.id,distance_id:did});
    if(r.error)throw r.error;
    const P=evPart[e.id]=(evPart[e.id]||[]).filter(x=>x.user_id!==uid);P.push({event_id:e.id,user_id:uid,distance_id:did});
    renderEvents();try{navigator.vibrate&&navigator.vibrate(15)}catch(err){}say("🏁 Jedziesz: "+e.name)}
  catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
}
async function evLeave(e){
  if(!await askOk("Rezygnujesz z „"+e.name+"”?","Rezygnuję",1))return;
  try{const r=await sb.from("event_participants").delete().eq("event_id",e.id).eq("user_id",uid);if(r.error)throw r.error;
    evPart[e.id]=(evPart[e.id]||[]).filter(x=>x.user_id!==uid);renderEvents();say("Zrezygnowano.")}catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
}
$("p3").addEventListener("click",async e=>{
  const f=e.target.closest("[data-evf]");if(f){evQuick(f.dataset.evf);return}
  if(e.target.closest("[data-evflt]")){openFlt("ev");return}
  if(e.target.closest("[data-evnear]")){evNearOn=!evNearOn;try{localStorage.setItem("evArea",evNearOn?"1":"0")}catch(err){}renderEvents();return}
  const eo=e.target.closest("[data-evo]");if(eo){const k=eo.dataset.evo;
    if(k==="area")openHome();else if(k==="set")openHome("home");else if(k==="gps")useGps();else if(k==="home"){try{sessionStorage.removeItem("gpsOrigin")}catch(err){}renderEvents()}return}
  if(e.target.closest("#evadd")){if(!session)return;openEvForm(null);return}
  const b=e.target.closest("[data-ev]");if(!b)return;
  if(b.dataset.ev==="login"){setGuest(false);renderChrome();return}   // 👤 gość → logowanie (jak przy odliczaniu)
  if(b.dataset.ev==="arch"){evArchOpen=!evArchOpen;renderEvents();return}
  if(b.dataset.ev==="seenall"){evSeenMark(evs.filter(x=>evState(x)).map(x=>x.id));lsSet("evBell",String(Date.now()));evStick=new Set();renderEvents();renderBell();return}
  const ev=evs.find(x=>x.id===b.dataset.id);if(!ev)return;
  const a=b.dataset.ev;
  if(!session&&a!=="tog")return;   // 👤 gość: tylko podgląd (bez zapisów, kalendarza i udostępniania)
  if(a==="tog"){evOpen=evOpen===ev.id?"":ev.id;if(evOpen&&evState(ev)){evSeenMark([ev.id]);evStick.add(ev.id);renderBell()}renderEvents();return}
  if(a==="inv"){if(!evInvOk){say("Zapraszanie na imprezy wymaga KROKU 54 w bazie.");return}openWho("ev",ev.id);return}
  if(a==="join"){evJoin(ev,b.dataset.d);return}
  if(a==="leave"){if(b.dataset.d&&evMine(ev)&&evMine(ev).distance_id!==b.dataset.d){evJoin(ev,b.dataset.d);return}evLeave(ev);return}
  if(a==="edit"){openEvForm(ev);return}
  if(a==="dup"){openEvForm(ev,true);return}
  if(a==="gcal"){const end=new Date(evEnd(ev)+"T12:00");end.setDate(end.getDate()+1);const q=new URLSearchParams({action:"TEMPLATE",text:ev.name,dates:ev.date_from.replace(/-/g,"")+"/"+localIso(end).slice(0,10).replace(/-/g,""),location:ev.place||"",details:(ev.url||"")+(ev.note?"\n"+ev.note:"")});
    window.open("https://calendar.google.com/calendar/render?"+q.toString(),"_blank","noopener");return}
  if(a==="share"){const t="🏁 "+ev.name+" · "+evDates(ev)+(ev.place?" · "+ev.place:"")+(evKmLine(ev)?"\n"+evKmLine(ev):"");
    if(navigator.share){try{await navigator.share({title:ev.name,text:t,url:ev.url||location.href.split("#")[0]});return}catch(err){if(err&&err.name==="AbortError")return}}
    try{await navigator.clipboard.writeText(t+(ev.url?"\n"+ev.url:""));say("Skopiowano opis imprezy.")}catch(err){say(t)}return}
  if(a==="like"){const L=evLikes[ev.id]=evLikes[ev.id]||[],on=L.includes(uid);
    try{const r=on?await sb.from("event_likes").delete().eq("event_id",ev.id).eq("user_id",uid):await sb.from("event_likes").insert({event_id:ev.id});if(r.error)throw r.error;
      if(on)evLikes[ev.id]=L.filter(x=>x!==uid);else{L.push(uid);try{navigator.vibrate&&navigator.vibrate(10)}catch(err){}}renderEvents()}catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}return}
  if(a==="delreq"){
    if(!await askOk("Poprosić admina o usunięcie imprezy „"+ev.name+"”?","Poproś"))return;
    try{const t=new Date().toISOString(),r=await sb.from("events").update({delete_req_at:t,delete_req_by:uid}).eq("id",ev.id).select("id");if(r.error||!r.data||!r.data.length)throw r.error||new Error("brak uprawnień");
      ev.delete_req_at=t;ev.delete_req_by=uid;renderEvents();say("Wysłano prośbę o usunięcie — zdecyduje admin.")}catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}return}
  if(a==="delno"){
    try{const r=await sb.from("events").update({delete_req_at:null,delete_req_by:null}).eq("id",ev.id).select("id");if(r.error||!r.data||!r.data.length)throw r.error||new Error("brak uprawnień");
      ev.delete_req_at=null;ev.delete_req_by=null;renderEvents();say(isAdmin?"Prośba odrzucona.":"Prośba cofnięta.")}catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}return}
  if(a==="del"){
    const n=(evPart[ev.id]||[]).length,t=prompt("Usunąć imprezę „"+ev.name+"”"+(n?" (zapisanych: "+n+")":"")+"?\nWpisz USUŃ, żeby potwierdzić:");
    if((t||"").trim().toUpperCase()!=="USUŃ"){if(t!==null)say("Nie usunięto — trzeba wpisać USUŃ.");return}
    try{const r=await sb.from("events").delete().eq("id",ev.id);if(r.error)throw r.error;evs=evs.filter(x=>x.id!==ev.id);renderEvents();say("Usunięto imprezę.")}catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
  }
});
// formularz imprezy (okienko od dołu)
function openEvForm(e,dup){
  ef={geo:e&&evHasGeo(e)?{lat:+e.lat,lon:+e.lon,name:""}:null,geoFor:e&&evHasGeo(e)&&e.place||"",geoAlt:[],geoBusy:false,
    id:e?e.id:null,name:e?e.name:"",from:e?e.date_from:"",to:e&&e.date_to||"",place:e&&e.place||"",url:e&&e.url||"",note:e&&e.note||"",price:e&&e.price_info||"",ai:{},imp:{mode:"url",url:"",text:"",busy:false,msg:"",ok:"",warn:"",dup:""},reg:e&&e.reg_closed?"closed":"open",regUntil:e&&e.reg_until||"",
    inv:[],invMsg:"",dist:e?(evDist[e.id]||[]).map(d=>({id:d.id,bike:d.bike,km:String(+d.km),name:d.name||"",elev:d.elev!=null?String(d.elev):"",lim:limEdit(d.limit_min)})):[{bike:"gravel",km:"",name:"",elev:"",lim:""}],join:"",dup:!!dup};
  if(!e&&!dup&&isAdmin&&evImpLeft==null&&session)sb.rpc("ev_import_left").then(r=>{if(!r.error&&r.data!=null){evImpLeft=+r.data;if(ef&&!ef.id&&!ef.dup)efRender()}}).catch(()=>{});   // 🔗 start z pamięci telefonu — licznik jeszcze nieznany
  if(dup){
    // kopia jako nowa impreza: gdy minęła — rok w nazwie i daty +1; zapisy od nowa; popraw, co się nie zgadza
    const past=evPast(e),y=d=>{if(!d)return "";const x=new Date(d+"T12:00");x.setFullYear(x.getFullYear()+1);return localIso(x).slice(0,10)};
    ef.id=null;ef.dist.forEach(d=>delete d.id);ef.reg="open";ef.regUntil="";
    if(past){ef.from=y(ef.from);ef.to=y(ef.to);ef.name=ef.name.replace(/\b(20\d\d)\b/,m=>String(+m+1));ef.price=""}
    else ef.name=ef.name+" (kopia)";
    ef.note=(ef.note||"").replace(/^(🤖|AI z linku)[^—]*—\s*/,"");
  }
  renderEvForm();
}
function renderEvForm(){
  const p=$("evsheet");p.classList.remove("hide");
  const sim=ef.name.trim().length>=3?evs.filter(x=>x.id!==ef.id&&lc(x.name).includes(lc(ef.name.trim().slice(0,12)))).slice(0,3):[];
  p.innerHTML='<div class="bsbox evfbox" role="dialog" aria-modal="true" aria-label="Impreza"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-ef="close">Anuluj</button><b>'+(ef.id?'Edytuj imprezę':ef.dup?'Duplikuj imprezę':'Dodaj imprezę')+'</b><span style="min-width:64px"></span></div><div class="bslist">'+(ef.dup?'<div class="evsim">⧉ Kopia — popraw nazwę, daty i to, co się nie zgadza. Zapisani się nie kopiują.</div>':'')
   +efImpHtml()
   +'<div class="bsgrp">Nazwa'+ail("name")+'</div><input id="efname"'+aic("name")+' maxlength="80" placeholder="np. Ultra Duch Puszczy 2027" value="'+esc(ef.name)+'">'
   +'<div id="efsim">'+(sim.length?'<div class="evsim">Już są: '+sim.map(x=>'<b>'+esc(x.name)+'</b> ('+esc(evDates(x))+')').join(", ")+' — sprawdź, czy to nie ta sama.</div>':'')+'</div>'
   +'<div class="evtwo"><div><div class="bsgrp">Od'+ail("from")+'</div><input type="date" id="effrom"'+aic("from")+' value="'+esc(ef.from)+'"></div><div><div class="bsgrp">Do <span class="note">(opcj.)</span></div><input type="date" id="efto"'+aic("to")+' value="'+esc(ef.to)+'"></div></div>'
   +'<div class="bsgrp">Gdzie (start / meta)'+ail("place")+'</div><input id="efplace"'+aic("place")+' maxlength="80" placeholder="np. Pułtusk, Przystań Miejska" value="'+esc(ef.place)+'">'
   +(evGeoOk?'<div id="efgeo">'+efGeoHtml()+'</div>':'')
   +'<div class="bsgrp">Dystanse (rower + km'+(evExtraOk?', przewyższenie, limit':'')+')'+(ef.dist.length>1?' <span class="note">· przeciągnij ⋮⋮</span>':'')+ail("dist")+'</div><div id="efdist"'+aic("dist","box")+'>'+efDistHtml()+'</div><button type="button" class="lnk" data-ef="adddist">＋ dodaj dystans</button>'
   +'<div class="bsgrp">Zapisy'+ail("reg")+'</div><div'+aic("reg","seg")+' id="efreg"><button type="button" data-ef="reg" data-v="open" class="'+(ef.reg==="open"?'on':'')+'">📝 Trwają</button><button type="button" data-ef="reg" data-v="closed" class="'+(ef.reg==="closed"?'on':'')+'">🔒 Zakończone</button></div>'
   +(ef.reg==="open"?'<div class="evtwo"><div><div class="bsgrp">Zapisy do <span class="note">(opcj.)</span></div><input type="date" id="efregu"'+aic("regUntil")+' value="'+esc(ef.regUntil)+'"></div><div></div></div>':'')
   +'<div class="bsgrp">Strona imprezy <span class="note">(opcj.)</span></div><input id="efurl"'+aic("url")+' type="url" maxlength="300" placeholder="https://…" value="'+esc(ef.url)+'">'
   +(evPriceOk?'<div class="bsgrp">Ceny / wpisowe <span class="note">(opcj.)</span>'+ail("price")+'</div><input id="efprice"'+aic("price")+' maxlength="200" placeholder="np. 150 zł do 31.03, potem 180 zł" value="'+esc(ef.price)+'">':'')
   +'<div class="bsgrp">Krótki komentarz <span class="note">(opcj.)</span></div><textarea id="efnote"'+aic("note")+' maxlength="300" rows="2" placeholder="np. zapisy przez competit.pl, start grupami">'+esc(ef.note)+'</textarea>'
   +(!ef.id&&evInvOk?'<div class="bsgrp">Zaproś znajomych <span class="note">(opcj.)</span></div><button type="button" class="who'+(ef.inv.length?' priv':'')+'" data-ef="inv"><span class="wic">👥</span><span class="wtx"><b>'+(ef.inv.length?'Wybrane osoby ('+ef.inv.length+')':'Nikogo')+'</b><span>'+esc(ef.inv.length?favFirst(ef.inv).map(id=>nicks[id]).join(", ")+(ef.invMsg?' · „'+ef.invMsg+'”':''):'Dostaną powiadomienie — możesz też zaprosić później z karty imprezy')+'</span></span><span class="war">›</span></button>':'')
   +(ef.id?'':'<div class="bsgrp">Biorę udział</div><select id="efjoin"><option value="">— nie teraz —</option>'+ef.dist.map((d,i)=>'<option value="'+i+'"'+(ef.join===String(i)?' selected':'')+'>'+EV_BIKE[d.bike][0]+' '+esc(d.name||EV_BIKE[d.bike][1])+(d.km?' · '+esc(d.km)+' km':'')+'</option>').join("")+'</select>')
   +'</div><button type="button" class="b big" data-ef="save">'+(ef.id?'Zapisz zmiany':'Dodaj imprezę')+'</button></div>';
}
const GRIP='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
function efGeoHtml(){
  if(!ef.place.trim())return '';
  if(ef.geoBusy)return '<div class="efgeo">📍 Szukam na mapie…</div>';
  if(ef.geoFor!==ef.place.trim())return '<div class="efgeo">📍 Punkt na mapie znajdę przy zapisie — <button type="button" class="lnk" data-ef="geo">sprawdź teraz</button></div>';
  if(!ef.geo)return '<div class="efgeo warn">⚠️ Nie znaleziono na mapie — impreza nie pojawi się w filtrze „W okolicy”. Wpisz miejscowość (np. „Hajnówka”).</div>';
  return '<div class="efgeo ok">📍 Na mapie: <b>'+esc(ef.geo.name||ef.place.trim())+'</b>'+(ef.geoAlt.length?'<div class="efalt">To nie to? '+ef.geoAlt.map((x,i)=>'<button type="button" class="chip" data-ef="geopick" data-i="'+i+'">'+esc(x.name)+'</button>').join("")+'</div>':'')+'</div>';
}
async function efGeocode(){
  const q=ef.place.trim();if(!q||!evGeoOk){ef.geo=null;ef.geoFor=q;return}
  ef.geoBusy=true;const g0=$("efgeo");if(g0)g0.innerHTML=efGeoHtml();
  const r=await geoSearch(q);ef.geoBusy=false;
  if(r===null){ef.geoFor="";const g=$("efgeo");if(g)g.innerHTML='<div class="efgeo warn">⚠️ Brak połączenia z OpenStreetMap — punkt na mapie uzupełnię przy następnym zapisie.</div>';return}
  ef.geoFor=q;ef.geo=r[0]?{lat:r[0].lat,lon:r[0].lon,name:r[0].full}:null;ef.geoAlt=r.slice(1,4).map(x=>({lat:x.lat,lon:x.lon,name:x.full}));
  const g=$("efgeo");if(g)g.innerHTML=efGeoHtml();
}
function efDistHtml(){return ef.dist.map((d,i)=>'<div class="evdw" data-i="'+i+'"><div class="evdr">'+(ef.dist.length>1?'<span class="evgrip" data-i="'+i+'" title="Przeciągnij, by zmienić kolejność" aria-label="Przeciągnij, by zmienić kolejność">'+GRIP+'</span>':'')+'<select data-efd="bike" data-i="'+i+'">'+Object.entries(EV_BIKE).map(([k,v])=>'<option value="'+k+'"'+(d.bike===k?' selected':'')+'>'+v[0]+' '+v[1]+'</option>').join("")+'</select>'
  +'<input data-efd="km" data-i="'+i+'" inputmode="decimal" maxlength="6" placeholder="km" value="'+esc(d.km)+'"><input data-efd="name" data-i="'+i+'" maxlength="40" placeholder="nazwa (opcj.)" value="'+esc(d.name)+'">'
  +(ef.dist.length>1?'<button type="button" class="evdx" data-ef="rmdist" data-i="'+i+'" aria-label="Usuń dystans">✕</button>':'')+'</div>'
  +(evExtraOk?'<div class="evdr evdr2'+(ef.dist.length>1?' ind':'')+'"><label>📈<input data-efd="elev" data-i="'+i+'" inputmode="numeric" maxlength="5" placeholder="przewyższ." value="'+esc(d.elev||"")+'"><em>m</em></label>'
    +'<label>⏱<input data-efd="lim" data-i="'+i+'" maxlength="8" placeholder="limit" value="'+esc(d.lim||"")+'"><em>h</em></label></div>':'')+'</div>').join("")}
function efRead(){const v=id=>{const x=$(id);return x?x.value:""};ef.name=v("efname");ef.from=v("effrom");ef.to=v("efto");ef.place=v("efplace");ef.url=v("efurl");ef.note=v("efnote");if($("efregu"))ef.regUntil=v("efregu");if($("efjoin"))ef.join=v("efjoin");
  if($("efprice"))ef.price=v("efprice");if($("efimpurl"))ef.imp.url=v("efimpurl");if($("efimptxt"))ef.imp.text=v("efimptxt")}
/* ---------- 🔗 „Wypełnij z linku” (KROK 55; decyzje właściciela 2026-11-17 00:12–00:15) ----------
   tylko admini; Edge Function „impreza-z-linku” pobiera stronę i pyta Claude Haiku; pola od AI na żółto
   („⚠️ sprawdź” = AI niepewne), nic nie zapisuje się samo — admin poprawia i klika „Dodaj imprezę” */
const EF_AIK={efname:"name",effrom:"from",efto:"to",efplace:"place",efregu:"regUntil",efurl:"url",efnote:"note",efprice:"price"};
const aiK=k=>ef&&ef.ai&&ef.ai[k];
const aic=(k,base)=>{const c=((base||"")+(aiK(k)?" aif"+(aiK(k)==="low"?" low":""):"")).trim();return c?' class="'+c+'"':""};
const ail=k=>aiK(k)?'<span class="aitag'+(aiK(k)==="low"?' low':'')+'">'+(aiK(k)==="low"?'⚠️ sprawdź':'🤖 z linku')+'</span>':"";
function efRender(){const L=$("evsheet").querySelector(".bslist"),st=L?L.scrollTop:0;renderEvForm();const L2=$("evsheet").querySelector(".bslist");if(L2)L2.scrollTop=st}
function efImpHtml(){
  if(ef.id||ef.dup||evImpLeft==null||!isAdmin)return "";
  const m=ef.imp,url=m.mode==="url",off=m.busy||!evImpLeft?' disabled':'';
  return '<div class="evimp"><div class="evimph">🔗 <b>Wypełnij z linku</b><span class="note">AI · zostało '+evImpLeft+' dziś</span></div>'
   +'<div class="evimpd">'+(url?'Wklej link do strony organizatora — uzupełnię nazwę, daty, miejsce, dystanse i ceny. Sprawdź je przed zapisem.':'Wklej opis imprezy (np. z Facebooka albo z regulaminu PDF) — wyciągnę z niego dane.')+'</div>'
   +(url?'<div class="evimpr"><input id="efimpurl" type="url" inputmode="url" maxlength="300" placeholder="https://…" value="'+esc(m.url)+'"'+(m.busy?' disabled':'')+'><button type="button" class="b" data-ef="imp"'+off+'>Pobierz dane</button></div>'
       :'<textarea id="efimptxt" rows="5" maxlength="30000" placeholder="Wklej tutaj tekst ze strony…"'+(m.busy?' disabled':'')+'>'+esc(m.text)+'</textarea><button type="button" class="b wide" data-ef="imp"'+off+'>Wypełnij z tekstu</button>')
   +(m.busy?'<div class="evimps busy" role="status"><span class="spin"></span>'+(url?'Czytam stronę i szukam danych… (do ok. 30 s)':'Szukam danych w tekście…')+'</div>':'')
   +(m.msg?'<div class="evimps err" role="alert">'+esc(m.msg)+'</div>':'')
   +(m.ok?'<div class="evimps ok">✅ '+esc(m.ok)+'</div>':'')
   +(m.dup?'<div class="evimps warn">⚠️ Podobna impreza już jest: <b>'+esc(m.dup)+'</b> — sprawdź, czy to nie ta sama.</div>':'')
   +(m.warn?'<div class="evimps warn">⚠️ '+esc(m.warn)+'</div>':'')
   +(m.busy?'':'<button type="button" class="lnk" data-ef="impmode">'+(url?'📋 Strona się nie pobiera? Wklej tekst':'🔗 Wróć do linku')+'</button>')
   +'</div>';
}
async function efImport(){
  const my=ef,m=ef.imp;if(m.busy)return;
  const url=m.mode==="url"?m.url.trim():"",text=m.mode==="text"?m.text.trim():"";
  m.msg="";m.ok="";m.warn="";m.dup="";
  if(m.mode==="url"&&!/^https?:\/\/\S+\.\S+/i.test(url)){m.msg="Wklej pełny link do strony (zaczyna się od https://).";efRender();return}
  if(m.mode==="text"&&text.length<40){m.msg="Wklej więcej tekstu — co najmniej kilka zdań z datą i dystansami.";efRender();return}
  m.busy=true;efRender();
  let j=null,err="";
  try{
    const r=await sb.functions.invoke("impreza-z-linku",{body:url?{url}:{text}});
    j=r.data;
    if(r.error){const ctx=r.error.context;let st=0;
      if(ctx&&typeof ctx.json==="function"){st=ctx.status||0;try{j=await ctx.json()}catch(_){j=null}}
      if(!j||j.ok===undefined){
        err=st===404?"Funkcja „impreza-z-linku” nie jest jeszcze wdrożona w Supabase (instrukcja: INSTRUKCJA_impreza_z_linku.md)."
          :st===401?"Supabase odrzucił zapytanie (401). W ustawieniach funkcji „impreza-z-linku” wyłącz „Verify JWT” — funkcja sama sprawdza zalogowanie."
          :/Failed to send|fetch|network/i.test(r.error.message||"")?"Brak połączenia z funkcją „impreza-z-linku” — sprawdź internet albo czy funkcja jest wdrożona."
          :"Błąd funkcji: "+(r.error.message||st);j=null}}
    if(typeof j==="string"){try{j=JSON.parse(j)}catch(_){j=null}}
  }catch(e){err="Nie udało się: "+(e&&e.message?e.message:"błąd")}
  if(ef!==my)return;                       // formularz zamknięty w trakcie
  m.busy=false;
  if(j&&j.ok){efApply(j.data,url?(j.url||url):"");if(j.left!=null)evImpLeft=+j.left}
  else{m.msg=(j&&j.msg)||err||"Nie udało się pobrać danych.";if(j&&j.error==="LIMIT")evImpLeft=0}
  efRender();
  if(j&&j.ok&&evGeoOk&&ef.place.trim())efGeocode();
}
function efApply(d,url){
  const A={},m=ef.imp,low=k=>d.confidence&&d.confidence[k]==="low";
  const put=(f,v,lw)=>{if(v==null||v==="")return;ef[f]=String(v);A[f]=lw?"low":"ai"};
  put("name",d.name);put("from",d.date_from,low("dates"));
  if(d.date_from){ef.to=d.date_to||"";if(d.date_to)A.to=low("dates")?"low":"ai"}
  put("place",d.place,low("place"));
  if(d.reg_closed){ef.reg="closed";ef.regUntil="";A.reg="ai"}
  else if(d.reg_until){ef.reg="open";ef.regUntil=d.reg_until;A.reg="ai";A.regUntil="ai"}
  if(url&&!ef.url.trim()){ef.url=url;A.url="ai"}
  if(evPriceOk)put("price",d.price_info,low("price"));
  if(d.note){const t=new Date();ef.note=("AI z linku "+String(t.getDate()).padStart(2,"0")+"."+String(t.getMonth()+1).padStart(2,"0")+"."+t.getFullYear()+", do sprawdzenia — "+d.note).slice(0,300);A.note="ai"}
  const D=(d.distances||[]).filter(x=>EV_BIKE[x.bike]&&+x.km>0);
  if(D.length){ef.dist=D.map(x=>({bike:x.bike,km:String(x.km),name:x.name||"",elev:x.elev!=null?String(x.elev):"",lim:x.limit_min!=null?limEdit(x.limit_min):""}));ef.join="";A.dist=low("distances")?"low":"ai"}
  ef.ai=A;ef.geo=null;ef.geoFor="";ef.geoAlt=[];
  const n=Object.keys(A).length,nl=Object.values(A).filter(v=>v==="low").length;
  m.ok=n?"Uzupełniono "+n+" "+plf(n,["pole","pola","pól"])+" (na żółto)"+(nl?", "+nl+" do sprawdzenia":"")+". Popraw, co trzeba, i zapisz.":"";
  if(!n)m.msg="Nie znalazłem danych do uzupełnienia.";
  m.warn=d.warnings||(!D.length?"Nie znalazłem dystansów — dodaj je ręcznie.":"");
  // 🔁 czy to nie duplikat: ten sam link albo ta sama data i podobna nazwa
  const nu=x=>String(x||"").toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/[?#].*$/,"").replace(/\/+$/,"");
  const dupE=evs.find(x=>url&&x.url&&nu(x.url)===nu(url))||evs.find(x=>ef.from&&x.date_from===ef.from&&ef.name&&lc(x.name).slice(0,10)===lc(ef.name).slice(0,10));
  m.dup=dupE?dupE.name+" ("+evDates(dupE)+")":"";
}
function closeEvForm(){const p=$("evsheet");p.classList.add("hide");p.innerHTML="";ef=null}
$("evsheet").addEventListener("input",e=>{if(!ef)return;const t=e.target;
  const aik=t.dataset.efd?"dist":EF_AIK[t.id];if(aik&&ef.ai[aik]){delete ef.ai[aik];(aik==="dist"?$("efdist"):t).classList.remove("aif","low")}   // 🔗 poprawione ręcznie — bez żółtego tła
  if(t.dataset.efd){const d=ef.dist[+t.dataset.i];if(d)d[t.dataset.efd]=t.value;return}
  if(t.id==="efname"){ef.name=t.value;const sim=ef.name.trim().length>=3?evs.filter(x=>x.id!==ef.id&&lc(x.name).includes(lc(ef.name.trim().slice(0,12)))).slice(0,3):[];
    $("efsim").innerHTML=sim.length?'<div class="evsim">Już są: '+sim.map(x=>'<b>'+esc(x.name)+'</b> ('+esc(evDates(x))+')').join(", ")+' — sprawdź, czy to nie ta sama.</div>':''}});
$("evsheet").addEventListener("keydown",e=>{if(ef&&e.key==="Enter"&&e.target.id==="efimpurl"){e.preventDefault();efRead();efImport()}});
$("evsheet").addEventListener("focusout",e=>{if(ef&&e.target.id==="efplace"){ef.place=e.target.value;if(evGeoOk&&ef.place.trim()&&ef.geoFor!==ef.place.trim())efGeocode()}});
$("evsheet").addEventListener("change",e=>{if(!ef)return;const t=e.target;if(t.dataset.efd==="bike"){const d=ef.dist[+t.dataset.i];if(d)d.bike=t.value}});
// ↕ zmiana kolejności dystansów — przeciąganie uchwytu (mysz i dotyk)
function efMove(from,to){if(from===to||to<0||to>=ef.dist.length)return;
  const j=ef.join!==""?ef.dist[+ef.join]:null,[x]=ef.dist.splice(from,1);ef.dist.splice(to,0,x);
  if(j)ef.join=String(ef.dist.indexOf(j))}
$("evsheet").addEventListener("pointerdown",e=>{const g=e.target.closest(".evgrip");if(!g||!ef)return;
  e.preventDefault();efRead();const box=$("efdist"),row=g.closest(".evdw"),from=+row.dataset.i;let to=from;
  row.classList.add("drag");const gap=10;try{g.setPointerCapture(e.pointerId)}catch(_){}
  const y0=e.clientY,rows=[...box.querySelectorAll(".evdw")].filter(r=>r!==row),mids=rows.map(r=>{const b=r.getBoundingClientRect();return b.top+b.height/2}),
    L0=$("evsheet").querySelector(".bslist"),s0=L0?L0.scrollTop:0,
    mv=ev=>{const ds=(L0?L0.scrollTop:0)-s0;row.style.transform="translateY("+(ev.clientY-y0+ds)+"px)";
    to=mids.filter(m=>ev.clientY>m-ds).length;
    rows.forEach((r,k)=>{const shift=(+r.dataset.i<from&&k>=to)?row.offsetHeight+gap:(+r.dataset.i>from&&k<to)?-(row.offsetHeight+gap):0;r.style.transform=shift?"translateY("+shift+"px)":"";r.style.transition="transform .15s"})},
  up=()=>{g.removeEventListener("pointermove",mv);g.removeEventListener("pointerup",up);g.removeEventListener("pointercancel",up);efMove(from,to);const L=$("evsheet").querySelector(".bslist"),st=L?L.scrollTop:0;renderEvForm();const L2=$("evsheet").querySelector(".bslist");if(L2)L2.scrollTop=st};
  g.addEventListener("pointermove",mv);g.addEventListener("pointerup",up);g.addEventListener("pointercancel",up)});
$("evsheet").addEventListener("click",async e=>{
  if(e.target===$("evsheet")){closeEvForm();return}
  const b=e.target.closest("[data-ef]");if(!b||!ef)return;const k=b.dataset.ef;
  if(k==="close"){closeEvForm();return}
  efRead();
  if(k==="adddist"){ef.dist.push({bike:ef.dist.length?ef.dist[ef.dist.length-1].bike:"gravel",km:"",name:"",elev:"",lim:""});renderEvForm();return}
  if(k==="rmdist"){ef.dist.splice(+b.dataset.i,1);renderEvForm();return}
  if(k==="reg"){ef.reg=b.dataset.v;renderEvForm();return}
  if(k==="geo"){efGeocode();return}
  if(k==="geopick"){const x=ef.geoAlt[+b.dataset.i];if(x){const old=ef.geo;ef.geo=x;ef.geoAlt=ef.geoAlt.filter(y=>y!==x);if(old)ef.geoAlt.unshift(old);const g=$("efgeo");if(g)g.innerHTML=efGeoHtml()}return}
  if(k==="inv"){openWho("evf");return}
  if(k==="imp"){efImport();return}
  if(k==="impmode"){ef.imp.mode=ef.imp.mode==="url"?"text":"url";ef.imp.msg="";efRender();const x=$(ef.imp.mode==="url"?"efimpurl":"efimptxt");if(x)x.focus();return}
  if(k==="save")saveEvent();
});
async function saveEvent(){
  const name=ef.name.trim(),url=ef.url.trim();
  if(name.length<3){say("Podaj nazwę (min. 3 znaki).");return}
  if(!ef.from){say("Podaj datę imprezy.");return}
  if(ef.to&&ef.to<ef.from){say("Data „do” jest wcześniejsza niż „od”.");return}
  if(url&&!/^https?:\/\//i.test(url)){say("Link musi zaczynać się od http:// albo https://");return}
  const D=ef.dist.map(d=>({...d,k:parseFloat(String(d.km).replace(",","."))})).filter(d=>d.k>0);
  if(!D.length){say("Dodaj co najmniej jeden dystans z km.");return}
  if(evExtraOk)for(const d of D){d.e=String(d.elev||"").replace(/\s/g,"")===""?null:parseInt(String(d.elev).replace(/\s/g,""),10);d.l=limParse(d.lim);
    if(d.e!==null&&!(d.e>=0&&d.e<=50000)){say("Przewyższenie podaj w metrach (np. 2400).");return}
    if(d.l!==null&&!(d.l>0&&d.l<=20160)){say("Limit czasu podaj w godzinach, np. 72, 6:30 albo 45 min.");return}}
  if(evGeoOk&&ef.place.trim()&&ef.geoFor!==ef.place.trim())await efGeocode();
  const row={name,date_from:ef.from,date_to:ef.to&&ef.to!==ef.from?ef.to:null,place:ef.place.trim()||null,url:url||null,note:ef.note.trim()||null,reg_closed:ef.reg==="closed",reg_until:ef.reg==="open"&&ef.regUntil?ef.regUntil:null};
  if(evPriceOk)row.price_info=String(ef.price||"").replace(/\s+/g," ").trim().slice(0,200)||null;   // 💰 KROK 55
  if(evGeoOk){const g=ef.place.trim()&&ef.geoFor===ef.place.trim()?ef.geo:null;row.lat=g?g.lat:null;row.lon=g?g.lon:null}
  try{
    let id=ef.id;
    if(id){const r=await sb.from("events").update(row).eq("id",id).select("id");if(r.error||!r.data||!r.data.length)throw r.error||new Error("brak uprawnień")}
    else{const r=await sb.from("events").insert(row).select("id").single();if(r.error)throw r.error;id=r.data.id}
    const old=evDist[id]||[],keep=new Set(D.filter(d=>d.id).map(d=>d.id));
    for(const o of old)if(!keep.has(o.id)){const r=await sb.from("event_distances").delete().eq("id",o.id);if(r.error)throw r.error}
    const ids=[];
    for(let i=0;i<D.length;i++){const d=D[i],dr={bike:d.bike,km:+d.k.toFixed(1),name:d.name.trim()||null,sort:i};if(evExtraOk){dr.elev=d.e;dr.limit_min=d.l}
      if(d.id){const r=await sb.from("event_distances").update(dr).eq("id",d.id);if(r.error)throw r.error;ids.push(d.id)}
      else{const r=await sb.from("event_distances").insert(Object.assign({event_id:id},dr)).select("id").single();if(r.error)throw r.error;ids.push(r.data.id)}}
    const invIds=!ef.id?(ef.inv||[]):[],invMsg=ef.invMsg;let invN=0;
    if(invIds.length){try{await evInvite(id,invIds,invMsg);invN=invIds.length}catch(err){say("Impreza zapisana, ale nie udało się zaprosić: "+(err&&err.message?err.message:"błąd"))}}
    if(!ef.id&&ef.join!==""){const j=ef.dist[+ef.join],ix=j?D.indexOf(D.find(d=>d===j||(d.bike===j.bike&&d.km===j.km&&d.name===j.name))):-1;
      if(ix>=0)await sb.from("event_participants").insert({event_id:id,distance_id:ids[ix]})}
    closeEvForm();say("🏁 Zapisano imprezę."+(invN?" Zaproszono "+invN+" "+plf(invN,["osobę","osoby","osób"])+" ✔":""));evOpen=id;await syncNow();show(3);
  }catch(err){say("Nie udało się zapisać: "+(err&&err.message?err.message:"błąd"))}
}
renderEvForm=shWrap(renderEvForm,"evsheet");   // 📱 bez skoku na górę (dystanse, zapisy, rodzaj imprezy)
