/* ---------- 🔔 dzwonek: lista powiadomień (do Ciebie / Twoje zaproszenia) ---------- */
const ME_KINDS=["invite","time","set","info"],OWN_KINDS=["join","pref","leave","decline","rejoin"];   // rejoin — KROK 46
const N_ICON={invite:"📩",time:"🕖",set:"✅",info:"✏️",join:"🙋",pref:"🕖",leave:"👋",decline:"🙅",rejoin:"🔁"};
const nWant=n=>wants.find(w=>w.id===n.want_id);
// czy zaproszenie czeka na Twoją odpowiedź (skierowane do Ciebie, a Ty jeszcze nie odpowiedziałeś)
function wNeedsAct(w){
  if(!w||w.user_id===uid||new Date(w.starts_at).getTime()<Date.now()-15*60000)return false;
  if((joins[w.id]||[]).includes(uid)||(decls[w.id]||[]).includes(uid))return false;
  return invIds(w).includes(uid)||notifs.some(n=>n.want_id===w.id&&!n.read_at&&(n.kind==="invite"||n.kind==="set"));
}
const nNeedsAct=n=>(n.kind==="invite"||n.kind==="set")&&wNeedsAct(nWant(n));
function agoTxt(ts){
  const m=Math.round((Date.now()-new Date(ts).getTime())/60000);
  if(m<1)return "przed chwilą";if(m<60)return m+" min temu";
  const h=Math.round(m/60);if(h<24)return h+" h temu";
  return dayDiff(new Date(ts))===-1?"wczoraj":new Date(ts).toLocaleDateString("pl-PL",{day:"numeric",month:"short"});
}
// krótki opis nowości (najświeższe nieprzeczytane powiadomienie przy zaproszeniu)
function newsTxt(n,w){
  const a=n.actor||w.user_id,K=genders[a]==="K",v=(m,k)=>K?k:m,who='<b>'+esc(nickOf(a))+'</b>',pf=(prefs[w.id]||{})[a];
  switch(n.kind){
    case "invite":return a!==w.user_id?who+' '+v("doprosił","doprosiła")+' Cię':'nowe zaproszenie';
    case "time":return who+' '+v("zmienił","zmieniła")+' godzinę';
    case "info":return who+' '+v("zmienił","zmieniła")+' szczegóły jazdy (tempo, dystans albo trasę)';
    case "set":return who+' '+v("ustalił","ustaliła")+' godzinę: <b>'+esc(hhmm(new Date(w.starts_at)))+'</b>';
    case "join":return who+' '+v("dołączył","dołączyła")+(pf&&isOpen(w)?' · pasuje <b>'+esc(hhmm(new Date(pf)))+'</b>':'');
    case "pref":return who+' '+v("zmienił","zmieniła")+' godzinę'+(pf?' · pasuje <b>'+esc(hhmm(new Date(pf)))+'</b>':'');
    case "leave":return who+' '+v("zrezygnował","zrezygnowała");
    case "rejoin":return who+' '+v("wrócił","wróciła")+' — jednak jedzie 🚴'+(pf&&isOpen(w)?' · pasuje <b>'+esc(hhmm(new Date(pf)))+'</b>':'');
    default:return who+' nie da rady';
  }
}
const wUnread=w=>notifs.filter(n=>n.want_id===w.id&&!n.read_at&&(w.user_id===uid?OWN_KINDS:ME_KINDS).includes(n.kind)).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
function bellRowHtml(w){
  const mine=w.user_id===uid,un=wUnread(w),joined=(joins[w.id]||[]).includes(uid),dec=(decls[w.id]||[]).includes(uid);
  const when=esc(relDay(new Date(isOpen(w)?w.range_from:w.starts_at))+" "+wTime(w));
  const jn=(joins[w.id]||[]).filter(x=>x!==w.user_id).length,dn=(decls[w.id]||[]).filter(x=>x!==w.user_id).length,act=wNeedsAct(w);
  const title=mine?'<b>'+when+'</b>'+(isPriv(w)?' 🔒':'')
    :nk(w.user_id)+' '+(isPriv(w)?'zaprasza Cię 🔒':'zaprasza wszystkich');
  const sub=mine?[w.note?esc(w.note):'',isOpen(w)?'🕖 do ustalenia':'','🚴 jedzie '+(jn+1),dn?'🙅 '+dn:''].filter(Boolean).join(' · ')
    :[when,w.note?esc(w.note):'',joined?'🚴 Jedziesz':dec?'Nie dasz rady':act?'⏳ czeka na Twoją odpowiedź':''].filter(Boolean).join(' · ');
  const news=un.length?'<div class="nnews">'+N_ICON[un[0].kind]+' '+newsTxt(un[0],w)+' · '+agoTxt(un[0].created_at)+(un.length>1?' <span class="nmore">+'+(un.length-1)+'</span>':'')+'</div>':'';
  const btns=act?'<div class="sb">'+(isOpen(w)?'<button type="button" class="b" data-na="pref" data-wid="'+esc(w.id)+'">Pasuje mi o…</button>'
      :'<button type="button" class="b" data-na="join" data-wid="'+esc(w.id)+'">Jadę! · '+esc(hhmm(new Date(w.starts_at)))+'</button>')
    +'<button type="button" class="b w" data-na="no" data-wid="'+esc(w.id)+'">Nie dam rady</button></div>':'';
  return '<div class="nit'+(mine?' mine':'')+(un.length?' new':'')+(isTest(w)?' test':'')+'" data-wid="'+esc(w.id)+'"><div class="ic">'+(mine?'🙋':isPriv(w)?'📩':'🌍')+'</div>'
   +'<div class="tx">'+testTag(w)+title+'<div class="w">'+sub+'</div>'+news+btns+'</div>'+(un.length?'<span class="dot"></span>':'')+'</div>';
}
// 🆕 nowi użytkownicy (tylko admini): konta z nickiem z ostatnich 14 dni; „przeczytane” zapamiętane w tym urządzeniu
const nuList=()=>{if(!isAdmin)return [];const lim=Date.now()-14*864e5;
  return Object.keys(nicks).filter(id=>id!==uid&&joinedAt[id]&&new Date(joinedAt[id]).getTime()>lim).sort((a,b)=>new Date(joinedAt[b])-new Date(joinedAt[a]))};
const nuSeen=()=>{try{const v=localStorage.getItem("nuSeen");return v?+v:Date.now()-3*864e5}catch(e){return 0}};
const nuUnread=()=>{const s=nuSeen();return nuList().filter(id=>new Date(joinedAt[id]).getTime()>s)};
const nuMarkSeen=()=>{try{localStorage.setItem("nuSeen",String(Date.now()))}catch(e){}};
function nuRow(id,un){const d=new Date(joinedAt[id]);
  return '<div class="nit'+(un?' new':'')+'" data-nu="'+esc(id)+'"><div class="ic">🆕</div><div class="tx">'+nk(id)+'<div class="w">'+(genders[id]==="K"?'dołączyła':'dołączył')+' '+esc(relDayPast(d).toLowerCase())+', '+esc(hhmm(d))+(tgLinks&&tgLinks.has(id)?' · ✈️ Telegram':'')+'</div></div>'+(un?'<span class="dot"></span>':'')+'</div>'}
// 🔑 ostatnie logowania i 🟢 ostatnio w aplikacji (tylko admini, KROK 49) — ładowane przy otwarciu 🔔
let lgOk=null,lgList=[],lsList=[],lgAt=0,lgBusy=false,dlList=[];
async function lgLoad(force){
  if(!session||!isAdmin||lgOk===false||lgBusy||(!force&&Date.now()-lgAt<60000))return;
  lgBusy=true;
  try{const [a,b]=await Promise.all([sb.rpc("admin_logins",{days:14}),sb.rpc("admin_last_seen",{days:14})]);
    if(a.error||b.error){lgOk=false}else{lgOk=true;lgList=a.data||[];lsList=b.data||[];lgAt=Date.now()}
    // 🗑 usunięte zaproszenia (KROK 58) — bez KROKU 58 lista po prostu pusta
    const d=await sb.from("activity").select("id,created_at,user_id,ref_id,meta").eq("kind","want_deleted").gte("created_at",new Date(Date.now()-14*864e5).toISOString()).order("created_at",{ascending:false}).limit(30);
    dlList=d.error?[]:(d.data||[]);
  }catch(e){lgOk=false}
  lgBusy=false;
  if(!$("bellsheet").classList.contains("hide"))renderBellSheet();
}
const lgSeen=()=>{try{const v=localStorage.getItem("lgSeen");return v?+v:Date.now()-864e5}catch(e){return 0}};
const lgRows=()=>lgOk?lgList.filter(x=>x.user_id!==uid&&nicks[x.user_id]):[];
const lgUnread=()=>{const s=lgSeen();return lgRows().filter(x=>!x.backfill&&new Date(x.at).getTime()>s)};
const lgWhen=d=>relDayPast(d).toLowerCase()+', '+hhmm(d);
// 🗑 usunięte zaproszenia (KROK 58; zgłoszenie właściciela 2026-11-17 11:01) — tylko admini, bez własnych usunięć
const dlSeen=()=>{try{const v=localStorage.getItem("dlSeen");return v?+v:Date.now()-864e5}catch(e){return 0}};
const dlRows=()=>lgOk?dlList.filter(x=>x.user_id!==uid):[];
const dlUnread=()=>{const s=dlSeen();return dlRows().filter(x=>new Date(x.created_at).getTime()>s)};
function dlRow(x,un){const m=x.meta||{},d=new Date(x.created_at),k=genders[x.user_id]==="K",au=m.author;
  const who=nicks[x.user_id]?nk(x.user_id):'<b>ktoś</b>';
  const what=m.by_admin?' (admin) '+(k?'usunęła':'usunął')+' zaproszenie od '+(au&&nicks[au]?esc(nicks[au]):'ktoś'):' '+(k?'usunęła':'usunął')+' swoje zaproszenie';
  const st=m.starts_at?new Date(m.starts_at):null;
  const det=[st?'jazda: '+(st<new Date()?relDayPast(st):relDay(st)).toLowerCase()+' '+hhmm(st):'',m.joined?'zapisani: '+m.joined:'nikt nie był zapisany',m.private?'🔒 prywatne':'',m.test?'testowe':''].filter(Boolean).join(' · ');
  return '<div class="nit'+(un?' new':'')+'" data-nu="'+esc(x.user_id)+'"><div class="ic">🗑️</div><div class="tx">'+who+esc(what)+'<div class="w">'+esc(lgWhen(d))+' · '+esc(det)+'</div></div>'+(un?'<span class="dot"></span>':'')+'</div>'}
function lgRow(x,un){const d=new Date(x.at),k=genders[x.user_id]==="K";
  return '<div class="nit'+(un?' new':'')+'" data-nu="'+esc(x.user_id)+'"><div class="ic">🔑</div><div class="tx">'+nk(x.user_id)+'<div class="w">'+(k?'zalogowała się':'zalogował się')+' '+esc(lgWhen(d))
   +(x.backfill?'':x.prev_at?' · poprzednio: '+esc(agoTxt(x.prev_at)):' · ✨ pierwsze logowanie')+'</div></div>'+(un?'<span class="dot"></span>':'')+'</div>'}
function lsRows(){if(!lgOk)return [];
  const on=onlineIds.filter(id=>id!==uid&&nicks[id]).map(id=>({user_id:id,now:true}));
  return on.concat(lsList.filter(x=>x.user_id!==uid&&nicks[x.user_id]&&!onlineIds.includes(x.user_id)))}
function lsRow(x){
  return '<div class="nit" data-nu="'+esc(x.user_id)+'"><div class="ic">'+(x.now?'🟢':'🕖')+'</div><div class="tx">'+nk(x.user_id)+'<div class="w">'+(x.now?'teraz w aplikacji':'w aplikacji '+esc(agoTxt(x.last_seen)))+'</div></div></div>'}
const bellUnread=()=>notifs.filter(n=>!n.read_at&&nWant(n)&&(ME_KINDS.includes(n.kind)||OWN_KINDS.includes(n.kind)));
function renderBell(){
  const b=$("bellbtn");if(!b)return;
  const on=!!session&&visOk,n=on?bellUnread().length+fbMineUnread().length+fbAdmUnread().length+nuUnread().length+stepsBadge()+evBellUn().length+repTodoN():0,bd=$("bellbadge");
  b.classList.toggle("hide",!on);
  bd.textContent=n>9?"9+":String(n);bd.classList.toggle("hide",!n);
  b.setAttribute("aria-label",n?"Powiadomienia — nowe: "+n:"Powiadomienia");
  // liczba na ikonie aplikacji w telefonie (gdy aplikacja jest na ekranie głównym)
  try{if(navigator.setAppBadge){(n?navigator.setAppBadge(n):navigator.clearAppBadge()).catch(()=>{})}}catch(e){}
  if(!$("bellsheet").classList.contains("hide"))renderBellSheet();
}
// 🔔 sekcje zwijane: wybór zapamiętany w urządzeniu; bez wyboru — rozwinięta, gdy jest coś nowego
// na zwiniętej: czerwone kółko z liczbą nieprzeczytanych (albo szare z liczbą pozycji, gdy nic nowego)
const bsColGet=()=>{try{return JSON.parse(localStorage.getItem("bellCol")||"{}")}catch(e){return {}}};
function bsSec(k,title,un,total,body){
  const st=bsColGet(),col=k in st?!!st[k]:!un;
  return '<button type="button" class="bsec bsect'+(col?' col':'')+'" data-bsec="'+k+'" aria-expanded="'+(!col)+'"><span class="bst">'+title+'</span>'
   +(un?'<span class="cnt">'+un+'</span>':col&&total?'<span class="cnt0">'+total+'</span>':'')
   +'<svg class="bschev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>'
   +'<div class="bsecb'+(col?' hide':'')+'">'+body+'</div>';
}
function renderBellSheet(){
  const p=$("bellsheet"),act=w=>new Date(w.starts_at).getTime()>=Date.now()-3*36e5;
  const ord=(a,b)=>((wUnread(b).length?1:0)-(wUnread(a).length?1:0))||((wNeedsAct(b)?1:0)-(wNeedsAct(a)?1:0))||(new Date(a.starts_at)-new Date(b.starts_at));
  const forMe=wants.filter(w=>w.user_id!==uid&&act(w)&&(w.visibility!=="private"||invIds(w).includes(uid)||(joins[w.id]||[]).includes(uid))).sort(ord);
  const mine=wants.filter(w=>w.user_id===uid&&act(w)).sort(ord);
  const keep=p.querySelector(".bslist"),st=keep?keep.scrollTop:0,nu=bellUnread().length+nuUnread().length+lgUnread().length+dlUnread().length+evBellUn().length,EVB=evBellItems(),EVBs=evBellSeen(),LG=lgRows(),LGu=new Set(lgUnread()),DL=dlRows(),DLu=new Set(dlUnread()),LS=lsRows(),NU=nuList(),NUu=new Set(nuUnread()),SA=stepsAvail()?stepsList():[],SL=SA.filter(x=>!x.ok);
  p.innerHTML='<div class="bsbox" role="dialog" aria-modal="true" aria-label="Powiadomienia"><div class="bsgrab"></div>'
   +'<div class="bshead"><button type="button" class="lnk" data-bk="close">Zamknij</button><b>🔔 Powiadomienia</b>'
   +(nu?'<button type="button" class="lnk" data-bk="all" style="text-align:right">✓ Przeczytane</button>':'<span style="min-width:64px"></span>')+'</div>'
   +'<div class="bslist">'
   +(SL.length?bsSec("start",'✨ Dokończ start · '+(SA.length-SL.length)+' z '+SA.length,lsGet("stepsHide")==="1"?0:SL.length,SL.length,
      SL.map(x=>'<div class="nit stn"><div class="ic">'+({inst:"📲",ride:"🚴",tg:"🔔",fav:"⭐"}[x.k]||"✨")+'</div><div class="tx"><b>'+x.t.replace(" ⭐","")+'</b></div>'+(x.go?'<button type="button" class="lnk stgo" data-sb="'+x.k+'">'+x.go+' ›</button>':'')+'</div>').join("")
      +(lsGet("stepsHide")==="1"?'<div class="bsempty"><button type="button" class="lnk" data-sb="show">Pokaż z powrotem w Zaproszeniach ›</button></div>':'')):'')
   +repBellHtml()
   +(fbMineUnread().length?bsSec("msg",'💬 Wiadomości',fbMineUnread().length,fbMineUnread().length,fbMineUnread().map(f=>fbRow(f,false)).join("")):'')
   +(fbAdmUnread().length?bsSec("adm",'🛡️ Zgłoszenia',fbAdmUnread().length,fbAdmUnread().length,fbAdmUnread().slice(0,5).map(f=>fbRow(f,true)).join("")):'')
   +(NU.length?bsSec("nu",'🆕 Nowi użytkownicy',NUu.size,NU.length,NU.slice(0,6).map(id=>nuRow(id,NUu.has(id))).join("")
      +(NU.length>6?'<div class="bsempty">i jeszcze '+(NU.length-6)+' z ostatnich 14 dni — pełna lista: ⚙️ → 🛡️ Administracja</div>':'')):'')
   +(LG.length?bsSec("lg",'🔑 Ostatnie logowania',LGu.size,LG.length,LG.slice(0,6).map(x=>lgRow(x,LGu.has(x))).join("")
      +(LG.length>6?'<div class="bsempty">i jeszcze '+(LG.length-6)+' z ostatnich 14 dni</div>':'')
      +'<div class="bsempty">Liczy się wpisanie e-maila i hasła — z zainstalowanej aplikacji ludzie zwykle logują się raz.</div>'):'')
   +(DL.length?bsSec("dl",'🗑️ Usunięte zaproszenia',DLu.size,DL.length,DL.slice(0,6).map(x=>dlRow(x,DLu.has(x))).join("")
      +(DL.length>6?'<div class="bsempty">i jeszcze '+(DL.length-6)+' z ostatnich 14 dni</div>':'')):'')
   +(LS.length?bsSec("ls",'🟢 Ostatnio w aplikacji',0,LS.length,LS.slice(0,8).map(lsRow).join("")
      +(LS.length>8?'<div class="bsempty">i jeszcze '+(LS.length-8)+' z ostatnich 14 dni</div>':'')
      +'<div class="bsempty">Czas odświeża się co ok. 15 min, gdy ktoś ma otwartą aplikację.</div>'):'')
   +(EVB.length?bsSec("ev",'🏁 Imprezy',EVB.filter(x=>x.at>EVBs).length,EVB.length,EVB.slice(0,8).map(x=>evBellRow(x,x.at>EVBs)).join("")
      +(EVB.length>8?'<div class="bsempty">i jeszcze '+(EVB.length-8)+' — zobacz w zakładce Imprezy</div>':'')):'')
   +bsSec("forme",'📩 Do Ciebie',forMe.filter(w=>wUnread(w).length).length,forMe.length,
      forMe.length?forMe.map(bellRowHtml).join(""):'<div class="bsempty">Na razie nikt nie zaprasza.</div>')
   +bsSec("mine",'🙋 Twoje zaproszenia',mine.filter(w=>wUnread(w).length).length,mine.length,
      mine.length?mine.map(bellRowHtml).join(""):'<div class="bsempty">Nie masz aktywnych zaproszeń. <button type="button" class="lnk" data-bk="new">Idziemy na rower? ›</button></div>')
   +'</div><div class="bshint">Czerwona kropka = coś nowego. Dotknij nagłówka, żeby zwinąć albo rozwinąć sekcję.</div></div>';
  p.classList.remove("hide");
  const nl=p.querySelector(".bslist");if(nl)nl.scrollTop=st;
}
async function markRead(ids){
  ids=ids.filter(Boolean);if(!ids.length)return;
  const now=new Date().toISOString();
  notifs.forEach(n=>{if(ids.includes(n.id))n.read_at=now});
  renderBell();
  try{await sb.from("notifications").update({read_at:now}).in("id",ids)}catch(e){}
}
function closeBell(){
  // informacje (bez potrzeby odpowiedzi) uznajemy za przeczytane po obejrzeniu listy
  const ids=bellUnread().filter(n=>!nNeedsAct(n)).map(n=>n.id);
  if(nuUnread().length)nuMarkSeen();
  if(lgUnread().length)lsSet("lgSeen",String(Date.now()));
  if(dlUnread().length)lsSet("dlSeen",String(Date.now()));
  if(evBellUn().length)lsSet("evBell",String(Date.now()));
  if(stepsLeft().length)lsSet("stepsSeen","1");
  $("bellsheet").classList.add("hide");$("bellsheet").innerHTML="";
  if(ids.length)markRead(ids);else renderBell();
}
// przejście do karty zaproszenia (Start: Twoje zaproszenie albo karta dnia)
function goToWant(w){
  show(0);
  let el;
  if(w.user_id===uid&&myOn()){
    const mine=wants.filter(x=>x.user_id===uid&&new Date(x.starts_at).getTime()>=Date.now()-3*36e5).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
    myIdx=Math.max(0,mine.findIndex(x=>x.id===w.id));renderWants();
    el=document.querySelector('#mywant .mywant[data-wid="'+w.id+'"]');
  }else{
    const k=localIso(new Date(w.starts_at)).slice(0,10);wantOpenDay=k;
    const ord=wants.filter(x=>localIso(new Date(x.starts_at)).slice(0,10)===k&&new Date(x.starts_at).getTime()>=Date.now()-3*36e5&&!wAbove(x))
      .sort((a,b)=>((isFav(b.user_id)?1:0)-(isFav(a.user_id)?1:0))||(new Date(a.starts_at)-new Date(b.starts_at)));
    dayIdx[k]=Math.max(0,ord.findIndex(x=>x.id===w.id));renderWants();
    el=document.querySelector('#wantlist .want[data-wid="'+w.id+'"]');
  }
  if(!el){say("To zaproszenie już minęło albo zostało usunięte.");return}
  setTimeout(()=>{el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash")},80);
}
$("menick").onclick=()=>{gearOpen=true;gearView="main";renderGear()};
$("bellbtn").onclick=()=>{if(!session)return;renderBellSheet();lgLoad()};
$("bellsheet").addEventListener("click",async e=>{
  const p=$("bellsheet");
  const fr=e.target.closest("button[data-fb]");
  const stb=e.target.closest("[data-sb]");   // „Dokończ start” (nie nazywać „sb” — to połączenie z bazą)
  if(stb){const k=stb.dataset.sb;closeBell();renderBell();stepGo(k);return}
  const evb=e.target.closest("[data-evb]");if(evb){closeBell();evGo(evb.dataset.evb);return}
  const rpb=e.target.closest("[data-rep]");if(rpb){const id=rpb.dataset.rep;closeBell();repAskedAdd(id);openReport(id);return}
  const sc=e.target.closest("[data-bsec]");
  if(sc){const k=sc.dataset.bsec,st=bsColGet(),col=!sc.classList.contains("col");st[k]=col;try{localStorage.setItem("bellCol",JSON.stringify(st))}catch(err){}
    renderBellSheet();return}
  if(fr){const f=fbList.find(x=>x.id===fr.dataset.fb);closeBell();fbOpen(fr.dataset.fb,f&&f.user_id!==uid&&isAdmin?"fbadmin":"bell");return}
  if(e.target===p){closeBell();return}
  const k=e.target.closest("[data-bk]");
  if(k){
    if(k.dataset.bk==="close")closeBell();
    else if(k.dataset.bk==="new"){closeBell();show(0);openWantForm(null)}
    else{nuMarkSeen();lsSet("lgSeen",String(Date.now()));lsSet("dlSeen",String(Date.now()));lsSet("evBell",String(Date.now()));await markRead(bellUnread().map(n=>n.id));renderBell();renderBellSheet()}
    return;
  }
  const a=e.target.closest("button[data-na]");
  if(a){
    const w=wants.find(x=>x.id===a.dataset.wid);if(!w)return;
    const ids=wUnread(w).map(x=>x.id);
    if(a.dataset.na==="pref"){closeBell();await markRead(ids);openPick("pref",w.id);return}
    a.disabled=true;
    try{
      if(a.dataset.na==="join"){
        const r=await sb.from("want_joins").insert({want_id:w.id});if(r.error&&r.error.code!=="23505")throw r.error;
        if((decls[w.id]||[]).includes(uid))await sb.from("want_declines").delete().eq("want_id",w.id).eq("user_id",uid);
        try{navigator.vibrate&&navigator.vibrate(30)}catch(err){}
        say("Jedziesz ✔ "+wfLabel(new Date(w.starts_at)));
      }else{await declineWant(w);say("OK — zapisano „Nie dam rady”.")}
      await markRead(ids);await syncNow();
    }catch(err){a.disabled=false;say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return;
  }
  const nu=e.target.closest(".nit[data-nu]");
  if(nu){const id=nu.dataset.nu;closeBell();renderBell();userBack="";userId=id;gearOpen=true;gearView="user";renderGear();if(isAdmin){delete admInfo[userId];loadAdmInfo(userId)}return}
  const it=e.target.closest(".nit[data-wid]");
  if(it){
    const w=wants.find(x=>x.id===it.dataset.wid);if(!w)return;
    const ids=wNeedsAct(w)?[]:wUnread(w).map(x=>x.id);
    closeBell();markRead(ids);goToWant(w);
  }
});

/* popup po wejściu: tylko NOWE zaproszenia do Ciebie (zmiany i ustalenia godziny — pod 🔔) */
let popList=[],popIdx=0,popBusy=false,popSel=null,popSelFor=null,popOther=false;
const popSnooze=new Set((()=>{try{return JSON.parse(sessionStorage.getItem("popSnooze")||"[]")}catch(e){return []}})());
const saveSnooze=()=>{try{sessionStorage.setItem("popSnooze",JSON.stringify([...popSnooze]))}catch(e){}};
// jedno okienko na zaproszenie: „zaprasza Cię” + ewentualna zmiana godziny łączą się w jedno
function popPending(){
  const by={};
  notifs.filter(n=>!n.read_at&&ME_KINDS.includes(n.kind)&&!popSnooze.has(n.id)).forEach(n=>{(by[n.want_id]=by[n.want_id]||[]).push(n)});
  return Object.keys(by).map(id=>{
    const ns=by[id],inv=ns.find(n=>n.kind==="invite"),set=ns.find(n=>n.kind==="set");
    return {ns,n:inv||set||ns[ns.length-1],moved:!!inv&&ns.some(n=>n.kind!=="invite"),w:wants.find(x=>x.id===id)};
  }).filter(x=>x.w&&x.ns.some(n=>n.kind==="invite")&&new Date(x.w.starts_at).getTime()>=Date.now()-36e5)
    .sort((a,b)=>String(a.n.created_at).localeCompare(String(b.n.created_at)));
}
const popIds=it=>it.ns.map(n=>n.id);
const popOpen=()=>!$("popsheet").classList.contains("hide");
function closePop(){$("popsheet").classList.add("hide");$("popsheet").innerHTML=""}
function maybePopup(){
  if(!session||!visOk){if(popOpen())closePop();return}
  popList=popPending();
  if(!popList.length){if(popOpen())closePop();return}
  if(popOpen()){popIdx=Math.min(popIdx,popList.length-1);renderPop();return}
  if(gearOpen||needProfile()||pwMode||!$("whosheet").classList.contains("hide")||!$("wantform").classList.contains("hide"))return;
  popIdx=0;renderPop();
}
function renderPop(){
  const p=$("popsheet"),it=popList[popIdx];if(!it){closePop();return}
  const {n,w,moved}=it,d=new Date(w.starts_at),wd=d.toLocaleDateString("pl-PL",{weekday:"long"}),dd=dayDiff(d);
  const day=dd>=0&&dd<=2?["Dziś","Jutro","Pojutrze"][dd]:wd.charAt(0).toUpperCase()+wd.slice(1)+" "+d.getDate()+" "+MON3[d.getMonth()].toLowerCase();
  const joined=(joins[w.id]||[]).includes(uid),priv=isPriv(w),actor=n.actor||w.user_id,time=n.kind==="time",set=n.kind==="set",open=isOpen(w);
  if(popSelFor!==w.id){popSelFor=w.id;popOther=false;const my=(prefs[w.id]||{})[uid];popSel=my?tkey(my):null}
  const inv=priv?invIds(w).filter(x=>x!==uid):[],going=(joins[w.id]||[]).filter(x=>x!==uid&&x!==w.user_id);
  const big=(q,t)=>'<button type="button" class="b big" data-q="'+q+'">'+t+'</button>';
  const sm=(q,t,c)=>'<button type="button" class="b '+c+'" data-q="'+q+'">'+t+'</button>';
  let btns;
  // otwarty zakres: wybór godziny w okienku („Pasuje mi o…”)
  if(open)btns='<div class="pmeta"><b style="color:var(--ink)">Kiedy możesz?</b> (liczba = ilu już wybrało)</div>'+slotsHtml(w,popSel,popOther)
    +'<button type="button" class="b big" data-q="pref"'+(popSel?'':' disabled')+'>Pasuje mi o '+(popSel?hhmm(new Date(popSel)):'…')+'</button>'
    +'<div class="pbtns">'+sm("no","Nie dam rady","w")+sm("later","Przypomnij później","g")+'</div>';
  else if(set)btns=joined?big("read","OK 👍 Jedziesz o "+hhmm(d))+'<div class="pbtns">'+sm("no","Nie dam rady","w")+'</div>'
    :big("join","Jadę! · "+hhmm(d))+'<div class="pbtns">'+sm("no","Nie dam rady","w")+sm("later","Przypomnij później","g")+'</div>';
  else if(!time)btns=joined?big("read","OK 👍 Już jedziesz")+'<div class="pbtns">'+sm("later","Przypomnij później","g")+'</div>'
    :big("join","Jadę! · "+hhmm(d))+'<div class="pbtns">'+sm("no","Nie dam rady","w")+sm("later","Przypomnij później","g")+'</div>';
  else btns=joined?big("read","OK 👍")+'<div class="pbtns">'+sm("leave","Rezygnuję","w")+'</div>'
    :big("join","Jadę! · "+hhmm(d))+'<div class="pbtns">'+sm("read","OK","w")+'</div>';
  p.innerHTML='<div class="sheetbox popbox" role="dialog" aria-modal="true"><button class="sclose" data-q="later" aria-label="Później">✕</button>'
   +(isTest(w)?'<span class="ttag" style="margin-right:6px">🧪 TEST</span>':'')+'<span class="ptag">'+(set?'✅ GODZINA USTALONA':time?'🕖 ZMIANA GODZINY':'📩 NOWE ZAPROSZENIE'+(priv?' · 🔒 PRYWATNE':''))+'</span>'
   +'<div class="ph">'+nk(actor,"Ktoś")+(set?' '+(genders[actor]==="K"?"ustaliła":"ustalił")+' godzinę':time?' '+(genders[actor]==="K"?"zmieniła":"zmienił")+' godzinę':' zaprasza Cię na rower')+'</div>'
   +'<div class="pwhen">'+esc(day+" "+wTime(w))+(dd>=0&&dd<=2?'<span>'+esc(wd)+'</span>':'')+'</div>'
   +(open?'<div class="pmeta">🕖 Zakres godzin — wybierz, kiedy możesz; godzinę ustali '+esc(nickOf(w.user_id))+'.</div>':'')
   +(moved&&!open?'<div class="pmeta">'+(fromRange(w)?'✅ Godzina jest już ustalona — powyżej.':'🕖 Godzina była już zmieniana — powyżej aktualna.')+'</div>':'')
   +paceHtml(w)+bikeHtml(w)+durLineHtml(w)+placeHtml(w)+(w.note?'<div class="pnote">💬 '+esc(w.note)+'</div>':'')
   +(w.user_id!==actor&&!time?'<div class="pmeta">Zaproszenie od '+nk(w.user_id)+'</div>':'')
   +(inv.length?'<div class="pmeta">Zaproszeni też:</div><div class="nks">'+favFirst(inv).map(id=>nk(id)).join("")+'</div>':'')
   +(going.length&&!open?'<div class="pmeta">Jadą już ('+going.length+'):</div><div class="nks">'+favFirst(going).map(id=>nk(id)).join("")+'</div>':'')
   +btns
   +(popList.length>1?'<div class="pnav">'+popList.map((_,i)=>'<button type="button" data-pi="'+i+'" class="'+(i===popIdx?'on':'')+'" aria-label="Powiadomienie '+(i+1)+'"></button>').join("")+'<span>'+(popIdx+1)+' z '+popList.length+'</span></div>':'')
   +'<div class="ptg">Zaproszenie znajdziesz też na Starcie, w karcie dnia.</div></div>';
  p.classList.remove("hide");
}
function popNext(){popList=popPending();if(!popList.length){closePop();return}popIdx=Math.min(popIdx,popList.length-1);renderPop()}
$("popsheet").addEventListener("click",async e=>{
  const it=popList[popIdx];
  if(e.target===$("popsheet")){if(it){popIds(it).forEach(i=>popSnooze.add(i));saveSnooze()}popNext();return}
  const dot=e.target.closest("button[data-pi]");if(dot){popIdx=+dot.dataset.pi;renderPop();return}
  const st=e.target.closest("[data-t]");
  if(st&&it){
    if(st.dataset.t==="oth"){popOther=true;renderPop();const i=$("othtime");if(i)i.focus();return}
    if(st.dataset.t==="othok"){const v=otherTime(it.w);if(v==null){say("Podaj godzinę w dniu zaproszenia (nie w przeszłości).");return}popSel=v;popOther=false;renderPop();return}
    popSel=+st.dataset.t;renderPop();return;
  }
  const b=e.target.closest("button[data-q]");if(!b||!it||popBusy)return;
  const q=b.dataset.q,chosen=popSel;
  if(q==="later"){popIds(it).forEach(i=>popSnooze.add(i));saveSnooze();popNext();say("Przypomnę przy następnym wejściu. Zaproszenie jest też na Starcie.");return}
  popBusy=true;
  try{
    if(q==="join"&&!(joins[it.w.id]||[]).includes(uid)){
      const r=await sb.from("want_joins").insert({want_id:it.w.id});if(r.error)throw r.error;
      try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}
    }
    if(q==="join"&&(decls[it.w.id]||[]).includes(uid))await sb.from("want_declines").delete().eq("want_id",it.w.id).eq("user_id",uid);
    if(q==="pref"){if(!chosen)return;await setPref(it.w,chosen)}
    if(q==="no")await declineWant(it.w);
    if(q==="leave"){const r=await sb.from("want_joins").delete().eq("want_id",it.w.id).eq("user_id",uid);if(r.error)throw r.error}
    const ids=popIds(it),r=await sb.from("notifications").update({read_at:new Date().toISOString()}).in("id",ids);
    if(r.error)throw r.error;
    notifs.forEach(x=>{if(ids.includes(x.id))x.read_at=new Date().toISOString()});renderBell();
    popNext();
    if(q==="join")say("Jedziesz ✔ "+wfLabel(new Date(it.w.starts_at)));
    else if(q==="pref")say("✔ Pasuje Ci "+hhmm(new Date(chosen))+" — "+nickOf(it.w.user_id)+" to zobaczy.");
    else if(q==="no")say("OK. Zaproszenie zostaje na Starcie, gdybyś zmienił zdanie.");
    else if(q==="leave")say("Zrezygnowano.");
    if(q!=="read")await syncNow();
  }catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
  finally{popBusy=false}
});

