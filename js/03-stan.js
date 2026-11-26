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

/* 🏃 Aktywności (KROK 94): jedna lista z bazy (tabela `activities`) — rower, bieg, spacer, wędrówka; nowa aktywność = wiersz w bazie.
   Zapas (ACT_DEF) = te same 4, gdy baza nie odpowie; ostatnia lista z bazy zostaje w pamięci telefonu (localStorage „acts”).
   Pola: name (karta), name_many (Filtry), verb „Jadę/Biegnę”, verb_you, want_txt „… ma ochotę …”, icon (uiIcon), uses_bike, msgs, ev_kinds, state off/testers/all. */
const ACT_DEF=[
  {key:"bike",invite_txt:"na rower",title_suffix:"",name:"Rower",name_many:"Rower",verb:"Jadę",verb_you:"Jedziesz",want_txt:"pojeździć na rowerze",with_txt:"Masz z kim jechać!",icon:"bike",emoji:"🚲",pace:"kmh",uses_bike:true,
   msgs:["Nogi same kręcą","Kto mnie dogoni?","Szukam koła do siedzenia","Bez kawy nie ruszam ☕"],ev_kinds:["gravel","road","mtb","ebike","any"],sort:1,state:"all"},
  {key:"run",invite_txt:"na bieg",title_suffix:" · bieg",name:"Bieg",name_many:"Bieganie",verb:"Biegnę",verb_you:"Biegniesz",want_txt:"pobiegać",with_txt:"Masz z kim pobiegać!",icon:"run",emoji:"🏃",pace:"minkm",uses_bike:false,
   msgs:["Buty już zawiązane","Uciekam przed kanapą","Tempo rozmowne, obiecuję","Kto ze mną do lasu?"],ev_kinds:["run","tri"],sort:2,state:"all"},
  {key:"walk",invite_txt:"na spacer",title_suffix:" · spacer",name:"Spacer",name_many:"Spacery",verb:"Idę",verb_you:"Idziesz",want_txt:"na spacer",with_txt:"Masz z kim iść na spacer!",icon:"walk",emoji:"🚶",pace:"none",uses_bike:false,
   msgs:["Spacer i plotki","Pies też chce","Bez pośpiechu, z kawą","Zbieram kroki"],ev_kinds:["walk"],sort:3,state:"all"},
  {key:"hike",invite_txt:"na wędrówkę",title_suffix:" · wędrówka",name:"Wędrówka",name_many:"Wędrówki",verb:"Idę",verb_you:"Idziesz",want_txt:"na wędrówkę",with_txt:"Masz z kim iść na wędrówkę!",icon:"tree",emoji:"🥾",pace:"none",uses_bike:false,
   msgs:["Plecak spakowany","Byle pod górę","Szukam szlaku i ekipy","Kanapki biorę ja"],ev_kinds:[],sort:4,state:"all"}];
let actList=(()=>{try{const a=JSON.parse(localStorage.getItem("acts")||"null");if(Array.isArray(a)&&a.length&&a.every(x=>x&&x.key&&x.name))return a}catch(e){}return ACT_DEF})();
function actsSet(a){if(!Array.isArray(a)||!a.length)return;actList=a.slice().sort((p,q)=>(p.sort||0)-(q.sort||0));try{localStorage.setItem("acts",JSON.stringify(actList))}catch(e){}}
const actOf=k=>actList.find(x=>x.key===(k||"bike"))||actList.find(x=>x.key==="bike")||ACT_DEF[0];   // nieznany klucz → rower (jak act_row w bazie)
const actIsBike=k=>!!actOf(k).uses_bike;
// do wyboru (formularz, „Mam ochotę”): „Wszyscy” albo „Tylko testerzy” dla testerów i 👑; „off” — nigdzie do wyboru (stare wpisy dalej czytelne)
const actAvail=()=>actList.filter(x=>x.state==="all"||(x.state==="testers"&&typeof meTester==="function"&&meTester()));
const actOfEv=b=>{const a=actList.find(x=>(x.ev_kinds||[]).includes(b));return a?a.key:""};   // rodzaj imprezy → aktywność

/* 🏷️ Etykiety notatek (KROK 103): słownik z bazy (tabela `note_tags`) — słowo → ikona konturowa + kolor; edytuje tylko 👑 (Administracja).
   Notatka zaproszenia z pasującym słowem (początek wyrazu, bez wielkości liter i polskich znaków; „wilk” łapie „Wilki”) = kolorowa plakietka z ikoną
   jak tempo / rodzaj roweru; najpierw słownik 👑 (wg `sort`), potem wbudowany NT_BUILT (niżej) — etykiety powstają same. Tytuły i Telegram — bez etykiet (decyzja 2026-11-25 21:57).
   Ostatni słownik zostaje w pamięci telefonu (localStorage „ntags”); ntOk = tabela w bazie jest (false — brak KROKU 103). */
let ntList=(()=>{try{const a=JSON.parse(localStorage.getItem("ntags")||"null");if(Array.isArray(a)&&a.every(x=>x&&x.key))return a}catch(e){}return []})(),ntOk=false;
function ntSet(a){if(!Array.isArray(a))return;ntOk=true;ntList=a.slice().sort((p,q)=>(p.sort-q.sort)||p.key.localeCompare(q.key));try{localStorage.setItem("ntags",JSON.stringify(ntList))}catch(e){}}
const ntWords=s=>String(s||"").toLowerCase().replace(/[ąćęłńóśźż]/g,c=>"acelnoszz"["ąćęłńóśźż".indexOf(c)]).split(/[^a-z]+/).filter(Boolean);
// słowo pasuje od początku wyrazu; słowo ze spacją („Nocna Wataha” → nocnawataha) — przez kolejne wyrazy
const ntHit=(W,k)=>W.some((_,i)=>{let c="";for(let j=i;j<W.length&&c.length<k.length;j++)c+=W[j];return c.startsWith(k)});
/* 🏷️ Wbudowany słownik (decyzja właściciela 2026-11-25 22:12: etykiety mają powstawać same) — [ikona, kolor, rdzenie słów].
   Rdzeń łapie początek wyrazu po spłaszczeniu (bez polskich znaków): „jezior” → jezioro, jeziorem…; z kropką na końcu — tylko cały wyraz („las.” ≠ „laser”).
   Kolejność = pierwszeństwo (wyżej wygrywa). Słownik 👑 z bazy (ntList) jest przed wbudowanym; słowo z bazy wyłączone przełącznikiem wyłącza też to samo słowo wbudowane. */
const NT_BUILT=[
  ["wolf","gray","wataha wilk wilcz"],
  ["bolt","red","speeday sprint szybk wyscig race. interwal"],
  ["strava","#fc4c02","strava segment"],
  ["trophy","#c98a0b","zawod maraton rekord wyzwani challenge puchar"],
  ["timer","blue","trening progow"],
  ["coffee","#a2845e","kawa. kawy. kawe. kawka kawke kawki kawusi kawiarn kafej coffee espresso latte cappuccino"],
  ["beer","#c98a0b","piw. piwk piwo piwa piwem browar beer radler pifk"],
  ["icecream","#ff2d55","lody. lodzik lodziar gofr deser"],
  ["cookie","#a2845e","ciast ciastk paczk drozdzow sernik szarlotk"],
  ["food","orange","kebab pizz obiad lunch burger frytk zapiekank jedzeni grill kielbas nalesnik pierog sniadan kolacj bistro restaurac knajp gastro kanapk"],
  ["flame","red","ognisk upal upaln goraco"],
  ["sunrise","orange","swit. switu swicie wschod porann rano. ranek ranna sunrise"],
  ["sunset","orange","zachod sunset zmierzch golden"],
  ["moon","#3a4a8c","nocn noc. noca nocy nocka nocny wieczor ksiezyc polnoc night"],
  ["star","purple","gwiazd perseid astro"],
  ["droplet","#64a5ff","woda. wody. wode. wodke napoj bidon"],
  ["waves","teal","jezior rzek plaz kapiel narew bug. wisla wisle wisly zalew staw. stawu stawem stawie morz molo przystan kajak marina"],
  ["mountain","#8e6e53","gory. gore. gorach gorsk gorki gorka gorke podjazd wzgorz szczyt przewyz pagork hill climb wspinacz"],
  ["tree","green","las. lasu lasem lasy lasow lesie lesn puszcz bor. borem knieja park. parku rezerwat forest drzew grzyb"],
  ["mtb","green","mtb singl enduro trail downhill"],
  ["gravel","#a2845e","gravel szuter szutr szutrow"],
  ["road","gray","szos asfalt"],
  ["ebike","teal","ebik ebike elektryk"],
  ["walk","green","kijk nordic spacer"],
  ["run","orange","biega bieg. biegu jogg parkrun"],
  ["rain","purple","deszcz mokr ulew rain"],
  ["droplet","#8e6e53","blot. blota blotem blocie"],
  ["snow","teal","snieg sniez zim. zima zimow mroz chlod zimn morsow"],
  ["sun","#ffcc00","slonc slonecz pogodn cieplo ciepl"],
  ["wind","teal","wiatr wieje wietrzn wind"],
  ["heart","#ff2d55","randk milosc kocham serce walentyn romant"],
  ["sparkles","purple","urodzin imienin swiet sylwest mikolaj impreza"],
  ["paw","#a2845e","pies psem psa. psy. psiak piesk dog"],
  ["music","purple","muzyk glosnik disco koncert playlist"],
  ["cam","blue","zdjec foto film."],
  ["backpack","#8e6e53","bikepack sakw nocleg biwak namiot kemping camping"],
  ["map","blue","wycieczk wyprawa eksplor odkryw przygod tour."],
  ["turtle","green","spokoj wolno wolne wolniej najwoln luz. luzn lajtow rekreac chill relaks rozmown senior"],
  ["users","blue","ekip grup. grupa grupy grupow razem wszyscy kumpl znajom druzyn ziomk rodzin dzieci"],
  ["wrench","gray","serwis napraw detk pompk kapc smar lancuch"],
  ["shop","blue","sklep zakup biedronk zabk lidl"],
  ["city","gray","miasto miasta miescie miejsk centrum rynek city"],
  ["alert","orange","uwaga ostroz niebezp objazd remont zamkniet"],
  ["clock","blue","punktual spozni"]];
const ntBuilt=NT_BUILT.flatMap(([icon,color,w],g)=>w.split(" ").map(x=>({key:x.replace(/\.$/,""),ex:x.endsWith("."),word:x.replace(/\.$/,""),icon,color,built:true,sort:g})));
const ntHitT=(W,t)=>t.ex?W.includes(t.key):ntHit(W,t.key);
// L — słownik z bazy (domyślnie ntList; podgląd w Administracji podaje listę z niezapisanym słowem); potem wbudowany bez słów, które baza już ma
const ntFind=(s,L)=>{if(!s)return null;const W=ntWords(s),D=L||ntList,own=new Set(D.map(t=>t.key));
  return D.find(t=>t.on!==false&&ntHitT(W,t))||ntBuilt.find(t=>!own.has(t.key)&&ntHitT(W,t))||null};
const ntRaw=t=>/^#[0-9a-f]{6}$/.test(t.color)?t.color:(typeof PL_COL==="object"&&PL_COL[t.color])||"#0a84ff";
const ntCol=t=>typeof grInk==="function"?grInk(ntRaw(t)):ntRaw(t);   // tło pod biały napis — kontrast jak etykiety grup
const ntIc=t=>UI_P[t.icon]?t.icon:"tag";
// blok notatki: z etykietą (plakietka z ikoną i treścią) albo jak dotąd (pre = „💬 ”)
function noteHtml(n,cls,pre){if(!n)return "";const t=ntFind(n);
  return t?'<div class="wpcw ntagw"><span class="wpc wbk ntag" style="background:'+ntCol(t)+'">'+uiIcon(ntIc(t))+'<span>'+esc(n)+'</span></span></div>'
   :'<div class="'+cls+'">'+(pre==null?'💬 ':pre)+esc(n)+'</div>'}
// w jednym wierszu (🔔, listy): kolorowa ikona przed treścią; bez etykiety — pre + treść
function noteInl(n,pre){if(!n)return "";const t=ntFind(n);return t?'<span class="ntagi" style="color:'+ntRaw(t)+'">'+uiIcon(ntIc(t))+'</span>'+esc(n):(pre||"")+esc(n)}

// 🔒 okno (.sheet) otwarte — strona pod spodem się nie przewija ani nie reaguje (klasa html.sheetlock)
{const lock=()=>document.documentElement.classList.toggle("sheetlock",[...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide")));
 const mo=new MutationObserver(lock),ob=el=>mo.observe(el,{attributes:true,attributeFilter:["class"]});document.querySelectorAll(".sheet").forEach(ob);
 new MutationObserver(m=>{m.forEach(r=>r.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains("sheet"))ob(n)}));lock()}).observe(document.body,{childList:true});   // też okna tworzone w locie (np. askOk — #cfm)
 lock()}
// ⌨️ Esc zamyka wierzchnie okno (.sheet) — tak jak dotknięcie tła (test 2026-11-26: Esc nie zamykał Pomocy). askOk i wyszukiwarka obsługują Esc same.
document.addEventListener("keydown",e=>{if(e.key!=="Escape"||e.defaultPrevented)return;
  const S=[...document.querySelectorAll(".sheet")].filter(x=>!x.classList.contains("hide"));if(!S.length)return;
  const z=x=>+getComputedStyle(x).zIndex||0,top=S.reduce((a,b)=>z(b)>=z(a)?b:a);
  e.preventDefault();top.dispatchEvent(new MouseEvent("click",{bubbles:true}))});
