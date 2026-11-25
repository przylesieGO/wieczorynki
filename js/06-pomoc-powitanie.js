/* ---------- ❓ Pomoc: „Co potrafi PrzylesieGo?” ---------- */
let helpOff=false;
try{helpOff=localStorage.getItem("helpOff")==="1"}catch(e){}
function setHelpOff(v){helpOff=!!v;try{localStorage.setItem("helpOff",helpOff?"1":"0")}catch(e){}}
const helpPrefHtml=()=>'<div class="note" style="margin-top:14px">Pokazuj pomoc przy starcie</div><div class="seg">'
  +[["1","Tak"],["0","Nie"]].map(([k,t])=>'<button data-hs="'+k+'" class="'+((helpOff?"0":"1")===k?"on":"")+'">'+t+'</button>').join("")+'</div>';
let helpMore=false;
// ⚙️ wiersze-przyciski w grupach (ikonka, nazwa, opis, wartość, ›) — górna część panelu
function gRow(col,ico,t,sub,right,attrs,tag){tag=tag||"button";
  return '<'+tag+' '+(tag==="button"?'type="button" ':'')+'class="ios-it ios-row" '+attrs+'><span class="ios-ic" style="background:'+col+'">'+uiIcon(ico)+'</span><span class="ios-t">'+t+(sub?'<small>'+sub+'</small>':'')+'</span>'+(right||'')+'<span class="ios-chev" aria-hidden="true">›</span></'+tag+'>'}
const gGrp=(h,rows)=>{rows=rows.filter(Boolean);return rows.length?'<div class="ios"><div class="ios-gh">'+h+'</div><div class="ios-grp">'+rows.join("")+'</div></div>':''};
function profCardHtml(){
  const n=me.nick||"";
  const mi=Object.keys(medias[uid]||{}).map(k=>{const m=MEDIA.find(x=>x[0]===k);return m?'<span>'+uiIcon(m[1])+'</span>':''}).join("");
  return '<button type="button" class="gprof" data-c="nick"><span class="gav'+(genders[uid]==="K"?' k':'')+(avData[uid]?' ph':'')+'" aria-hidden="true">'+(avData[uid]?avImg(uid,"gavi"):esc((n||"?").charAt(0).toUpperCase()))+'</span><span class="gpi"><span>'+(n?nk(uid):'<b>Ustaw nick</b>')+(isAdmin?' '+uiIcon("shield"):'')+'</span>'
   +'<span class="gml">'+esc(session.user.email||"")+'</span>'+(stazTxt(uid)?'<span class="gsz">'+esc(stazTxt(uid))+'</span>':'')+(mi?'<span class="gmi">'+mi+'</span>':'')+'<span class="ged">'+(n?(profExOk?'Edytuj profil':'Nick i płeć'):'Ustaw nick i płeć')+'</span></span><span class="ios-chev" aria-hidden="true">›</span></button>';
}
// 🗺️ wyróżniona karta „Baza tras”: ile tras, 3 najpopularniejsze miniatury, „Odkryj trasy”, „+ Dodaj”
function rbHeroHtml(){
  if(!rbOk)return "";
  if(!rbList&&!rbHeroLoading){rbHeroLoading=true;rbLoad().then(()=>{rbHeroLoading=false;if(gearOpen&&gearView==="main")renderGear()},()=>{rbHeroLoading=false})}
  const L=(rbList||[]).filter(x=>!x.hidden),top=L.slice().sort((a,b)=>rbUses(b)-rbUses(a)||String(b.created_at).localeCompare(String(a.created_at))).slice(0,3);
  return '<div class="rbhero"><div class="rbhh">'+uiIcon("map")+'Baza tras</div><div class="rbhp">'
   +(rbList?(L.length?L.length+' '+plf(L.length,["trasa","trasy","tras"])+' od ekipy — wybierz, sprawdź wiatr i zaproś jednym kliknięciem.':'Jeszcze pusto — dodaj pierwszą trasę: utwórz zaproszenie z plikiem GPX i włącz „Dodaj do bazy tras”.'):'Wczytuję trasy…')+'</div>'
   +(top.length?'<div class="rbhm">'+top.map(x=>'<button type="button" data-rbhero="'+esc(x.id)+'" aria-label="'+esc(x.name)+'">'+rbSvg(x.preview,100,64,true)+'<small>'+String(Math.round(+x.km))+' km'+(rbUses(x)?' · '+rbUses(x)+'×':'')+'</small></button>').join("")+'</div>':'')
   +'<div class="rbhb"><button type="button" class="rbh1" data-rbopen="1">Odkryj trasy ›</button><button type="button" class="rbh2" data-rbadd="1">'+(isAdmin?'+ Dodaj trasę':'+ Zaproś z trasą')+'</button></div></div>';
}
let rbHeroLoading=false;
// ⚙️ ustawienia w stylu Ustawień iPhone'a (Apple HIG): grupy, ikonka, przełącznik / mały segment
// klocki wspólne dla całego panelu: przełącznik i wiersz z kontrolką; nagłówki grup zawsze przez gGrp (jeden styl)
const iosSw=(on,attr,val)=>'<button type="button" class="ios-sw'+(on?' on':'')+'" role="switch" aria-checked="'+on+'" '+attr+'="'+val+'"></button>';
const iosIt=(col,ico,t,sub,ctrl)=>'<div class="ios-it"><span class="ios-ic" style="background:'+col+'">'+uiIcon(ico)+'</span><span class="ios-t">'+t+(sub?'<small>'+sub+'</small>':'')+'</span>'+ctrl+'</div>';
// Wygląd i ekran (też dla gościa)
function setLookHtml(guest){
  const theme='<span class="ios-seg">'+[["light","Jasny"],["dark","Ciemny"],["auto","Auto"]].map(([k,n])=>'<button type="button" data-t="'+k+'" class="'+(themeMode===k?"on":"")+'">'+n+'</button>').join("")+'</span>';
  return gGrp("Wygląd i ekran",[
    iosIt("#5e5ce6","moon","Motyw",themeMode==="auto"?"Jak w telefonie":"",theme),
    guest?"":iosIt("#0a84ff","user","Nick na górze ekranu","",iosSw(showNick,"data-sn",showNick?"0":"1")),
    iosIt("#30d158","help","Pomoc przy starcie","",iosSw(!helpOff,"data-hs",helpOff?"1":"0"))]);
}
// Jazdy i zaproszenia: „Jak poszło?” (karta Baza tras stoi nad tą grupą)
function setRidesHtml(){
  return gGrp("Jazdy i zaproszenia",[reportOk?iosIt("#34c759","bike","Pytaj „Jak poszło?” po jeździe",repOff()?"Wyłączone — możesz ocenić jazdę z karty w 🗄 Archiwum":"Raz po jeździe: km, średnia, ocena (bez testowych)",iosSw(!repOff(),"data-ro",repOff()?"0":"1")):"",
    sigOn()?iosIt("#248a3d","hand","Okienka „Mam ochotę”",sigPopOff()?"Wyłączone — sygnały znajdziesz pod 🔔":"Pokaż od razu, gdy ktoś ma ochotę na jazdę, bieg albo spacer",iosSw(!sigPopOff(),"data-sgp",sigPopOff()?"0":"1")):"",
    typeof demoOptHtml==="function"?demoOptHtml():""]);   // 🧪 Ekipa demo (KROK 95, js/18)
}
// Testy: Testowe zaproszenia (każdy z włączoną funkcją) + Funkcje testowe (tylko testerzy)
function setTestHtml(){
  if(DEMO)return "";   // 🎮 w demo bez sekcji „Testy”
  return gGrp("Testy",[testOk?iosIt("#ff453a","flask","Testowe zaproszenia",hideTest?"Ukryte — widzisz tylko prawdziwe (Twoje zostają)":"Widoczne — wyłącz, żeby widzieć tylko prawdziwe",iosSw(!hideTest,"data-ht",hideTest?"0":"1")):"",testOk?iosIt("#ff453a","flask","Spokojny wygląd testowych",testCalm?"Sama etykieta 🧪 TEST — bez migania i czerwonych pasków":"Wyłączony — testowe karty mają migającą czerwoną ramkę",iosSw(testCalm,"data-tc",testCalm?"0":"1")):"",meTester()?iosIt("#bf5af2","flask","Funkcje testowe",betaOn?"Widzisz funkcje w budowie (🧪 BETA)":"Wyłączone — widzisz aplikację tak jak wszyscy",iosSw(betaOn,"data-beta",betaOn?"0":"1")):""]);
}
// pełny opis (rozwijany pod krótką pomocą)
// 📲 instalacja jako aplikacja (PWA): Android/Chrome — systemowe okienko; iPhone — instrukcja
let instPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();instPrompt=e;if(gearOpen)renderGear()});
window.addEventListener("appinstalled",()=>{instPrompt=null;try{localStorage.setItem("stepInstall","1")}catch(e){}try{renderSteps()}catch(e){}if(gearOpen)renderGear();say("✅ Zainstalowano — PrzylesieGo! jest na ekranie telefonu.")});
const isStandalone=()=>(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
// 📲 instrukcja instalacji — wspólna dla Pomocy i ⚙️ (decyzja właściciela 2026-11-16 11:48)
// najpierw przeglądarka, w której jesteś teraz; pozostałe rozwijane niżej
function instEnv(){
  const ua=navigator.userAgent||"",ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),android=/Android/.test(ua);
  const inApp=/Telegram|FBAN|FBAV|Instagram|Messenger|Line\//i.test(ua);
  let k="desk";
  if(ios)k=/CriOS/.test(ua)?"ioschrome":/FxiOS|EdgiOS|GSA/.test(ua)?"iosother":"ios";
  else if(android)k=/SamsungBrowser/.test(ua)?"samsung":/Firefox/.test(ua)?"firefox":"chrome";
  return {k,ios,android,mobile:ios||android,inApp};
}
const INST_G={
  ios:["iPhone / iPad — Safari",["Stuknij <b>Udostępnij</b> — kwadrat ze strzałką w górę (na dole ekranu albo przy pasku adresu).","Przewiń i wybierz <b>„Do ekranu początkowego”</b>.","Stuknij <b>„Dodaj”</b>."]],
  ioschrome:["iPhone — Chrome",["Stuknij <b>Udostępnij</b> przy pasku adresu (kwadrat ze strzałką).","Wybierz <b>„Dodaj do ekranu początkowego”</b> (gdy nie ma — otwórz adres w Safari).","Stuknij <b>„Dodaj”</b>."]],
  iosother:["iPhone — inna przeglądarka",["Najpewniej zadziała w <b>Safari</b>: skopiuj adres i otwórz go w Safari.","Tam: <b>Udostępnij</b> → <b>„Do ekranu początkowego”</b> → <b>„Dodaj”</b>."]],
  chrome:["Android — Chrome",["Stuknij <b>⋮</b> w prawym górnym rogu.","Wybierz <b>„Zainstaluj aplikację”</b> albo <b>„Dodaj do ekranu głównego”</b>.","Potwierdź <b>„Zainstaluj”</b>."]],
  firefox:["Android — Firefox",["Stuknij <b>⋮</b> (menu — na dole albo u góry ekranu).","Wybierz <b>„Zainstaluj”</b> albo <b>„Dodaj do ekranu głównego”</b>.","Potwierdź — ikona pojawi się na ekranie."]],
  samsung:["Android — Samsung Internet",["Stuknij <b>☰</b> (menu na dolnym pasku) — albo ikonę instalacji w pasku adresu.","Wybierz <b>„Dodaj stronę do”</b> → <b>„Ekran startowy”</b>.","Potwierdź <b>„Dodaj”</b>."]],
  desk:["Komputer — Chrome / Edge / Safari",["<b>Chrome / Edge:</b> ikona instalacji (monitor ze strzałką) po prawej stronie paska adresu → „Zainstaluj”.","<b>Safari na Macu:</b> menu Plik → „Dodaj do Docka”."]]
};
function instGuideHtml(){
  const E=instEnv(),ol=a=>'<ol class="inst">'+a.map(x=>'<li>'+x+'</li>').join("")+'</ol>';
  if(E.inApp)return '<div class="note warnbox">⚠️ Otwierasz PrzylesieGo! w przeglądarce wbudowanej w '+(/Telegram/i.test(navigator.userAgent)?'Telegram':'komunikator')+' — stąd nie da się zainstalować.</div>'
    +ol(["Stuknij <b>⋯</b> albo ikonę udostępniania w rogu.",E.ios?"Wybierz <b>„Otwórz w Safari”</b>.":"Wybierz <b>„Otwórz w przeglądarce”</b> (Chrome).","Tam otwórz ❓ Pomoc i zainstaluj według instrukcji."]);
  const me=INST_G[E.k],others=Object.keys(INST_G).filter(k=>k!==E.k&&!(E.k==="iosother"&&k==="ios"));
  return '<div class="instme"><div class="instb">Twoja przeglądarka: <b>'+me[0]+'</b></div>'+ol(me[1])+'</div>'
   +'<details class="instx"><summary>Inne przeglądarki i komputer</summary>'+others.map(k=>'<div class="instb">'+INST_G[k][0]+'</div>'+ol(INST_G[k][1])).join("")+'</details>';
}
function instHtml(){
  return '<button class="sback" data-c="back">‹ Ustawienia</button><div class="sname" style="margin-top:26px">📲 Zainstaluj aplikację</div>'
   +(instPrompt?'<button class="b sbtn" data-c="instgo">📲 Zainstaluj teraz</button><div class="note" style="margin:10px 0 2px">albo ręcznie:</div>':'')
   +'<div class="sleft">'+instGuideHtml()+'<div class="note" style="margin-top:10px">Po instalacji PrzylesieGo! otwiera się jak zwykła aplikacja: pełny ekran bez paska przeglądarki, ikona z dwoma kołami, liczba powiadomień na ikonie.</div></div>';
}
document.addEventListener("click",e=>{if(!e.target.closest("[data-betafb]"))return;
  if(session&&fbOk){gearOpen=true;gearView="fb";renderGear()}
  else say(session?"Zgłaszanie uwag będzie dostępne za chwilę — odśwież aplikację.":"🧪 To wersja testowa. Zaloguj się, a uwagi zgłosisz w ⚙️ → „Oceń aplikację / zgłoś błąd”.")});
function helpFullHtml(){
  const tg=feat("telegram_dm"),rides=tabOk(1),sec=(t,items)=>'<div class="hfs"><b>'+t+'</b><ul>'+items.map(x=>'<li>'+x+'</li>').join("")+'</ul></div>';
  return '<div class="hfull">'
   +sec("📲 Instalacja",["PrzylesieGo! to aplikacja z przeglądarki (PWA) — instalujesz ją z poziomu przeglądarki, bez sklepu. Instrukcja dla Twojej przeglądarki jest na samej górze Pomocy (i w ⚙️ → 📲 Zainstaluj aplikację).",
     "Po instalacji: ikona z dwoma kołami, pełny ekran, liczba nieprzeczytanych powiadomień na ikonie. Aktualizacje przychodzą same."])
   +sec("✨ Pierwsze kroki",["Przez 14 dni od założenia konta na górze Zaproszeń jest karta <b>„Pierwsze kroki”</b> — odhacza się sama (nick, instalacja, pierwsza jazda, Telegram, ulubieni). „Ukryj” chowa kartę; pozostałe kroki zostają pod 🔔 jako <b>„✨ Dokończ start”</b>."])
   +sec("🚲 Zapraszanie",[
     "<b>➕ Zaproś na rower</b> (prawy dolny róg) otwiera formularz. Na dole zawsze są „Wyślij” i „Anuluj”; ✕ albo „Anuluj” po zmianach pytają, czy odrzucić.",
     "<b>Dzień i godzina:</b> Dziś / Jutro / Inny dzień, godzina na kartkach zegara (przeciągnij palcem albo ▲▼) i skróty „Za 30 min”, 17:30, 18:00, 19:00.",
     "<b>↔ Zakres godzin</b> (np. 17:30–19:30): każdy wybiera „Pasuje mi o…”, Ty ustalasz start. Dopóki nikt nie wybrał godziny, na Twojej karcie jest <b>„Wybierz godzinę ›”</b> (okienko z zakresem); gdy są głosy — <b>„✅ Ustal 18:00 (3 osoby)”</b> (najczęściej wybierana), a pod spodem „Inna godzina ›”. Po ustaleniu: „✓ 18:00 · zmień”. Jeśli nie ustalisz — ustali się sam 1 h przed początkiem zakresu (najwięcej chętnych).",
     "<b>🗺️ Trasa GPX</b> (opcjonalnie): inni zobaczą długość, mapę z wiatrem na odcinkach i pobiorą plik. Kosz obok usuwa trasę.",
     "<b>Tempo:</b> Senior Adventure 15–18, Turystycznie 18–24, SPEEDAY 26+ km/h albo ✏️ własne. Bez wyboru — tempo dowolne.",
     "<b>Dystans</b> albo <b>„Na ile jedziesz?”</b> (domyślnie 2 h). Pod zegarem widać „⏱ Jazda ok. 18:00–20:40”.",
     "<b>Kilka zaproszeń dziennie</b> — ale nie mogą na siebie nachodzić (+15 min zapasu). Gdy nachodzą, okienko pod zegarem i pasek nad „Wyślij” robią się żółte, a „Ustaw 11:55” podpowiada najwcześniejszą wolną godzinę.",
     "<b>🧪 Testowe / 🚴 Prawdziwe:</b> testowe są na próbę (czerwona migająca plakietka TEST, na kanale z oznaczeniem). Możesz je ukryć: ⚙️ → Testy → „Testowe zaproszenia”.",
     "<b>Kto zobaczy?</b> 🌍 Wszyscy (także kanał Telegram) albo 🔒 ⭐ Ulubieni / 👥 wybrane osoby. Prywatne widzą tylko zaproszeni; do startu jazdy mogą doprosić kolejne osoby (po starcie przycisk znika).",
     "W oknie wyboru osób (👥 Wybieram): szukanie po nicku, filtry (kobiety, mężczyźni, ulubieni, teraz…), rząd <b>„Często zapraszasz”</b> — osoby, które najczęściej zapraszasz (dotknięcie zaznacza), przy nicku <b>„zapraszano N×”</b>, a przy długiej liście <b>pasek A–Z</b> — dotknij litery albo przesuń po nich palcem, żeby przeskoczyć do osób na tę literę. Przy każdej grupie i liście (sekcje „Twoje grupy” i „Twoje listy”) jest przycisk <b>👥 ⌄</b> — dotknięcie rozwija skład (kto jest w grupie / na liście), bez zaznaczania; na komputerze skład widać też po najechaniu kursorem.",
     "<b>Aktywność</b> (na górze formularza): rower, bieg, spacer albo wędrówka (piesza, np. do lasu, nad rzekę). Przy biegu, spacerze i wędrówce nie ma wyboru roweru ani tempa, a na karcie zamiast „Jadę!” jest „Biegnę!” / „Idę!”; tytuł domyślny dostaje dopisek, np. „· bieg”.",
     "<b>🚲 Rower / teren</b> (przy rowerze): dla wszystkich (domyślnie), szosa, gravel, MTB, e-bike.",
     "<b>📍 Punkt zbiórki</b> (opcjonalnie): wybierz z listy, „✏️ Inne miejsce…” albo „🗺️ Wskaż na mapie…”. Przełącznik „Dodaj do listy miejsc” zapisze miejsce dla wszystkich. Na karcie „Mapa ›” otwiera nawigację.",
     "<b>Notatka:</b> gotowe (Kebab RIDE, Coffee Ride ☕, SPEEDAY…) albo własna. „↺ Jak ostatnio” ustawia godzinę z poprzedniego razu.",
     "<b>🏷️ Etykieta notatki:</b> etykiety powstają same — gdy w notatce jest znane słowo (np. „Wataha” → wilk, „Kawa” → kubek, „jezioro” → fale, „las” → drzewo, „deszcz”, „świt”, „góry”, „kebab”, „SPEEDAY” — kilkaset słów), notatka pokaże się jako kolorowa plakietka z ikoną — na karcie, w oknach zaproszeń, pod 🔔 i w „Jak poszło?”. 👑 może dopisać własne słowa; tytuł i Telegram bez zmian.",
     "<b>📚 Wybierz z bazy tras</b> — gotowa trasa jednym dotknięciem. Przełącznik „📚 Dodaj trasę do bazy tras” zapisze Twój plik GPX dla wszystkich (z nazwą).",
     "<b>✏️ Edytuj</b> na swoim zaproszeniu (to z zielonym kółkiem „Ty”) — zmienisz godzinę, tempo, dystans, trasę i punkt zbiórki; zaproszeni dostaną powiadomienie."])
   +sec("🙋 Odpowiadanie",[
     "Na karcie zaproszenia: <b>„Jadę!”</b> (przy biegu „Biegnę!”, przy spacerze i wędrówce „Idę!”), <b>„Nie dam rady”</b>, a przy zakresie <b>„Pasuje mi o…”</b>. „Rezygnuję” — gdy zmienisz zdanie.",
     "Na karcie: godzina, 🌡 pogoda (temperatura, wiatr, deszcz), tempo, „📏 50 km · ⏱ ok. 18:00–20:40”, kto dołączył i kto nie da rady.",
     "Zaproszenia są pogrupowane w <b>karty dni</b>; kilka w jednym dniu — przewijasz w bok. <b>Godziny Twoich zaproszeń</b> na karcie dnia świecą na zielono (jak plakietka „Ty”), a prywatnych — gradientem od fioletu do zieleni. Widać je też wtedy, gdy Twoje zaproszenia są osobno na górze (klik w taką godzinę przewija do nich). Nad tytułem karty jest rząd ikon: <b>🌐</b> — zaproszenie dla wszystkich (przy prywatnych go nie ma), zielone <b>Ty</b> — Twoje zaproszenie, <b>🔒</b> — zaproszenie prywatne. Twoje zaproszenie ma ten sam wygląd karty co pozostałe. Wiersz zaproszonych pokazuje <b>✋</b>, pierwszy nick i „+N” (reszta); strzałka <b>⌄</b> rozwija pełną listę (tak samo „Dołączyli”). Czerwona plakietka <b>TEST</b> w rogu karty — tylko dla 👑.",
     "<b>🚴 Jak poszło?</b> — na górze okna widać miniaturę trasy z bazy (bez trasy — wyszarzony przykład); po jeździe (na dole okna jest pole „Nie pytaj mnie więcej po jazdach”) aplikacja (i bot na Telegramie) pyta: pojechałeś?, ile km, średnia prędkość, ocena jazdy i trasy GPX, jak było. Przy trasie z bazy od razu ocenisz ją (malownicza, trudność, ruch aut, plakietki, komentarz). Wyłączysz w ⚙️. Autor potwierdza, kto był. Odpowiedzi widać w archiwum i w statystykach (karta osoby: potwierdzone jazdy i km).",
     "<b>🚴 TRWA</b> — od startu do końca jazdy: bez edycji, dołączania i dopraszania. Potem zaproszenie trafia do <b>🗄 Archiwum</b> na dole listy z podsumowaniem: kto pojechał, ile km (plan). Archiwum pokazuje 30 dni — bomble <b>3 mies. / Rok / Wszystko</b> sięgają dalej (starsze: Twoje jazdy, czyli wystawione przez Ciebie albo z Twoim „Jadę!”).",
     "<b>🔍 Szukaj</b> (lupa w nagłówku): jedno okno przeszukuje wszystko — zaproszenia, dzisiejsze „Mam ochotę”, imprezy, wieczorynki, osoby, grupy i wpisy z tablic Twoich grup, listy, trasy i serwis (też po rodzaju roweru, tempie i nickach zaproszonych); odbyte jazdy na górze listy. Filtry nie zawężają wyników. Jazdy sprzed ponad 30 dni: po wpisaniu tekstu wybierz zakres <b>30 dni / 3 mies. / Rok / Wszystko</b> (jak w archiwum). Przy pustym polu widać <b>ostatnio szukane</b>, a przy długiej liście osób, grup czy tras — pasek liter A–Z. Po kliknięciu wyniku karta pulsuje, a szukane słowa są przez chwilę podświetlone na żółto. Na komputerze: „/” albo Ctrl+K otwiera okno, strzałki wybierają, Enter otwiera. Włącz „Szukaj też w opcjach aplikacji”, a wynik pokaże, gdzie jest ustawienie, i od razu je otworzy.",
     "<b>🔍 Filtry</b> (lejek ze strzałkami na początku rzędu, przed licznikiem zaproszeń; szary, gdy filtrowanie jest nieaktywne, <b>czerwony z liczbą</b>, gdy włączony jest choć jeden filtr — żeby łatwo zauważyć, że lista jest zawężona; sama kolejność „od najnowszych” go nie zaczerwienia, bo świeci wtedy 🕓): na górze <b>Źródło</b> — przełączniki „Zaproszenia testowe” i „Konta demo” (zielone ✓ = pokazuj, czerwone ✕ = ukryj; gdy Ekipa demo jest wyłączona w ⚙️, „Konta demo” odsłania ją tylko do zamknięcia aplikacji), dalej widoczność (otwarte, prywatne, grupy), relacja (ulubieni, zaproszony), aktywność, kiedy, <b>kolejność</b> („Od najnowszych” — karty dni układają się wg daty dodania zaproszenia, nie terminu, z dopiskiem „dodano …”; znika razem z filtrami), gdzie (miasto, dzielnica, miejsce), rower / teren, tempo i osoby — kilka naraz, z liczbą zaproszeń przy nicku i paskiem liter A–Z. Te same filtry działają w zakładce <b>Imprezy</b> (przycisk „Filtry” i skróty Gravel, Bieg, Moje…) — tam, gdzie mają sens (np. tempo nie ukrywa imprez); „Mam ochotę” pod 🔔 jest zawsze pokazane w całości, bo to powiadomienia. Z „Filtruj też archiwum” wybierzesz zakres archiwum. Na komputerze bomble układają się w kilku rzędach. Włączone filtry widać w pasku pod nagłówkiem — ✕ usuwa jeden, „Wyczyść” wszystkie. Po ponownym wejściu do aplikacji filtry same się czyszczą. Z karty osoby: „🔍 Pokaż zaproszenia z …”.",
     "<b>Licznik nad listą</b> — ile zaproszeń widzisz i w ilu bierzesz udział. <b>Twoje zaproszenia</b> są na górze; <b>przycisk Filtry</b> (lejek ze strzałkami sortowania) stoi przed licznikiem; gdy coś filtruje, jest <b>czerwony</b>, a liczba na nim pokazuje, ile filtrów jest włączonych — otwiera okno Filtry, a w nim m.in. <b>Kolejność</b> „od najnowszych” (wg daty dodania, z szarą datą „dodano”). W rzędzie „Twoje zaproszenia” po prawej są trzy bomble: <b>🕓</b> (szybkie sortowanie od najnowszych), złote kółko z machającą dłonią i napisem <b>Ekipa</b> z liczbą dzisiejszych sygnałów (patrz „Mam ochotę”) oraz <b>👤</b>, które jest zawsze (gdy nie masz własnych zaproszeń, jest wyszarzone, a po kliknięciu pojawia się komunikat „Nie masz żadnych zaproszeń”): pokazuje wszystkie Twoje zaproszenia osobno na górze, w kolejności terminów (filtry ich nie chowają) albo, wyłączone, zwija je do kalendarza."])
   +sec("🔔 Powiadomienia",[
     "<b>🔔 w nagłówku</b> — wszystko w jednym miejscu: <b>📩 Do Ciebie</b> (od innych, prywatne i dla wszystkich), <b>🙋 Twoje zaproszenia</b> (kto dołączył, zmiany), odpowiedzi na Twoje zgłoszenia i — przez pierwsze dni — <b>✨ Dokończ start</b>. Sekcje zwijasz i rozwijasz dotknięciem nagłówka; czerwone kółko = nieprzeczytane (liczba także na ikonie aplikacji). Zaproszenie <b>znika spod 🔔, gdy jazda się skończy</b> (razem z liczbą na czerwonym kółku) — zakończone jazdy znajdziesz w archiwum.",
     "Po wejściu wyskakuje okienko, gdy ktoś zaprosił Cię prywatnie. Prywatne zaproszenie ma w okienku fioletową plakietkę „PRYWATNE” (z kłódką) i listę „Zaproszeni też”; pod 🔔 przy prywatnym zaproszeniu jest wiersz <b>„Zaproszeni też: …”</b> (pierwsze 3 nicki i +N — pełna lista na karcie zaproszenia); testowe — czerwoną z ikoną kolby. Dopóki okienko jest otwarte, strona pod spodem nie przewija się i nie reaguje. Dowiesz się też, gdy ktoś zrezygnuje i <b>🔁 wróci</b> do Twojej jazdy.",
     "Gdy zaproszenie nachodzi na jazdę, <b>którą sam prowadzisz</b>, na karcie jest pomarańczowa ramka „Koliduje z Twoją jazdą …”, a „Jadę!” jest szare — najpierw zmień godzinę albo odwołaj swoją jazdę: <b>„Przejdź do niej ›”</b> przewija do jej karty, <b>„Edytuj ją ›”</b> otwiera jej formularz. Przy jeździe kogoś innego aplikacja zapyta „Przenieś się?”.",
     "<b>Czerwona liczba na ➕</b> — ile zaproszeń <b>innych osób</b> jest na dziś (Twoich nie liczy). Po przewinięciu w dół przycisk zwija się do samego ➕.",
     tg?"<b>Bot Telegram</b> napisze prywatnie: zaproszenie, zmiana godziny i szczegółów, ustalenie startu, kto dołączył, przypomnienie ~1 h przed jazdą. Włączysz: ⚙️ → Edytuj profil → Telegram → Połącz z Telegramem → w Telegramie START. Wyłączysz tam samo (Rozłącz).":"",
     session?"<b>Kanał @PrzylesieGo</b> na Telegramie — ogłoszenia nowych jazd dla wszystkich.":""].filter(Boolean))
   +(typeof sigOn==="function"&&sigOn()?sec("🟡 Mam ochotę",[
     "<b>Przewodnik Gawron</b> — animowany Gawron na rowerze pokazuje krok po kroku, jak dać znać (podświetla przyciski; niczego nie wysyła). Startuje sam przy pierwszym wejściu; ponownie uruchomisz go tutaj albo na górze Pomocy:"+'<span class="gwgo"><button type="button" class="fch on" data-gwgo="mam_ochote">'+uiIcon("hand")+' Jak dać znać (4 kroki)</button><button type="button" class="fch" data-gwgo="mam_ochote_pelny">Cała historia (14 kroków)</button></span>',
     "Masz ochotę na jazdę, ale bez pomysłu na godzinę i trasę? Dotknij <b>zielonego kółka z dłonią</b> nad ➕ (widać je, gdy na dziś nie ma zaproszeń). Po wysłaniu sygnału kółko zostaje — z mniejszą dłonią i plakietką (zielony ptaszek po lewej i liczba „Też mam ochotę” po prawej). Wybierz: rower, bieg, spacer albo trekking.",
     "<b>Lista sygnałów</b> — w rzędzie „Twoje zaproszenia” (nad kalendarzem) jest <b>złote kółko z machającą dłonią, napisem Ekipa i liczbą</b> dzisiejszych sygnałów; dotknij, a otworzy się okno „Ekipa na dziś” z tym samym co pod 🔔 — wiersze sygnałów, <b>klamra Super ekipy</b> („Super ekipa ›”, „Jedziecie razem ›”, „Dopisz ›”), „Masz z kim jechać”, „Ekipa startuje o …” i przypomnienia — oraz własnymi filtrami (aktywność: rower, bieg, spacer, wędrówka; relacja: moje, z moją Reakcją, ulubieni). Klamra zostaje, gdy pasuje choć jeden jej sygnał. Powiadomienie „Masz z kim …” (gdy nie jesteś autorem sygnału) nie powtarza się w tym oknie obok klamry i samo oznacza się jako przeczytane po otwarciu okna albo rozwinięciu sekcji „Ekipa na dziś” pod 🔔. Gdy w tym oknie zostawisz włączony filtr, na kółku „Ekipa” świeci <b>czerwona kropka</b>. To samo okno otwiera bombel <b>Sygnały</b> w Filtry → Relacja. Pod 🔔 sygnały są zawsze w całości — Filtry ich nie zawężają.",
     "<b>Komunikat</b> (opcjonalnie): jeden z gotowych, np. „Nogi same kręcą”, albo „Inne…” — własny, do 40 znaków (bez wulgaryzmów i linków; administrator może go ukryć).",
     "<b>Kto zobaczy?</b> Sygnał widzą zawsze wszyscy zalogowani (pod 🔔 i na kanale Telegram) — bez wybierania osób.",
     "Inni dostają <b>okienko „X ma ochotę”</b> ze zdjęciem i komunikatem (kilka osób — przewijasz w bok), a pod 🔔 sekcję <b>„Ekipa na dziś”</b>. Odpowiadasz dłonią <b>„Też mam ochotę!”</b> — zaproszenie zakłada autor sygnału.",
     "<b>Dłoń „Też mam ochotę!”</b> — dajesz znać, że też chcesz; reakcje się sumują, a autor dostaje powiadomienie (i wiadomość od bota, jeśli go połączył).",
     "<b>Zaproś ekipę ›</b> (tylko u autora sygnału, gdy ktoś dał dłoń — pod 🔔, w „Twój sygnał” i w powiadomieniu „Masz z kim jechać!”) — jeden sygnał to jedna ekipa: autor i osoby z „Też mam ochotę!”. To od razu prywatne zaproszenie na dziś z zakresem godzin do osób, które dały dłoń, bez pytania o zgodę; komunikat sygnału staje się tytułem zaproszenia. Możesz zmienić na „Wszyscy” — wtedy ekipa nie dostanie imiennego zaproszenia.",
     "<b>Masz z kim jechać!</b> (przy biegu „Masz z kim pobiegać!”, przy spacerze i wędrówce „Masz z kim iść…”) — gdy do ekipy dołącza kolejna osoba, wszyscy z ekipy dostają powiadomienie pod 🔔 (autor jak dotąd: „X też ma ochotę”) i wiadomość od bota (od 5:30). Autor ma w nim przycisk „Zaproś ekipę ›”. Gdy powstanie wspólne zaproszenie na dziś, powiadomienia znikają, a przy sygnale (i w klamrze Super ekipy) pojawia się <b>„Jedziecie razem ›”</b> (przy biegu, spacerze i wędrówce „Jesteście umówieni ›”) — przenosi do zaproszenia. Wspólne zaproszenie liczy się tylko z tą samą aktywnością co sygnał.",
     "<b>Ekipa już jedzie</b> (przy biegu, spacerze i wędrówce „Ekipa już się umówiła”) — gdy ktoś da dłoń po założeniu wspólnego zaproszenia, organizator dostaje powiadomienie (i wiadomość od bota) z przyciskiem <b>„Dopisz Nick ›”</b> — otwiera dopraszanie z tą osobą już zaznaczoną. Ten sam przycisk widzi przy sygnale każdy, kto jest w zaproszeniu. Nowa osoba widzi „Ekipa już jedzie”, więc nie zakłada drugiego zaproszenia.",
     "Okienko zaproszenia od ekipy ma na górze <b>złoty pas</b>: moneta z dłonią, <b>EKIPA</b> albo <b>SUPER EKIPA</b> i 👥 liczba osób; złota obwódka okienka (zaproszenia ekipy są zawsze prywatne, więc bez plakietki „prywatne”). Zamiast „zaprasza Cię” — „Doczekałeś się jazdy!” (biegu, spaceru, wędrówki), a niżej „Zaprasza Nick” z ikoną sygnalisty (moneta z dłonią i piorunem); przy SUPER EKIPIE — „Ekipy Nick + Nick”: autorzy sygnałów, które się połączyły. W okienku jest też pogoda na start, jak na karcie.",
     "<b>Dopisywanie do ekipy</b> — w zaproszeniu założonym z sygnału każdy uczestnik może dopisać kolejną osobę (przycisk dopraszania na karcie albo „Dopisz ›” pod 🔔), ale tylko taką, która dała Reakcję przy sygnale kogoś z zaproszenia (albo dostała Reakcję od kogoś z zaproszenia) — bez wybierania dowolnych osób z listy; autor dopisuje jak w każdym zaproszeniu. Dopisywać można do startu jazdy. Wszyscy w zaproszeniu dostają pod 🔔 „Nick dopisany do ekipy”.",
     "<b>Ekipa startuje o …</b> — godzinę przed startem wspólnego zaproszenia ekipy przy sygnałach tej ekipy pojawia się pomarańczowy licznik („Ekipa startuje o 19:00 · za 45 min · 4 os.”), a wszyscy pozostali dostają pod 🔔 powiadomienie (i wiadomość na kanale Telegram, gdy kanał jest włączony): dajesz Reakcję, a ktoś z ekipy Cię dopisze.",
     "<b>Od godziny masz chętnych</b> — gdy ktoś dał Reakcję na Twój sygnał ponad godzinę temu, a zaproszenia wciąż nie ma, dostajesz przypomnienie pod 🔔 (i od bota, jeśli go połączyłeś) z przyciskiem „Zaproś ekipę ›” — raz na sygnał.",
     "<b>Koniec ekipy</b> — 15 min po starcie wspólnego zaproszenia sygnały tej ekipy (i klamra Super ekipy) znikają spod 🔔, powiadomienia o nich gasną, a Reakcji nie da się już dać (tak samo jak spóźnialscy mają 15 min na dołączenie).",
     "Przy ekstremalnej pogodzie (burza, ulewa, śnieg, upał, mróz, silne porywy) w okienkach sygnału pojawia się krótka uwaga, a gdy ktoś da Ci „Też mam ochotę!”, na ekranie poleci konfetti (nie przy ograniczonych animacjach). Dłoń „Też mam ochotę!” odhacza też wiersz pod 🔔 jako przeczytany.",
     "<b>Super ekipa</b> — gdy <b>dwie ekipy podadzą sobie dłonie</b>: masz własny sygnał, dajesz Reakcję na sygnał innej osoby, a ktoś z jej ekipy (ona albo osoba z jej dłonią) daje Reakcję na Twój. Połączenia łańcuchem (A z B, B z C) tworzą jedną Super ekipę tej samej aktywności (min. 3 osoby razem). Pod 🔔 klamra łączy te sygnały; przycisk <b>„Super ekipa (N) ›”</b> widzi tylko autor połączonego sygnału — otwiera jedno prywatne zaproszenie do wszystkich (autorów i osób z dłonią), bez pytania o zgodę; tytuł to „SUPER EKIPA”, a w notatce jest komunikat autora. Pozostali widzą klamrę z napisem „Ekipy podały sobie dłonie — zaprosi autor sygnału”. Gdy wspólne zaproszenie już jest, ale ktoś z klamry jeszcze w nim nie jest, przycisk zmienia się w <b>„Dopisz (N) ›”</b> (albo „Dopisz Nick ›”); gdy są już wszyscy — „Jedziecie razem ›” (tylko na pasku klamry).",
     "Swój sygnał otworzysz <b>dotknięciem kółka z dłonią</b> (okienko „Twój sygnał”: kto ma też ochotę, „Zaproś ekipę ›”, „Zmień”, „Wycofaj”) albo pod 🔔. Po wycofaniu znika u wszystkich, reakcje się zerują, a osoby z „Też mam ochotę!” dostaną ciche powiadomienie. Ponowne „Daj znać” tego dnia to nowy sygnał (a informacja „wycofał sygnał” znika) (kanał Telegram dostaje wiadomość raz dziennie). <b>Sygnał obowiązuje tylko dziś</b> — o północy wygasa (otwarte okienko samo się zamknie), a wspólne zaproszenie ekipy liczy się tylko ze startem dziś. Od 21:00 przy sygnałach i w klamrze widać <b>„do końca dnia …”</b> (w ostatniej godzinie na pomarańczowo); „Zaproś ekipę ›” wieczorem proponuje najbliższy kwadrans dziś, a przy innym dniu formularz ostrzeże, że zaproszenie nie połączy się z ekipą. Okienko „X ma ochotę” pokazuje się raz na sygnał — także na innym telefonie czy komputerze już nie wróci; <b>„OK”</b> oznacza też wiersz pod 🔔 jako przeczytany (✕ tylko zamyka). Okienka wyłączysz w ⚙️ → Jazdy i zaproszenia."]):'')
   +(tabOk(3)?sec("🏁 Imprezy",[
     "Rajdy, gravele, maratony, biegi i marsze. Na karcie: data, miejsce, dystanse (z przewyższeniem i limitem czasu), „🏁 start za 12 dni”, zapisy trwają / zakończone, kto z nas jedzie.",
     "<b>Rozwiń kartę</b>, wybierz dystans i kliknij „Jadę!” (przy biegu „Biegnę”, przy marszu „Idę”). ❤ Lubię, 📅 do Google Kalendarza, udostępnij.",
     "<b>Filtry</b> nad listą (dla zalogowanych) — aktywność, rodzaj roweru, kiedy, gdzie, relacja (moje, jadę, zaproszony, ulubieni) i osoba. To te same filtry co w Zaproszeniach: ustawione tu działają też tam. Bomble Gravel / Szosa / MTB / E-bike / Bieg / Marsz / Moje to skróty, „Wszystkie” je czyści.",
     "<b>📍 W okolicy</b> — imprezy w promieniu 50 / 100 / 200 km od <b>Mojej miejscowości</b> (ustawisz w filtrze albo w ⚙️ → Edytuj profil → Moja miejscowość) albo od Twojej lokalizacji z telefonu. Na każdej karcie widać odległość w linii prostej.",
     "<b>＋ Dodaj imprezę</b> — każdy zalogowany. Autor i admin edytują; ⧉ Duplikuj tworzy kolejną edycję (rok i daty +1). Dystanse ułożysz, przeciągając ⋮⋮. Usuwa admin (autor prosi o usunięcie)."]):'')
   +(rbOk?sec("🗺️ Baza tras",[
     "<b>⚙️ → Baza tras</b> — trasy, którymi jeździmy. Sortowanie: najczęściej wybierane, najlepsze, najbardziej malownicze, najtrudniejsze, najłatwiejsze, najmniej aut, najwięcej lasu, asfalt, teren, gastronomia, najdłuższe, najbliżej (od Mojej miejscowości); filtr roweru i szukajka.",
     "<b>Szczegóły trasy:</b> mapa z wiatrem (czerwone = pod wiatr), długość, przewyższenie, czas, <b>📍 miejscowości na trasie</b> (rozwijana lista z kilometrem od startu), oceny i komentarze.",
     "<b>Nawierzchnia i otoczenie</b> (z OpenStreetMap, liczone raz dla trasy): ile asfaltu, szutru i gruntu, ile w lesie oraz <b>po drodze</b> — kawiarnie, restauracje, sklepy, woda i serwis (do 200 m, z kilometrem). Rankingi: najwięcej lasu, asfalt, teren, gastronomia.",
     "<b>🌦 Przed jazdą:</b> wybierz dzień i godzinę startu — pogoda godzina po godzinie (3 h przed, cała jazda, 3 h po), wiatr w połowie jazdy, zachód słońca, ostrzeżenia (deszcz, porywy, gołoledź, zmrok). Gdy w drugą stronę jest lepiej — „↺ Odwróć”.",
     "<b>🎒 Co zabrać</b> — lista dopasowana do pogody i długości jazdy; odhaczaj, co już spakowane (zapamiętane w telefonie).",
     "<b>⭐ Oceń trasę</b> — gwiazdki, malownicza, trudność, ruch aut, plakietki i komentarz (widzą wszyscy). <b>🚲 Zaproś na tę trasę</b> otwiera formularz z wybraną trasą.",
     "Trasy dodaje się z zaproszenia z plikiem GPX (przełącznik w formularzu albo „📚 Do bazy tras” na karcie). Autor i admin zmieniają nazwę, ukrywają i usuwają."]):'')
   +(typeof isKingReal==="function"&&isKingReal()?sec("🧪 Zaproszenia testowe (tylko 👑)",[   // js/18 — panel 👑
     "<b>⚙️ → Administracja → Zaproszenia testowe</b> — zmyślone konta i zaproszenia do zabawy. Idziesz krokami od góry: <b>1 Konta demo</b> (ile kont gra) → <b>2 Grupy demo</b> (Tak/Nie) → <b>3 Zaproszenia</b> → <b>4 Historia</b> (Tak/Nie). Numer kroku zielenieje, gdy krok jest zrobiony; po prawej stan, np. „✓ 20 kont” albo „czeka na krok 1”.",
     "Każdy suwak ma opis na przykładzie, np. „jawne 70 % — z 10 zaproszeń 7 widzi każdy, 3 tylko zaproszeni”. „Nie” przy grupach = zaproszenia i historia bez grup.",
     "<b>Aktywności kont demo</b> (krok 1, lista „Konta”): pod każdym kontem bomble Rower / Bieg / Spacer / Wędrówka — dotknij, aby dodać albo zabrać (co najmniej jedna). Konto zaprasza, daje znać i dołącza tylko w swoich aktywnościach. Wiersz konta otwiera jego kartę (historia, statystyki, teczka).",
     "<b>Krok 3 — Aktywności</b>: wybierz, co generować (np. sam bieg albo bieg + spacer); liczba przy bomblu = ile grających kont ją ma. Rower dostaje trasę dopasowaną do roweru konta (zbiórka na starcie trasy, w notatce km i przewyższenie), bieg / spacer / wędrówka — bez roweru i tempa, tytuł automatyczny.",
     "Niżej, <b>Na stałe</b>: <b>Żywa Ekipa demo</b> — przełącznik „Żyje sama” (konta demo co 15 min, 6–22: zaproszenia, „Mam ochotę” i Reakcje, zapisy, tablice grup, „Jak poszło?”), suwak <b>Ruch</b> (zaproszeń na dobę, np. 4 → ok. 3 sygnały), aktywności, które wolno zakładać, liczniki <b>Dziś</b> i <b>ostatnia tura</b>; dalej <b>Ochotnicy</b> (prawdziwe osoby za ich zgodą — filtry, lista, Dodaj / Wypisz nad listą), <b>Odpowiedzi kont demo</b> i <b>Sprzątanie</b>."]):'')
   +(session&&isSuper(uid)?sec("🏷️ Etykiety notatek (tylko 👑)",[   // KROK 103 — słownik note_tags
     "Etykiety działają same — aplikacja ma wbudowany słownik (kilkaset słów, lista na dole ekranu). Twoje słowa mają pierwszeństwo: dopiszesz nowe albo poprawisz wbudowane (to samo słowo z inną ikoną albo dodane i wyłączone).",
     "<b>⚙️ → Administracja → Narzędzia → Etykiety notatek</b>: słowo → ikona i kolor. Dodaj słowo, wybierz ikonę i kolor (paleta albo własny), sprawdź na przykładowej notatce i zapisz.",
     "Słowo działa od początku wyrazu, bez wielkości liter i polskich znaków („wilk” łapie „Wilki”). Pierwsze pasujące od góry wygrywa — kolejność zmienisz ▲ ▼.",
     "Przełącznik wyłącza słowo bez usuwania; ✏️ edytuje, 🗑 usuwa. Zmianę widać u wszystkich po odświeżeniu (do minuty)."]):'')
   +sec("📍 Moja okolica",[
     "Pod nazwą aplikacji jest plakietka <b>📍 miejscowość · km</b> — tak daleko sięga Twoja okolica. Domyślnie 20 km od Twojej miejscowości (bez miejscowości: od Pułtuska).",
     "Kliknij plakietkę: zobaczysz krąg z zaproszeniami (zielone), sygnałami „Mam ochotę” (złote) i imprezami (granatowe) dookoła. <b>Suwak</b> zmienia promień od 5 do 50 km albo „cała Polska”.",
     "<b>Moja miejscowość → Zmień</b> — wpisz miejscowość albo użyj lokalizacji z telefonu. Od niej liczymy okolicę i powiadomienia, np. „Ekipa startuje o …” dostajesz tylko z jazd w Twojej okolicy. Twój sygnał „Mam ochotę” pokazuje się w okolicy Twojej miejscowości.",
     "<b>Podejrzyj inną okolicę</b> — wpisz miejscowość (albo kliknij ⭐ ulubioną), żeby sprawdzić, co się tam dzieje. Plakietka robi się fioletowa (👁), a ✕ wraca do Twojej okolicy. Podgląd nie zmienia powiadomień i znika po ponownym wejściu do aplikacji. ☆ przy wyniku dodaje miejscowość do ulubionych (do 10)."])
   +sec("⭐ Ludzie",[
     "Dotknij nicku: karta osoby — zdjęcie, „Z nami od…”, media, a jeśli ktoś pozwolił: miejscowość i „Zadzwoń / SMS”; „🚴 Zaproś na rower”, ☆ dodaj do ulubionych. ⭐ ulubieni są zawsze na górze list.",
     "🟢 zielona kropka przy nicku = osoba ma teraz otwartą aplikację. Przy nickach: ⭐ ulubiony, 💉 tester, 💡 3 zrealizowane pomysły/zgłoszenia, 👑 główny admin. Administratorów pokaże filtr „Administratorzy” w oknach wyboru osób — do nich piszesz, gdy coś nie działa."])
   +(session&&typeof plOk!=="undefined"&&plOk?sec("📋 Listy",[
     "<b>⚙️ → Edytuj profil → Ulubieni i listy</b>: własne listy osób, np. „Gravelowcy”, „Szybcy”. Osobę dodasz też z jej karty (dotknij nicku).",
     "Przy zaproszeniu, w „Kto zobaczy?” zaznaczysz całą listę jednym dotknięciem (sekcja „Twoje listy”). Lista rozwija się do osób w chwili wysłania.",
     "Tylko Ty widzisz swoje listy — nikt nie wie, że jest na Twojej liście. Wybór kilku osób zapiszesz jako listę w oknach wyboru osób — link <b>„Jako lista”</b> obok „Wyczyść” (od 2 zaznaczonych osób). Listę można przekształcić w grupę."]):'')
   +(typeof grOn==="function"&&grOn()?sec("👥 Grupy",[
     "<b>⚙️ → Edytuj profil → Grupy</b>: załóż własną grupę (nazwa, kolor, ikona) albo dołącz do istniejącej. Grupa może być <b>jawna</b> (widać ją w wyszukiwaniu) albo <b>ukryta</b>; dołączanie wolne albo na prośbę / zaproszenie (kłódka).",
     "Założyciel jest właścicielem, może wyznaczyć moderatorów i przekazać grupę innemu członkowi. Grupę założysz też z jednej albo kilku list. Limit członków zwiększa na prośbę 👑; zapraszać można do 100 osób na dobę.",
     "<b>Link z kodem grupy</b> (O grupie → Zaproszenie linkiem) widzą i kopiują właściciel i moderatorzy; „Nowy kod” unieważnia stary link. W <b>Staty</b> prawdziwe km innych osób widzisz, gdy ta osoba i Ty udostępniacie wyniki jazd (Prywatność) — inaczej km z planu zaproszenia.",
     "W grupie: <b>Tablica</b> (ogłoszenia do 500 znaków; nowe wpisy z plakietką), <b>Ludzie</b>, <b>Staty</b> (wspólne jazdy, najaktywniejsi) i <b>O grupie</b>.",
     "Zaproszenie dla grupy wybierzesz w „Kto zobaczy?” — zobaczą je wszyscy członkowie, także ci, którzy dołączą później. Karta ma kolor i etykietę grupy; dotknięcie etykiety otwiera grupę."]):'')
   +(reportOk&&session?sec("🚴 Moje jazdy",[
     "<b>⚙️ → Edytuj profil → Moje jazdy</b>: kalendarz jazd (odbyte, planowane, imprezy), rekordy, serie, km w sezonie, ulubiony dzień i pora.",
     "W <b>Prywatności</b> zdecydujesz, czy inni widzą Twoje rekordy i serie oraz kalendarz i kilometry (domyślnie wyłączone)."]):'')
   +(typeof svOn==="function"&&svOn()?sec("🔧 Serwis rowerowy",[
     "<b>⚙️ → Edytuj profil → Serwis rowerowy</b>: Twoje rowery (rodzaj, marka, model, data zakupu, przebieg — także km z jazd w aplikacji).",
     "<b>Historia serwisu</b>: wymiany części z ceną, datą i marką, zdjęcia paragonów i dokumentów.",
     "<b>Zaplanowany serwis</b> z przypomnieniem (ile dni wcześniej i jak często) oraz „rower do odbioru” — przypomnienie przyjdzie pod 🔔 i od bota na Telegramie. Numer do serwisu zapiszesz przy rowerze.",
     "Na start jest rower <b>PRZYKŁAD</b> z danymi do obejrzenia — usuniesz go jednym dotknięciem (i przywrócisz, gdy zechcesz)."]):'')
   +sec("⚙️ Ustawienia",[
     "Na górze karta profilu → <b>Edytuj profil</b>: zdjęcie, nick i płeć, miejscowość (domyślnie ukryta), Moje media (Strava, Instagram, YouTube, Facebook, www) i telefon z wyborem, kto go widzi (tylko ulubieni albo wszyscy zalogowani). Tam też: Moje jazdy, Serwis rowerowy, Ulubieni i listy, Grupy, Moja miejscowość, Prywatność oraz Powiadomienia (Telegram, kanał).",
     "Dalej w ⚙️: <b>🗺️ Baza tras</b>, wygląd ☀️ / 🌙 / Auto, <b>Jazdy i zaproszenia</b> („Jak poszło?”, okienka „Mam ochotę”, <b>Ekipa demo</b> — pokazuj zmyślone konta do zabawy i ich powiadomienia; wyłączenie zapisuje się na koncie, więc działa na każdym telefonie, a 🔔 i Telegram od kont demo przestają przychodzić), Testy (testowe zaproszenia, spokojny wygląd), Pomoc i opinie (💬 oceń aplikację / zgłoś błąd lub pomysł — odpowiedź pod 🔔, instalacja), wyloguj, usuń konto.",
     "<b>⬆</b> w lewym dolnym rogu wraca na górę strony.",
     "Długie okno (Ustawienia, Pomoc, okienka) ma na samym dole okrągły <b>✕</b> — zamyka okno bez przewijania na górę."])
   +sec("🔒 Prywatność",[
     "Prywatne zaproszenia widzą tylko autor i wybrane osoby — oraz administratorzy, wyłącznie do moderacji (np. usunięcia spamu). Administrator nie może dołączyć ani doprosić się do cudzego prywatnego zaproszenia.",
     "Nie zapisujemy Twojej lokalizacji — „Moja lokalizacja” na mapie i „📡 moja lokalizacja” w Imprezach działają tylko w telefonie, gdy sam je włączysz. <b>Moja miejscowość</b> jest zapisana w Twoim profilu z dokładnością do ok. 2 km (żeby liczyć okolicę i powiadomienia) — widzisz ją tylko Ty, chyba że włączysz „Pokazuj innym”. Twój sygnał „Mam ochotę” pokazuje innym tylko przybliżoną okolicę (ok. 2 km)."])
   +(rides?sec("🗺️ Wieczorynki",["Zaplanowane jazdy z trasą, mapą, wiatrem i odliczaniem — zakładka Wieczorynki."]):'')
   +'</div>';
}
function relHtml(){
  const r=APP_REL[0],nw=relNew(),li=x=>'<li>'+uiIcon(x[0])+'<span>'+x[1]+'</span></li>';
  return '<details class="hrel"'+(nw?' open':'')+'><summary>'+uiIcon("sparkles")+' Co nowego w wersji '+esc(r.v)+(nw?' <span class="hrelnew">NOWE</span>':'')+'<small>'+esc(r.d)+'</small></summary>'
   +'<ul>'+r.items.map(li).join("")+'</ul>'
   +(APP_REL.length>1?'<details class="hrelold"><summary>Wcześniejsze wersje</summary>'+APP_REL.slice(1).map(o=>'<div class="hrelv">'+esc(o.v)+' · '+esc(o.d)+'</div><ul>'+o.items.map(li).join("")+'</ul>').join("")+'</details>':'')
   +'</details>';
}
function helpHtml(){
  // pomoc przeredagowana 2026-11-16 11:48: na górze instalacja; potem 4 kroki i wskazówki; pełny opis rozwijany
  const tg=feat("telegram_dm"),st=(n,b,t)=>'<li><span class="hn">'+n+'</span><span><b>'+b+'</b> '+t+'</span></li>',ev=tabOk(3);
  const inst=isStandalone()?'<div class="hinst ok">✅ Masz zainstalowaną aplikację — otwierasz ją z ikony na ekranie.</div>'
    :'<div class="hinst"><div class="hinsth">📲 Zainstaluj jak zwykłą aplikację</div><div class="hinstl">Ikona z dwoma kołami na ekranie telefonu, pełny ekran bez paska przeglądarki i liczba powiadomień na ikonie. Zajmuje chwilę, nic nie pobierasz ze sklepu.</div>'
      +(instPrompt?'<button type="button" class="b big" data-h="instgo">📲 Zainstaluj teraz</button><div class="note" style="margin:8px 0 0">albo ręcznie:</div>':'')
      +instGuideHtml()+'</div>';
  return '<div class="sheetbox popbox hbox" role="dialog" aria-modal="true" aria-label="Pomoc"><button class="sclose" data-h="close" aria-label="Zamknij">✕</button>'
   +'<div class="ph" style="margin-top:0">Jak to działa?</div>'
   +relHtml()
   +(session&&typeof sigOn==="function"&&sigOn()&&typeof GW_SVG!=="undefined"?'<div class="hinst hgw"><span class="hgwav">'+GW_SVG+'</span><div class="hinsth">Gawron pokaże Ci „Mam ochotę”</div><div class="hinstl">Animowany przewodnik krok po kroku — podświetla przyciski na ekranie. Niczego za Ciebie nie wysyła.</div>'+'<span class="gwgo"><button type="button" class="fch on" data-gwgo="mam_ochote">'+uiIcon("hand")+' Jak dać znać (4 kroki)</button><button type="button" class="fch" data-gwgo="mam_ochote_pelny">Cała historia (14 kroków)</button></span>'+'</div>':'')
   +inst
   +'<ol class="hst">'
   +st(1,"Zaproś na rower — ➕ w prawym dolnym rogu.","Dzień i godzina (albo zakres, np. 17–19 — każdy wybierze, kiedy może). Do tego, jeśli chcesz: tempo, dystans, trasa GPX, punkt zbiórki. Dla wszystkich albo 🔒 tylko dla wybranych.")
   +st(2,"Dołączaj — „Jadę!” albo „Nie dam rady”.","Zaproszenia są w zakładce Zaproszenia; 🔍 Filtry pokażą tylko te z Twojej okolicy, roweru czy tempa.")
   +st(3,"Sprawdzaj 🔔","Kto Cię zaprasza, kto dołączył do Twojej jazdy, zmiany godzin. Sekcje zwiniesz i rozwiniesz dotknięciem nagłówka.")
   +(ev?st(4,"Imprezy — rajdy, gravele, maratony, biegi.","Kliknij dystans i „Jadę!”, a zobaczysz, kto z nas jedzie. „📍 W okolicy” pokaże imprezy blisko Ciebie."):'')
   +'</ol>'
   +'<div class="htips"><div>⭐ Dotknij nicku — karta osoby, ulubieni, listy, „Zaproś na rower”.</div>'
   +'<div>🔍 <b>Lupa</b> w nagłówku szuka wszystkiego: zaproszeń, „Mam ochotę”, imprez, osób, grup, tras — i opcji aplikacji.</div>'
   +(typeof sigOn==="function"&&sigOn()?'<div>🟡 <b>Mam ochotę</b> — zielone kółko z dłonią nad ➕: daj znać, że chcesz dziś jechać, bez godziny i trasy. Po wysłaniu dotknij go, by zmienić albo wycofać sygnał.</div>':'')
   +(rbOk?'<div>🗺️ <b>Baza tras</b> w ⚙️ — oceny, pogoda na jazdę i lista „co zabrać”.</div>':'')
   +'<div>🚴 Po jeździe aplikacja zapyta <b>„Jak poszło?”</b> — km, średnia, ocena trasy.</div>'
   +'<div>🧪 Zaproszenia z czerwoną plakietką <b>TEST</b> są na próbę — śmiało klikaj. Ukryjesz je w ⚙️.</div>'
   +(session?'':'<div>👤 Żeby zapraszać i dołączać, zaloguj się — wystarczą e-mail i hasło.</div>')+'</div>'
   +'<button type="button" class="lnk hmorebtn" data-h="more">'+(helpMore?'Zwiń opis ▴':'📖 Wszystkie funkcje — dokładny opis ▾')+'</button>'
   +(helpMore?helpFullHtml():'')
   +(tg&&session?(tgLink?'<div class="htg2">✅ Telegram połączony — bot napisze, gdy ktoś Cię zaprosi.</div>'
       :tgOn()?'<button type="button" class="b sbtn tgx" data-h="tg">'+uiIcon("send")+' Połącz z Telegramem<small>Powiadomienia prosto na telefon</small></button>':'')
     :'')
   +(session&&fbOk?'<button type="button" class="lnk" data-h="fb" style="display:block;margin:12px auto 0">💬 Coś nie działa albo masz pomysł? Napisz ›</button>':'')
   +'<label class="hoff"><input type="checkbox" id="helpoff"'+(helpOff?' checked':'')+'> Nie pokazuj przy starcie</label>'
   +'<div class="note hver">PrzylesieGo! · wersja '+esc(APP_VER)+' (BETA) · '+esc(APP_REL[0].d)+'</div>'
   +'<button type="button" class="b big" data-h="close">Zaczynamy!</button></div>';
}
function openHelp(){helpMore=false;const p=$("helpsheet");p.innerHTML=helpHtml();p.classList.remove("hide");relMark()}
function closeHelp(){const p=$("helpsheet");p.classList.add("hide");p.innerHTML=""}
$("helpsheet").addEventListener("click",async e=>{
  if(e.target.closest("[data-h='instgo']")){if(instPrompt){const ev=instPrompt;instPrompt=null;try{ev.prompt();const r=await ev.userChoice;say(r&&r.outcome==="accepted"?"📲 Instaluję — ikona pojawi się na ekranie telefonu.":"Możesz zainstalować później — instrukcja jest w ❓ Pomocy.")}catch(err){}}
    const p=$("helpsheet"),y=p.querySelector(".sheetbox").scrollTop;p.innerHTML=helpHtml();p.querySelector(".sheetbox").scrollTop=y;return}
  if(e.target.closest("[data-h='tg']")){closeHelp();gearOpen=true;gearView="tg";renderGear();return}
  if(e.target.closest("[data-h='fb']")){closeHelp();gearOpen=true;gearView="fb";renderGear();return}
  if(e.target.closest("[data-h='more']")){helpMore=!helpMore;const p=$("helpsheet"),y=p.querySelector(".sheetbox").scrollTop;p.innerHTML=helpHtml();p.querySelector(".sheetbox").scrollTop=y;return}
  if(e.target===$("helpsheet")||e.target.closest("[data-h='close']"))closeHelp();
});
$("helpsheet").addEventListener("change",e=>{if(e.target.id==="helpoff")setHelpOff(e.target.checked)});
$("helpbtn").onclick=openHelp;
if(relNew())$("helpbtn").classList.add("newdot");
$("welhelp").onclick=openHelp;
// samo się pokazuje raz na uruchomienie aplikacji (po zalogowaniu), dopóki ktoś nie wyłączy
function maybeHelp(){
  if(helpOff||!session||needProfile()||gearOpen||pwMode)return;
  try{if(sessionStorage.getItem("helpShown")==="1")return;sessionStorage.setItem("helpShown","1")}catch(e){}
  if(popOpen()||!$("whosheet").classList.contains("hide"))return; // powiadomienia mają pierwszeństwo
  openHelp();
}

/* ---------- 🎉 powitanie nowego użytkownika (A) + ✨ pierwsze kroki (C) — decyzja właściciela 2026-11-16 09:59 ---------- */
// A: raz, zaraz po wybraniu pierwszego nicku (zamiast okienka pomocy); podgląd dla każdego: adres z #powitanie
// C: karta na górze Zaproszeń przez 14 dni od założenia konta; kroki odhaczają się same; „Ukryj” zapamiętane w urządzeniu
let welForce=false;
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const WEL_LOGO='<svg viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" rx="27" fill="#1f9d55"/><circle cx="44" cy="62" r="25" fill="none" stroke="#fff" stroke-width="9"/><circle cx="76" cy="62" r="25" fill="none" stroke="#fbbf24" stroke-width="9"/><circle cx="44" cy="62" r="4" fill="#fff"/><circle cx="76" cy="62" r="4" fill="#fbbf24"/></svg>';
function welPeople(){
  const on=new Set(onlineIds||[]),up=new Set(wants.filter(w=>new Date(w.starts_at).getTime()>Date.now()-864e5).map(w=>w.user_id));
  return Object.keys(nicks).filter(id=>id!==uid&&!modGone(id))
    .sort((a,b)=>(on.has(b)-on.has(a))||(up.has(b)-up.has(a))||(new Date(joinedAt[a]||0)-new Date(joinedAt[b]||0)));
}
function openWelcome(){
  const p=$("welsheet");if(!p||!session||!nicks[uid])return;
  const P=welPeople(),mj=joinedAt[uid]?new Date(joinedAt[uid]).getTime():Date.now();
  const n=Object.keys(nicks).filter(id=>!modGone(id)&&(!joinedAt[id]||new Date(joinedAt[id]).getTime()<=mj)).length;
  const first=String(nicks[uid]).trim().split(/\s+/)[0];
  const cols=["#1f9d55","#fbbf24","#7c3aed","#ff3b30","#0a84ff","#34c759"],rnd=k=>{const x=Math.sin(k*12.9898)*43758.5453;return x-Math.floor(x)};
  let cf="";for(let i=0;i<30;i++){const L=i%2?70+rnd(i)*28:2+rnd(i)*28;
    cf+='<span style="left:'+L.toFixed(1)+'%;--y:'+(10+rnd(i+50)*120).toFixed(0)+'px;--r:'+(rnd(i+99)*540).toFixed(0)+'deg;background:'+cols[i%6]+';width:'+(6+rnd(i+7)*5).toFixed(1)+'px;height:'+(10+rnd(i+3)*8).toFixed(1)+'px;animation-delay:'+(rnd(i+21)*.35).toFixed(2)+'s"></span>'}
  p.innerHTML='<div class="bsbox welbox" role="dialog" aria-modal="true" aria-label="Witaj w PrzylesieGo"><div class="welcf" aria-hidden="true">'+cf+'</div><div class="bsgrab"></div>'
   +'<div class="wellg">'+WEL_LOGO+'</div><h2 class="welh">Cześć, '+esc(first)+'!</h2>'
   +'<div class="welld">Witaj w ekipie PrzylesieGo! Jesteś <b>'+n+'. osobą</b> — od teraz jeździsz z nami.</div>'
   +(P.length?'<div class="welwho">Już jeżdżą</div><div class="welppl">'+P.slice(0,3).map(id=>nk(id)).join("")+(P.length>3?'<span class="welmore">+'+(P.length-3)+'</span>':'')+'</div>':'')
   +'<div class="weltl"><div><i>🙋</i><b>Zaproś na rower</b><span>Podaj godzinę — inni dołączą</span></div>'
   +'<div><i>🚴</i><b>Dołącz do jazdy</b><span>Kliknij „Jadę!” przy zaproszeniu</span></div>'
   +'<div><i>🔔</i><b>Nic Cię nie ominie</b><span>'+(tgOn()?'Połącz Telegram w ⚙️':'Nowości pod 🔔 w nagłówku')+'</span></div></div>'
   +'<button type="button" class="b big" data-wl="go">🚲 Zaczynamy!</button><button type="button" class="lnk welhelp" data-wl="help">Pokaż, co potrafi aplikacja ›</button></div>';
  p.classList.remove("hide");
  try{navigator.vibrate&&navigator.vibrate([20,40,20])}catch(e){}
}
function closeWelcome(){const p=$("welsheet");p.classList.add("hide");p.innerHTML="";renderSteps()}
$("welsheet").addEventListener("click",e=>{
  if(e.target===$("welsheet")){closeWelcome();return}
  const b=e.target.closest("[data-wl]");if(!b)return;
  closeWelcome();if(b.dataset.wl==="help")openHelp();
});
function stepsList(){
  const S=[{k:"nick",t:"Wybierz nick",ok:!!nicks[uid]}];
  if(isStandalone())lsSet("stepInstall","1");
  if(instEnv().mobile||lsGet("stepInstall")==="1")S.push({k:"inst",t:"Zainstaluj aplikację na telefonie",ok:lsGet("stepInstall")==="1",go:"Jak?"});
  let ride=lsGet("stepRide")==="1"||wants.some(w=>w.user_id===uid)||Object.values(joins).some(a=>(a||[]).includes(uid));
  if(ride)lsSet("stepRide","1");
  S.push({k:"ride",t:"Dołącz do jazdy albo zaproś",ok:ride,go:"Zobacz"});
  if(tgOn())S.push({k:"tg",t:"Połącz Telegram",ok:!!tgLink,go:"Połącz"});
  if(favOk)S.push({k:"fav",t:"Dodaj ulubionych ⭐",ok:favIds().length>0,go:"Wybierz"});
  return S;
}
// dostępne przez 14 dni od założenia konta; „Ukryj” chowa tylko kartę w Zaproszeniach — kroki zostają w 🔔 („✨ Dokończ start”)
const stepsAvail=()=>!!session&&!!nicks[uid]&&(welForce||(!!joinedAt[uid]&&Date.now()-new Date(joinedAt[uid]).getTime()<14*864e5));
const stepsOn=()=>stepsAvail()&&lsGet("stepsHide")!=="1";
const stepsLeft=()=>stepsAvail()?stepsList().filter(x=>!x.ok):[];
// licznik na dzwonku: tylko do pierwszego obejrzenia listy 🔔 i gdy karta nie jest ukryta
const stepsBadge=()=>lsGet("stepsSeen")==="1"||lsGet("stepsHide")==="1"?0:stepsLeft().length;
function stepGo(k){
  if(k==="inst"){if(instPrompt){const ev=instPrompt;instPrompt=null;try{ev.prompt();ev.userChoice.then(r=>{if(r&&r.outcome==="accepted"){lsSet("stepInstall","1");renderSteps()}}).catch(()=>{})}catch(e){gearOpen=true;gearView="inst";renderGear()}return}
    gearOpen=true;gearView="inst";renderGear();return}
  if(k==="ride"){show(0);const w=document.querySelector("#wantlist .want");if(w){w.scrollIntoView({behavior:"smooth",block:"center"});w.classList.remove("flash");void w.offsetWidth;w.classList.add("flash")}else openWantForm(null);return}
  if(k==="tg"){gearOpen=true;gearView="tg";renderGear();return}
  if(k==="fav"){gearOpen=true;gearView="favs";renderGear();return}
  if(k==="show"){try{localStorage.removeItem("stepsHide")}catch(e){}show(0);renderSteps();const b=$("steps");if(b)setTimeout(()=>{b.scrollIntoView({behavior:"smooth",block:"center"})},60);renderBell();return}
}
function renderSteps(){
  const box=$("steps");if(!box)return;
  try{renderBell()}catch(e){}
  if(!stepsOn()){box.className="hide";box.innerHTML="";return}
  const S=stepsList(),d=S.filter(x=>x.ok).length,all=d===S.length,first=String(nicks[uid]).trim().split(/\s+/)[0];
  box.className="steps"+(all?" all":"");
  box.innerHTML=all
   ?'<div class="sth"><div><b>✅ Wszystko gotowe, '+esc(first)+'!</b><div class="sts">Miłej jazdy — do zobaczenia na trasie.</div></div><button type="button" class="lnk" data-st="hide">Ukryj ✕</button></div>'
   :'<div class="sth"><div><b>✨ Witaj, '+esc(first)+'!</b><div class="sts">Pierwsze kroki · '+d+' z '+S.length+'</div></div><button type="button" class="lnk" data-st="hide">Ukryj ✕</button></div>'
    +'<div class="stbar"><i style="width:'+Math.round(d/S.length*100)+'%"></i></div>'
    +S.map(x=>'<div class="stit'+(x.ok?' dn':'')+'"><span class="stc" aria-hidden="true">'+(x.ok?'✓':'')+'</span><span class="stt">'+x.t+'</span>'
      +(!x.ok&&x.go?'<button type="button" class="lnk stgo" data-st="'+x.k+'">'+x.go+' ›</button>':'')+'</div>').join("");
}
$("steps").addEventListener("click",e=>{
  const b=e.target.closest("[data-st]");if(!b)return;const k=b.dataset.st;
  if(k==="hide"){lsSet("stepsHide","1");renderSteps();renderBell();
    if(stepsLeft().length)say("Schowane — pozostałe kroki znajdziesz pod 🔔 „Dokończ start”.");return}
  stepGo(k);
});

