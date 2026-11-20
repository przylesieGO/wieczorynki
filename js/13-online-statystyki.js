/* ---------- online (Supabase Realtime Presence, bez zmian w bazie) ---------- */
// presOk: połączenie z kanałem „online” działa; po zerwaniu (np. Android usypia PWA w tle) — ponowne łączenie
let presCh=null,presUid="",onlineIds=[],presOk=false,presRetryT=0;
const presDead=()=>!presCh||presCh.state==="closed"||presCh.state==="errored";
function startPresence(force){
  if(!sb||!session||typeof sb.channel!=="function")return;
  if(!force&&presCh&&presUid===uid&&!presDead())return;
  stopPresence(true);presUid=uid;
  try{
    const ch=sb.channel("online",{config:{presence:{key:uid}}});presCh=ch;
    ch.on("presence",{event:"sync"},()=>{
      if(ch!==presCh)return;
      const ids=Object.keys(ch.presenceState()||{}).sort();
      if(ids.join()===onlineIds.join()&&presOk)return;
      presOk=true;onlineIds=ids;renderOnline();renderWants();renderNext();renderCard();renderLibUi();
    })
      .subscribe(async st=>{
        if(ch!==presCh)return;
        if(st==="SUBSCRIBED"){presOk=true;renderOnline();if(!stealthOn()){try{await ch.track({t:Date.now()})}catch(e){}}return}
        if(st==="CHANNEL_ERROR"||st==="TIMED_OUT"||st==="CLOSED"){presOk=false;renderOnline();
          clearTimeout(presRetryT);presRetryT=setTimeout(()=>{if(session&&!document.hidden)startPresence(true)},5000)}
      });
  }catch(e){presCh=null;presOk=false}
}
function stopPresence(keep){
  clearTimeout(presRetryT);
  const ch=presCh;presCh=null;presOk=false;
  if(ch){try{sb.removeChannel(ch)}catch(e){}}
  presUid="";if(!keep)onlineIds=[];renderOnline();
}
// powrót do aplikacji z tła: odnów połączenie „online” (Chrome/Android zrywa je w uśpionej karcie)
document.addEventListener("visibilitychange",()=>{
  if(document.hidden||!session)return;
  if(presDead()||!presOk)startPresence(true);else applyPresence();
});
function renderOnline(){
  const b=$("onlbtn");if(!b)return;
  const show=!!session;
  b.classList.toggle("hide",!show);
  // przy ukrytej obecności (👻) liczysz się tylko na swoim ekranie
  const n=onlineIds.filter(id=>isAdmin||!modGone(id)).length+(stealthOn()&&!onlineIds.includes(uid)?1:0);
  b.classList.toggle("off",!presOk);b.title=presOk?"Kto jest teraz w aplikacji":"Brak połączenia z listą online — łączę ponownie…";
  if(show)b.textContent=presOk?"🟢 "+n+" online ›":"🟢 online —";
  const h=$("honl");if(h){h.classList.toggle("hide",!show||!presOk);if(show)h.textContent="🟢 "+n}
  if(gearOpen&&gearView==="online")renderGear();
}

/* ---------- statystyki dla administratora ---------- */
let statsData=null,statsErr="",seenAt=0,seenFor="";
async function loadStats(){
  statsData=null;repStats=null;statsErr="";renderGear();loadTgLinks();
  try{
    const r=await sb.rpc("admin_stats");
    if(r.error)statsErr=(r.error.code==="PGRST202"||/admin_stats/.test(r.error.message||""))?"Statystyki nie są jeszcze włączone w bazie (brak funkcji admin_stats — KROK 9).":"Nie udało się pobrać: "+r.error.message;
    else statsData=r.data;
  }catch(e){statsErr="Nie udało się pobrać statystyk."}
  if(gearView==="stats")renderGear();
}
// 📊 nowe konta: 8 tygodni + kto i kiedy (z profiles.joined_at — KROK 25)
let statsAllAcc=false;
function newAccHtml(part){
  const L=Object.entries(joinedAt).filter(([id])=>nicks[id]).sort((a,b)=>new Date(b[1])-new Date(a[1]));
  if(!L.length)return "";
  const wk=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x.getTime()};
  const now=wk(new Date()),bins=[...Array(8)].map((_,i)=>({t:now-(7-i)*7*864e5,n:0}));
  L.forEach(([,t])=>{const b=bins.find(x=>x.t===wk(t));if(b)b.n++});
  const mx=Math.max(1,...bins.map(b=>b.n));
  const when=t=>{const d=new Date(t),dd=dayDiff(d);return dd===0?"dziś "+hhmm(d):dd===-1?"wczoraj "+hhmm(d):d.toLocaleDateString("pl-PL",{day:"numeric",month:"short",year:"numeric"})};
  const ago=t=>{const n=Math.floor((Date.now()-new Date(t))/864e5);return n<1?"":n+" "+(n===1?"dzień":"dni")};
  const rows=(statsAllAcc?L:L.slice(0,8)).map(([id,t])=>'<div class="nacc"><span>'+nk(id)+(Date.now()-new Date(t)<864e5?'<span class="nnew">'+(genders[id]==="K"?"NOWA":"NOWY")+'</span>':'')+'</span><span class="note">'+esc(when(t))+(ago(t)?'<br>'+esc(ago(t)):'')+'</span></div>').join("");
  if(part==="chart")return growthSvg(L)
   +'<div class="nbl"><span>'+esc(new Date(bins[0].t).toLocaleDateString("pl-PL",{day:"numeric",month:"short"}))+'</span><span>ten tydzień (od pon.): '+bins[7].n+'</span></div>';
  return '<div class="naccs">'+rows+'</div>'
   +(L.length>8?'<button class="lnk" data-c="accall" style="display:block;margin:8px auto 0">'+(statsAllAcc?'Zwiń ▴':'Pokaż wszystkich ('+L.length+') ›')+'</button>':'');
}
// 📈 wariant A (decyzja właściciela 2026-11-20 04:59): liczba kont narastająco, 8 tygodni — linia z wypełnieniem, kropka = dziś
function growthSvg(L){
  const D=56,day=864e5,end=startOfDay(new Date()).getTime()+day;
  const pts=[...Array(D+1)].map((_,i)=>{const tt=end-(D-i)*day;return L.filter(([,t])=>new Date(t).getTime()<tt).length});
  const mn=Math.min(...pts),mx=Math.max(mn+1,...pts),W=300,H=112,px=i=>8+i*(W-16)/D,py=n=>H-12-(n-mn)/(mx-mn)*(H-36);
  const d=pts.map((n,i)=>(i?'L':'M')+px(i).toFixed(1)+' '+py(n).toFixed(1)).join(' ');
  return '<svg class="lch" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Konta narastająco przez 8 tygodni: od '+pts[0]+' do '+pts[D]+'">'
   +[0,.5,1].map(f=>'<line class="lg" x1="8" x2="'+(W-8)+'" y1="'+(24+f*(H-36)).toFixed(1)+'" y2="'+(24+f*(H-36)).toFixed(1)+'"/>').join("")
   +'<path class="la" d="'+d+' L'+px(D).toFixed(1)+' '+(H-12)+' L8 '+(H-12)+' Z"/><path class="ll" d="'+d+'"/>'
   +'<circle class="ld" cx="'+px(D).toFixed(1)+'" cy="'+py(pts[D]).toFixed(1)+'" r="4.5"/>'
   +'<text class="lt" x="'+(px(D)-6).toFixed(1)+'" y="'+(py(pts[D])-9).toFixed(1)+'" text-anchor="end">'+pts[D]+' dziś</text></svg>';
}
// 🗓 wariant B: „Kiedy jeździmy” — kalendarz 12 tygodni z „Jak poszło?” (jazdy potwierdzone, bez testowych)
function rideCalHtml(){
  if(!repStats||repStats.loading)return '<div class="smail">Ładuję…</div>';
  const day=864e5,by={};
  repStats.L.filter(r=>r.went&&r.ride_at).forEach(r=>{const k=startOfDay(new Date(r.ride_at)).getTime();(by[k]=by[k]||{w:new Set(),p:new Set()});by[k].w.add(r.want_id);by[k].p.add(r.user_id)});
  const today=startOfDay(new Date()).getTime(),mon=today-((new Date().getDay()+6)%7)*day,first=mon-11*7*day;
  const lvl=n=>!n?0:n<=2?1:n<=5?2:n<=9?3:4,DN=["pon.","wt.","śr.","czw.","pt.","sob.","niedz."],dow=[0,0,0,0,0,0,0];
  let cells="",nR=0;
  for(let w=0;w<12;w++)for(let dd=0;dd<7;dd++){const t=first+(w*7+dd)*day;if(t>today)continue;const b=by[t],np=b?b.p.size:0,nw=b?b.w.size:0;nR+=nw;dow[dd]+=nw;
    cells+='<rect class="hc l'+lvl(np)+'" x="'+(26+w*22.5)+'" y="'+(2+dd*15)+'" width="19" height="12.5" rx="3"><title>'+esc(new Date(t).toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"}))+(nw?': '+nw+' '+plf(nw,["jazda","jazdy","jazd"])+', '+np+' '+plf(np,["osoba","osoby","osób"]):': bez jazdy')+'</title></rect>'}
  const top=Math.max(...dow),best=top?DN[dow.indexOf(top)]:"";
  return '<svg class="hcal" viewBox="0 0 300 108" role="img" aria-label="Kalendarz jazd z 12 tygodni">'
   +[[0,"pn"],[2,"śr"],[4,"pt"],[6,"nd"]].map(([i,t])=>'<text class="lt" x="0" y="'+(12+i*15)+'">'+t+'</text>').join("")+cells+'</svg>'
   +'<div class="nbl"><span>'+(nR?nR+' '+plf(nR,["jazda","jazdy","jazd"])+(best?' · najczęściej: '+best:''):'Brak potwierdzonych jazd')+'</span><span class="hleg">mniej <i class="hc l1"></i><i class="hc l2"></i><i class="hc l3"></i><i class="hc l4"></i> więcej</span></div>'
   +'<p class="note">Kolor = ile osób potwierdziło jazdę w „Jak poszło?”. Dotknij kratki, żeby zobaczyć szczegóły.</p>';
}
let repStats=null;
function repStatsHtml(t){
  if(!reportOk)return "";
  // 📊 KROK 62: zbiorcze dane z ride_group_stats() (osoba = pseudonim); bez KROKU 62 — jak dotąd
  if(!repStats){repStats={loading:1};sb.rpc("ride_group_stats").then(r=>{if(r.error||!Array.isArray(r.data))throw 0;
    repStats={L:r.data.map(x=>Object.assign({user_id:x.pk},x))};if(gearOpen&&gearView==="stats")renderGear()}).catch(()=>sb.from("ride_reports").select("want_id,user_id,went,km,avg_kmh,rating,route_rating,self,ride_at").eq("ride_test",false).limit(10000)
    .then(r=>r&&r.error?sb.from("ride_reports").select("want_id,user_id,went,km,avg_kmh,rating,route_rating,self,ride_at").limit(10000):r).then(r=>{repStats={L:(r&&r.data)||[]};if(gearOpen&&gearView==="stats")renderGear()}));return ""}
  if(repStats.loading)return '<div class="smail">Ładuję…</div>';
  const L=repStats.L;if(!L.length)return '<p class="note">Jeszcze nikt nie odpowiedział po jeździe.</p>';
  const yes=L.filter(r=>r.went),rides=new Set(yes.map(r=>r.want_id)),km=Math.round(yes.reduce((a,r)=>a+(+r.km||0),0)),rt=L.filter(r=>r.rating).map(r=>r.rating);
  return '<div class="stats">'+t(rides.size,"jazd z potwierdzeniem")+t(km.toLocaleString("pl-PL")+" km","przejechane (deklaracje)")+t(Math.round(yes.length/L.length*100)+"%","frekwencja")+t(rt.length?fmt1(rt.reduce((a,b)=>a+b,0)/rt.length)+" ★":"—","średnia ocena jazd")+(()=>{const v=yes.filter(r=>r.avg_kmh!=null).map(r=>+r.avg_kmh);return t(v.length?fmt1(v.reduce((a,b)=>a+b,0)/v.length)+" km/h":"—","średnia prędkość")})()+'</div>';
}
function adminStatsHtml(){
  const head='<button class="sback" data-c="backadmin">‹ Administracja</button><div class="sname" style="margin-top:26px">📊 Statystyki</div>';
  if(statsErr)return head+'<div class="sleft"><div class="changed">'+esc(statsErr)+'</div></div>';
  if(!statsData)return head+'<div class="smail">Ładuję…</div>';
  const d=statsData,t=(v,l)=>'<div class="st"><b>'+esc(v==null?"—":v)+'</b><span>'+l+'</span></div>';
  // kafelek klikalny: lista osób z filtrem albo „Online”
  const tc=(v,l,c,f)=>'<button type="button" class="st stb" data-c="'+c+'"'+(f!=null?' data-uf="'+f+'"':'')+'><b>'+esc(v==null?"—":v)+'</b><span>'+l+' ›</span></button>';
  // sekcja zwijana — domyślnie zwinięta (decyzja właściciela 2026-11-20 04:50); po prawej krótkie podsumowanie
  const sec=(k,h,sum,body)=>body?'<details class="stsec" data-j="st_'+k+'"'+(joinOpen.has("st_"+k)?' open':'')+'><summary><span>'+h+'</span>'+(sum!==""&&sum!=null?'<span class="stsum">'+sum+'</span>':'')+'</summary><div class="stbody">'+body+'</div></details>':'';
  const since=d.since?new Date(d.since).toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"}):"";
  const J=Object.values(joinedAt),n7=J.filter(x=>Date.now()-new Date(x)<7*864e5).length,n30=J.filter(x=>Date.now()-new Date(x)<30*864e5).length;
  const nAcc=Object.keys(joinedAt).filter(id=>nicks[id]).length;
  return head+'<div class="sleft">'
   +sec("konta","Konta",esc(d.profiles==null?"":d.profiles+" z nickiem"),'<div class="stats">'+t(d.accounts,"założone konta")+tc(d.profiles,"z nickiem","ufilter","")+'</div>'
      +(J.length?'<h3>Nowi (z nickiem)</h3><div class="stats">'+tc(n7,"ostatnie 7 dni","ufilter","new7")+tc(n30,"ostatnie 30 dni","ufilter","new30")+'</div>':''))
   +sec("wykres","Konta — 8 tygodni",n7?"+"+n7+" w 7 dni":"",newAccHtml("chart"))
   +sec("kto","Kto i kiedy założył konto",nAcc||"",newAccHtml("list"))
   +(reportOk?sec("kiedy","Kiedy jeździmy — 12 tygodni","",rideCalHtml()):'')
   +(reportOk?sec("rep","🚴 Jak poszło?","",repStatsHtml(t)||'<div class="smail">Ładuję…</div>'):'')
   +sec("akt","Aktywność",onlineIds.length+" online",'<div class="stats">'+tc(onlineIds.length,"teraz online","onlinestats")+tc(d.active7,"aktywni 7 dni","ufilter","a7")+tc(d.active30,"aktywni 30 dni","ufilter","a30")+'</div>'
      +'<p class="note">Aktywny = otworzył aplikację zalogowany w danym okresie.'+(since?' Aktywność zapisywana od '+esc(since)+'.':'')+'</p>')
   +(tgLinks?sec("tg","Telegram",tgLinks.size+" z botem",'<div class="stats">'+tc(tgLinks.size,"połączony bot","ufilter","tg")+t(Math.max(0,(d.profiles||0)-tgLinks.size),"bez bota")+'</div>'):'')
   +sec("plec","Płeć","",'<div class="stats">'+t(d.women,"👩 kobiety")+t(d.men,"👨 mężczyźni")+(d.nogender?t(d.nogender,"bez płci"):"")+'</div>')
   +'<p class="note">Konta bez nicku liczą się tylko w „założone konta”. Kafelek ze strzałką › pokazuje osoby.</p>'
   +'<button class="b sbtn g" data-c="stats">↻ Odśwież</button></div>';
}

function refreshUi(){updateFab();renderBell();renderMeNick();renderChrome();renderWants();renderNext();renderCountdown();renderNav();renderCard();renderList();renderLibUi();renderOnline()}

async function showRide(idx){
  cur=idx;const token=++viewToken;
  refreshUi();
  const r=sorted[cur],wrap=$("mapwrap1");
  const clear=msg=>{wrap.classList.add("hide");$("stats1").innerHTML="";$("tip1").classList.add("hide");$("routeinfo1").classList.add("hide");$("placesbox1").classList.add("hide");$("windinfo1").textContent=msg||""};
  if(!r){clear();return}
  $("windinfo1").textContent="Ładuję trasę…";
  let pts;
  try{pts=await getRoute(r.id)}catch(e){if(token===viewToken)clear("Nie udało się pobrać trasy.");return}
  if(token!==viewToken)return;
  renderCard();
  if(!pts){clear("Ta wieczorynka nie ma dołączonej trasy.");return}
  wrap.classList.remove("hide");
  const ri=$("routeinfo1");
  if(r.route_title||r.route_desc){ri.innerHTML='<b>Trasa: '+esc(r.route_title||"")+'</b>'+(r.route_desc?'<div>'+esc(r.route_desc)+'</div>':'');ri.classList.remove("hide")}
  else ri.classList.add("hide");
  if(!map1){await needL();if(token!==viewToken)return;map1=makeMap("map1")}
  if(!map1){wrap.classList.add("hide");$("windinfo1").textContent="Nie udało się załadować mapy (sprawdź połączenie z internetem).";return}
  const bs=paceKmh(r.pace);
  let an=analyze(pts,0,0,bs,false);
  map1.m.invalidateSize();
  drawRoute(map1,pts,null,true);setArrow("warrow1",null);
  map1.p.clearLayers();$("placesbox1").classList.add("hide");
  placesAlong(pts,"r"+r.id+":"+(r.edited_at||"")).then(l=>{if(token===viewToken)renderPlaces("placesbox1",map1,l)}).catch(()=>{});
  $("stats1").innerHTML=statsHtml(an);$("tip1").classList.add("hide");
  $("windinfo1").textContent="Sprawdzam prognozę wiatru…";
  try{
    const w=await getWind(pts[0].lat,pts[0].lon,new Date(r.when));
    if(token!==viewToken)return;
    an=analyze(pts,w.dir,w.speed,bs,false);
    drawRoute(map1,pts,an.segs,false);setArrow("warrow1",w.dir,w.speed);
    $("stats1").innerHTML=statsHtml(an);
    $("tip1").textContent=an.tip;$("tip1").classList.remove("hide");
    $("windinfo1").textContent="Wiatr o "+w.time+": "+windLabel(w.dir)+", "+Math.round(w.speed)+" km/h, porywy do "+Math.round(w.gust)+" km/h (Open-Meteo).";
  }catch(e){
    if(token!==viewToken)return;
    $("windinfo1").textContent=e.code==="range"?e.message:"Nie udało się pobrać prognozy wiatru.";
  }
}

// 🗓 kalendarz jazd: dotknięcie kratki pokazuje dzień i liczbę jazd (na telefonie nie ma podpowiedzi po najechaniu)
document.addEventListener("click",e=>{const r=e.target.closest(".hcal rect");if(!r)return;const t=r.querySelector("title");if(t)say(t.textContent)});
