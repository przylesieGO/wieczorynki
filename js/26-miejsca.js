/* ---------- 📍 „Najbliżej Ciebie” (v360) — stacja benzynowa, sklep spożywczy, szpital/pogotowie, wiata leśna, wypoczynek nad wodą ----------
   Dane: OpenStreetMap (Overpass, ODbL) wokół środka radaru; wynik zapamiętany na 12 h (localStorage „arPoi”). Najpierw promień 8 km, brakujące — do 30 km.
   Kod wykonywany przy wczytaniu nie woła funkcji z wyższych plików; areaNearHtml (js/08) woła poiTilesHtml dopiero przy rysowaniu. */
const POI_K=[["fuel","Stacja benzynowa","car"],["shop","Sklep spożywczy","shop"],["med","Szpital / pogotowie","heart"],["hut","Wiata leśna","umbrella"],["rest","Wypoczynek nad wodą","swim"]];
let poiMem={};
const poiKey=a=>a.lat.toFixed(2)+"|"+a.lon.toFixed(2);
const poiLoad=()=>{try{return JSON.parse(localStorage.getItem("arPoi")||"{}")}catch(e){return {}}};
const poiSave=(k,v)=>{try{const o=poiLoad(),n=Date.now();Object.keys(o).forEach(x=>{if(n-o[x].t>432e5)delete o[x]});o[k]=v;localStorage.setItem("arPoi",JSON.stringify(o))}catch(e){}};
function poiKind(t){
  if(t.amenity==="fuel")return "fuel";
  if(/^(supermarket|convenience|grocery|greengrocer|general)$/.test(t.shop||""))return "shop";
  if(t.amenity==="hospital"||t.emergency==="ambulance_station")return "med";
  if(t.tourism==="wilderness_hut")return "hut";
  if(t.amenity==="shelter")return "hut?";   // tylko gdy przy lesie (siatka terenu js/25) — odsiewa wiaty przystankowe
  if(/^(swimming_area|bathing_place|beach_resort)$/.test(t.leisure||"")||t.natural==="beach")return "rest";
  if(/^(picnic_site|camp_site)$/.test(t.tourism||""))return "rest?";   // tylko gdy blisko wody (siatka terenu js/25)
  return "";
}
const POI_Q={fuel:['nwr["amenity"="fuel"]'],shop:['nwr["shop"~"^(supermarket|convenience|grocery|greengrocer|general)$"]'],med:['nwr["amenity"="hospital"]','nwr["emergency"="ambulance_station"]'],
  hut:['nwr["amenity"="shelter"]["shelter_type"~"^(basic_hut|lean_to|weather_shelter|picnic_shelter|rock_shelter)$"]','nwr["amenity"="shelter"][!"shelter_type"][!"bus"][!"public_transport"]','nwr["tourism"="wilderness_hut"]'],
  rest:['nwr["leisure"~"^(swimming_area|bathing_place|beach_resort)$"]','nwr["natural"="beach"]','nwr["tourism"~"^(picnic_site|camp_site)$"]']};
const poiQ=(a,R,ks)=>{const s='(around:'+R+','+a.lat.toFixed(5)+','+a.lon.toFixed(5)+');';
  return '[out:json][timeout:25];('+ks.map(k=>POI_Q[k].map(x=>x+s).join("")).join("")+');out center tags;'};
function poiPick(J,c,best){
  (J.elements||[]).forEach(el=>{const t=el.tags||{},p={lat:el.lat!=null?el.lat:(el.center||{}).lat,lon:el.lon!=null?el.lon:(el.center||{}).lon};
    if(p.lat==null||p.lon==null)return;let k=poiKind(t);if(!k)return;
    if(k==="rest?"){const w=typeof terNear==="function"?terNear(p,"w"):null;if(!w||dist(p,w)>1.4)return;k="rest"}
    if(k==="hut?"){const w=typeof terNear==="function"?terNear(p,"f"):null;if(!w||dist(p,w)>1.4)return;k="hut"}
    const d=dist(c,p);if(!best[k]||d<best[k].d)best[k]={d,lat:p.lat,lon:p.lon,name:t.name||""}});
  return best}
async function poiFetch(a,key){
  const c={lat:a.lat,lon:a.lon},best={};
  try{poiPick(await overpass(poiQ(a,8000,POI_K.map(x=>x[0])),{post:true,ms:20000}),c,best);
    const miss=POI_K.map(x=>x[0]).filter(k=>!best[k]);
    if(miss.length)poiPick(await overpass(poiQ(a,30000,miss),{post:true,ms:25000}),c,best);
    poiMem[key]={t:Date.now(),r:best};poiSave(key,poiMem[key])}
  catch(e){poiMem[key]={t:Date.now(),err:true}}
  if(typeof arPoiDone==="function")arPoiDone(key)}
function poiGet(a){const key=poiKey(a);let S=poiMem[key];
  if(!S){const o=poiLoad()[key];if(o&&Date.now()-o.t<432e5&&!o.err)S=poiMem[key]=o}
  if(S&&S.err&&Date.now()-S.t>6e4){delete poiMem[key];S=null}
  if(!S){poiMem[key]={busy:true};poiFetch(a,key);S=poiMem[key]}
  return S}
const poiTile=(k,t,ic,p,c)=>{
  if(!p)return '<div class="arnr off"><span class="arna">'+uiIcon(ic)+'</span><div><small>'+t+'</small><b>daleko</b><span>ponad 30 km</span></div></div>';
  const deg=Math.round(arBear(c,p)),dir=AR_DIR[Math.round(deg/45)%8];
  return '<button type="button" class="arnr" data-hm="nrgo" data-k="'+k+'" data-id="nav" data-t="'+esc(p.name||t)+'" data-lat="'+p.lat.toFixed(5)+'" data-lon="'+p.lon.toFixed(5)+'" aria-label="'+t+' — pokaż na radarze"><span class="arna">'+uiIcon(ic)+'</span><div><small>'+t+'</small><b>'+(p.d<.15?'tutaj':arKmT(p.d))+'</b><span>'+dir+(p.name?' · '+esc(arCut(p.name,14)):'')+'</span></div></button>'};
function poiTilesHtml(a){const S=poiGet(a),c={lat:a.lat,lon:a.lon};
  const wait=S&&S.busy,bad=S&&S.err;
  return '<div class="bsgrp">Najbliżej Ciebie</div><div class="arnear arpoi">'+POI_K.map(([k,t,ic])=>{
    if(wait||bad)return '<div class="arnr off"><span class="arna">'+uiIcon(ic)+'</span><div><small>'+t+'</small><b>'+(wait?'…':'—')+'</b><span>'+(wait?'szukam':'brak danych')+'</span></div></div>';
    return poiTile(k,t,ic,(S.r||{})[k],c)}).join("")+'</div>'
    +(bad?'<div class="note" style="margin:-6px 0 10px">Nie udało się pobrać miejsc z OpenStreetMap — spróbuj za chwilę (otwórz okno ponownie).</div>':'')}

/* ---------- 🏡 wsie na radarze (v366) — prawy uchwyt suwaka „Miejscowości na radarze” na „wsie”
   Dane: OpenStreetMap (Overpass, ODbL, place=village) w promieniu WS_R km od środka okolicy (zaokrąglonego do 0,1°); pobierane tylko, gdy wsie są włączone,
   pamiętane 30 dni w localStorage „arWs” (najwyżej 3 okolice, ok. 50 KB każda). Rysowanie: areaSvgIn (js/08) woła wsGet dopiero przy rysowaniu. */
const WS_R=40,WS_TTL=2592e6;
let wsMem={};
const wsKey=a=>a.lat.toFixed(1)+"|"+a.lon.toFixed(1);
const wsLoad=()=>{try{return JSON.parse(localStorage.getItem("arWs")||"{}")}catch(e){return {}}};
const wsSave=(k,v)=>{try{const o=wsLoad();o[k]=v;Object.keys(o).sort((x,y)=>o[y].t-o[x].t).slice(3).forEach(x=>delete o[x]);localStorage.setItem("arWs",JSON.stringify(o))}catch(e){}};
async function wsFetch(key){
  const [la,lo]=key.split("|");
  try{const T=await overpass('[out:csv(::lat,::lon,name;false;"|")][timeout:25];node["place"="village"]["name"](around:'+(WS_R*1000)+','+la+','+lo+');out;',{post:true,ms:25000,txt:true});
    const l=String(T||"").split("\n").map(s=>s.split("|")).filter(v=>v.length>=3&&v[2]&&isFinite(+v[0])&&isFinite(+v[1])&&v[0]!=="").map(v=>[v[2].trim().slice(0,40),+(+v[0]).toFixed(4),+(+v[1]).toFixed(4)]);
    wsMem[key]={t:Date.now(),l};wsSave(key,wsMem[key])}
  catch(e){wsMem[key]={t:Date.now(),err:true}}
  if(typeof arRedraw==="function")arRedraw()}
function wsGet(a){const key=wsKey(a);let S=wsMem[key];
  if(!S){const o=wsLoad()[key];if(o&&o.l&&Date.now()-o.t<WS_TTL)S=wsMem[key]=o}
  if(S&&S.err&&Date.now()-S.t>6e4){delete wsMem[key];S=null}   // po błędzie ponowna próba najwcześniej za minutę
  if(!S){wsMem[key]={busy:true};wsFetch(key);S=wsMem[key]}
  return S.l||null}
