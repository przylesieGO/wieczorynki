/* ---------- START: chętni ---------- */
/* 🌡 pogoda na karcie zaproszenia (Open-Meteo, Warszawa albo start trasy; godzina startu / początek zakresu) */
const wxTxt={};
function wxWhen(w){return new Date(isOpen(w)?w.range_from:w.starts_at)}
function wxHtml(w){
  const t=wxWhen(w).getTime();if(t<Date.now()-36e5||t>Date.now()+15.5*864e5)return "";
  const k=w.id+"|"+t;
  return '<div class="wwx" data-wxk="'+esc(k)+'">'+(wxTxt[k]||'🌡 …')+'</div>';
}
function fillWx(){
  document.querySelectorAll(".wwx[data-wxk]").forEach(el=>{
    const k=el.dataset.wxk;if(wxTxt[k]){el.innerHTML=wxTxt[k];return}
    if(el.dataset.busy)return;el.dataset.busy="1";
    const [id,t]=k.split("|"),w=wants.find(x=>x.id===id);
    getWind(WX_LAT,WX_LON,new Date(+t)).then(x=>{
      wxTxt[k]=(x.temp!=null?'🌡 '+Math.round(x.temp)+'°C · ':'')+'🌬 '+Math.round(x.speed)+' km/h z '+NAMES[Math.round(x.dir/45)%8]+(x.rain!=null?' · 🌧 '+Math.round(x.rain)+'%':'')
        +(w&&isOpen(w)?' <span class="note">(o '+hhmm(new Date(+t))+')</span>':'');
      document.querySelectorAll('.wwx[data-wxk="'+k+'"]').forEach(e=>{e.innerHTML=wxTxt[k]});
    }).catch(()=>{document.querySelectorAll('.wwx[data-wxk="'+k+'"]').forEach(e=>e.remove())});
  });
}
function routeBoxHtml(w){
  if(!hasRoute(w))return "";
  return '<div class="wroute"><div>🗺️ <b>Proponowana trasa</b> · 📏 '+kmTxt(w.route_km)+' km · ⏱ ≈ '+esc(durTxt(w.route_km/wPaceKmh(w.pace)*60))+'</div>'
   +'<div class="wrb"><button type="button" class="b g small" data-rt="gpx" data-id="'+esc(w.id)+'">⬇ Pobierz GPX</button><button type="button" class="b g small" data-rt="show" data-id="'+esc(w.id)+'">🗺️ Szczegóły</button>'+rbBtnHtml(w)+'</div></div>';
}
/* okienko „Szczegóły trasy”: mapa z wiatrem, statystyki, miejscowości */
let rsMap=null,rsTok=0;
function closeRouteSheet(){const p=$("routesheet");if(rsMap){try{rsMap.m.remove()}catch(e){}rsMap=null}p.classList.add("hide");p.innerHTML="";rsTok++}
async function openRouteSheet(w){
  const tok=++rsTok,p=$("routesheet"),d=new Date(w.starts_at);
  p.innerHTML='<div class="sheetbox rsbox" role="dialog" aria-modal="true"><button class="sclose" data-rk="close" aria-label="Zamknij">✕</button>'
   +'<div class="ph" style="margin-top:0">🗺️ Proponowana trasa</div>'
   +'<div class="pmeta" style="margin-top:4px">'+nk(w.user_id)+' · '+esc(relDay(d)+" "+wTime(w))+(w.note?' · 💬 '+esc(w.note):'')+'</div>'
   +'<div class="mapwrap"><div class="map rsmap" id="map3"></div><div class="warrow hide" id="warrow3"></div></div>'
   +'<div class="legend"><span><i class="dot" style="background:#d64545"></i>pod wiatr</span><span><i class="dot" style="background:#e0b83a"></i>bocznie</span><span><i class="dot" style="background:#2a9d5c"></i>z wiatrem</span></div>'
   +'<div class="stats" id="stats3"></div><div class="note" id="windinfo3" style="margin-top:8px">Ładuję trasę…</div><div class="tip hide" id="tip3"></div><div class="routeinfo hide" id="placesbox3"></div>'
   +'<div class="pbtns" style="margin-top:14px"><button type="button" class="b" data-rt="gpx" data-id="'+esc(w.id)+'">⬇ Pobierz GPX</button><button type="button" class="b w" data-rk="close">Zamknij</button></div>'
   +'<div class="ptg">Czas przy tempie ok. '+String(Math.round(wPaceKmh(w.pace)*10)/10).replace(".",",")+' km/h, z uwzględnieniem wiatru. Mapa © OpenStreetMap · pogoda: Open-Meteo.</div></div>';
  p.classList.remove("hide");
  let pts;
  try{pts=await getWantRoute(w.id)}catch(e){if(tok===rsTok)$("windinfo3").textContent="Nie udało się pobrać trasy.";return}
  if(tok!==rsTok)return;
  if(!pts){$("windinfo3").textContent="To zaproszenie nie ma już trasy.";return}
  let an=analyze(pts,0,0,wPaceKmh(w.pace),false);$("stats3").innerHTML=statsHtml(an);
  await needL();if(tok!==rsTok)return;
  rsMap=makeMap("map3");
  if(rsMap){setTimeout(()=>{if(rsMap){rsMap.m.invalidateSize();drawRoute(rsMap,pts,null,true)}},60)}
  else $("map3").outerHTML='<div class="note">Nie udało się załadować mapy (sprawdź internet).</div>';
  placesAlong(pts,"w"+w.id+":"+w.route_km).then(l=>{if(tok===rsTok)renderPlaces("placesbox3",rsMap,l)}).catch(()=>{});
  $("windinfo3").textContent="Sprawdzam prognozę wiatru…";
  try{
    const x=await getWind(pts[0].lat,pts[0].lon,wxWhen(w));if(tok!==rsTok)return;
    an=analyze(pts,x.dir,x.speed,wPaceKmh(w.pace),false);$("stats3").innerHTML=statsHtml(an);
    if(rsMap){drawRoute(rsMap,pts,an.segs,false);setArrow("warrow3",x.dir,x.speed)}
    $("tip3").textContent=an.tip;$("tip3").classList.remove("hide");
    $("windinfo3").textContent="Wiatr o "+x.time+": "+windLabel(x.dir)+", "+Math.round(x.speed)+" km/h, porywy do "+Math.round(x.gust)+" km/h"+(x.temp!=null?" · "+Math.round(x.temp)+"°C":"")+(x.rain!=null?" · deszcz "+Math.round(x.rain)+"%":"")+" (Open-Meteo).";
  }catch(e){if(tok===rsTok)$("windinfo3").textContent=e.code==="range"?e.message:"Nie udało się pobrać prognozy wiatru."}
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-rt]");
  if(b){
    e.stopPropagation();
    const w=wants.find(x=>x.id===b.dataset.id);if(!w)return;
    if(b.dataset.rt==="show"){openRouteSheet(w);return}
    if(b.dataset.rt==="rbopen"){await rbLoad(true);rb.mode="browse";rb.open=w.route_base_id;renderRb();return}
    if(b.dataset.rt==="rbadd"){rbAddFromWant(w);return}
    try{const pts=await getWantRoute(w.id);if(!pts){say("To zaproszenie nie ma trasy.");return}
      const nm="trasa-"+slug(nickOf(w.user_id))+"-"+localIso(new Date(w.starts_at)).slice(0,10)+".gpx";
      say(saveFile(makeGpx(pts,"Trasa — "+nickOf(w.user_id)+", "+wfLabel(new Date(w.starts_at))),nm,"application/gpx+xml")?"Pobrano: "+nm:"Nie udało się pobrać pliku.")}
    catch(err){say("Nie udało się pobrać trasy.")}
    return;
  }
  const p=$("routesheet");if(p&&!p.classList.contains("hide")&&(e.target===p||e.target.closest("[data-rk='close']")))closeRouteSheet();
},true);




