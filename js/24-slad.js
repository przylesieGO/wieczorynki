/* ======================================================================
   🔎 Ślad do zgłoszeń (KROK 110) — TYLKO 👑
   Zapisuje w pamięci przeglądarki ostatnie SL_MAX zdarzeń: otwarte ekrany
   i okna, kliknięcia (nazwa przycisku, nie współrzędne), komunikaty, które
   pokazała aplikacja, i błędy JS. Wpisywanych treści NIE zapisuje — tylko
   to, że pole było użyte.

   Nic nie wychodzi z telefonu samo: ślad leży wyłącznie w pamięci karty
   (bez localStorage, bez wysyłania), ginie przy odświeżeniu i trafia do
   bazy dopiero wtedy, gdy 👑 kliknie „Wyślij” w ⚙️ → 💬 Oceń / zgłoś błąd
   przy zaznaczonym „Dołącz ślad”. Komu innemu baza ślad pomija (js/05 nawet
   go nie wysyła).

   Plik wczytywany jako ostatni, więc owija gotowe say() i widzi wszystko,
   co użytkownik robi po wejściu (błędów z samego wczytywania nie złapie).
   ====================================================================== */
const SL_MAX=80,SL_T0=Date.now(),
      SL_TAB={0:"Zaproszenia",1:"Wieczorynki",2:"Zaawansowane",3:"Imprezy"},
      SL_E={start:"▶",ekran:"🖼",klik:"👆",komunikat:"💬",blad:"⚠️"};
let slBuf=[],slPrev="";
const slTxt=(t,n)=>String(t==null?"":t).replace(/\s+/g," ").trim().slice(0,n||48);
const slGet=()=>slBuf.length?slBuf.slice():null;
const slN=()=>slBuf.length;

// gdzie jestem: wierzchnie otwarte okno (jego nagłówek), Ustawienia albo zakładka
function slWhere(){
  const s=[...document.querySelectorAll(".sheet:not(.hide)")].pop();
  if(s&&s.id!=="gearpanel"){const h=s.querySelector(".bshead,.sname,h2,h3");return slTxt((h&&h.textContent)||s.id,40)}
  if(typeof gearOpen!=="undefined"&&gearOpen)
    return "Ustawienia"+(typeof gearView!=="undefined"&&gearView&&gearView!=="main"?" → "+gearView:"");
  return SL_TAB[typeof curTab!=="undefined"?curTab:0]||"Lista";
}
function slAdd(e,v){
  // zbiera tylko 👑. Dopóki aplikacja nie wie, kto to (lista 👑 wczytuje się
  // z bazy — supers w js/04), zapisujemy; gdy już wiadomo, że to nie 👑,
  // bufor idzie do kosza. Dzięki temu nie gubimy pierwszych sekund sesji 👑.
  // isKingReal, nie isSuper: 👑 w „Podglądzie aplikacji" też chce zgłaszać.
  if(typeof supers!=="undefined"&&supers.size&&typeof isKingReal==="function"&&!isKingReal()){
    if(slBuf.length)slBuf=[];return}
  const w=slWhere(),k=e+"|"+v+"|"+w;
  if(k===slPrev&&e!=="klik")return;                     // to samo zdarzenie tuż po sobie
  slPrev=k;
  slBuf.push({t:Date.now()-SL_T0,e,v:slTxt(v,e==="start"?140:60),w:(e==="ekran"&&v===w)?"":w});   // przy zmianie ekranu nie powtarzamy nazwy
  if(slBuf.length>SL_MAX)slBuf.shift();
}
// podpis klikniętego elementu; z pól tylko ich nazwa, nigdy wpisana treść
function slLabel(el){
  const t=(el.tagName||"").toLowerCase();
  if(t==="input"||t==="textarea"||t==="select"){
    const ty=slTxt(el.type||t,12),lab=el.closest("label");
    return "pole "+slTxt(el.getAttribute("aria-label")||el.placeholder||(lab&&(lab.innerText||lab.textContent))||el.name||el.id||ty,30)
      +(ty==="checkbox"||ty==="radio"?(el.checked?" ✓":" ✕"):"");
  }
  const c=el.closest("button,a,summary,label,[data-c],[data-u],[data-fb]")||el;
  // innerText, nie textContent: tytuł i podtytuł wiersza rozdziela spacją zamiast zlepiać
  return slTxt(c.getAttribute("aria-label")||c.innerText||c.textContent||c.getAttribute("data-c")||c.getAttribute("title")||c.tagName,48);
}
// ludzki zapis śladu — w istniejącym komponencie .fbdv (tym samym, w którym
// 👑 oglądał dotąd „📱 info o telefonie”), więc bez nowych klas CSS
const slTime=ms=>{const s=Math.round(ms/1000);return s<60?s+"s":Math.floor(s/60)+"m"+String(s%60).padStart(2,"0")};
const slLineHtml=z=>'<div>'+esc(slTime(z.t))+' '+(SL_E[z.e]||"·")+' '+esc(z.v)
  +(z.w?' <span class="note">· '+esc(z.w)+'</span>':'')+'</div>';
const slListHtml=(L,sum)=>'<details class="fbdv"><summary>🔎 '+esc(sum||("Ślad — "+(L||[]).length+" "+plf((L||[]).length,["zdarzenie","zdarzenia","zdarzeń"])))+'</summary>'
  +'<div>'+((L||[]).map(slLineHtml).join("")||"Pusto")+'</div></details>';

{ // ---- podłączenie (raz, przy wczytaniu pliku)
  const dt=document.documentElement.dataset.theme||"auto",sa=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
  slAdd("start","okno "+innerWidth+"×"+innerHeight+", ekran "+((screen||{}).width||"?")+"×"+((screen||{}).height||"?")
    +", motyw "+dt+(sa?", z ikony":", przeglądarka")+", wersja "+(typeof APP_VER!=="undefined"?APP_VER:"?"));

  document.addEventListener("click",e=>{
    const el=e.target;if(!el||el.nodeType!==1)return;
    if(el.closest(".fbdv"))return;                      // rozwijanie samego śladu nie jest śladem
    const v=slLabel(el);if(v)slAdd("klik",v);
  },true);

  // zmiana okna / ekranu — ten sam sposób co ✕ na dole przewijanego okna (js/01)
  {let q=0;const chk=()=>{q=0;slAdd("ekran",slWhere())};
   new MutationObserver(()=>{if(!q)q=setTimeout(chk,120)})
     .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});}

  // komunikaty aplikacji
  if(typeof say==="function"){const _say=say;say=function(t){slAdd("komunikat",t);return _say.apply(this,arguments)}}

  // błędy
  window.addEventListener("error",e=>slAdd("blad",(e.message||"błąd")+" @ "+String(e.filename||"").split("/").pop()+":"+(e.lineno||"?")));
  window.addEventListener("unhandledrejection",e=>slAdd("blad","odrzucona obietnica: "+slTxt((e.reason&&(e.reason.message||e.reason))||"?",60)));
}

/* ---------- 📷 zrzut ekranu z galerii (tylko 👑) ---------- */
const SL_BUCKET="zgloszenia";                           // sufit pliku: SV_MAXF z js/20 (1 MB) — ten sam co paragony
let slShot=null;                                        // {file, blob, url} wybrany, jeszcze nie wysłany
const slShotId=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);

function slShotPick(f){
  if(!f)return;
  if(!/^image\//.test(f.type||"")){say("Zrzut ekranu to zdjęcie — wybierz plik JPG albo PNG.");return}
  slShotClear();slShot={file:f,blob:null,url:URL.createObjectURL(f)};
  renderGear();
}
function slShotClear(){
  if(slShot&&slShot.url)try{URL.revokeObjectURL(slShot.url)}catch(e){}
  slShot=null;
}
// wysyłka: zmniejszenie tą samą drogą co paragony w serwisie (svShrink z js/20), potem bucket „zgloszenia”
async function slShotUpload(){
  if(!slShot)return null;
  if(typeof svShrink!=="function")throw new Error("Nie udało się przygotować zrzutu.");
  const blob=await svShrink(slShot.file);               // js/20: zmniejsza do 1600 px i ≤ SV_MAXF, zawsze JPEG
  const path=uid+"/"+slShotId()+".jpg";
  const u=await sb.storage.from(SL_BUCKET).upload(path,blob,{contentType:"image/jpeg",upsert:false});
  if(u.error)throw u.error;
  return path;
}
const slShotRm=p=>{if(p)sb.storage.from(SL_BUCKET).remove([p]).catch(()=>{})};
// podgląd zrzutu z już wysłanego zgłoszenia (podpisany adres na 2 minuty) — jak svFileView w js/20
async function slShotView(path){
  if(!path)return;
  const w=window.open("","_blank");
  const r=await sb.storage.from(SL_BUCKET).createSignedUrl(path,120);
  if(r.error||!r.data){if(w)w.close();say("Nie udało się otworzyć zrzutu.");return}
  if(w)w.location.href=r.data.signedUrl;else location.href=r.data.signedUrl;
}
