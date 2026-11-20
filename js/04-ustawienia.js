/* ---------- ustawienia: konto, nick, wygląd, administracja ---------- */
let themeMode="auto";
try{themeMode=localStorage.getItem("theme")||"auto"}catch(e){}
const darkMq=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;
function applyTheme(){
  const dark=themeMode==="dark"||(themeMode==="auto"&&darkMq&&darkMq.matches);
  document.documentElement.dataset.theme=dark?"dark":"light";
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=dark?"#1c1c1e":"#f5f5f7";
}
function setTheme(t){themeMode=t;try{localStorage.setItem("theme",t)}catch(e){}applyTheme()}
if(darkMq&&darkMq.addEventListener)darkMq.addEventListener("change",applyTheme);
applyTheme();
const themeHtml=()=>'<div class="note" style="margin-top:14px">Wygląd</div><div class="seg">'+[["light","☀️ Jasny"],["dark","🌙 Ciemny"],["auto","Auto"]].map(([k,n])=>'<button data-t="'+k+'" class="'+(themeMode===k?"on":"")+'">'+n+'</button>').join("")+'</div>'+(themeMode==="auto"?'<div class="note" style="margin-top:6px">Auto — jak w telefonie. Wieczorem ciemny, jeśli masz w telefonie włączone automatyczne przełączanie.</div>':'');
let guestMode=false,gearOpen=false,gearView="main",gearFrom="";
const backBtn=()=>'<button class="sback" data-c="back">‹ '+(gearFrom==="nick"?"Edytuj profil":"Ustawienia")+'</button>';
// nick zalogowanego na górze ekranu (pomaga przy kilku kontach) — domyślnie widoczny, zapamiętane w telefonie
let showNick=true;try{showNick=localStorage.getItem("showNick")!=="0"}catch(e){}
const showNickHtml=()=>'<div class="note" style="margin-top:14px">Nick na górze ekranu</div><div class="seg">'+[["1","Pokaż"],["0","Ukryj"]].map(([k,t])=>'<button data-sn="'+k+'" class="'+((showNick?"1":"0")===k?"on":"")+'">'+t+'</button>').join("")+'</div>';
// 🧪 testowe zaproszenia: Pokaż / Ukryj (zapamiętane w telefonie; swoje i te, do których dołączyłeś, zostają)
let hideTest=false;try{hideTest=localStorage.getItem("hideTest")==="1"}catch(e){}
const hideTestHtml=()=>testOk?'<div class="note" style="margin-top:14px">Testowe zaproszenia 🧪</div><div class="seg">'+[["0","Pokaż"],["1","Ukryj"]].map(([k,t])=>'<button data-ht="'+k+'" class="'+((hideTest?"1":"0")===k?"on":"")+'">'+t+'</button>').join("")+'</div><div class="note" style="margin-top:6px">„Ukryj” — widzisz tylko prawdziwe jazdy. Twoje testowe i te, do których dołączyłeś, zostają.</div>':'';
function renderMeNick(){const el=$("menick");if(!el)return;const on=showNick&&!!session&&!!me.nick;el.classList.toggle("hide",!on);el.innerHTML=on?'<i title="Zalogowany">👤 </i>'+nk(uid):''}
try{guestMode=sessionStorage.getItem("guest")==="1"}catch(e){}
const setGuest=v=>{guestMode=v;try{v?sessionStorage.setItem("guest","1"):sessionStorage.removeItem("guest")}catch(e){}};
// 🔍 wyszukiwanie użytkowników w Administracji (po nicku, bez polskich znaków i wielkości liter) + szybkie filtry
let usersBack="admin",admQ="",admF="",admSeen=null,admSeenLoading=false;
// „ostatnio w aplikacji” do filtrów Aktywni 7 / 30 dni (KROK 49; bez 👑, maks. 100 osób)
async function loadAdmSeen(){if(admSeenLoading||!isAdmin)return;admSeenLoading=true;
  try{const r=await sb.rpc("admin_last_seen",{days:30});admSeen=r.error?{}:Object.fromEntries((r.data||[]).map(x=>[x.user_id,x.last_seen]))}catch(e){admSeen={}}
  admSeenLoading=false;if(gearOpen&&gearView==="users")renderGear()}
function admMatch(id){
  const q=nickKey(admQ.trim());if(q&&!nickKey(nicks[id]||"").includes(q)&&!lc(nicks[id]||"").includes(lc(admQ.trim())))return false;
  if(admF==="on")return onlineIds.includes(id);
  if(admF==="new7"||admF==="new30")return !!joinedAt[id]&&Date.now()-new Date(joinedAt[id]).getTime()<(admF==="new7"?7:30)*864e5;
  if(admF==="a7"||admF==="a30"){const t=(admSeen||{})[id]||(id===uid?Date.now():0);return !!t&&Date.now()-new Date(t).getTime()<(admF==="a7"?7:30)*864e5}
  if(admF==="tg")return !!(tgLinks&&tgLinks.has(id));
  if(admF==="ban")return modBanned.has(id);
  if(admF==="hid")return modHidden.has(id);
  return true;
}
function admFilter(){let n=0,t=0;document.querySelectorAll("[data-admu]").forEach(r=>{t++;const ok=admMatch(r.dataset.admu);r.style.display=ok?"":"none";if(ok)n++});
  const c=$("admqn");if(c)c.textContent=(admQ.trim()||admF)?n+" z "+t:"";}
document.addEventListener("input",e=>{if(e.target.id==="admq"){admQ=e.target.value;admFilter()}});
document.addEventListener("click",e=>{const b=e.target.closest("[data-admf]");if(!b)return;admF=b.dataset.admf;document.querySelectorAll("[data-admf]").forEach(x=>x.classList.toggle("on",x===b));admFilter()});
const ADM_F=[["","Wszyscy"],["on","🟢 Online"],["new7","Nowi 7 dni"],["new30","Nowi 30 dni"],["a7","Aktywni 7 dni"],["a30","Aktywni 30 dni"],["tg","Telegram"],["ban","Zablokowani"],["hid","Ukryci"]];
// licznik przy filtrze (bez wpisanego tekstu w szukajce)
const admCount=k=>{const q=admQ,f=admF;admQ="";admF=k;const n=Object.keys(nicks).filter(admMatch).length;admQ=q;admF=f;return n};
function adminHtml(){
  const onl=onlineIds.filter(id=>nicks[id]).length,fbN=fbOk?fbAdmUnread().length:0;
  const today=wants.filter(w=>w.starts_at&&dayDiff(new Date(w.starts_at))===0).length;
  const t=(v,l,c)=>'<button type="button" class="st stb" data-c="'+c+'"><b>'+v+'</b><span>'+l+' ›</span></button>';
  return '<button class="sback" data-c="back">‹ Ustawienia</button>'
   +'<div class="sname" style="margin-top:26px">🛡️ Administracja</div>'
   +'<div class="stats admbar">'+t(onl,"teraz online","onlineadm")+(fbOk?t(fbN,fbN===1?"nowe zgłoszenie":"nowych zgłoszeń","fbadmin"):'')+t(today,"zaproszeń dziś","wantstoday")+'</div>'
   +(evs.some(x=>x.delete_req_at)?gGrp("Do zrobienia",[gRow("#ff3b30","trash","Prośby o usunięcie imprez","Autorzy chcą usunąć swoje imprezy",'<span class="ios-bdg">'+evs.filter(x=>x.delete_req_at).length+'</span>','data-c="evdelreq"')]):'')
   +(canStealth()?gGrp("Moja widoczność",[iosIt("#636366","eye","Widoczny online",hideOnline?"Wyłączony: nikt nie widzi Cię w „online”. Ty widzisz wszystkich.":"Inni widzą Cię jako online",iosSw(!hideOnline,"data-ho",hideOnline?"0":"1"))]):'')
   +gGrp("Narzędzia",[gRow("#0a84ff","chart","Statystyki","Aktywność, jazdy, logowania","",'data-c="stats"'),
      fbOk?gRow("#bf5af2","msg","Zgłoszenia","Uwagi i błędy od użytkowników",fbN?'<span class="ios-bdg">'+fbN+'</span>':'','data-c="fbadmin"'):'',
      gRow("#30b0c7","users","Użytkownicy",isKingReal()?"Szukaj, filtruj, otwórz teczkę":"Szukaj, filtruj, karta osoby",'<span class="ios-v">'+Object.keys(nicks).length+'</span>','data-c="users"'),
      gRow("#5856d6","lock","Prywatność","Kto co widzi, ile osób co włączyło","",'data-c="privadm"'),
      gRow("#34c759","shield","Uprawnienia","Administratorzy"+(testerOk?" i testerzy":""),'<span class="ios-v">'+adminIds.filter(id=>nicks[id]).length+(testerOk?' / '+testerIds.size:'')+'</span>','data-c="perms"'),
      testerOk&&isSuper(uid)?gRow("#5e5ce6","flask","Funkcje testowe","Kto widzi nowe funkcje: nikt, testerzy, wszyscy","",'data-c="flags"'):'',
      genderOk?gRow("#ff2d55","palette","Kolory nicków","","",'data-c="colors"'):'',
      placeOk?gRow("#ff9f0a","pin","Miejsca zbiórki","",'<span class="ios-v">'+places.length+'</span>','data-c="places"'):''])
   +(isSuper(uid)?gGrp("Zaproszenia",[gRow("#30d158","eye","Wszystkie zaproszenia","Także prywatne i testowe",'<span class="ios-v">'+wantsAll.filter(w=>wantEnd(w).getTime()>Date.now()).length+'</span>','data-c="allw"'),
      gRow("#8e8e93","archive","Archiwum zaproszeń","Zakończone jazdy","",'data-c="karch"'),
      testOk?gRow("#ff3b30","trash","Usuń testowe zaproszenia","Tylko oznaczone 🧪 TEST — prawdziwe zostają","",'data-c="testdel"'):'']):'');
}
// 🛡️ → Uprawnienia: administratorzy i testerzy
function permsHtml(){
  const rows=adminIds.map(id=>'<div class="arow">'+nk(id)+(isSuper(id)?'<span class="note">👑 główny admin'+(id===uid?' (Ty)':'')+'</span>':id===uid?'<span class="note">(Ty)</span>':'<span class="arbtns">'+(stealthOk&&isSuper(uid)?'<button class="b g small'+(stealthIds.has(id)?' on':'')+'" data-a="stealth" data-id="'+esc(id)+'" title="Czy ten admin może ukryć swoją obecność online">'+(stealthIds.has(id)?'👻 może się ukryć ✓':'👻 ukrywanie: nie')+'</button>':'')+'<button class="b g small" data-a="rm" data-id="'+esc(id)+'">Odbierz uprawnienia</button></span>')+'</div>').join("")||'<div class="note">Brak.</div>';
  const cand=Object.keys(nicks).filter(id=>!adminIds.includes(id)).sort((a,b)=>nicks[a].localeCompare(nicks[b],"pl"));
  const add=cand.length
    ?'<select id="adminsel">'+cand.map(id=>'<option value="'+esc(id)+'">'+esc(nicks[id])+'</option>').join("")+'</select><button class="b sbtn" data-c="adminadd">Nadaj uprawnienia administratora</button>'
    :'<div class="note">Brak użytkowników z nickiem, którym można nadać uprawnienia.</div>';
  return '<button class="sback" data-c="backadmin">‹ Administracja</button>'
   +'<div class="sname" style="margin-top:26px">🛡️ Uprawnienia</div>'
   +'<div class="sleft"><h3>Administratorzy ('+adminIds.filter(id=>nicks[id]).length+')</h3>'+rows
   +(stealthOk&&isSuper(uid)?'<p class="note">👻 = admin może w Ustawieniach wyłączyć widoczność online (domyślnie każdy jest widoczny). Ty jako 👑 masz to zawsze.</p>':'')
   +add
   +'<p class="note">Administrator może edytować i usuwać każdą wieczorynkę, zgłoszenie i trasę oraz zarządzać administratorami.</p>'
   +testersHtml()+'</div>';
}
// 🛡️ → Użytkownicy: szukajka, filtry z licznikami, wiersz → teczka (👑) albo karta osoby
function usersHtml(){
  if(admSeen===null)loadAdmSeen();
  const ids=Object.keys(nicks).sort((a,b)=>nicks[a].localeCompare(nicks[b],"pl"));
  return (usersBack==="stats"?'<button class="sback" data-c="stats">‹ Statystyki</button>':'<button class="sback" data-c="backadmin">‹ Administracja</button>')
   +'<div class="sname" style="margin-top:26px">👥 Użytkownicy ('+ids.length+')</div>'
   +'<div class="sleft">'+(tgLinks?'<p class="note">✈️ = połączony bot Telegram. '+(isKingReal()?'Dotknij osoby — teczka.':'Dotknij osoby — karta z aktywnością.')+'</p>':'')
   +'<div class="admq"><input id="admq" type="search" class="srch" placeholder="Szukaj po nicku" value="'+esc(admQ)+'" autocomplete="off" enterkeyhint="search"><span class="note" id="admqn"></span></div>'
   +'<div class="fchips admqf">'+ADM_F.filter(([k])=>k!=="tg"||tgLinks).map(([k,tx])=>'<button type="button" class="fch'+(admF===k?' on':'')+'" data-admf="'+k+'">'+tx+(k?' <span class="fcn">'+((k==="a7"||k==="a30")&&admSeen===null?'…':admCount(k))+'</span>':'')+'</button>').join("")+'</div>'
   +'<div class="ulist">'+(ids.map(id=>'<button type="button" class="arow urow" data-a="urow" data-id="'+esc(id)+'" data-admu="'+esc(id)+'"'+(admMatch(id)?'':' style="display:none"')+'><span>'+nk(id)+(tgLinks&&tgLinks.has(id)?' <span class="tgm" title="Telegram połączony">✈️</span>':'')+(modBanned.has(id)?' <span class="tgm" title="Zablokowany">⛔</span>':'')+(modHidden.has(id)?' <span class="tgm" title="Ukryty">👻</span>':'')+(joinedAt[id]?'<br><span class="note">od '+esc(new Date(joinedAt[id]).toLocaleDateString("pl-PL",{day:"numeric",month:"short",year:"numeric"}))+'</span>':'')+'</span>'
      +'<span class="note">'+(id===uid?'(Ty) ':isSuper(id)?'👑 ':adminIds.includes(id)?'🛡️ ':'')+'<span class="ios-chev" aria-hidden="true">›</span></span></button>').join("")||'<div class="note">Brak użytkowników z nickiem.</div>')+'</div>'
   +'</div>';
}
/* 🧪 testerzy i funkcje testowe (KROK 16) — nadaje/odbiera i przełącza tylko 👑 */
function testersHtml(){
  if(!testerOk)return "";
  const king=isSuper(uid),ids=[...testerIds].filter(id=>nicks[id]).sort((a,b)=>nicks[a].localeCompare(nicks[b],"pl"));
  const rows=[...supers].filter(id=>nicks[id]&&!testerIds.has(id)).map(id=>'<div class="arow">'+nk(id)+'<span class="note">👑 automatycznie</span></div>').join("")
    +ids.map(id=>'<div class="arow">'+nk(id)+(king?'<button class="b g small" data-a="trm" data-id="'+esc(id)+'">Odbierz</button>':'')+'</div>').join("");
  const cand=Object.keys(nicks).filter(id=>!testerIds.has(id)&&!isSuper(id)).sort((a,b)=>nicks[a].localeCompare(nicks[b],"pl"));
  return '<h3>💉 Testerzy ('+ids.length+')</h3>'+(rows||'<div class="note">Brak testerów.</div>')
   +(king?(cand.length?'<select id="testersel">'+cand.map(id=>'<option value="'+esc(id)+'">'+esc(nicks[id])+'</option>').join("")+'</select><button class="b sbtn" data-c="testeradd">Nadaj prawa testera</button>':'')

     :'<p class="note">Prawa testera nadaje i odbiera tylko 👑 główny administrator.</p>')
   +'<p class="note">Tester widzi funkcje w fazie testów (z plakietką 🧪 BETA), zanim dostaną je wszyscy. 💉 przy nicku oznacza testera.</p>';
}
const FSTATE=[["off","Wyłączona"],["testers","Tylko testerzy"],["all","Wszyscy"]];
// 👤 przełącznik „Goście” (KROK 61) — tylko przy funkcjach, które gość może zobaczyć; działa przy stanie „Wszyscy”
const FLAG_GUESTS=["tab_events"];
function fGuestHtml(f){
  if(!FLAG_GUESTS.includes(f.key)||!("guests" in f))return "";
  const on=!!f.guests,all=f.state==="all";
  const sub=!all?'Działa tylko przy ustawieniu „Wszyscy”':on?'Widzą imprezy i liczbę jadących — bez nicków':'Nie widzą tej zakładki';
  return '<div class="fgst'+(all?'':' dis')+'"><span class="ios-ic" style="background:#0a84ff">'+uiIcon("user")+'</span><span class="ios-t">Goście (bez logowania)<small>'+sub+'</small></span>'
   +'<button type="button" class="ios-sw'+(on?' on':'')+'" role="switch" aria-checked="'+on+'" aria-label="Goście widzą zakładkę" data-fg="'+esc(f.key)+'" data-fgv="'+(on?0:1)+'"'+(all?'':' disabled')+'></button></div>';
}
const evGuest=()=>{const f=flags.tab_events;return !!f&&f.state==="all"&&!!f.guests};
let testDelN=null;
function testDelHtml(){
  return '<button class="sback" data-c="backadmin">‹ Administracja</button><div class="sname" style="margin-top:26px">🧹 Usuń testowe zaproszenia</div>'
   +'<div class="sleft"><div class="arow" style="flex-direction:column;align-items:flex-start;gap:4px"><b>'+(testDelN==null?'Liczę…':'Testowych zaproszeń: '+testDelN)+'</b>'
   +'<span class="note">Znikną na zawsze razem z dołączeniami, zaproszonymi, odpowiedziami i powiadomieniami. Prawdziwe zaproszenia (bez 🧪) zostają. Dziennik aktywności zostaje.</span></div>'
   +'<label for="gtdel" style="font-size:15px;margin-top:16px">Aby potwierdzić, wpisz <b>USUŃ</b></label><input id="gtdel" maxlength="10" autocomplete="off" autocapitalize="characters">'
   +'<div class="note" id="gtdelinfo" style="color:var(--bad)"></div>'
   +'<button class="b sbtn" style="background:var(--bad)" data-c="testdelgo"'+(testDelN?'':' disabled')+'>Usuń testowe zaproszenia</button></div>';
}
function flagsHtml(){
  const L=Object.values(flags).sort((a,b)=>a.name.localeCompare(b.name,"pl"));
  return '<button class="sback" data-c="backadmin">‹ Administracja</button>'
   +'<div class="sname" style="margin-top:26px">🚦 Funkcje testowe</div>'
   +'<div class="smail">Dla każdej funkcji: wyłączona, tylko dla testerów (🧪 BETA) albo dla wszystkich. Zmiana działa od razu, bez nowej wersji aplikacji.</div>'
   +'<div class="sleft">'+(L.length?'<div class="fgrps">'+L.map(f=>'<div class="ios-grp"><div class="ios-it ffl"><div class="ios-t"><b>'+esc(f.name)+'</b>'+(f.description?'<small>'+esc(f.description)+'</small>':'')+'</div>'
     +'<div class="ios-seg fseg">'+FSTATE.map(([k,t])=>'<button type="button" data-f="'+esc(f.key)+'" data-fs="'+k+'" class="fs-'+k+(f.state===k?' on':'')+'">'+({off:"Wyłączona",testers:"Testerzy",all:"Wszyscy"}[k]||t)+'</button>').join("")+'</div>'+fGuestHtml(f)+'</div></div>').join("")+'</div>'
     :'<div class="note">Na razie brak funkcji testowych. Każda nowa funkcja dopisuje się tutaj w swoim kroku SQL.</div>')
   +'<p class="note">Wyłączona — nikt nie widzi (także testerzy i 👑) · Testerzy — tylko 💉 testerzy i 👑, z plakietką BETA · Wszyscy — każdy (Imprezy: osoby bez logowania tylko przy 👤 Goście „Widzą”).</p></div>';
}
function colorsHtml(){
  const v=(m,d,k)=>HEX_RE.test(m[k]||"")?m[k]:d[k];
  const blk=(k,t)=>'<h3>'+t+'</h3>'
   +'<div class="crow"><span>Tekst</span><input type="color" id="col'+k+'" value="'+v(nickColors,DEF_COLORS,k)+'"></div>'
   +'<div class="crow"><span>Tło</span><label><input type="checkbox" id="nob'+k+'"'+(nickBgs[k]==="none"?" checked":"")+'> bez tła</label><input type="color" id="bg'+k+'" value="'+v(nickBgs,DEF_BGS,k)+'"></div>';
  return '<button class="sback" data-c="backadmin">‹ Administracja</button>'
   +'<div class="sname" style="margin-top:26px">🎨 Kolory nicków</div>'
   +'<div class="sleft">'+blk("K","👩 Kobiety")+blk("M","👨 Mężczyźni")
   +'<h3>Podgląd</h3><div class="cprev"><div style="background:#fff" id="pvL"></div><div style="background:#2c2c2e" id="pvD"></div></div>'
   +'<p class="note">Sprawdź, czy nicki są czytelne w trybie jasnym (góra) i ciemnym (dół). Szara pigułka to nick bez podanej płci. Zmiana działa u wszystkich po odświeżeniu danych (do 1 minuty).</p>'
   +'<div class="note" id="colinfo" style="color:var(--bad)"></div>'
   +'<button class="b sbtn" data-c="colsave">Zapisz kolory</button>'
   +'<button class="b sbtn g" data-c="coldef">Przywróć domyślne</button></div>';
}
const colVals=()=>({cK:$("colK").value,cM:$("colM").value,bK:$("nobK").checked?"none":$("bgK").value,bM:$("nobM").checked?"none":$("bgM").value});
function colorsPreview(){
  if(!$("colK"))return;
  const x=colVals();
  $("bgK").disabled=x.bK==="none";$("bgM").disabled=x.bM==="none";
  const html=pill("Ania",x.cK,x.bK)+pill("GAWRON",x.cM,x.bM)+pill("Kasia",x.cK,x.bK)+pill("Marek",x.cM,x.bM);
  $("pvL").innerHTML=html+pill("bez płci","#1d1d1f","#f2f2f7");
  $("pvD").innerHTML=html+pill("bez płci","#f5f5f7","#3a3a3c");
}
let unickId="";
function unickHtml(){
  return (tkFrom&&tkId===unickId?'<button class="sback" data-c="tkret">‹ Teczka</button>':'<button class="sback" data-c="backadmin">‹ Administracja</button>')
   +'<div class="sname" style="margin-top:26px">✏️ Zmień nick użytkownika</div>'
   +'<div class="smail">Obecny nick: '+nk(unickId)+'</div>'
   +'<div class="sleft"><label for="gunick" style="font-size:15px">Nowy nick</label>'
   +'<input id="gunick" maxlength="20" autocomplete="off" value="'+esc(nicks[unickId]||"")+'">'
   +'<p class="note">Użyj, gdy ktoś podszywa się pod inny nick albo nick jest nieodpowiedni. Wieczorynki zorganizowane przez tę osobę pokażą nowy nick.</p>'
   +'<div class="note" id="gunickinfo" style="color:var(--bad)"></div>'
   +'<button class="b sbtn" data-c="unicksave">Zapisz nick</button></div>';
}
let selGender="";
function nickHtml(){
  const first=!me.nick,incomplete=needProfile(),short=nickShort();
  if(!(first||incomplete||short))return nickEditHtml();   // ✏️ Edytuj profil — nowy układ w grupach
  const head=short?'<div class="sname">✏️ Wybierz nowy nick</div><div class="smail">Nick „'+esc(me.nick)+'” jest za krótki. Wybierz taki, który ma co najmniej 3 litery — żeby inni wiedzieli, kto jedzie.</div>'
     :first?'<div class="sname">👋 Wybierz swój nick</div><div class="smail">Witaj w PrzylesieGo! Nick widzą inni przy zapisach na wieczorynki i zgłoszeniach.</div>'
     :'<div class="sname">👋 Uzupełnij profil</div><div class="smail">Wybierz płeć — od niej zależy kolor Twojego nicku.</div>';
  const gsel=genderOk?'<label style="font-size:15px;margin-top:14px">Płeć (obowiązkowo)</label><div class="seg" id="gsex" style="margin-top:4px">'
     +["K","M"].map(sexBtn).join("")+'</div>':'';
  return head
   +'<div class="sleft"><label for="gnick" style="font-size:15px">'+(first?'Twój nick':'Nick')+'</label>'
   +'<input id="gnick" maxlength="20" autocomplete="off" value="'+esc(me.nick||"")+'" placeholder="np. GAWRON">'
   +'<p class="note">Najlepiej <b>imię + litera nazwiska</b> albo ksywka, np. <i>Ania K</i>, <i>Marek z Bielan</i>. Co najmniej 3 litery (bez inicjałów typu „AK”), do 20 znaków: litery, cyfry, spacja, kropka, _ lub -. Nick musi być unikalny; widzą go inni zalogowani.</p>'
   +'<div class="nsug hide" id="gnicksug"></div>'
   +gsel
   +'<div class="note" id="gnickinfo" style="color:var(--bad);margin-top:8px"></div>'
   +'<button class="b sbtn" data-c="nicksave">Zapisz</button></div>';
}
// ✏️ Edytuj profil: zdjęcie → Nick i płeć → Profil (miejscowość, telefon, media, jazdy, ulubieni, prywatność) → Powiadomienia → Konto → Zapisz
function nickEditHtml(){
  const rowIn=(col,ico,inner)=>'<label class="ios-it pe-row"><span class="ios-ic" style="background:'+col+'">'+uiIcon(ico)+'</span>'+inner+'</label>';
  const sex=genderOk?gGrp("Płeć",['<div class="ios-it pe-row"><span class="ios-ic" style="background:#ff2d55">'+uiIcon("users")+'</span><span class="ios-t">Płeć<small>Od niej zależy kolor nicku</small></span><span class="ios-seg" id="gsex">'
     +["K","M"].map(sexBtn).join("")+'</span></div>']):'';
  return '<button class="sback" data-c="back">‹ Ustawienia</button><div class="sname" style="margin-top:26px">'+(profExOk?'Edytuj profil':'Nick i płeć')+'</div>'+avEditHtml()
   +'<div class="sleft">'
   +'<div class="pe-nickline"><button type="button" class="lnk" data-c="nickopen" aria-expanded="'+nickOpen+'" aria-label="Zmień nick">'+esc((nickDraft!=null&&nickDraft.trim()?nickDraft:me.nick||"").trim())+' '+uiIcon("pencil")+'</button></div>'
   +(nickOpen?gGrp("Nick",[rowIn("#0a84ff","user",'<input class="pe-in" id="gnick" maxlength="20" autocomplete="off" value="'+esc(nickDraft!=null?nickDraft:me.nick||"")+'" placeholder="np. GAWRON" aria-label="Nick">')])
     +'<p class="note pe-note">Najlepiej <b>imię + litera nazwiska</b> albo ksywka, np. <i>Ania K</i>, <i>Marek z Bielan</i>. Co najmniej 3 litery, do 20 znaków: litery, cyfry, spacja, kropka, _ lub -. Nick musi być unikalny; widzą go inni zalogowani.</p>'
     +'<div class="nsug hide" id="gnicksug"></div>':'')
   +sex
   +profHubHtml()
   +gGrp("Konto",[gRow("#636366","key","Zmień hasło",esc(session&&session.user.email||""),'','data-c="pwd"')])
   +'<div class="note" id="gnickinfo" style="color:var(--bad);margin-top:8px"></div>'
   +'<button class="b sbtn" data-c="nicksave">Zapisz</button></div>';
}
// 🔑 zmiana hasła w profilu (decyzja właściciela 2026-11-17: najpierw obecne hasło; weryfikacja e-mail przy rejestracji — przed publicznym wydaniem)
function pwdHtml(){
  const f=(id,ph,ac)=>'<div class="pw" style="margin-top:8px"><input id="'+id+'" type="password" autocomplete="'+ac+'" placeholder="'+ph+'" maxlength="72"><button type="button" class="eye" data-eye="'+id+'" aria-label="Pokaż hasło" title="Pokaż / ukryj hasło">'+uiIcon("eye")+'</button></div>';
  return '<button class="sback" data-c="pwdback">‹ Profil</button><div class="sname" style="margin-top:26px">Zmień hasło</div>'
   +'<div class="smail">'+esc(session.user.email||"")+'</div>'
   +'<div class="sleft"><label for="gpw0" style="font-size:15px">Obecne hasło</label>'+f("gpw0","Obecne hasło","current-password")
   +'<label for="gpw1" style="font-size:15px;margin-top:14px;display:block">Nowe hasło</label>'+f("gpw1","Nowe hasło (min. 6 znaków)","new-password")+f("gpw2","Powtórz nowe hasło","new-password")
   +'<div class="note" id="gpwinfo" style="color:var(--bad);margin-top:8px"></div>'
   +'<button class="b sbtn" data-c="pwdsave">Zmień hasło</button>'
   +'<p class="note" style="margin-top:12px">Nie pamiętasz obecnego hasła? Wyloguj się i na ekranie logowania kliknij „Nie pamiętam hasła” — link przyjdzie na Twój e-mail.</p></div>';
}
async function pwdSave(btn){
  const a=$("gpw0").value,b=$("gpw1").value,c=$("gpw2").value,inf=$("gpwinfo");inf.textContent="";
  if(!a){inf.textContent="Wpisz obecne hasło.";return}
  if(b.length<6){inf.textContent="Nowe hasło musi mieć co najmniej 6 znaków.";return}
  if(b!==c){inf.textContent="Nowe hasła się różnią — wpisz to samo dwa razy.";return}
  if(b===a){inf.textContent="Nowe hasło musi być inne niż obecne.";return}
  btn.disabled=true;btn.textContent="Sprawdzam…";
  const done=()=>{btn.disabled=false;btn.textContent="Zmień hasło"};
  try{
    const r=await sb.auth.signInWithPassword({email:session.user.email,password:a});   // sprawdzenie obecnego hasła
    if(r.error){done();inf.textContent=/invalid|credentials/i.test(r.error.message||"")?"Obecne hasło jest nieprawidłowe.":"Nie udało się sprawdzić hasła: "+r.error.message;return}
    btn.textContent="Zapisuję…";
    const u=await sb.auth.updateUser({password:b});
    if(u.error){done();const m=u.error.message||"",k=u.error.code||"";
      inf.textContent=k==="same_password"||/different/i.test(m)?"Nowe hasło musi być inne niż obecne."
        :k==="weak_password"||/weak|short/i.test(m)?"Hasło jest za słabe — dodaj więcej znaków, cyfry albo znaki specjalne."
        :"Nie udało się zmienić hasła: "+m;return}
  }catch(e){done();inf.textContent="Brak połączenia — spróbuj jeszcze raz.";return}
  gearView="nick";renderGear();say("✅ Hasło zmienione. Przy następnym logowaniu użyj nowego.");
}
const lastAdmin=()=>isAdmin&&adminIds.length<=1;
// 👁 podgląd aplikacji dla 👑 (decyzja właściciela 2026-11-17 05:37–05:44): pv = "" | "user" | "tester"; gość — osobna karta ?jako=gosc
let pv="";const PV_GUEST=/[?&]jako=gosc(&|$)/.test(location.search);
// 🧪 kilka kont naraz w jednej przeglądarce (karty): ?konto=2 / ?konto=ania — osobne miejsce na zalogowanie,
// nie rusza logowania bez tego dopisku ani innych wartości „konto”; tylko litery/cyfry/_-, max 12 znaków
const KONTO=(location.search.match(/[?&]konto=([A-Za-z0-9_-]{1,12})(&|$)/)||[])[1]||"";
let supers=new Set();const isSuper=id=>supers.has(id)&&!(pv&&id===uid);const isKingReal=()=>!!session&&supers.has(uid);
/* 🔔 Telegram w prywatnej wiadomości (KROK 18, funkcja testowa telegram_dm) */
let tgOk=false,tgLink=null,tgCode="",tgPoll=null,tgPollEnd=0;
const tgOn=()=>!!session&&tgOk&&feat("telegram_dm");
/* 🧪 testerzy i funkcje testowe (KROK 16) */
let testerIds=new Set(),testerOk=false,flags={},flagsReady=false,betaOn=true;
try{betaOn=localStorage.getItem("betaOn")!=="0"}catch(e){}
const meTester=()=>!!session&&(pv?pv==="tester":(testerIds.has(uid)||isSuper(uid)));
// czy pokazać funkcję o danym kluczu: „Wszyscy” albo „Tylko testerzy” + tester z włączonym podglądem
const feat=k=>{const f=flags[k];return !!f&&(f.state==="all"||(f.state==="testers"&&meTester()&&(betaOn||pv==="tester")))};
// plakietka 🧪 BETA przy funkcji, która nie jest jeszcze dla wszystkich
const betaTag=k=>flags[k]&&flags[k].state!=="all"?'<span class="beta">🧪 BETA</span>':'';
// zakładki pod przełącznikiem (KROK 17): brak wpisu w bazie = widoczna dla wszystkich (jak dotąd)
const TAB_FLAG={1:"tab_rides",2:"tab_advanced",3:"tab_events"};
// do czasu wczytania przełączników zakładki pod przełącznikiem są ukryte (bez mignięcia przy odświeżaniu)
const tabOk=i=>{const k=TAB_FLAG[i];if(k&&!flagsReady)return false;if(i===2&&!session)return false;if(i===3&&!session&&!evGuest())return false;if(i===3&&!flags[k])return false;return !k||!flags[k]||feat(k)};
const visTabs=()=>[0,3,1,2].filter(tabOk);
function delHtml(){
  const head='<button class="sback" data-c="back">‹ Ustawienia</button><div class="sname" style="margin-top:26px">🗑️ Usuń konto</div>';
  if(isSuper(uid))return head+'<div class="sleft"><div class="changed">👑 Jesteś głównym administratorem PrzylesieGo — tego konta nie można usunąć.</div></div>';
  if(lastAdmin())return head+'<div class="sleft"><div class="changed">Jesteś jedynym administratorem, więc nie możesz usunąć konta. Najpierw nadaj komuś uprawnienia administratora (Ustawienia → 🛡️ Administracja).</div></div>';
  return head+'<div class="sleft">'
   +'<h3>Zostanie usunięte na zawsze</h3><ul><li>konto i adres e-mail</li><li>nick i płeć</li><li>zapisy na wieczorynki</li><li>zaproszenia „Idziemy na rower?” i dołączenia</li>'+(fbOk?'<li>Twoje zgłoszenia, oceny i wiadomości</li>':'')+''+(tgLink?'<li>połączenie z Telegramem</li>':'')+(isAdmin?'<li>uprawnienia administratora</li>':'')+'</ul>'
   +'<h3>Zostanie</h3><ul><li>wieczorynki, które organizujesz (z Twoim nickiem jako organizatorem)</li><li>trasy dodane do biblioteki</li></ul>'
   +'<label for="gdel" style="font-size:15px;margin-top:16px">Aby potwierdzić, wpisz <b>USUŃ</b></label>'
   +'<input id="gdel" maxlength="10" autocomplete="off" autocapitalize="characters">'
   +'<div class="note" id="gdelinfo" style="color:var(--bad)"></div>'
   +'<button class="b sbtn" style="background:var(--bad)" data-c="delgo">Usuń konto na zawsze</button></div>';
}
let userId="",userBack="";
/* potwierdzenie usuwania słowem USUŃ (zaproszenia, wieczorynki, trasy) */
let delReq=null;
function askDelete(kind,id){
  let r={kind,id},own=false,joined=0;
  if(kind==="want"){const w=wants.find(x=>x.id===id);if(!w)return;own=w.user_id===uid;joined=(joins[id]||[]).filter(x=>x!==w.user_id).length;
    r.title=own?"Odwołać zaproszenie?":"Usunąć zaproszenie?";r.author=w.user_id;r.what=wfLabel(new Date(w.starts_at))+(w.note?" · "+w.note:"");r.extra=joined?"Dołączyło: "+joined+" — ich zgłoszenia też znikną.":"Nikt jeszcze nie dołączył.";}
  if(kind==="ride"){const x=sorted.find(y=>y.id===id);if(!x)return;own=x.creator===uid;const g=(rsvps[id]||[]).length;
    r.title="Usunąć wieczorynkę?";r.author=x.creator;r.what=x.title+" · "+fmtWhen(x.when);r.extra="Zapisanych: "+g+" — ich zapisy znikną. Tej operacji nie można cofnąć.";}
  if(kind==="route"){const l=lib.find(y=>y.id===id);if(!l)return;own=l.creator===uid;
    r.title="Usunąć trasę z biblioteki?";r.author=l.creator;r.what=l.title+(l.km!=null?" · "+Number(l.km).toFixed(1)+" km":"");r.extra="Wieczorynki, które jej użyły, zachowają swoją kopię trasy.";}
  r.own=own;
  // wariant B: własne zaproszenie bez dołączonych — zwykłe potwierdzenie
  if(kind==="want"&&own&&!joined){askOk("Odwołać zaproszenie na "+r.what+"?","Odwołaj",1).then(ok=>{if(ok)doDelete(r)});return}
  delReq=r;gearOpen=true;gearView="confdel";renderGear();
  const i=$("gconf");if(i)i.focus();
}
function confDelHtml(){
  const r=delReq;
  return '<div class="sname">🗑️ '+esc(r.title)+'</div>'
   +'<div class="sleft">'
   +(r.own?'':'<div class="changed" style="margin-top:12px">⚠️ Usuwasz cudzy wpis'+(nicks[r.author]?' — autor: '+nk(r.author):'')+'</div>')
   +'<div class="arow" style="flex-direction:column;align-items:flex-start;gap:4px;margin-top:6px"><b>'+esc(r.what)+'</b><span class="note">'+esc(r.extra)+'</span></div>'
   +'<label for="gconf" style="font-size:15px;margin-top:16px">Aby potwierdzić, wpisz <b>USUŃ</b></label>'
   +'<input id="gconf" maxlength="10" autocomplete="off" autocapitalize="characters">'
   +'<div class="note" id="gconfinfo" style="color:var(--bad)"></div>'
   +'<button class="b sbtn" style="background:var(--bad)" data-c="confgo">'+(r.kind==="want"&&r.own?"Odwołaj zaproszenie":"Usuń na zawsze")+'</button></div>';
}
async function doDelete(r){
  const tbl={want:"wants",ride:"rides",route:"routes"}[r.kind];
  try{
    const res=await sb.from(tbl).delete().eq("id",r.id);
    if(res.error)throw res.error;
    if(r.kind==="ride")delete routeCache[r.id];
    if(r.kind==="route")delete libCache[r.id];
    if(r.kind==="want")closeWantForm();
    gearOpen=false;delReq=null;
    await syncNow();
    say(r.kind==="want"?(r.own?"Zaproszenie odwołane.":"Zaproszenie usunięte."):r.kind==="ride"?"Wieczorynka usunięta.":"Trasa usunięta.");
  }catch(err){
    const i=$("gconfinfo");const m="Nie udało się: "+(err&&err.message?err.message:"błąd");
    if(i)i.textContent=m;else say(m);
  }
}
async function confirmDelete(){
  const i=$("gconf");if(!i||!delReq)return;
  if(i.value.trim().toUpperCase()!=="USUŃ"){$("gconfinfo").textContent="Wpisz słowo USUŃ, aby potwierdzić.";return}
  await doDelete(delReq);
}
const starBtn=id=>'<button class="starb'+(isFav(id)?' on':'')+'" data-a="fav" data-id="'+esc(id)+'" title="'+(isFav(id)?'Usuń z ulubionych':'Dodaj do ulubionych')+'">'+(isFav(id)?'⭐':'☆')+'</button>';
let favsSnap=null;   // porządek listy Ulubieni zamrożony na czas otwarcia widoku: po kliknięciu gwiazdki wiersze się nie przesuwają (czyści renderGear przy zamknięciu/zmianie widoku)
function favsHtml(){
  if(!favsSnap)favsSnap=new Set(favs);
  const ids=Object.keys(nicks).filter(id=>id!==uid).sort((a,b)=>((favsSnap.has(b)?1:0)-(favsSnap.has(a)?1:0))||nicks[a].localeCompare(nicks[b],"pl"));
  return ''+backBtn()+'<div class="sname" style="margin-top:26px">⭐ Ulubieni</div>'
   +'<div class="smail">Tylko Ty widzisz, kogo masz w ulubionych. Ulubieni są na początku list i widać ich w nagłówkach dni.</div>'
   +'<div class="sleft">'+(ids.map(id=>'<div class="arow">'+nk(id)+starBtn(id)+'</div>').join("")||'<div class="note">Brak innych użytkowników z nickiem.</div>')+'</div>';
}
/* 🗓 data dołączenia (KROK 25): „Z nami od 12 marca 2026 · 245 dni” */
let joinedAt={};
/* 👤 profil (KROK 50): zdjęcie i media w profiles (widzą zalogowani), telefon i miejscowość w profile_private (user_extra) */
let profExOk=false,avAt={},medias={},avData={},myPriv=null,uxCache={},pe=null;
try{avData=JSON.parse(localStorage.getItem("avc")||"{}")||{}}catch(e){avData={}}
const avImg=(id,cls)=>avData[id]&&avData[id].d?'<img class="'+cls+'" src="'+avData[id].d+'" alt="" aria-hidden="true">':'';
const MEDIA=[["strava","strava","Strava","#fc4c02","strava.com/athletes/…"],["instagram","ig","Instagram","#c13584","@nazwa albo link"],["youtube","yt","YouTube","#ff0000","@kanał albo link"],["facebook","fb","Facebook","#1877f2","link albo nazwa"],["www","globe","Strona www","#636366","adres strony"]];
function mediaUrl(k,v){
  v=String(v||"").trim();if(!v)return "";
  if(/^https?:\/\//i.test(v))v=v.replace(/^http:/i,"https:");
  else if(/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)&&!/^@/.test(v))v="https://"+v;
  else{const u=v.replace(/^@/,"").replace(/\s+/g,"");if(!u)return "";
    v=k==="strava"?"https://www.strava.com/athletes/"+u:k==="instagram"?"https://instagram.com/"+u:k==="youtube"?"https://youtube.com/@"+u:k==="facebook"?"https://facebook.com/"+u:"https://"+u}
  return /^https:\/\/[^\s<>"]+$/.test(v)&&v.length<=200?v:null;
}
const mediaShow=u=>String(u||"").replace(/^https:\/\/(www\.)?/,"").replace(/\/$/,"");
async function loadAvatars(){
  if(!profExOk)return;
  const need=Object.keys(avAt).filter(id=>avAt[id]&&(!avData[id]||avData[id].t!==avAt[id]));
  Object.keys(avData).forEach(id=>{if(!avAt[id])delete avData[id]});
  for(let i=0;i<need.length;i+=40){
    const r=await sb.from("profiles").select("user_id,avatar,avatar_at").in("user_id",need.slice(i,i+40));
    if(!r.error)(r.data||[]).forEach(x=>{if(x.avatar)avData[x.user_id]={t:x.avatar_at,d:x.avatar};else delete avData[x.user_id]});
  }
  try{localStorage.setItem("avc",JSON.stringify(avData))}catch(e){}
  if(need.length){try{renderWants();renderBell();if(gearOpen)renderGear()}catch(e){}}
}
async function loadMyPriv(){
  if(!session)return;
  await loadPrivFlags();   // 🔒 KROK 62
  const r=await sb.from("profile_private").select("phone,phone_vis,city,city_lat,city_lon,city_vis").eq("user_id",uid).maybeSingle();
  if(r.error){profExOk=false;return}
  profExOk=true;myPriv=r.data||null;
  // Moja miejscowość z profilu — na nowym telefonie
  if(myPriv&&myPriv.city&&myPriv.city_lat!=null&&!homeGet()){try{localStorage.setItem("home",JSON.stringify({name:myPriv.city,lat:myPriv.city_lat,lon:myPriv.city_lon}))}catch(e){}}
}
async function savePrivCity(h){
  if(!profExOk||!session)return;
  const row={user_id:uid,city:h?h.name.slice(0,80):null,city_lat:h?h.lat:null,city_lon:h?h.lon:null,updated_at:new Date().toISOString()};
  const r=await sb.from("profile_private").upsert(row,{onConflict:"user_id"}).select("phone,phone_vis,city,city_lat,city_lon,city_vis").maybeSingle();
  if(!r.error)myPriv=r.data;
}
async function loadUx(id){if(!profExOk||!session||!id)return;const r=await sb.rpc("user_extra",{u:id});uxCache[id]=r.error?{}:(r.data||{});if(gearOpen&&(gearView==="user"||gearView==="teczka")&&userId===id)renderGear()}
// zdjęcie z galerii → kwadrat 256 px (środek), JPEG do ~45 KB
function avFromFile(f){return new Promise((res,rej)=>{
  if(!f||!/^image\//.test(f.type||"image/"))return rej(new Error("To nie jest zdjęcie."));
  const img=new Image(),url=URL.createObjectURL(f);
  img.onload=()=>{try{const S=256,c=document.createElement("canvas");c.width=S;c.height=S;const x=c.getContext("2d"),m=Math.min(img.naturalWidth,img.naturalHeight);
      x.drawImage(img,(img.naturalWidth-m)/2,(img.naturalHeight-m)/2,m,m,0,0,S,S);URL.revokeObjectURL(url);
      let q=.8,d=c.toDataURL("image/jpeg",q);while(d.length>45000&&q>.35){q-=.1;d=c.toDataURL("image/jpeg",q)}
      if(d.length>58000)return rej(new Error("Zdjęcie jest za duże."));res(d)}catch(e){rej(e)}};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("Nie udało się wczytać zdjęcia."))};img.src=url})}
function peStart(){pe={av:avData[uid]?avData[uid].d:null,avCh:false,media:Object.assign({},medias[uid]||{}),phone:myPriv&&myPriv.phone||"",pvis:myPriv&&myPriv.phone_vis||"off",cvis:!!(myPriv&&myPriv.city_vis)}}
// przełącznik płci: grafika Wenus / Mars + litera K / M (wspólny dla Edytuj profil i pierwszego uzupełniania profilu)
const sexBtn=k=>{   // kolory jak na etykietach nicków (⚙️ → Administracja → Kolory nicków): --gc tekst, --gb tło; wybrana (.on) ma obrys i pełną widoczność — styl w css, więc przełącza się od razu po kliknięciu
  const c=HEX_RE.test(nickColors[k]||"")?nickColors[k]:DEF_COLORS[k],b=nickBgs[k]==="none"?"transparent":(HEX_RE.test(nickBgs[k]||"")?nickBgs[k]:DEF_BGS[k]),on=selGender===k,nm=k==="K"?"Kobieta":"Mężczyzna";
  return '<button type="button" data-g="'+k+'" class="'+(on?"on":"")+'" style="--gc:'+c+';--gb:'+b+'" title="'+nm+'" aria-label="'+nm+'">'+uiIcon(k==="K"?"venus":"mars")+" "+k+'</button>';
};
let nickOpen=false,nickDraft=null;   // Edytuj profil: nick jako tekst pod zdjęciem; pole rozwija się po kliknięciu
let mediaOpen=false;   // „Moje media” w Edytuj profil: domyślnie zwinięte
// wiersze do grupy „Profil” w Edytuj profil: miejscowość (+ pokazuj innym), telefon (+ pokazuj innym), Moje media (rozwijane)
function profExRows(){
  if(!profExOk||!pe)return [];
  const h=homeGet(),tg=(k,on)=>'<button type="button" class="tgl'+(on?' on':'')+'" data-pet="'+k+'" role="switch" aria-checked="'+on+'"><span></span></button>';
  const filled=MEDIA.filter(m=>pe.media[m[0]]).length;
  const rows=[
    gRow("#ff9f0a","pin","Miejscowość","Do „najbliżej” w trasach i „W okolicy”",'<span class="ios-v">'+(h?esc(h.name):'Ustaw')+'</span>','data-home="1"'),
    '<div class="ios-it pe-row"><span class="ios-t">Pokazuj innym<small>Miejscowość — domyślnie ukryta</small></span>'+tg("cvis",pe.cvis)+'</div>',
    '<label class="ios-it pe-row"><span class="ios-ic" style="background:#30d158">'+uiIcon("phone")+'</span><input class="pe-in" data-pe="phone" value="'+esc(pe.phone)+'" placeholder="Telefon, np. +48 600 123 456" aria-label="Telefon" inputmode="tel" autocomplete="tel" maxlength="20"></label>',
    '<div class="ios-it pe-row"><span class="ios-t">Pokazuj innym<small>Telefon — przycisk „Zadzwoń / SMS” na Twojej karcie</small></span>'+tg("pvis",pe.pvis!=="off")+'</div>'];
  if(pe.pvis!=="off")rows.push('<div class="pe-seg"><div class="seg">'+[["fav",uiIcon("star")+" Tylko ulubieni"],["all","Wszyscy zalogowani"]].map(([k,t])=>'<button type="button" data-pev="'+k+'" class="'+(pe.pvis===k?"on":"")+'">'+t+'</button>').join("")+'</div>'
    +(pe.pvis==="fav"?'<p class="note pe-note" style="margin:6px 0 0">„Ulubieni” = osoby, które <b>Ty</b> masz w ⭐ ulubionych.</p>':'')+'</div>');
  rows.push('<button type="button" class="ios-it ios-row" data-pet="mopen" aria-expanded="'+mediaOpen+'"><span class="ios-ic" style="background:#bf5af2">'+uiIcon("link")+'</span><span class="ios-t">Moje media<small>Strava, Instagram, YouTube… (opcjonalnie)</small></span>'
    +(filled?'<span class="ios-v">'+filled+'</span>':'')+'<span class="ios-chev" aria-hidden="true"'+(mediaOpen?' style="transform:rotate(90deg)"':'')+'>›</span></button>');
  if(mediaOpen)MEDIA.forEach(([k,ic,t,col,ph])=>rows.push('<label class="ios-it pe-row"><span class="ios-ic" style="background:'+col+'">'+uiIcon(ic)+'</span><input class="pe-in" data-pe="'+k+'" value="'+esc(pe.media[k]?mediaShow(pe.media[k]):"")+'" placeholder="'+esc(t+" — "+ph)+'" aria-label="'+esc(t)+'" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" maxlength="200"></label>'));
  return rows;
}
function avEditHtml(){
  if(!profExOk||!pe)return "";
  const n=me.nick||"?";
  return '<div class="pe-av"><button type="button" class="pe-avb" data-c="pephoto" aria-label="Zmień zdjęcie">'+(pe.av?'<img src="'+pe.av+'" alt="">':'<span class="gav'+(genders[uid]==="K"?' k':'')+'">'+esc(n.charAt(0).toUpperCase())+'</span>')+'<span class="pe-cam">'+uiIcon("cam")+'</span></button>'
   +'<div class="pe-avl"><button type="button" class="lnk" data-c="pephoto">'+(pe.av?'Zmień zdjęcie':'Dodaj zdjęcie')+'</button>'+(pe.av?'<button type="button" class="lnk pe-rm" data-c="pephotodel">Usuń</button>':'')+'</div>'
   +'<input type="file" id="pefile" accept="image/*" class="hide"></div>';
}
document.addEventListener("input",e=>{const t=e.target;if(!pe||!t.matches||!t.matches(".pe-in"))return;const k=t.dataset.pe;if(!k)return;if(k==="phone")pe.phone=t.value;else pe.media[k]=t.value});
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-pet],[data-pev]");if(!t||!pe||!t.closest(".sheetbox"))return;
  if(t.dataset.pet==="mopen")mediaOpen=!mediaOpen;
  else if(t.dataset.pet==="cvis"){if(!homeGet()&&!pe.cvis){say("Najpierw ustaw miejscowość.");return}pe.cvis=!pe.cvis}
  else if(t.dataset.pet==="pvis")pe.pvis=pe.pvis==="off"?"fav":"off";
  else if(t.dataset.pev)pe.pvis=t.dataset.pev;
  const sb2=t.closest(".sheetbox"),y=sb2?sb2.scrollTop:0;renderGear();const s3=document.querySelector("#gearsheet .sheetbox,.sheetbox");if(s3)s3.scrollTop=y;
});
document.addEventListener("change",async e=>{if(e.target.id!=="pefile"||!pe)return;const f=e.target.files&&e.target.files[0];if(!f)return;
  try{pe.av=await avFromFile(f);pe.avCh=true;renderGear()}catch(err){say(err.message||"Nie udało się wczytać zdjęcia.")}});
async function saveProfEx(){
  if(!profExOk||!pe)return true;
  const info=$("gnickinfo"),med={};
  for(const [k,,t] of MEDIA){const v=pe.media[k];if(!v)continue;const u=mediaUrl(k,v);if(u===null){if(info)info.textContent=t+": niepoprawny link albo nazwa.";return false}if(u)med[k]=u}
  const ph=String(pe.phone||"").replace(/\s+/g," ").trim();
  if(ph&&!/^\+?[0-9 ()-]{6,20}$/.test(ph)){if(info)info.textContent="Telefon: same cyfry (może być + na początku), np. +48 600 123 456.";return false}
  if(pe.pvis!=="off"&&!ph){if(info)info.textContent="Wpisz telefon albo wyłącz „Pokazuj innym”.";return false}
  const row={media:Object.keys(med).length?med:null};if(pe.avCh)row.avatar=pe.av||null;
  const changedPub=pe.avCh||JSON.stringify(row.media||{})!==JSON.stringify(medias[uid]||{});
  if(changedPub){const r=await sb.from("profiles").update(row).eq("user_id",uid).select("user_id,avatar_at");
    if(r.error){if(info)info.textContent=/BANNED/.test(r.error.message||"")?"Konto zablokowane.":"Nie udało się zapisać profilu: "+r.error.message;return false}
    medias[uid]=row.media||{};if(pe.avCh){const t=r.data&&r.data[0]&&r.data[0].avatar_at;if(pe.av){avData[uid]={t,d:pe.av};avAt[uid]=t}else{delete avData[uid];delete avAt[uid]}try{localStorage.setItem("avc",JSON.stringify(avData))}catch(e){}}}
  const h=homeGet(),prv={user_id:uid,phone:ph||null,phone_vis:ph?pe.pvis:"off",city_vis:!!(pe.cvis&&h),city:h?h.name.slice(0,80):null,city_lat:h?h.lat:null,city_lon:h?h.lon:null,updated_at:new Date().toISOString()};
  const o=myPriv||{},chPriv=prv.phone!==(o.phone||null)||prv.phone_vis!==(o.phone_vis||"off")||prv.city_vis!==!!o.city_vis||prv.city!==(o.city||null);
  if(chPriv){const r=await sb.from("profile_private").upsert(prv,{onConflict:"user_id"}).select("phone,phone_vis,city,city_lat,city_lon,city_vis").maybeSingle();
    if(r.error){if(info)info.textContent="Nie udało się zapisać telefonu / miejscowości: "+r.error.message;return false}myPriv=r.data}
  if(changedPub||chPriv){delete uxCache[uid];say("Profil zapisany ✔")}
  return true;
}
// 🟢 kto jest teraz w aplikacji (dotknięcie „N online”)
// 🛡️ admin: kto połączył Telegram (KROK 32) i aktywność osoby
let stealthOk=false,stealthIds=new Set(),hideOnline=(()=>{try{return localStorage.getItem("hideOnline")==="1"}catch(e){return false}})();
const canStealth=()=>!!session&&isAdmin&&(isSuper(uid)||stealthIds.has(uid));
const stealthOn=()=>canStealth()&&hideOnline;
function applyPresence(){if(!presCh)return;try{stealthOn()?presCh.untrack():presCh.track({t:Date.now()})}catch(e){}}
const stealthHtml=()=>canStealth()?'<div class="note" style="margin-top:14px">Pokazuj mnie jako online (🛡️ admin)</div><div class="seg">'+[["0","Tak"],["1","Nie — niewidoczny 👻"]].map(([k,t])=>'<button data-ho="'+k+'" class="'+((hideOnline?"1":"0")===k?"on":"")+'">'+t+'</button>').join("")+'</div><div class="note" style="margin-top:6px">'+(hideOnline?'Inni nie widzą Cię w „online” ani zielonej obwódki. Ty widzisz wszystkich.':'Domyślnie jesteś widoczny jak wszyscy.')+'</div>':'';
let modDelId="",modOk=false,modBanned=new Set(),modHidden=new Set(),modPrev=null,modBusy=false;
const modGone=id=>id!==uid&&(modBanned.has(id)||modHidden.has(id));
let tgLinks=null,admInfo={},tgLoading=false,onlBack="";
async function loadTgLinks(){if(!isAdmin)return;try{const r=await sb.rpc("admin_tg_links");tgLinks=r.error?null:new Map((r.data||[]).map(x=>[x.user_id,x.linked_at]))}catch(e){tgLinks=null}}
async function loadAdmInfo(id){
  try{const r=await sb.rpc("admin_user_info",{u:id});admInfo[id]=r.error?{err:1}:r.data||{}}catch(e){admInfo[id]={err:1}}
  if(gearOpen&&gearView==="user"&&userId===id)renderGear();
}
const ACT_TXT={want_public:"🌍 zaprosił(a) wszystkich",want_private:"🔒 zaprosił(a) wybranych",want_join:"🙋 dołączył(a) do jazdy",want_leave:"👋 zrezygnował(a) z jazdy",invite_sent:"➕ doprosił(a) kogoś",ride_created:"🗺️ utworzył(a) wieczorynkę",ride_join:"🚴 zapisał(a) się na wieczorynkę",ride_leave:"↩︎ wypisał(a) się z wieczorynki",route_added:"🗺️ dodał(a) trasę",route_chosen:"🧭 wybrał(a) trasę z bazy",route_rated:"⭐ ocenił(a) trasę",want_deleted:"🗑 usunął(a) zaproszenie"};
function admInfoHtml(id){
  const a=admInfo[id];
  if(!a)return '<div class="admbox"><b>🛡️ Dla admina</b><div class="note">Ładuję…</div></div>';
  if(a.err)return '<div class="admbox"><b>🛡️ Dla admina</b><div class="note">Brak danych — uruchom KROK 32 w bazie.</div></div>';
  const st=a.stats||{},n=k=>st[k]||0,c=(v,l)=>'<div class="st"><b>'+v+'</b><span>'+l+'</span></div>';
  return '<div class="admbox"><b>🛡️ Dla admina</b>'
   +'<div class="admln">👁 Ostatnio w aplikacji: <b>'+(onlineIds.includes(id)?'teraz 🟢':a.last_seen?esc(agoTxt(a.last_seen)):'—')+'</b></div>'
   +'<div class="admln">✈️ Telegram: <b>'+(a.tg_linked_at?'połączony od '+esc(new Date(a.tg_linked_at).toLocaleDateString("pl-PL",{day:"numeric",month:"short"})):'nie połączony')+'</b></div>'
   +'<div class="stats admst">'+c(n("want_public")+n("want_private"),"zaproszeń")+c(n("want_join"),"dołączeń")+c(n("want_leave"),"rezygnacji")+c(n("invite_sent"),"doproszeń")+'</div>'
   +((a.recent||[]).length?'<div class="admrec">'+a.recent.map(x=>'<div><span>'+esc(ACT_TXT[x.kind]||x.kind)+'</span><span class="note">'+esc(agoTxt(x.at))+'</span></div>').join("")+'</div>':'<div class="note">Brak wpisów w dzienniku.</div>')
   +'</div>';
}
document.addEventListener("click",e=>{if(!e.target.closest("#onlbtn,#honl")||!session)return;e.preventDefault();e.stopPropagation();onlBack="";gearOpen=true;gearView="online";renderGear()},true);
function modDelHtml(){
  const p=modPrev,li=(n,t)=>n?'<li>'+t+'</li>':'';
  return '<button class="sback" data-c="userback2m">‹ '+esc(nickOf(modDelId))+'</button><div class="sname" style="margin-top:26px">🗑 Usuń konto</div>'
   +'<div class="bigpill">'+nk(modDelId)+'</div><div class="sleft">'
   +(!p?'<div class="note">Sprawdzam, co zniknie…</div>':p.err?'<div class="changed">'+esc(p.err)+'</div>'
     :'<div class="changed">⚠️ Tego nie da się cofnąć. Zniknie:<ul>'+'<li>konto, nick i dane logowania</li>'
       +li(p.wants,'zaproszenia: '+p.wants)+li(p.joins,'dołączenia do jazd: '+p.joins)+li(p.notifications,'powiadomienia: '+p.notifications)
       +li(p.feedback,'zgłoszenia i wiadomości: '+p.feedback)+li(p.telegram,'połączenie z Telegramem')+'<li>wpisy w dzienniku aktywności, ulubieni</li></ul>'
       +'Wieczorynki i trasy zostają (bez autora).</div>')
   +(p&&p.admin?'<p class="note">To administrator — najpierw odbierz mu uprawnienia.</p>'
     :'<input id="moddelw" placeholder="wpisz USUŃ" autocomplete="off" style="margin-top:12px"><button class="b sbtn" style="background:var(--bad)" data-a="moddelgo" data-id="'+esc(modDelId)+'"'+(modBusy||!p||p.err?' disabled':'')+'>🗑 Usuń konto na zawsze</button>')
   +'</div>';
}
// ⛔ ekran dla zablokowanego konta
function renderBan(){
  let b=$("banscreen");const on=!!session&&modOk&&modBanned.has(uid);
  if(!on){if(b)b.remove();return}
  if(!b){b=document.createElement("div");b.id="banscreen";document.body.appendChild(b);
    b.addEventListener("click",e=>{const k=e.target.closest("[data-ban]");if(!k)return;
      if(k.dataset.ban==="fb"){gearOpen=true;gearView=fbOk?"fb":"main";renderGear()}
      if(k.dataset.ban==="out"){setGuest(false);if(sb)sb.auth.signOut();renderChrome()}})}
  b.innerHTML='<div class="banbox"><div style="font-size:44px">⛔</div><h2>Konto zablokowane</h2><p>Administrator zablokował to konto. Nie możesz teraz zapraszać ani dołączać do jazd.</p><p>Jeśli to pomyłka — napisz do administratora.</p>'
   +(fbOk?'<button class="b big" data-ban="fb">💬 Napisz do administratora</button>':'')
   +'<button class="lnk" data-ban="out" style="display:block;margin:14px auto 0">Wyloguj</button></div>';
}
// 👁 wszystkie aktualne zaproszenia — tylko podgląd dla 👑 (także prywatne, testowe, ukrytych i zablokowanych)
function allWantsHtml(){
  const L=wantsAll.filter(w=>wantEnd(w).getTime()>Date.now()).sort((a,b)=>wantStart(a)-wantStart(b));
  const n=f=>L.filter(f).length,tag=(c,t)=>'<span class="awt '+c+'">'+t+'</span>';
  const head='<button class="sback" data-c="backadm">‹ Administracja</button><div class="sname" style="margin-top:26px">👁 Wszystkie zaproszenia</div>'
   +'<div class="note" style="text-align:center">'+L.length+' aktualnych · 🔒 '+n(w=>w.visibility==="private")+' prywatnych · 🧪 '+n(w=>w.is_test)+' testowych'+(n(w=>modGone(w.user_id))?' · 👻⛔ '+n(w=>modGone(w.user_id)):'')+'</div>'
   +'<div class="note" style="text-align:center;margin-top:4px">Tylko podgląd — dołączyć możesz tylko tam, gdzie jesteś zaproszony.</div>';
  if(!L.length)return head+'<div class="note" style="margin-top:14px;text-align:center">Brak aktualnych zaproszeń.</div>';
  return head+'<div class="aws">'+L.map(w=>{
    const iv=(invs[w.id]||[]).map(x=>x.u),jn=(joins[w.id]||[]).filter(x=>x!==w.user_id),dc=(decls[w.id]||[]),pr=prefs[w.id]||{};
    return '<div class="aw"><div class="awtags">'+(w.visibility==="private"?tag("p","🔒 prywatne"):tag("a","🌍 wszyscy"))+(w.is_test?tag("t","🧪 test"):'')+(modHidden.has(w.user_id)?tag("h","👻 ukryty"):'')+(modBanned.has(w.user_id)?tag("b","⛔ zablokowany"):'')+'</div>'
     +'<div class="awh">'+nk(w.user_id)+' <b>'+esc(relDay(wantStart(w))+" "+wTime(w))+'</b></div>'
     +paceHtml(w)+bikeHtml(w)+durLineHtml(w)+placeHtml(w)+(w.note?'<div class="wnt">💬 '+esc(w.note)+'</div>':'')
     +(iv.length?'<div class="awl">🔒 Zaproszeni ('+iv.length+'): '+iv.map(id=>nk(id)).join(" ")+'</div>':'')
     +'<div class="awl">🙋 Dołączyli ('+jn.length+'): '+(jn.length?jn.map(id=>nk(id)+(pr[id]?'<span class="note"> '+hhmm(new Date(pr[id]))+'</span>':'')).join(" "):'<span class="note">nikt</span>')+'</div>'
     +(dc.length?'<div class="awl">🙅 Nie da rady: '+dc.map(id=>nk(id)).join(" ")+'</div>':'')+'</div>'}).join("")+'</div>';
}

// 👑 archiwum: starsze niż 30 dni widzi tylko król (KROK 38) i sam je usuwa
let kArch=null,kArchAll=false;
async function loadKArch(){
  try{
    const since=new Date(Date.now()-30*864e5).toISOString();
    const r=await sb.from("wants").select("id,user_id,starts_at,visibility,range_from,range_to,settled_at,is_test,route_km,pace,km,dur_min,place,place_city").lt("starts_at",since).order("starts_at",{ascending:false}).limit(1000);
    if(r.error)throw r.error;const old=r.data||[],jj={};
    for(let i=0;i<old.length;i+=100){const q=await sb.from("want_joins").select("want_id,user_id").in("want_id",old.slice(i,i+100).map(x=>x.id));(q.data||[]).forEach(x=>{(jj[x.want_id]=jj[x.want_id]||[]).push(x.user_id)})}
    kArch={old,jj};
  }catch(e){kArch={old:[],jj:{},err:(e&&e.message)||"błąd"}}
  if(gearOpen&&gearView==="karch")renderGear();
}
function kArchHtml(){
  const head='<button class="sback" data-c="backadm">‹ Administracja</button><div class="sname" style="margin-top:26px">🗄 Archiwum zaproszeń 👑</div>';
  if(!kArch)return head+'<div class="note" style="text-align:center;margin-top:14px">Wczytuję…</div>';
  if(kArch.err)return head+'<div class="note" style="text-align:center;margin-top:14px">Nie udało się wczytać: '+esc(kArch.err)+' (czy KROK 38 jest uruchomiony?)</div>';
  const since=Date.now()-30*864e5,rec=wants.filter(w=>wDone(w)&&new Date(w.starts_at).getTime()>since),old=kArch.old;
  const sv=joins;joins=Object.assign({},joins,kArch.jj);
  try{
    const S=archSum(rec.concat(old)),list=kArchAll?old:old.slice(0,10);
    return head+'<div class="kst"><div><b>'+rec.length+'</b><small>ostatnie 30 dni — widzą wszyscy</small></div><div><b>'+old.length+'</b><small>starsze — widzisz tylko Ty</small></div>'
     +'<div><b>'+S.p+'</b><small>'+plf(S.p,["osoba","osoby","osób"])+' łącznie</small></div><div><b>~'+S.km.toLocaleString("pl-PL")+' km</b><small>łącznie (plan)</small></div></div>'
     +'<div class="bsgrp" style="margin-top:14px">Starsze niż 30 dni</div>'
     +(old.length?'<div class="aws" style="gap:0">'+list.map(archItem).join("")+'</div>'+(old.length>10?'<button type="button" class="lnk amore" data-c="karchall">'+(kArchAll?'Zwiń ⌃':'Pokaż wszystkie ('+old.length+') ›')+'</button>':'')
       +'<button class="b sbtn" style="background:var(--bad);margin-top:12px" data-c="karchdel">🗑 Usuń starsze niż 30 dni ('+old.length+')…</button>'
      :'<div class="note">Brak — wszystko mieści się w 30 dniach.</div>')
     +'<p class="note">Nic nie znika samo. Usuwa zaproszenia z dołączeniami, zaproszonymi i odmowami; <b>statystyki zostają</b> (dziennik aktywności).</p>';
  }finally{joins=sv}
}
// 📍 miejsca zbiórki — lista wspólna; 👑 ustawia pinezki i usuwa
function placesHtml(){
  const su=isSuper(uid);
  return '<button class="sback" data-c="backadm">‹ Administracja</button><div class="sname" style="margin-top:26px">📍 Miejsca zbiórki</div>'
   +'<div class="sleft">'+(places.length?places.map(x=>'<div class="arow"><span><b>'+esc(x.name)+'</b><br><span class="note">'+(x.lat!=null?'📌 '+(+x.lat).toFixed(4)+', '+(+x.lon).toFixed(4)+' · <a href="'+esc(mapUrl(x.lat,x.lon))+'" target="_blank" rel="noopener">Mapa ›</a>':'bez pinezki')+(x.city?' · 🏙 '+esc(x.city+(x.area?' · '+x.area:'')):(bikeOk&&x.lat!=null?' · bez miasta':''))+(x.created_by&&nicks[x.created_by]?' · dodał(a) '+esc(nicks[x.created_by]):'')+'</span></span>'
     +(su||x.created_by===uid?'<span class="arbtns" style="flex-direction:row;flex-wrap:nowrap;white-space:nowrap"><button class="b g small" data-a="plpin" data-id="'+esc(x.id)+'">📌 '+(x.lat!=null?'Zmień':'Pinezka')+'</button><button class="b g small" data-a="pldel" data-id="'+esc(x.id)+'">🗑</button></span>':'')+'</div>').join(""):'<div class="note">Brak miejsc.</div>')
   +(su&&bikeOk&&places.some(x=>x.lat!=null&&!x.city)?'<div class="ios-grp" style="margin-top:12px">'+gRow("#0a84ff","city","Uzupełnij miasta z pinezek","Dla miejsc bez nazwy miasta","",'data-a="plcity"')+'</div>':'')
   +'<p class="note">Miejsca dodaje każdy przy tworzeniu zaproszenia („✏️ Inne miejsce…” albo „🗺️ Wskaż na mapie…” + „Dodaj do listy miejsc”). Pinezkę ustawia i miejsce usuwa autor albo 👑.</p></div>';
}
function onlineHtml(){
  const ids=favFirst(onlineIds.filter(id=>nicks[id]&&(isAdmin||!modGone(id))));
  if(stealthOn()&&!ids.includes(uid)&&nicks[uid])ids.push(uid);
  return (onlBack?'<button class="sback" data-c="onlback">‹ '+(onlBack==="stats"?"Statystyki":"Administracja")+'</button>':'')
   +'<div class="sname" style="margin-top:'+(onlBack?'26px':'6px')+'">🟢 Teraz w aplikacji ('+ids.length+')</div>'
   +'<div class="sleft">'+(ids.length?ids.map(id=>'<div class="arow"><span>'+nk(id)+'</span>'+(id===uid?'<span class="note">'+(stealthOn()&&!onlineIds.includes(uid)?'(Ty — ukryty 👻)':'(Ty)')+'</span>':'')+'</div>').join(""):'<div class="note">Nikogo poza Tobą.</div>')
   +(presOk?'':'<p class="note" style="color:var(--bad)">Brak połączenia z listą online — łączę ponownie… (pomaga wyłączenie blokera reklam dla tej strony)</p>')
   +'<p class="note">Dotknij nicku, żeby zobaczyć kartę osoby i zaprosić ją na rower. Lista odświeża się na bieżąco.</p></div>';
}
function stazTxt(id){
  const ts=joinedAt[id];if(!ts)return "";
  const d=new Date(ts),days=Math.floor((Date.now()-d.getTime())/864e5);
  if(days<1)return "🆕 nowy w ekipie · z nami od dziś";
  const od=d.toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"});
  let ile;
  if(days<=30)ile=days+" "+(days===1?"dzień":"dni");
  else if(days<365)ile=Math.floor(days/30.44)+" mies.";
  else{const y=Math.floor(days/365);ile=(y===1?"od roku":"od "+y+" lat")+" ("+days+" dni)"}
  return "🗓 Z nami od "+od+" · "+ile;
}
function userRidesHtml(id){
  if(!reportOk)return "";
  const s=userRides[id];
  // 🚴 KROK 62: liczby z user_rides() (cudze odpowiedzi nie są już czytelne wprost); bez KROKU 62 — jak dotąd
  if(s===undefined){userRides[id]=null;sb.rpc("user_rides",{u:id}).then(r=>{if(r.error||!r.data)throw 0;const d=r.data;
    userRides[id]={n:+d.n||0,km:Math.round(+d.km||0),n30:+d.d30_n||0,km30:Math.round(+d.d30_km||0),kmh:d.avg_kmh!=null?+d.avg_kmh:null,ur:d};
    if(gearOpen&&(gearView==="user"||gearView==="teczka")&&userId===id)renderGear();if(gearOpen&&gearView==="myrides"&&id===uid)renderGear()}).catch(()=>{sb.from("ride_reports").select("went,km,avg_kmh,ride_at").eq("user_id",id).eq("went",true).eq("ride_test",false).limit(2000)
    .then(r=>r&&r.error?sb.from("ride_reports").select("went,km,avg_kmh,ride_at").eq("user_id",id).eq("went",true).limit(2000):r).then(r=>{
    const L=(r&&r.data)||[],m=Date.now()-30*864e5;userRides[id]={n:L.length,km:Math.round(L.reduce((a,x)=>a+(+x.km||0),0)),n30:L.filter(x=>x.ride_at&&new Date(x.ride_at).getTime()>m).length,km30:Math.round(L.filter(x=>x.ride_at&&new Date(x.ride_at).getTime()>m).reduce((a,x)=>a+(+x.km||0),0)),kmh:(()=>{const v=L.filter(x=>x.avg_kmh!=null).map(x=>+x.avg_kmh);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null})()};
    if(gearOpen&&(gearView==="user"||gearView==="teczka")&&userId===id)renderGear()})});return ""}
  const u=userPubStats(id);if(!u&&(!s||!s.n))return "";
  // 📊 mała statystyka na karcie osoby — widzą wszyscy zalogowani (prośba właściciela 2026-11-17 21:21; KROK 59)
  const c=(v,l)=>'<div class="st"><b>'+v+'</b><span>'+l+'</span></div>',n=s&&s.n||0;
  return '<div class="stats ustats">'+(u?c(u.created,plf(u.created,["zaproszenie","zaproszenia","zaproszeń"]))+c(u.joined,plf(u.joined,["dołączenie","dołączenia","dołączeń"])):'')
   +c(n,plf(n,["jazda","jazdy","jazd"]))+c(s&&s.km?s.km.toLocaleString("pl-PL"):0,"km")+'</div>'
   +(s&&(s.n30||s.kmh!=null)?'<div class="staz ustz">'+[s.n30?'📅 30 dni: '+s.n30+' '+plf(s.n30,["jazda","jazdy","jazd"])+(s.km30?' · '+s.km30+' km':''):'',s.kmh!=null?'⚡ śr. '+fmt1(s.kmh)+' km/h':''].filter(Boolean).join(' · ')+'</div>':'')
   +'<div class="note ustn">Jazdy i km — potwierdzone w „Jak poszło?”. Bez testowych.</div>';
}
// liczby z dziennika aktywności (KROK 59): wysłane zaproszenia i dołączenia, bez testowych
let upStats={},upOk=true;
function userPubStats(id){
  if(!upOk||!session)return null;
  if(!(id in upStats)){upStats[id]=null;Promise.resolve(sb.rpc("user_pub_stats",{u:id})).then(r=>{
      if(r&&r.error){upOk=false;delete upStats[id]}else upStats[id]=r&&r.data||null;
      if(gearOpen&&(gearView==="user"||gearView==="teczka")&&userId===id)renderGear()},()=>{delete upStats[id]})}
  const v=upStats[id];return v?{created:+v.created||0,joined:+v.joined||0}:null;
}
function userHtml(){
  const g=genders[userId],fav=isFav(userId),ux=uxCache[userId]||{},mu=MEDIA.filter(m=>(medias[userId]||{})[m[0]]);
  if(profExOk&&session&&!(userId in uxCache)){uxCache[userId]={};loadUx(userId)}
  return (userBack?'<button class="sback" data-c="userback">‹ '+({favs:"Ulubieni",online:"Online",admin:"Administracja",users:"Użytkownicy",perms:"Uprawnienia",stats:"Statystyki"}[userBack]||"Ustawienia")+'</button>':'')
   +(avData[userId]?'<div class="ucav" style="margin-top:'+(userBack?'30px':'8px')+'">'+avImg(userId,"")+'</div>':'')
   +'<div class="bigpill" style="margin-top:'+(avData[userId]?'8px':userBack?'26px':'6px')+'">'+nk(userId)+'</div>'
   +'<div class="smail">'+(g==="K"?uiIcon("venus")+" Kobieta":g==="M"?uiIcon("mars")+" Mężczyzna":"")+(onlineIds.includes(userId)?(g?" · ":"")+"🟢 teraz w aplikacji":"")+'</div>'
   +(ux.city?'<div class="staz">'+uiIcon("pin")+' '+esc(ux.city)+'</div>':'')+(stazTxt(userId)?'<div class="staz">'+esc(stazTxt(userId))+'</div>':'')
   +(mu.length?'<div class="ucsoc">'+mu.map(([k,ic,t])=>'<a class="ucs" href="'+esc(medias[userId][k])+'" target="_blank" rel="noopener nofollow" title="'+esc(t)+'" aria-label="'+esc(t)+'">'+uiIcon(ic)+'</a>').join("")+'</div>':'')
   +(ux.phone&&userId!==uid?'<div class="uccall"><a class="ucb" href="tel:'+esc(ux.phone.replace(/[^0-9+]/g,""))+'">'+uiIcon("call")+' Zadzwoń</a><a class="ucb" href="sms:'+esc(ux.phone.replace(/[^0-9+]/g,""))+'">'+uiIcon("msg")+' SMS</a></div>'
       +'<div class="ucwhy">'+esc(ux.phone)+(ux.why==="fav"?' · widzisz, bo jesteś w '+(g==="K"?"jej":"jego")+' ulubionych':'')+'</div>':'')
   +userRidesHtml(userId)+urSectionsHtml(userRides[userId]&&userRides[userId].ur,userId===uid)   // 🚴 KROK 62: rekordy / kalendarz, gdy osoba pozwoliła
   +((fbDone[userId]||0)?'<div class="staz">💡 Zrealizowane zgłoszenia: '+fbDone[userId]+(fbBulb(userId)?' — współtwórca aplikacji':'')+'</div>':'')
   +(visOk?'<button class="b sbtn" data-a="invite" data-id="'+esc(userId)+'">🚴 Zaproś na rower</button>':'')
   +gGrp("Ta osoba",[session?gRow("#0a84ff","cal","Pokaż zaproszenia z "+esc(nicks[userId]||"tą osobą"),"Filtr na liście zaproszeń","",'data-a="fltuser" data-id="'+esc(userId)+'"'):'',
      gRow("#ffcc00",fav?"starf":"star",fav?"W ulubionych":"Dodaj do ulubionych",fav?"Dotknij, aby usunąć":"Zawsze na górze list",fav?'<span class="ios-v ok">'+uiIcon("check")+'</span>':'','data-a="fav" data-id="'+esc(userId)+'"')])
   +(isAdmin?gGrp("Administrator",[isKingReal()?gRow("#5e5ce6","folder","Teczka","Wszystko o tej osobie w jednym miejscu","",'data-a="tk" data-id="'+esc(userId)+'"'):'',fbOk?gRow("#bf5af2","msg","Napisz wiadomość","Trafi do jej skrzynki zgłoszeń","",'data-a="fbmsg" data-id="'+esc(userId)+'"'):'',
      !isSuper(userId)?gRow("#ff9f0a","pencil","Zmień nick","","",'data-a="unick" data-id="'+esc(userId)+'"'):'']):'')
   +(isAdmin?admInfoHtml(userId):'')
   +(modOk&&isSuper(uid)&&userId!==uid&&!isSuper(userId)?(()=>{const d=modBusy?' disabled':'',id='data-id="'+esc(userId)+'"'+d,hid=modHidden.has(userId),ban=modBanned.has(userId);
      return gGrp("👑 Moderacja",[gRow(hid?"#30d158":"#8e8e93",hid?"eye":"user",hid?"Pokaż konto innym":"Ukryj konto",hid?"Teraz: ukryte — inni go nie widzą ani jego zaproszeń":"Np. konto testowe — zniknie z list","",'data-a="modhide" '+id),
        gRow(ban?"#30d158":"#ff3b30",ban?"check":"lock",ban?"Odblokuj konto":"Zablokuj konto",ban?"Teraz: zablokowane — widzi tylko komunikat o blokadzie":"Zobaczy tylko komunikat o blokadzie","",'data-a="modban" '+id)])
       +(adminIds.includes(userId)?'<p class="note" style="margin:8px 14px 0">Administratora nie można usunąć — najpierw odbierz mu uprawnienia.</p>'
        :'<div class="ios-grp" style="margin-top:14px"><button type="button" class="ios-it ios-row ios-out" data-a="moddel" '+id+'>Usuń konto…</button></div>')})():'');
}
/* 📁 Teczka użytkownika (KROK 60) — wszystko o osobie w jednym miejscu; tylko prawdziwy 👑 (decyzja właściciela 2026-11-20 04:16) */
let tkId="",tkData={},tkBack="user",tkFrom=false,tkBusy=false;
async function tkLoad(id,more){
  const d=tkData[id],off=more&&d&&d.act?d.act.length:0;
  if(more){if(tkBusy)return;tkBusy=true;renderGear()}
  try{const r=await sb.rpc("admin_teczka",{u:id,lim:50,off});
    if(r.error)throw r.error;
    if(more&&tkData[id])tkData[id].act=tkData[id].act.concat(r.data.act||[]);else tkData[id]=r.data||{};
  }catch(e){if(!more)tkData[id]={err:/admin_teczka|function|schema/i.test(e&&e.message||"")?"Brak danych — uruchom KROK 60 w bazie.":"Nie udało się wczytać: "+(e&&e.message||"błąd")}}
  tkBusy=false;if(gearOpen&&gearView==="teczka"&&tkId===id)renderGear();
}
function tkOpen(id,back){
  if(!isKingReal()||!nicks[id])return;
  tkId=id;userId=id;tkBack=back||"user";tkFrom=true;gearOpen=true;gearView="teczka";
  delete tkData[id];renderGear();tkLoad(id);
}
function tkActTxt(x,id){
  const m=x.meta||{};
  if(x.kind==="want_deleted"){
    const who=x.by&&x.by!==id?' — usunął(a) '+esc(nickOf(x.by)):'';
    return (x.by&&x.by!==id?'🗑 jej/jego zaproszenie zostało usunięte':'🗑 usunął(a) zaproszenie')+who+(m.joined?' · zapisanych: '+(+m.joined):'')+(m.test?' · 🧪':'');
  }
  return esc(ACT_TXT[x.kind]||x.kind);
}
function teczkaHtml(){
  const id=tkId,d=tkData[id],g=genders[id],ux=uxCache[id]||{};
  if(profExOk&&!(id in uxCache)){uxCache[id]={};loadUx(id)}
  const ln=(l,v)=>'<div class="admln">'+l+': <b>'+v+'</b></div>',box=(h,b)=>'<div class="admbox"><b>'+h+'</b>'+b+'</div>';
  const dt=t=>t?esc(new Date(t).toLocaleDateString("pl-PL",{day:"numeric",month:"short",year:"numeric"})):'—';
  const TKB={admin:"Administracja",users:"Użytkownicy",stats:"Statystyki"};
  const head='<button class="sback" data-c="tkback">‹ '+esc(TKB[tkBack]||nickOf(id))+'</button>'
   +'<div class="sname" style="margin-top:26px">📁 Teczka</div><div class="bigpill">'+nk(id)+'</div>';
  if(!d)return head+'<div class="note">Wczytuję…</div>';
  if(d.err)return head+'<div class="changed">'+esc(d.err)+'</div>';
  const st=d.stats||{},n=k=>+st[k]||0,c=(v,l)=>'<div class="st"><b>'+v+'</b><span>'+l+'</span></div>';
  const role=isSuper(id)?'👑 główny administrator':adminIds.includes(id)?'🛡️ administrator':testerIds.has(id)?'💉 tester':'użytkownik';
  const state=modBanned.has(id)?'⛔ zablokowane':modHidden.has(id)?'👻 ukryte':'aktywne';
  const mu=MEDIA.filter(m=>(medias[id]||{})[m[0]]);
  // 1. konto
  const s1=box('Konto',
     ln('E-mail',d.email?'<a href="mailto:'+esc(d.email)+'">'+esc(d.email)+'</a>':'—')
    +ln('Płeć',g==="K"||g==="M"?uiIcon(g==="K"?"venus":"mars")+" "+(g==="K"?"Kobieta":"Mężczyzna"):"—")
    +ln('Konto założone',dt(d.created_at))+(stazTxt(id)?'<div class="note">'+esc(stazTxt(id))+'</div>':'')
    +(ux.city?ln('Miasto',esc(ux.city)):'')+(ux.phone?ln('Telefon','<a href="tel:'+esc(ux.phone.replace(/[^0-9+]/g,""))+'">'+esc(ux.phone)+'</a>'):'')
    +(mu.length?'<div class="ucsoc">'+mu.map(([k,ic,t])=>'<a class="ucs" href="'+esc(medias[id][k])+'" target="_blank" rel="noopener nofollow" title="'+esc(t)+'" aria-label="'+esc(t)+'">'+uiIcon(ic)+'</a>').join("")+'</div>':'')
    +ln('Rola',role)+ln('Stan konta',state)
    +ln('Telegram',d.tg_linked_at?'połączony od '+dt(d.tg_linked_at):'nie połączony'));
  // 2. obecność
  const L=d.logins||[];
  const s2=box('Obecność',
     ln('Ostatnio w aplikacji',onlineIds.includes(id)?'teraz 🟢':d.last_seen?esc(agoTxt(d.last_seen)):'—')
    +ln('Ostatnie logowanie',d.last_sign_in_at?esc(fmtWhen(d.last_sign_in_at)):'—')
    +ln('Logowania (30 dni)',L.length)
    +(L.length?'<details class="tkdet"><summary>Pokaż logowania</summary><div class="admrec">'+L.map(x=>'<div><span>🔑 '+esc(fmtWhen(x.at))+'</span><span class="note">'+(x.bf?'z historii':x.prev?'poprzednio '+esc(fmtWhen(x.prev)):'')+'</span></div>').join("")+'</div></details>':''));
  // 3. statystyki
  const s3=box('Statystyki','<div class="stats admst">'+c(n("want_public")+n("want_private"),"zaproszeń")+c(n("want_join"),"dołączeń")+c(n("want_leave"),"rezygnacji")
      +c(n("invite_sent"),"doproszeń")+c(n("ride_created"),"wieczorynek")+c(n("ride_join"),"zapisów na wieczorynki")+'</div>'
    +userRidesHtml(id)+((fbDone[id]||0)?'<div class="admln">💡 Zrealizowane zgłoszenia: <b>'+fbDone[id]+'</b></div>':''));
  // 4. dziennik
  const A=d.act||[],tot=+d.act_total||0;
  const s4=box('Dziennik aktywności'+(tot?' ('+tot+')':''),A.length
     ?'<div class="admrec">'+A.map(x=>'<div><span>'+tkActTxt(x,id)+'</span><span class="note">'+esc(fmtWhen(x.at))+'</span></div>').join("")+'</div>'
      +(A.length<tot?'<button class="b g small tkmore" data-a="tkmore" data-id="'+esc(id)+'"'+(tkBusy?' disabled':'')+'>'+(tkBusy?'Wczytuję…':'Pokaż więcej ('+A.length+' z '+tot+')')+'</button>':'')
     :'<div class="note">Brak wpisów w dzienniku.</div>');
  // 5. jej / jego rzeczy
  const W=wants.filter(w=>w.user_id===id),R=d.rides||[],T=d.routes||[],E=d.events||[];
  const it=(a,t,sub)=>'<button type="button" class="tkit" '+a+'><span>'+t+'</span><span class="note">'+sub+'</span></button>';
  const s5=box('Dodane przez tę osobę',
     '<div class="admln">Aktualne zaproszenia: <b>'+W.length+'</b></div>'
    +'<div class="admln">Wieczorynki: <b>'+(+d.rides_n||0)+'</b></div>'+(R.length?'<div class="tklist">'+R.map(x=>it('data-a="tkride" data-id="'+esc(x.id)+'"',esc(x.t||"Wieczorynka"),dt(x.at))).join("")+'</div>':'')
    +'<div class="admln">Trasy w bazie: <b>'+(+d.routes_n||0)+'</b></div>'+(T.length?'<div class="admrec">'+T.map(x=>'<div><span>'+esc(x.t||"Trasa")+'</span><span class="note">'+(x.km!=null?fmt1(+x.km)+' km · ':'')+dt(x.at)+'</span></div>').join("")+'</div>':'')
    +'<div class="admln">Imprezy: <b>'+(+d.events_n||0)+'</b></div>'+(E.length?'<div class="tklist">'+E.map(x=>it('data-a="tkev" data-id="'+esc(x.id)+'"',esc(x.t||"Impreza"),dt(x.at))).join("")+'</div>':'')
    +(d.rides_n>R.length||d.routes_n>T.length||d.events_n>E.length?'<div class="note">Pokazane 20 ostatnich z każdego rodzaju.</div>':''));
  // 6. zgłoszenia i wiadomości
  const F=fbOk?fbList.filter(f=>f.user_id===id):[];
  const s6=fbOk?box('Zgłoszenia i wiadomości ('+F.length+')',F.length
     ?'<div class="tklist">'+F.map(f=>it('data-a="tkfb" data-id="'+esc(f.id)+'"',esc(FB_KIND[f.kind]||f.kind)+(f.body?' — '+esc(String(f.body).slice(0,60))+(String(f.body).length>60?'…':''):''),esc(fmtWhen(f.updated_at||f.created_at)))).join("")+'</div>'
     :'<div class="note">Brak.</div>'):'';
  // 7. skróty do akcji (zmiana nicku, ukrycie i blokada pytają o potwierdzenie)
  const mod=modOk&&id!==uid&&!isSuper(id),dis=modBusy?' disabled':'',ida='data-id="'+esc(id)+'"'+dis,hid=modHidden.has(id),ban=modBanned.has(id);
  const s7=gGrp("Akcje",[fbOk&&id!==uid?gRow("#bf5af2","msg","Napisz wiadomość","Trafi do jej skrzynki zgłoszeń","",'data-a="fbmsg" data-id="'+esc(id)+'"'):'',
      gRow("#0a84ff","cal","Pokaż zaproszenia tej osoby","Filtr na liście zaproszeń","",'data-a="fltuser" data-id="'+esc(id)+'"'),
      !isSuper(id)?gRow("#ff9f0a","pencil","Zmień nick","","",'data-a="unick" data-id="'+esc(id)+'"'):'',
      mod?gRow(hid?"#30d158":"#8e8e93",hid?"eye":"user",hid?"Pokaż konto innym":"Ukryj konto",hid?"Teraz: ukryte":"Zniknie z list u innych","",'data-a="modhide" '+ida):'',
      mod?gRow(ban?"#30d158":"#ff3b30",ban?"check":"lock",ban?"Odblokuj konto":"Zablokuj konto",ban?"Teraz: zablokowane":"Zobaczy tylko komunikat o blokadzie","",'data-a="modban" '+ida):''])
   +(mod&&!adminIds.includes(id)?'<div class="ios-grp" style="margin-top:14px"><button type="button" class="ios-it ios-row ios-out" data-a="moddel" '+ida+'>Usuń konto…</button></div>':'');
  return head+s1+s2+s3+s4+s5+s6+'<div style="margin-top:18px">'+s7+'</div>';
}
async function toggleFav(id){
  if(!session||!favOk||!id||id===uid)return;
  const on=isFav(id);
  try{
    const res=on?await sb.from("favorites").delete().eq("user_id",uid).eq("fav_id",id):await sb.from("favorites").insert({fav_id:id});
    if(res.error)throw res.error;
    on?favs.delete(id):favs.add(id);
    renderWants();renderNext();renderCard();renderLibUi();renderGear();
    say(on?"Usunięto z ulubionych: "+nicks[id]:"⭐ Dodano do ulubionych: "+nicks[id]);
  }catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
}
// kliknięcie pigułki z nickiem (poza panelem) otwiera kartę osoby
document.addEventListener("click",e=>{
  const p=e.target.closest(".nk[data-u]");if(!p||!session||!favOk)return;
  const inPanel=!!p.closest("#gearpanel");
  if(inPanel&&!["favs","online","admin","perms","stats"].includes(gearView))return;
  if(inPanel&&gearView==="stats"&&isKingReal()){tkOpen(p.dataset.u,"stats");return}
  if(inPanel&&p.dataset.u===uid)return;
  userBack=inPanel?gearView:"";tkFrom=false;userId=p.dataset.u;gearOpen=true;gearView="user";renderGear();
  if(isAdmin){delete admInfo[userId];loadAdmInfo(userId)}
});
