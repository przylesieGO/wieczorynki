/* 🚪 Ekran startowy — kroki zakładania profilu (KROK 106, flaga 🚦 ekran_startowy — na razie testerzy).
   Kroki to klocki w ST_STEPS: {id, done() — czy uzupełnione, html() — rysowanie, ok() — czy można dalej, save() — zapis}.
   Nowy krok (nick, zdjęcie, płeć, Telegram…) = nowy wpis w ST_STEPS; kolejność wpisów = kolejność na ekranie.
   Tryby: "auto" — po zalogowaniu, tylko nieuzupełnione kroki, bez ✕ i „Później” (okolica obowiązkowa);
          "all"  — ⚙️ → Testy → „Pokaż ekran startowy jeszcze raz” (wszystkie kroki, z bieżącymi danymi);
          "acts" — ⚙️ → Jazdy i zaproszenia → Powiadamiaj mnie o (sam krok 2, można zamknąć).
   Kolejność przy wejściu (afterData, js/14): needProfile (nick, płeć) → ekran startowy → Gawron → pozostałe okienka. */
const ST={on:false,mode:"auto",i:0,steps:[],res:[],msg:"",q:"",city:null,km:null,acts:null,busy:false};
const stHasCity=()=>!!(myPriv&&myPriv.city&&myPriv.city_lat!=null);
const stActKeys=()=>actAvail().map(a=>a.key);
const ST_STEPS=[
  {id:"area",done:stHasCity,ok:()=>!!ST.city,html:stAreaHtml,save:stAreaSave},
  {id:"acts",done:()=>!stActKeys().length||!!(myPriv&&Array.isArray(myPriv.acts)&&myPriv.acts.length),ok:()=>!!(ST.acts&&ST.acts.length),html:stActsHtml,save:stActsSave}
];
const stOn=()=>!!session&&!DEMO&&profExOk&&privReady&&flagsReady&&feat("ekran_startowy");

// wołane z afterData (js/14) przed Gawronem; true = ekran trwa (inne okienka czekają)
function stAuto(){
  if(ST.on)return true;
  if(!stOn()||needProfile()||pwMode||gearOpen)return false;
  if([...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide")))return false;
  if(ST_STEPS.every(s=>s.done()))return false;
  stOpen("auto");return true;
}
function stOpen(mode){
  ST.mode=mode||"auto";
  ST.steps=ST.mode==="acts"?ST_STEPS.filter(s=>s.id==="acts"):ST.mode==="all"?ST_STEPS.slice():ST_STEPS.filter(s=>!s.done());
  if(!ST.steps.length)return;
  const h=stHasCity()?{name:myPriv.city,lat:+myPriv.city_lat,lon:+myPriv.city_lon}:null;
  Object.assign(ST,{on:true,i:0,res:[],msg:"",q:"",busy:false,city:h,km:areaKm(),
    acts:myPriv&&Array.isArray(myPriv.acts)?myPriv.acts.filter(k=>stActKeys().includes(k)):[]});
  stRender();
}
function stRender(){
  const p=$("stsheet"),s=ST.steps[ST.i],n=ST.steps.length,can=ST.mode==="acts";
  p.innerHTML='<div class="sheetbox popbox stbox" role="dialog" aria-modal="true" aria-labelledby="sth">'
   +(can?'<button class="sclose" data-st="close" aria-label="Zamknij">✕</button>':'')
   +'<span class="ptag">'+(n>1?'KROK '+(ST.i+1)+' Z '+n:can?'POWIADAMIAJ MNIE O':'TWÓJ PROFIL')+'</span>'
   +s.html()
   +'<button type="button" class="b big" data-st="next"'+(s.ok()&&!ST.busy?'':' disabled')+'>'+(ST.i<n-1?'Dalej':can?'Zapisz':'Gotowe')+'</button>'
   +(ST.i>0||can?'<div class="pbtns"><button type="button" class="b w" data-st="'+(ST.i>0?'back':'close')+'">'+(ST.i>0?'‹ Wstecz':'Anuluj')+'</button></div>':'')
   +(n>1?'<div class="gwdots">'+ST.steps.map((x,k)=>'<i class="'+(k===ST.i?"on":"")+'"></i>').join("")+'</div>':'')
   +'</div>';
  p.classList.remove("hide");
}
function stClose(){
  const p=$("stsheet");p.classList.add("hide");p.innerHTML="";const m=ST.mode;ST.on=false;
  if(gearOpen)try{renderGear()}catch(e){}
  try{if(typeof areaChanged==="function")areaChanged();if(typeof sigWinRender==="function")sigWinRender();if(typeof sigWinSync==="function")sigWinSync()}catch(e){}   // 🔔 v283: nowy wybór aktywności od razu na liście i w oknie Ekipa
  if(m==="auto"&&!(typeof gwAuto==="function"&&gwAuto())&&typeof gwAfter==="function")gwAfter();   // potem Gawron albo zaległe okienka
}
async function stSave(patch){
  const r=await sb.from("profile_private").upsert(Object.assign({user_id:uid,updated_at:new Date().toISOString()},patch),{onConflict:"user_id"}).select(PRIV_COLS).maybeSingle();
  if(r.error){say("Nie udało się zapisać — sprawdź połączenie i spróbuj jeszcze raz.");return false}
  myPriv=r.data;return true;
}

// ── Krok: okolica (obowiązkowa miejscowość, promień — js/08: geoSearch, useGps, AREA_KM) ──
function stAreaHtml(){
  const ki=AREA_KM.indexOf(ST.km);
  return '<div class="ph" id="sth">W jakiej okolicy się ruszasz?</div>'
   +'<div class="pmeta">PrzylesieGO łączy ludzi, którzy ruszają się blisko siebie — na rowerze, biegając, na spacerze i na wędrówce. Bez Twojej okolicy nie pokażemy Ci zaproszeń ani sygnałów z sąsiedztwa i nikt w pobliżu nie dowie się, że masz ochotę ruszyć.</div>'
   +'<div class="stform">'
   +(ST.city?'<div class="hmcur">'+uiIcon("pin")+'<span><b>'+esc(ST.city.name)+'</b></span><button type="button" class="lnk" data-st="chg">Zmień</button></div>'
     :'<button type="button" class="b g big" data-st="gps">'+uiIcon("globe")+' Użyj mojej lokalizacji</button>'
      +'<div class="hmrow" style="margin-top:10px"><input id="stq" maxlength="80" placeholder="Wpisz miejscowość, np. Pułtusk" value="'+esc(ST.q)+'" enterkeyhint="search" autocomplete="off"><button type="button" class="b" data-st="find">Szukaj</button></div>'
      +(ST.msg?'<div class="note" style="margin-top:8px">'+ST.msg+'</div>':'')
      +ST.res.map((x,i)=>'<button type="button" class="hmres" data-st="pick" data-i="'+i+'"><b>'+esc(x.name)+'</b><span>'+esc(x.full)+'</span></button>').join(""))
   +'<div class="arsl" style="margin-top:12px"><div class="arslh"><span>Promień</span><b id="stkmv">'+areaKmTxt(ST.km)+'</b></div><input id="stkm" type="range" min="0" max="'+(AREA_KM.length-1)+'" step="1" value="'+(ki<0?3:ki)+'" aria-label="Promień okolicy"><div class="arslt"><span>5 km</span><span>50 km</span><span>Polska</span></div>'+AREA_INFO+'</div>'
   +'<div class="note" style="margin-top:8px"><i>Zapisujemy tylko miejscowość (z dokładnością do ok. 2 km). Widzisz ją tylko Ty.</i></div>'
   +'</div>';
}
async function stAreaSave(){
  const c=ST.city,h={name:c.name.slice(0,80),lat:areaRound(c.lat),lon:areaRound(c.lon)};
  if(!(await stSave({city:h.name,city_lat:h.lat,city_lon:h.lon,area_km:ST.km})))return false;
  try{localStorage.setItem("home",JSON.stringify(h));sessionStorage.removeItem("gpsOrigin")}catch(e){}
  areaPeek=null;areaChanged();return true;
}
async function stFind(){
  const q=($("stq")?$("stq").value:ST.q).trim();ST.q=q;
  if(q.length<2){ST.msg="Wpisz nazwę miejscowości.";ST.res=[];stRender();return}
  ST.msg="Szukam…";ST.res=[];stRender();const r=await geoSearch(q);if(!ST.on)return;
  ST.res=r||[];ST.msg=r===null?"Brak połączenia z OpenStreetMap — spróbuj za chwilę.":r.length?"Wybierz swoją miejscowość:":"Nic nie znaleziono — wpisz samą nazwę miejscowości.";stRender();
}

// ── Krok: aktywności (tabela activities — actAvail(); na razie tylko zapis wyboru) ──
function stActsHtml(){
  return '<div class="ph" id="sth">O czym mamy Ci dawać znać?</div>'
   +'<div class="pmeta">Wybierz, co lubisz. Dostaniesz tylko te zaproszenia i sygnały, które Cię interesują. Zmienisz to w każdej chwili w ustawieniach.</div>'
   +'<div class="wbike sigacts stacts">'+actAvail().map(a=>{const on=ST.acts.includes(a.key);
      return '<button type="button" class="wbk'+(on?' on':'')+'" data-sta="'+esc(a.key)+'" aria-pressed="'+on+'">'+uiIcon(a.icon||"bike")+'<span>'+esc(a.name_many||a.name)+'</span></button>'}).join("")+'</div>'
   +'<div class="note" style="margin-top:8px">'+(ST.acts.length?'Wybrane: '+ST.acts.length+' — dotknij, żeby dodać albo odznaczyć.':'Wybierz co najmniej jedną — możesz kilka.')+'</div>';
}
function stActsSave(){return stSave({acts:ST.acts.slice()})}   // deklaracja funkcji (nie const) — ST_STEPS wyżej odwołuje się do niej przy wczytaniu
const stActsTxt=()=>{const a=myPriv&&Array.isArray(myPriv.acts)?myPriv.acts:[];return a.length?a.map(k=>{const x=actOf(k);return x.name_many||x.name}).join(", "):"Jeszcze nie wybrane"};

// ── obsługa okna ──
$("stsheet").addEventListener("click",async e=>{
  const a=e.target.closest("[data-sta]");
  if(a){const k=a.dataset.sta;ST.acts=ST.acts.includes(k)?ST.acts.filter(x=>x!==k):ST.acts.concat([k]);stRender();return}
  const b=e.target.closest("[data-st]");if(!b)return;   // klik w tło (i Esc) nic nie robi — okno jest obowiązkowe
  const k=b.dataset.st,s=ST.steps[ST.i];
  if(k==="close"){stClose();return}
  if(k==="back"){if(ST.i>0){ST.i--;stRender()}return}
  if(k==="find"){stFind();return}
  if(k==="chg"){ST.city=null;ST.res=[];ST.msg="";stRender();setTimeout(()=>{const i=$("stq");if(i)i.focus()},60);return}
  if(k==="pick"){const x=ST.res[+b.dataset.i];if(!x)return;ST.city={name:x.name,lat:x.lat,lon:x.lon};ST.res=[];ST.msg="";stRender();return}
  if(k==="gps"){useGps(x=>{if(!ST.on)return;
      if(x&&x.name){ST.city={name:x.name,lat:x.lat,lon:x.lon};ST.msg=""}else ST.msg="Nie rozpoznaliśmy miejscowości z lokalizacji — wpisz ją niżej.";
      stRender()});return}
  if(k==="next"){if(!s.ok()||ST.busy)return;ST.busy=true;stRender();
    const ok=await s.save();ST.busy=false;if(!ST.on)return;
    if(!ok){stRender();return}
    if(ST.i<ST.steps.length-1){ST.i++;stRender();return}
    stClose();say(ST.mode==="acts"?"Zapisane: "+stActsTxt()+".":"Gotowe — witaj w PrzylesieGO!")}
});
$("stsheet").addEventListener("input",e=>{if(e.target.id==="stkm"){ST.km=AREA_KM[+e.target.value];const v=$("stkmv");if(v)v.textContent=areaKmTxt(ST.km)}
  else if(e.target.id==="stq")ST.q=e.target.value});
$("stsheet").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="stq"){e.preventDefault();stFind()}});
// ⚙️ → Testy → „Pokaż ekran startowy jeszcze raz” i ⚙️ → Jazdy i zaproszenia → Powiadamiaj mnie o
// 🔔 v283: „Powiadamiaj mnie o” działa też bez flagi, gdy ktoś ma już wybrane aktywności (filtr działa u każdego — decyzja 04:42)
const stActsHas=()=>!!session&&!DEMO&&profExOk&&privReady&&!!(myPriv&&Array.isArray(myPriv.acts)&&myPriv.acts.length);
document.addEventListener("click",e=>{const b=e.target.closest("[data-stgo]");if(!b||!(stOn()||(b.dataset.stgo==="acts"&&stActsHas())))return;
  stOpen(b.dataset.stgo)});
// wiersze do ⚙️ (js/06 woła je przy rysowaniu, gdy plik jest wczytany)
const stTestRow=()=>stOn()&&meTester()?gRow("#bf5af2","sparkles","Pokaż ekran startowy jeszcze raz","Kroki po zalogowaniu: okolica i aktywności (🧪 BETA)","",'data-stgo="all"'):"";
const stActsRow=()=>stOn()||stActsHas()?gRow("#34c759","heart","Powiadamiaj mnie o",stActsTxt(),"",'data-stgo="acts"'):"";
