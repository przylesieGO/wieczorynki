/* ---------- 🏁 imprezy masowe — MVP (KROK 40; założenia właściciela 2026-11-15 20:58) ---------- */
let evGeoOk=false,evExtraOk=false,evOk=false,evs=[],evDist={},evPart={},evOpen="",evFlt="",evArchOpen=false,ef=null;
const EV_BIKE={gravel:["🪨","Gravel","Jadę"],road:["🛣","Szosa","Jadę"],mtb:["⛰","MTB","Jadę"],any:["🚲","Dowolny rower","Jadę"],run:["🏃","Bieg","Biegnę"],walk:["🚶","Marsz","Idę"],tri:["🏊","Triathlon","Startuję"],other:["🏅","Inne","Biorę udział"]};
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
const evBellUn=()=>{const s=evBellSeen();return evBellItems().filter(x=>x.at>s)};
function evBellRow(x,un){const e=x.e,st=x.st,ago=esc(agoTxt(new Date(x.at).toISOString()));
  const t=st.k==="inv"?'<b>'+esc(nicks[st.by]||"Ktoś")+'</b> zaprasza Cię: <b>'+esc(e.name)+'</b><div class="w">'+esc(evDates(e))+' · '+ago+'</div>'+(st.msg?'<div class="w">💬 „'+esc(st.msg)+'”</div>':'')
    :st.k==="new"?'Nowa impreza: <b>'+esc(e.name)+'</b><div class="w">'+esc(evDates(e))+(e.created_by&&nicks[e.created_by]?' · dodał(a) '+esc(nicks[e.created_by]):'')+' · '+ago+'</div>'
    :st.k==="chg"?'Zmieniona: <b>'+esc(e.name)+'</b><div class="w">'+esc((st.what||[]).join(", ")||"szczegóły")+' · '+ago+'</div>'
    :'<b>'+esc(nicks[st.u]||"Ktoś")+'</b> '+(genders[st.u]==="K"?'przyjęła':'przyjął')+' Twoje zaproszenie — jedzie: <b>'+esc(e.name)+'</b><div class="w">'+ago+'</div>';
  return '<div class="nit'+(un?' new':'')+'" data-evb="'+esc(e.id)+'"><div class="ic">'+({inv:"✉️",new:"🏁",chg:"✏️",acc:"✅"}[st.k])+'</div><div class="tx">'+t+'</div>'+(un?'<span class="dot"></span>':'')+'</div>'}
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
   +'<div class="acts evacts">'+(evPub?'':(evInvOk&&!past?'<button class="ib" data-ev="inv" data-id="'+esc(e.id)+'" title="Zaproś na imprezę" aria-label="Zaproś na imprezę">'+ICON.addp+'</button>':'')+'<button class="ib evlike'+((evLikes[e.id]||[]).includes(uid)?' on':'')+'" data-ev="like" data-id="'+esc(e.id)+'" title="Lubię" aria-label="Lubię">'+ICON.heart+((evLikes[e.id]||[]).length?'<span class="lkn">'+(evLikes[e.id]||[]).length+'</span>':'')+'</button>')+'<button class="ib" data-ev="gcal" data-id="'+esc(e.id)+'" title="Google Kalendarz" aria-label="Google Kalendarz">'+ICON.gcal+'</button><button class="ib" data-ev="share" data-id="'+esc(e.id)+'" title="Udostępnij" aria-label="Udostępnij">'+ICON.share+'</button>'
   +(evPub?'':'<button class="ib" data-ev="dup" data-id="'+esc(e.id)+'" title="Duplikuj (np. kolejna edycja)" aria-label="Duplikuj">'+ICON.dup+'</button>')
   +(evCanEdit(e)?'<button class="ib" data-ev="edit" data-id="'+esc(e.id)+'" title="Edytuj" aria-label="Edytuj">'+ICON.edit+'</button>'+((isAdmin||!e.delete_req_at)?'<button class="ib del'+(e.created_by===uid&&!isAdmin?'':' adm')+'" data-ev="'+(isAdmin?'del':'delreq')+'" data-id="'+esc(e.id)+'" title="'+(isAdmin?'Usuń':'Poproś o usunięcie')+'" aria-label="Usuń">'+ICON.del+'</button>':''):'')+'</div>'
   +(e.created_by&&nicks[e.created_by]?'<div class="note" style="margin-top:6px">Dodał(a): '+esc(nicks[e.created_by])+'</div>':'')
   +evLastChg(e)+'</div></div>';
}
/* ---------- 📍 „W okolicy” (KROK 43; decyzja właściciela 2026-11-16 10:56) ----------
   promień 50/100/200 km; odległość w linii prostej od „Mojej miejscowości” (⚙️, zapamiętana w tym telefonie)
   albo od GPS (tylko na tę wizytę); imprezy bez punktu na mapie nie przechodzą przez filtr */
const NEAR_R=[50,100,200];
let evNearOn=(()=>{try{return localStorage.getItem("evNearOn")==="1"}catch(e){return false}})();
let evNearR=(()=>{try{const v=+localStorage.getItem("evNearR");return NEAR_R.includes(v)?v:100}catch(e){return 100}})();
const homeGet=()=>{try{const h=JSON.parse(localStorage.getItem("home")||"null");return h&&isFinite(h.lat)&&isFinite(h.lon)?h:null}catch(e){return null}};
const gpsGet=()=>{try{const h=JSON.parse(sessionStorage.getItem("gpsOrigin")||"null");return h&&isFinite(h.lat)&&isFinite(h.lon)?h:null}catch(e){return null}};
const originGet=()=>gpsGet()||homeGet();
const evHasGeo=e=>e.lat!=null&&e.lon!=null&&isFinite(e.lat)&&isFinite(e.lon);
const evKm=e=>{const o=originGet();return o&&evHasGeo(e)?dist({lat:o.lat,lon:o.lon},{lat:+e.lat,lon:+e.lon}):null};
const nearKm=k=>k<10?String(Math.round(k*10)/10).replace(".",","):String(Math.round(k));
const nearOk=e=>{if(!evNearOn||!evGeoOk)return true;const k=evKm(e);return k!=null&&k<=evNearR};
function evNearHtml(){
  if(!evGeoOk||!evNearOn)return "";
  const o=originGet(),g=gpsGet();
  return '<div class="evnear"><div class="evnr"><span class="evnl">Promień</span><span class="seg evnseg">'+NEAR_R.map(r=>'<button type="button" data-evr="'+r+'" class="'+(evNearR===r?'on':'')+'">'+r+' km</button>').join("")+'</span></div>'
   +'<div class="evno">'+(o?'od: <b>'+(g?'📡 ':'📍 ')+esc(o.name)+'</b>'+(g&&homeGet()?' · <button type="button" class="lnk" data-evo="home">wróć do: '+esc(homeGet().name)+'</button>':'')
       +' · <button type="button" class="lnk" data-evo="set">zmień</button>'+(g?'':' · <button type="button" class="lnk" data-evo="gps">📡 moja lokalizacja</button>')
     :'<button type="button" class="lnk" data-evo="set">📍 Ustaw swoją miejscowość ›</button>')+'</div></div>';
}
// wyszukiwanie miejsc w OpenStreetMap (Nominatim) — tylko Polska
async function geoSearch(q){
  q=String(q||"").trim();if(q.length<2)return [];
  try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=pl&accept-language=pl&addressdetails=1&q="+encodeURIComponent(q));if(!r.ok)return null;
    return (await r.json()).map(x=>{const a=x.address||{},c=a.city||a.town||a.village||a.hamlet||a.municipality||x.name||"",reg=a.state?String(a.state).replace(/^województwo /,""):"";
      return {name:(x.name&&x.name!==c?x.name+", ":"")+c,full:[x.name&&x.name!==c?x.name:"",c,a.county||"",reg].filter(Boolean).join(", "),lat:+x.lat,lon:+x.lon}}).filter(x=>x.name&&isFinite(x.lat))}
  catch(e){return null}
}
// okienko „📍 Moja miejscowość” (z filtra i z ⚙️)
let homeRes=[],homeMsg="";
function openHome(){homeRes=[];homeMsg="";renderHome();setTimeout(()=>{const i=$("homeq");if(i)i.focus()},120)}
function renderHome(){
  const p=$("homesheet"),h=homeGet(),g=gpsGet(),q=$("homeq")?$("homeq").value:"";
  p.innerHTML='<div class="bsbox" role="dialog" aria-modal="true" aria-label="Moja miejscowość"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-hm="close">Zamknij</button><b>📍 Moja miejscowość</b><span style="min-width:64px"></span></div><div class="bslist">'
   +'<div class="note" style="margin:0 0 10px">Od niej liczymy odległość do imprez („W okolicy”). Zapamiętana tylko w tym telefonie — nikt jej nie widzi.</div>'
   +(h?'<div class="hmcur">📍 <b>'+esc(h.name)+'</b><button type="button" class="lnk" data-hm="del">Usuń</button></div>':'')
   +'<div class="hmrow"><input id="homeq" maxlength="80" placeholder="np. Pułtusk, Warszawa Bielany" value="'+esc(q)+'" enterkeyhint="search"><button type="button" class="b" data-hm="find">Szukaj</button></div>'
   +(homeMsg?'<div class="note" style="margin-top:8px">'+homeMsg+'</div>':'')
   +homeRes.map((x,i)=>'<button type="button" class="hmres" data-hm="pick" data-i="'+i+'"><b>'+esc(x.name)+'</b><span>'+esc(x.full)+'</span></button>').join("")
   +'<div class="bsgrp" style="margin-top:16px">Albo</div><button type="button" class="b g big" data-hm="gps">📡 Użyj mojej lokalizacji'+(g?' (teraz: '+esc(g.name)+')':'')+'</button>'
   +'<div class="note" style="margin-top:6px">Lokalizacja z telefonu działa tylko podczas tej wizyty — przeglądarka zapyta o zgodę.</div>'
   +'</div></div>';
  p.classList.remove("hide");
}
function closeHome(){const p=$("homesheet");p.classList.add("hide");p.innerHTML="";if(curTab===3)renderEvents();if(gearOpen&&(gearView==="main"||gearView==="nick"))renderGear()}
async function homeFind(){const q=$("homeq")?$("homeq").value.trim():"";if(q.length<2){homeMsg="Wpisz nazwę miejscowości.";renderHome();return}
  homeMsg="Szukam…";homeRes=[];renderHome();const r=await geoSearch(q);
  homeRes=r||[];homeMsg=r===null?"Brak połączenia z OpenStreetMap — spróbuj za chwilę.":r.length?"Wybierz właściwe miejsce:":"Nic nie znaleziono — spróbuj inaczej (np. sama nazwa miejscowości).";renderHome()}
function useGps(after){
  if(!navigator.geolocation){say("Ta przeglądarka nie udostępnia lokalizacji.");return}
  say("📡 Szukam Twojej lokalizacji…");
  navigator.geolocation.getCurrentPosition(async pos=>{
    const la=pos.coords.latitude,lo=pos.coords.longitude,g=await revGeo(la,lo);
    try{sessionStorage.setItem("gpsOrigin",JSON.stringify({name:(g&&g.city)||"Twoja lokalizacja",lat:la,lon:lo}))}catch(e){}
    evNearOn=true;try{localStorage.setItem("evNearOn","1")}catch(e){}
    say("📡 Odległości liczone od: "+((g&&g.city)||"Twojej lokalizacji"));after&&after();if(curTab===3)renderEvents()},
   err=>{say(err&&err.code===1?"Brak zgody na lokalizację — ustaw swoją miejscowość ręcznie.":"Nie udało się ustalić lokalizacji.")},
   {enableHighAccuracy:false,timeout:12000,maximumAge:600000});
}
$("homesheet").addEventListener("click",async e=>{
  if(e.target===$("homesheet")){closeHome();return}
  const b=e.target.closest("[data-hm]");if(!b)return;const k=b.dataset.hm;
  if(k==="close"){closeHome();return}
  if(k==="find"){homeFind();return}
  if(k==="pick"){const x=homeRes[+b.dataset.i];if(!x)return;
    try{localStorage.setItem("home",JSON.stringify({name:x.name,lat:x.lat,lon:x.lon}));sessionStorage.removeItem("gpsOrigin")}catch(err){}
    savePrivCity({name:x.name,lat:x.lat,lon:x.lon});
    evNearOn=true;try{localStorage.setItem("evNearOn","1")}catch(err){}
    closeHome();say("📍 Moja miejscowość: "+x.name);return}
  if(k==="del"){try{localStorage.removeItem("home")}catch(err){}savePrivCity(null);if(pe)pe.cvis=false;renderHome();return}
  if(k==="gps"){closeHome();useGps();return}
});
$("homesheet").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="homeq"){e.preventDefault();homeFind()}});
document.addEventListener("click",e=>{if(e.target.closest("[data-home]")){openHome()}});
function evMatch(e){
  if(!nearOk(e))return false;
  if(!evFlt)return true;
  if(evFlt==="mine")return !!evMine(e)||e.created_by===uid;
  if(evFlt==="delreq")return !!e.delete_req_at;
  if(evFlt==="run"||evFlt==="walk")return (evDist[e.id]||[]).some(d=>d.bike===evFlt);
  return (evDist[e.id]||[]).some(d=>d.bike===evFlt||d.bike==="any");
}
/* 🔢 licznik imprez (decyzja właściciela 2026-11-17 05:30: wariant B, liczba zmienia się z filtrami)
   bez filtra: „24 imprezy w kalendarzu · 18 nadchodzących · 3 w okolicy (100 km)”; z filtrem: „Pasuje 12 z 24 imprez · 9 nadchodzących” */
function evCountHtml(){
  const all=evs.length;if(!all)return "";
  const UP=["nadchodząca","nadchodzące","nadchodzących"],flt=!!evFlt||(evNearOn&&evGeoOk);
  const M=flt?evs.filter(evMatch):evs,up=M.filter(e=>!evPast(e)).length;
  const P=[flt?'Pasuje <b>'+M.length+'</b> z '+all+' '+(all===1?'imprezy':'imprez'):'<b>'+all+'</b> '+plf(all,["impreza","imprezy","imprez"])+' w kalendarzu',up+' '+plf(up,UP)];
  if(!flt&&evGeoOk&&originGet()){const k=evs.filter(e=>{if(evPast(e))return false;const d=evKm(e);return d!=null&&d<=evNearR}).length;if(k)P.push(k+' w okolicy ('+evNearR+' km)')}
  return P.map(x=>x.replace(/ (?![^<]*>)/g,"\u00a0")).join(' · ');   // części nie łamią się w środku
}
function renderEvents(){
  // zakładka Imprezy włączona później (np. „Funkcje testowe: Pokaż” po starcie z pamięci telefonu) — dociągnij imprezy raz
  if(!evLoaded&&!evLoading&&tabOk(3)){evLoading=true;(session?loadEvents():loadEventsPub()).then(()=>{evLoading=false;renderEvents();try{snapSave()}catch(e){}}).catch(()=>{evLoading=false})}
  const box=$("evlist");if(!box)return;
  $("evbeta").innerHTML=betaTag("tab_events");$("evadd").classList.toggle("hide",!session);
  $("evchips").innerHTML=(evGeoOk?'<button type="button" class="fch near'+(evNearOn?' on':'')+'" data-evnear="1">📍 W okolicy'+(evNearOn?' · '+evNearR+' km':'')+'</button>':'')+[["","Wszystkie"],["gravel","🪨 Gravel"],["road","🛣 Szosa"],["mtb","⛰ MTB"],["run","🏃 Bieg"],["walk","🚶 Marsz"]].concat(session?[["mine","🙋 Moje"]]:[]).concat(isAdmin&&evs.some(x=>x.delete_req_at)?[["delreq","🗑 Do usunięcia ("+evs.filter(x=>x.delete_req_at).length+")"]]:[]).map(([v,t])=>'<button type="button" class="fch'+(evFlt===v?' on':'')+'" data-evf="'+v+'">'+t+'</button>').join("");
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
     h||'<div class="note" style="margin-top:12px">'+(evNearOn&&evGeoOk?'Brak imprez w promieniu '+evNearR+' km — zwiększ promień.':evFlt?'Brak imprez dla tego filtra.':(session?'Nie ma jeszcze imprez. Dodaj pierwszą — „＋ Dodaj imprezę”.':'Nie ma jeszcze imprez.'))+'</div>')
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
  if(!confirm("Rezygnujesz z „"+e.name+"”?"))return;
  try{const r=await sb.from("event_participants").delete().eq("event_id",e.id).eq("user_id",uid);if(r.error)throw r.error;
    evPart[e.id]=(evPart[e.id]||[]).filter(x=>x.user_id!==uid);renderEvents();say("Zrezygnowano.")}catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
}
$("p3").addEventListener("click",async e=>{
  const f=e.target.closest("[data-evf]");if(f){evFlt=evFlt===f.dataset.evf?"":f.dataset.evf;renderEvents();return}
  if(e.target.closest("[data-evnear]")){evNearOn=!evNearOn;try{localStorage.setItem("evNearOn",evNearOn?"1":"0")}catch(err){}
    renderEvents();if(evNearOn&&!originGet())openHome();return}
  const rr=e.target.closest("[data-evr]");if(rr){evNearR=+rr.dataset.evr;try{localStorage.setItem("evNearR",String(evNearR))}catch(err){}renderEvents();return}
  const eo=e.target.closest("[data-evo]");if(eo){const k=eo.dataset.evo;
    if(k==="set")openHome();else if(k==="gps")useGps();else if(k==="home"){try{sessionStorage.removeItem("gpsOrigin")}catch(err){}renderEvents()}return}
  if(e.target.closest("#evadd")){if(!session)return;openEvForm(null);return}
  const b=e.target.closest("[data-ev]");if(!b)return;
  if(b.dataset.ev==="login"){setGuest(false);renderChrome();return}   // 👤 gość → logowanie (jak przy odliczaniu)
  if(b.dataset.ev==="arch"){evArchOpen=!evArchOpen;renderEvents();return}
  if(b.dataset.ev==="seenall"){evSeenMark(evs.filter(x=>evState(x)).map(x=>x.id));lsSet("evBell",String(Date.now()));evStick=new Set();renderEvents();renderBell();return}
  const ev=evs.find(x=>x.id===b.dataset.id);if(!ev)return;
  const a=b.dataset.ev;
  if(!session&&a!=="tog"&&a!=="gcal"&&a!=="share")return;   // 👤 gość: tylko podgląd, kalendarz i udostępnianie
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
    if(!confirm("Poprosić admina o usunięcie imprezy „"+ev.name+"”?"))return;
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
