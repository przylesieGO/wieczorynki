/* 🧪 Ekipa demo (KROK 74–75) — 👑 ⚙️ → Administracja → „Generator zaproszeń” (na górze) → „Zaproszenia testowe”:
   konta demo (1–30, pula nicków), generator zaproszeń testowych (bez nachodzących jazd, część dla grup demo),
   grupy demo (1–10), automatyczne odpowiedzi kont demo (cron co 15 min, przełącznik), ochotnicy, sprzątanie;
   plakietka DEMO przy nickach i grupach kont demo.
   Wszystko robią funkcje bazy admin_demo_* (sprawdzają 👑); tabele demo_* są tylko do odczytu.
   Plik wczytywany jako ostatni: przy wczytaniu tylko rejestruje obsługę zdarzeń; niższe pliki wołają go przez typeof. */
let demoIds=new Set(),demoVol=new Set(),demoSt=null,demoBusy=false,demoRet=false;
let demoAcc=4;   // ile kont demo (stepper „Konta demo”)
let demoGrN=3;   // ile grup demo założyć (stepper „Grupy demo”)
const demoF={n:25,days:14,priv:30,grp:30,routes:true,ranges:true,answers:true,chan:false};
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
  try{const r=await sb.rpc("admin_demo_status");if(r.error)throw r.error;demoSt=r.data||{};if(demoSt.demo_active)demoAcc=+demoSt.demo_active}
  catch(e){demoSt={err:(e&&e.message)||"błąd"}}
  if(gearView==="demo")renderGear();
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

function demoHtml(){
  const s=demoSt,ld=s===null,er=s&&s.err;
  const st=(v,l)=>'<div class="st"><b>'+(ld?'…':v)+'</b><span>'+l+'</span></div>';
  const made=(s&&s.pool||[]).filter(p=>p.user_id),act=s&&+s.demo_active||0,dis=demoBusy?' disabled':'';
  const grs=(s&&s.groups)||[],auto=!s||s.auto!==false,pd=(s&&s.pending)||{},tl=s&&s.tick_last;
  const bikes=Object.keys(DEMO_BIKE).map(b=>[b,made.filter(p=>p.bike===b&&p.slot<=act).length]).filter(x=>x[1]);
  return '<button class="sback" data-c="backadmin">‹ Administracja</button><div class="sname" style="margin-top:26px">🧪 Zaproszenia testowe</div>'
   +'<div class="smail">Konta demo i zaproszenia do testów. Widzisz to tylko Ty (👑). Konta demo mają plakietkę <span class="nkdemo">DEMO</span> i nie da się na nie zalogować.</div>'
   +(er?'<p class="note" style="color:var(--bad)">Nie udało się wczytać: '+esc(er)+'</p>':'')
   +'<div class="stats admbar dmst">'+st(s&&s.test_wants||0,"zaproszeń testowych")+st(s&&s.test_private||0,"w tym prywatnych")+st(s&&s.demo_accounts||0,"kont demo")+'</div>'
   // 👥 konta demo
   +'<div class="ios"><div class="ios-gh">Konta demo</div><div class="ios-grp">'
   +demoStep("acc",demoAcc,1,30,"Liczba kont",made.length?"Utworzone: "+made.length+" · zaproszenia losują z "+act:"Nicki z puli 30, rowery na zmianę")
   +'<button type="button" class="ios-it ios-row dmact" data-dx="acc"'+dis+'><span class="ios-t">'+(demoAcc>made.length?'Utwórz brakujące ('+(demoAcc-made.length)+')':'Ustaw liczbę kont')+'</span></button>'
   +'</div>'+(bikes.length?'<div class="dmbikes">'+bikes.map(([b,n])=>'<span class="dmbk dm-'+b+'">'+uiIcon(b==="road"?"road":b==="trekking"?"bike":b)+' '+DEMO_BIKE[b]+' '+n+'</span>').join("")+'</div>':'')+'</div>'
   // 🎲 generator
   +'<div class="ios"><div class="ios-gh">Wygeneruj</div><div class="ios-grp">'
   +demoStep("n",demoF.n,1,60,"Liczba zaproszeń","Zwykle 20–30 na raz")
   +'<div class="ios-it dmcol"><span class="ios-t">Na ile dni do przodu<small>Od jutra</small></span><div class="seg" role="group" aria-label="Na ile dni">'
     +DEMO_DAYS.map(([d,l])=>'<button type="button" class="'+(demoF.days===d?'on':'')+'" aria-pressed="'+(demoF.days===d)+'" data-dx="days" data-dd="'+d+'">'+l+'</button>').join("")+'</div></div>'
   +'<div class="ios-it dmcol"><label class="ios-t" for="dmpriv">Jawne i prywatne<small id="dmprivt">jawne '+(100-demoF.priv)+'% · prywatne '+demoF.priv+'%</small></label>'
     +'<input id="dmpriv" type="range" min="0" max="100" step="10" value="'+demoF.priv+'"><small class="note">Prywatne dostają konta demo i ochotnicy ('+demoVol.size+').</small></div>'
   +'<div class="ios-it dmcol"><label class="ios-t" for="dmgrp">Prywatne dla grupy<small id="dmgrpt">'+demoF.grp+'% prywatnych — dla grupy demo autora</small></label>'
     +'<input id="dmgrp" type="range" min="0" max="100" step="10" value="'+demoF.grp+'"'+(grs.length?'':' disabled')+'><small class="note">'+(grs.length?'Dostają je członkowie grupy (też ochotnicy, którzy dołączyli).':'Najpierw załóż grupy demo (niżej).')+'</small></div>'
   +demoSw("routes","Trasy z biblioteki tras","Mapa i GPX przy części zaproszeń")
   +demoSw("ranges","Zakresy godzin","Część zaproszeń „do ustalenia”")
   +demoSw("answers","Dołączenia i odmowy kont demo","Żeby karty nie były puste")
   +demoSw("chan","Podsumowanie także na kanale","Domyślnie tylko do Ciebie na Telegram")
   +'</div><button type="button" class="b sbtn" data-dx="gen"'+(made.length&&!demoBusy?'':' disabled')+'>'+(demoBusy?'Pracuję…':'Wygeneruj '+demoF.n+' '+(demoF.n===1?'zaproszenie':demoF.n%10>=2&&demoF.n%10<=4&&(demoF.n%100<12||demoF.n%100>14)?'zaproszenia':'zaproszeń'))+'</button>'
   +(made.length?'':'<p class="note">Najpierw utwórz konta demo.</p>')
   +'<p class="note">Każde dostaje plakietkę 🧪 TEST, więc „Usuń wszystkie testowe” sprząta je jednym ruchem. Autor i dołączający nie mają innej jazdy ±3 h.</p></div>'
   // 👥 grupy demo
   +'<div class="ios"><div class="ios-gh">Grupy demo</div><div class="ios-grp">'
   +demoStep("grn",demoGrN,1,10,"Liczba nowych grup","Nazwy z puli 10 · limity jak u ludzi (3 założone, 15 przynależności)")
   +'<button type="button" class="ios-it ios-row dmact" data-dx="grp"'+(made.length>=2&&!demoBusy?'':' disabled')+'><span class="ios-t">Załóż '+demoGrN+' '+(demoGrN===1?'grupę':demoGrN<5?'grupy':'grup')+' demo</span></button>'
   +grs.map(g=>'<div class="ios-it"><span class="ios-ic" style="background:'+(typeof grCol==="function"?grCol(g):"#0a84ff")+'">'+uiIcon(g.icon||"users")+'</span><span class="ios-t">'+esc(g.name)
      +'<small>'+[g.members+' '+(g.members===1?'członek':'członków'),g.real?'prawdziwych: '+g.real:'',g.invited?'zaproszeni: '+g.invited:'',g.requested?'prośby: '+g.requested:'',g.visibility==="hidden"?'ukryta':'',g.join_mode==="open"?'wolne':'na prośbę'].filter(Boolean).join(' · ')+'</small></span></div>').join("")
   +'</div>'+(made.length<2?'<p class="note">Grupy zakładają konta demo — potrzebne co najmniej 2.</p>':'<p class="note">Ochotnicy dostają zaproszenia do grup. Grupy widzą na razie testerzy (przełącznik „Grupy”).</p>')+'</div>'
   // 🤖 odpowiedzi kont demo
   +'<div class="ios"><div class="ios-gh">Odpowiedzi kont demo</div><div class="ios-grp">'
   +'<div class="ios-it"><span class="ios-t">Odpowiadają same<small>Co 15 min: zaproszenia do grup i na rower, prośby do grup demo · po kilku minutach do ok. 4 h</small></span>'
     +'<button type="button" class="ios-sw'+(auto?' on':'')+'" role="switch" aria-checked="'+auto+'" aria-label="Konta demo odpowiadają same" data-dx="auto"'+dis+'></button></div>'
   +'<div class="ios-it"><span class="ios-t">Czeka na odpowiedź<small>'+(ld?'…':[pd.g_invites+' do grup',pd.g_requests+' próśb',pd.rides+' na rower'].join(' · '))+'</small></span></div>'
   +(tl?'<div class="ios-it"><span class="ios-t">Ostatnia tura<small>'+demoWhen(tl.at)+' · przyjęte: '+((tl.g_ok||0)+(tl.rq_ok||0)+(tl.ride_ok||0))+' · odmowy: '+((tl.g_no||0)+(tl.rq_no||0)+(tl.ride_no||0))+'</small></span></div>':'')
   +'<button type="button" class="ios-it ios-row dmact" data-dx="tick"'+(made.length&&!demoBusy?'':' disabled')+'><span class="ios-t">Odpowiedz teraz, bez czekania</span></button>'
   +'</div><p class="note">Po każdej turze, w której coś się stało — jedna wiadomość do Ciebie na Telegram.</p></div>'
   // 🧹 sprzątanie
   +gGrp("Sprzątanie",[gRow("#ff3b30","trash","Usuń wszystkie testowe zaproszenia","Konta demo zostają · potwierdzasz wpisując USUŃ",'','data-dx="testdel"'),
      gRow("#ff3b30","trash","Zamknij grupy demo","Do archiwum, razem z prawdziwymi członkami",grs.length?'<span class="ios-v">'+grs.length+'</span>':'','data-dx="grwipe"'+(grs.length?dis:' disabled')),
      gRow("#ff3b30","trash","Usuń konta demo","Razem z ich zaproszeniami, listami i ulubionymi",made.length?'<span class="ios-v">'+made.length+'</span>':'','data-dx="wipe"'+(made.length?dis:' disabled'))])
   // 👀 ekipa
   +(made.length?gGrp("Ekipa demo",made.map(p=>p.user_id&&nicks[p.user_id]?gRow(p.slot<=act?"#ff9f0a":"#8e8e93",p.bike==="road"?"road":p.bike==="trekking"?"bike":p.bike,nk(p.user_id),
       DEMO_BIKE[p.bike]+(p.slot<=act?'':' · nie losuje (poza liczbą kont)'),'','data-dx="user" data-du="'+esc(p.user_id)+'"'):'')):'')
   // 🙋 ochotnicy
   +gGrp("Ochotnicy",[...[...demoVol].filter(id=>nicks[id]).map(id=>gRow("#30d158","user",nk(id),"Dostaje prywatne zaproszenia od kont demo",'','data-dx="user" data-du="'+esc(id)+'"')),
      '<div class="ios-it"><span class="ios-t"><small>Ochotnika dodasz w karcie osoby → Administrator. Tylko za zgodą tej osoby.</small></span></div>'])
   // 🔒 później
   +'<div class="ios dmsoon"><div class="ios-gh">Wkrótce</div><div class="ios-grp">'
   +iosIt("#8e8e93","list","Posty kont demo na tablicy grupy","",uiIcon("lock"))+'</div></div>';
}

const demoWhen=t=>{const d=new Date(t);return isNaN(d)?"—":d.toLocaleString("pl-PL",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
async function demoRun(fn,args,okMsg){
  if(demoBusy)return;demoBusy=true;renderGear();
  try{const r=await sb.rpc(fn,args);if(r.error)throw r.error;demoBusy=false;await demoLoad();await syncNow();say(okMsg(r.data));}
  catch(e){demoBusy=false;demoErr(e)}
  await demoStatus();
}

$("gearpanel").addEventListener("click",async e=>{
  const b=e.target.closest("[data-dx]");if(!b||b.disabled||!session)return;
  const a=b.dataset.dx;
  if(a==="open"){if(!isKingReal())return;demoSt=null;gearView="demo";renderGear();demoLoad().then(demoStatus);return}
  if(!isKingReal())return;
  if(a==="vol"){const id=b.dataset.du,on=!demoVol.has(id);
    if(on&&!await askOk("Dodać "+(nicks[id]||"tę osobę")+" do ochotników Ekipy demo?\n\nBędzie dostawać prywatne zaproszenia testowe od kont demo (powiadomienia w aplikacji i na Telegramie). Rób to tylko za zgodą tej osoby.","Dodaj"))return;
    demoBusy=true;renderGear();
    try{const r=await sb.rpc("admin_demo_volunteer",{u:id,p_on:on});if(r.error)throw r.error;on?demoVol.add(id):demoVol.delete(id);say(on?"🙋 Dodano do ochotników":"Wypisano z ochotników")}catch(err){demoErr(err)}
    demoBusy=false;renderGear();return}
  if(a==="user"){userBack="demo";tkFrom=false;userId=b.dataset.du;gearView="user";renderGear();if(isAdmin&&typeof loadAdmInfo==="function"){delete admInfo[userId];loadAdmInfo(userId)}return}
  if(a==="acc-"||a==="acc+"){demoAcc=Math.max(1,Math.min(30,demoAcc+(a==="acc+"?1:-1)));renderGear();return}
  if(a==="grn-"||a==="grn+"){demoGrN=Math.max(1,Math.min(10,demoGrN+(a==="grn+"?1:-1)));renderGear();return}
  if(a==="grp"){await demoRun("admin_demo_groups",{p_count:demoGrN,p_volunteers:true},d=>d&&d.created?"👥 Założono grup demo: "+d.created+(d.invited?" · zaproszeni ochotnicy: "+d.invited:""):"Nie założono grup — konta demo są w limitach albo pula nazw się skończyła");
    if(typeof grReload==="function")grReload();return}
  if(a==="grwipe"){const n=(demoSt&&demoSt.groups||[]).length;
    if(!await askOk("Zamknąć "+n+" "+(n===1?"grupę":n<5?"grupy":"grup")+" demo?\n\nTrafią do archiwum — także prawdziwi członkowie z nich wypadną. Konta demo zostają, grupy możesz założyć od nowa.","Zamknij grupy",true))return;
    await demoRun("admin_demo_groups_wipe",{do_delete:true},d=>"🧹 Zamknięto grup demo: "+(+d||0));if(typeof grReload==="function")grReload();return}
  if(a==="auto"){const on=!(demoSt&&demoSt.auto!==false);await demoRun("admin_demo_auto",{p_on:on},()=>on?"🤖 Konta demo odpowiadają same":"Konta demo nie odpowiadają same");return}
  if(a==="tick"){await demoRun("admin_demo_tick",{p_force:true},d=>{d=d||{};const ok=(d.g_ok||0)+(d.rq_ok||0)+(d.ride_ok||0),no=(d.g_no||0)+(d.rq_no||0)+(d.ride_no||0);return ok+no?"🤖 Odpowiedzi: przyjęte "+ok+", odmowy "+no:"Nic nie czekało na odpowiedź"});
    if(typeof grReload==="function")grReload();return}
  if(a==="n-"||a==="n+"){demoF.n=Math.max(1,Math.min(60,demoF.n+(a==="n+"?1:-1)));renderGear();return}
  if(a==="days"){demoF.days=+b.dataset.dd;renderGear();return}
  if(a==="sw"){const k=b.dataset.dk;demoF[k]=!demoF[k];renderGear();return}
  if(a==="acc"){const made=(demoSt&&demoSt.pool||[]).filter(p=>p.user_id).length,n=demoAcc;
    await demoRun("admin_demo_accounts",{p_count:n,p_channel:false},d=>d&&d.created?"🧪 Utworzono "+d.created+" · generator losuje z "+n:"Generator losuje teraz z "+n+(n<made?" (pozostałe konta zostają)":""));return}
  if(a==="gen"){
    if(demoF.chan&&!await askOk("Wysłać podsumowanie także na kanał @PrzylesieGo?\n\nZobaczą je wszyscy na kanale, z dopiskiem, że to nie są prawdziwe jazdy.","Wyślij też na kanał"))return;
    await demoRun("admin_demo_generate",{p_count:demoF.n,p_days:demoF.days,p_private_pct:demoF.priv,p_routes:demoF.routes,p_ranges:demoF.ranges,p_answers:demoF.answers,p_channel:demoF.chan,p_group_pct:demoF.grp},
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
  if(e.target.id==="dmgrp"){demoF.grp=+e.target.value;const g=$("dmgrpt");if(g)g.textContent=demoF.grp+"% prywatnych — dla grupy demo autora";return}
  if(e.target.id!=="dmpriv")return;demoF.priv=+e.target.value;const t=$("dmprivt");if(t)t.textContent="jawne "+(100-demoF.priv)+"% · prywatne "+demoF.priv+"%"});
// start: aplikacja mogła już wystartować ze stanu telefonu, zanim ten plik się wczytał → doczytaj konta demo od razu
if(typeof session!=="undefined"&&session)demoLoad().then(()=>{if(demoIds.size)refreshUi()}).catch(()=>{});
