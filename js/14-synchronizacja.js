/* ---------- baza: ładowanie ---------- */
/* ---------- ⚡ odświeżanie przyrostowe (KROK 56) + pamięć danych w telefonie ----------
   Co minutę jedno małe pytanie sync_since(n) „co się zmieniło?” zamiast pełnego wczytania.
   Zmienione zaproszenia / osoby / imprezy dociągane osobno; rzadkie listy (misc) → pełne wczytanie.
   Pełne wczytanie też co 15 minut otwartej aplikacji (siatka bezpieczeństwa).
   Ostatni stan zapisany w telefonie (localStorage „snap”) — start pokazuje go od razu i dociąga zmiany.
   Bez KROKU 56 (błąd sync_since) — jak dawniej: pełne wczytanie co minutę. */
let lastTick=Date.now(),syncN=null,syncOk=false,syncTicks=0,syncP=null,syncAgain=false,wRaw=[],wCols=null,wColsTry=null,titleOk=false;
const SNAP_V=2,SNAP_MAX=2500000,SYNC_FULL_EVERY=15;
function deriveWants(){
  const since=Date.now()-31*864e5;
  let a=wRaw.filter(x=>new Date(x.starts_at).getTime()>=since);
  if(hideTest)a=a.filter(x=>!x.is_test||x.user_id===uid||(joins[x.id]||[]).includes(uid));
  wantsAll=a.slice();
  if(!isAdmin)a=a.filter(x=>x.user_id===uid||!modGone(x.user_id));
  // 👁 podgląd: cudze prywatne zaproszenia, do których 👑 nie jest zaproszony — jak u zwykłego użytkownika (niewidoczne)
  if(pv)a=a.filter(x=>x.visibility!=="private"||x.user_id===uid||(invs[x.id]||[]).some(y=>y.u===uid)||(joins[x.id]||[]).includes(uid));
  if(bikeOk)a.forEach(w=>{if(w.place&&!w.place_city){const x=places.find(y=>y.city&&y.name.toLowerCase()===w.place.toLowerCase());if(x){w.place_city=x.city;w.place_area=w.place_area||x.area||null}}});
  wants=a;
}
function tick(){
  if(session&&syncOk&&syncN!=null&&++syncTicks<SYNC_FULL_EVERY)return syncDelta();
  return loadRemote();
}
// po własnej akcji: tylko zmiany (albo pełne wczytanie bez KROKU 56)
function syncNow(){return (session&&syncOk&&syncN!=null)?syncDelta():loadRemote()}
function syncDelta(){
  if(syncP){syncAgain=true;return syncP}
  syncP=(async()=>{do{syncAgain=false;await syncOnce()}while(syncAgain)})().finally(()=>{syncP=null});
  return syncP;
}
async function syncOnce(){
  if(!session||!syncOk||syncN==null)return loadRemote();
  let d;
  try{const r=await sb.rpc("sync_since",{n:syncN});if(r.error||!r.data)throw r.error||1;d=r.data}
  catch(e){syncOk=false;return loadRemote()}
  if(d.full||d.misc)return loadRemote();
  const W=d.want||[],P=d.prof||[],E=d.ev||[];
  const changed=!!(W.length||P.length||E.length||d.me||d.fb);
  try{
    if(W.length)await syncWants(W);
    if(P.length)await syncProfiles(P);
    if(E.length&&flags.tab_events&&tabOk(3))await loadEvents();
    if(d.me)await syncMe();
    if(d.fb)await syncFb();
  }catch(e){return loadRemote()}
  syncN=+d.last;
  deriveWants();
  if(changed)snapSave();
  refreshUi();
  afterData();
}
async function syncWants(ids){
  const got=[];
  for(let i=0;i<ids.length;i+=100){const r=await sb.from("wants").select(wCols).in("id",ids.slice(i,i+100));if(r.error)throw r.error;got.push(...(r.data||[]))}
  const S=new Set(ids);
  wRaw=wRaw.filter(x=>!S.has(x.id)).concat(got).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
  ids.forEach(id=>{delete joins[id];delete prefs[id];delete invs[id];delete decls[id];delete reports[id]});
  const f=got.map(x=>x.id);if(!f.length)return;
  const by=async(tbl,cols)=>{const out=[];for(let i=0;i<f.length;i+=100){const r=await sb.from(tbl).select(cols).in("want_id",f.slice(i,i+100)).limit(5000);if(r.error)throw r.error;out.push(...(r.data||[]))}return out};
  const [j,iv,dc]=await Promise.all([by("want_joins",rangeOk?"want_id,user_id,pref_at":"want_id,user_id"),visOk?by("want_invitees","want_id,user_id,added_by"):[],(visOk&&rangeOk)?by("want_declines","want_id,user_id"):[]]);
  j.forEach(x=>{(joins[x.want_id]=joins[x.want_id]||[]).push(x.user_id);if(x.pref_at)(prefs[x.want_id]=prefs[x.want_id]||{})[x.user_id]=x.pref_at});
  iv.forEach(x=>{(invs[x.want_id]=invs[x.want_id]||[]).push({u:x.user_id,by:x.added_by})});
  dc.forEach(x=>{(decls[x.want_id]=decls[x.want_id]||[]).push(x.user_id)});
  if(reportOk){const st=got.filter(x=>wantStart(x).getTime()<=Date.now()).map(x=>x.id);
    for(let i=0;i<st.length;i+=100){const r=await sb.from("ride_reports").select("want_id,user_id,went,km,avg_kmh,rating,route_rating,tags,self,updated_at").in("want_id",st.slice(i,i+100));if(r.error)throw r.error;
      (r.data||[]).forEach(x=>{(reports[x.want_id]=reports[x.want_id]||[]).push(x)})}}
}
async function syncProfiles(ids){
  const cols=profExOk?"user_id,nick,gender,joined_at,avatar_at,media":genderOk?"user_id,nick,gender,joined_at":"user_id,nick";
  const got=[];
  for(let i=0;i<ids.length;i+=100){const r=await sb.from("profiles").select(cols).in("user_id",ids.slice(i,i+100));if(r.error)throw r.error;got.push(...(r.data||[]))}
  ids.forEach(id=>{delete nicks[id];delete genders[id];delete joinedAt[id];delete avAt[id];delete medias[id]});
  got.forEach(x=>{nicks[x.user_id]=x.nick;if(x.gender)genders[x.user_id]=x.gender;if(x.joined_at)joinedAt[x.user_id]=x.joined_at;if(x.avatar_at)avAt[x.user_id]=x.avatar_at;if(x.media)medias[x.user_id]=x.media});
  me.nick=nicks[uid]||null;
  sigDirty=true;   // 🟡 „Mam ochotę” — sygnały odświeżają się w grupie „prof” (KROK 64)
  if(profExOk)loadAvatars();
}
async function syncMe(){
  const [nt,fv,tl]=await Promise.all([
    visOk?sb.from("notifications").select("id,kind,want_id,actor,created_at,read_at").eq("user_id",uid).gte("created_at",new Date(Date.now()-30*864e5).toISOString()).order("created_at",{ascending:false}).limit(80):Promise.resolve({data:notifs}),
    sb.from("favorites").select("fav_id").eq("user_id",uid).limit(1000),
    sb.from("telegram_links").select("tg_name,linked_at").eq("user_id",uid).limit(1)]);
  if(nt.error||fv.error)throw nt.error||fv.error;
  notifs=nt.data||[];favOk=true;favs=new Set((fv.data||[]).map(x=>x.fav_id));
  tgOk=!tl.error;tgLink=tgOk&&tl.data&&tl.data[0]||null;
  await loadMyPriv();
}
async function syncFb(){
  const fq=await sb.from("feedback").select("id,user_id,kind,rating,body,device,status,started_by,user_unread,admin_unread,created_at,updated_at").order("updated_at",{ascending:false}).limit(300);
  if(fq.error)throw fq.error;fbOk=true;fbList=fq.data||[];
  const fc=await sb.rpc("fb_done_counts");if(!fc.error){fbDone={};(fc.data||[]).forEach(x=>{fbDone[x.user_id]=+x.n||0})}
  if(gearOpen&&/^fb/.test(gearView))renderGear();
}
// to, co robi się po każdym wczytaniu danych (pełnym i przyrostowym)
async function afterData(){
  try{await sigLoad()}catch(e){sigOk=false}   // 🟡 „Mam ochotę” (KROK 64)
  sigFabSync();if(sigOn())renderBell();
  maybePopup();
  maybeHelp();
  maybeFb();
  maybeReport();
  maybeSigIntro();
  if(curTab===3)renderEvents();
  if(session&&(seenFor!==uid||Date.now()-seenAt>15*60000)){seenFor=uid;seenAt=Date.now();Promise.resolve(sb.rpc("touch_seen")).catch(()=>{})}
  // 1 h przed początkiem zakresu godzina ustala się sama (KROK 15) — robi to baza, wywołuje pierwszy, kto odświeży
  if(session&&rangeOk&&Date.now()-autoAt>60000&&wants.some(w=>isOpen(w)&&new Date(w.range_from).getTime()<=Date.now()+36e5)){
    autoAt=Date.now();
    try{const r=await sb.rpc("want_autosettle");if(!r.error&&r.data)await syncNow()}catch(e){}
  }
}
const PV_LBL={user:"użytkownik bez funkcji testowych",tester:"tester (z funkcjami testowymi)"};
function pvBar(){const b=$("pvbar");if(!b)return;const on=!!pv||PV_GUEST||KONTO;
  b.classList.toggle("hide",!on);document.body.classList.toggle("pvon",on);
  const txt=PV_GUEST?'gość':pv?PV_LBL[pv]:'konto „'+KONTO+'” w tej karcie';
  const btn=PV_GUEST?'Zamknij':pv?'Zakończ':'Konto podstawowe';
  b.innerHTML=on?uiIcon("eye")+'<span>Podgląd: '+esc(txt)+'</span><button type="button" id="pvend">'+btn+'</button>':''}
function pvSet(m){
  pv=m||"";isAdmin=adminIds.includes(uid)&&!pv;
  deriveWants();pvBar();refreshUi();try{renderEvents()}catch(e){}try{renderSteps()}catch(e){}
  if(pv)say("👁 Podgląd: "+PV_LBL[pv]+". Akcje (np. „Jadę!”) działają naprawdę na Twoim koncie.");else say("Koniec podglądu.");
}
document.addEventListener("click",e=>{if(!e.target.closest("#pvend"))return;
  if(PV_GUEST){window.close();setTimeout(()=>{location.href=location.pathname},150);return}
  if(KONTO&&!pv){location.href=location.pathname;return}
  pvSet("")});
function snapClear(){if(PV_GUEST)return;try{localStorage.removeItem("snap")}catch(e){}}
function snapSave(){
  if(!session||!syncOk||syncN==null)return;
  try{
    const d={v:SNAP_V,uid,at:Date.now(),n:syncN,
      sorted,rsvps,watchOk,watchN,flags,
      myPriv,profExOk,genderOk,nicks,genders,joinedAt,avAt,medias,meNick:me.nick,
      rbOk,titleOk,bikeOk,placeOk,distOk,paceOk,wRouteOk,testOk,rangeOk,visOk,wCols,
      wRaw,joins,prefs,invs,decls,notifs,reportOk,reports,lib,
      adminIds,nickColors,nickBgs,favOk,favs:[...favs],supers:[...supers],testerOk,testerIds:[...testerIds],
      evOk,evNewOk,evGeoOk,evExtraOk,evInvOk,evPriceOk,evLoaded,evs,evDist,evPart,evLikes,evInv,
      fbOk,fbList,fbDone,tgOk,tgLink,modOk,modBanned:[...modBanned],modHidden:[...modHidden],places,stealthOk,stealthIds:[...stealthIds]};
    const t=JSON.stringify(d);
    if(t.length>SNAP_MAX){snapClear();return}
    localStorage.setItem("snap",t);
  }catch(e){snapClear()}
}
// start z pamięci telefonu: true = dane wczytane, potem syncDelta dociąga zmiany od ostatniej wizyty
function snapLoad(){
  try{
    const d=JSON.parse(localStorage.getItem("snap")||"null");
    if(!d||d.v!==SNAP_V||d.uid!==uid||!(Date.now()-d.at<2.5*864e5)||d.n==null)return false;
    sorted=d.sorted||[];rsvps=d.rsvps||{};watchOk=d.watchOk;watchN=d.watchN||{};flags=d.flags||{};flagsReady=true;
    myPriv=d.myPriv;profExOk=d.profExOk;genderOk=d.genderOk;nicks=d.nicks||{};genders=d.genders||{};joinedAt=d.joinedAt||{};avAt=d.avAt||{};medias=d.medias||{};me.nick=d.meNick||null;
    rbOk=d.rbOk;titleOk=!!d.titleOk;bikeOk=d.bikeOk;placeOk=d.placeOk;distOk=d.distOk;paceOk=d.paceOk;wRouteOk=d.wRouteOk;testOk=d.testOk;rangeOk=d.rangeOk;visOk=d.visOk;wCols=d.wCols;
    wRaw=d.wRaw||[];joins=d.joins||{};prefs=d.prefs||{};invs=d.invs||{};decls=d.decls||{};notifs=d.notifs||[];reportOk=d.reportOk;reports=d.reports||{};lib=d.lib||[];
    adminIds=d.adminIds||[];isAdmin=adminIds.includes(uid)&&!pv;nickColors=d.nickColors||{...DEF_COLORS};nickBgs=d.nickBgs||{...DEF_BGS};
    favOk=d.favOk;favs=new Set(d.favs||[]);supers=new Set(d.supers||[]);testerOk=d.testerOk;testerIds=new Set(d.testerIds||[]);
    evOk=d.evOk;evNewOk=d.evNewOk;evGeoOk=d.evGeoOk;evExtraOk=d.evExtraOk;evInvOk=d.evInvOk;evPriceOk=!!d.evPriceOk;evLoaded=!!d.evLoaded;evs=d.evs||[];evDist=d.evDist||{};evPart=d.evPart||{};evLikes=d.evLikes||{};evInv=d.evInv||[];
    fbOk=d.fbOk;fbList=d.fbList||[];fbDone=d.fbDone||{};tgOk=d.tgOk;tgLink=d.tgLink||null;
    modOk=d.modOk;modBanned=new Set(d.modBanned||[]);modHidden=new Set(d.modHidden||[]);places=d.places||[];stealthOk=d.stealthOk;stealthIds=new Set(d.stealthIds||[]);
    if(!wCols)return false;
    syncN=d.n;syncOk=true;syncTicks=0;
    deriveWants();
    startPresence();
    if(profExOk)loadAvatars();
    applyPresence();
    renderBan();
    return true;
  }catch(e){snapClear();return false}
}
/* 🏁 imprezy masowe (KROK 40) — wczytanie wszystkich list imprez */
async function loadEvents(){
    const EVC="id,created_by,name,date_from,date_to,place,url,note,reg_until,reg_closed,delete_req_at,delete_req_by";
    const [e1,e2,e3]=await Promise.all([sb.from("events").select(EVC+",lat,lon,created_at,changed_at,changed_by,changed_what").order("date_from").limit(1000).then(r=>{evNewOk=!r.error;evGeoOk=!r.error;return r.error?sb.from("events").select(EVC+",lat,lon").order("date_from").limit(1000).then(r2=>{evGeoOk=!r2.error;return r2.error?sb.from("events").select(EVC).order("date_from").limit(1000):r2}):r}),
      sb.from("event_distances").select("id,event_id,bike,km,name,sort,elev,limit_min").limit(5000),sb.from("event_participants").select("event_id,user_id,distance_id,created_at").limit(10000)]);
    evOk=!e1.error;evs=(e1.data||[]);evDist={};evPart={};evExtraOk=!e2.error;
    if(e2.error){const r=await sb.from("event_distances").select("id,event_id,bike,km,name,sort").limit(5000);e2.data=r.data}
    (e2.data||[]).forEach(x=>{(evDist[x.event_id]=evDist[x.event_id]||[]).push(x)});Object.values(evDist).forEach(a=>a.sort((p,q)=>p.sort-q.sort||p.km-q.km));
    (e3.data||[]).forEach(x=>{(evPart[x.event_id]=evPart[x.event_id]||[]).push(x)});
    const e4=await sb.from("event_likes").select("event_id,user_id").limit(20000);evLikes={};(e4.data||[]).forEach(x=>{(evLikes[x.event_id]=evLikes[x.event_id]||[]).push(x.user_id)});
    const e5=await sb.from("event_invites").select("event_id,user_id,invited_by,msg,created_at").limit(5000);evInvOk=!e5.error;evInv=e5.data||[];   // ✉️ KROK 54
    // 💰 ceny + 🔗 pobieranie z linku (KROK 55) — bez KROKU 55 pole „Ceny” i ramka „Wypełnij z linku” są ukryte
    const [e6,e7]=await Promise.all([sb.from("events").select("id,price_info").not("price_info","is",null).limit(1000),sb.rpc("ev_import_left")]);
    evPriceOk=!e6.error;if(evPriceOk){const pm={};(e6.data||[]).forEach(x=>{pm[x.id]=x.price_info});evs.forEach(x=>{x.price_info=pm[x.id]||null})}
    evImpLeft=e7.error||e7.data==null?null:+e7.data;
    evLoaded=true;evPub=false;evCnt={};
}
/* 👤 imprezy dla gości (KROK 61) — jedno wywołanie events_pub(): imprezy, dystanse i liczba zapisanych (bez nicków) */
async function loadEventsPub(){
  const r=await sb.rpc("events_pub");
  if(evFlt==="mine"||evFlt==="delreq")evFlt="";
  evPub=true;evs=[];evDist={};evPart={};evLikes={};evInv=[];evCnt={};evNewOk=false;evInvOk=false;evImpLeft=null;
  evOk=!r.error&&Array.isArray(r.data);evGeoOk=evOk;evExtraOk=evOk;evPriceOk=evOk;
  (evOk?r.data:[]).forEach(x=>{const e=Object.assign({},x);delete e.dist;delete e.n;evs.push(e);evCnt[e.id]=+x.n||0;
    evDist[e.id]=(x.dist||[]).map(d=>Object.assign({event_id:e.id},d)).sort((p,q)=>p.sort-q.sort||p.km-q.km)});
  evLoaded=true;
}
async function loadRemote(selectId){
  const prevId=sorted[cur]&&sorted[cur].id;
  sigDirty=true;
  // ⚡ KROK 56: numer ostatniego wpisu dziennika PRZED wczytaniem (zmiany w trakcie wczytania dociągnie następne odświeżenie)
  let n0=null;
  if(session){try{const r=await sb.rpc("sync_since",{n:null});syncOk=!r.error&&!!r.data;if(syncOk)n0=+r.data.last||0}catch(e){syncOk=false}}
  const since=new Date(Date.now()-120*864e5).toISOString();
  const NEW="id,title,starts_at,place,pace,owner_name,note,creator,edited_at,change_note,route_title,route_desc";
  const OLD="id,title,starts_at,place,pace,owner_name,note,creator";
  let a=await sb.from("rides").select(NEW).gte("starts_at",since).order("starts_at").limit(300);
  if(a.error)a=await sb.from("rides").select(OLD).gte("starts_at",since).order("starts_at").limit(300);
  if(a.error)throw a.error;
  const b=await sb.from("rsvps").select("ride_id,user_id,rides!inner(starts_at)").gte("rides.starts_at",since).limit(1000);
  const g={};
  if(!b.error)b.data.forEach(x=>{(g[x.ride_id]=g[x.ride_id]||[]).push(x.user_id)});
  rsvps=g;
  // funkcje testowe — czytają wszyscy, także goście (KROK 16)
  const wc=await sb.rpc("ride_watch_counts");watchOk=!wc.error;watchN={};if(!wc.error)(wc.data||[]).forEach(x=>{watchN[x.ride_id]=+x.n||0});
  let ff=await sb.from("feature_flags").select("key,name,description,state,guests");   // 👤 guests — KROK 61
  if(ff.error)ff=await sb.from("feature_flags").select("key,name,description,state");
  flags={};if(!ff.error)(ff.data||[]).forEach(f=>{flags[f.key]=f});flagsReady=true;
  if(session){
    const ok=r=>r.error?null:r.data;
    await loadMyPriv();   // 👤 KROK 50
    let p=profExOk?await sb.from("profiles").select("user_id,nick,gender,joined_at,avatar_at,media").limit(1000):{error:1};
    if(p.error){profExOk=false;p=await sb.from("profiles").select("user_id,nick,gender,joined_at").limit(1000)}
    if(p.error)p=await sb.from("profiles").select("user_id,nick,gender").limit(1000);
    genderOk=!p.error;
    if(p.error)p=await sb.from("profiles").select("user_id,nick").limit(1000);
    // zaproszenia tylko z ostatnich 7 dni i przyszłe (wcześniej: 200 najstarszych — nowe by znikały)
    const wSince=new Date(Date.now()-31*864e5).toISOString(); // + archiwum 30 dni (KROK 38)
    const wq=cols=>{wColsTry=cols;return sb.from("wants").select(cols).gte("starts_at",wSince).order("starts_at").limit(1000)};
    const WFULL="id,user_id,starts_at,note,visibility,range_from,range_to,settled_at,is_test,route_km,pace,km,dur_min,place,place_lat,place_lon,bike,place_city,place_area";
    let w=await wq(WFULL+",route_base_id,title,title_auto");titleOk=!w.error;   // 🏷 tytuł zaproszenia (KROK 65)
    if(w.error)w=await wq(WFULL+",route_base_id");
    rbOk=!w.error;   // 🗺️ baza tras (KROK 47)
    if(w.error)w=await wq(WFULL);
    bikeOk=!w.error;
    if(w.error)w=await wq("id,user_id,starts_at,note,visibility,range_from,range_to,settled_at,is_test,route_km,pace,km,dur_min,place,place_lat,place_lon");
    placeOk=!w.error;
    if(w.error)w=await wq("id,user_id,starts_at,note,visibility,range_from,range_to,settled_at,is_test,route_km,pace,km,dur_min");
    distOk=!w.error;
    if(w.error)w=await wq("id,user_id,starts_at,note,visibility,range_from,range_to,settled_at,is_test,route_km,pace");
    paceOk=!w.error;
    if(w.error)w=await wq("id,user_id,starts_at,note,visibility,range_from,range_to,settled_at,is_test,route_km");
    wRouteOk=!w.error;
    if(w.error)w=await wq("id,user_id,starts_at,note,visibility,range_from,range_to,settled_at,is_test");
    testOk=!w.error;
    if(w.error)w=await wq("id,user_id,starts_at,note,visibility,range_from,range_to,settled_at");
    rangeOk=!w.error;visOk=rangeOk;
    if(w.error){w=await wq("id,user_id,starts_at,note,visibility");visOk=!w.error}
    if(w.error)w=await wq("id,user_id,starts_at,note");
    // dane powiązane tylko dla wczytanych zaproszeń (paczki po 100, żeby adres nie był za długi)
    const wIds=(w.error?[]:w.data||[]).map(x=>x.id);
    const byWant=async(tbl,cols)=>{if(!wIds.length)return {data:[]};const out=[];
      for(let i=0;i<wIds.length;i+=100){const r=await sb.from(tbl).select(cols).in("want_id",wIds.slice(i,i+100)).limit(5000);if(r.error)return r;out.push(...(r.data||[]))}
      return {data:out}};
    const [iv,nt,dc]=visOk?await Promise.all([
      byWant("want_invitees","want_id,user_id,added_by"),
      sb.from("notifications").select("id,kind,want_id,actor,created_at,read_at").eq("user_id",uid).gte("created_at",new Date(Date.now()-30*864e5).toISOString()).order("created_at",{ascending:false}).limit(80),
      rangeOk?byWant("want_declines","want_id,user_id"):Promise.resolve({data:[]})
    ]):[{data:[]},{data:[]},{data:[]}];
    decls={};((dc&&!dc.error&&dc.data)||[]).forEach(x=>{(decls[x.want_id]=decls[x.want_id]||[]).push(x.user_id)});
    invs={};((iv&&!iv.error&&iv.data)||[]).forEach(x=>{(invs[x.want_id]=invs[x.want_id]||[]).push({u:x.user_id,by:x.added_by})});
    notifs=(nt&&!nt.error&&nt.data)||[];
    // 🚴 „Jak poszło?” (KROK 39): odpowiedzi do jazd, które już wystartowały
    {const rq=await sb.from("ride_reports").select("want_id").limit(1);reportOk=!rq.error;reports={};
     // poprawka 2026-11-16 12:31: lista ze ŚWIEŻO wczytanych zaproszeń (wcześniej brała starą `wants` — przy starcie aplikacji
     // pustą, więc odpowiedzi się nie wczytywały i „Jak poszło?” pytało ponownie o jazdy z odpowiedzią)
     if(reportOk){const ids=(w.error?[]:w.data||[]).filter(x=>wantStart(x).getTime()<=Date.now()).map(x=>x.id);
       for(let i=0;i<ids.length;i+=100){const r=await sb.from("ride_reports").select("want_id,user_id,went,km,avg_kmh,rating,route_rating,tags,self,updated_at").in("want_id",ids.slice(i,i+100));
         (r.data||[]).forEach(x=>{(reports[x.want_id]=reports[x.want_id]||[]).push(x)})}}}
    const [j,l,ad,st,fv]=await Promise.all([
      byWant("want_joins",rangeOk?"want_id,user_id,pref_at":"want_id,user_id"),
      sb.from("routes").select("id,title,description,km,creator,created_at").order("created_at",{ascending:false}).limit(200),
      sb.from("admins").select("user_id"),
      genderOk?sb.from("app_settings").select("key,value"):Promise.resolve({data:[]}),
      sb.from("favorites").select("fav_id").eq("user_id",uid).limit(1000)
    ]);
    const sp=await sb.from("superadmins").select("user_id");supers=new Set((sp&&!sp.error&&sp.data||[]).map(x=>x.user_id));
    const ts=await sb.from("testers").select("user_id");testerOk=!ts.error;testerIds=new Set((!ts.error&&ts.data||[]).map(x=>x.user_id));
    // 🏁 imprezy masowe (KROK 40) — tylko gdy zakładka dostępna
    if(flags.tab_events&&tabOk(3))await loadEvents();
    const fq=await sb.from("feedback").select("id,user_id,kind,rating,body,device,status,started_by,user_unread,admin_unread,created_at,updated_at").order("updated_at",{ascending:false}).limit(300);fbOk=!fq.error;fbList=fbOk?fq.data||[]:[];
    fbDone={};if(fbOk){const fc=await sb.rpc("fb_done_counts");if(!fc.error)(fc.data||[]).forEach(x=>{fbDone[x.user_id]=+x.n||0})}
    const tl=await sb.from("telegram_links").select("tg_name,linked_at").eq("user_id",uid).limit(1);tgOk=!tl.error;tgLink=tgOk&&tl.data&&tl.data[0]||null;
    nicks={};genders={};joinedAt={};avAt={};medias={};(ok(p)||[]).forEach(x=>{nicks[x.user_id]=x.nick;if(x.gender)genders[x.user_id]=x.gender;if(x.joined_at)joinedAt[x.user_id]=x.joined_at;if(x.avatar_at)avAt[x.user_id]=x.avatar_at;if(x.media)medias[x.user_id]=x.media});
    if(profExOk)loadAvatars();
    me.nick=nicks[uid]||null;
    favOk=!fv.error;favs=new Set((ok(fv)||[]).map(x=>x.fav_id));
    nickColors={...DEF_COLORS};nickBgs={...DEF_BGS};
    (ok(st)||[]).forEach(x=>{
      let m=/^nick_color_([KM])$/.exec(x.key);if(m&&HEX_RE.test(x.value))nickColors[m[1]]=x.value;
      m=/^nick_bg_([KM])$/.exec(x.key);if(m&&(x.value==="none"||HEX_RE.test(x.value)))nickBgs[m[1]]=x.value;
    });
    if(!p.error&&needProfile()&&!pwMode&&nickAskedFor!==uid){nickAskedFor=uid;setTimeout(askNick,0)}
    wants=ok(w)||[];wRaw=wants.slice();wCols=w.error?null:wColsTry;
    joins={};prefs={};(ok(j)||[]).forEach(x=>{(joins[x.want_id]=joins[x.want_id]||[]).push(x.user_id);if(x.pref_at)(prefs[x.want_id]=prefs[x.want_id]||{})[x.user_id]=x.pref_at});
    if(hideTest)wants=wants.filter(x=>!x.is_test||x.user_id===uid||(joins[x.id]||[]).includes(uid));
    lib=ok(l)||[];
    startPresence();
    adminIds=(ok(ad)||[]).map(x=>x.user_id);isAdmin=adminIds.includes(uid)&&!pv;
    // 👑 moderacja (KROK 33): ⛔ zablokowani i 👻 ukryci — inni ich nie widzą (admin widzi)
    const md=await sb.from("moderation").select("user_id,banned_at,hidden");modOk=!md.error;
    modBanned=new Set((ok(md)||[]).filter(x=>x.banned_at).map(x=>x.user_id));modHidden=new Set((ok(md)||[]).filter(x=>x.hidden).map(x=>x.user_id));
    wantsAll=wants.slice();
    if(!isAdmin)wants=wants.filter(x=>x.user_id===uid||!modGone(x.user_id));
    if(placeOk){const pl=await sb.from("places").select(bikeOk?"id,name,lat,lon,created_by,city,area":"id,name,lat,lon,created_by").order("name").limit(500);places=(ok(pl)||[]).sort((a,b)=>a.name.localeCompare(b.name,"pl"))}
    // miasto dla zaproszeń bez miasta — z listy miejsc (po nazwie); 👑: brakujące miasta miejsc z pinezką uzupełnia raz na wejście
    if(bikeOk){wants.forEach(w=>{if(w.place&&!w.place_city){const x=places.find(y=>y.city&&y.name.toLowerCase()===w.place.toLowerCase());if(x){w.place_city=x.city;w.place_area=w.place_area||x.area||null}}});
      if(isSuper(uid)&&!placesGeoDone){placesGeoDone=true;fillPlaceCities()}}
    if(isAdmin){const sq=await sb.from("admin_stealth").select("user_id");stealthOk=!sq.error;stealthIds=new Set((ok(sq)||[]).map(x=>x.user_id))}else{stealthOk=false;stealthIds=new Set()}
    applyPresence();
    renderBan();
  }else{wRaw=[];syncN=null;snapClear();favs=new Set();favOk=false;nicks={};genders={};me.nick=null;wants=[];joins={};prefs={};decls={};invs={};notifs=[];testerIds=new Set();testerOk=false;tgOk=false;tgLink=null;tgCode="";fbOk=false;fbList=[];fbDone={};lib=[];adminIds=[];isAdmin=false;stopPresence();
    // 👤 imprezy dla gości (KROK 61): same imprezy i liczby z events_pub(); bez przełącznika „Goście” — nic
    evPub=false;evLoaded=false;evOk=false;evs=[];evDist={};evPart={};evLikes={};evInv=[];evCnt={};
    if(tabOk(3))await loadEventsPub()}
  sorted=a.data.map(r=>({id:r.id,title:r.title,when:r.starts_at,place:r.place,pace:r.pace,owner:r.owner_name,note:r.note,creator:r.creator,edited_at:r.edited_at||null,change_note:r.change_note||null,route_title:r.route_title||null,route_desc:r.route_desc||null}));
  if(session&&syncOk&&n0!=null){syncN=n0;syncTicks=0;snapSave()}else if(session){syncN=null}
  await loadTail(selectId,prevId);
}

// wspólny koniec wczytania (pełnego i z pamięci telefonu): wybór wieczorynki, powitanie, okienka, imprezy
async function loadTail(selectId,prevId){
  const want=selectId||prevId;
  let idx=want?sorted.findIndex(r=>r.id===want):-1;
  if(idx<0)idx=pickDefault();
  if(!selectId&&idx>=0&&sorted[idx]&&sorted[idx].id===prevId){cur=idx;refreshUi()}
  else showRide(idx);
  if(location.hash==="#powitanie"&&session&&nicks[uid]){try{history.replaceState(null,"",location.pathname+location.search);sessionStorage.setItem("helpShown","1")}catch(e){}
    welForce=true;show(0);openWelcome()}
  await afterData();
}
