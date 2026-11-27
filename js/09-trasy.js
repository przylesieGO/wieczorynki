/* ---------- 🗺️ Baza tras — etap 1 (KROK 47; decyzje właściciela 2026-11-16 13:55) ----------
   trasa trafia do bazy tylko przełącznikiem „📚 Dodaj do bazy tras” (decyduje zapraszający) albo przyciskiem
   „📚 Do bazy tras” na karcie; baza w ⚙️ (nie na głównym ekranie) i „📚 Wybierz z bazy tras” w formularzu */
let rbOk=false,rbList=null,rbStats={},rbAt=0,rbMap=null,rbTok=0;
const rb={mode:"browse",sort:"uses",bike:"",q:"",open:null,pw:null,rev:false,all:false},rbRouteCache={},rbPois={};
let rbOsmOk=false,rbOsmBusy={};
let rbPts=null;
const RB_SORTS=[["uses","🔁 Najczęściej"],["best","★ Najlepsze"],["scenic","🌅 Malownicze"],["hard","🪨 Najtrudniejsze"],["easy","🌿 Najłatwiejsze"],["quiet","🚗 Najmniej aut"],["long","📏 Najdłuższe"],["short","📏 Najkrótsze"],["forest","🌳 Najwięcej lasu"],["asphalt","🛣 Asfalt"],["offroad","🪨 Teren"],["food","☕ Gastronomia"],["near","📍 Najbliżej"],["new","🆕 Najnowsze"]];
// rankingi z ocen (etap 2): wartość dla sortowania; brak ocen — na końcu
const osmPct=(x,k)=>{const o=x.osm;if(!o)return null;const T=(o.asf||0)+(o.szu||0)+(o.gru||0)+(o.unk||0);if(!T)return null;const v=k==="off"?(o.szu||0)+(o.gru||0):o[k];return v==null?null:Math.min(1,v/T)};
const RB_MET={forest:[x=>osmPct(x,"las"),-1],asphalt:[x=>osmPct(x,"asf"),-1],offroad:[x=>osmPct(x,"off"),-1],food:[x=>x.osm?(x.osm.food||0)+(x.osm.shop||0):null,-1],best:[x=>(rbStats[x.id]||{}).rating,-1],scenic:[x=>(rbStats[x.id]||{}).scenic,-1],hard:[x=>(rbStats[x.id]||{}).difficulty,-1],easy:[x=>(rbStats[x.id]||{}).difficulty,1],quiet:[x=>(rbStats[x.id]||{}).traffic,1]};
async function rbLoad(force){
  if(!rbOk||!session)return;
  if(!force&&rbList&&Date.now()-rbAt<120000)return;
  const RBC="id,name,km,up_m,start_lat,start_lon,start_city,bike,created_by,created_at,hidden,preview,src_want,demo";   // 🧪 v275: demo = trasa-widmo (KROK 107)
  let r=await sb.from("route_base").select(RBC+",osm,osm_at").order("created_at",{ascending:false}).limit(1000);rbOsmOk=!r.error;   // 🌳 KROK 51
  if(r.error)r=await sb.from("route_base").select(RBC).order("created_at",{ascending:false}).limit(1000);
  rbList=r.error?[]:(r.data||[]);
  try{const st=await sb.rpc("route_base_stats");rbStats={};((st&&st.data)||[]).forEach(x=>{rbStats[x.route_id]={uses:+x.uses||0,planned:+x.planned||0,last:x.last_at,
    n:+x.reviews||0,rating:x.rating!=null?+x.rating:null,scenic:x.scenic!=null?+x.scenic:null,difficulty:x.difficulty!=null?+x.difficulty:null,traffic:x.traffic!=null?+x.traffic:null,tags:x.tags||{}}})}catch(e){}
  rbAt=Date.now();
}
const rbUses=x=>(rbStats[x.id]||{}).uses||0;
const rbCanEdit=x=>!!session&&(x.created_by===uid||isAdmin);
const rbKmFrom=x=>{const o=originGet();return o&&x.start_lat!=null?dist({lat:o.lat,lon:o.lon},{lat:+x.start_lat,lon:+x.start_lon}):null};
const rbPreview=pts=>JSON.stringify(thin(pts,40).map(p=>[+p.lat.toFixed(4),+p.lon.toFixed(4)]));
async function rbRoute(id){
  if(id in rbRouteCache)return rbRouteCache[id];
  let r=rbOsmOk?await sb.from("route_base").select("route,pois").eq("id",id).single():{error:1};
  if(r.error)r=await sb.from("route_base").select("route").eq("id",id).single();if(r.error)throw r.error;
  if(r.data&&Array.isArray(r.data.pois))rbPois[id]=r.data.pois;
  const p=r.data&&r.data.route?parseRoute(r.data.route):false;rbRouteCache[id]=p;return p;
}
function rbSvg(prev,w,h,white){
  let P=[];try{P=JSON.parse(prev||"[]")}catch(e){}
  if(P.length<2)return '<svg viewBox="0 0 '+w+' '+h+'"></svg>';
  const la=P.map(p=>p[0]),lo=P.map(p=>p[1]),k=Math.cos((Math.min(...la)+Math.max(...la))/2*Math.PI/180);
  const x0=Math.min(...lo)*k,x1=Math.max(...lo)*k,y0=Math.min(...la),y1=Math.max(...la),pad=9;
  const sc=Math.min((w-2*pad)/((x1-x0)||1e-6),(h-2*pad)/((y1-y0)||1e-6)),ox=(w-(x1-x0)*sc)/2,oy=(h-(y1-y0)*sc)/2;
  const pt=p=>[(ox+(p[1]*k-x0)*sc).toFixed(1),(oy+(y1-p[0])*sc).toFixed(1)],a=pt(P[0]);
  const c=white?"#fff":"#1f9d55";
  return '<svg viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><path d="M'+P.map(p=>pt(p).join(' ')).join(' L')+'" fill="none" stroke="'+c+'" stroke-width="'+(white?2.6:3)+'" stroke-linejoin="round" stroke-linecap="round"/><circle cx="'+a[0]+'" cy="'+a[1]+'" r="4" fill="'+(white?'#1f9d55':'#fff')+'" stroke="'+c+'" stroke-width="2.5"/></svg>';
}
function rbFiltered(){
  const q=lc(rb.q.trim()),s=rb.sort;
  const L=(rbList||[]).filter(x=>(!rb.bike||x.bike===rb.bike)&&(!q||lc(x.name+" "+(x.start_city||"")).includes(q))&&(rb.all||q||typeof inArea!=="function"||inArea(x.start_lat,x.start_lon)));   // 📍 v270: domyślnie trasy z Mojej okolicy (szukanie po nazwie — wszędzie)
  return L.sort(s==="new"?(a,b)=>String(b.created_at).localeCompare(String(a.created_at)):s==="long"?(a,b)=>b.km-a.km:s==="short"?(a,b)=>a.km-b.km
    :s==="near"?(a,b)=>((rbKmFrom(a)??1e9)-(rbKmFrom(b)??1e9))
    :RB_MET[s]?(a,b)=>{const [f,d]=RB_MET[s],va=f(a),vb=f(b);if(va==null&&vb==null)return rbUses(b)-rbUses(a);if(va==null)return 1;if(vb==null)return -1;return (va-vb)*d||((rbStats[b.id]||{}).n||0)-((rbStats[a.id]||{}).n||0)||rbUses(b)-rbUses(a)}
    :(a,b)=>rbUses(b)-rbUses(a)||String(b.created_at).localeCompare(String(a.created_at)));
}
const OSM_SORT=["forest","asphalt","offroad","food"];
function osmMetTxt(k,x){const P=v=>Math.round(v*100)+'%';const o=x.osm;
  return k==="forest"?(o.las!=null?'🌳 las '+P(osmPct(x,"las")):'🌳 las: brak danych'):k==="asphalt"?'🛣 asfalt '+P(osmPct(x,"asf")):k==="offroad"?'🪨 teren '+P(osmPct(x,"off")):'☕ po drodze: '+((o.food||0)+(o.shop||0))}
const OSM_CL=[["asf","Asfalt / kostka","#8e8e93"],["szu","Szuter / utwardzona","#d4a259"],["gru","Grunt / leśna / polna","#8b5e34"],["unk","Nieznana","#c7c7cc"]];
function osmBar(o,km,mini){const T=OSM_CL.reduce((a,c)=>a+(o[c[0]]||0),0)||1;
  return '<span class="osmbar'+(mini?' mini':'')+'">'+OSM_CL.map(([k,,col])=>o[k]?'<i style="width:'+(o[k]/T*100).toFixed(1)+'%;background:'+col+'"></i>':'').join("")+'</span>'}
function rbCard(x,i){
  const u=rbUses(x),k=rbKmFrom(x),B=x.bike&&BIKES[x.bike],S=rbStats[x.id]||{};
  const rk=i<3&&(rb.sort==="uses"?u>0:RB_MET[rb.sort]?RB_MET[rb.sort][0](x)!=null&&(!OSM_SORT.includes(rb.sort)||RB_MET[rb.sort][0](x)>0):false);
  return '<button type="button" class="rbc'+(x.hidden?' hid':'')+'" data-rbo="'+esc(x.id)+'"><span class="rbmini">'+rbSvg(x.preview,84,84)+(rk?'<i class="rbrk">#'+(i+1)+'</i>':'')+'</span>'
   +'<span class="rbci"><b>'+esc(x.name)+'</b><span class="rbm">'+kmTxt(x.km)+' km'+(x.up_m!=null?' · ⛰ '+x.up_m+' m':'')+' · 🔁 '+u+'×'+(S.n?' · <span class="rbstar">★ '+fmt1(S.rating||0)+'</span> ('+S.n+')':'')+'</span>'
   +(S.n&&RB_MET[rb.sort]&&!OSM_SORT.includes(rb.sort)&&rb.sort!=="best"?'<span class="rbm rbmet">'+rbMetTxt(rb.sort,S)+'</span>':'')
   +(x.osm&&OSM_SORT.includes(rb.sort)?'<span class="rbm rbmet">'+osmMetTxt(rb.sort,x)+'</span>':'')
   +(x.osm?osmBar(x.osm,x.km,true):'')
   +((x.start_city||k!=null)?'<span class="rbm">📍 '+(x.start_city?esc(x.start_city):'start')+(k!=null?' · '+nearKm(k)+' km od Ciebie':'')+'</span>':'')
   +'<span class="rbtg">'+(B?'<i>'+B+'</i>':'')+(x.demo?'<i>🧪 DEMO</i>':'')+(x.hidden?'<i>🙈 ukryta</i>':'')+(x.created_by&&nicks[x.created_by]?'<i>👤 '+esc(nicks[x.created_by])+'</i>':'')+'</span></span></button>';
}
function rbListHtml(){
  if(!rbList)return '<div class="note" style="text-align:center;margin-top:16px">Wczytuję trasy…</div>';
  const L=rbFiltered();
  return L.length?L.map(rbCard).join("")
   :'<div class="rbempty">'+(rbList.length?'Nic nie pasuje do filtrów.':'📚 Baza jest jeszcze pusta.<span class="note">Trasy trafiają tu z zaproszeń z plikiem GPX — przełącznik „📚 Dodaj do bazy tras” w formularzu — albo z karty zaproszenia: „📚 Do bazy tras”.</span>')+'</div>';
}
function rbCloseMap(){if(rbMap){try{rbMap.m.remove()}catch(e){}rbMap=null}rbTok++}
function openRb(mode){rb.mode=mode||"browse";rb.open=null;rb.add=null;renderRb();rbLoad(true).then(()=>{if(!$("rbsheet").classList.contains("hide")&&!rb.open)renderRb()})}
function closeRb(){rb.add=null;rbCloseMap();const p=$("rbsheet");p.classList.add("hide");p.innerHTML=""}
// ＋ dodawanie trasy z pliku GPX bez zaproszenia — tylko administratorzy (decyzja właściciela 18:51; użytkownicy dodają przez zaproszenie)
function rbAddStart(){if(!isAdmin)return;let f=$("rbfile");if(!f){f=document.createElement("input");f.type="file";f.id="rbfile";f.accept=".gpx,application/gpx+xml,text/xml";f.className="hide";document.body.appendChild(f);
    f.addEventListener("change",async()=>{const x=f.files&&f.files[0];f.value="";if(!x)return;const pts=parseGpx(await x.text());
      if(pts.length<2){say("Nie znaleziono punktów trasy w pliku GPX.");return}
      const t=thin(pts,500);rb.add={pts:t,name:x.name.replace(/\.gpx$/i,"").replace(/[_-]+/g," ").trim().slice(0,60),bike:"",busy:false};rb.open=null;
      if($("rbsheet").classList.contains("hide"))rb.mode="browse";renderRb()})}
  f.click()}
function renderRbAdd(){
  const a=rb.add,p=$("rbsheet"),km=routeKm(a.pts),an=analyze(a.pts,0,0,20,false);
  p.innerHTML='<div class="bsbox rbbox" role="dialog" aria-modal="true" aria-label="Dodaj trasę"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-rb="addx">Anuluj</button><b>＋ Dodaj trasę</b><button type="button" class="lnk" data-rb="addsave" style="min-width:64px;text-align:right"'+(a.busy?' disabled':'')+'>Zapisz</button></div><div class="bslist">'
   +'<div class="rbaddprev">'+rbSvg(rbPreview(a.pts),320,160)+'</div>'
   +'<div class="stats">'+[["Dystans",kmTxt(km)+" km"],["Przewyższenie",Math.round(an.gain)+" m"],["Czas (ok. 20 km/h)",Math.floor(an.tsec/3600)+" h "+pad(Math.round(an.tsec/60)%60)+" min"]].map(([x,y])=>'<div class="st"><b>'+y+'</b><span>'+x+'</span></div>').join("")+'</div>'
   +'<div class="bsgrp" style="margin-top:14px">Nazwa trasy</div><input id="rbaddname" maxlength="60" value="'+esc(a.name)+'" placeholder="np. Pętla przez Puszczę Białą">'
   +'<div class="bsgrp" style="margin-top:14px">Rower / teren</div><div class="wbike">'+WBIKE.map(([v,k,t])=>'<button type="button" class="wbk'+(a.bike===v?' on':'')+'" data-rbab="'+v+'">'+uiIcon(k)+'<span>'+t+'</span></button>').join("")+'</div>'
   +'<p class="note" style="margin-top:12px">'+uiIcon("shield")+' Dodajesz jako administrator — trasa od razu trafi do bazy dla wszystkich. Ta sama trasa (start, meta i ślad) zostanie połączona z istniejącą.</p>'
   +'<button type="button" class="b big" style="margin-top:8px;width:100%" data-rb="addsave"'+(a.busy?' disabled':'')+'>'+(a.busy?'Zapisuję…':'Dodaj do bazy tras')+'</button>'
   +'</div></div>';
  p.classList.remove("hide");
}
function renderRb(){
  if(rb.add){renderRbAdd();return}
  if(rb.open&&rb.rate){renderRbRate();return}
  if(rb.open){renderRbDetail();return}
  rbCloseMap();
  const p=$("rbsheet"),keep=p.querySelector("#rblist"),st=keep&&p.querySelector(".bslist")?p.querySelector(".bslist").scrollTop:0,n=rbList?rbList.filter(x=>!x.hidden).length:null;
  p.innerHTML='<div class="bsbox rbbox" role="dialog" aria-modal="true" aria-label="Baza tras"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-rb="close">'+(rbPicking()?'Anuluj':'Zamknij')+'</button><b>🗺️ '+(rbPicking()?'Wybierz trasę':'Baza tras')+(n!=null?' · '+n:'')+'</b><span style="min-width:64px"></span></div><div class="bslist">'
   +(rb.mode==="browse"?'<div class="rbinfo2">'+uiIcon("plus")+'<div><b>'+(isAdmin?'Dodaj trasę do bazy':'Jak dodać swoją trasę?')+'</b><span>'
       +(isAdmin?'Jako administrator dodasz plik GPX od razu. Użytkownicy dodają trasy przez zaproszenie.':'Utwórz zaproszenie z plikiem GPX i włącz „📚 Dodaj do bazy tras” — po zapisaniu trasa trafi tutaj.')+'</span>'
       +'<button type="button" class="b g small" data-rb="'+(isAdmin?'add':'addinv')+'">'+(isAdmin?'＋ Dodaj trasę z pliku GPX':'＋ Zaproś z trasą')+'</button></div></div>':'')
   +'<input id="rbq" class="rbq srch" placeholder="Szukaj: nazwa albo miejscowość" value="'+esc(rb.q)+'" enterkeyhint="search">'
   +(typeof areaCur==="function"?'<div class="fchips rbchips"><button type="button" class="fch'+(rb.all?'':' on')+'" data-rba="1">📍 '+(rb.all?'W okolicy':esc(areaCur().name)+' · '+areaKmTxt(areaKm()))+'</button><button type="button" class="fch'+(rb.all?' on':'')+'" data-rba="all">Wszystkie trasy</button></div>':'')
   +'<div class="fchips rbchips">'+RB_SORTS.filter(x=>x[0]!=="near"||originGet()).map(([k,t])=>'<button type="button" class="fch'+(rb.sort===k?' on':'')+'" data-rbs="'+k+'">'+t+'</button>').join("")+'</div>'
   +'<div class="fchips rbchips">'+[["","🚲 Każdy"]].concat(Object.entries(BIKES)).map(([k,t])=>'<button type="button" class="fch'+(rb.bike===k?' on':'')+'" data-rbb="'+k+'">'+t+'</button>').join("")+'</div>'
   +'<div id="rblist">'+rbListHtml()+'</div>'

   +'</div></div>';
  p.classList.remove("hide");const nl=p.querySelector(".bslist");if(nl)nl.scrollTop=st;
}
async function renderRbDetail(){
  const x=(rbList||[]).find(y=>y.id===rb.open);if(!x){rb.open=null;renderRb();return}
  rbCloseMap();const tok=rbTok,p=$("rbsheet"),u=rbStats[x.id]||{},k=rbKmFrom(x),can=rbCanEdit(x);
  const dd=t=>new Date(t).toLocaleDateString("pl-PL",{day:"numeric",month:"numeric",year:"numeric"});
  p.innerHTML='<div class="bsbox rbbox" role="dialog" aria-modal="true" aria-label="Trasa"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-rb="back">‹ Trasy</button><b class="rbtitle">'+esc(x.name)+'</b><span style="min-width:64px"></span></div><div class="bslist">'
   +'<div class="mapwrap"><div class="map rsmap" id="map4"></div><div class="warrow hide" id="warrow4"></div></div>'
   +'<div class="legend"><span><i class="dot" style="background:#d64545"></i>pod wiatr</span><span><i class="dot" style="background:#e0b83a"></i>bocznie</span><span><i class="dot" style="background:#2a9d5c"></i>z wiatrem</span></div>'
   +'<div class="stats" id="stats4"></div><div class="note" id="windinfo4" style="margin-top:8px">Ładuję trasę…</div><div class="routeinfo hide" id="placesbox4"></div><div class="routeinfo hide" id="osmbox4"></div>'
   +'<div class="pwbox"><div class="bsgrp" style="margin-top:14px">🌦 Przed jazdą</div><div id="pwsel">'+pwSelHtml()+'</div><div id="pw4"></div></div>'
   +'<div class="rbinfo">'+[(x.start_city||k!=null)?'📍 start: '+(x.start_city?esc(x.start_city):'—')+(k!=null?' · '+nearKm(k)+' km od Ciebie':''):'',x.bike&&BIKES[x.bike]?BIKES[x.bike]:'',
      '🔁 wybrana '+(u.uses||0)+'×'+(u.planned?' · zaplanowana '+u.planned+'×':'')+(u.last?' · ostatnio '+esc(dd(u.last)):''),
      '👤 '+(x.created_by&&nicks[x.created_by]?esc(nicks[x.created_by]):'—')+' · dodana '+esc(dd(x.created_at))].filter(Boolean).map(t=>'<div>'+t+'</div>').join("")+'</div>'
   +'<div id="rbrev">'+rbRevHtml(x)+'</div>'
   +(x.demo?'<div class="note warnbox" style="margin-top:8px">🧪 Trasa DEMO — kształt do podglądu. Bez pliku GPX; tylko do zaproszeń testowych.</div>':'')+(x.hidden?'<div class="note warnbox" style="margin-top:8px">🙈 Ukryta — widzisz ją tylko Ty'+(isAdmin?' i admini':'')+'.</div>':'')
   +'<button type="button" class="b big" style="margin-top:12px;width:100%" data-rb="'+(rbPicking()?'pick':'invite')+'" id="rbinvbtn">'+rbInvLbl()+'</button>'
   +'<div class="pbtns" style="margin-top:8px">'+(x.demo?'':'<button type="button" class="b g" data-rb="gpx">⬇ GPX</button>')+(can?'<button type="button" class="b g" data-rb="rename">✏️ Nazwa</button><button type="button" class="b g" data-rb="hide">'+(x.hidden?'👁 Pokaż':'🙈 Ukryj')+'</button>':'')+'</div>'
   +(can?'<button type="button" class="lnk rbdel" data-rb="del">Usuń z bazy tras</button>':'')
   +'<div class="ptg">Czas jazdy przy tempie ok. 20 km/h, z wiatrem. Pogoda dla punktu startu. Mapa © OpenStreetMap · pogoda: Open-Meteo.</div></div></div>';
  p.classList.remove("hide");
  if(!(x.id in rbReviews))rbLoadReviews(x.id).then(()=>{if(tok===rbTok&&rb.open===x.id&&!rb.rate){const el=$("rbrev");if(el)el.innerHTML=rbRevHtml(x)}});
  let pts;try{pts=await rbRoute(x.id)}catch(e){pts=null}
  if(tok!==rbTok)return;
  if(!pts){$("windinfo4").textContent="Nie udało się wczytać trasy.";return}
  rbPts=pts;
  const an=analyze(rb.rev?pts.slice().reverse():pts,0,0,20,false);$("stats4").innerHTML=statsHtml(an);
  await needL();if(tok!==rbTok)return;
  rbMap=makeMap("map4");
  if(rbMap)setTimeout(()=>{if(rbMap&&tok===rbTok){rbMap.m.invalidateSize();drawRoute(rbMap,rb.rev?pts.slice().reverse():pts,null,true);rbTowns(tok);rbOsmShow(tok);pwHrsCenter();pwUpdate()}},60);
  else{$("map4").outerHTML='<div class="note">Nie udało się załadować mapy (sprawdź internet).</div>';rbTowns(tok);rbOsmShow(tok);pwHrsCenter();pwUpdate()}
}
/* ---------- 🌦 Przed jazdą (baza tras, etap 3): dzień i godzina → pogoda w czasie jazdy, wiatr, kierunek, co zabrać ---------- */
const WMO=c=>c==null?"":uiIcon(c===0?"sun":c<=2?"cloudsun":c===3?"cloud":c<=48?"fog":c<=57?"drizzle":c<=67?"rain":c<=77?"cloudsnow":c<=82?"rain":c<=86?"cloudsnow":"storm");
const WMO_T=c=>c==null?"":c===0?"bezchmurnie":c<=2?"małe zachmurzenie":c===3?"pochmurno":c<=48?"mgła":c<=57?"mżawka":c<=67?"deszcz":c<=77?"śnieg":c<=82?"przelotny deszcz":c<=86?"przelotny śnieg":"burza";
// przycisk „Zaproś na tę trasę” z terminem wybranym w „Przed jazdą”
// v337: tryb „radar” — wybór trasy do podglądu na radarze okolicy (jak „pick”, ale bez terminu)
const rbPicking=()=>rb.mode==="pick"||rb.mode==="radar";
function rbInvLbl(){if(rb.mode==="radar")return uiIcon("radar")+' Pokaż na radarze';const d=pwWhen(),n=dayDiff(d),dn=d.toLocaleDateString("pl-PL",{weekday:"long"});
  return (rb.mode==="pick"?uiIcon("check")+' Wybierz tę trasę':uiIcon("bike")+' Zaproś na tę trasę')+'<small class="rbinvt">'+esc((n===0?"Dziś":n===1?"Jutro ("+dn+")":dn.charAt(0).toUpperCase()+dn.slice(1)+" "+d.getDate()+"."+pad(d.getMonth()+1))+" · "+hhmm(d))+'</small>'}
function pwDefault(){const h=new Date().getHours()+1;return h>23?{day:1,h:0}:{day:0,h}}
// pasek godzin: wybrana godzina na środku (bez przewijania strony)
function pwHrsCenter(){const h=$("pwhrs"),on=h&&h.querySelector(".on");if(!on)return;h.scrollLeft+=on.getBoundingClientRect().left-h.getBoundingClientRect().left-(h.clientWidth-on.offsetWidth)/2}
function pwWhen(){const v=rb.pw||(rb.pw=pwDefault()),d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+v.day);d.setHours(v.h,v.m||0,0,0);return d}
// tryb „Wybierz trasę” z formularza: pogoda startuje od dnia i godziny ustawionych w zaproszeniu
function pwFromForm(){const d=wfDate();if(!d||d.getTime()<=Date.now())return null;const n=dayDiff(d);if(n<0||n>6)return null;return {day:n,h:d.getHours(),m:d.getMinutes()}}
function pwSelHtml(){
  const v=rb.pw||(rb.pw=pwDefault()),now=new Date(),dn=["nd","pn","wt","śr","cz","pt","sb"];
  let days='';for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()+i);
    days+='<button type="button" class="fch'+(v.day===i?' on':'')+'" data-rbpd="'+i+'">'+(i===0?'Dziś':i===1?'Jutro':dn[d.getDay()]+' '+d.getDate())+'</button>'}
  let hrs='';for(let h=0;h<=23;h++){const past=v.day===0&&h<=now.getHours()-1;
    if(!past)hrs+='<button type="button" class="fch'+(v.h===h?' on':'')+'" data-rbph="'+h+'">'+h+':00</button>'}
  // po 23:00 — noc i ranek następnego dnia; dotknięcie sam przełącza dzień
  if(v.day<6){const nd=new Date(now);nd.setDate(nd.getDate()+v.day+1);const nl=v.day===0?'jutro':dn[nd.getDay()]+' '+nd.getDate();
    for(let h=0;h<=6;h++)hrs+='<button type="button" class="fch pwnx" data-rbph="'+h+'" data-rbpn="1">'+h+':00<small>'+nl+'</small></button>'}
  return '<div class="fchips pwrow">'+days+'</div><div class="fchips pwrow" id="pwhrs">'+hrs+'</div>';
}
function pwBring(o){
  const L=[],t=o.tmin,dark=o.dark,m=new Date(o.when).getMonth(),add=(k,x)=>{if(!L.some(y=>y[1]===x))L.push([k,x])};
  add("hat","kask");
  if(t<=3){add("hand","zimowe rękawiczki");add("layers","czapka pod kask");add("feet","ocieplacze na buty");add("layers","komin na szyję");add("coffee","termos z ciepłą herbatą")}
  else if(t<=8){add("hand","długie rękawiczki");add("shirt","ciepła kurtka / wiatrówka");add("layers","długie spodnie albo nogawki");add("coffee","bidon z ciepłym napojem")}
  else if(t<=14){add("shirt","wiatrówka albo kamizelka");add("layers","rękawki i nogawki (zdejmiesz po drodze)")}
  else if(t>=27){add("droplet","dwa bidony");add("sun","krem z filtrem");add("sun","czapka z daszkiem albo buff pod kask")}
  if(o.rain>=40||o.mm>=0.3){add("umbrella","kurtka przeciwdeszczowa");add("shield","błotniki")}
  if(o.wind>=25&&t>8)add("windy","wiatrówka — mocno wieje");
  if(dark){add("bulb","lampki przód i tył");add("vest","odblaski albo kamizelka odblaskowa");add("glasses","okulary z jasnymi szkłami")}
  else if(o.sunny||m>=9||m<=2)add("glasses","okulary"+(o.sunny?" przeciwsłoneczne":" (nisko słońce, liście, błoto)"));
  if(o.hours>=1.5&&t>3&&t<27)add("droplet","bidon");
  if(o.hours>=2.5)add("cookie","batony albo coś do jedzenia");
  add("wrench","dętka, łyżki i pompka");add("phone","naładowany telefon");
  return L;
}
// 🎒 lista do odhaczenia: zapamiętana w urządzeniu dla tej trasy i dnia (wpisy starsze niż 3 dni znikają)
const pwPackKey=w=>(rb.open||"")+"|"+localIso(w).slice(0,10);
function pwPackGet(){try{const o=JSON.parse(localStorage.getItem("pwPack")||"{}"),lim=Date.now()-3*864e5;for(const k in o)if(!o[k].t||o[k].t<lim)delete o[k];return o}catch(e){return {}}}
function pwPackSet(o){try{localStorage.setItem("pwPack",JSON.stringify(o))}catch(e){}}
let pwPackCur=null;
function pwPackHtml(items,when){
  const key=pwPackKey(when),on=new Set((pwPackGet()[key]||{}).d||[]);pwPackCur={key,n:items.length};
  const c=items.filter(([,t])=>on.has(t)).length;
  return '<div class="pwpack"><div class="bsgrp">🎒 Co zabrać</div><span class="pwpc"><span id="pwcnt">'+pwPackCnt(c,items.length)+'</span>'
     +'<button type="button" class="lnk'+(c?'':' hide')+'" id="pwclr" data-rb="pwclr">Wyczyść</button></span></div>'
   +'<div class="pwbar"><i id="pwbari" style="width:'+(items.length?Math.round(c/items.length*100):0)+'%"></i></div>'
   +'<div class="pwbring">'+items.map(([k,t])=>'<button type="button" class="pwit'+(on.has(t)?' on':'')+'" data-pwit="'+esc(t)+'" aria-pressed="'+on.has(t)+'"><span class="pwck"><svg class="ui-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>'+uiIcon(k)+'<span class="pwtx">'+esc(t)+'</span></button>').join("")+'</div>'
   +'<div class="note" style="margin-top:4px">Odhaczaj, co już masz spakowane — zapamiętam to w tym telefonie dla tej jazdy.</div>';
}
const pwPackCnt=(c,n)=>c>=n&&n?'<span class="pwdone">'+uiIcon("check")+' Wszystko spakowane!</span>':'Spakowane '+c+' z '+n;
function pwPackToggle(b){
  if(!pwPackCur)return;const o=pwPackGet(),e=o[pwPackCur.key]||{d:[]},t=b.dataset.pwit,i=e.d.indexOf(t);
  i<0?e.d.push(t):e.d.splice(i,1);e.t=Date.now();o[pwPackCur.key]=e;pwPackSet(o);
  const on=i<0;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));try{navigator.vibrate&&navigator.vibrate(8)}catch(err){}
  pwPackRefresh();
}
function pwPackRefresh(){
  const box=document.querySelector(".pwbring");if(!box||!pwPackCur)return;
  const c=box.querySelectorAll(".pwit.on").length,n=pwPackCur.n;
  const ce=$("pwcnt");if(ce)ce.innerHTML=pwPackCnt(c,n);const bi=$("pwbari");if(bi)bi.style.width=(n?Math.round(c/n*100):0)+"%";
  const cl=$("pwclr");if(cl)cl.classList.toggle("hide",!c);
}
/* 🌳 etap 4 (KROK 51): nawierzchnia, las i „po drodze” z OpenStreetMap — liczone raz, zapisane w bazie */
const POI_T={cafe:["coffee","kawiarnia","food"],restaurant:["food","restauracja","food"],fast_food:["food","szybkie jedzenie","food"],ice_cream:["icecream","lody","food"],pub:["food","pub","food"],bar:["food","bar","food"],biergarten:["food","ogródek piwny","food"],bakery:["cookie","piekarnia","food"],convenience:["shop","sklep","shop"],supermarket:["shop","supermarket","shop"],drinking_water:["droplet","woda pitna","water"],bicycle:["wrench","serwis rowerowy","bike"]};
function osmSurf(t){const sf=String(t.surface||"").toLowerCase(),h=t.highway||"",tt=t.tracktype||"";
  if(/^(asphalt|paved|concrete|concrete:plates|concrete:lanes|paving_stones|sett|chipseal|metal|wood|cobblestone|unhewn_cobblestone)$/.test(sf))return "asf";
  if(/^(gravel|fine_gravel|compacted|pebblestone)$/.test(sf))return "szu";
  if(/^(dirt|ground|earth|sand|grass|mud|unpaved|woodchips|grass_paver|rock|stone|soil)$/.test(sf))return "gru";
  if(!sf){if(/^(motorway|trunk|primary|secondary|tertiary|residential|living_street|cycleway)(_link)?$/.test(h))return "asf";
    if(h==="track")return tt==="grade1"?"asf":tt==="grade2"?"szu":"gru";
    if(/^(path|bridleway)$/.test(h))return "gru"}
  return "unk";
}
async function rbOsmCompute(x,pts){
  const L=thin(pts,110).map(p=>p.lat.toFixed(5)+","+p.lon.toFixed(5)).join(","),cum=[0];
  for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+dist(pts[i-1],pts[i]));
  const total=cum[cum.length-1],res={v:2,asf:0,szu:0,gru:0,unk:0},OP={ms:75000,post:true},errs=[];
  // próbki co ~0,4 km (maks. 100) — małe zapytania „w punkcie” zamiast całych dróg z geometrią (te bywały za ciężkie)
  const n=Math.min(100,Math.max(10,Math.round(total/0.4))),S=[];
  for(let j=0;j<n;j++){const tk=total*(j+.5)/n;let i=cum.findIndex(c=>c>=tk);if(i<0)i=pts.length-1;S.push(pts[i])}
  const seg=total/n,ll=p=>p.lat.toFixed(5)+","+p.lon.toFixed(5);
  // dzieli odpowiedź po znacznikach „make s” (i = numer próbki)
  const split=J=>{const G=S.map(()=>[]);let cur=-1;(J.elements||[]).forEach(e=>{if(e.type==="s"){cur=+((e.tags||{}).i);return}if(cur>=0&&G[cur])G[cur].push(e)});return G};
  // 1) nawierzchnia: drogi do 15 m od próbki
  try{const J1=await overpass('[out:json][timeout:60];'+S.map((p,i)=>'make s i='+i+';out;way(around:15,'+ll(p)+')[highway];out tags;').join(""),OP);
    const marks=(J1.elements||[]).filter(e=>e.type==="s").length;if(marks<S.length)throw new Error("niepełna odpowiedź");
    split(J1).forEach(ws=>{const c={};ws.forEach(w=>{const k=osmSurf(w.tags||{});c[k]=(c[k]||0)+1});
      const k=["gru","szu","asf"].sort((a,b)=>(c[b]||0)-(c[a]||0)).find(k=>c[k])||"unk";res[k]+=seg});
    res.srf=1}catch(e){errs.push("nawierzchnia: "+e.message)}
  ["asf","szu","gru","unk"].forEach(k=>res[k]=+res[k].toFixed(1));
  // 2) las: czy próbka leży w lesie (obszary landuse=forest / natural=wood)
  try{const J2=await overpass('[out:json][timeout:60];'+S.map((p,i)=>'make s i='+i+';out;is_in('+ll(p)+')->.a;area.a[~"^(landuse|natural)$"~"^(forest|wood)$"];out ids;').join(""),OP);
    const marks=(J2.elements||[]).filter(e=>e.type==="s").length;if(marks<S.length)throw new Error("niepełna odpowiedź");
    res.las=+(split(J2).filter(g=>g.some(e=>e.type==="area")).length*seg).toFixed(1)}catch(e){errs.push("las: "+e.message)}
  // 3) po drodze (≤ 200 m): jedzenie, sklepy, woda, serwis
  let pois=[];
  try{const J3=await overpass('[out:json][timeout:60];(nwr(around:200,'+L+')[amenity~"^(cafe|restaurant|fast_food|ice_cream|pub|bar|biergarten|drinking_water)$"];nwr(around:200,'+L+')[shop~"^(convenience|supermarket|bakery|bicycle)$"];);out center tags;',OP);
    (J3.elements||[]).forEach(e=>{const t=e.tags||{},ty=t.amenity&&POI_T[t.amenity]?t.amenity:t.shop&&POI_T[t.shop]?t.shop:null;if(!ty)return;
      const la=e.lat!=null?e.lat:e.center&&e.center.lat,lo=e.lon!=null?e.lon:e.center&&e.center.lon;if(la==null)return;
      let bi=0,bd=1e9;for(let i=0;i<pts.length;i++){const d=dist(pts[i],{lat:la,lon:lo});if(d<bd){bd=d;bi=i}}
      pois.push({n:String(t.name||"").slice(0,50),t:ty,k:+cum[bi].toFixed(1),la:+la.toFixed(5),lo:+lo.toFixed(5)})});
    pois.sort((a,b)=>a.k-b.k);const seen=[];pois=pois.filter(p=>{if(seen.some(q=>q.t===p.t&&q.n===p.n&&dist(q,{lat:p.la,lon:p.lo})<0.15))return false;seen.push({t:p.t,n:p.n,lat:p.la,lon:p.lo});return true}).slice(0,80);
    res.food=pois.filter(p=>POI_T[p.t][2]==="food").length;res.shop=pois.filter(p=>POI_T[p.t][2]==="shop").length;res.water=pois.filter(p=>p.t==="drinking_water").length;res.bike=pois.filter(p=>p.t==="bicycle").length}catch(e){pois=null;errs.push("po drodze: "+e.message)}
  if(!res.srf&&res.las==null&&pois==null){const er=new Error(errs.join(" · "));er.all=true;throw er}
  if(!res.srf){res.unk=+total.toFixed(1);res.asf=res.szu=res.gru=0}
  delete res.srf;return {o:res,p:pois,errs};
}
function osmBoxHtml(x){
  const o=x.osm,T=OSM_CL.reduce((a,c)=>a+(o[c[0]]||0),0)||1,can=isAdmin||x.created_by===uid,P=v=>Math.round(v/T*100)+'%',pois=rbPois[x.id]||[],tot=x.km||T;
  const kmR=k=>rb.rev?Math.max(0,tot-k):k,list=pois.slice().sort((a,b)=>kmR(a.k)-kmR(b.k));
  return '<b>'+uiIcon("road")+' Nawierzchnia i otoczenie</b>'+osmBar(o,T)
   +'<div class="osmleg">'+OSM_CL.filter(c=>o[c[0]]).map(([k,t,col])=>'<span><i style="background:'+col+'"></i>'+t+' <b>'+P(o[k])+'</b> · '+kmTxt(o[k])+' km</span>').join("")+'</div>'
   +(o.las!=null?'<div class="osmrow">'+uiIcon("tree")+' W lesie: <b>'+Math.round(o.las/T*100)+'%</b> · ok. '+kmTxt(o.las)+' km</div>':'')
   +(list.length?'<details class="plds osmpo" id="osmpo"><summary>'+uiIcon("coffee")+' Po drodze <span class="plcnt">'+list.length+'</span><span class="osmsum">'+[o.food?o.food+' jedzenie':'',o.shop?o.shop+' '+plf(o.shop,["sklep","sklepy","sklepów"]):'',o.water?'woda':'',o.bike?'serwis':''].filter(Boolean).join(' · ')+'</span></summary><div class="pllist">'
      +list.map(p=>{const T2=POI_T[p.t]||["pin","",""];const k=kmR(p.k);return '<div class="plit"><span class="plic osmic">'+uiIcon(T2[0])+'</span><span class="plnm">'+esc(p.n||T2[1])+'<small>'+esc(T2[1])+'</small></span><span class="plkm">'+(k<0.3?'start':kmTxt(k)+' km')+'</span></div>'}).join("")
      +'</div><div class="note" style="margin-top:6px">Do 200 m od trasy · rozwinięta lista pokazuje miejsca na mapie.</div></details>'
     :'<div class="osmrow">'+uiIcon("coffee")+' Po drodze: brak kawiarni i sklepów w OpenStreetMap (do 200 m)</div>')
   +'<div class="note" style="margin-top:6px">Dane: OpenStreetMap'+(x.osm_at?', '+esc(new Date(x.osm_at).toLocaleDateString("pl-PL")):'')+' — mogą być niepełne.'+(can?' <button type="button" class="lnk" data-rb="osmre">↻ Przelicz</button>':'')+'</div>';
}
async function rbOsmShow(tok,force){
  const x=(rbList||[]).find(y=>y.id===rb.open),box=$("osmbox4");if(!x||!box||!rbOsmOk||!rbPts)return;
  const put=h=>{if(tok===rbTok&&$("osmbox4")){$("osmbox4").innerHTML=h;$("osmbox4").classList.remove("hide");const d=$("osmpo");if(d)d.addEventListener("toggle",()=>osmMarkers(d.open))}};
  if(x.osm&&!force&&!((x.osm.v||1)<2&&(isAdmin||x.created_by===uid))){put(osmBoxHtml(x));return}
  if(rbOsmBusy[x.id])return;rbOsmBusy[x.id]=true;
  put('<b>'+uiIcon("road")+' Nawierzchnia i otoczenie</b><div class="note">Analizuję trasę w OpenStreetMap — nawierzchnia, las, kawiarnie i sklepy po drodze… (do 2–3 minut, tylko raz dla każdej trasy; możesz w tym czasie przeglądać dalej)</div>');
  try{const r=await rbOsmCompute(x,rbPts);
    const sv=await sb.rpc("route_osm_set",{r:x.id,o:r.o,p:r.p});
    x.osm=r.o;x.osm_at=new Date().toISOString();if(r.p)rbPois[x.id]=r.p;
    if(sv.error)console.warn("route_osm_set",sv.error);
    put(osmBoxHtml(x));
    if(r.errs&&r.errs.length)say("Część danych z OpenStreetMap nie przyszła ("+r.errs.join("; ")+") — „↻ Przelicz” później.");
  }catch(e){put('<b>'+uiIcon("road")+' Nawierzchnia i otoczenie</b><div class="note">Nie udało się pobrać danych z OpenStreetMap'+(e&&e.message?' ('+esc(e.message)+')':'')+'. Serwer bywa przeciążony — spróbuj za chwilę. <button type="button" class="lnk" data-rb="osmre">Spróbuj ponownie ›</button></div>')}
  rbOsmBusy[x.id]=false;
}
function osmMarkers(on){
  if(!rbMap||!window.L)return;if(!rbMap.q)rbMap.q=L.layerGroup().addTo(rbMap.m);rbMap.q.clearLayers();if(!on)return;
  const x=(rbList||[]).find(y=>y.id===rb.open);(rbPois[x&&x.id]||[]).forEach(p=>{const T2=POI_T[p.t]||["","",""];
    L.circleMarker([p.la,p.lo],{radius:6,color:"#fff",weight:1.5,fillColor:T2[2]==="food"?"#ff9f0a":T2[2]==="shop"?"#0a84ff":T2[2]==="water"?"#30b0c7":"#8e8e93",fillOpacity:1}).addTo(rbMap.q).bindTooltip((p.n||T2[1])+" · "+T2[1])});
}
function rbTowns(tok){
  const x=(rbList||[]).find(y=>y.id===rb.open),box=$("placesbox4");if(!x||!rbPts||!box)return;
  const pts=rb.rev?rbPts.slice().reverse():rbPts,head='<b>'+uiIcon("pin")+' Miejscowości na trasie</b>';
  box.innerHTML=head+'<div class="note">Szukam w OpenStreetMap…</div>';box.classList.remove("hide");
  placesAlong(pts,"rb"+x.id+(rb.rev?":r":"")).then(l=>{if(tok!==rbTok||!$("placesbox4"))return;
      if(l.length)renderPlaces("placesbox4",rbMap,l);else{box.innerHTML=head+'<div class="note">Brak miejscowości blisko trasy.</div>';box.classList.remove("hide")}})
    .catch(()=>{if(tok!==rbTok||!$("placesbox4"))return;box.innerHTML=head+'<div class="note">Nie udało się pobrać listy z OpenStreetMap. <button type="button" class="lnk" data-rb="towns">Spróbuj ponownie ›</button></div>';box.classList.remove("hide")});
}
async function pwUpdate(){
  const tok=rbTok,el=$("pw4"),pts0=rbPts;if(!el||!pts0)return;
  const pts=rb.rev?pts0.slice().reverse():pts0,when=pwWhen();
  el.innerHTML='<div class="note">Sprawdzam prognozę…</div>';
  let J;try{J=await getWxJ(pts[0].lat,pts[0].lon)}catch(e){if(tok===rbTok)el.innerHTML='<div class="note">Nie udało się pobrać prognozy (sprawdź internet).</div>';return}
  if(tok!==rbTok)return;
  const H=J.hourly,off=(J.utc_offset_seconds||0)*1000,key=t=>new Date(t.getTime()+off).toISOString().slice(0,13)+":00";
  const i0=H.time.indexOf(key(when));
  if(i0<0){el.innerHTML='<div class="note">Prognoza jest dostępna do 16 dni naprzód.</div>';$("windinfo4").textContent="";return}
  // czas jazdy: najpierw bez wiatru, potem z wiatrem ze środka jazdy
  let an=analyze(pts,H.wind_direction_10m[i0],H.wind_speed_10m[i0],20,true);
  const im=Math.min(H.time.length-1,i0+Math.floor(an.tsec/3600/2));
  an=analyze(pts,H.wind_direction_10m[im],H.wind_speed_10m[im],20,true);
  const anR=analyze(pts.slice().reverse(),H.wind_direction_10m[im],H.wind_speed_10m[im],20,true);
  const end=new Date(when.getTime()+an.tsec*1000),i1=Math.min(H.time.length-1,i0+Math.ceil(an.tsec/3600));
  const rows=[];for(let i=i0;i<=i1;i++)rows.push(i);
  const wide=[];for(let i=Math.max(0,i0-3);i<=Math.min(H.time.length-1,i1+3);i++)wide.push(i);
  const pick=(a,f)=>rows.map(i=>a&&a[i]).filter(v=>v!=null).reduce(f);
  const tmin=pick(H.apparent_temperature||H.temperature_2m,(a,b)=>Math.min(a,b)),tmax=pick(H.temperature_2m,(a,b)=>Math.max(a,b));
  const rain=H.precipitation_probability?pick(H.precipitation_probability,(a,b)=>Math.max(a,b)):0,mm=H.precipitation?pick(H.precipitation,(a,b)=>a+b):0;
  const wind=pick(H.wind_speed_10m,(a,b)=>Math.max(a,b)),gust=H.wind_gusts_10m?pick(H.wind_gusts_10m,(a,b)=>Math.max(a,b)):0;
  const dk=key(when).slice(0,10),di=J.daily&&J.daily.time?J.daily.time.indexOf(dk):-1;
  const sunset=di>=0?J.daily.sunset[di]:null,sunrise=di>=0?J.daily.sunrise[di]:null,endL=new Date(end.getTime()+off).toISOString().slice(0,16),stL=key(when).slice(0,16);
  const dark=(sunset&&endL>sunset)||(sunrise&&stL<sunrise);
  const sunny=rows.some(i=>H.weather_code&&H.weather_code[i]!=null&&H.weather_code[i]<=1);
  // mapa, strzałka, statystyki
  if(rbMap){drawRoute(rbMap,pts,an.segs,false);setArrow("warrow4",H.wind_direction_10m[im],H.wind_speed_10m[im])}
  $("stats4").innerHTML=statsHtml(an);
  $("windinfo4").textContent="Wiatr w połowie jazdy ("+H.time[im].slice(11,16)+"): "+windLabel(H.wind_direction_10m[im])+", "+Math.round(H.wind_speed_10m[im])+" km/h";
  const save=Math.round((an.tsec-anR.tsec)/60);
  const revTip=(an.back&&!anR.back)||save>=Math.max(3,an.tsec/60*0.04)?'<div class="pwrev"><span>↺ <b>Jedź w drugą stronę</b> — '+(an.back&&!anR.back?'wiatr pod koniec będzie w plecy, a nie w twarz':'wiatr pomoże tam, gdzie teraz przeszkadza')+(save>=3?' (szybciej o ok. '+save+' min)':'')+'.</span><button type="button" class="b g small" data-rb="rev">Odwróć</button></div>'
    :rb.rev?'<div class="pwrev"><span>↺ Pokazuję trasę <b>w drugą stronę</b>.</span><button type="button" class="b g small" data-rb="rev">Przywróć</button></div>':'';
  const hh=t=>t?t.slice(11,16):"",dt=d=>pad(d.getHours())+":"+pad(d.getMinutes());
  const warn=[gust>=50?['windy','Porywy do '+Math.round(gust)+' km/h — uważaj na otwartych odcinkach i przy ciężarówkach.']:null,
    rain>=60||mm>=1?['rain','Spory deszcz w czasie jazdy (do '+Math.round(rain)+'%'+(mm>=0.1?', ok. '+fmt1(mm)+' mm':'')+').']:null,
    tmin<=0?['snow','Odczuwalnie '+Math.round(tmin)+'°C — możliwa gołoledź, zwłaszcza na mostach i w cieniu.']:null,
    tmax>=30?['flame','Upał '+Math.round(tmax)+'°C — pij co 15–20 min, unikaj południa.']:null,
    dark?['moon',sunset&&endL>sunset?'Zachód słońca o '+hh(sunset)+' — wrócisz po zmroku.':'Wschód słońca o '+hh(sunrise)+' — ruszysz po ciemku.']:null].filter(Boolean);
  el.innerHTML='<div class="pwsum"><b>'+esc(dt(when))+'–'+esc(dt(end))+'</b> · ok. '+Math.floor(an.tsec/3600)+' h '+pad(Math.round(an.tsec/60)%60)+' min'
     +(sunset?' · 🌇 zachód '+esc(hh(sunset)):'')+'</div>'
   +'<div class="pwtab" id="pwtab">'+wide.map(i=>{const c=H.weather_code?H.weather_code[i]:null,r=i>=i0&&i<=i1;
      return '<div class="pwh'+(r?' ride':'')+(i===i0?' st':'')+(i===i1?' en':'')+'"'+(i===i0?' id="pwh0"':'')+'><span class="pwt">'+esc(H.time[i].slice(11,16))+'</span><span class="pwi" title="'+esc(WMO_T(c))+'">'+WMO(c)+'</span><b>'+Math.round(H.temperature_2m[i])+'°</b>'
       +'<span class="pww"><i style="transform:rotate('+((H.wind_direction_10m[i]+180)%360)+'deg)">↑</i>'+Math.round(H.wind_speed_10m[i])+'</span>'
       +'<span class="pwr'+(H.precipitation_probability&&H.precipitation_probability[i]>=40?' hi':'')+'">'+(H.precipitation_probability?Math.round(H.precipitation_probability[i])+'%':'')+'</span></div>'}).join("")+'</div>'
   +'<div class="note pwleg"><span class="pwlr"></span> w czasie jazdy · przesuń w bok: 3 h przed i po · wiatr km/h (strzałka = dokąd wieje) · szansa deszczu</div>'
   +'<div class="tip">'+esc(an.tip.replace(" Rozważ „Odwróć kierunek”, żeby wiatr pomagał na końcu.",""))+'</div>'+revTip
   +(warn.length?'<div class="pwwarn">'+warn.map(([k,t])=>'<div>'+uiIcon(k)+' '+esc(t)+'</div>').join("")+'</div>':'')
   +pwPackHtml(pwBring({tmin,rain,mm,wind,dark,sunny,when,hours:an.tsec/3600}),when)
   +'<div class="note" style="margin-top:4px">W czasie jazdy odczuwalnie '+Math.round(tmin)+'°C'+(Math.round(tmax)!==Math.round(tmin)?' – '+Math.round(tmax)+'°C':'')+' · wiatr do '+Math.round(wind)+' km/h'+(gust?' (porywy '+Math.round(gust)+')':'')+'</div>';
  const tb=$("pwtab"),h0=$("pwh0");if(tb&&h0)tb.scrollLeft=Math.max(0,h0.offsetLeft-tb.offsetLeft-60);
}
/* ---------- ⭐ oceny tras (etap 2, KROK 48) ---------- */
const RT_TAGS=[["forest","🌳 dużo lasu"],["view","🌅 widoki"],["coffee","☕ dobra kawa"],["shade","🌲 cień"],["mud","💧 błoto"],["sand","🏖 piach"],["potholes","🛣 dziurawy asfalt"],["dogs","🐕 psy"],["detour","🚧 objazd"]];
const TRAF=["","mało","średnio","dużo"],rbReviews={};
const rbMetTxt=(k,S)=>k==="scenic"?'🌅 malownicza '+fmt1(S.scenic)+'/5':k==="hard"||k==="easy"?'🪨 trudność '+fmt1(S.difficulty)+'/5':k==="quiet"?'🚗 ruch aut: '+TRAF[Math.round(S.traffic)]:'';
async function rbLoadReviews(id){
  const r=await sb.from("route_reviews").select("user_id,rating,scenic,difficulty,traffic,tags,comment,updated_at").eq("route_id",id).order("updated_at",{ascending:false}).limit(100);
  rbReviews[id]=r.error?[]:(r.data||[]);
}
function rbRevHtml(x){
  const S=rbStats[x.id]||{},L=rbReviews[x.id],mine=L&&L.find(r=>r.user_id===uid);
  const tg=Object.entries(S.tags||{}).sort((a,b)=>b[1]-a[1]).map(([k,c])=>{const t=RT_TAGS.find(y=>y[0]===k);return t?'<span class="rpt">'+esc(t[1])+(c>1?' ×'+c:'')+'</span>':''}).join("");
  const stars=n=>'<span class="rbstar">'+'★'.repeat(n)+'</span><span class="rbstar0">'+'★'.repeat(5-n)+'</span>';
  return '<div class="bsgrp" style="margin-top:14px">Oceny jeżdżących'+(S.n?' · '+S.n:'')+'</div>'
   +(S.n?'<div class="rvgrid"><div><b class="rbstar">★ '+fmt1(S.rating||0)+'</b><span>ogólna</span></div><div><b>'+(S.scenic!=null?fmt1(S.scenic):'—')+'</b><span>🌅 malownicza</span></div><div><b>'+(S.difficulty!=null?fmt1(S.difficulty)+'/5':'—')+'</b><span>🪨 trudność</span></div><div><b>'+(S.traffic!=null?TRAF[Math.round(S.traffic)]:'—')+'</b><span>🚗 ruch aut</span></div></div>'
       +(tg?'<div class="fchips" style="margin-top:8px">'+tg+'</div>':'')
     :'<div class="note">Jeszcze nikt nie ocenił tej trasy — bądź pierwszy.</div>')
   +(L?L.filter(r=>r.comment).slice(0,20).map(r=>'<div class="rvcm"><div class="rvch">'+nk(r.user_id)+(r.rating?' '+stars(r.rating):'')+'<span class="note">'+esc(new Date(r.updated_at).toLocaleDateString("pl-PL",{day:"numeric",month:"numeric"}))+'</span>'
       +(isAdmin&&r.user_id!==uid?'<button type="button" class="lnk rvx" data-rb="rvmod" data-u="'+esc(r.user_id)+'">usuń</button>':'')+'</div><div class="rvct">'+esc(r.comment)+'</div></div>').join(""):'<div class="note">Wczytuję komentarze…</div>')
   +'<button type="button" class="b g" style="margin-top:10px;width:100%" data-rb="rate">'+(mine?'✏️ Zmień swoją ocenę':'✍️ Oceń trasę')+'</button>';
}
const rvEmpty=()=>({rating:0,scenic:null,difficulty:null,traffic:null,tags:new Set(),comment:""});
const rvFrom=r=>r?{rating:r.rating||0,scenic:r.scenic,difficulty:r.difficulty,traffic:r.traffic,tags:new Set(r.tags||[]),comment:r.comment||""}:rvEmpty();
function rvRow(route,v,want){const c=String(v.comment||"").trim(),row={route_id:route,rating:v.rating||null,scenic:v.scenic,difficulty:v.difficulty,traffic:v.traffic,tags:[...v.tags],comment:c||null};if(want)row.want_id=want;return row}
const rvHas=r=>!!(r.rating||r.scenic||r.difficulty||r.traffic||r.comment||(r.tags&&r.tags.length));
async function rvSave(row){const r=await sb.from("route_reviews").upsert(row,{onConflict:"route_id,user_id"});if(r.error)throw r.error;rbAt=0;delete rbReviews[row.route_id]}
function rvClick(v,b){const k=b.dataset.rv,n=b.dataset.v;if(k==="tag"){v.tags.has(n)?v.tags.delete(n):v.tags.add(n)}else{const x=+n;v[k]=v[k]===x?(k==="rating"?0:null):x}}
// pola oceny trasy — wspólne dla „Oceń trasę” i „🚴 Jak poszło?”
function rvFieldsHtml(v,withStars){
  const seg=(k,lbl,vals)=>'<div class="rvrow"><span>'+lbl+'</span><div class="rvseg">'+vals.map(([n,t])=>'<button type="button" data-rv="'+k+'" data-v="'+n+'" class="'+(v[k]===n?'on':'')+'">'+t+'</button>').join("")+'</div></div>';
  const f=[1,2,3,4,5].map(n=>[n,String(n)]);
  return (withStars?'<div class="rstars rvstars">'+[1,2,3,4,5].map(n=>'<button type="button" class="rst'+(n<=v.rating?' on':'')+'" data-rv="rating" data-v="'+n+'" aria-label="'+n+' na 5">★</button>').join("")+'</div>':'')
   +seg("scenic","🌅 Malownicza",f)+seg("difficulty","🪨 Trudność",f)+seg("traffic","🚗 Ruch aut",[[1,"mało"],[2,"średnio"],[3,"dużo"]])
   +'<div class="bsgrp">Co było na trasie?</div><div class="fchips">'+RT_TAGS.map(([k,t])=>'<button type="button" class="fch'+(v.tags.has(k)?' on':'')+'" data-rv="tag" data-v="'+k+'">'+t+'</button>').join("")+'</div>'
   +'<div class="bsgrp">Komentarz <span class="note">(widzą wszyscy)</span></div><textarea id="rvcom" maxlength="300" rows="2" placeholder="np. Najpiękniej jesienią, kawa w km 18 obowiązkowo">'+esc(v.comment||"")+'</textarea>';
}
function renderRbRate(){
  const x=(rbList||[]).find(y=>y.id===rb.open);if(!x){rb.rate=false;renderRb();return}
  rbCloseMap();const p=$("rbsheet"),mine=(rbReviews[x.id]||[]).find(r=>r.user_id===uid);
  p.innerHTML='<div class="bsbox rbbox" role="dialog" aria-modal="true" aria-label="Oceń trasę"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-rb="back">‹ Trasa</button><b>⭐ Oceń trasę</b><button type="button" class="lnk" data-rb="rvsave" style="min-width:64px;text-align:right">Zapisz</button></div><div class="bslist">'
   +'<div class="rvtitle">'+esc(x.name)+'</div><div class="note" style="text-align:center">'+kmTxt(x.km)+' km'+(x.start_city?' · '+esc(x.start_city):'')+'</div>'
   +rvFieldsHtml(rb.rv,true)
   +'<button type="button" class="b big" style="width:100%;margin-top:14px" data-rb="rvsave">Zapisz ocenę</button>'
   +(mine?'<button type="button" class="lnk rbdel" data-rb="rvdel">Usuń moją ocenę</button>':'')
   +'<div class="note" style="margin-top:10px;text-align:center">Ocena trafia do rankingów w Bazie tras. Jedna ocena na osobę — możesz ją zmienić.</div></div></div>';
  p.classList.remove("hide");
}
const wfDemoRoute=()=>!!(wf.rbId&&rbList&&(rbList.find(r=>r.id===wf.rbId)||{}).demo);   // 🧪 v275
function rbApplyToForm(x,pts){
  wf.route=pts;wf.routeName=x.name;wf.rbId=x.id;wf.routeTouched=true;$("wrfile").value="";
  if(!wf.bike&&x.bike&&bikeOk){wf.bike=x.bike;wbikeRender()}
  wfRouteSync();try{wfUpdate()}catch(e){}
}
// dodanie trasy do bazy; ta sama trasa (start i meta ≤ 300 m, długość ±3%, ślad średnio ≤ 250 m) — łączy z istniejącą
async function rbAddRoute(pts,name,o){
  await rbLoad();
  const km=routeKm(pts),a=pts[0],z=pts[pts.length-1];
  for(const x of (rbList||[])){
    if(x.start_lat==null||Math.abs(x.km-km)>Math.max(1,km*0.03))continue;
    if(dist(a,{lat:+x.start_lat,lon:+x.start_lon})>0.3)continue;
    let q;try{q=await rbRoute(x.id)}catch(e){continue}if(!q||dist(z,q[q.length-1])>0.3)continue;
    const S=thin(pts,30);let sum=0;for(const p of S){let m=1e9;for(const r of q){const d=dist(p,r);if(d<m)m=d}sum+=m}
    if(sum/S.length<=0.25){say("📚 Ta trasa już jest w bazie: „"+x.name+"” — połączono.");return {id:x.id,isNew:false}}
  }
  let city=o&&o.city||null;
  if(!city){try{const g=await Promise.race([revGeo(a.lat,a.lon),new Promise(r=>setTimeout(()=>r(null),4000))]);city=g&&g.city||null}catch(e){}}
  const an=analyze(pts,0,0,20,false);
  const row={name:String(name).trim().slice(0,60),route:routeJson(pts),preview:rbPreview(pts),km:+km.toFixed(1),up_m:Math.round(an.gain||0),
    start_lat:+a.lat.toFixed(5),start_lon:+a.lon.toFixed(5),start_city:city?String(city).slice(0,60):null,bike:o&&o.bike&&BIKES[o.bike]?o.bike:null};
  const r=await sb.from("route_base").insert(row).select("id").single();
  if(r.error||!r.data){say("Nie udało się dodać trasy do bazy: "+(r.error&&r.error.message||"błąd"));return null}
  rbAt=0;return {id:r.data.id,isNew:true};
}
async function rbAddFromWant(w){
  const def="Trasa "+kmTxt(w.route_km)+" km"+(w.place_city?" · "+w.place_city:"");
  const n=prompt("Nazwa trasy w bazie (2–60 znaków):",def);if(n==null)return;
  if(n.trim().length<2){say("Nazwa: co najmniej 2 znaki.");return}
  let pts;try{pts=await getWantRoute(w.id)}catch(e){pts=null}if(!pts){say("Nie udało się wczytać trasy.");return}
  const r=await rbAddRoute(pts,n,{bike:w.bike||null,city:w.place_city||null});if(!r)return;
  if(w.user_id===uid){const u=await sb.from("wants").update({route_base_id:r.id}).eq("id",w.id).select("id");if(!u.error)w.route_base_id=r.id}
  if(r.isNew)sb.from("route_base").update({src_want:w.id}).eq("id",r.id).then(()=>{},()=>{});
  if(r.isNew)say("📚 Dodano do bazy tras: "+n.trim());
  renderWants();
}
const rbBtnHtml=w=>!rbOk||!hasRoute(w)?'':w.route_base_id?'<button type="button" class="b g small" data-rt="rbopen" data-id="'+esc(w.id)+'">📚 W bazie tras</button>'
  :(!isTest(w)&&(w.user_id===uid||isAdmin))?'<button type="button" class="b g small" data-rt="rbadd" data-id="'+esc(w.id)+'">📚 Do bazy tras</button>':'';
// formularz: przełącznik „Dodaj do bazy tras” (domyślnie: włączony przy prawdziwym zaproszeniu dla wszystkich)
const rbAddOn=()=>wf.rbAdd!=null?wf.rbAdd:(!wf.test&&wf.vis==="all");
function wfRbSync(){
  const bb=$("wrbase"),ad=$("wrbadd");if(!bb||!ad)return;
  bb.classList.toggle("hide",!rbOk);
  const vis=rbOk&&!!wf.route&&!wf.rbId;ad.classList.toggle("hide",!vis);if(!vis){ad.innerHTML="";return}
  if(!ad.querySelector("#wrbsw"))ad.innerHTML='<div class="wrbrow"><span>📚 Dodaj trasę do bazy tras<small>Inni wybiorą ją przy swoich zaproszeniach. Zdecyduj sam(a) — także przy prywatnych.</small></span><button type="button" class="ios-sw" role="switch" id="wrbsw" aria-label="Dodaj trasę do bazy tras"></button></div><input id="wrbname" maxlength="60" placeholder="Nazwa trasy, np. Pętla przez Puszczę Białą">';
  const on=rbAddOn(),sw=$("wrbsw"),nm=$("wrbname");sw.classList.toggle("on",on);sw.setAttribute("aria-checked",String(on));nm.classList.toggle("hide",!on);
  if(document.activeElement!==nm)nm.value=wf.rbName||wf.routeName||"";
}
$("wrbadd").addEventListener("click",e=>{if(e.target.closest("#wrbsw")){wf.rbAdd=!rbAddOn();wfRbSync()}});
$("wrbadd").addEventListener("input",e=>{if(e.target.id==="wrbname")wf.rbName=e.target.value});
$("wrbasebtn").addEventListener("click",()=>openRb("pick"));
document.addEventListener("click",async e=>{
  if(e.target.closest("[data-rbopen]")){gearOpen=false;renderGear();openRb("browse");return}
  const h=e.target.closest("[data-rbhero]");
  if(h){const id=h.dataset.rbhero;gearOpen=false;renderGear();await rbLoad();rb.mode="browse";rb.open=id;renderRb();return}
  if(e.target.closest("[data-rbadd]")&&isAdmin){gearOpen=false;renderGear();rb.mode="browse";rb.add=null;rbAddStart();return}
  if(e.target.closest("[data-rbadd]")){gearOpen=false;renderGear();show(0);openWantForm(null);
    if(wRouteOk){try{$("wrfile").click()}catch(err){}say("📚 Wybierz plik GPX — przełącznik „Dodaj do bazy tras” będzie pod spodem.")}}
});
$("rbsheet").addEventListener("input",e=>{if(e.target.id==="rbaddname"&&rb.add)rb.add.name=e.target.value;if(e.target.id==="rbq"){rb.q=e.target.value;const l=$("rblist");if(l)l.innerHTML=rbListHtml()}
  if(e.target.id==="rvcom"&&rb.rv)rb.rv.comment=e.target.value});
$("rbsheet").addEventListener("click",async e=>{
  const p=$("rbsheet");if(e.target===p){closeRb();return}
  const rvb=e.target.closest("[data-rv]");if(rvb&&rb.rv){rvClick(rb.rv,rvb);const sc=p.querySelector(".bslist"),t=sc?sc.scrollTop:0;renderRbRate();const s2=p.querySelector(".bslist");if(s2)s2.scrollTop=t;return}
  const o=e.target.closest("[data-rbo]");if(o){rb.open=o.dataset.rbo;rb.rev=false;rb.pw=rb.mode==="pick"?pwFromForm():null;renderRb();return}
  const pk=e.target.closest("[data-pwit]");if(pk){pwPackToggle(pk);return}
  const pd=e.target.closest("[data-rbpd]"),ph=e.target.closest("[data-rbph]");
  if(pd||ph){const v=rb.pw||(rb.pw=pwDefault());v.ch=1;if(ph)v.m=0;if(pd){v.day=+pd.dataset.rbpd;if(v.day===0&&v.h<=new Date().getHours()-1)v.h=Math.min(23,new Date().getHours()+1)}else{v.h=+ph.dataset.rbph;if(ph.dataset.rbpn)v.day=Math.min(6,v.day+1)}
    const hs=$("pwhrs"),sl=hs?hs.scrollLeft:0;$("pwsel").innerHTML=pwSelHtml();const ib=$("rbinvbtn");if(ib)ib.innerHTML=rbInvLbl();const h2=$("pwhrs");if(h2){h2.scrollLeft=sl;if(pd||(ph&&ph.dataset.rbpn))pwHrsCenter()}pwUpdate();return}
  const so=e.target.closest("[data-rbs]");if(so){rb.sort=so.dataset.rbs;renderRb();return}
  const bk=e.target.closest("[data-rbb]");if(bk){rb.bike=bk.dataset.rbb;renderRb();return}
  const ba=e.target.closest("[data-rba]");if(ba){rb.all=ba.dataset.rba==="all";renderRb();return}   // 📍 v270: trasy z okolicy / wszystkie
  const ab=e.target.closest("[data-rbab]");if(ab&&rb.add){rb.add.bike=ab.dataset.rbab;renderRbAdd();return}
  const b=e.target.closest("[data-rb]");if(!b)return;const k=b.dataset.rb;
  if(k==="add"){rbAddStart();return}
  if(k==="addinv"){closeRb();show(0);openWantForm(null);if(wRouteOk){try{$("wrfile").click()}catch(err){}say("📚 Wybierz plik GPX, potem włącz „Dodaj do bazy tras” pod trasą.")}return}
  if(k==="addx"){rb.add=null;renderRb();return}
  if(k==="addsave"&&rb.add&&!rb.add.busy){const a=rb.add,n=($("rbaddname")?$("rbaddname").value:a.name).trim();a.name=n;
    if(n.length<2){say("Nazwa trasy: co najmniej 2 znaki.");return}
    a.busy=true;renderRbAdd();const r=await rbAddRoute(a.pts,n,{bike:a.bike||null});a.busy=false;
    if(!r){renderRbAdd();return}
    rb.add=null;await rbLoad(true);rb.open=r.id;renderRb();if(r.isNew)say("📚 Dodano trasę do bazy: "+n);return}
  if(k==="close"){closeRb();return}
  if(k==="back"){if(rb.rate){rb.rate=false}else rb.open=null;renderRb();return}
  if(k==="rate"){const mine=(rbReviews[rb.open]||[]).find(r=>r.user_id===uid);rb.rv=rvFrom(mine);rb.rate=true;renderRb();return}
  if(k==="rvsave"){const row=rvRow(rb.open,rb.rv);if(!rvHas(row)){say("Zaznacz coś albo napisz komentarz.");return}
    try{await rvSave(row);await Promise.all([rbLoad(true),rbLoadReviews(rb.open)]);rb.rate=false;renderRb();say("⭐ Dzięki — ocena zapisana.")}catch(err){say("Nie udało się zapisać oceny: "+(err&&err.message||"błąd"))}return}
  if(k==="rvdel"){if(!await askOk("Usunąć Twoją ocenę tej trasy?","Usuń",1))return;
    const r=await sb.from("route_reviews").delete().eq("route_id",rb.open).eq("user_id",uid);if(r.error){say("Nie udało się usunąć.");return}
    await Promise.all([rbLoad(true),rbLoadReviews(rb.open)]);rb.rate=false;renderRb();say("Usunięto Twoją ocenę.");return}
  if(k==="rvmod"){const u=b.dataset.u;if(!isAdmin||!await askOk("Usunąć tę ocenę z komentarzem (moderacja)?","Usuń",1))return;
    const r=await sb.from("route_reviews").delete().eq("route_id",rb.open).eq("user_id",u).select("user_id");if(r.error||!r.data||!r.data.length){say("Nie udało się usunąć.");return}
    await Promise.all([rbLoad(true),rbLoadReviews(rb.open)]);renderRb();say("Usunięto ocenę.");return}
  const x=(rbList||[]).find(y=>y.id===rb.open);if(!x)return;
  if(k==="pwclr"){if(pwPackCur){const o=pwPackGet();delete o[pwPackCur.key];pwPackSet(o);document.querySelectorAll(".pwit.on").forEach(x=>{x.classList.remove("on");x.setAttribute("aria-pressed","false")});pwPackRefresh()}return}
  if(k==="towns"){rbTowns(rbTok);return}
  if(k==="osmre"){rbOsmShow(rbTok,true);return}
  if(k==="rev"){rb.rev=!rb.rev;if(rbMap&&rbPts)drawRoute(rbMap,rb.rev?rbPts.slice().reverse():rbPts,null,false);rbTowns(rbTok);rbOsmShow(rbTok);pwUpdate();return}
  if(k==="pick"&&rb.mode==="radar"){let pts;try{pts=await rbRoute(x.id)}catch(err){pts=null}if(!pts){say("Nie udało się wczytać trasy.");return}
    if(rb.rev)pts=pts.slice().reverse();closeRb();arRouteSet(pts,x.name);return}
  if((k==="pick"||k==="invite")&&x.demo&&!testOk){say("🧪 Trasa DEMO jest tylko do testowych zaproszeń — a ich nie masz włączonych.");return}
  if(k==="pick"||k==="invite"){let pts;try{pts=await rbRoute(x.id)}catch(err){pts=null}if(!pts){say("Nie udało się wczytać trasy.");return}
    if(rb.rev)pts=pts.slice().reverse();
    const at=k==="invite"||(rb.pw&&rb.pw.ch)?pwWhen():null;closeRb();if(k==="invite"){show(0);openWantForm(null,{at})}rbApplyToForm(x,pts);
    if(x.demo){wf.test=true;wfTestSync();wfUpdate()}   // 🧪 v275: trasa DEMO → zawsze zaproszenie testowe
    if(k==="pick"&&at&&at.getTime()>Date.now())wfApplyAt(at);
    say("📚 Trasa z bazy: "+x.name+(at&&at.getTime()>Date.now()?" · "+(dayDiff(at)===0?"dziś":dayDiff(at)===1?"jutro":at.toLocaleDateString("pl-PL",{weekday:"long"}))+" "+hhmm(at):""));return}
  if(k==="gpx"&&x.demo){say("🧪 Trasa DEMO nie ma pliku GPX.");return}
  if(k==="gpx"){let pts;try{pts=await rbRoute(x.id)}catch(err){pts=null}if(!pts){say("Nie udało się wczytać trasy.");return}
    const nm=slug(x.name)+".gpx";say(saveFile(makeGpx(pts,x.name),nm,"application/gpx+xml")?"Pobrano: "+nm:"Nie udało się pobrać pliku.");return}
  if(k==="rename"){const n=prompt("Nazwa trasy (2–60 znaków):",x.name);if(n==null)return;const t=n.trim();if(t.length<2||t.length>60){say("Nazwa: od 2 do 60 znaków.");return}
    const r=await sb.from("route_base").update({name:t}).eq("id",x.id).select("id");if(r.error||!r.data||!r.data.length){say("Nie udało się zmienić nazwy.");return}
    x.name=t;renderRb();say("Zmieniono nazwę.");return}
  if(k==="hide"){const r=await sb.from("route_base").update({hidden:!x.hidden}).eq("id",x.id).select("id");if(r.error||!r.data||!r.data.length){say("Nie udało się.");return}
    x.hidden=!x.hidden;renderRb();say(x.hidden?"🙈 Trasa ukryta — inni jej nie widzą.":"👁 Trasa znowu widoczna.");return}
  if(k==="del"){if(!await askOk("Usunąć trasę „"+x.name+"” z bazy tras? Zaproszenia z tą trasą ją zachowają.","Usuń",1))return;
    const r=await sb.from("route_base").delete().eq("id",x.id).select("id");if(r.error||!r.data||!r.data.length){say("Nie udało się usunąć.");return}
    rbList=rbList.filter(y=>y.id!==x.id);rb.open=null;renderRb();say("Usunięto z bazy tras.");return}
});
renderRbRate=shWrap(renderRbRate,"rbsheet");   // 📱 bez skoku na górę przy ocenie trasy
