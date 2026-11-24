/* js/22-przewodnik.js — Gawron: animowany przewodnik krok po kroku.
   Ładowany OSTATNI (po 21-szukaj.js); przy wczytaniu nic z innych plików nie jest wywoływane.
   Użycie: Gawron.start("mam_ochote")  ·  Gawron.stop()  ·  Gawron.seen("mam_ochote")  ·  Gawron.list()
   Start z Pomocy: przycisk z data-gwgo="<id przewodnika>" (zamyka Pomoc i uruchamia przewodnik).
   Nic nie wysyła i niczego nie klika za użytkownika poza krokiem „Pokaż mi” (kliknięcie wskazanego przycisku). */
const GW_SVG='<svg viewBox="0 0 140 100" aria-hidden="true">'
 +'<g class="gww"><circle cx="30" cy="72" r="20" fill="none" stroke="#3b3f4a" stroke-width="4"/><circle cx="30" cy="72" r="17" fill="none" stroke="#9aa0ad" stroke-width="1"/><path d="M30 52v40M10 72h40M16 58l28 28M44 58 16 86" stroke="#9aa0ad" stroke-width="1.4"/></g>'
 +'<g class="gww"><circle cx="108" cy="72" r="20" fill="none" stroke="#3b3f4a" stroke-width="4"/><circle cx="108" cy="72" r="17" fill="none" stroke="#9aa0ad" stroke-width="1"/><path d="M108 52v40M88 72h40M94 58l28 28M122 58 94 86" stroke="#9aa0ad" stroke-width="1.4"/></g>'
 +'<g fill="none" stroke="#2fa24f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M30 72 62 74 56 46Z"/><path d="M56 46 94 46 62 74"/><path d="M62 74 98 56M94 46 98 56 108 72M94 46 96 38 104 38"/></g>'
 +'<path d="M46 44h18" stroke="#23262d" stroke-width="4" stroke-linecap="round"/><circle cx="62" cy="74" r="4" fill="#9aa0ad"/>'
 +'<g class="gwbody">'
   +'<path class="gwl1" d="M60 40 58 68h7" fill="none" stroke="#e9a93a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
   +'<path class="gwl2" d="M63 40 65 66h7" fill="none" stroke="#e9a93a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
   +'<path class="gwtail" d="M50 33 20 29 27 35 18 40 29 42 23 47 51 42Z" fill="#23262d"/>'
   +'<ellipse cx="66" cy="33" rx="19" ry="11" transform="rotate(-12 66 33)" fill="#2a2e3b"/>'
   +'<path d="M56 38Q68 46 82 36" fill="none" stroke="#3d4356" stroke-width="2" stroke-linecap="round"/>'
   +'<circle cx="82" cy="24" r="9" fill="#2a2e3b"/>'
   +'<path d="M72 21Q82 10 92 20Z" fill="#2fa24f"/><path d="M88 19.5h9" stroke="#2fa24f" stroke-width="3" stroke-linecap="round"/>'
   +'<path d="M90 24 107 28 90 31Z" fill="#e9a93a"/>'
   +'<circle cx="85" cy="23" r="2.7" fill="#fff"/><circle cx="85.9" cy="23.1" r="1.3" fill="#111"/>'
   +'<path d="M76 34Q91 40 100 38" fill="none" stroke="#1d2029" stroke-width="4.5" stroke-linecap="round"/>'
   +'<path class="gwwing" d="M52 30Q62 22 78 34Q66 45 52 38Z" fill="#1d2029" stroke="#4a5168" stroke-width=".8"/>'
 +'</g></svg>';

const GW_TOURS={
 mam_ochote:{name:"Mam ochotę — jak dać znać",steps:[
  {sel:"#sigfab",act:"click",wait:300,title:"Znajdź dłoń",
   text:"Nie masz pomysłu na jazdę, ale masz ochotę pojeździć? Ta okrągła dłoń daje znać innym — bez godziny i trasy. Kliknij ją.",
   miss:"Dłoni teraz nie widać: dziś masz już własne zaproszenie albo ekran, na którym jej nie ma (jest na Starcie). Wróć na Start — dłoń stoi nad plusem."},
  {sel:".sigacts",wait:4000,title:"Wybierz aktywność",
   text:"Rower, bieg, spacer albo trekking (wędrówka piesza). Dotknij tej, na którą masz dziś ochotę."},
  {sel:".sgmsgs",opt:true,wait:600,title:"Komunikat (opcjonalnie)",
   text:"Krótkie hasło dla innych, np. dokąd albo jak szybko. „Inne…” pozwala wpisać własne (do 40 znaków). Możesz to pominąć."},
  {sel:'[data-sg="who"]',opt:true,wait:600,title:"Kto zobaczy?",
   text:"Domyślnie wszyscy zalogowani. Możesz wybrać same osoby, listę albo grupę — wtedy sygnał widzą tylko one."},
  {sel:'[data-sg="send"]',wait:600,title:"Daj znać",last:true,
   text:"Kliknij, a inni zobaczą Twój sygnał pod 🔔 i będą mogli Cię zaprosić. Sygnał wygasa z końcem dnia, a wycofasz go w okienku „Twój sygnał”.<span class=\"gwm\">Ja niczego za Ciebie nie wyślę — to Twoja decyzja.</span>"}
 ]}
};

/* ===== przykładowe karty (zbudowane z prawdziwych klas aplikacji; nieklikalne, z plakietką PRZYKŁAD) ===== */
const gwI=n=>typeof uiIcon==="function"?uiIcon(n):"";
const gwD=h=>'<div class="gwdemo"><span class="gwdtag">PRZYKŁAD</span>'+h+'</div>';
const gwBtn=(t,c)=>'<button type="button" tabindex="-1" class="'+(c||"lnk stgo")+'">'+t+'</button>';
const gwHand=(n,on)=>'<button type="button" tabindex="-1" class="sgre'+(on?' on':'')+'">'+gwI("hand")+(n?'<b>'+n+'</b>':'')+'</button>';
function gwRow(o){
  return '<div class="nit stn sgrow'+(o.nw?' new':'')+'"><div class="ic">'+gwI(o.ic||"bike")+'</div><div class="tx"><b>'+o.nick+'</b>'
   +(o.w?'<div class="w">'+o.w+'</div>':'')+(o.msg?'<div class="sgmsg">'+o.msg+'</div>':'')
   +(o.rt?'<div class="sgrt">'+gwI("hand")+'<b class="sgrn">'+o.rt[0]+'</b><span>'+o.rt[1]+'</span></div>':'')+'</div>'
   +'<span class="sgbtns">'+(o.b||[]).join("")+'</span></div>';
}
function gwFab(n){   // dłoń po wysłaniu sygnału: ptaszek po lewej, licznik „Też mam ochotę” po prawej
  if(typeof sigWheel==="undefined")return "";
  return '<div class="gwfabw"><span class="sigfab act" style="position:relative;right:auto;bottom:auto;display:inline-flex">'+sigWheel
   +'<span class="sigbdg l">'+sigCheck+'</span>'+(n?'<span class="sigbdg r n">'+n+'</span>':'')+'</span></div>';
}
const GW_D={
 fab:()=>gwD(gwFab(0)+'<div class="gwm">Dłoń z zielonym ptaszkiem = sygnał wysłany.</div>'),
 pop:()=>gwD('<div class="gwpop"><span class="sgpav" style="width:64px;height:64px;font-size:28px;margin:0 auto 6px">A</span>'
   +'<b>Asia ma ochotę</b><div class="gwq">„Nogi same kręcą”</div><div class="gwm">rower · 07:45</div>'
   +'<div class="gwpb">'+gwBtn("Zaproś Asię ›","b")+gwBtn(gwI("hand")+" Też mam ochotę!","b w sgre2")+'</div></div>'),
 row:()=>gwD(gwRow({nick:"Asia",w:"rower · 07:45",msg:"Nogi same kręcą",nw:1,b:[gwBtn("Zaproś Asię ›"),gwHand(0)]})),
 mine1:()=>gwD(gwFab(1)+gwRow({nick:"Ty",w:"rower · 07:45",nw:1,rt:[1,"Kasia też ma ochotę"],b:[gwBtn("Zaproś ekipę (1) ›"),gwBtn("Zmień"),gwBtn("Wycofaj")]})),
 mine:()=>gwD('<div class="sglbl">Też mają ochotę (2)</div><div class="sgrl"><span class="sgrc">'+gwI("hand")+'Kasia</span><span class="sgrc">'+gwI("hand")+'Tomek</span></div>'
   +'<button type="button" tabindex="-1" class="b big sgmkeen">Zaproś ekipę (2) ›</button>'),
 withme:()=>gwD(gwRow({nick:"Masz z kim jechać!",ic:"users",w:"Ekipa z Twojego sygnału · 3 osoby · 07:52",nw:1,b:[gwBtn("Zaproś ekipę (2) ›")]})),
 sup:()=>{const av=["A","K","T","+1"].map((c,i)=>'<span class="sgmav'+(i==3?' more':'')+'">'+c+'</span>').join("");
   return gwD('<div class="sgsup"><div class="sgsupbar"><span class="sgstack">'+av+'</span>'+gwBtn(gwI("users")+" Super ekipa (4) ›","b sgsupbtn")+'</div>'
   +'<div class="sgsupbody">'+gwRow({nick:"Ty",w:"rower · 07:45",b:[]})+gwRow({nick:"Ola",w:"rower · 07:58",msg:"Kto mnie dogoni?",b:[]})+'</div></div>')},
 form:()=>gwD('<div class="gwf"><div class="sglbl">Tytuł</div><div class="gwfld">SUPER EKIPA</div>'
   +'<div class="sglbl">Kto zobaczy zaproszenie?</div><div class="who priv"><span class="wic">👥</span><span class="wtx"><b>Wybrane osoby (4)</b><span>Asia, Kasia, Tomek, Ola</span></span></div>'
   +'<div class="sglbl">Planowany start</div><div class="gwfld">07:30 – 09:30</div>'
   +'<div class="sglbl">📍 Punkt zbiórki</div><div class="gwfld">Przylesie</div>'
   +'<div class="sglbl">Notatka</div><div class="gwfld">Nogi same kręcą</div></div>'),
 together:()=>gwD(gwRow({nick:"Ekipa na dziś",ic:"users",w:"zaproszenie „SUPER EKIPA” · Przylesie · 07:30",b:[gwBtn("Jedziecie razem ›")]})
   +gwRow({nick:"Ola dała dłoń",ic:"users",w:"po założeniu zaproszenia",nw:1,b:[gwBtn("Dopisz Olę ›")]}))
};
const GW_CL=()=>{if(typeof closeSig==="function")closeSig()};

GW_TOURS.mam_ochote_pelny={name:"Mam ochotę — cała historia (rower)",steps:[
  {ch:"Dajesz znać",sel:"#sigfab",act:"click",wait:300,title:"Znajdź dłoń",
   text:"Masz ochotę pojeździć, ale bez pomysłu na godzinę i trasę? Ta dłoń daje znać innym. Kliknij ją.",
   miss:"Dłoni teraz nie widać: dziś masz już własne zaproszenie albo jesteś na ekranie, gdzie jej nie ma (jest na Starcie nad plusem). Przejdź na Start i uruchom przewodnik ponownie."},
  {ch:"Dajesz znać",sel:'.sigacts [data-sga="bike"]',wait:4000,title:"Wybierz „Rower”",
   text:"Dotknij „Rower”. Bieg, spacer i trekking działają tak samo — zmieniają się tylko słowa w powiadomieniach."},
  {ch:"Dajesz znać",sel:".sgmsgs",opt:true,wait:600,title:"Komunikat (opcjonalnie)",
   text:"Krótkie hasło, np. „Nogi same kręcą”. „Inne…” pozwala wpisać własne (do 40 znaków). To hasło zobaczą inni i może zostać tytułem wspólnego zaproszenia."},
  {ch:"Dajesz znać",sel:'[data-sg="who"]',opt:true,wait:600,title:"Kto zobaczy?",
   text:"Domyślnie wszyscy zalogowani (i kanał Telegram @PrzylesieGo). Możesz wybrać osoby, listę albo grupę — wtedy sygnał jest prywatny i na kanał nie idzie."},
  {ch:"Dajesz znać",sel:'[data-sg="send"]',wait:600,title:"Daj znać",
   text:"To ten przycisk wysyła sygnał. Ja go nie kliknę za Ciebie. Kliknij „Dalej” w moim dymku, a pokażę, co dzieje się potem."},
  {ch:"Po wysłaniu",pre:GW_CL,title:"Co się dzieje po „Daj znać”",demo:GW_D.fab,
   text:"Okienko się zamyka, a dłoń zostaje na ekranie — z zielonym ptaszkiem. Dotkniesz jej w każdej chwili, żeby zobaczyć „Twój sygnał”: kto ma też ochotę, „Zmień” i „Wycofaj”. Sygnał wygasa z końcem dnia."},
  {ch:"Po wysłaniu",title:"Co widzą inni",demo:GW_D.pop,
   text:"Znajomi dostają takie okienko: zdjęcie, Twój komunikat i dwa przyciski. Gdy kilka osób da znać naraz, przewijają je w bok. „OK” zamyka i oznacza wiersz pod 🔔 jako przeczytany."},
  {ch:"Po wysłaniu",sel:"#bellbtn",soft:true,title:"Gdzie to leży pod 🔔",demo:GW_D.row,
   text:"Pod dzwonkiem jest sekcja „Ekipa na dziś”: wiersz każdego sygnału, nieprzeczytane na górze. Dłoń przy wierszu to „Też mam ochotę!”, a „Zaproś …” zakłada zaproszenie na dziś z zakresem godzin."},
  {ch:"Ktoś odpowiada",title:"Ktoś klika „Też mam ochotę!”",demo:GW_D.mine1,
   text:"Kasia dotyka dłoni przy Twoim sygnale. Dostajesz powiadomienie pod 🔔 (i wiadomość od bota, jeśli go połączysz), na ekranie leci konfetti, a na dłoni pojawia się licznik. Reakcje się sumują."},
  {ch:"Ktoś odpowiada",sel:"#sigfab",soft:true,title:"Gdzie widzisz odpowiedź",demo:GW_D.mine,
   text:"Dotknij dłoni: „Twój sygnał” pokazuje listę osób z „Też mam ochotę” i przycisk „Zaproś ekipę”. Ta sama lista jest pod 🔔 przy Twoim sygnale."},
  {ch:"Kilka osób",title:"Rośnie ekipa",demo:GW_D.withme,
   text:"Jeden sygnał to jedna ekipa: autor plus osoby z dłonią. Gdy dochodzi kolejna osoba, wszyscy z ekipy dostają „Masz z kim jechać!” z przyciskiem „Zaproś ekipę ›”. Otworzy je każdy z ekipy, bez pytania o zgodę."},
  {ch:"Kilka osób",title:"Kilka sygnałów naraz: Super ekipa",demo:GW_D.sup,
   text:"Gdy jesteś w co najmniej 2 sygnałach rowerowych (jako autor albo z dłonią), a łącznie jest 3 osoby poza Tobą, pod 🔔 klamra łączy te sygnały. „Super ekipa (N) ›” otwiera jedno zaproszenie do wszystkich naraz."},
  {ch:"Wspólna jazda",title:"Zakładasz zaproszenie na Przylesie",demo:GW_D.form,
   text:"Formularz otwiera się z gotowymi osobami: prywatne zaproszenie tylko do chętnych, tytuł „SUPER EKIPA” (albo komunikat sygnału), a w notatce Twoje hasło. Ty wybierasz zakres godzin i Punkt zbiórki — np. Przylesie — i klikasz „Zaproś”.<span class=\"gwm\">Organizatorem jest ten, kto kliknął.</span>"},
  {ch:"Wspólna jazda",title:"Po założeniu zaproszenia",demo:GW_D.together,
   text:"Powiadomienia „Masz z kim jechać” znikają, a przy sygnale pojawia się „Jedziecie razem ›” — przenosi do zaproszenia. Gdy ktoś da dłoń później, organizator dostaje „Dopisz Nick ›”, a nowa osoba widzi „Ekipa już jedzie” i nie zakłada drugiego zaproszenia."},
  {ch:"Gotowe",last:true,title:"Cała droga w skrócie",
   text:"1. Dajesz znać (dłoń → Rower → Daj znać).<br>2. Inni widzą okienko i wiersz pod 🔔.<br>3. Ktoś odpowiada „Też mam ochotę!” — licznik na dłoni.<br>4. Ekipa rośnie — „Zaproś ekipę ›” albo „Super ekipa ›”.<br>5. Zaproszenie na Przylesie, potem „Jedziecie razem ›”.<span class=\"gwm\">Wygasa z końcem dnia. Wycofasz sygnał w „Twój sygnał”.</span>"}
]};

const GW={cur:null,i:0,tk:0,root:null,spot:null,bub:null,timer:0,off:null};
const gwKey=id=>"pg_gw_"+id;
function gwSeen(id){try{return localStorage.getItem(gwKey(id))==="1"}catch(e){return false}}
function gwMark(id){try{localStorage.setItem(gwKey(id),"1")}catch(e){}}
function gwEl(sel){const e=sel&&document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return r.width>0&&r.height>0?e:null}
function gwWait(sel,ms){return new Promise(res=>{const t0=Date.now();(function p(){const e=gwEl(sel);if(e||Date.now()-t0>ms)return res(e);setTimeout(p,120)})()})}

function gwStop(done){
  if(GW.off){GW.off();GW.off=null}
  clearInterval(GW.timer);GW.timer=0;GW.tk++;
  if(done&&GW.cur)gwMark(GW.cur);
  if(GW.root){GW.root.remove();GW.root=GW.spot=GW.bub=null}
  const was=GW.cur;GW.cur=null;
  if(was)setTimeout(gwAfter,400);
}
function gwStart(id,from){
  const T=GW_TOURS[id];if(!T)return false;
  gwStop();GW.cur=id;
  const r=document.createElement("div");r.id="gw";r.setAttribute("role","dialog");r.setAttribute("aria-label","Przewodnik Gawron");
  r.innerHTML='<div class="gwspot none"></div><div class="gwb bot"></div>';
  document.body.appendChild(r);GW.root=r;GW.spot=r.firstChild;GW.bub=r.lastChild;
  GW.bub.onclick=e=>{
    const b=e.target.closest("[data-gw]");if(!b)return;const a=b.dataset.gw;
    if(a==="x"||a==="skip")gwStop(a==="x"?false:true);
    else if(a==="prev")gwShow(GW.i-1,-1);
    else if(a==="next")gwShow(GW.i+1,1);
    else if(a==="end")gwStop(true);
    else if(a==="click"){const el=gwEl(T.steps[GW.i].sel);if(el)el.click()}
  };
  GW.timer=setInterval(gwTick,120);
  gwShow(from||0,1);return true;
}
async function gwShow(i,dir){
  const id=GW.cur,T=GW_TOURS[id];if(!T)return;const S=T.steps,my=++GW.tk;
  if(GW.off){GW.off();GW.off=null}
  if(i>=S.length){gwStop(true);return}
  if(i<0)i=0;
  const st=S[i];let el=null;
  if(st.pre){try{st.pre()}catch(e){}}
  if(st.sel){el=gwEl(st.sel)||await gwWait(st.sel,st.wait||600);if(my!==GW.tk)return}
  if(!el&&st.opt){gwShow(i+dir,dir);return}   // krok opcjonalny, a elementu nie ma (np. funkcja wyłączona) — pomijamy
  GW.i=i;GW.miss=!el&&!!st.sel&&!st.soft;
  if(el){el.scrollIntoView({block:"center",behavior:"auto"})}
  const r=el?el.getBoundingClientRect():null,top=r?(r.top+r.height/2>innerHeight/2):false;
  const n=S.length,last=i===n-1||st.last,click=st.act==="click"&&el&&!GW.miss;
  const dots=n>8?'<div class="gwbar"><i style="width:'+Math.round((i+1)/n*100)+'%"></i></div>':'<div class="gwdots">'+S.map((s,k)=>'<i class="'+(k===i?"on":"")+'"></i>').join("")+'</div>';
  const dm=st.demo?(typeof st.demo==="function"?st.demo():st.demo):"";
  GW.bub.className="gwb "+(top?"top":"bot");
  GW.bub.innerHTML='<div class="gwav arrive">'+GW_SVG+'</div><button type="button" class="gwx" data-gw="x" aria-label="Zamknij przewodnik">✕</button>'
   +'<div class="gwk">GAWRON · KROK '+(i+1)+' Z '+n+(st.ch?' · '+st.ch.toUpperCase():'')+'</div><div class="gwscroll"><div class="gwt">'+st.title+'</div>'
   +'<div class="gwp">'+(GW.miss?(st.miss||"Nie widzę tego elementu na tym ekranie."):st.text)+'</div>'+(GW.miss?'':dm)+'</div>'
   +dots
   +'<div class="gwbtns">'+(!last&&!GW.miss?'<button type="button" class="lnk" data-gw="skip">Pomiń</button>':'')+'<span class="sp"></span>'
   +(i>0?'<button type="button" class="b w" data-gw="prev">Wstecz</button>':'')
   +(GW.miss?'<button type="button" class="b" data-gw="end">Zamknij</button>'
     :click?'<button type="button" class="b nudge" data-gw="click">Pokaż mi</button>'
     :last?'<button type="button" class="b" data-gw="end">Zakończ</button>'
     :'<button type="button" class="b" data-gw="next">Dalej</button>')
   +'</div>';
  const av=GW.bub.querySelector(".gwav");setTimeout(()=>av&&av.classList.remove("arrive"),750);
  if(click){   // użytkownik sam klika wskazany przycisk (albo „Pokaż mi”) → idziemy dalej
    const on=()=>setTimeout(()=>{if(GW.tk===my)gwShow(i+1,1)},180);
    el.addEventListener("click",on,{once:true,capture:true});GW.off=()=>el.removeEventListener("click",on,true);
  }
  gwTick();
}
function gwTick(){
  if(!GW.cur||!GW.spot)return;const st=GW_TOURS[GW.cur].steps[GW.i],el=!GW.miss&&gwEl(st.sel),s=GW.spot;
  let note=GW.bub.querySelector(".gwlost");
  if(!el){
    s.className="gwspot none";s.style.cssText="left:50%;top:50%;width:0;height:0";
    if(st.sel&&!GW.miss&&!st.soft&&!note){note=document.createElement("span");note.className="gwm gwlost";note.textContent="Nie widzę tego elementu — okienko mogło się zamknąć. Otwórz je ponownie albo wybierz „Pomiń”.";GW.bub.querySelector(".gwp").appendChild(note)}
    return;
  }
  if(note)note.remove();
  const r=el.getBoundingClientRect(),p=6;
  s.className="gwspot";s.style.cssText="left:"+(r.left-p)+"px;top:"+(r.top-p)+"px;width:"+(r.width+2*p)+"px;height:"+(r.height+2*p)+"px;border-radius:"+(getComputedStyle(el).borderRadius||"14px");
}
window.Gawron={start:gwStart,stop:()=>gwStop(false),seen:gwSeen,list:()=>Object.keys(GW_TOURS).map(k=>({id:k,name:GW_TOURS[k].name,seen:gwSeen(k)}))};
// start z Pomocy (js/06): przycisk data-gwgo="id" — zamyka Pomoc, przewodnik zaczyna na ekranie pod spodem
document.addEventListener("click",e=>{const b=e.target.closest("[data-gwgo]");if(!b)return;
  if(typeof closeHelp==="function")closeHelp();setTimeout(()=>gwStart(b.dataset.gwgo),150)});
/* 🐦 automatyczny start przy pierwszym wejściu (wołane z afterData w js/14, przed innymi okienkami):
   raz na konto (pamięć w telefonie), tylko gdy dłoń „Mam ochotę” jest widoczna i nic innego nie jest otwarte.
   Zwraca true, gdy przewodnik trwa — wtedy okienka zaproszeń, „Mam ochotę”, Pomocy itd. czekają. */
const gwAutoKey=()=>"pg_gw_auto:"+(typeof uid!=="undefined"?uid:"");
function gwAuto(){
  if(GW.cur)return true;
  if(typeof session==="undefined"||!session||(typeof DEMO!=="undefined"&&DEMO))return false;
  try{if(localStorage.getItem(gwAutoKey())==="1")return false}catch(e){return false}
  if((typeof needProfile==="function"&&needProfile())||(typeof pwMode!=="undefined"&&pwMode)||(typeof gearOpen!=="undefined"&&gearOpen))return false;
  if([...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide")))return false;
  if(!gwEl("#sigfab"))return false;   // dłoni nie widać (np. dziś jest już zaproszenie) — nie startujemy, spróbujemy przy kolejnym wejściu
  try{localStorage.setItem(gwAutoKey(),"1")}catch(e){}
  gwStart("mam_ochote");return true;
}
// po zakończeniu przewodnika: zaległe okienka (zaproszenia, „Mam ochotę”, Pomoc…) — jak po wczytaniu danych
function gwAfter(){
  if(GW.cur)return;
  for(const f of ["maybePopup","maybeHelp","maybeFb","maybeReport","maybeSigIntro","maybeSigPop"])
    try{if(typeof window[f]==="function")window[f]()}catch(e){}
}
