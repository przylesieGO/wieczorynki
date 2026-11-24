/* ---------- stan ---------- */
const RECOVERY=/type=recovery/.test(location.hash||""),HASH_EXPIRED=/error_code=otp_expired/.test(location.hash||"");
let pwMode=false;
let sb=null,session=null,uid="",ready=false;
let me={nick:null},isAdmin=false,adminIds=[];
let nicks={},sorted=[],cur=-1,rsvps={},wants=[],joins={},lib=[];
let viewToken=0,shareFor=null,map1=null,map2=null;
let editId=null,formRoute,libFile=null;
const routeCache={},libCache={};

const nickOf=id=>nicks[id]||"ktoś";
/* płeć i kolory nicków */
let genders={},genderOk=false;
const DEF_COLORS={K:"#b0245f",M:"#1f56b3"},DEF_BGS={K:"#fde4ef",M:"#e3edfc"};
let nickColors={...DEF_COLORS},nickBgs={...DEF_BGS};
const HEX_RE=/^#[0-9a-fA-F]{6}$/;
const colorOf=id=>{const g=genders[id];return g&&HEX_RE.test(nickColors[g]||"")?nickColors[g]:""};
// nick jako kolorowy HTML (tekst zawsze przez esc)
// nick jako „pigułka”: kolor tekstu i tło zależne od płci (ustawia admin); bez płci — szara
const pill=(t,c,bg,live,uid_,extra,pre)=>'<span'+(uid_?' data-u="'+esc(uid_)+'"':'')+' class="nk'+(c&&bg==="none"?' nobg':'')+(live?' live" title="teraz w aplikacji':'')+'"'+(c?' style="color:'+c+';background:'+(bg==="none"?"transparent":bg)+'"':'')+'>'+(pre||'')+esc(t)+(extra||'')+'</span>';
/* ulubieni (prywatni: każdy widzi tylko swoich) */
let favs=new Set(),favOk=false;
const isFav=id=>favs.has(id);
const nk=(id,fallback)=>{const c=colorOf(id),g=genders[id],t=nicks[id]||fallback||"ktoś";return pill(t,c,c?nickBgs[g]:"",onlineIds.includes(id),nicks[id]&&favOk&&id!==uid?id:"",(testerIds.has(id)?'<span class="nktst" title="tester">'+uiIcon("syringe")+'</span>':"")+(typeof demoTag==="function"?demoTag(id):"")+(fbBulb(id)?' '+uiIcon("bulb"):""),avImg(id,"nkav")+(isFav(id)?uiIcon("starf")+' ':""))};
const favFirst=ids=>ids.slice().sort((a,b)=>(isFav(b)?1:0)-(isFav(a)?1:0));
const nkList=ids=>'<div class="nks">'+favFirst(ids).map(id=>nk(id)).join("")+'</div>';
const favNames=ids=>favFirst(ids).filter(isFav).map(id=>nicks[id]).filter(Boolean);
// nick: min. 3 litery (KROK 20) — cyfry, spacje i znaki się nie liczą
const nickLetters=n=>String(n||"").replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g,"").length;
const nickShort=()=>!!me.nick&&nickLetters(me.nick)<3&&!isSuper(uid);
const needProfile=()=>!!session&&(!me.nick||(genderOk&&!genders[uid])||nickShort());
const isUpcoming=r=>new Date(r.when).getTime()>=Date.now()-3*36e5;
const firstUpcoming=()=>sorted.findIndex(isUpcoming);
function pickDefault(){const f=firstUpcoming();return f>=0?f:sorted.length-1}
const canEdit=r=>!!session&&(r.creator===uid||isAdmin);
function changedHtml(r){
  if(!r.edited_at)return "";
  const k="chg"+r.id;
  return '<details class="chg" data-j="'+esc(k)+'"'+(joinOpen.has(k)?' open':'')+'><summary>⚠️ Wydarzenie zmienione</summary>'
   +'<div class="chgb"><span class="chgd">'+esc(fmtWhen(r.edited_at))+'</span><br>'+esc(r.change_note||"Szczegóły zmiany nie zostały podane.")+'</div></details>';
}

async function getRoute(id){
  if(id in routeCache)return routeCache[id];
  const r=await sb.from("rides").select("route").eq("id",id).single();
  if(r.error)throw r.error;
  const pts=r.data&&r.data.route?parseRoute(r.data.route):false;
  routeCache[id]=pts;return pts;
}
async function getLibRoute(id){
  if(id in libCache)return libCache[id];
  const r=await sb.from("routes").select("route").eq("id",id).single();
  if(r.error)throw r.error;
  const pts=r.data&&r.data.route?parseRoute(r.data.route):false;
  libCache[id]=pts;return pts;
}

/* ---------- nagłówek: zwijanie przy przewijaniu ---------- */
// bez drżenia przy górze (2026-11-24): zwinięty nagłówek jest niższy (~96 px) — brakującą wysokość dostaje jako margines,
// a przeglądarka na czas zmiany nie „poprawia” położenia strony (overflow-anchor); dawniej skok wracał stronę na górę i nagłówek migał
let hdrCompact=false,hdrGap=96;
function onScroll(){
  const y=window.scrollY||document.documentElement.scrollTop||0;
  const c=hdrCompact?y>hdrGap-6:y>hdrGap+4;   // zwija się, gdy pusty margines jest już poza ekranem
  if(c===hdrCompact)return;
  hdrCompact=c;const h=$("hdr"),de=document.documentElement;de.style.overflowAnchor="none";
  if(c){const a=h.offsetHeight;h.classList.add("compact");hdrGap=Math.max(0,a-h.offsetHeight);h.style.marginBottom=hdrGap+"px"}
  else{const b=h.offsetHeight;h.classList.remove("compact");h.style.marginBottom="";hdrGap=Math.max(0,h.offsetHeight-b)}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{de.style.overflowAnchor=""}));
}
window.addEventListener("scroll",onScroll,{passive:true});
onScroll();

/* 🏃 Aktywności (KROK 94): jedna lista z bazy (tabela `activities`) — rower, bieg, spacer, trekking; nowa aktywność = wiersz w bazie.
   Zapas (ACT_DEF) = te same 4, gdy baza nie odpowie; ostatnia lista z bazy zostaje w pamięci telefonu (localStorage „acts”).
   Pola: name (karta), name_many (Filtry), verb „Jadę/Biegnę”, verb_you, want_txt „… ma ochotę …”, icon (uiIcon), uses_bike, msgs, ev_kinds, state off/testers/all. */
const ACT_DEF=[
  {key:"bike",invite_txt:"na rower",title_suffix:"",name:"Rower",name_many:"Rower",verb:"Jadę",verb_you:"Jedziesz",want_txt:"pojeździć na rowerze",with_txt:"Masz z kim jechać!",icon:"bike",emoji:"🚲",pace:"kmh",uses_bike:true,
   msgs:["Nogi same kręcą","Kto mnie dogoni?","Szukam koła do siedzenia","Bez kawy nie ruszam ☕"],ev_kinds:["gravel","road","mtb","ebike","any"],sort:1,state:"all"},
  {key:"run",invite_txt:"na bieg",title_suffix:" · bieg",name:"Bieg",name_many:"Bieganie",verb:"Biegnę",verb_you:"Biegniesz",want_txt:"pobiegać",with_txt:"Masz z kim pobiegać!",icon:"run",emoji:"🏃",pace:"minkm",uses_bike:false,
   msgs:["Buty już zawiązane","Uciekam przed kanapą","Tempo rozmowne, obiecuję","Kto ze mną do lasu?"],ev_kinds:["run","tri"],sort:2,state:"all"},
  {key:"walk",invite_txt:"na spacer",title_suffix:" · spacer",name:"Spacer",name_many:"Spacery",verb:"Idę",verb_you:"Idziesz",want_txt:"na spacer",with_txt:"Masz z kim iść na spacer!",icon:"walk",emoji:"🚶",pace:"none",uses_bike:false,
   msgs:["Spacer i plotki","Pies też chce","Bez pośpiechu, z kawą","Zbieram kroki"],ev_kinds:["walk"],sort:3,state:"all"},
  {key:"hike",invite_txt:"na wędrówkę",title_suffix:" · wędrówka",name:"Trekking",name_many:"Trekking",verb:"Idę",verb_you:"Idziesz",want_txt:"na wędrówkę",with_txt:"Masz z kim iść na wędrówkę!",icon:"tree",emoji:"🥾",pace:"none",uses_bike:false,
   msgs:["Plecak spakowany","Byle pod górę","Szukam szlaku i ekipy","Kanapki biorę ja"],ev_kinds:[],sort:4,state:"all"}];
let actList=(()=>{try{const a=JSON.parse(localStorage.getItem("acts")||"null");if(Array.isArray(a)&&a.length&&a.every(x=>x&&x.key&&x.name))return a}catch(e){}return ACT_DEF})();
function actsSet(a){if(!Array.isArray(a)||!a.length)return;actList=a.slice().sort((p,q)=>(p.sort||0)-(q.sort||0));try{localStorage.setItem("acts",JSON.stringify(actList))}catch(e){}}
const actOf=k=>actList.find(x=>x.key===(k||"bike"))||actList.find(x=>x.key==="bike")||ACT_DEF[0];   // nieznany klucz → rower (jak act_row w bazie)
const actIsBike=k=>!!actOf(k).uses_bike;
// do wyboru (formularz, „Mam ochotę”): „Wszyscy” albo „Tylko testerzy” dla testerów i 👑; „off” — nigdzie do wyboru (stare wpisy dalej czytelne)
const actAvail=()=>actList.filter(x=>x.state==="all"||(x.state==="testers"&&typeof meTester==="function"&&meTester()));
const actOfEv=b=>{const a=actList.find(x=>(x.ev_kinds||[]).includes(b));return a?a.key:""};   // rodzaj imprezy → aktywność

// 🔒 okno (.sheet) otwarte — strona pod spodem się nie przewija ani nie reaguje (klasa html.sheetlock)
{const lock=()=>document.documentElement.classList.toggle("sheetlock",[...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide")));
 const mo=new MutationObserver(lock);document.querySelectorAll(".sheet").forEach(el=>mo.observe(el,{attributes:true,attributeFilter:["class"]}));lock()}
