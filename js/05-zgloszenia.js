/* ---------- 💬 Oceń aplikację / zgłoś błąd / pomysł + wiadomości od admina (KROK 26) ---------- */
let fbOk=false,fbList=[],fbDone={},fbMsgs={},fbId="",fbBack="fb",fbAdmFilter="new",fbTo="",fbBusy=false;
const fbf={kind:"bug",rating:0,text:"",dev:true};let fbReplyTxt="",fbMsgTxt="";
// 🔢 numeracja wydań: 0.x.y w czasie BETY (1.0 = publiczne wydanie); x — paczka nowości, y — poprawki.
// Nowe wydanie: dopisz pozycję na początku APP_REL (wersja, data, nowości) — w ❓ Pomocy pokaże się „Co nowego” i kropka przy ❓.
const APP_REL=[
  {v:"0.9",d:"16.11.2026",items:[
    ["book","<b>Baza tras</b> (⚙️ → Baza tras): trasy z zaproszeń, sortowanie (najczęściej, najlepsze, malownicze, najtrudniejsze, najbliżej…), mapa z wiatrem."],
    ["star","<b>Oceny tras</b>: gwiazdki, malownicza, trudność, ruch aut, plakietki (las, kawa, błoto…) i komentarze — też w „Jak poszło?”."],
    ["cloudsun","<b>Przed jazdą</b>: wybierz dzień i godzinę — pogoda godzina po godzinie, wiatr na trasie, zachód słońca, „↺ jedź w drugą stronę”."],
    ["backpack","<b>Co zabrać</b> — lista dopasowana do pogody, do odhaczania (kask zawsze na górze)."],
    ["pin","<b>Miejscowości na trasie</b> — rozwijana lista z kilometrem od startu."],
    ["gear","Nowy, czytelniejszy wygląd ⚙️ Ustawień i paneli (karta profilu, grupy jak w iPhonie)."],
    ["bell","🔔 <b>Powiadomienia</b>: zwijane sekcje z licznikami, „✨ Dokończ start”, powiadomienie, gdy ktoś wróci do jazdy."],
    ["flag","Imprezy: przewyższenie, limit czasu, kolejność dystansów, „start za N dni”, filtr <b>📍 W okolicy</b>."],
    ["phone","Pomoc z instrukcją instalacji dla Twojej przeglądarki; zielona kropka przy nicku = osoba jest teraz w aplikacji."]]}
];
const APP_VER=APP_REL[0].v;
const relNew=()=>{try{return localStorage.getItem("seenVer")!==APP_VER}catch(e){return false}};
function relMark(){try{localStorage.setItem("seenVer",APP_VER)}catch(e){}const b=$("helpbtn");if(b)b.classList.remove("newdot")}
const FB_KIND={bug:"🐞 Błąd",idea:"💡 Pomysł",rating:"⭐ Ocena",msg:"✉️ Wiadomość",tester:"🧪 Chce testować"};
const FB_ST={new:"nowe",accepted:"przyjęte",done:"zrobione",rejected:"odrzucone"};
const fbMineUnread=()=>fbList.filter(f=>f.user_id===uid&&f.user_unread);
const fbAdmUnread=()=>isAdmin?fbList.filter(f=>f.user_id!==uid&&f.admin_unread):[];
const fbBulb=id=>(fbDone[id]||0)>=3;
const starsHtml=(v,big)=>'<div class="stars'+(big?' big':'')+'" data-v="'+(v||0)+'" role="slider" aria-label="Ocena od 1 do 5" aria-valuemin="1" aria-valuemax="5" aria-valuenow="'+(v||0)+'">'+[1,2,3,4,5].map(i=>'<i class="'+(i<=v?'on':'')+'">★</i>').join("")+'</div>';
const starsTxt=v=>'<span class="fbst">'+"★".repeat(v)+'<s>'+"★".repeat(5-v)+'</s></span>';
function fbDevice(){
  const s=window.screen||{},sa=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
  return (navigator.userAgent||"").replace(/\s+/g," ").slice(0,220)+" · "+(s.width||"?")+"×"+(s.height||"?")+(sa?" · z ikony":" · przeglądarka")+" · wersja "+APP_VER;
}
const fbAgo=ts=>{const d=new Date(ts);return dayDiff(d)===0?"dziś "+hhmm(d):relDay(d)+" "+hhmm(d)};
function fbRow(f,adm){
  const un=adm?f.admin_unread:f.user_unread,snip=f.kind==="tester"?esc(f.body||"Prośba o zostanie testerem"):f.kind==="rating"?starsTxt(f.rating)+(f.body?" "+esc(f.body.slice(0,60)):""):esc((f.body||"").slice(0,90));
  return '<button type="button" class="fbrow'+(un?' new':'')+'" data-fb="'+esc(f.id)+'"><span class="fbk">'+FB_KIND[f.kind]+'</span>'
   +(f.kind!=="msg"?'<span class="fbs s-'+f.status+'">'+FB_ST[f.status]+'</span>':'')+(adm?' '+nk(f.user_id):'')
   +'<span class="fbsn">'+snip+'</span><span class="note">'+esc(fbAgo(f.updated_at))+'</span>'+(un?'<span class="dot"></span>':'')+'</button>';
}
function fbFormHtml(){
  const k=fbf.kind,ph=k==="bug"?"Co nie działa? Gdzie to się stało i co klikałeś?":k==="idea"?"Co by się przydało? Opisz pomysł.":fbf.rating&&fbf.rating<=3?"Co poprawić? (przy 1–3 ★ obowiązkowo)":"Dodaj uwagi (opcjonalnie)";
  return '<div class="seg" id="fbkind">'+[["bug","🐞 Błąd"],["idea","💡 Pomysł"],["rating","⭐ Ocena"]].map(([x,t])=>'<button type="button" data-fk="'+x+'" class="'+(k===x?'on':'')+'">'+t+'</button>').join("")+'</div>'
   +(k==="rating"?'<div class="fbstars">'+starsHtml(fbf.rating,true)+'<div class="note">Przesuń palcem po gwiazdkach</div></div>':'')
   +'<textarea id="fbtext" rows="4" maxlength="2000" placeholder="'+esc(ph)+'">'+esc(fbf.text)+'</textarea>'
   +'<label class="fbdev"><input type="checkbox" id="fbdev"'+(fbf.dev?' checked':'')+'> Dołącz info o telefonie (model, przeglądarka) — pomaga przy błędach</label>'
   +'<div class="note" id="fbinfo" style="color:var(--bad)"></div>'
   +'<button class="b sbtn" data-c="fbsend"'+(fbBusy?' disabled':'')+'>Wyślij</button>'
   +'<p class="note">Zgłoszenie trafia do administratora pod Twoim nickiem — może odpisać (zobaczysz pod 🔔). Za 3 zrealizowane zgłoszenia dostajesz 💡 przy nicku.</p>';
}
/* 🧪 prośba o zostanie testerem (karta na górze Ustawień) */
function testerCardHtml(){
  if(!session||!fbOk||!testerOk||meTester())return "";
  const r=fbList.find(f=>f.user_id===uid&&f.kind==="tester");
  if(r&&(r.status==="new"||r.status==="accepted"))return '<div class="tcard"><b>🧪 Zgłosiłeś się na testera</b><div class="note">Dzięki! Liczba miejsc jest ograniczona — odezwiemy się, gdy zwolni się miejsce w grupie testerów.</div></div>';
  if(r&&r.status==="rejected")return "";
  return '<div class="tcard"><b>🧪 Zostań testerem</b><div class="note">Testerzy widzą nowe funkcje przed wszystkimi i pomagają je dopracować. Liczba miejsc jest ograniczona — jeśli grupa będzie pełna, możemy się nie odezwać, ale Twoje zgłoszenie zostanie na liście.</div>'
   +'<button class="b sbtn" data-c="testerreq">Chcę testować</button></div>';
}
async function testerReq(b){
  if(b)b.disabled=true;
  try{const r=await sb.rpc("fb_send",{k:"tester",r:null,b:null,dev:fbDevice()});if(r.error)throw r.error;await syncNow();say("🧪 Zgłoszenie wysłane — dzięki! Odezwiemy się, gdy będzie miejsce.")}
  catch(e){if(b)b.disabled=false;say(fbErr(e))}
}
async function testerGrant(f){
  try{const r=await sb.from("testers").insert({user_id:f.user_id,added_by:uid});if(r.error&&r.error.code!=="23505")throw r.error;
    const s=await sb.rpc("fb_status",{f:f.id,s:"done"});if(s.error)throw s.error;await syncNow();say("🧪 Nadano prawa testera: "+nickOf(f.user_id))}
  catch(e){say("Nie udało się: "+(e&&e.message?e.message:"błąd"))}
}
function fbHubHtml(){
  const mine=fbList.filter(f=>f.user_id===uid),done=fbDone[uid]||0;
  return '<button class="sback" data-c="back">‹ Ustawienia</button><div class="sname" style="margin-top:26px">💬 Oceń / zgłoś błąd / pomysł</div>'
   +(done?'<div class="smail">💡 Zrealizowane Twoje zgłoszenia: <b>'+done+'</b>'+(done>=3?' — masz żarówkę przy nicku!':' (żarówka od 3)')+'</div>':'<div class="smail">Pomóż rozwijać PrzylesieGo!</div>')
   +'<div class="sleft">'+fbFormHtml()
   +(mine.length?'<h3>Twoje zgłoszenia i wiadomości ('+mine.length+')</h3>'+mine.map(f=>fbRow(f,false)).join(""):'')+'</div>';
}
function fbAdminHtml(){
  const todo=f=>(f.kind!=="msg"&&(f.status==="new"||f.status==="accepted"))||f.admin_unread;
  const L=fbList.filter(f=>fbAdmFilter==="all"||todo(f)),nNew=fbList.filter(todo).length;
  const rs=fbList.filter(f=>f.kind==="rating");
  const avg=rs.length?(rs.reduce((a,f)=>a+f.rating,0)/rs.length).toFixed(1).replace(".",","):null;
  return '<button class="sback" data-c="backadmin">‹ Administracja</button><div class="sname" style="margin-top:26px">💬 Zgłoszenia</div>'
   +(avg?'<div class="smail">Średnia ocena: '+starsTxt(Math.round(+avg.replace(",",".")))+' <b>'+avg+'</b> ('+rs.length+')</div>':'<div class="smail">Zgłoszenia, oceny i wiadomości.</div>')
   +'<div class="seg" id="fbfilt">'+[["new","Do zrobienia ("+nNew+")"],["all","Wszystkie ("+fbList.length+")"]].map(([k,t])=>'<button type="button" data-ff="'+k+'" class="'+(fbAdmFilter===k?'on':'')+'">'+t+'</button>').join("")+'</div>'
   +'<div class="sleft">'+(L.length?L.map(f=>fbRow(f,true)).join(""):'<div class="note" style="margin-top:12px">Pusto 🎉</div>')+'</div>'
   +'<p class="note">✉️ Wiadomość do dowolnej osoby: kliknij jej nick → „✉️ Napisz wiadomość”.</p>';
}
// skrót opisu telefonu: „Safari · Mac · 2880×1620”
function devShort(d){
  const u=String(d||""),br=/Edg/.test(u)?"Edge":/OPR|Opera/.test(u)?"Opera":/Firefox|FxiOS/.test(u)?"Firefox":/Chrome|CriOS/.test(u)?"Chrome":/Safari/.test(u)?"Safari":"",
    os=/iPhone/.test(u)?"iPhone":/iPad/.test(u)?"iPad":/Android/.test(u)?"Android":/Mac OS X|Macintosh/.test(u)?"Mac":/Windows/.test(u)?"Windows":/Linux/.test(u)?"Linux":"",
    sc=(u.match(/\d{3,5}×\d{3,5}/)||[""])[0],ic=/z ikony/.test(u)?"z ikony":"";
  return [br,os,sc,ic].filter(Boolean).join(" · ")||u.slice(0,40);
}
// przyciski akcji admina (wariant B): tylko te, które mają sens przy danym stanie
function fbActHtml(f){
  const st=f.status,t=f.kind==="tester",open=st==="new"||st==="accepted";let h="";
  if(t&&testerIds.has(f.user_id))h+='<div class="note" style="margin-top:4px">🧪 Już jest testerem.</div>';
  if(open){
    if(t){if(isSuper(uid)&&!testerIds.has(f.user_id))h+='<button class="b sbtn" data-c="fbgrant">🧪 Nadaj prawa testera</button>'}
    else h+='<button class="b sbtn" data-fs2="done">✓ '+(f.kind==="rating"?'Zamknij — przeczytane':'Oznacz jako zrobione')+'</button>';
    h+='<div class="fbact">'+(st==="new"?'<button class="b fbok" data-fs2="accepted">Przyjmij</button>':'')+'<button class="b fbno" data-fs2="rejected">Odrzuć</button></div>'
     +'<p class="note">'+(t?(st==="new"?'„Przyjmij” = odezwiemy się · ':'')+'„Odrzuć” = komplet testerów.':(st==="new"?'„Przyjmij” = zajmiesz się tym · ':'')+'„Odrzuć” = nie będzie zmian. Użytkownik dostanie wiadomość.')+'</p>';
  }else h+='<button class="b fbre" data-fs2="new">↺ Otwórz ponownie</button>';
  return '<div class="fbacts">'+h+'</div>';
}
function fbThreadHtml(){
  const f=fbList.find(x=>x.id===fbId);
  const back='<button class="sback" data-c="fbback">‹ '+(fbBack==="fbadmin"?'Zgłoszenia':fbBack==="bell"?'Zamknij':'Zgłoszenia')+'</button>';
  if(!f)return back+'<div class="sname" style="margin-top:26px">Nie znaleziono</div>';
  const adm=isAdmin&&f.user_id!==uid,M=fbMsgs[f.id];
  const first=f.kind==="msg"?{sender:f.started_by,body:f.body,created_at:f.created_at}:{sender:f.user_id,body:(f.kind==="rating"?starsTxt(f.rating)+(f.body?"<br>":""):"")+(f.kind==="tester"&&!f.body?"Chcę zostać testerem 🧪":esc(f.body||"")),created_at:f.created_at,html:true};
  const bub=m=>{const mine=m.sender===uid;return '<div class="fbm'+(mine?' me':'')+'"><div class="fbmh">'+(m.sender?nk(m.sender):'<span class="note">usunięte konto</span>')+' <span class="note">'+esc(fbAgo(m.created_at))+'</span></div><div class="fbmb">'+(m.html?m.body:esc(m.body))+'</div></div>'};
  return back+'<div class="sname" style="margin-top:26px">'+FB_KIND[f.kind]+'</div>'
   +'<div class="smail">'+(adm?'od '+nk(f.user_id)+' · ':f.kind==="msg"?'od administratora · ':'')+(f.kind!=="msg"?'<span class="fbs s-'+f.status+'">'+FB_ST[f.status]+'</span>':'')+'</div>'
   +'<div class="sleft fbthread">'+bub(first)+(M?M.map(bub).join(""):'<div class="note">Ładuję…</div>')
   +(adm&&f.device?'<details class="fbdv"><summary>📱 '+esc(devShort(f.device))+'</summary><div>'+esc(f.device)+'</div></details>':'')
   +'<textarea id="fbreply" rows="3" maxlength="1000" placeholder="'+(adm?'Odpowiedz '+esc(nickOf(f.user_id)):'Odpisz administratorowi')+'…">'+esc(fbReplyTxt)+'</textarea>'
   +'<div class="note" id="fbrinfo" style="color:var(--bad)"></div>'
   +'<button class="b sbtn'+(adm&&f.kind!=="msg"?' sgray':'')+'" data-c="fbreply"'+(fbBusy?' disabled':'')+'>Wyślij odpowiedź</button>'
   +'<p class="note">'+(adm?'Odpowiedź zobaczy pod 🔔 (i na Telegramie, jeśli połączył bota).':'Odpowiedź trafi do administratora.')+'</p>'
   +(adm&&f.kind!=="msg"?fbActHtml(f):'')+'</div>';
}
function fbMsgHtml(){
  return '<button class="sback" data-c="userback2">‹ '+esc(nickOf(fbTo))+'</button><div class="sname" style="margin-top:26px">✉️ Wiadomość do '+nk(fbTo)+'</div>'
   +'<div class="sleft"><textarea id="fbmsgtext" rows="5" maxlength="2000" placeholder="Treść wiadomości…">'+esc(fbMsgTxt)+'</textarea>'
   +'<div class="note" id="fbminfo" style="color:var(--bad)"></div>'
   +'<button class="b sbtn" data-c="fbmsgsend"'+(fbBusy?' disabled':'')+'>Wyślij wiadomość</button>'
   +'<p class="note">Odbiorca zobaczy ją w aplikacji pod 🔔 (i na Telegramie, jeśli połączył bota) i może odpisać.</p></div>';
}
async function fbLoadMsgs(id){
  const r=await sb.from("feedback_msgs").select("id,sender,body,created_at").eq("feedback_id",id).order("created_at").limit(500);
  fbMsgs[id]=r.error?[]:r.data||[];
}
async function fbOpen(id,back){
  fbId=id;fbBack=back||fbBack;fbReplyTxt="";gearOpen=true;gearView="fbt";renderGear();
  const f=fbList.find(x=>x.id===id);
  await fbLoadMsgs(id);
  if(f&&((f.user_id===uid&&f.user_unread)||(isAdmin&&f.user_id!==uid&&f.admin_unread))){
    if(f.user_id===uid)f.user_unread=false;else f.admin_unread=false;
    try{await sb.rpc("fb_read",{f:id})}catch(e){}
    renderBell();
  }
  if(gearView==="fbt"&&fbId===id)renderGear();
}
const fbErr=e=>{const m=e&&e.message||"";return /FB_DUP/.test(m)?"Twoja prośba już czeka — odezwiemy się.":/FB_TESTER/.test(m)?"Już jesteś testerem 🧪":/FB_LIMIT/.test(m)?"Dzisiejszy limit wyczerpany — spróbuj jutro.":/check/.test(m)?"Za krótki tekst (min. 3 znaki).":"Nie udało się: "+(m||"błąd")};
async function fbSend(){
  const t=fbf.text.trim(),k=fbf.kind,inf=$("fbinfo");
  if(k==="rating"&&!fbf.rating){inf.textContent="Zaznacz gwiazdki — przesuń palcem.";return}
  if(k==="rating"&&fbf.rating<=3&&t.length<3){inf.textContent="Napisz, co poprawić (przy 1–3 ★).";return}
  if(k!=="rating"&&t.length<3){inf.textContent="Opisz zgłoszenie (min. 3 znaki).";return}
  fbBusy=true;renderGear();
  try{const r=await sb.rpc("fb_send",{k,r:k==="rating"?fbf.rating:null,b:t||null,dev:fbf.dev?fbDevice():null});if(r.error)throw r.error;
    fbf.text="";fbf.rating=0;fbBusy=false;await syncNow();say(k==="rating"?"⭐ Dzięki za ocenę!":"💬 Wysłane — dzięki! Odpowiedź zobaczysz pod 🔔.")}
  catch(e){fbBusy=false;renderGear();const i=$("fbinfo");if(i)i.textContent=fbErr(e)}
}
async function fbReply(){
  const t=fbReplyTxt.trim();if(t.length<1){$("fbrinfo").textContent="Wpisz odpowiedź.";return}
  fbBusy=true;renderGear();
  try{const r=await sb.rpc("fb_reply",{f:fbId,b:t});if(r.error)throw r.error;fbReplyTxt="";fbBusy=false;await fbLoadMsgs(fbId);await syncNow();say("Wysłano ✔")}
  catch(e){fbBusy=false;renderGear();const i=$("fbrinfo");if(i)i.textContent=fbErr(e)}
}
async function fbMsgSend(){
  const t=fbMsgTxt.trim();if(t.length<3){$("fbminfo").textContent="Wpisz wiadomość (min. 3 znaki).";return}
  fbBusy=true;renderGear();
  try{const r=await sb.rpc("fb_admin_msg",{u:fbTo,b:t});if(r.error)throw r.error;fbMsgTxt="";fbBusy=false;await syncNow();say("✉️ Wysłano do "+nickOf(fbTo));fbOpen(r.data,"fbadmin")}
  catch(e){fbBusy=false;renderGear();const i=$("fbminfo");if(i)i.textContent=fbErr(e)}
}
/* gwiazdki: przesuwanie palcem / myszą zapala kolejne */
function starsSet(el,v){
  v=Math.max(1,Math.min(5,v));if(+el.dataset.v===v)return;
  el.dataset.v=v;el.setAttribute("aria-valuenow",v);[...el.children].forEach((s,i)=>s.classList.toggle("on",i<v));
  try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}
  if(el.closest("#ratesheet"))rateV=v;else{const need=fbf.rating<=3!==(v<=3)||!fbf.rating;fbf.rating=v;const ta=$("fbtext");if(ta&&need)ta.placeholder=v<=3?"Co poprawić? (przy 1–3 ★ obowiązkowo)":"Dodaj uwagi (opcjonalnie)"}
  const rt=$("ratetxt");if(rt&&el.closest("#ratesheet"))rt.placeholder=v<=3?"Co poprawić? (przy 1–3 ★ obowiązkowo)":"Dodaj uwagi (opcjonalnie)";
}
let starDrag=null;
const starAt=(el,x)=>{const r=el.getBoundingClientRect();return Math.ceil((x-r.left)/r.width*5)};
document.addEventListener("pointerdown",e=>{const el=e.target.closest(".stars");if(!el)return;e.preventDefault();starDrag=el;starsSet(el,starAt(el,e.clientX))});
document.addEventListener("pointermove",e=>{if(starDrag)starsSet(starDrag,starAt(starDrag,e.clientX))});
document.addEventListener("pointerup",()=>{starDrag=null});
document.addEventListener("pointercancel",()=>{starDrag=null});
/* okienko „Oceń aplikację” — samo co jakiś czas (od 7 dni po założeniu konta, nie częściej niż co 60 dni po ocenie) */
let rateV=0;
function rateHtml(){
  return '<div class="sheetbox popbox" role="dialog" aria-modal="true" aria-label="Oceń aplikację"><button class="sclose" data-r="close" aria-label="Zamknij">✕</button>'
   +'<span class="ptag">⭐ OCEŃ APLIKACJĘ</span><div class="ph">Jak Ci się podoba PrzylesieGo?</div>'
   +'<div class="fbstars" style="margin-top:14px">'+starsHtml(rateV,true)+'<div class="note">Przesuń palcem po gwiazdkach</div></div>'
   +'<textarea id="ratetxt" rows="3" maxlength="2000" placeholder="Dodaj uwagi (opcjonalnie)"></textarea>'
   +'<div class="note" id="rateinfo" style="color:var(--bad)"></div>'
   +'<button type="button" class="b big" data-r="send">Wyślij ocenę</button>'
   +'<div class="pbtns"><button type="button" class="b w" data-r="later">Przypomnij później</button></div>'
   +'<div class="ptg">Ocena trafia do administratora pod Twoim nickiem. Błąd albo pomysł zgłosisz też w ⚙️ Ustawieniach.</div></div>';
}
function openRate(){rateV=0;const p=$("ratesheet");p.innerHTML=rateHtml();p.classList.remove("hide")}
function closeRate(days){const p=$("ratesheet");p.classList.add("hide");p.innerHTML="";if(days){try{localStorage.setItem("rateSnooze",String(Date.now()+days*864e5))}catch(e){}}}
$("ratesheet").addEventListener("click",async e=>{
  if(e.target===$("ratesheet")){closeRate(3);return}
  const b=e.target.closest("[data-r]");if(!b)return;
  const r=b.dataset.r;
  if(r==="close"){closeRate(30);return}
  if(r==="later"){closeRate(3);say("OK — przypomnę za kilka dni.");return}
  const t=($("ratetxt").value||"").trim(),inf=$("rateinfo");
  if(!rateV){inf.textContent="Zaznacz gwiazdki — przesuń palcem.";return}
  if(rateV<=3&&t.length<3){inf.textContent="Napisz, co poprawić (przy 1–3 ★).";return}
  b.disabled=true;
  try{const x=await sb.rpc("fb_send",{k:"rating",r:rateV,b:t||null,dev:fbDevice()});if(x.error)throw x.error;closeRate(0);await syncNow();say("⭐ Dzięki za ocenę!")}
  catch(err){b.disabled=false;inf.textContent=fbErr(err)}
});
const anySheetOpen=()=>[...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide"));
function maybeFb(){
  if(!session||!fbOk||needProfile()||pwMode||anySheetOpen())return;
  // nieprzeczytana wiadomość / odpowiedź od admina — raz na wejście otwórz wątek
  const un=fbMineUnread()[0];
  let seen=[];try{seen=JSON.parse(sessionStorage.getItem("fbShown")||"[]")}catch(e){}
  if(un&&!seen.includes(un.id+un.updated_at)){seen.push(un.id+un.updated_at);try{sessionStorage.setItem("fbShown",JSON.stringify(seen))}catch(e){}fbOpen(un.id,"bell");return}
  const j=joinedAt[uid];if(!j||Date.now()-new Date(j).getTime()<7*864e5)return;
  const last=fbList.filter(f=>f.user_id===uid&&f.kind==="rating").reduce((a,f)=>Math.max(a,new Date(f.created_at).getTime()),0);
  if(last&&Date.now()-last<60*864e5)return;
  let sn=0;try{sn=+localStorage.getItem("rateSnooze")||0;if(sessionStorage.getItem("rateShown"))return;sessionStorage.setItem("rateShown","1")}catch(e){}
  if(Date.now()<sn)return;
  openRate();
}
function renderGear(){
  const p=$("gearpanel");
  if(!gearOpen){p.classList.add("hide");gearView="main";return}
  p.classList.remove("hide");
  if((gearView==="admin"||gearView==="unick"||gearView==="colors"||gearView==="stats"||gearView==="flags"||gearView==="testdel")&&!(session&&isAdmin))gearView="main";
  if(gearView==="flags"&&!isSuper(uid))gearView="admin";
  if(gearView==="unick"&&!nicks[unickId])gearView="admin";
  const keepSel=$("adminsel")?$("adminsel").value:"";
  const keepCol=gearView==="colors"&&$("colK")?colVals():null;
  const keepNickSex=gearView==="nick";
  const keepAdmq=document.activeElement&&document.activeElement.id==="admq"?document.activeElement.selectionStart:null;
  const keepUnick=gearView==="unick"&&$("gunick")?{v:$("gunick").value,i:$("gunickinfo").textContent}:null;
  const keepConf=gearView==="confdel"&&$("gconf")?$("gconf").value:null;
  const keepDel=gearView==="del"&&$("gdel")?{v:$("gdel").value,i:$("gdelinfo").textContent}:null;
  const keepNick=gearView==="nick"&&$("gnick")?{v:$("gnick").value,i:$("gnickinfo").textContent}:null;
  const keepPw=gearView==="pwd"&&$("gpw0")?{v:["gpw0","gpw1","gpw2"].map(i=>[$(i).value,$(i).type]),i:$("gpwinfo").textContent,f:document.activeElement&&document.activeElement.id}:null;   // odświeżanie co minutę nie kasuje wpisanych haseł
  let body;
  if(gearView==="admin"){body=adminHtml();if(tgLinks===null&&!tgLoading){tgLoading=true;loadTgLinks().then(()=>{if(gearView==="admin")renderGear()})}}
  else if(gearView==="unick")body=unickHtml();
  else if(gearView==="colors")body=colorsHtml();
  else if(gearView==="stats")body=adminStatsHtml();
  else if(gearView==="flags")body=flagsHtml();
  else if(gearView==="testdel"&&isSuper(uid))body=testDelHtml();
  else if(gearView==="favs"&&session)body=favsHtml();
  else if(gearView==="tg"&&tgOn())body=tgHtml();
  else if(gearView==="user"&&session&&nicks[userId])body=userHtml();
  else if(gearView==="online"&&session)body=onlineHtml();
  else if(gearView==="allw"&&session&&isSuper(uid))body=allWantsHtml();
  else if(gearView==="karch"&&session&&isSuper(uid))body=kArchHtml();
  else if(gearView==="places"&&session&&isAdmin)body=placesHtml();
  else if(gearView==="moddel"&&session&&isSuper(uid)&&modDelId)body=modDelHtml();
  else if(gearView==="confdel"&&session&&delReq)body=confDelHtml();
  else if(gearView==="fb"&&session&&fbOk)body=fbHubHtml();
  else if(gearView==="fbt"&&session&&fbOk)body=fbThreadHtml();
  else if(gearView==="fbadmin"&&session&&isAdmin&&fbOk)body=fbAdminHtml();
  else if(gearView==="fbmsg"&&session&&isAdmin&&nicks[fbTo])body=fbMsgHtml();
  else if(gearView==="nick"&&session)body=nickHtml();
  else if(gearView==="pwd"&&session)body=pwdHtml();
  else if(gearView==="del"&&session)body=delHtml();
  else if(gearView==="inst")body=instHtml();
  // ⚙️ góra w stylu grup iPhone'a + wyróżniona „Baza tras” (wariant B, decyzja właściciela 2026-11-16 15:11)
  else body=session
    ?profCardHtml()+rbHeroHtml()+testerCardHtml()
     +gGrp("Ludzie i okolica",[favOk?gRow("#ffcc00","starf","Ulubieni","Zawsze na górze list",favs.size?'<span class="ios-v">'+favs.size+'</span>':'','data-c="favs"'):"",
        (evGeoOk&&tabOk(3))||rbOk?gRow("#ff9f0a","pin","Moja miejscowość",rbOk&&!(evGeoOk&&tabOk(3))?"Odległość do tras":"Odległość do imprez i tras",'<span class="ios-v">'+(homeGet()?esc(homeGet().name):'Ustaw')+'</span>','data-home="1"'):""])
     +gGrp("Powiadomienia",[tgOn()?gRow("#0a84ff","send","Telegram"+betaTag("telegram_dm"),"Powiadomienia prosto na telefon",tgLink?'<span class="ios-v ok">'+uiIcon("check")+'Połączony</span>':'<span class="ios-v">Połącz</span>','data-c="tg"'):"",
        gRow("#0a84ff","mega","Kanał @PrzylesieGo","Nowe jazdy dla wszystkich","",'href="https://t.me/PrzylesieGo" target="_blank" rel="noopener"',"a")])
     +gGrp("Pomoc i opinie",[gRow("#30d158","help","Pomoc — co potrafi aplikacja","Wersja "+esc(APP_VER),relNew()?'<span class="ios-bdg">Nowości</span>':'','data-c="help"'),
        fbOk?gRow("#bf5af2","msg","Oceń aplikację / zgłoś błąd","Błąd, pomysł albo ocena — odpisujemy",fbMineUnread().length?'<span class="ios-bdg">'+fbMineUnread().length+'</span>':'','data-c="fb"'):"",
        isStandalone()?"":gRow("#636366","phone","Zainstaluj aplikację","Ikona na ekranie telefonu","",'data-c="inst"')])
     +(isKingReal()?gGrp("👑 Podgląd aplikacji",[
        gRow("#8e8e93","user","Jak widzi gość","Nowa karta bez logowania",'','data-c="pv" data-pv="guest"'),
        gRow("#0a84ff","users","Jak widzi użytkownik","Bez funkcji testowych i bez uprawnień admina",pv==="user"?'<span class="ios-v ok">'+uiIcon("check")+'Teraz</span>':'','data-c="pv" data-pv="user"'),
        gRow("#bf5af2","flask","Jak widzi tester","Z funkcjami testowymi (🧪 BETA), bez uprawnień admina",pv==="tester"?'<span class="ios-v ok">'+uiIcon("check")+'Teraz</span>':'','data-c="pv" data-pv="tester"')]):'')
     +(isAdmin?gGrp("Administracja",[gRow("#8e8e93","shield","Administracja","Użytkownicy, zgłoszenia, funkcje testowe",fbAdmUnread().length?'<span class="ios-bdg">'+fbAdmUnread().length+'</span>':'','data-c="admin"')]):'')
     +setGroupsHtml(false)
     +'<div class="ios-grp" style="margin-top:22px"><button type="button" class="ios-it ios-row ios-out" data-c="out">Wyloguj</button></div>'
     +'<button class="sdanger" data-c="del">Usuń konto…</button>'
    :'<div class="sname" style="margin-top:28px">Przeglądasz jako gość</div><div class="smail">Zaloguj się, żeby zapraszać na rower i dołączać do jazd.</div>'
     +'<button class="b sbtn" data-c="login">Zaloguj się / załóż konto</button>'
     +gGrp("Pomoc",[gRow("#30d158","help","Pomoc — co potrafi aplikacja","Wersja "+esc(APP_VER),relNew()?'<span class="ios-bdg">Nowości</span>':'','data-c="help"'),
        gRow("#0a84ff","mega","Kanał @PrzylesieGo","Nowe jazdy dla wszystkich","",'href="https://t.me/PrzylesieGo" target="_blank" rel="noopener"',"a"),
        isStandalone()?"":gRow("#636366","phone","Zainstaluj aplikację","Ikona na ekranie telefonu","",'data-c="inst"')])
     +setGroupsHtml(true);
  p.innerHTML='<div class="sheetbox"><button class="sclose" data-c="close" aria-label="Zamknij">✕</button>'+body+'</div>';
  const s=$("adminsel");
  if(s&&keepSel&&[...s.options].some(o=>o.value===keepSel))s.value=keepSel;
  if(keepCol&&$("colK")){["K","M"].forEach(g=>{$("col"+g).value=keepCol["c"+g];$("nob"+g).checked=keepCol["b"+g]==="none";if(keepCol["b"+g]!=="none")$("bg"+g).value=keepCol["b"+g]})}
  if(gearView==="colors")colorsPreview();
  if(keepUnick&&$("gunick")){$("gunick").value=keepUnick.v;$("gunickinfo").textContent=keepUnick.i}
  if(keepConf!=null&&$("gconf"))$("gconf").value=keepConf;
  if(keepDel&&$("gdel")){$("gdel").value=keepDel.v;$("gdelinfo").textContent=keepDel.i}
  if(keepNick&&$("gnick")){$("gnick").value=keepNick.v;$("gnickinfo").textContent=keepNick.i}
  if(keepPw&&$("gpw0")){["gpw0","gpw1","gpw2"].forEach((i,k)=>{$(i).value=keepPw.v[k][0];$(i).type=keepPw.v[k][1];const eb=document.querySelector('[data-eye="'+i+'"]');if(eb)eb.innerHTML=uiIcon(keepPw.v[k][1]==="text"?"eyeoff":"eye")});$("gpwinfo").textContent=keepPw.i;if(keepPw.f&&$(keepPw.f))$(keepPw.f).focus()}
  if($("admq")){admFilter();if(keepAdmq!=null){const q=$("admq");q.focus();try{q.setSelectionRange(keepAdmq,keepAdmq)}catch(e){}}}
}
function tgHtml(){
  const head='<button class="sback" data-c="back">‹ Ustawienia</button><div class="sname" style="margin-top:26px">🔔 Telegram'+betaTag("telegram_dm")+'</div>';
  const what='<ul><li>ktoś Cię zaprosi na rower,</li><li>zmieni albo ustali godzinę,</li><li>ktoś dołączy do Twojego zaproszenia albo zrezygnuje,</li><li>za godzinę jedziesz (przypomnienie — też na wieczorynki).</li></ul>';
  if(tgLink)return head+'<div class="smail"><span class="tgok">✅ Połączono'+(tgLink.tg_name?' · '+esc(tgLink.tg_name):'')+'</span></div>'
    +'<div class="sleft"><div class="note" style="font-size:15px">Bot <b>@PrzylesieGo_bot</b> napisze do Ciebie, gdy:</div>'+what+'</div>'
    +'<div class="ios-grp" style="margin-top:14px">'+gRow("#0a84ff","send","Otwórz rozmowę z botem","@PrzylesieGo_bot","",'href="https://t.me/PrzylesieGo_bot" target="_blank" rel="noopener"',"a")+'</div>'
    +'<div class="ios-grp" style="margin-top:14px"><button type="button" class="ios-it ios-row ios-out" data-c="tgoff">Rozłącz Telegram</button></div>'
    +'<p class="note" style="margin-top:10px">Okienko z zaproszeniami w aplikacji działa dalej — Telegram to dodatek.</p>';
  return head+'<div class="smail">Powiadomienia o zaproszeniach prosto na Telegram.</div>'
   +'<ol class="tgsteps"><li>Zainstaluj <b>Telegram</b> (App Store / Google Play) i załóż konto.</li>'
   +'<li>Kliknij <b>„Połącz z Telegramem”</b> poniżej.</li><li>Kliknij <b>„Otwórz Telegram”</b> — w rozmowie z @PrzylesieGo_bot naciśnij <b>START</b>.</li>'
   +'<li>Wróć tutaj — zobaczysz „✅ Połączono”.</li></ol>'
   +(tgCode?'<a class="b sbtn" href="https://t.me/PrzylesieGo_bot?start='+encodeURIComponent(tgCode)+'" target="_blank" rel="noopener">📲 Otwórz Telegram i naciśnij START</a>'
     +'<div class="note" style="margin-top:8px;font-size:14px">⏳ Czekam na połączenie… Kod jest jednorazowy i ważny 15 minut.</div>'
     +'<button class="lnk" data-c="tgcheck">↻ Sprawdź połączenie</button>'
    :'<button class="b sbtn" data-c="tgcode">🔔 Połącz z Telegramem</button>')
   +'<div class="sleft"><div class="note" style="font-size:15px;margin-top:14px">Bot napisze, gdy:</div>'+what+'</div>'
   +'<p class="note">Kanał @PrzylesieGo to ogłoszenia dla wszystkich, a bot pisze tylko do Ciebie. Wyłączysz tutaj (Rozłącz) albo wpisując botowi /stop.</p>';
}
async function tgCheck(manual){
  if(!session||!tgOk)return;
  const r=await sb.from("telegram_links").select("tg_name,linked_at").eq("user_id",uid).limit(1);
  const l=!r.error&&r.data&&r.data[0]||null;
  if(l){tgLink=l;tgCode="";tgStopPoll();if(gearOpen&&gearView==="tg")renderGear();try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}say("✅ Telegram połączony — bot @PrzylesieGo_bot będzie pisać do Ciebie.")}
  else if(manual)say("Jeszcze nie połączono — w Telegramie naciśnij START w rozmowie z @PrzylesieGo_bot.");
}
function tgStopPoll(){clearInterval(tgPoll);tgPoll=null}
function tgStartPoll(){
  tgStopPoll();tgPollEnd=Date.now()+15*60000;
  tgPoll=setInterval(()=>{if(!tgCode||Date.now()>tgPollEnd){tgStopPoll();return}if(!document.hidden)tgCheck(false)},3000);
}
// po powrocie z Telegrama do aplikacji — od razu sprawdź
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&tgCode)tgCheck(false)});
function renderChrome(){
  const welcome=!session&&!guestMode;
  $("welcome").classList.toggle("hide",!welcome);
  $("app").classList.toggle("hide",welcome);
  $("hdr").classList.toggle("hide",welcome);
  renderGear();
  // zakładki: Wieczorynki / Zaawansowane mogą być tylko dla testerów (🚦 Funkcje testowe)
  [1,2,3].forEach(i=>{
    const b=$("t"+i),k=TAB_FLAG[i],beta=tabOk(i)&&flags[k]&&flags[k].state!=="all";
    b.classList.toggle("hide",!tabOk(i));
    b.classList.toggle("tbeta",!!beta);b.title=beta?"🧪 BETA — widzą tylko testerzy":"";
    if(!tabOk(i)&&!$("p"+i).classList.contains("hide"))show(0);
  });
  // jedna widoczna zakładka = bez paska zakładek (nie zabiera miejsca)
  const nv=document.querySelector(".hdr nav");if(nv)nv.classList.toggle("hide",visTabs().length<2);
  $("pwbox").classList.toggle("hide",!(pwMode&&session));
}
$("gear").onclick=()=>{gearOpen=!gearOpen;gearView="main";renderGear()};
$("gearpanel").addEventListener("keydown",e=>{if(e.key==="Enter"&&/^gpw[012]$/.test(e.target.id)){e.preventDefault();const b=$("gearpanel").querySelector('[data-c="pwdsave"]');if(b&&!b.disabled)pwdSave(b)}});
$("gearpanel").addEventListener("click",async e=>{
  const gb=e.target.closest("button[data-g]");
  if(gb){selGender=gb.dataset.g;[...$("gsex").children].forEach(x=>x.classList.toggle("on",x===gb));return}
  const th=e.target.closest("button[data-t]");
  if(th){setTheme(th.dataset.t);renderGear();return}
  const ns=e.target.closest("button[data-ns]");
  if(ns){const i=$("gnick");if(i){i.value=ns.dataset.ns;i.focus()}return}
  const sn=e.target.closest("button[data-sn]");
  const ro=e.target.closest("button[data-ro]");
  if(ro){try{localStorage.setItem("repOff",ro.dataset.ro==="1"?"1":"0")}catch(err){}renderGear();say(ro.dataset.ro==="1"?"Nie będę pytać „Jak poszło?”.":"Zapytam „Jak poszło?” po jeździe.");return}
  const ht=e.target.closest("button[data-ht]");
  if(ht){hideTest=ht.dataset.ht==="1";try{localStorage.setItem("hideTest",hideTest?"1":"0")}catch(err){}renderGear();await syncNow();say(hideTest?"Testowe zaproszenia ukryte.":"Testowe zaproszenia widoczne.");return}
  const ho=e.target.closest("button[data-ho]");
  if(ho&&canStealth()){hideOnline=ho.dataset.ho==="1";try{localStorage.setItem("hideOnline",hideOnline?"1":"0")}catch(err){}applyPresence();renderGear();say(hideOnline?"👻 Jesteś niewidoczny — nie liczysz się do „online”.":"🟢 Znowu widać Cię jako online.");return}
  if(sn){showNick=sn.dataset.sn==="1";try{localStorage.setItem("showNick",showNick?"1":"0")}catch(err){}renderMeNick();renderGear();return}
  const hs=e.target.closest("button[data-hs]");
  if(hs){setHelpOff(hs.dataset.hs==="0");renderGear();return}
  const bt=e.target.closest("button[data-beta]");
  if(bt){betaOn=bt.dataset.beta==="1";try{localStorage.setItem("betaOn",betaOn?"1":"0")}catch(err){}renderGear();refreshUi();return}
  const fb=e.target.closest("button[data-f]");
  if(fb){
    if(!isSuper(uid))return;
    const k=fb.dataset.f,st=fb.dataset.fs;
    try{
      const r=await sb.from("feature_flags").update({state:st,updated_at:new Date().toISOString(),updated_by:uid}).eq("key",k).select("key");
      if(r.error)throw r.error;if(!r.data||!r.data.length)throw new Error("brak uprawnień");
      await syncNow();say("🚦 "+(flags[k]?flags[k].name:k)+": "+FSTATE.find(x=>x[0]===st)[1]);
    }catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return;
  }
  if(e.target===$("gearpanel")){gearOpen=false;renderGear();return}
  const a=e.target.closest("button[data-a]");
  if(a){
    if(a.dataset.a==="fav"){await toggleFav(a.dataset.id);return}
    if(a.dataset.a==="fbmsg"&&isAdmin){fbTo=a.dataset.id;fbMsgTxt="";gearView="fbmsg";renderGear();const i=$("fbmsgtext");if(i)i.focus();return}
    if(a.dataset.a==="fltuser"){const id=a.dataset.id;flt=fltEmpty();flt.user=id;fltSave();gearOpen=false;renderGear();show(0);renderWants();setTimeout(()=>{const c=$("fltbar");if(c)c.scrollIntoView({behavior:"smooth",block:"center"})},80);return}
    if(a.dataset.a==="invite"){const id=a.dataset.id;gearOpen=false;renderGear();show(0);openWantForm(null,{pick:[id]});return}
    if(a.dataset.a==="trm"){
      if(!isSuper(uid))return;
      if(!confirm("Odebrać prawa testera użytkownikowi "+nickOf(a.dataset.id)+"?"))return;
      try{const r=await sb.from("testers").delete().eq("user_id",a.dataset.id);if(r.error)throw r.error;await syncNow();say("Odebrano prawa testera.")}
      catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
      return;
    }
    if(["modhide","modban"].includes(a.dataset.a)&&isSuper(uid)){
      const id=a.dataset.id,ban=modBanned.has(id),hid=modHidden.has(id),nb=a.dataset.a==="modban"?!ban:ban,nh=a.dataset.a==="modhide"?!hid:hid;
      if(a.dataset.a==="modban"&&nb&&!confirm("Zablokować konto "+nickOf(id)+"?\n\nOsoba zobaczy komunikat „Konto zablokowane — napisz do administratora”, nie będzie mogła zapraszać ani dołączać, a jej zaproszenia znikną innym. Możesz to cofnąć."))return;
      modBusy=true;renderGear();
      try{const r=await sb.rpc("mod_set",{u:id,ban:nb,hide:nh});if(r.error)throw r.error;
        nb?modBanned.add(id):modBanned.delete(id);nh?modHidden.add(id):modHidden.delete(id);
        say(a.dataset.a==="modban"?(nb?"⛔ Zablokowano: ":"✅ Odblokowano: ")+nickOf(id):(nh?"👻 Ukryto: ":"👁 Widoczne znowu: ")+nickOf(id))}
      catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
      modBusy=false;renderGear();syncNow();return}
    if(a.dataset.a==="plcity"){fillPlaceCities(true);return}
    if(a.dataset.a==="plpin"||a.dataset.a==="pldel"){
      const x=places.find(y=>y.id===a.dataset.id);if(!x)return;
      if(a.dataset.a==="pldel"){if(!confirm("Usunąć miejsce „"+x.name+"” z listy? Zaproszenia, które już je mają, zostaną bez zmian."))return;
        try{const r=await sb.from("places").delete().eq("id",x.id);if(r.error)throw r.error;places=places.filter(y=>y.id!==x.id);renderGear();say("Usunięto miejsce: "+x.name)}catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}return}
      gearOpen=false;renderGear();
      openPlaceMap({name:x.name,lat:x.lat,lon:x.lon,onOk:async(la,lo)=>{
        try{const r=await sb.from("places").update({lat:la,lon:lo}).eq("id",x.id).select("id");if(r.error||!r.data||!r.data.length)throw new Error(r.error?r.error.message:"brak uprawnień");x.lat=la;x.lon=lo;if(bikeOk)revGeo(la,lo).then(async g=>{if(!g.city)return;const u=await sb.from("places").update({city:g.city,area:g.area||null}).eq("id",x.id);if(!u.error){x.city=g.city;x.area=g.area||null;if(gearOpen&&gearView==="places")renderGear()}});say("📌 Zapisano pinezkę: "+x.name)}
        catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
        gearOpen=true;gearView="places";renderGear()}});
      return}
    if(a.dataset.a==="stealth"&&isSuper(uid)){
      const id=a.dataset.id,on=stealthIds.has(id);
      try{const r=on?await sb.from("admin_stealth").delete().eq("user_id",id):await sb.from("admin_stealth").insert({user_id:id});if(r.error)throw r.error;
        on?stealthIds.delete(id):stealthIds.add(id);renderGear();say(on?"Odebrano ukrywanie obecności: "+nickOf(id):"👻 "+nickOf(id)+" może teraz ukryć swoją obecność online")}
      catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
      return}
    if(a.dataset.a==="moddel"&&isSuper(uid)){modDelId=a.dataset.id;modPrev=null;gearView="moddel";renderGear();
      try{const r=await sb.rpc("mod_preview",{u:modDelId});modPrev=r.error?{err:r.error.message}:r.data}catch(e){modPrev={err:"błąd"}}
      if(gearView==="moddel")renderGear();return}
    if(a.dataset.a==="moddelgo"&&isSuper(uid)){
      const v=($("moddelw")||{}).value||"";if(v.trim().toUpperCase()!=="USUŃ"){say("Wpisz USUŃ, żeby potwierdzić.");return}
      const id=modDelId,nm=nickOf(id);modBusy=true;renderGear();
      try{const r=await sb.rpc("admin_delete_user",{u:id});if(r.error)throw r.error;
        say("🗑 Usunięto konto "+nm);gearView="admin";modDelId="";await syncNow()}
      catch(err){say(/ADMIN/.test(err&&err.message||"")?"Najpierw odbierz uprawnienia administratora.":"Nie udało się: "+(err&&err.message?err.message:"błąd"))}
      modBusy=false;renderGear();return}
    if(!isAdmin)return;
    if(a.dataset.a==="unick"){unickId=a.dataset.id;gearView="unick";renderGear();const i=$("gunick");if(i){i.focus();i.select()}return}
    if(a.dataset.a==="rm"&&isSuper(a.dataset.id)){say("Głównemu administratorowi nie można odebrać uprawnień.");return}
    if(!confirm("Odebrać uprawnienia administratora użytkownikowi "+nickOf(a.dataset.id)+"?"))return;
    try{
      const res=await sb.from("admins").delete().eq("user_id",a.dataset.id);
      if(res.error)throw res.error;
      await syncNow();say("Uprawnienia odebrane.");
    }catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return;
  }
  const b=e.target.closest("button[data-c]");if(!b)return;
  const c=b.dataset.c;
  if(c==="admin"){gearView="admin";renderGear();return}
  if(c==="colors"){gearView="colors";renderGear();return}
  if(c==="stats"){gearView="stats";loadStats();return}
  if(c==="userback2m"){gearView="user";renderGear();return}
  if(c==="allw"){gearView="allw";renderGear();return}
  if(c==="evdelreq"){gearOpen=false;renderGear();evFlt="delreq";show(3);return}
  if(c==="karch"){gearView="karch";kArch=null;renderGear();loadKArch();return}
  if(c==="karchall"){kArchAll=!kArchAll;renderGear();return}
  if(c==="karchdel"){
    const n=kArch?kArch.old.length:0;if(!n)return;
    const t=prompt("Usunąć "+n+" "+plf(n,["zaproszenie","zaproszenia","zaproszeń"])+" starsze niż 30 dni (z dołączeniami, zaproszonymi i odmowami)?\nStatystyki w dzienniku aktywności zostaną.\n\nWpisz USUŃ, żeby potwierdzić:");
    if((t||"").trim().toUpperCase()!=="USUŃ"){if(t!==null)say("Nie usunięto — trzeba wpisać USUŃ.");return}
    try{const r=await sb.rpc("admin_old_wants",{do_delete:true});if(r.error)throw r.error;say("🗑 Usunięto "+(+r.data||0)+" starych zaproszeń.");loadKArch()}catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return}
  if(c==="places"){gearView="places";renderGear();return}
  if(c==="backadm"){gearView="admin";renderGear();return}
  if(c==="accall"){statsAllAcc=!statsAllAcc;renderGear();return}
  if(c==="online"){if(!session)return;gearOpen=true;gearView="online";renderGear();return}
  if(c==="flags"){gearView="flags";renderGear();return}
  if(c==="testdel"){testDelN=null;gearView="testdel";renderGear();try{const r=await sb.rpc("admin_test_wants",{do_delete:false});if(r.error)throw r.error;testDelN=+r.data||0}catch(err){testDelN=0;say("Nie udało się policzyć: "+(err&&err.message?err.message:"błąd"))}if(gearView==="testdel")renderGear();return}
  if(c==="testdelgo"){
    const i=$("gtdel");if(!i)return;
    if(i.value.trim().toUpperCase()!=="USUŃ"){$("gtdelinfo").textContent="Wpisz słowo USUŃ, aby potwierdzić.";return}
    b.disabled=true;
    try{const r=await sb.rpc("admin_test_wants",{do_delete:true});if(r.error)throw r.error;gearView="admin";await syncNow();renderGear();say("🧹 Usunięto testowe zaproszenia: "+(+r.data||0))}
    catch(err){b.disabled=false;$("gtdelinfo").textContent="Nie udało się: "+(err&&err.message?err.message:"błąd")}
    return;
  }
  if(c==="help"){gearOpen=false;renderGear();openHelp();return}
  if(c==="inst"){gearView="inst";renderGear();return}
  if(c==="pwd"){gearView="pwd";renderGear();setTimeout(()=>{const x=$("gpw0");if(x)x.focus()},50);return}
  if(c==="pwdback"){gearView="nick";renderGear();return}
  if(c==="pwdsave"){pwdSave(e.target.closest("[data-c]"));return}
  if(c==="pv"){const m=e.target.closest("[data-pv]").dataset.pv;
    if(m==="guest"){const w=window.open(location.pathname+"?jako=gosc","_blank","noopener");if(!w)say("Przeglądarka zablokowała nową kartę — zezwól na wyskakujące okna.");return}
    gearOpen=false;renderGear();pvSet(pv===m?"":m);return}
  if(c==="instgo"){if(instPrompt){const ev=instPrompt;instPrompt=null;try{ev.prompt();const r=await ev.userChoice;say(r&&r.outcome==="accepted"?"📲 Instaluję — ikona pojawi się na ekranie telefonu.":"Możesz zainstalować później: ⚙️ → Zainstaluj aplikację.")}catch(err){gearView="inst"}renderGear();return}gearView="inst";renderGear();return}
  if(c==="testeradd"){
    const sel=$("testersel"),id=sel?sel.value:"";if(!id||!isSuper(uid))return;
    try{const r=await sb.from("testers").insert({user_id:id,added_by:uid});if(r.error)throw r.error;await syncNow();say("🧪 Nadano prawa testera: "+nickOf(id))}
    catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return;
  }
  if(c==="favs"){gearView="favs";renderGear();return}
  if(c==="fb"){gearView="fb";renderGear();return}
  if(c==="fbadmin"){gearView="fbadmin";renderGear();return}
  if(c==="fbsend"){await fbSend();return}
  if(c==="testerreq"){await testerReq(b);return}
  if(c==="fbgrant"){const f=fbList.find(x=>x.id===fbId);if(f&&isSuper(uid))await testerGrant(f);return}
  if(c==="fbreply"){await fbReply();return}
  if(c==="fbmsgsend"){await fbMsgSend();return}
  if(c==="fbback"){if(fbBack==="bell"){gearOpen=false;renderGear()}else{gearView=fbBack;renderGear()}return}
  if(c==="userback2"){gearView="user";renderGear();return}
  if(c==="tg"){gearView="tg";renderGear();return}
  if(c==="tgcheck"){await tgCheck(true);return}
  if(c==="tgcode"){
    b.disabled=true;
    try{const r=await sb.rpc("tg_link_code");if(r.error)throw r.error;tgCode=String(r.data||"");renderGear();tgStartPoll()}
    catch(err){b.disabled=false;say(/TG_OFF/.test(err&&err.message||"")?"Powiadomienia na Telegramie nie są jeszcze dla Ciebie włączone.":"Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return;
  }
  if(c==="tgoff"){
    if(!confirm("Rozłączyć Telegram? Bot przestanie wysyłać Ci powiadomienia."))return;
    try{const r=await sb.from("telegram_links").delete().eq("user_id",uid);if(r.error)throw r.error;tgLink=null;tgCode="";renderGear();say("🔕 Telegram rozłączony.")}
    catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return;
  }
  if(c==="confgo"){await confirmDelete();return}
  if(c==="userback"){gearView=userBack||"main";renderGear();return}
  if(c==="coldef"){["K","M"].forEach(g=>{$("col"+g).value=DEF_COLORS[g];$("bg"+g).value=DEF_BGS[g];$("nob"+g).checked=false});colorsPreview();return}
  if(c==="colsave"){await saveColors();return}
  if(c==="nick"){selGender=genders[uid]||"";peStart();gearView="nick";renderGear();return}
  if(c==="nicksave"){if(!needProfile()&&!nickShort()&&!(await saveProfEx()))return;await gearSaveNick();return}
  if(c==="pephoto"){const f=$("pefile");if(f)f.click();return}
  if(c==="pephotodel"){if(pe){pe.av=null;pe.avCh=true;renderGear()}return}
  if(c==="del"){gearView="del";renderGear();const i=$("gdel");if(i)i.focus();return}
  if(c==="delgo"){await gearDeleteAccount();return}
  if(c==="back"){gearView="main";renderGear();return}
  if(c==="backadmin"){gearView="admin";renderGear();return}
  if(c==="unicksave"){await adminSaveNick();return}
  if(c==="adminadd"){
    const s=$("adminsel"),id=s?s.value:"";if(!id||!isAdmin)return;
    try{
      const res=await sb.from("admins").insert({user_id:id});
      if(res.error)throw res.error;
      await syncNow();say("Nadano uprawnienia: "+nickOf(id));
    }catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return;
  }
  gearOpen=false;
  if(c==="close"){renderGear();return}
  if(c==="out"){setGuest(false);if(sb)sb.auth.signOut();renderChrome()}
  else if(c==="login"){setGuest(false);renderChrome()}
});
$("gearpanel").addEventListener("input",e=>{if(/^(col|bg|nob)[KM]$/.test(e.target.id))colorsPreview()});
/* 💬 zgłoszenia: stan formularzy (przetrwa odświeżenie panelu co minutę) */
$("gearpanel").addEventListener("input",e=>{const id=e.target.id;if(id==="fbtext")fbf.text=e.target.value;else if(id==="fbreply")fbReplyTxt=e.target.value;else if(id==="fbmsgtext")fbMsgTxt=e.target.value});
$("gearpanel").addEventListener("change",e=>{if(e.target.id==="fbdev")fbf.dev=e.target.checked});
$("gearpanel").addEventListener("click",async e=>{
  const k=e.target.closest("button[data-fk]");if(k){fbf.kind=k.dataset.fk;renderGear();return}
  const ff=e.target.closest("button[data-ff]");if(ff){fbAdmFilter=ff.dataset.ff;renderGear();return}
  const row=e.target.closest("button[data-fb]");if(row){fbOpen(row.dataset.fb,gearView==="fbadmin"?"fbadmin":"fb");return}
  const st=e.target.closest("button[data-fs2]");
  if(st&&isAdmin){try{const r=await sb.rpc("fb_status",{f:fbId,s:st.dataset.fs2});if(r.error)throw r.error;await syncNow();say("Status: "+FB_ST[st.dataset.fs2])}catch(err){say(fbErr(err))}}
});
async function saveColors(){
  if(!isAdmin)return;
  const x=colVals(),inf=$("colinfo"),okBg=b=>b==="none"||HEX_RE.test(b);
  if(!HEX_RE.test(x.cK)||!HEX_RE.test(x.cM)||!okBg(x.bK)||!okBg(x.bM)){inf.textContent="Nieprawidłowy kolor.";return}
  try{
    const res=await sb.from("app_settings").upsert([{key:"nick_color_K",value:x.cK},{key:"nick_color_M",value:x.cM},{key:"nick_bg_K",value:x.bK},{key:"nick_bg_M",value:x.bM}]).select("key");
    if(res.error)throw res.error;
    if(!res.data||res.data.length<4)throw new Error("brak uprawnień");
    await syncNow();gearView="admin";renderGear();say("Kolory nicków zapisane ✔");
  }catch(err){inf.textContent="Nie udało się zapisać: "+(err&&err.message?err.message:"błąd")}
}
$("gearpanel").addEventListener("keydown",e=>{
  if(e.key!=="Enter")return;
  if(e.target.id==="gnick"){e.preventDefault();gearSaveNick()}
  else if(e.target.id==="gunick"){e.preventDefault();adminSaveNick()}
  else if(e.target.id==="gdel"){e.preventDefault();gearDeleteAccount()}
  else if(e.target.id==="gconf"){e.preventDefault();confirmDelete()}
});
let deleting=false;
async function gearDeleteAccount(){
  const i=$("gdel"),inf=$("gdelinfo");if(!i||deleting||!session)return;
  if(lastAdmin()||isSuper(uid)){renderGear();return}
  if(i.value.trim().toUpperCase()!=="USUŃ"){inf.textContent="Wpisz słowo USUŃ, aby potwierdzić.";return}
  if(!confirm("Na pewno usunąć konto? Tej operacji nie można cofnąć."))return;
  deleting=true;inf.textContent="Usuwam konto…";
  try{
    const r=await sb.rpc("delete_my_account");
    if(r.error){
      const m=r.error.message||"";
      inf.textContent=/SUPERADMIN/.test(m)?"Konta głównego administratora nie można usunąć.":/LAST_ADMIN/.test(m)?"Jesteś jedynym administratorem — najpierw nadaj komuś uprawnienia."
        :(r.error.code==="PGRST202"||/delete_my_account/.test(m))?"Usuwanie kont nie jest jeszcze włączone w bazie (brak funkcji delete_my_account).":"Nie udało się usunąć konta: "+m;
      return;
    }
    try{await sb.auth.signOut()}catch(e){}
    setSession(null);setGuest(false);gearOpen=false;
    await syncNow().catch(()=>{});renderChrome();
    say("Konto zostało usunięte.");
  }catch(e){inf.textContent="Nie udało się usunąć konta."}
  finally{deleting=false}
}
// gdy nick zajęty: 2–3 wolne warianty do kliknięcia
function nickSuggest(n){
  let base=n.replace(/\s+/g," ").trim().slice(0,14);base=base.charAt(0).toUpperCase()+base.slice(1);
  const K=(selGender||genders[uid])==="K";
  const taken=k=>Object.keys(nicks).some(id=>id!==uid&&nickKey(nicks[id])===k);
  const c=[base+(K?" Rowerowa":" Rowerowy"),base+" z Lasu",base+" Szosa",base+" Przygoda"].filter(x=>x.length<=20&&NICK_RE.test(x)&&!taken(nickKey(x)));
  return c.slice(0,3);
}
async function gearSaveNick(){
  const i=$("gnick");if(!i)return;
  const n=i.value.trim();
  const sg=$("gnicksug");if(sg){sg.classList.add("hide");sg.innerHTML=""}
  if(genderOk&&!selGender){$("gnickinfo").textContent="Wybierz płeć: Kobieta albo Mężczyzna.";return}
  if(nickShort()&&n===me.nick){$("gnickinfo").textContent="Wybierz nowy nick — co najmniej 3 litery.";return}
  if(n===me.nick&&(!genderOk||selGender===genders[uid])){gearView="main";renderGear();return}
  const first=needProfile(),isNew=!nicks[uid];
  if(isNew)try{sessionStorage.setItem("helpShown","1")}catch(e){}   // nowy: powitanie zamiast okienka pomocy
  const err=await saveNick(n,null,genderOk?selGender:null);
  if(err){$("gnickinfo").textContent=err;
    if(/zajęty/.test(err)&&sg){const L=nickSuggest(n);if(L.length){sg.innerHTML='<div class="note">Wolne, np.:</div>'+L.map(x=>'<button type="button" class="chip" data-ns="'+esc(x)+'">'+esc(x)+'</button>').join("")+'<div class="note">…albo dopisz pierwszą literę nazwiska, np. „'+esc((w=>w.charAt(0).toUpperCase()+w.slice(1))(n.split(" ")[0]))+' K”.</div>';sg.classList.remove("hide")}}
    return}
  if(first)gearOpen=false;
  gearView="main";renderGear();
  if(isNew){show(0);openWelcome();return}
  say(first?"Profil zapisany ✔":"Zapisano ✔");
}
function askNick(){
  if(!session)return;
  selGender=genders[uid]||"";
  gearOpen=true;gearView="nick";renderGear();
  const i=$("gnick");if(i)i.focus();
}
$("guestbtn").onclick=()=>{setGuest(true);renderChrome()};
// „spłaszczony” nick: małe litery, bez polskich znaków, cyfr, spacji i znaków — tak samo jak w bazie (nick_key)
function nickKey(n){
  const k=String(n||"").toLowerCase().replace(/[ąćęłńóśźż]/g,c=>({"ą":"a","ć":"c","ę":"e","ł":"l","ń":"n","ó":"o","ś":"s","ź":"z","ż":"z"}[c])).replace(/[^a-z]/g,"");
  return k||String(n||"").toLowerCase();
}
async function saveNick(n,target,gender){
  const who=target||uid;
  if(!NICK_RE.test(n))return "Nick: do 20 znaków — litery, cyfry, spacja, kropka, _ lub -.";
  if(nickLetters(n)<3&&!isSuper(who))return "Nick musi mieć co najmniej 3 litery (np. imię albo ksywka) — inicjały typu „AK” nie przejdą.";
  const k=nickKey(n),twin=Object.keys(nicks).find(id=>id!==who&&nickKey(nicks[id])===k);
  if(twin)return "Ten nick jest zajęty albo zbyt podobny do „"+nicks[twin]+"” (różni się tylko wielkością liter, cyframi, znakami lub polskimi literami). Wybierz inny.";
  const row={nick:n};if(gender)row.gender=gender;
  try{
    const res=nicks[who]?await sb.from("profiles").update(row).eq("user_id",who).select("user_id"):await sb.from("profiles").insert(Object.assign({user_id:who},row)).select("user_id");
    if(res.error&&/NICK_SHORT/.test(res.error.message||""))return "Nick musi mieć co najmniej 3 litery.";
    if(res.error)return res.error.code==="23505"?"Ten nick jest zajęty albo zbyt podobny do istniejącego — wybierz inny.":"Nie udało się zapisać: "+res.error.message;
    if(!res.data||!res.data.length)return "Brak uprawnień do zmiany tego nicku.";
    await syncNow();return null;
  }catch(e){return "Nie udało się zapisać nicku."}
}
async function adminSaveNick(){
  const i=$("gunick");if(!i||!isAdmin)return;
  const n=i.value.trim(),old=nicks[unickId];
  if(n===old){gearView="admin";renderGear();return}
  const err=await saveNick(n,unickId);
  if(err){$("gunickinfo").textContent=err;return}
  gearView="admin";renderGear();say("Zmieniono nick: "+old+" → "+n);
}

