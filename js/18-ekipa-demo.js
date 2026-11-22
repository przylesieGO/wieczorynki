/* 🧪 Ekipa demo (KROK 74–75) — 👑 ⚙️ → Administracja → „Generator zaproszeń” (na górze) → „Zaproszenia testowe”:
   konta demo (1–30, pula nicków), generator zaproszeń testowych (bez nachodzących jazd, część dla grup demo),
   grupy demo (1–10), automatyczne odpowiedzi kont demo (cron co 15 min, przełącznik), ochotnicy, sprzątanie;
   plakietka DEMO przy nickach i grupach kont demo.
   2026-11-21: panel w zwijanych sekcjach (Ekipa demo, Zaproszenia, Ochotnicy, Grupy demo, Odpowiedzi, Sprzątanie);
   ochotnicy zbiorczo: lista wszystkich osób z szukajką i filtrami, zaznaczanie wielu, Dodaj / Wypisz.
   2026-11-22 (KROK 77): sekcja „Historia demo” — odbyte jazdy z ostatnich tygodni, „Jak poszło?”, jazdy grup demo,
   wpisy na tablicach grup demo (admin_demo_history / admin_demo_history_wipe); listy kont i grup demo zwijane (domyślnie zwinięte).
   Wszystko robią funkcje bazy admin_demo_* (sprawdzają 👑); tabele demo_* są tylko do odczytu.
   Plik wczytywany jako ostatni: przy wczytaniu tylko rejestruje obsługę zdarzeń; niższe pliki wołają go przez typeof. */
let demoIds=new Set(),demoVol=new Set(),demoSt=null,demoBusy=false,demoRet=false;
let demoAcc=4,demoAccSet=false;   // ile kont demo (stepper „Konta demo”); demoAccSet = zmienione ręcznie, odświeżenie stanu go nie nadpisuje
let demoGrN=3;   // ile grup demo założyć (stepper „Grupy demo”)
const demoVolTxt=()=>demoF.vol?demoF.vol+" "+plf(demoF.vol,["ochotnik","ochotnicy","ochotników"])+" na zaproszenie":"bez ochotników — tylko konta demo";
const demoF={n:25,days:14,priv:30,vol:3,grp:30,routes:true,ranges:true,answers:true,chan:false,
  hw:12,hpw:0,hgrp:35,hposts:true};   // historia: tygodnie wstecz, jazd w tygodniu (0 = auto), % dla grup, wpisy na tablicach
let demoLCol={acc:true,grp:true};   // zwinięte listy „Konta” i „Grupy” w panelu
const DEMO_BIKE={mtb:"MTB",gravel:"Gravel",road:"Szosa",trekking:"Trekking"};
const DEMO_DAYS=[[3,"3 dni"],[7,"7 dni"],[14,"14 dni"],[28,"4 tyg."]];
const demoTag=id=>demoIds.has(id)?'<span class="nkdemo" title="konto demo — nie prawdziwa osoba">DEMO</span>':'';
const demoErr=e=>say((e&&e.message)||"Nie udało się — spróbuj jeszcze raz.");

// wczytanie: kto jest kontem demo (wszyscy zalogowani) + ochotnicy (👑)
async function demoLoad(){
  if(!session){demoIds=new Set();demoVol=new Set();return}
  try{const r=await sb.from("demo_accounts").select("user_id");if(!r.error)demoIds=new Set((r.data||[]).map(x=>x.user_id))}catch(e){}
  if(isKingReal()){try{const v=await sb.from("demo_volunteers").select("user_id");if(!v.error)demoVol=new Set((v.data||[]).map(x=>x.user_id))}catch(e){}}
}
async function demoStatus(){
  try{const r=await sb.rpc("admin_demo_status");if(r.error)throw r.error;demoSt=r.data||{};if(demoSt.demo_active&&!demoAccSet)demoAcc=+demoSt.demo_active}
  catch(e){demoSt={err:(e&&e.message)||"błąd"}}
  if(gearView==="demo")demoRender();
}

// ⚙️ → Administracja → grupa „Zaproszenia”: zamiast samego „Usuń testowe” — cały panel
const demoAdmRow=()=>isKingReal()?gRow("#ff9f0a","flask","Zaproszenia testowe","Ekipa demo, generator i sprzątanie",
  demoIds.size?'<span class="ios-v">'+demoIds.size+'</span>':'','data-dx="open"'):'';

// karta osoby → Administrator: ochotnik (dostaje prywatne zaproszenia od kont demo)
const demoVolRow=id=>isKingReal()&&id!==uid&&!demoIds.has(id)&&nicks[id]
  ?gRow("#ff9f0a","flask",demoVol.has(id)?"Ochotnik Ekipy demo":"Dodaj do ochotników Ekipy demo",
     demoVol.has(id)?"Dostaje prywatne zaproszenia od kont demo · dotknij, aby wypisać":"Tylko za zgodą tej osoby — dostanie prywatne zaproszenia od kont demo",
     demoVol.has(id)?'<span class="ios-v ok">'+uiIcon("check")+'</span>':'','data-dx="vol" data-du="'+esc(id)+'"'+(demoBusy?' disabled':'')):'';

const demoStep=(k,v,min,max,lbl,sub)=>'<div class="ios-it dmrow"><span class="ios-t">'+lbl+(sub?'<small>'+sub+'</small>':'')+'</span>'
  +'<span class="dmstep"><button type="button" class="dmsb" data-dx="'+k+'-" aria-label="'+lbl+': mniej"'+(v<=min||demoBusy?' disabled':'')+'>−</button>'
  +'<b aria-live="polite">'+v+'</b><button type="button" class="dmsb" data-dx="'+k+'+" aria-label="'+lbl+': więcej"'+(v>=max||demoBusy?' disabled':'')+'>+</button></span></div>';
const demoSw=(k,t,sub)=>'<div class="ios-it"><span class="ios-t">'+t+(sub?'<small>'+sub+'</small>':'')+'</span>'
  +'<button type="button" class="ios-sw'+(demoF[k]?' on':'')+'" role="switch" aria-checked="'+demoF[k]+'" aria-label="'+esc(t)+'" data-dx="sw" data-dk="'+k+'"></button></div>';

// historia: „auto” jazd w tygodniu = ok. 0,6 × aktywne konta (jak w bazie), 2–40
const demoNum=n=>(+n||0).toLocaleString("pl-PL");
const demoHAuto=n=>Math.min(40,Math.max(2,Math.ceil(n*0.6)));
// zwijana lista w sekcji (Konta / Grupy) — jak sekcje Ochotnicy
const demoList=(k,ico,t,n,body)=>secBar(uiIcon(ico),t,n,demoLCol[k],'','data-dx="ltog" data-dl="'+k+'"',false)
  +'<div class="fvbody secb'+(demoLCol[k]?' col':'')+'">'+body+'</div>';

/* panel w zwijanych sekcjach (jak Statystyki: <details class="stsec">, stan w joinOpen); na start rozwinięte „Zaproszenia” */
let demoOpen0=false,demoVF="",demoSel=new Set();   // demoVF: filtr ochotników ""|"vol"|"non"; demoSel: zaznaczeni do akcji zbiorczej
const demoSec=(k,h,sum,body)=>'<details class="stsec dmsec" data-j="dm_'+k+'"'+(joinOpen.has("dm_"+k)?' open':'')+'><summary><span>'+h+'</span>'
  +(sum!==""&&sum!=null?'<span class="stsum"'+(k==="vol"?' id="dmvsum"':'')+'>'+sum+'</span>':'')+'</summary><div class="stbody">'+body+'</div></details>';
// przerysowanie panelu bez skoku na górę (renderGear podmienia całe okno)
function demoRender(){const x=document.querySelector("#gearpanel .sheetbox"),y=x?x.scrollTop:0;renderGear();const z=document.querySelector("#gearpanel .sheetbox");if(z&&gearView==="demo")z.scrollTop=y}

// 🙋 ochotnicy: wszyscy prawdziwi użytkownicy (bez kont demo i bez Ciebie), szukajka + filtry osób + Ochotnicy / Nie-ochotnicy, zaznaczanie wielu
const demoPeople=()=>Object.keys(nicks).filter(id=>id!==uid&&!demoIds.has(id));
const demoVShown=()=>demoPeople().filter(id=>demoVF==="vol"?demoVol.has(id):demoVF==="non"?!demoVol.has(id):true);
function demoVolChips(){const all=demoPeople(),nv=all.filter(id=>demoVol.has(id)).length;
  const c=(v,l,n)=>'<button type="button" class="fch'+(demoVF===v?' on':'')+'" aria-pressed="'+(demoVF===v)+'" data-dx="vf" data-dv="'+v+'">'+l+' <span class="fcn">'+n+'</span></button>';
  return '<div class="pfrow">'+c("","Wszyscy",all.length)+c("vol",uiIcon("flask")+" Ochotnicy",nv)+c("non","Nie-ochotnicy",all.length-nv)+'</div>'}
function demoVolAct(){const all=new Set(demoPeople()),sel=[...demoSel].filter(id=>all.has(id)),na=sel.filter(id=>!demoVol.has(id)).length,nd=sel.length-na;
  if(!sel.length)return '<p class="note">Zaznacz osoby, żeby dodać je do ochotników albo wypisać. Tylko za zgodą tych osób.</p>';
  return '<div class="dmvact"><button type="button" class="b sbtn" data-dx="vadd"'+(na&&!demoBusy?'':' disabled')+'>Dodaj do ochotników ('+na+')</button>'
   +'<button type="button" class="b sbtn g" data-dx="vdel"'+(nd&&!demoBusy?'':' disabled')+'>Wypisz ('+nd+')</button></div>'
   +'<button type="button" class="lnk dmvclr" data-dx="vclr">Wyczyść zaznaczenie ('+sel.length+')</button>'}
// dwie zwijane sekcje jak „Ulubieni / Pozostali”: Ochotnicy (rozwinięci) i Potencjalni ochotnicy (zwinięci); przy szukaniu / filtrze rozwinięte
let demoVCol={v:false,p:true};
const demoVOpen=g=>!demoVCol[g]||pfOn("dvol");
function demoVolList(){
  const ids=demoVShown().sort((a,b)=>nicks[a].localeCompare(nicks[b],"pl")),V=ids.filter(id=>demoVol.has(id)),P=ids.filter(id=>!demoVol.has(id)),two=true;   // sekcje zawsze — także gdy ochotników jeszcze nie ma
  const vis=[...(demoVOpen("v")||!two?V:[]),...(demoVOpen("p")||!two?P:[])].filter(id=>pfMatch("dvol",id)),all=vis.length&&vis.every(id=>demoSel.has(id));
  const row=id=>'<button type="button" class="prow'+(demoSel.has(id)?' on':'')+'" data-dx="vsel" data-du="'+esc(id)+'" data-pu="'+esc(id)+'" aria-pressed="'+demoSel.has(id)+'"'+(pfMatch("dvol",id)?'':' style="display:none"')+'>'
     +'<span class="cbx">'+CHECK+'</span><span class="pnm">'+nk(id)+'</span>'+(demoVol.has(id)?'<span class="pjn">ochotnik</span>':'')+'</button>';
  const sec=(L,g)=>{if(!L.length)return '';const k=L.filter(id=>demoSel.has(id)).length;
    return (two?secBar(g==="v"?uiIcon("flask"):uiIcon("users"),g==="v"?"Ochotnicy":"Potencjalni ochotnicy",L.length,demoVCol[g],k?"zaznaczono "+k:"",'data-dx="vtog" data-vs="'+g+'"',false):'')
      +'<div class="fvbody'+(two?' secb':'')+(two&&demoVCol[g]?' col':'')+'">'+L.map(row).join("")+'</div>'};
  return '<div class="bsgrp gl"><span>Osoby ('+ids.length+')</span>'+(vis.length?'<button type="button" class="lnk" data-dx="vall">'+(all?'Odznacz widocznych':'Zaznacz widocznych')+'</button>':'')+'</div>'
   +sec(V,"v")+sec(P,"p")
   +'<div class="note pfnone'+(ids.some(id=>pfMatch("dvol",id))?' hide':'')+'">'+(ids.length?'Nikt nie pasuje do filtra.':'Brak osób w tym filtrze.')+'</div>'}
// „widoczni” = pasują do filtrów i nie siedzą w zwiniętej sekcji
const demoVVis=()=>demoVShown().filter(id=>pfMatch("dvol",id)&&demoVOpen(demoVol.has(id)?"v":"p"));
const demoVolHtml=()=>'<div id="dmvchips">'+demoVolChips()+'</div>'+pfBar("dvol",demoPeople().length)
  +'<div id="dmvact">'+demoVolAct()+'</div><div class="sleft dmvlist" data-pfl="dvol" id="dmvlist">'+demoVolList()+'</div>'
  +'<p class="note">Ochotnicy dostają prywatne zaproszenia od kont demo i zaproszenia do grup demo (powiadomienia w aplikacji i na Telegramie). Pojedynczo dodasz też w karcie osoby → Administrator.</p>';
// odświeżenie samej sekcji ochotników (pole szukania nie traci kursora, okno nie skacze)
function demoVolPart(){
  if(!$("dmvlist"))return;$("dmvchips").innerHTML=demoVolChips();$("dmvact").innerHTML=demoVolAct();$("dmvlist").innerHTML=demoVolList();pfApply("dvol");
  const v=demoPeople().filter(id=>demoVol.has(id)).length;if($("dmvsum"))$("dmvsum").textContent=v||"brak";if($("dmvoln"))$("dmvoln").textContent=demoVol.size;
}

function demoHtml(){
  const s=demoSt,ld=s===null,er=s&&s.err;
  if(!demoOpen0){demoOpen0=true;joinOpen.add("dm_gen")}
  const st=(v,l)=>'<div class="st"><b>'+(ld?'…':v)+'</b><span>'+l+'</span></div>';
  const made=(s&&s.pool||[]).filter(p=>p.user_id),act=s&&+s.demo_active||0,dis=demoBusy?' disabled':'';
  const grs=(s&&s.groups)||[],auto=!s||s.auto!==false,pd=(s&&s.pending)||{},tl=s&&s.tick_last;
  const nAct=made.filter(p=>p.slot<=act).length,nPd=(pd.g_invites||0)+(pd.g_requests||0)+(pd.rides||0);
  const bikes=Object.keys(DEMO_BIKE).map(b=>[b,made.filter(p=>p.bike===b&&p.slot<=act).length]).filter(x=>x[1]);
  const nVol=demoPeople().filter(id=>demoVol.has(id)).length,hs=(s&&s.hist)||{};
  return '<button class="sback" data-c="backadmin">‹ Administracja</button><div class="sname" style="margin-top:26px">🧪 Zaproszenia testowe</div>'
   +'<div class="smail">Konta demo i zaproszenia do testów. Widzisz to tylko Ty (👑). Konta demo mają plakietkę <span class="nkdemo">DEMO</span> i nie da się na nie zalogować.</div>'
   +(er?'<p class="note" style="color:var(--bad)">Nie udało się wczytać: '+esc(er)+'</p>':'')
   +'<div class="stats admbar dmst">'+st(s&&s.test_wants||0,"zaproszeń testowych")+st(s&&s.test_private||0,"w tym prywatnych")+st(s&&s.demo_accounts||0,"kont demo")+'</div>'
   // 1. 👥 ekipa demo: liczba kont + lista kont
   +demoSec("acc","Ekipa demo",ld?"…":made.length?made.length+" kont · losuje "+nAct:"brak kont",
     '<div class="ios-grp">'
     +demoStep("acc",demoAcc,1,30,"Liczba kont",made.length?"Utworzone: "+made.length+" · zaproszenia losują z "+nAct:"Nicki z puli 30, rowery na zmianę")
     +'<button type="button" class="ios-it ios-row dmact" data-dx="acc"'+dis+'><span class="ios-t">'+(demoAcc>made.length?'Utwórz brakujące ('+(demoAcc-made.length)+')':'Ustaw liczbę kont')+'</span></button></div>'
     +'<p class="note">Mniejsza liczba niczego nie usuwa — generator i grupy biorą wtedy tylko pierwsze konta, reszta czeka.</p>'
     +(bikes.length?'<div class="dmbikes">'+bikes.map(([b,n])=>'<span class="dmbk dm-'+b+'">'+uiIcon(b==="road"?"road":b==="trekking"?"bike":b)+' '+DEMO_BIKE[b]+' '+n+'</span>').join("")+'</div>':'')
     +(made.length?demoList("acc","users","Konta",made.length,'<div class="ios-grp">'+made.map(p=>p.user_id&&nicks[p.user_id]?gRow(p.slot<=act?"#ff9f0a":"#8e8e93",p.bike==="road"?"road":p.bike==="trekking"?"bike":p.bike,nk(p.user_id),
        DEMO_BIKE[p.bike]+(p.slot<=act?'':' · nie losuje (poza liczbą kont)'),'','data-dx="user" data-du="'+esc(p.user_id)+'"'):'').join("")+'</div>'):''))
   // 2. 🎲 zaproszenia: generator
   +demoSec("gen","Zaproszenia",ld?"…":(s&&s.test_wants||0)+" testowych",
     '<div class="ios-grp">'
     +demoStep("n",demoF.n,1,60,"Liczba zaproszeń","Zwykle 20–30 na raz")
     +'<div class="ios-it dmcol"><span class="ios-t">Na ile dni do przodu<small>Od jutra</small></span><div class="seg" role="group" aria-label="Na ile dni">'
       +DEMO_DAYS.map(([d,l])=>'<button type="button" class="'+(demoF.days===d?'on':'')+'" aria-pressed="'+(demoF.days===d)+'" data-dx="days" data-dd="'+d+'">'+l+'</button>').join("")+'</div></div>'
     +'<div class="ios-it dmcol"><label class="ios-t" for="dmpriv">Jawne i prywatne<small id="dmprivt">jawne '+(100-demoF.priv)+'% · prywatne '+demoF.priv+'%</small></label>'
       +'<input id="dmpriv" type="range" min="0" max="100" step="10" value="'+demoF.priv+'"><small class="note">Prywatne dostają konta demo i ochotnicy (<span id="dmvoln">'+demoVol.size+'</span>).</small></div>'
     +'<div class="ios-it dmcol"><label class="ios-t" for="dmvol">Ochotników na prywatne zaproszenie<small id="dmvolt">'+demoVolTxt()+'</small></label>'
       +'<input id="dmvol" type="range" min="0" max="5" step="1" value="'+demoF.vol+'"><small class="note">Tylu losowych ochotników dopraszają konta demo do każdego prywatnego zaproszenia (nie więcej, niż masz ochotników). 0 = tylko konta demo.</small></div>'
     +'<div class="ios-it dmcol"><label class="ios-t" for="dmgrp">Prywatne dla grupy<small id="dmgrpt">'+demoF.grp+'% prywatnych — dla grupy demo autora</small></label>'
       +'<input id="dmgrp" type="range" min="0" max="100" step="10" value="'+demoF.grp+'"'+(grs.length?'':' disabled')+'><small class="note">'+(grs.length?'Dostają je członkowie grupy (też ochotnicy, którzy dołączyli).':'Najpierw załóż grupy demo (sekcja „Grupy demo”).')+'</small></div>'
     +demoSw("routes","Trasy z biblioteki tras","Mapa i GPX przy części zaproszeń")
     +demoSw("ranges","Zakresy godzin","Część zaproszeń „do ustalenia”")
     +demoSw("answers","Dołączenia i odmowy kont demo","Żeby karty nie były puste")
     +demoSw("chan","Podsumowanie także na kanale","Domyślnie tylko do Ciebie na Telegram")
     +'</div><button type="button" class="b sbtn" data-dx="gen"'+(made.length&&!demoBusy?'':' disabled')+'>'+(demoBusy?'Pracuję…':'Wygeneruj '+demoF.n+' '+(demoF.n===1?'zaproszenie':demoF.n%10>=2&&demoF.n%10<=4&&(demoF.n%100<12||demoF.n%100>14)?'zaproszenia':'zaproszeń'))+'</button>'
     +(made.length?'':'<p class="note">Najpierw utwórz konta demo (sekcja „Ekipa demo”).</p>')
     +'<p class="note">Każde dostaje plakietkę 🧪 TEST, więc „Usuń wszystkie testowe” (Sprzątanie) usuwa je jednym ruchem. Autor i dołączający nie mają innej jazdy ±3 h.</p>')
   // 3. 🙋 ochotnicy
   +demoSec("vol","Ochotnicy",nVol||"brak",demoVolHtml())
   // 4. 👥 grupy demo
   +demoSec("grp","Grupy demo",ld?"…":grs.length||"brak",
     '<div class="ios-grp">'
     +demoStep("grn",demoGrN,1,10,"Liczba nowych grup","Nazwy z puli 10 · limity jak u ludzi (3 założone, 15 przynależności)")
     +'<button type="button" class="ios-it ios-row dmact" data-dx="grp"'+(made.length>=2&&!demoBusy?'':' disabled')+'><span class="ios-t">Załóż '+demoGrN+' '+(demoGrN===1?'grupę':demoGrN<5?'grupy':'grup')+' demo</span></button></div>'
     +(grs.length?demoList("grp","users","Grupy",grs.length,'<div class="ios-grp">'+grs.map(g=>'<div class="ios-it"><span class="ios-ic" style="background:'+(typeof grCol==="function"?grCol(g):"#0a84ff")+'">'+uiIcon(g.icon||"users")+'</span><span class="ios-t">'+esc(g.name)
        +'<small>'+[g.members+' '+(g.members===1?'członek':'członków'),g.real?'prawdziwych: '+g.real:'',g.invited?'zaproszeni: '+g.invited:'',g.requested?'prośby: '+g.requested:'',g.visibility==="hidden"?'ukryta':'',g.join_mode==="open"?'wolne':'na prośbę'].filter(Boolean).join(' · ')+'</small></span></div>').join("")+'</div>'):'')
     +(made.length<2?'<p class="note">Grupy zakładają konta demo — potrzebne co najmniej 2.</p>':'<p class="note">Ochotnicy dostają zaproszenia do grup. Grupy widzą na razie testerzy (przełącznik „Grupy”).</p>'))
   // 5. 📈 historia demo (KROK 77): przeszłe jazdy, raporty, wpisy na tablicach
   +demoSec("hist","Historia demo",ld?"…":hs.rides?hs.rides+" jazd · "+demoNum(hs.km||0)+" km":"brak",
     '<div class="stats admbar dmst">'+st(hs.rides||0,"odbytych jazd")+st(hs.reports||0,"raportów")+st(hs.posts||0,"wpisów")+'</div>'
     +'<div class="ios-grp">'
     +demoStep("hw",demoF.hw,1,26,"Tygodnie wstecz","Od wczoraj w przeszłość")
     +demoStep("hpw",demoF.hpw||demoHAuto(nAct),1,40,"Jazd w tygodniu",demoF.hpw?"Ustawione ręcznie":"Auto — ok. 0,6 × aktywne konta ("+nAct+")")
     +'<div class="ios-it dmcol"><label class="ios-t" for="dmhgrp">Jazdy grup demo<small id="dmhgrpt">'+demoF.hgrp+'% jazd — członkowie jednej grupy demo</small></label>'
       +'<input id="dmhgrp" type="range" min="0" max="100" step="5" value="'+demoF.hgrp+'"'+(grs.length?'':' disabled')+'><small class="note">'+(grs.length?'Te jazdy wejdą do statystyk grupy.':'Najpierw załóż grupy demo (sekcja „Grupy demo”).')+'</small></div>'
     +demoSw("hposts","Wpisy na tablicach grup demo","Kilka wpisów i 👍 na grupę, przypięte powitanie")
     +'</div><button type="button" class="b sbtn" data-dx="hist"'+(nAct>=2&&!demoBusy?'':' disabled')+'>'+(demoBusy?'Pracuję…':'Dopisz historię (ok. '+demoF.hw*(demoF.hpw||demoHAuto(nAct))+' jazd)')+'</button>'
     +(nAct>=2?'':'<p class="note">Potrzebne co najmniej 2 aktywne konta demo (sekcja „Ekipa demo”).</p>')
     +'<p class="note">Jeżdżą i odpowiadają na „Jak poszło?” tylko konta demo (km, tempo, oceny) — ochotników to nie dotyczy. Jazdy mają 🧪 TEST, bez powiadomień i Telegramu (jedno podsumowanie do Ciebie). Konta demo dostają włączone „Moje jazdy” dla innych, żeby było widać wykresy. Każde kliknięcie dopisuje kolejne jazdy.</p>')
   // 6. 🤖 odpowiedzi kont demo
   +demoSec("tick","Odpowiedzi kont demo",ld?"…":(auto?"same":"wyłączone")+" · czeka "+nPd,
     '<div class="ios-grp">'
     +'<div class="ios-it"><span class="ios-t">Odpowiadają same<small>Co 15 min: zaproszenia do grup i na rower, prośby do grup demo · po kilku minutach do ok. 4 h</small></span>'
       +'<button type="button" class="ios-sw'+(auto?' on':'')+'" role="switch" aria-checked="'+auto+'" aria-label="Konta demo odpowiadają same" data-dx="auto"'+dis+'></button></div>'
     +'<div class="ios-it"><span class="ios-t">Czeka na odpowiedź<small>'+(ld?'…':[(pd.g_invites||0)+' do grup',(pd.g_requests||0)+' próśb',(pd.rides||0)+' na rower'].join(' · '))+'</small></span></div>'
     +(tl?'<div class="ios-it"><span class="ios-t">Ostatnia tura<small>'+demoWhen(tl.at)+' · przyjęte: '+((tl.g_ok||0)+(tl.rq_ok||0)+(tl.ride_ok||0))+' · odmowy: '+((tl.g_no||0)+(tl.rq_no||0)+(tl.ride_no||0))+'</small></span></div>':'')
     +'<button type="button" class="ios-it ios-row dmact" data-dx="tick"'+(made.length&&!demoBusy?'':' disabled')+'><span class="ios-t">Odpowiedz teraz, bez czekania</span></button>'
     +'</div><p class="note">Po każdej turze, w której coś się stało — jedna wiadomość do Ciebie na Telegram.</p>')
   // 7. 🧹 sprzątanie (zwinięte — same czerwone przyciski)
   +demoSec("del","Sprzątanie","",
     '<div class="ios-grp">'+[gRow("#ff3b30","trash","Usuń wszystkie testowe zaproszenia","Konta demo zostają · potwierdzasz wpisując USUŃ",'','data-dx="testdel"'),
      gRow("#ff3b30","trash","Usuń historię demo","Przeszłe jazdy kont demo z raportami i ich wpisy na tablicach · przyszłe zaproszenia zostają",
        hs.rides||hs.posts?'<span class="ios-v">'+((hs.rides||0)+(hs.posts||0))+'</span>':'','data-dx="histdel"'+(hs.rides||hs.posts?dis:' disabled')),
      gRow("#ff3b30","trash","Zamknij grupy demo","Do archiwum, razem z prawdziwymi członkami",grs.length?'<span class="ios-v">'+grs.length+'</span>':'','data-dx="grwipe"'+(grs.length?dis:' disabled')),
      gRow("#ff3b30","trash","Usuń konta demo","Wszystkie naraz, razem z ich zaproszeniami, listami i ulubionymi",made.length?'<span class="ios-v">'+made.length+'</span>':'','data-dx="wipe"'+(made.length?dis:' disabled'))].join("")+'</div>');
}

const demoWhen=t=>{const d=new Date(t);return isNaN(d)?"—":d.toLocaleString("pl-PL",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
async function demoRun(fn,args,okMsg){
  if(demoBusy)return;demoBusy=true;demoRender();
  try{const r=await sb.rpc(fn,args);if(r.error)throw r.error;demoBusy=false;await demoLoad();await syncNow();say(okMsg(r.data));}
  catch(e){demoBusy=false;demoErr(e)}
  await demoStatus();
}

$("gearpanel").addEventListener("click",async e=>{
  const b=e.target.closest("[data-dx]");if(!b||b.disabled||!session)return;
  const a=b.dataset.dx;
  if(a==="open"){if(!isKingReal())return;demoSt=null;demoSel=new Set();gearView="demo";renderGear();demoLoad().then(demoStatus);return}
  if(!isKingReal())return;
  if(a==="vol"){const id=b.dataset.du,on=!demoVol.has(id);
    if(on&&!await askOk("Dodać "+(nicks[id]||"tę osobę")+" do ochotników Ekipy demo?\n\nBędzie dostawać prywatne zaproszenia testowe od kont demo (powiadomienia w aplikacji i na Telegramie). Rób to tylko za zgodą tej osoby.","Dodaj"))return;
    demoBusy=true;renderGear();
    try{const r=await sb.rpc("admin_demo_volunteer",{u:id,p_on:on});if(r.error)throw r.error;on?demoVol.add(id):demoVol.delete(id);say(on?"🙋 Dodano do ochotników":"Wypisano z ochotników")}catch(err){demoErr(err)}
    demoBusy=false;renderGear();return}
  // 🙋 ochotnicy zbiorczo: filtr, zaznaczanie (bez przerysowania całego okna), dodaj / wypisz
  if(a==="vf"){demoVF=b.dataset.dv||"";demoVolPart();return}
  if(a==="vsel"){const id=b.dataset.du,on=!demoSel.has(id);on?demoSel.add(id):demoSel.delete(id);b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);
    $("dmvact").innerHTML=demoVolAct();const vis=demoVVis(),l=document.querySelector('#dmvlist [data-dx="vall"]');
    if(l)l.textContent=vis.length&&vis.every(x=>demoSel.has(x))?"Odznacz widocznych":"Zaznacz widocznych";return}
  if(a==="vtog"){const g=b.dataset.vs;demoVCol[g]=!demoVCol[g];$("dmvlist").innerHTML=demoVolList();pfApply("dvol");return}
  if(a==="vall"){const vis=demoVVis(),all=vis.every(x=>demoSel.has(x));vis.forEach(x=>all?demoSel.delete(x):demoSel.add(x));demoVolPart();return}
  if(a==="vclr"){demoSel.clear();demoVolPart();return}
  if(a==="vadd"||a==="vdel"){const P=new Set(demoPeople()),on=a==="vadd",L=[...demoSel].filter(id=>P.has(id)&&demoVol.has(id)!==on);if(!L.length)return;
    const nm=L.map(id=>nicks[id]).slice(0,8).join(", ")+(L.length>8?" i "+(L.length-8)+" innych":"");
    if(on&&!await askOk("Dodać "+L.length+" "+plf(L.length,["osobę","osoby","osób"])+" do ochotników Ekipy demo?\n\n"+nm+"\n\nBędą dostawać prywatne zaproszenia testowe od kont demo i zaproszenia do grup demo (powiadomienia w aplikacji i na Telegramie). Rób to tylko za zgodą tych osób.","Dodaj"))return;
    demoBusy=true;$("dmvact").innerHTML=demoVolAct();let ok=0,err=null;
    for(const id of L){try{const r=await sb.rpc("admin_demo_volunteer",{u:id,p_on:on});if(r.error)throw r.error;on?demoVol.add(id):demoVol.delete(id);demoSel.delete(id);ok++}catch(e){err=e}}
    demoBusy=false;demoVolPart();
    if(err)demoErr(err);say((on?"🙋 Dodano do ochotników: ":"Wypisano z ochotników: ")+ok+(ok<L.length?" z "+L.length:""));return}
  if(a==="user"){userBack="demo";tkFrom=false;userId=b.dataset.du;gearView="user";renderGear();if(isAdmin&&typeof loadAdmInfo==="function"){delete admInfo[userId];loadAdmInfo(userId)}return}
  if(a==="acc-"||a==="acc+"){demoAccSet=true;demoAcc=Math.max(1,Math.min(30,demoAcc+(a==="acc+"?1:-1)));demoRender();return}
  if(a==="grn-"||a==="grn+"){demoGrN=Math.max(1,Math.min(10,demoGrN+(a==="grn+"?1:-1)));demoRender();return}
  if(a==="grp"){await demoRun("admin_demo_groups",{p_count:demoGrN,p_volunteers:true},d=>d&&d.created?"👥 Założono grup demo: "+d.created+(d.invited?" · zaproszeni ochotnicy: "+d.invited:""):"Nie założono grup — konta demo są w limitach albo pula nazw się skończyła");
    if(typeof grReload==="function")grReload();return}
  if(a==="grwipe"){const n=(demoSt&&demoSt.groups||[]).length;
    if(!await askOk("Zamknąć "+n+" "+(n===1?"grupę":n<5?"grupy":"grup")+" demo?\n\nTrafią do archiwum — także prawdziwi członkowie z nich wypadną. Konta demo zostają, grupy możesz założyć od nowa.","Zamknij grupy",true))return;
    await demoRun("admin_demo_groups_wipe",{do_delete:true},d=>"🧹 Zamknięto grup demo: "+(+d||0));if(typeof grReload==="function")grReload();return}
  if(a==="auto"){const on=!(demoSt&&demoSt.auto!==false);await demoRun("admin_demo_auto",{p_on:on},()=>on?"🤖 Konta demo odpowiadają same":"Konta demo nie odpowiadają same");return}
  if(a==="tick"){await demoRun("admin_demo_tick",{p_force:true},d=>{d=d||{};const ok=(d.g_ok||0)+(d.rq_ok||0)+(d.ride_ok||0),no=(d.g_no||0)+(d.rq_no||0)+(d.ride_no||0);return ok+no?"🤖 Odpowiedzi: przyjęte "+ok+", odmowy "+no:"Nic nie czekało na odpowiedź"});
    if(typeof grReload==="function")grReload();return}
  if(a==="ltog"){const k=b.dataset.dl;demoLCol[k]=!demoLCol[k];demoRender();return}
  if(a==="hw-"||a==="hw+"){demoF.hw=Math.max(1,Math.min(26,demoF.hw+(a==="hw+"?1:-1)));demoRender();return}
  if(a==="hpw-"||a==="hpw+"){const act=(demoSt&&demoSt.pool||[]).filter(p=>p.user_id&&p.slot<=(+demoSt.demo_active||0)).length;
    demoF.hpw=Math.max(1,Math.min(40,(demoF.hpw||demoHAuto(act))+(a==="hpw+"?1:-1)));demoRender();return}
  if(a==="hist"){
    if(!await askOk("Dopisać historię jazd kontom demo?\n\nOk. "+demoF.hw*(demoF.hpw||demoHAuto((demoSt&&demoSt.pool||[]).filter(p=>p.user_id&&p.slot<=(+demoSt.demo_active||0)).length))+" odbytych jazd z ostatnich "+demoF.hw+" tyg., raporty „Jak poszło?”"+(demoF.hposts?" i wpisy na tablicach grup demo":"")+". Wszystko z 🧪 TEST, bez powiadomień.","Dopisz"))return;
    await demoRun("admin_demo_history",{p_weeks:demoF.hw,p_per_week:demoF.hpw||null,p_group_pct:demoF.hgrp,p_posts:demoF.hposts},
      d=>{d=d||{};return "📈 Historia: "+(d.rides||0)+" jazd ("+(d.group_rides||0)+" w grupach), "+(d.reports||0)+" raportów, "+demoNum(d.km||0)+" km"+(d.posts?", wpisów: "+d.posts:"")});
    for(const k in userRides)delete userRides[k];   // karty osób: świeże jazdy i km
    if(typeof grReload==="function")grReload();return}
  if(a==="histdel"){const h=(demoSt&&demoSt.hist)||{};
    if(!await askOk("Usunąć historię demo?\n\n"+(h.rides||0)+" przeszłych jazd kont demo z raportami „Jak poszło?” i "+(h.posts||0)+" wpisów kont demo na tablicach grup demo. Przyszłe zaproszenia, konta i grupy zostają.","Usuń historię",true))return;
    await demoRun("admin_demo_history_wipe",{do_delete:true},d=>"🧹 Usunięto: jazd "+(d&&d.rides||0)+", wpisów "+(d&&d.posts||0));
    for(const k in userRides)delete userRides[k];
    if(typeof grReload==="function")grReload();return}
  if(a==="n-"||a==="n+"){demoF.n=Math.max(1,Math.min(60,demoF.n+(a==="n+"?1:-1)));demoRender();return}
  if(a==="days"){demoF.days=+b.dataset.dd;demoRender();return}
  if(a==="sw"){const k=b.dataset.dk;demoF[k]=!demoF[k];demoRender();return}
  if(a==="acc"){const made=(demoSt&&demoSt.pool||[]).filter(p=>p.user_id).length,n=demoAcc;
    demoAccSet=false;await demoRun("admin_demo_accounts",{p_count:n,p_channel:false},d=>d&&d.created?"🧪 Utworzono "+d.created+" · generator losuje z "+n:"Generator losuje teraz z "+n+(n<made?" (pozostałe konta zostają)":""));return}
  if(a==="gen"){
    if(demoF.chan&&!await askOk("Wysłać podsumowanie także na kanał @PrzylesieGo?\n\nZobaczą je wszyscy na kanale, z dopiskiem, że to nie są prawdziwe jazdy.","Wyślij też na kanał"))return;
    await demoRun("admin_demo_generate",{p_count:demoF.n,p_days:demoF.days,p_private_pct:demoF.priv,p_routes:demoF.routes,p_ranges:demoF.ranges,p_answers:demoF.answers,p_channel:demoF.chan,p_group_pct:demoF.grp,p_vol_per:demoF.vol},
      d=>"🧪 Dodano "+(d&&d.created||0)+" zaproszeń testowych (prywatnych: "+(d&&d.private||0)+(d&&d.group?", dla grup: "+d.group:"")+")"+(d&&d.skipped?" · pominięte (nachodzące jazdy): "+d.skipped:""));return}
  if(a==="testdel"){   // ten sam ekran co dawniej (licznik + wpisz USUŃ), powrót do panelu
    demoRet=true;testDelN=null;gearView="testdel";renderGear();
    try{const r=await sb.rpc("admin_test_wants",{do_delete:false});if(r.error)throw r.error;testDelN=+r.data||0}catch(err){testDelN=0;demoErr(err)}
    if(gearView==="testdel")renderGear();return}
  if(a==="wipe"){const n=(demoSt&&demoSt.demo_accounts)||demoIds.size;
    if(!await askOk("Usunąć "+n+" kont demo?\n\nZnikną na zawsze razem z ich zaproszeniami, dołączeniami, listami i ulubionymi. Grupy demo trafią do archiwum. Pula nicków i ochotnicy zostają — konta możesz utworzyć od nowa.","Usuń konta demo",true))return;
    await demoRun("admin_demo_wipe",{do_delete:true},d=>"🧹 Usunięto kont demo: "+(+d||0));return}
});
$("gearpanel").addEventListener("input",e=>{
  if(e.target.id==="dmhgrp"){demoF.hgrp=+e.target.value;const g=$("dmhgrpt");if(g)g.textContent=demoF.hgrp+"% jazd — członkowie jednej grupy demo";return}
  if(e.target.id==="dmvol"){demoF.vol=+e.target.value;const g=$("dmvolt");if(g)g.textContent=demoVolTxt();return}
  if(e.target.id==="dmgrp"){demoF.grp=+e.target.value;const g=$("dmgrpt");if(g)g.textContent=demoF.grp+"% prywatnych — dla grupy demo autora";return}
  if(e.target.id!=="dmpriv")return;demoF.priv=+e.target.value;const t=$("dmprivt");if(t)t.textContent="jawne "+(100-demoF.priv)+"% · prywatne "+demoF.priv+"%"});
// start: aplikacja mogła już wystartować ze stanu telefonu, zanim ten plik się wczytał → doczytaj konta demo od razu
if(typeof session!=="undefined"&&session)demoLoad().then(()=>{if(demoIds.size)refreshUi()}).catch(()=>{});

/* ---------- 📊 KROK 81: „APP DEMO” — anonimowe statystyki trybu demo (tylko 👑; Administracja → Statystyki) ----------
   Dane z admin_demo_stats(p_days); zbiera je js/19 (tylko w ?demo=1). Ustawienia Telegrama: admin_demo_stats_cfg. */
let dsAdm=null,dsAdmAt=0,dsDays=30,dsWipeAsk=false;
const DS_N={dev:{tel:"Telefon",tab:"Tablet",pc:"Komputer"},os:{android:"Android",ios:"iOS",windows:"Windows",macos:"macOS",linux:"Linux",cros:"ChromeOS",inny:"Inny"},
  br:{chrome:"Chrome",safari:"Safari",samsung:"Samsung Internet",firefox:"Firefox",edge:"Edge",opera:"Opera",inna:"Inna"},
  inapp:{fb:"Facebook",msg:"Messenger",ig:"Instagram",wv:"Inna aplikacja",nie:"Zwykła przeglądarka"},
  vw:{xs:"< 360 px",s:"360–399 px",m:"400–479 px",tab:"480–1023 px",pc:"1024 px i więcej"},orient:{p:"Pionowo",l:"Poziomo"},theme:{light:"Jasny",dark:"Ciemny"},
  lang:{pl:"polski",en:"angielski",de:"niemiecki",uk:"ukraiński",ru:"rosyjski",inny:"inny"},
  ref:{fb:"Facebook",msg:"Messenger",ig:"Instagram",google:"Google",app:"Ekran logowania",direct:"Bezpośrednio / brak danych",inna:"Inne strony"},
  conn:{"slow-2g":"bardzo wolne","2g":"2G","3g":"3G","4g":"4G i szybsze"}};
const DS_SCR={t0:"Zaproszenia",t1:"Wieczorynki",t2:"Zaawansowane",t3:"Imprezy",gearpanel:"Ustawienia",wantform:"Formularz zaproszenia",whosheet:"Wybór osób",
  plsheet:"Listy",grsheet:"Grupa",fltsheet:"Filtry",repsheet:"Jak poszło?",evsheet:"Impreza",popsheet:"Okno / karta",picksheet:"Wybór",bellsheet:"Powiadomienia",
  sigsheet:"Mam ochotę",welsheet:"Powitanie",homesheet:"Miejscowość",routesheet:"Trasa",rbsheet:"Baza tras",mapsheet:"Mapa",helpsheet:"Pomoc",demosheet:"Ocena demo",ratesheet:"Ocena aplikacji"};
const DS_CL={"w:join":"Jadę! / Rezygnuję","w:pref":"Pasuje mi o…","w:inv":"Dopraszanie","w:del":"Usuń zaproszenie","id:fab":"Nowe zaproszenie (+)","id:bellbtn":"Dzwonek",
  "id:gear":"Ustawienia","id:helpbtn":"Pomoc","id:pvend":"Wyjdź z demo","id:wsave":"Wyślij zaproszenie","id:wcancel":"Anuluj zaproszenie","id:wfx":"Zamknij formularz",
  "id:t0":"Zakładka Zaproszenia","id:t1":"Zakładka Wieczorynki","id:t2":"Zakładka Zaawansowane","id:t3":"Zakładka Imprezy","id:honl":"Kto jest online","id:menick":"Mój nick",
  "id:wwho":"Kto zobaczy zaproszenie","u:karta":"Karta osoby (nick)","c:myrides":"Moje jazdy","c:back":"Wstecz","c:help":"Pomoc","dq:send":"Ocena demo: wyślij","dq:skip":"Ocena demo: bez oceny",
  "id:iaopen":"Pasek: Otwórz w Chrome","id:iacopy":"Pasek: Kopiuj link","id:iax":"Pasek: ukryj","ev:like":"Impreza: polub","ev:share":"Impreza: udostępnij","my:share":"Udostępnij zaproszenie","my:edit":"Edytuj zaproszenie"};
const dsScrName=k=>DS_SCR[k]||(/^g_/.test(k)?"Ustawienia › "+k.slice(2):k);
const dsClName=k=>DS_CL[k]||(/^x:/.test(k)?"Bez reakcji: ."+k.slice(2):/^j:/.test(k)?"Sekcja: "+k.slice(2):k);
const dsLkName=k=>/^r_/.test(k)?"Funkcja bazy: "+k.slice(2):/^f_/.test(k)?"Funkcja serwera: "+k.slice(2):({login:"Logowanie",signup:"Zakładanie konta",haslo:"Przypomnienie hasła",konto:"Zmiana konta"})[k]||k;
const dsTime=s=>{s=Math.round(+s||0);return s>=60?Math.floor(s/60)+" min "+(s%60)+" s":s+" s"};
function dsAdmLoad(){
  if(dsAdm&&dsAdm.loading)return;dsAdm=Object.assign({},dsAdm||{},{loading:1});
  sb.rpc("admin_demo_stats",{p_days:dsDays}).then(r=>{if(r.error)throw r.error;dsAdm=r.data||{};dsAdmAt=Date.now()})
    .catch(e=>{dsAdm={err:(e&&e.message)||"Nie udało się wczytać statystyk demo (KROK 81)."};dsAdmAt=Date.now()})
    .finally(()=>{if(gearOpen&&gearView==="stats")dsRender()});
}
function dsRender(){const x=document.querySelector("#gearpanel .sheetbox"),y=x?x.scrollTop:0;renderGear();const z=document.querySelector("#gearpanel .sheetbox");if(z&&gearView==="stats")z.scrollTop=y}
const dsAdmSum=()=>dsAdm&&dsAdm.today!=null?dsAdm.today+" dziś · "+dsAdm.d7+" w 7 dni":"";
// słupki (klocek .nbars jak w statystykach grupy)
function dsBars(v,lab,num){const mx=Math.max(1,...v);
  return '<div class="nbars dsbars">'+v.map(n=>'<i style="height:'+(n?Math.max(6,Math.round(n/mx*100)):0)+'%"'+(n?'':' class="z"')+'>'+(n&&num?'<b>'+n+'</b>':'')+'</i>').join("")+'</div>'
   +'<div class="gsbl">'+lab.map(x=>'<span>'+esc(x)+'</span>').join("")+'</div>'}
// rozkład: nazwa · pasek · liczba (%)
function dsDist(o,names,tot){const E=Object.entries(o||{}).sort((a,b)=>b[1]-a[1]);if(!E.length)return '<p class="note">Brak danych.</p>';
  const t=tot||E.reduce((a,[,n])=>a+n,0)||1;
  return '<div class="dsd">'+E.map(([k,n])=>'<div class="dsr"><span>'+esc((names&&names[k])||k)+'</span><i><s style="width:'+Math.round(n/t*100)+'%"></s></i><b>'+n+' · '+Math.round(n/t*100)+'%</b></div>').join("")+'</div>'}
function dsList(L,name,fmtv){if(!L||!L.length)return '<p class="note">Brak danych.</p>';const mx=Math.max(1,...L.map(x=>+x[1]||0));
  return '<div class="dsd">'+L.map(([k,s,n])=>'<div class="dsr"><span>'+esc(name(k))+'</span><i><s style="width:'+Math.round((+s||0)/mx*100)+'%"></s></i><b>'+esc(fmtv(s,n))+'</b></div>').join("")+'</div>'}
function dsAdmHtml(){
  if(!isKingReal())return "";
  if(!dsAdm||(!dsAdm.loading&&Date.now()-dsAdmAt>60000))dsAdmLoad();
  const d=dsAdm||{};
  if(d.err)return '<div class="changed">'+esc(d.err)+'</div>';
  if(d.n==null)return '<div class="smail">Ładuję…</div>';
  const t=(v,l)=>'<div class="st"><b>'+esc(v==null?"—":v)+'</b><span>'+l+'</span></div>',n=+d.n||0,pc=x=>n?Math.round((+x||0)/n*100)+"%":"—";
  const F=d.funnel||[0,0,0,0,0],FL=["Weszło do demo","Kliknęło w zaproszenie","Kliknęło „Jadę!”","Otworzyło formularz","Wysłało zaproszenie"];
  const hr=d.hours||[],H8=[...Array(8)].map((_,i)=>(+hr[i*3]||0)+(+hr[i*3+1]||0)+(+hr[i*3+2]||0)),S=d.series||[];
  const seg=(v,l)=>'<button type="button" class="'+(dsDays===v?'on':'')+'" data-dsx="days" data-v="'+v+'">'+l+'</button>';
  const c=d.cfg||{},mode=c.tg_mode||"off",ms=(v,l)=>'<button type="button" class="'+(mode===v?'on':'')+'" data-dsx="tg" data-v="'+v+'">'+l+'</button>';
  const opt=(a,b,cur,f)=>[...Array(b-a+1)].map((_,i)=>'<option value="'+(a+i)+'"'+(a+i===+cur?' selected':'')+'>'+f(a+i)+'</option>').join("");
  const fl=d.flags||{},V=d.votes||{},sd=S.length?[S[0][0],S[Math.floor(S.length/2)][0],S[S.length-1][0]].map(x=>x.slice(8)+"."+x.slice(5,7)):[];
  return '<div class="stats">'+t(d.today,"dziś")+t(d.d7,"7 dni")+t(d.d30,"30 dni")+t(d.n?dsTime(d.secs_avg):"—","średni czas")+t(pc(d.bounce),"wyszło od razu (< 5 s)")+t(F[4],"wysłane zaproszenia")+'</div>'
   +'<div class="seg dsseg">'+seg(7,"7 dni")+seg(30,"30 dni")+seg(90,"90 dni")+seg(365,"rok")+'</div>'
   +'<div class="note">Okres: '+n+' '+plf(n,["wejście","wejścia","wejść"])+' · mediana czasu '+esc(dsTime(d.secs_med))+' · łącznie '+esc(dsTime(d.secs_sum))+'</div>'
   +(n?'<div class="gsh">Wejścia dzień po dniu</div>'+dsBars(S.map(x=>+x[1]||0),[],S.length<=14)+'<div class="nbl"><span>'+(sd[0]||"")+'</span><span>'+(sd[1]||"")+'</span><span>'+(sd[2]||"")+'</span></div>'
   +'<div class="gsh">Godzina wejścia</div>'+dsBars(H8,["0–3","3–6","6–9","9–12","12–15","15–18","18–21","21–24"],1)
   +'<div class="gsh">Dzień tygodnia</div>'+dsBars((d.dow||[]).map(Number),["pn","wt","śr","czw","pt","sb","nd"],1)
   +'<div class="gsh">Lejek</div><div class="dsd">'+F.map((x,i)=>'<div class="dsr"><span>'+FL[i]+'</span><i><s style="width:'+(F[0]?Math.round(x/F[0]*100):0)+'%"></s></i><b>'+x+' · '+(F[0]?Math.round(x/F[0]*100):0)+'%</b></div>').join("")+'</div>'
   +'<div class="gsh">Skąd</div>'+dsDist(d.ref,DS_N.ref,n)
   +(Object.keys(d.tag||{}).length?'<div class="gsh">Znacznik w linku (&amp;z=…)</div>'+dsDist(d.tag,null,n):'')
   +'<div class="gsh">Urządzenie</div>'+dsDist(d.dev,DS_N.dev,n)
   +'<div class="gsh">System</div>'+dsDist(d.os,DS_N.os,n)
   +'<div class="gsh">Przeglądarka</div>'+dsDist(d.br,DS_N.br,n)
   +'<div class="gsh">Wbudowana przeglądarka aplikacji</div>'+dsDist(d.inapp,DS_N.inapp,n)
   +'<div class="gsh">Szerokość ekranu</div>'+dsDist(d.vw,DS_N.vw,n)
   +'<div class="gsh">Orientacja</div>'+dsDist(d.orient,DS_N.orient,n)
   +'<div class="gsh">Motyw systemu</div>'+dsDist(d.theme,DS_N.theme,n)
   +'<div class="gsh">Język</div>'+dsDist(d.lang,DS_N.lang,n)
   +(Object.keys(d.conn||{}).length?'<div class="gsh">Połączenie (tylko Chrome)</div>'+dsDist(d.conn,DS_N.conn):'')
   +'<div class="stats">'+t(pc(fl.pwa),"zainstalowana aplikacja")+t(pc(fl.dark),"ciemny motyw w demo")+t(pc(fl.thchg),"zmienili motyw")+t(pc(fl.rm),"ograniczony ruch")+t(pc(fl.hc),"większy kontrast")
     +t(d.scroll_avg==null?"—":d.scroll_avg+"%","przewinięcie listy")+'</div>'
   +'<div class="gsh">Ekrany — łączny czas</div>'+dsList(d.screens,dsScrName,(s,c)=>dsTime(s)+" · "+c+" os.")
   +'<div class="gsh">Ostatni ekran przed wyjściem</div>'+dsDist(Object.fromEntries(Object.entries(d.last||{}).map(([k,v])=>[dsScrName(k),v])),null,n)
   +'<div class="gsh">Najczęściej klikane</div>'+dsList((d.clicks||[]).filter(x=>!/^x:/.test(x[0])).slice(0,20),dsClName,(s,c)=>s+" · "+c+" os.")
   +'<div class="gsh">Problemy</div><div class="stats">'+t(d.rage,"szybkie stukanie ("+(d.rage_s||0)+" os.)")+t(d.dead,"kliknięcia bez reakcji ("+(d.dead_s||0)+" os.)")
     +t(d.errs,"błędy aplikacji ("+(d.err_s||0)+" os.)")+t(d.load_med==null?"—":(d.load_med/1000).toFixed(1).replace(".",",")+" s","wczytanie (mediana)")
     +t(d.load_p90==null?"—":(d.load_p90/1000).toFixed(1).replace(".",",")+" s","wczytanie (9 na 10 szybciej)")+'</div>'
   +((d.clicks||[]).some(x=>/^x:/.test(x[0]))?'<div class="gsh">Kliknięcia bez reakcji — gdzie</div>'+dsList((d.clicks||[]).filter(x=>/^x:/.test(x[0])).slice(0,10),dsClName,(s,c)=>s+" · "+c+" os."):'')
   +((d.err_msgs||[]).length?'<div class="gsh">Komunikaty błędów</div><div class="urrec">'+d.err_msgs.map(([m,c])=>'<div>'+esc(m)+' <span class="note">× '+c+'</span></div>').join("")+'</div>':'')
   +((d.locked||[]).length?'<div class="gsh">Próby funkcji niedostępnych w demo</div>'+dsList(d.locked,dsLkName,(s,c)=>s+" · "+c+" os."):'')
   +'<div class="gsh">Oceny przy wyjściu</div><div class="stats">'+t(V.up||0,"Fajne")+t(V.down||0,"Słabo")+'</div>'
   +((d.notes||[]).length?'<div class="urrec">'+d.notes.map(x=>'<div>'+(x.vote>0?'<span class="dsv up">Fajne</span> ':x.vote<0?'<span class="dsv dn">Słabo</span> ':'')+esc(x.note)
      +' <span class="note">'+esc(new Date(x.at).toLocaleString("pl-PL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))+(x.dev?' · '+esc(DS_N.dev[x.dev]||x.dev):'')+'</span></div>').join("")+'</div>':'')
   :'<p class="note">Jeszcze nikt nie wszedł do demo w tym okresie.</p>')
   +'<div class="gsh">Powiadomienia na Telegram (do 👑)</div><div class="seg dsseg dstg">'+ms("off","Wyłączone")+ms("each","Każde wejście")+ms("hours","Co kilka godzin")+ms("daily","Raz dziennie")+'</div>'
   +(mode==="hours"?'<label class="dslbl">Co ile godzin <select data-dsx="hrs">'+opt(1,24,c.tg_hours,x=>x+" h")+'</select></label>':'')
   +(mode==="daily"?'<label class="dslbl">O godzinie <select data-dsx="hr">'+opt(0,23,c.tg_hour,x=>x+":00")+'</select></label>':'')
   +'<p class="note">'+(mode==="each"?'Zbiorczo co 5 minut, gdy ktoś skończył oglądać demo.':mode==="off"?'Bez wiadomości — dane widać tylko tutaj.':'Jedna wiadomość z podsumowaniem, tylko gdy ktoś był w demo.')+' Wiadomość nie zawiera treści uwag.</p>'
   +'<button type="button" class="b sbtn g" data-dsx="wipe">'+(dsWipeAsk?'Na pewno? Usuń wszystkie statystyki demo':'Wyczyść statystyki demo')+'</button>'
   +'<p class="note">Anonimowo: bez nicków, adresu IP i ciasteczek; dane starsze niż 180 dni usuwają się same.</p>';
}
async function dsAct(k,v){
  if(k==="days"){dsDays=+v||30;dsAdm=null;dsAdmLoad();dsRender();return}
  if(k==="wipe"){if(!dsWipeAsk){dsWipeAsk=true;dsRender();return}dsWipeAsk=false;
    const r=await sb.rpc("admin_demo_stats_wipe");say(r.error?"Nie udało się: "+r.error.message:"Usunięto statystyki demo ("+(r.data||0)+")");dsAdm=null;dsAdmLoad();dsRender();return}
  const c=(dsAdm&&dsAdm.cfg)||{},a={p_mode:k==="tg"?v:c.tg_mode||"off",p_hours:k==="hrs"?+v:null,p_hour:k==="hr"?+v:null};
  const r=await sb.rpc("admin_demo_stats_cfg",a);
  if(r.error){say("Nie udało się: "+r.error.message);return}
  if(dsAdm)dsAdm.cfg=r.data;dsRender();if(k==="tg")say(v==="off"?"Powiadomienia o demo wyłączone":"Powiadomienia o demo włączone");
}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("button[data-dsx]");if(!b||!isKingReal())return;e.preventDefault();dsAct(b.dataset.dsx,b.dataset.v)});
document.addEventListener("change",e=>{const s=e.target.closest&&e.target.closest("select[data-dsx]");if(!s||!isKingReal())return;dsAct(s.dataset.dsx,s.value)});
