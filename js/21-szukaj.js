/* 🔍 Wspólne wyszukiwanie — etap B (decyzje właściciela 2026-11-23/24, NASTEPNA_SESJA_wyszukiwanie)
   Lupa w nagłówku (na wąskich ekranach w miejscu ❓ — Pomoc jest w ⚙️ → Pomoc i opinie).
   Jedno okno szuka zawsze WSZYSTKIEGO (włączone Filtry nie zawężają): zaproszenia, imprezy, osoby, grupy, listy, trasy, serwis;
   sekcja „Odbyte” osobno na końcu (najdalej od pola). Wyniki rosną w górę nad polem wpisywania (jak w podekranach Filtrów).
   Bomble nad listą: rodzaje wyników z liczbą trafień. Kliknięcie otwiera istniejące miejsce w aplikacji.
   Przełącznik „Szukaj też w opcjach aplikacji”: słownik SR_OPT (JEDNO miejsce — każda nowa opcja = wpis tutaj, zasada w README):
   wynik pokazuje ścieżkę („⚙️ → Edytuj profil → …”), a kliknięcie otwiera to miejsce i pulsuje ustawienie.
   👑 szuka też we wszystkich prywatnych zaproszeniach i grupach (dane, które baza i tak daje 👑).
   Plik wczytywany jako ostatni: przy wczytaniu tylko rejestruje obsługę zdarzeń. Bez nowych zapytań do bazy poza
   jednorazowym dociągnięciem tras / grup / serwisu przy pierwszym otwarciu okna (oszczędzanie limitów serwera). */
let srPosts=null,srPostsP=null,srOldBusy=false,srOldMsg="",srOldR=30;   // srOldR: zakres „Szukaj starszych” wybrany w oknie (30 = wyłączone); dane mogą sięgać dalej (wOld)   // 📣 wpisy z tablic moich grup (wczytane raz przy otwarciu okna); 🗄 „Szukaj starszych”
let srQ="",srTy="all",srOpt=(()=>{try{return localStorage.getItem("srOpt")==="1"}catch(e){return false}})(),srMore=false;
const srNorm=t=>String(t||"").toLocaleLowerCase("pl").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ł/g,"l");
// trafienie: wszystkie słowa zapytania muszą wystąpić; punkty: początek nazwy 3, początek słowa 2, w środku 1 (-1 = brak)
function srScore(name,hay,q){
  const W=srNorm(q).split(/\s+/).filter(Boolean);if(!W.length)return 0;
  const n=srNorm(name),h=n+" "+srNorm(hay);
  if(!W.every(w=>h.includes(w)))return -1;
  if(n.startsWith(W[0]))return 3;
  return W.every(w=>(" "+h).includes(" "+w))?2:1;
}
const SR_TY=[["want","Zaproszenia","bike"],["sig","Mam ochotę","hand"],["ev","Imprezy","medal"],["ride","Wieczorynki","moon"],["user","Osoby","user"],["grp","Grupy","users"],["post","Tablice grup","mega"],["list","Listy","list"],["route","Trasy","map"],["sv","Serwis","wrench"],["opt","Opcje","sliders"],["done","Odbyte","archive"]];
const srTyName=k=>(SR_TY.find(x=>x[0]===k)||[,""])[1];
// kolejność sekcji od góry; najbliżej pola (na dole) — opcje i zaproszenia, „Odbyte” na samej górze (koniec listy)
const SR_ORDER=["done","sv","route","list","post","grp","user","ride","ev","sig","want","opt"];

/* ---------- źródła danych (to, co aplikacja już ma w pamięci) ---------- */
// zaproszenia bez filtrów i bez ukrywania testowych (to samo co deriveWants, tylko bez „hideTest”)
function srWants(){
  if(DEMO||!wRaw.length)return wants.slice();
  const since=Date.now()-31*864e5;
  let a=wRaw.filter(x=>new Date(x.starts_at).getTime()>=since);
  if(!isAdmin)a=a.filter(x=>x.user_id===uid||!modGone(x.user_id));
  if(pv)a=a.filter(x=>x.visibility!=="private"||x.user_id===uid||(invs[x.id]||[]).some(y=>y.u===uid)||wInvMe(x)||(joins[x.id]||[]).includes(uid));
  return a;
}
const srDay=d=>{const dd=dayDiff(d),wd=d.toLocaleDateString("pl-PL",{weekday:"long"});
  return [dd===0?"dziś":dd===1?"jutro":dd===-1?"wczoraj":"",wd,d.toLocaleDateString("pl-PL",{day:"numeric",month:"long"}),d.getDate()+"."+String(d.getMonth()+1).padStart(2,"0")].join(" ")};
// rodzaj roweru, tempo i aktywność jako słowa do szukania („gravel”, „turystycznie”, „bieg”…)
const srWantTags=w=>[w.bike&&BIKES[w.bike]?BIKES[w.bike].replace(/^\S+\s/,""):"",w.bike==="ebike"?"elektryk elektryczny":"",
  w.pace&&PACES[w.pace]?PACES[w.pace].n+" "+PACES[w.pace].d:"",w.activity?actOf(w.activity).name+" "+actOf(w.activity).name_many+" "+actOf(w.activity).want_txt:"",
  w.route_km!=null||w.km?Math.round(+(w.route_km||w.km))+" km":""].join(" ");
const srWhen=d=>{const dd=dayDiff(d);return dd===0?"Dziś":dd===1?"Jutro":dd===-1?"Wczoraj":d.toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"})};
function srItems(q){
  const out=[],add=(k,id,t,sub,ico,hay,go,ord)=>{const sc=srScore(t,hay,q);if(sc>=0)out.push({k,id,t,sub,ico,sc,go,ord:ord==null?0:ord})};
  // 🚲 zaproszenia (nadchodzące) i odbyte (ostatnie 30 dni)
  srWants().forEach(w=>{
    const d=new Date(w.starts_at),done=wDone(w),ppl=(joins[w.id]||[]).map(nickOf).join(" "),
      t=w.title||"Jazda — "+nickOf(w.user_id),
      sub=srWhen(d)+" · "+(isOpen(w)?wTime(w):hhmm(d))+(w.title?" · "+nickOf(w.user_id):"")+(w.place?" · "+w.place:"")+(w.visibility==="private"?" · prywatne":"")+(w.is_test?" · TEST":""),
      hay=[nickOf(w.user_id),ppl,invIds(w).map(nickOf).join(" "),srWantTags(w),w.place,w.place_city,w.place_area,w.note,srDay(d),w.visibility==="private"?"prywatne":"otwarte",w.is_test?"test testowe":"",
        typeof wGr==="function"&&wGr(w)&&typeof grG!=="undefined"&&grG[wGr(w)]?grG[wGr(w)].name:""].join(" ");
    if(done){if(Date.now()-d.getTime()<30*864e5)add("done",w.id,t,sub,"archive",hay+" odbyte archiwum",()=>srGoArch(w),d.getTime())}   // odbyte: najświeższe na dole (przy polu)
    else add("want",w.id,t,sub,w.visibility==="private"?"lock":"bike",hay,()=>srGoWant(w),-d.getTime())});
  // 🗄 starsze niż 30 dni — tylko po „Szukaj starszych” (wOld, js/10; baza daje zwykłemu użytkownikowi jego jazdy, 👑 — wszystkie)
  if(typeof wOld!=="undefined"&&srOldR!==30){const have=new Set(wRaw.map(x=>x.id));oldIn(srOldR).forEach(w=>{if(have.has(w.id))return;
    const d=new Date(w.starts_at),J=jOld[w.id]||[],t=w.title||"Jazda — "+nickOf(w.user_id);
    add("done",w.id,t,srWhen(d)+" · "+d.getFullYear()+(w.place?" · "+w.place:"")+(w.visibility==="private"?" · prywatne":"")+" · starsze",w.visibility==="private"?"lock":"archive",
      [nickOf(w.user_id),J.map(nickOf).join(" "),srWantTags(w),w.place,w.place_city,w.place_area,w.note,srDay(d),"odbyte archiwum starsze"].join(" "),()=>srGoArch(w),d.getTime())})}
  // 🙋 „Mam ochotę” — dzisiejsze sygnały (to, co widać pod 🔔)
  if(typeof sigOn==="function"&&sigOn())(typeof sigListAll==="function"?sigListAll():sigList()).forEach(x=>{const a=sigA(x.activity),me=x.user_id===uid,R=sigReactIds(x);
    add("sig",x.user_id,(me?"Ty":nickOf(x.user_id))+" — ma ochotę "+a[2],"dziś · "+hhmm(new Date(x.created_at))+(x.msg&&!x.msg_hidden?" · „"+x.msg+"”":"")+(R.length?" · też: "+R.length:"")+(sigPriv(x)?" · prywatny":""),"hand",
      [nickOf(x.user_id),a[1],x.msg_hidden?"":x.msg,R.map(nickOf).join(" "),"mam ochotę sygnał dziś ekipa"].join(" "),()=>srGoSig(x.user_id),-new Date(x.created_at).getTime())});
  // 📣 tablice moich grup (najnowsze wpisy)
  if(srPosts)srPosts.forEach(p=>{const g=typeof grG!=="undefined"&&grG[p.group_id];if(!g)return;const b=String(p.body||"").replace(/\s+/g," ").trim();
    add("post",p.id,b.length>60?b.slice(0,59)+"…":b,g.name+" · "+nickOf(p.author)+" · "+agoTxt(p.created_at),"mega",[b,g.name,nickOf(p.author),"tablica ogłoszenie wpis"].join(" "),()=>srGoPost(p),-new Date(p.created_at).getTime())});
  // 🏁 imprezy (minione → Odbyte)
  if(typeof evs!=="undefined"&&evOk&&tabOk(3))evs.forEach(e=>{
    const past=evPast(e),d=new Date(e.date_from+"T12:00"),sub=srWhen(d)+(e.place?" · "+e.place:"")+" · impreza";
    add(past?"done":"ev",e.id,e.name,sub,"medal",[e.place,e.note,srDay(d),"impreza zawody"].join(" "),()=>srGoEv(e.id),past?d.getTime():-d.getTime())});
  // 🌙 wieczorynki (zakładka Wieczorynki; minione → Odbyte)
  if(typeof tabOk==="function"&&tabOk(1))sorted.forEach((r,i)=>{
    const d=new Date(r.when),past=d.getTime()<Date.now()-3*36e5,sub=srWhen(d)+" · "+hhmm(d)+(r.place?" · "+r.place:"")+" · wieczorynka";
    add(past?"done":"ride",r.id,r.title||"Wieczorynka",sub,"moon",[r.place,r.owner,r.note,r.route_title,r.route_desc,(rsvps[r.id]||[]).map(nickOf).join(" "),r.pace&&PACES[r.pace]?PACES[r.pace].n:"",srDay(d),"wieczorynka"].join(" "),()=>srGoRide(i),past?d.getTime():-d.getTime())});
  // 👤 osoby
  if(session)Object.keys(nicks).forEach(id=>{if(!isAdmin&&modGone(id))return;
    const sub=[id===uid?"to Ty":"",isFav(id)?"ulubiony":"",onlineIds.includes(id)?"teraz online":"",adminIds.includes(id)?"administrator":"",testerIds.has(id)?"tester":"",typeof demoIds!=="undefined"&&demoIds.has(id)?"konto demo":""].filter(Boolean).join(" · ");
    add("user",id,nicks[id],sub,isFav(id)?"starf":"user",sub,()=>srGoUser(id))});
  // 👥 grupy: moje, jawne z wyszukiwarki grup; 👑 — wszystkie
  if(session&&typeof grG!=="undefined")Object.values(grG).forEach(g=>{if(!g||!g.id||!g.name)return;
    const mine=typeof grMy==="function"&&grMy(g.id);if(!mine&&g.visibility!=="public"&&!isKingReal())return;
    const sub=[g.visibility==="public"?"jawna":"ukryta",g.members!=null?g.members+" "+plf(+g.members,["osoba","osoby","osób"]):"",mine?(mine.status==="active"?"jesteś w grupie":"zaproszenie"):"",g.archived_at?"archiwum":""].filter(Boolean).join(" · ");
    add("grp",g.id,g.name,sub,"users",[g.descr,g.area].join(" "),()=>grGo(g.id))});
  // 📋 listy
  if(session&&typeof plOk!=="undefined"&&plOk)plists.forEach(l=>{const ids=plIds(l.id);
    add("list",l.id,l.name,ids.length+" "+plf(ids.length,["osoba","osoby","osób"]),"list",ids.map(nickOf).join(" "),()=>srGoGear(()=>{plId=l.id;pf.pl=null;gearView="plist"}))});
  // 🗺️ trasy z bazy
  if(rbOk&&rbList)rbList.forEach(x=>{if(x.hidden&&!isAdmin)return;
    add("route",x.id,x.name,Math.round(+x.km)+" km"+(x.start_city?" · "+x.start_city:"")+(x.hidden?" · ukryta":""),"map",[x.start_city,x.bike,"trasa gpx"].join(" "),()=>srGoRoute(x.id))});
  // 🔧 serwis: rowery i wymienione części
  if(typeof svOn==="function"&&svOn()){const d=svLoad();d.bikes.filter(b=>!b.demo).forEach(b=>{
    const ty=(SV_TYPES.find(x=>x[0]===b.type)||[,,""])[2];
    add("sv",b.id,b.name||"Rower",[ty,b.brand,b.model].filter(Boolean).join(" · "),"wrench",[b.brand,b.model,ty,b.frame,"rower serwis"].join(" "),()=>srGoBike(b.id));
    (b.parts||[]).forEach(p=>add("sv",b.id+":"+p.id,p.name+(p.brand?" · "+p.brand:""),(p.date?svDate(p.date)+" · ":"")+(b.name||"Rower"),"wrench",[p.brand,b.name,"część wymiana"].join(" "),()=>srGoBike(b.id)))})}
  // ⚙️ opcje aplikacji (słownik)
  if(srOpt)SR_OPT().forEach(o=>{if(o.ok===false)return;add("opt",o.t,o.t,o.p,o.i||"sliders",o.s||"",()=>srGoOpt(o))});
  return out;
}

/* ---------- ⚙️ słownik opcji aplikacji — JEDNO miejsce (zasada: każda nowa opcja = wpis tutaj) ----------
   t: nazwa, s: synonimy (szukane, niewidoczne), p: ścieżka pokazywana w wyniku, i: ikona,
   go: kolejne przyciski do kliknięcia w ⚙️ (od ekranu głównego), hl: element do podświetlenia na końcu,
   fn: zamiast ⚙️ — funkcja otwierająca miejsce poza ustawieniami, ok: czy opcja jest dostępna dla tej osoby */
const SR_PROF='[data-c="nick"]';
function SR_OPT(){const S=!!session,A=S&&isAdmin,K=S&&isSuper(uid),KR=isKingReal(),ADM='[data-c="admin"]';
  return [
  {t:"Edytuj profil",s:"profil zdjęcie awatar fotka",p:"Ustawienia → Edytuj profil",i:"user",go:[SR_PROF],ok:S},
  {t:"Zmień nick",s:"nick nazwa pseudonim ksywka",p:"Ustawienia → Edytuj profil → Nick",i:"pencil",go:[SR_PROF],hl:'[data-c="nickopen"]',ok:S},
  {t:"Zdjęcie profilowe",s:"zdjęcie awatar fotka foto",p:"Ustawienia → Edytuj profil → Zdjęcie",i:"cam",go:[SR_PROF],hl:".pe-av",ok:S&&profExOk},
  {t:"Płeć",s:"płeć kobieta mężczyzna kolor nicku",p:"Ustawienia → Edytuj profil → Płeć",i:"users",go:[SR_PROF],hl:"#gsex",ok:S&&genderOk},
  {t:"Moja okolica (promień)",s:"okolica obszar promień km kilometry zasięg moja okolica suwak cała polska daleko blisko dalej wszystkie imprezy trasy w okolicy",p:"Nagłówek → plakietka z ikoną radaru (miejscowość · km)",i:"pin",fn:()=>openHome(),ok:true},
  {t:"Odległość sygnału z daleka",s:"sygnał mam ochotę odległość km od ciebie daleko okolica pin",p:"🔔 / Ekipa → sygnał → 📍 ok. N km od Ciebie",i:"pin",fn:()=>{show(0);openSig(typeof sigActive==="function"&&sigActive()?"mine":"pick")}},
  {t:"Miejscowości w karcie dnia (filtr)",s:"miejscowość etykieta pigułka filtr gdzie nasielsk serock legionowo karta dnia zwinięta kraków warszawa linijka pin odległość km daleko",p:"Zaproszenia → karta dnia → 📍 miejscowość · km (dotknij = filtr)",i:"pin",fn:()=>{show(0)}},
  {t:"Punkt zbiórki (pinezka)",s:"punkt zbiórki miejsce spotkania pinezka mapa gdzie start zaproszenie nowe miejsce wymagane obowiązkowe",p:"➕ Zaproś → 📍 Punkt zbiórki (na górze)",i:"pin",fn:()=>{show(0)}},
  {t:"Radar okolicy — nazwy miejscowości",s:"radar mapa miejscowości nazwy gęstość czytelność kierunek północ odnośnik daleko przybliż oddal powiększ przesuń wyśrodkuj ciechanów ostrołęka serock legionowo",p:"Nagłówek → 📍 → suwak „Miejscowości na radarze”, 🎯 Wyśrodkuj",i:"target",fn:()=>openHome(),ok:true},
  {t:"Radar od mojej lokalizacji (Gdzie jestem)",s:"gps lokalizacja gdzie jestem tu jestem radar telefon położenie od mojej lokalizacji",p:"Nagłówek → 📍 → ➤ Gdzie jestem",i:"locate",fn:()=>openHome(),ok:true},
  {t:"Najbliższy sygnał / zaproszenie / impreza",s:"najbliżej najbliższy sygnał zaproszenie impreza odległość kierunek strzałka km stąd",p:"Nagłówek → 📍 → Najbliżej",i:"pin",fn:()=>openHome(),ok:true},
  {t:"Moja miejscowość",s:"miejscowość miasto okolica odległość dom środek",p:"Nagłówek → 📍 → Moja miejscowość → Zmień (albo Ustawienia → Edytuj profil → Miejscowość)",i:"pin",fn:()=>openHome("home"),ok:true},
  {t:"Trasy z okolicy / wszystkie trasy",s:"trasy w okolicy wszystkie trasy baza tras daleko cała polska",p:"Ustawienia → Baza tras → 📍 okolica / Wszystkie trasy",i:"map",fn:()=>openRb(),ok:!!rbOk},
  {t:"Podejrzyj inną okolicę / ulubione miejscowości",s:"podgląd inna okolica miejscowość sprawdź co się dzieje ulubione miejscowości gwiazdka serock nasielsk",p:"Nagłówek → 📍 → Podejrzyj inną okolicę",i:"eye",fn:()=>openHome(),ok:true},
  {t:"Telefon",s:"telefon numer zadzwoń sms",p:"Ustawienia → Edytuj profil → Telefon",i:"phone",go:[SR_PROF],hl:'[data-pe="phone"]',ok:S&&profExOk},
  {t:"Moje media",s:"strava instagram youtube facebook media linki",p:"Ustawienia → Edytuj profil → Moje media",i:"link",go:[SR_PROF],hl:'[data-pet="mopen"]',ok:S&&profExOk},
  {t:"Moje jazdy",s:"jazdy kalendarz rekordy km statystyki historia seria",p:"Ustawienia → Edytuj profil → Moje jazdy",i:"bike",go:[SR_PROF,'[data-c="myrides"]'],ok:S&&reportOk},
  {t:"Moja teczka",s:"teczka konto wszystko",p:"Ustawienia → Edytuj profil → Moja teczka 👑",i:"folder",go:[SR_PROF],hl:'[data-a="tk"]',ok:KR},
  {t:"Serwis rowerowy",s:"serwis rower przebieg łańcuch części paragon gwarancja",p:"Ustawienia → Edytuj profil → Serwis rowerowy",i:"wrench",go:[SR_PROF,'[data-sv="open"]'],ok:typeof svOn==="function"&&svOn()},
  {t:"Ulubieni i listy",s:"ulubieni gwiazdka listy znajomi",p:"Ustawienia → Edytuj profil → Ulubieni i listy",i:"starf",go:[SR_PROF,'[data-c="favs"]'],ok:S&&favOk},
  {t:"Kto jest w grupie / na liście (przy wyborze osób)",s:"skład grupy kto jest na liście członkowie pokaż skład nie pamiętam kto rozwiń grupę listę",p:"Zaproś → Kto zobaczy? → 👥 Wybieram → Twoje grupy / Twoje listy → przycisk 👥 ⌄ przy nazwie",i:"users",fn:()=>{show(0);openWantForm(null);setTimeout(()=>{if(typeof openWho==="function"){openWho("form");ws.vis="pick";ws.grOpen=true;ws.plOpen=true;renderWho()}},300)},ok:S},
  {t:"Wybór osób: A–Z i często zapraszani",s:"kogo zapraszasz wybieram osoby a-z litery alfabet często zapraszasz zapraszano wybór osób wyczyść cofnij ok zaznacz ulubionych odznacz licznik",p:"Zaproś → Kto zobaczy? → 👥 Wybieram (pasek A–Z, „Często zapraszasz”)",i:"users",fn:()=>{show(0);openWantForm(null);setTimeout(()=>{if(typeof openWho==="function"){openWho("form");ws.vis="pick";renderWho()}},300)},ok:S},
  {t:"Nowa lista osób",s:"lista utwórz dodaj listę jako lista zapisz wybór z zaznaczonych",p:"Ustawienia → Edytuj profil → Ulubieni i listy → Nowa lista (albo 💾 przy szukaniu w oknach wyboru osób)",i:"list",go:[SR_PROF,'[data-c="favs"]'],hl:'[data-c="plnew"]',ok:S&&typeof plOk!=="undefined"&&plOk},
  {t:"Grupy",s:"grupy klub drużyna paczka załóż grupę link kod zaproszenia nowy kod przekaż grupę właściciel moderator",p:"Ustawienia → Ludzie → Grupy",i:"users",go:['[data-gx="hub"]'],ok:S&&typeof grOn==="function"&&grOn()},
  {t:"Prywatność",s:"prywatność kto widzi ukryj rekordy kalendarz",p:"Ustawienia → Edytuj profil → Prywatność",i:"lock",go:[SR_PROF,'[data-c="priv"]'],ok:S&&reportOk},
  {t:"Telegram",s:"telegram powiadomienia bot wiadomości",p:"Ustawienia → Edytuj profil → Powiadomienia → Telegram",i:"send",go:[SR_PROF,'[data-c="tg"]'],ok:typeof tgOn==="function"&&tgOn()},
  {t:"Kanał @PrzylesieGo",s:"kanał telegram ogłoszenia",p:"Ustawienia → Edytuj profil → Powiadomienia",i:"mega",go:[SR_PROF],hl:'a[href="https://t.me/PrzylesieGo"]',ok:S},
  {t:"Zmień hasło",s:"hasło password",p:"Ustawienia → Edytuj profil → Konto → Zmień hasło",i:"key",go:[SR_PROF,'[data-c="pwd"]'],ok:S},
  {t:"Trasy DEMO (testowe)",s:"trasa demo widmo testowe zaproszenie bez gpx dalekie miasta",p:"Ustawienia → Baza tras → plakietka 🧪 DEMO",i:"map",fn:()=>openRb(),ok:!!rbOk},
  {t:"Baza tras",s:"trasy gpx mapa odkryj",p:"Ustawienia → Baza tras",i:"map",fn:()=>openRb(),ok:!!rbOk},
  {t:"Pytaj „Jak poszło?”",s:"jak poszło ankieta ocena po jeździe km",p:"Ustawienia → Jazdy i zaproszenia",i:"bike",hl:"[data-ro]",ok:S&&reportOk},
  {t:"Ekipa demo: pokazuj",s:"ekipa demo konta demo zmyślone ukryj pokaż zombie testowe osoby",p:"Ustawienia → Jazdy i zaproszenia",i:"users",hl:'[data-dmo="show"]',ok:S&&!DEMO},
  {t:"Powiadomienia od Ekipy demo",s:"ekipa demo powiadomienia telegram dzwonek wycisz konta demo",p:"Ustawienia → Jazdy i zaproszenia",i:"bell",hl:'[data-dmo="notif"]',ok:S&&!DEMO&&typeof demoOpt!=="undefined"&&demoOpt.show},
  {t:"Okienka „Mam ochotę”",s:"mam ochotę okienko pop-up sygnał wyłącz",p:"Ustawienia → Jazdy i zaproszenia",i:"hand",hl:"[data-sgp]",ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Motyw: jasny / ciemny",s:"motyw ciemny jasny tryb nocny dark wygląd kolory",p:"Ustawienia → Wygląd i ekran → Motyw",i:"moon",hl:"[data-t]"},
  {t:"Przełącznik motywu (nagłówek)",s:"motyw przełącznik nagłówek szybko jasny ciemny księżyc słońce",p:"Nagłówek → przy nazwie PrzylesieGo! (księżyc / słońce)",i:"moon",hl:"#thmbtn",ok:KR},
  {t:"Powiadomienia na pulpicie",s:"powiadomienia pulpit desktop systemowe okienko przeglądarka dzwonek",p:"Nagłówek → przy nazwie PrzylesieGo! (dzwonek)",i:"bell",hl:"#dskbtn",ok:KR},
  {t:"Nick na górze ekranu",s:"nick nagłówek pokaż ukryj",p:"Ustawienia → Wygląd i ekran",i:"user",hl:"[data-sn]",ok:S},
  {t:"Pomoc przy starcie",s:"pomoc start powitanie",p:"Ustawienia → Wygląd i ekran",i:"help",hl:"[data-hs]"},
  {t:"Testowe zaproszenia",s:"test testowe ukryj pokaż",p:"Ustawienia → Testy",i:"flask",hl:"[data-ht]",ok:S&&testOk&&!DEMO},
  {t:"Spokojny wygląd testowych",s:"test miganie ramka",p:"Ustawienia → Testy",i:"flask",hl:"[data-tc]",ok:S&&testOk&&!DEMO},
  {t:"Powiadamiaj mnie o",s:"powiadamiaj powiadomienia moje aktywności rower bieg bieganie spacer spacery wędrówka wędrówki co lubię o czym dawać znać powiadomienia ekran startowy ukryte aktywności nie widzę zaproszeń sygnałów filtr aktywności",p:"Ustawienia → Jazdy i zaproszenia → Powiadamiaj mnie o",i:"heart",hl:'[data-stgo="acts"]',ok:S&&typeof stActsRow==="function"&&!!stActsRow()},
  {t:"Ekran startowy jeszcze raz",s:"ekran startowy powitanie kroki profil okolica aktywności start nowe konto",p:"Ustawienia → Testy → Pokaż ekran startowy jeszcze raz",i:"sparkles",hl:'[data-stgo="all"]',ok:S&&!DEMO&&meTester()&&typeof stOn==="function"&&stOn()},
  {t:"Funkcje testowe (BETA)",s:"beta nowe funkcje tester",p:"Ustawienia → Testy",i:"flask",hl:"[data-beta]",ok:meTester()&&!DEMO},
  {t:"Zostań testerem",s:"tester testowanie",p:"Ustawienia → na górze",i:"syringe",hl:".tcard",ok:S&&typeof testerCardHtml==="function"&&!!testerCardHtml()},
  {t:"Zamknij okno z dołu (✕)",s:"zamknij okno krzyżyk przewijanie dół koniec esc escape klawiatura klawisz",p:"Długie okno → przewiń na sam dół (na komputerze także Esc)",i:"x",fn:()=>say("Przewiń długie okno na sam dół — okrągły ✕ zamyka je bez wracania na górę. Na komputerze zamkniesz okno klawiszem Esc.")},
  {t:"Przewodnik Gawron: Mam ochotę",s:"przewodnik gawron samouczek krok po kroku jak dać znać tutorial prezentacja pokaz animacja kruk",p:"Pomoc → na górze → Gawron pokaże Ci „Mam ochotę”",i:"hand",fn:()=>{if(window.Gawron)Gawron.start("mam_ochote")},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Przewodnik Gawron: cała historia",s:"przewodnik gawron samouczek ekipa super ekipa zaproś ekipę tutorial prezentacja",p:"Pomoc → na górze → Cała historia",i:"hand",fn:()=>{if(window.Gawron)Gawron.start("mam_ochote_pelny")},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Pomoc — co potrafi aplikacja",s:"pomoc instrukcja jak działa nowości wersja",p:"Ustawienia → Pomoc i opinie",i:"help",fn:()=>openHelp()},
  {t:"Oceń aplikację / zgłoś błąd",s:"błąd zgłoś opinia ocena pomysł uwagi",p:"Ustawienia → Pomoc i opinie",i:"msg",go:['[data-c="fb"]'],ok:S&&fbOk},
  {t:"Numer budowy aplikacji",s:"wersja numer budowy build czy mam najnowsza aktualizacja odswiez",p:"Ustawienia → Pomoc i opinie (przy „Wersja”)",i:"help",go:['[data-c="help"]'],ok:S&&typeof isKingReal==="function"&&isKingReal()},   // tylko 👑
  {t:"Ślad i zrzut w zgłoszeniu",s:"ślad zrzut ekranu screen dowody usterka kroki przed błędem co klikałem odtworzenie",p:"Ustawienia → Pomoc i opinie → Oceń / zgłoś błąd",i:"clip",go:['[data-c="fb"]'],ok:S&&fbOk&&isSuper(uid)},   // KROK 110, tylko 👑
  {t:"Zainstaluj aplikację",s:"instaluj ikona ekran telefon",p:"Ustawienia → Pomoc i opinie",i:"phone",go:['[data-c="inst"]'],ok:!isStandalone()},
  {t:"Wyloguj",s:"wyloguj wyjdź",p:"Ustawienia → na dole",i:"logout",hl:'[data-c="out"]',ok:S},
  {t:"Usuń konto",s:"usuń konto skasuj rodo",p:"Ustawienia → na dole",i:"trash",hl:'[data-c="del"]',ok:S},
  {t:"Zaloguj się / załóż konto",s:"zaloguj konto rejestracja",p:"Ustawienia",i:"user",hl:'[data-c="login"]',ok:!S},
  {t:"Zaproszeni też (prywatne zaproszenie)",s:"zaproszeni też kto jeszcze zaproszony prywatne zaproszenie lista zaproszonych powiadomienie",p:"🔔 → zaproszenie prywatne (wiersz „Zaproszeni też”); pełna lista na karcie zaproszenia",i:"users",fn:()=>{const b=$("bellbtn");if(b)b.click()},ok:S},
  {t:"Kolizja z Twoją jazdą",s:"koliduje kolizja nie mogę kliknąć jadę zablokowane nakłada się ta sama godzina moja jazda przenieś się edytuj ją przejdź do niej",p:"Karta zaproszenia — pomarańczowa ramka „Koliduje z Twoją jazdą” (Przejdź do niej › / Edytuj ją ›)",i:"alert",fn:()=>show(0),ok:S},
  {t:"Filtry zaproszeń",s:"filtry filtruj kiedy gdzie osoba rower tempo zawijanie mam ochotę sygnały czerwony lejek aktywne filtry włączone",p:"Zaproszenia → Filtry (działają też w Imprezach; „Mam ochotę” pod 🔔 zawsze pokazuje wszystko)",i:"sliders",fn:()=>{show(0);openFlt()},ok:S},
  {t:"Kolejność zaproszeń: od najnowszych",s:"kolejność sortowanie sortuj najnowsze najświeższe ostatnio dodane data dodania",p:"Zaproszenia → karta „Najnowsze” w stosie kart nad listą albo lejek Filtry → Kolejność",i:"clock",fn:()=>{show(0);openFlt()},ok:S},
  {t:"Filtry imprez",s:"filtry imprez bieg marsz gravel szosa mtb kiedy gdzie zapisany",p:"Imprezy → Filtry",i:"sliders",fn:()=>{show(3);openFlt("ev")},ok:S&&typeof tabOk==="function"&&tabOk(3)},
  {t:"Zakres archiwum (starsze jazdy)",s:"archiwum starsze 3 miesiące rok wszystko historia stare jazdy zakres",p:"Zaproszenia → Archiwum (na dole) → 3 mies. / Rok / Wszystko",i:"archive",fn:()=>{show(0);archOpen=true;renderWants();setTimeout(()=>srPulse(document.querySelector("#wantarch .arng")||$("wantarch")),120)},ok:S},
  {t:"Szukaj starszych",s:"szukaj starszych stare jazdy archiwum ostatnio szukane historia wyszukiwania",p:"Lupa → wpisz tekst → Szukaj starszych",i:"search",fn:()=>openSrch(),ok:S},
  {t:"Zaproś na rower",s:"zaproś nowe zaproszenie utwórz jazda",p:"Zaproszenia → ➕",i:"plus",fn:()=>{show(0);openWantForm(null)},ok:S&&!pv},
  {t:"Zaproś na bieg, spacer albo wędrówkę",s:"aktywność bieg bieganie biegnę spacer spacery idę trekking wędrówka piesza las zaproszenie na bieg rodzaj aktywności",p:"Zaproszenia → ➕ → Aktywność (na górze formularza)",i:"run",fn:()=>{show(0);openWantForm(null)},ok:S&&!pv&&wActOk},
  {t:"Powiadomienia",s:"powiadomienia dzwonek",p:"Dzwonek w nagłówku",i:"alarm",fn:()=>$("bellbtn").click(),ok:S},
  {t:"Lista sygnałów „Mam ochotę”",s:"lista sygnałów mam ochotę dłoń licznik okno ekipa na dziś filtry sygnały przefiltruj aktywność relacja",p:"Zaproszenia → złote kółko „Ekipa” z liczbą obok 👤 (albo Filtry → Relacja → Sygnały)",i:"hand",fn:()=>{show(0);openSigWin()},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Czekaj na ekipę",s:"czekaj ekipa czeka jeszcze czeka okienko u chętnych czeka na chętnych zaproś teraz pytanie co 30 minut masz z kim jechać okienko reakcje dwie osoby autor sygnału",p:"Twój sygnał z min. 2 Reakcjami → okienko „Ekipa czeka” (też pod 🔔 i w oknie Ekipa)",i:"hourglass",fn:()=>{show(0);if(typeof sigAskUn==="function"&&sigAskUn().length){sigView="ask";renderSigAsk()}else say("Okienko „Ekipa czeka” pojawi się, gdy Twój sygnał dostanie co najmniej 2 Reakcje, a zaproszenia ekipy jeszcze nie będzie.")},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Mam ochotę",s:"mam ochotę sygnał chęć jazdy dłoń machanie bez godziny bieg spacer wędrówka trekking też mam ochotę reakcja zaproś ekipę ekipa na dziś super ekipa wspólna jazda jesteście umówieni ekipa już się umówiła masz z kim pobiegać konfetti pogoda twój sygnał zmień wycofaj do końca dnia północ wygasł tylko dziś",p:"Zielone kółko z dłonią nad ➕ (zostaje po wysłaniu — dotknij, by zmienić lub wycofać); „Ekipa na dziś” pod 🔔",i:"hand",fn:()=>{show(0);openSig(typeof sigActive==="function"&&sigActive()?"mine":"pick")},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Ekipa startuje (godzinę przed)",s:"ekipa startuje licznik godzinę przed start przypomnienie od godziny masz chętnych zaproś ekipę",p:"🔔 → Ekipa na dziś",i:"timer",fn:()=>{const b=$("bellbtn");if(b)b.click()},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Dopisz do ekipy",s:"dopisz dopisywanie doproś ekipa reakcja też mam ochotę zaproszenie z sygnału dopisany do ekipy koniec ekipy 15 min",p:"Karta zaproszenia z sygnału → dopraszanie (tylko osoby z Reakcją) albo 🔔 → „Dopisz ›”",i:"hand",fn:()=>{const b=$("bellbtn");if(b)b.click()},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Super ekipa",s:"super ekipa plakietka ekipa okienko zaproszenia podanie dłoni ekipy podały sobie dłonie połącz ekipy klamra reakcja na cudzy sygnał łańcuch",p:"🔔 → Ekipa na dziś albo złote kółko „Ekipa” nad kalendarzem (klamra; zaprasza autor sygnału)",i:"users",fn:()=>{const b=$("bellbtn");if(b)b.click()},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Masz z kim jechać",s:"masz z kim jechać ekipa na dziś powiadomienie jedziecie razem zaproś ekipę wspólne zaproszenie ekipa już jedzie dopisz doproś spóźniony",p:"🔔 → Ekipa na dziś",i:"users",fn:()=>{const b=$("bellbtn");if(b)b.click()},ok:S&&typeof sigOn==="function"&&sigOn()},
  {t:"Kto jest online",s:"online zielona kropka teraz w aplikacji aktywni",p:"Zielona kropka przy liczniku zaproszeń",i:"users",fn:()=>{show(0);const o=$("onlbtn");if(o)srPulse(o)},ok:S},
  {t:"Archiwum zaproszeń",s:"archiwum odbyte zakończone historia",p:"Zaproszenia → Archiwum (na dole)",i:"archive",fn:()=>{show(0);archOpen=true;renderWants();setTimeout(()=>srPulse($("wantarch")),120)},ok:S},
  {t:"Imprezy",s:"imprezy zawody maraton wyścig",p:"Talia kart w nagłówku → Imprezy",i:"medal",fn:()=>show(3),ok:typeof tabOk==="function"&&tabOk(3)},
  {t:"Zakładki (talia kart)",s:"zakładki talia karty przełącz przesuń palcem zaproszenia imprezy wieczorynki zaawansowane kółka plakietki nadchodzące nieprzeczytane",p:"Nagłówek, pod 🔔 i ⚙️",i:"pointer",fn:()=>{scrollTo({top:0});const d=$("tdeck");if(d)srPulse(d)},ok:S&&typeof visTabs==="function"&&visTabs().length>1},
  // 🛡️ Administracja
  {t:"Administracja",s:"admin panel",p:"Ustawienia → Administracja",i:"shield",go:[ADM],ok:A},
  {t:"Statystyki",s:"statystyki logowania aktywność wykresy",p:"Ustawienia → Administracja → Narzędzia",i:"chart",go:[ADM,'[data-c="stats"]'],ok:A},
  {t:"Zgłoszenia od użytkowników",s:"zgłoszenia błędy uwagi opinie",p:"Ustawienia → Administracja → Narzędzia",i:"msg",go:[ADM,'[data-c="fbadmin"]'],ok:A&&fbOk},
  {t:"Użytkownicy",s:"użytkownicy konta lista osób",p:"Ustawienia → Administracja → Narzędzia",i:"users",go:[ADM,'[data-c="users"]'],ok:A},
  {t:"Prywatność (administracja)",s:"prywatność kto co widzi",p:"Ustawienia → Administracja → Narzędzia",i:"lock",go:[ADM,'[data-c="privadm"]'],ok:A},
  {t:"Uprawnienia",s:"administratorzy testerzy uprawnienia",p:"Ustawienia → Administracja → Narzędzia",i:"shield",go:[ADM,'[data-c="perms"]'],ok:A},
  {t:"Funkcje testowe (flagi)",s:"flagi funkcje testowe wszyscy testerzy",p:"Ustawienia → Administracja → Narzędzia",i:"flask",go:[ADM,'[data-c="flags"]'],ok:K&&testerOk},
  {t:"Kolory nicków",s:"kolory nicków płeć",p:"Ustawienia → Administracja → Narzędzia",i:"palette",go:[ADM,'[data-c="colors"]'],ok:A&&genderOk},
  {t:"Etykiety notatek (👑)",s:"etykiety notatek słownik słowo ikona kolor plakietka wilk wataha kawa kebab nocna speeday",p:"Ustawienia → Administracja → Narzędzia",i:"tag",go:[ADM,'[data-nt="open"]'],ok:K},
  {t:"Wyjście przyciskiem „wstecz”",s:"wstecz cofnij wyjście zamknij aplikację przycisk telefonu android ostrzeżenie wychodzi",p:"Przycisk „wstecz” w telefonie — dwa razy, żeby wyjść",i:"logout",fn:()=>say("Naciśnij „wstecz” dwa razy (w ciągu 3 s), żeby wyjść z aplikacji."),ok:true},
  {t:"Losuj komentarz do zaproszenia",s:"losuj komentarz notatka zabawny śmieszny losowy żart pomysł opis zaproszenia sezonowy święta",p:"Zaproszenia → ➕ → Komentarz → 🎲 Losuj",i:"dices",fn:()=>{show(0);openWantForm(null)},ok:S&&!pv},
  {t:"Etykieta przy notatce",s:"etykieta notatki plakietka ikona kolor automatycznie same wataha wilk kawa kebab nocna speeday las jezioro deszcz góry notatka",p:"Zaproszenia → ➕ → Komentarz (słowo ze słownika)",i:"tag",fn:()=>{show(0);openWantForm(null)},ok:S&&!pv},
  {t:"Zakazane nicki",s:"zakazane słowa nicki blokada",p:"Ustawienia → Administracja → Narzędzia",i:"hand",go:[ADM,'[data-c="nickbans"]'],ok:A},
  {t:"Miejsca zbiórki",s:"miejsca zbiórki punkty",p:"Ustawienia → Administracja → Narzędzia",i:"pin",go:[ADM,'[data-c="places"]'],ok:A&&placeOk},
  {t:"Grupy — wszystkie (👑)",s:"grupy statystyki grup limit prośby",p:"Ustawienia → Administracja → Narzędzia",i:"users",go:[ADM,'[data-gx="adm"]'],ok:KR},
  {t:"Zaproszenia testowe / Ekipa demo",s:"generator demo ekipa ochotnicy testowe kroki konta grupy historia sprzątanie",p:"Ustawienia → Administracja → Zaproszenia testowe",i:"flask",go:[ADM,'[data-dx="open"]'],ok:KR},
  {t:"Żywa Ekipa demo",s:"żywa ekipa demo ruch żyje sama konta demo same zaproszenia na dobę liczniki dziś ostatnia tura aktywności",p:"Ustawienia → Administracja → Zaproszenia testowe → Żywa Ekipa demo 👑",i:"users",go:['[data-c="admin"]','[data-dx="open"]','[data-j="dm_live"] summary'],ok:KR},
  {t:"Aktywności kont demo",s:"aktywności konta demo bieg spacer wędrówka trekking rower generator bieg + spacer",p:"Ustawienia → Administracja → Zaproszenia testowe → krok 1 / krok 3 👑",i:"run",go:['[data-c="admin"]','[data-dx="open"]'],ok:KR},
  {t:"Wszystkie zaproszenia (👑)",s:"wszystkie prywatne zaproszenia",p:"Ustawienia → Administracja → Zaproszenia",i:"eye",go:[ADM,'[data-c="allw"]'],ok:K},
  {t:"Archiwum zaproszeń (👑)",s:"archiwum zakończone jazdy wszystkie",p:"Ustawienia → Administracja → Zaproszenia",i:"archive",go:[ADM,'[data-c="karch"]'],ok:K},
  {t:"Widoczny online",s:"niewidoczny online ukryj obecność",p:"Ustawienia → Administracja → Moja widoczność",i:"eye",go:[ADM],hl:"[data-ho]",ok:typeof canStealth==="function"&&canStealth()},
  {t:"Podgląd aplikacji",s:"podgląd jak widzi gość użytkownik tester",p:"Ustawienia → Podgląd aplikacji 👑",i:"eye",hl:'[data-c="pv"]',ok:KR}];
}

/* ---------- przejścia do miejsc w aplikacji ---------- */
function srPulse(el){if(!el)return;el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.remove("srhl");void el.offsetWidth;el.classList.add("srhl");setTimeout(()=>el.classList.remove("srhl"),3200)}
const srWait=(f,ms)=>new Promise(res=>{const t0=Date.now(),go=()=>{const v=f();if(v||Date.now()-t0>(ms||1500))res(v||null);else setTimeout(go,50)};go()});
/* 🖍 trafienie widać tam, dokąd prowadzi wynik (jak „Znajdź na stronie” w przeglądarce):
   karta pulsuje zieloną obwódką (3 × 1 s), a szukane słowa dostają żółte tło na ok. 6 s i powoli gasną */
let srGoQ="";
function srMark(root,q){
  const W=srNorm(q).split(/\s+/).filter(w=>w.length>=2);if(!root||!W.length)return;
  const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeValue.trim()&&!n.parentElement.closest("mark,script,style,input,textarea,select,svg")?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
  const nodes=[];while(tw.nextNode())nodes.push(tw.currentNode);
  const made=[];
  nodes.slice(0,400).forEach(node=>{const t=node.nodeValue,n=[...t].map(c=>srNorm(c).charAt(0)||c).join("");if(n.length!==t.length)return;
    const R=[];W.forEach(w=>{let i=n.indexOf(w);while(i>=0){R.push([i,i+w.length]);i=n.indexOf(w,i+w.length)}});if(!R.length)return;
    R.sort((a,b)=>a[0]-b[0]);const M=[];R.forEach(r=>{const l=M[M.length-1];if(l&&r[0]<=l[1])l[1]=Math.max(l[1],r[1]);else M.push(r.slice())});
    const f=document.createDocumentFragment();let p=0;M.forEach(([a,b])=>{if(a>p)f.appendChild(document.createTextNode(t.slice(p,a)));const m=document.createElement("mark");m.className="srmk";m.textContent=t.slice(a,b);f.appendChild(m);made.push(m);p=b});
    if(p<t.length)f.appendChild(document.createTextNode(t.slice(p)));node.parentNode.replaceChild(f,node)});
  setTimeout(()=>made.forEach(m=>m.classList.add("out")),5200);
  setTimeout(()=>made.forEach(m=>{const pa=m.parentNode;if(!pa)return;pa.replaceChild(document.createTextNode(m.textContent),m);pa.normalize()}),6400);
}
// pulsowanie + zaznaczenie słów; el może pojawić się chwilę później (renderowanie, przewijanie)
async function srFocus(find,q,box){const el=await srWait(find,1500);if(el){srPulse(el);srMark(el,q)}else if(box)srMark(box,q)}
function srGoGear(set){gearOpen=true;gearFrom="";set();renderGear()}
// zaproszenie ukryte przez Filtry albo „ukryj testowe” — najpierw je odsłoń, potem przewiń do karty
function srReveal(w,arch){let m="";
  if(hideTest&&w.is_test){hideTest=false;try{localStorage.setItem("hideTest","0")}catch(e){}deriveWants();m="Pokazuję też testowe zaproszenia."}
  if(typeof demoHidU==="function"&&demoHidU(w.user_id)){demoPeek=true;deriveWants();m="Pokazuję też Ekipę demo (do zamknięcia aplikacji)."}   // ⚙️ Ekipa demo ukryta (KROK 95)
  if(session&&(!arch||flt.arch)&&fltActive()&&!fltOk(w)){flt=fltEmpty();fltSave();m="Wyłączyłem filtry, żeby pokazać ten wynik."}
  if(!arch&&typeof wActShow==="function"&&!wActShow(w)){actPeek=true;m="Pokazuję też aktywności spoza „Powiadamiaj mnie o” (do zamknięcia aplikacji)."}   // 🔔 v283
  if(!arch&&typeof wAreaOk==="function"&&!wAreaOk(w))m=areaReveal(w.place_lat,w.place_lon,w.place_city||w.place)||m;   // 📍 v270: spoza Mojej okolicy → podgląd jej okolicy   // archiwum filtrujemy tylko z „Filtruj też archiwum”
  return m}
function srGoWant(w){const m=srReveal(w);const x=wants.find(y=>y.id===w.id);if(!x){say("Tego zaproszenia nie da się teraz pokazać.");return}goToWant(x);if(m)setTimeout(()=>say(m),400);
  setTimeout(()=>srFocus(()=>document.querySelector('#mywant .want[data-wid="'+x.id+'"],#wantlist .want[data-wid="'+x.id+'"]'),srGoQ),150)}
function srGoArch(w){
  if(!session){say("Archiwum widzą zalogowani.");return}
  const m=srReveal(w,true);
  if(Date.now()-new Date(w.starts_at).getTime()>30*864e5&&srOldR!==30)archDays=srOldR;   // starsza jazda: archiwum w zakresie z „Szukaj starszych”
  show(0);archOpen=true;archAll=true;renderWants();
  setTimeout(()=>{const el=document.querySelector('#wantarch .ai[data-wid="'+w.id+'"]');if(el){srPulse(el);srMark(el,srGoQ)}else{srPulse($("wantarch"));say("Tej jazdy nie widać w archiwum (30 dni).")}if(m)say(m)},80)}
// 🙋 sygnał: otwórz 🔔, rozwiń „Ekipa na dziś” i pokaż wiersz osoby
async function srGoSig(id){{const x=sigs.find(y=>y.user_id===id);if(x&&typeof areaReveal==="function"&&!sigList().includes(x)){const m=areaReveal(x.lat,x.lon,"okolica sygnału");if(m)setTimeout(()=>say(m),500)}}show(0);const b=$("bellbtn");if(b&&$("bellsheet").classList.contains("hide"))b.click();
  const h=await srWait(()=>document.querySelector('#bellsheet [data-bsec="sig"]'));if(h&&h.getAttribute("aria-expanded")==="false")h.click();
  srFocus(()=>{const r=document.querySelector(id===uid?'#bellsheet [data-sge]':'#bellsheet [data-sgr="'+id+'"],#bellsheet [data-sgz="'+id+'"]');return r&&r.closest(".sgrow")},srGoQ,$("bellsheet"))}
// 📣 wpis z tablicy: otwórz grupę na zakładce Tablica
function srGoPost(p){if(typeof grGo!=="function")return;grGo(p.group_id);
  srFocus(()=>document.querySelector('#gearpanel .gpost[data-pid="'+p.id+'"]'),srGoQ)}
function srGoEv(id){const e=evs.find(x=>x.id===id);if(e&&typeof nearOk==="function"&&!nearOk(e)){const m=areaReveal(e.lat,e.lon,e.place);if(m)setTimeout(()=>say(m),500)}evGo(id);setTimeout(()=>srFocus(()=>{const h=document.querySelector('#p3 [data-ev="tog"][data-id="'+id+'"]');return h&&h.closest(".ev")},srGoQ),150)}
function srGoRide(i){show(1);showRide(i);rcarScrollTo(i,true);setTimeout(()=>srFocus(()=>$("ridecard").textContent.trim()&&$("ridecard"),srGoQ),200)}
function srGoUser(id){if(id===uid){srGoGear(()=>{gearView="main"});const b=$("gearpanel").querySelector(SR_PROF);if(b)b.click();return}
  userBack="";tkFrom=false;userId=id;srGoGear(()=>{gearView="user"});if(isAdmin){delete admInfo[id];loadAdmInfo(id)}
  setTimeout(()=>srMark($("gearpanel").querySelector(".sheetbox"),srGoQ),120)}
async function srGoRoute(id){if(gearOpen){gearOpen=false;renderGear()}await rbLoad();rb.mode="browse";rb.open=id;rb.add=null;$("rbsheet").classList.remove("hide");renderRb();setTimeout(()=>srMark($("rbsheet"),srGoQ),150)}
function srGoBike(id){srGoGear(()=>{gearView="serwis";svSel=id;svPartOpen=false});svFetch(true)}
async function srGoOpt(o){
  if(o.fn){o.fn();return}
  srGoGear(()=>{gearView="main"});
  const P=$("gearpanel");
  for(const s of o.go||[]){const b=await srWait(()=>P.querySelector(s));if(!b){say("Ta opcja nie jest teraz dostępna.");return}b.click()}
  if(o.hl){const el=await srWait(()=>P.querySelector(o.hl));if(!el){say("Ta opcja nie jest teraz dostępna.");return}srPulse(el.closest(".ios-it,.tcard,.gprof,.pe-av")||el)}
}

/* ---------- okno ---------- */
function srCounts(L){const c={};L.forEach(x=>c[x.k]=(c[x.k]||0)+1);return c}
function srChips(L){
  const q=srQ.trim(),c=srCounts(L),av=SR_TY.filter(([k])=>k!=="opt"||srOpt).filter(([k])=>!q||c[k]||srTy===k);
  const ch=(k,t,ico,n)=>'<button type="button" class="fch'+(srTy===k?' on':'')+'" data-sk="ty" data-sv="'+k+'">'+(k==="sig"&&typeof sigCoin==="function"?sigCoin():uiIcon(ico))+esc(t)+(n!=null&&q?'<span class="fcn">'+n+'</span>':'')+'</button>';
  return ch("all","Wszystko","search",L.length)+av.map(([k,t,ico])=>ch(k,t,ico,c[k]||0)).join("");
}
// podświetlenie słów zapytania w nazwie (bez względu na polskie znaki: „lodz” znajdzie i podświetli „Łódź”)
function srHl(t,q){t=String(t||"");const W=srNorm(q).split(/\s+/).filter(Boolean);if(!W.length)return esc(t);
  const n=[...t].map(c=>srNorm(c).charAt(0)||c).join(""),on=new Array(t.length).fill(false);
  if(n.length===t.length)W.forEach(w=>{let i=n.indexOf(w);while(i>=0){for(let j=i;j<i+w.length;j++)on[j]=true;i=n.indexOf(w,i+w.length)}});
  let s="",m=false;[...t].forEach((c,i)=>{if(on[i]!==m){s+=on[i]?"<mark>":"</mark>";m=on[i]}s+=esc(c)});return s+(m?"</mark>":"")}
function srRow(x,q){return '<button type="button" class="fusr srr" data-sk="go" data-sv="'+esc(x.k+"|"+x.id)+'"><span class="fuic g">'+uiIcon(x.ico)+'</span><span class="fun"><span class="srt">'+srHl(x.t,q)+(x.k==="user"&&typeof demoTag==="function"?demoTag(x.id):'')+'</span>'+(x.sub?'<small class="srsub">'+esc(x.sub)+'</small>':'')+'</span></button>'}
/* 🕘 historia wyszukiwań: ostatnie 8 haseł w tym telefonie (po kliknięciu wyniku albo Enter) */
const srHistGet=()=>{try{const a=JSON.parse(localStorage.getItem("srHist")||"[]");return Array.isArray(a)?a.filter(x=>typeof x==="string"):[]}catch(e){return []}};
function srHistAdd(q){q=String(q||"").trim();if(q.length<2)return;const a=[q].concat(srHistGet().filter(x=>srNorm(x)!==srNorm(q))).slice(0,8);try{localStorage.setItem("srHist",JSON.stringify(a))}catch(e){}}
function srHistHtml(){const H=srHistGet();if(!H.length)return "";
  return '<div class="fulist srlist srhist"><div class="fulbl">Ostatnio szukane<button type="button" class="lnk srhclr" data-sk="hclr">Wyczyść</button></div>'
   +H.slice().reverse().map(t=>'<button type="button" class="fusr" data-sk="hq" data-sv="'+esc(t)+'"><span class="fuic g">'+uiIcon("clock")+'</span><span class="fun">'+esc(t)+'</span></button>').join("")+'</div>'}
/* 🗄 „Szukaj starszych”: zaproszenia sprzed ponad 30 dni dociągane z bazy dopiero na żądanie (zakres jak w archiwum) */
const srOldOk=()=>!!session&&!DEMO&&typeof oldLoad==="function"&&["all","done","want"].includes(srTy);
function srOldHtml(){
  if(!srOldOk()||!srQ.trim())return "";
  const R=ARCH_R,on=srOldR!==30;   // ten sam rząd co w archiwum: 30 dni (domyślnie) · 3 mies. · Rok · Wszystko
  return '<div class="srold"><span class="srolt">'+uiIcon("archive")+(on?'Szukam też w starszych: '+esc(archRName(srOldR).toLowerCase()):'Jazdy z ostatnich 30 dni — szukaj starszych:')+(isSuper(uid)?'':' <small>(Twoje jazdy)</small>')+'</span>'
   +'<span class="fchips srolc">'+R.map(([d,t])=>'<button type="button" class="fch'+(srOldR===d?' on':'')+'" data-sk="old" data-sv="'+d+'">'+t+'</button>').join("")+'</span>'
   +(srOldBusy?'<span class="note">Wczytuję…</span>':srOldMsg?'<span class="note">'+esc(srOldMsg)+'</span>':'')+'</div>'}
// d = 30 albo ponowne dotknięcie wybranego zakresu → wyłącz; mniejszy zakres po większym nie pobiera nic z bazy (oldIn przycina)
async function srOldGo(d){if(srOldBusy)return;
  if(d===30||d===srOldR){srOldR=30;srOldMsg="";srDraw(true);return}
  srOldBusy=true;srOldMsg="";srDraw(true);
  try{await oldLoad(d);srOldR=d;srOldMsg=oldIn(d).length?"":"Brak starszych jazd w tym okresie."}catch(err){srOldMsg="Nie udało się: "+(err&&err.message||"błąd")}
  srOldBusy=false;srDraw(true)}
// A–Z przy długiej liście nazw (osoby, grupy, listy, trasy) bez wpisanego tekstu — ten sam pasek co w Filtrach
const SR_AZ=["user","grp","list","route"];
function srListHtml(L){
  const q=srQ.trim(),all=srTy==="all";
  const pk=q.length>=3&&all&&typeof openHome==="function"?'<button type="button" class="fusr srr" data-sk="peek" data-sv="'+esc(q)+'"><span class="fuic g">'+uiIcon("eye")+'</span><span class="fun"><span class="srt">Podejrzyj okolicę: „'+esc(q)+'”</span><small class="srsub">Moja okolica → wyszukaj miejscowość i zobacz, co się tam dzieje</small></span></button>':'';   // 📍 v270
  if(!q&&all)return srHistHtml()+'<div class="note srhint">'+uiIcon("search")+' Wpisz, czego szukasz — zaproszenia, „Mam ochotę”, imprezy, wieczorynki, osoby, grupy i ich tablice, listy, trasy'+(srOpt?', opcje aplikacji':'')+'.<br>Filtry nie zawężają wyszukiwania. Bombel u góry pokaże wszystko z jednego rodzaju.</div>';
  const S=all?L:L.filter(x=>x.k===srTy);
  if(!S.length&&!all&&L.length)return '<div class="note srhint">W „'+esc(srTyName(srTy))+'” nic dla „'+esc(q)+'”.</div><button type="button" class="b g big srall" data-sk="ty" data-sv="all">Pokaż wszystkie wyniki ('+L.length+')</button>';   // wybrany rodzaj pusty, a inne mają trafienia
  if(!S.length)return srOldHtml()+(pk?'<div class="fulist srlist">'+pk+'</div>':'')+'<div class="note srhint">Nic nie znaleziono'+(q?' dla „'+esc(q)+'”':'')+'.'+(!srOpt&&q?'<br>Szukasz ustawienia? Włącz „Szukaj też w opcjach aplikacji”.':'')+'</div>';
  if(!q&&SR_AZ.includes(srTy)&&S.length>12){const L1=x=>(x.t||"").trim().charAt(0).toLocaleUpperCase("pl"),A=S.slice().sort((a,b)=>a.t.localeCompare(b.t,"pl")),az=[...new Set(A.map(L1).filter(c=>/\p{L}/u.test(c)))].sort((a,b)=>a.localeCompare(b,"pl"));
    return '<div class="fulwrap">'+(az.length?'<div class="faz" id="srfaz" aria-hidden="true" data-all="'+esc(az.join(""))+'"></div>':'')+'<div class="fulist srlist'+(az.length?' az':'')+'"><div class="fulbl">'+esc(srTyName(srTy))+' · '+A.length+'</div>'+A.map(x=>srRow(x,q).replace('<button type="button" class="fusr srr"','<button type="button" class="fusr srr" data-fl="'+esc(L1(x))+'"')).join("")+'</div></div>'}
  const by={};S.forEach(x=>(by[x.k]=by[x.k]||[]).push(x));
  return '<div class="fulist srlist">'+srOldHtml()+SR_ORDER.filter(k=>by[k]).map(k=>{
    // w sekcji: najlepsze trafienia na dole (przy polu); bez tekstu — od najbliższych dat / alfabetycznie
    const A=by[k].sort((a,b)=>q?(a.sc-b.sc||b.ord-a.ord||a.t.localeCompare(b.t,"pl")):(k==="want"||k==="ev"||k==="ride"||k==="done"?a.ord-b.ord:a.t.localeCompare(b.t,"pl"))),   // bez tekstu: nazwy od góry alfabetycznie (jak w Filtrach), daty — najbliższe na dole
      lim=all&&!srMore?4:0,cut=lim&&A.length>lim,V=cut?A.slice(-lim):A;
    return '<div class="fulbl">'+esc(srTyName(k))+' · '+A.length+'</div>'+(cut?'<button type="button" class="fusr fumore" data-sk="ty" data-sv="'+k+'">Pokaż wszystkie ('+A.length+') ›</button>':'')+V.map(x=>srRow(x,q)).join("")}).join("")+pk+'</div>';
}
let srLast=[];
function srDraw(keepScroll){
  const box=$("srstk");if(!box)return;
  srLast=srItems(srQ.trim());
  $("srchips").innerHTML=srChips(srLast);
  const old=box.querySelector(".fulist"),fromBottom=keepScroll&&old?old.scrollHeight-old.clientHeight-old.scrollTop:0;
  box.innerHTML=srListHtml(srLast);srSel=-1;if($("srfaz"))fltAzFit("srfaz");
  const u=box.querySelector(".fulist");if(u)u.scrollTop=Math.max(0,u.scrollHeight-u.clientHeight-fromBottom);
  const c=$("srclr");if(c)c.style.visibility=srQ||srTy!=="all"?"visible":"hidden";
}
function renderSrch(){
  const p=$("srchsheet");
  p.innerHTML='<div class="bsbox fltbox srbox" role="dialog" aria-modal="true" aria-label="Szukaj"><div class="bsgrab"></div>'
   +'<div class="bshead"><button type="button" class="lnk" data-sk="close">Zamknij</button><b>Szukaj</b><button type="button" class="lnk" id="srclr" data-sk="clear" style="color:var(--bad);text-align:right;min-width:64px">Wyczyść</button></div>'
   +'<div class="fchips srchips" id="srchips"></div>'
   +'<div class="fstk" id="srstk"></div>'
   +'<div class="ios-it sropt"><span class="ios-ic" style="background:#8e8e93">'+uiIcon("sliders")+'</span><span class="ios-t">Szukaj też w opcjach aplikacji<small>Pokaże, gdzie jest ustawienie, i od razu je otworzy</small></span>'+iosSw(srOpt,"data-sk","opt")+'</div>'
   +'<input class="bsq srch" id="srq" type="search" placeholder="Szukaj w aplikacji…" autocomplete="off" enterkeyhint="search" value="'+esc(srQ)+'"></div>';
  srDraw();
}
// pierwsze otwarcie: dociągnij to, czego aplikacja jeszcze nie ma w pamięci (trasy, jawne grupy, 👑 wszystkie grupy, serwis)
function srPreload(){
  const re=()=>{if(!$("srchsheet").classList.contains("hide"))srDraw(true)};
  if(rbOk&&session&&!rbList)rbLoad().then(re,()=>{});
  if(typeof grOn==="function"&&grOn()&&grFind===null&&typeof grSearch==="function")grSearch("").then(re,()=>{});
  if(isKingReal()&&typeof grK!=="undefined"&&!grK&&typeof grKLoad==="function")grKLoad().then(re,()=>{});
  if(typeof svOn==="function"&&svOn()&&!svLoad().loaded)svFetch().then(re,()=>{});
  if(!srPosts&&!srPostsP&&session&&!DEMO&&typeof grMine!=="undefined"){const G=grMine.filter(m=>m.status==="active").map(m=>m.group_id);
    if(G.length)srPostsP=sb.from("group_posts").select("id,group_id,author,body,created_at").in("group_id",G).order("created_at",{ascending:false}).limit(300)
      .then(r=>{srPosts=r.error?[]:(r.data||[]);srPostsP=null;re()},()=>{srPosts=[];srPostsP=null})}
}
function openSrch(){
  if(gearOpen){gearOpen=false;renderGear()}
  srMore=false;srTy="all";$("srchsheet").classList.remove("hide");   // każde otwarcie zaczyna od „Wszystko” (wpisany tekst zostaje)
  renderSrch();srPreload();
  setTimeout(()=>{const i=$("srq");if(i)try{i.focus({preventScroll:true})}catch(e){i.focus()}},60);
}
function closeSrch(){const p=$("srchsheet");p.classList.add("hide");p.innerHTML=""}
$("srchbtn").onclick=openSrch;
$("srchsheet").addEventListener("click",e=>{
  if(e.target===$("srchsheet")){closeSrch();return}
  const b=e.target.closest("[data-sk]");if(!b)return;
  const k=b.dataset.sk,v=b.dataset.sv;
  if(k==="close"){closeSrch();return}
  if(k==="clear"){srQ="";srTy="all";srMore=false;const i=$("srq");if(i){i.value="";i.focus()}srDraw();return}
  if(k==="opt"){srOpt=!srOpt;try{localStorage.setItem("srOpt",srOpt?"1":"0")}catch(err){}if(!srOpt&&srTy==="opt")srTy="all";b.classList.toggle("on",srOpt);b.setAttribute("aria-checked",srOpt);srDraw();return}
  if(k==="ty"){srTy=srTy===v&&!b.classList.contains("fumore")?"all":v;srMore=false;srDraw();const c=$("srchips"),on=c&&c.querySelector(".fch.on");if(on)on.scrollIntoView({block:"nearest",inline:"center"});return}
  if(k==="peek"){closeSrch();openHome();const i=$("homeq");if(i){i.value=v;homeFind()}return}   // 📍 v270: podgląd okolicy wpisanej miejscowości
  if(k==="go"){const x=srLast.find(y=>y.k+"|"+y.id===v);if(!x)return;srGoQ=x.k==="opt"?"":srQ.trim();srHistAdd(srQ);closeSrch();x.go();return}
  if(k==="hq"){srQ=v;const i=$("srq");if(i){i.value=v;i.focus()}srDraw();return}   // 🕘 hasło z historii
  if(k==="hclr"){try{localStorage.removeItem("srHist")}catch(err){}srDraw();return}
  if(k==="old"){srOldGo(+v);return}
});
$("srchsheet").addEventListener("input",e=>{if(e.target.id==="srq"){srQ=e.target.value;srDraw()}});
/* ⌨️ klawiatura (komputer): „/” albo Ctrl/⌘+K otwiera okno; ↑ ↓ wybierają wynik, Enter otwiera (bez wyboru — najlepszy, czyli dolny), Esc zamyka */
let srSel=-1;
function srSelPaint(){const R=[...document.querySelectorAll("#srstk .srr")];R.forEach((b,i)=>b.classList.toggle("srsel",i===srSel));const b=R[srSel];if(b)b.scrollIntoView({block:"nearest"})}
$("srchsheet").addEventListener("keydown",e=>{
  if(e.key==="Escape"){e.preventDefault();closeSrch();return}
  if(e.target.id!=="srq")return;
  const R=[...document.querySelectorAll("#srstk .srr")];
  if(e.key==="ArrowUp"||e.key==="ArrowDown"){if(!R.length)return;e.preventDefault();srSel=srSel<0?R.length-1:Math.max(0,Math.min(R.length-1,srSel+(e.key==="ArrowUp"?-1:1)));srSelPaint();return}
  if(e.key==="Enter"){e.preventDefault();srHistAdd(srQ);const b=R[srSel>=0?srSel:R.length-1];if(b)b.click();else e.target.blur()}});
// pasek liter A–Z (jak w Filtrach): dotknięcie / przesuwanie palcem przewija listę
$("srchsheet").addEventListener("pointerdown",e=>{const z=e.target.closest("#srfaz");if(!z)return;e.preventDefault();try{z.setPointerCapture(e.pointerId)}catch(x){}z.dataset.dn="1";fltAzGo(e,z)});
$("srchsheet").addEventListener("pointermove",e=>{const z=e.target.closest("#srfaz");if(z&&z.dataset.dn)fltAzGo(e,z)});
$("srchsheet").addEventListener("pointerup",()=>{const z=$("srfaz");if(z){delete z.dataset.dn;[...z.children].forEach(x=>x.classList.remove("on"))}});
document.addEventListener("keydown",e=>{
  if(!$("srchsheet").classList.contains("hide")||!$("srchbtn").offsetParent)return;
  const t=e.target,typing=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  if((e.key==="k"||e.key==="K")&&(e.ctrlKey||e.metaKey)||(e.key==="/"&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey)){e.preventDefault();openSrch()}});
// na wąskich ekranach ❓ jest schowane (CSS) — kropkę „Nowości” pokazujemy wtedy na ⚙️
(()=>{const mq=window.matchMedia?matchMedia("(max-width:600px)"):null;const sync=()=>{const g=$("gear");if(g)g.classList.toggle("newdot",!!mq&&mq.matches&&relNew())};
  sync();if(mq)try{mq.addEventListener("change",sync)}catch(e){mq.addListener&&mq.addListener(sync)}})();
