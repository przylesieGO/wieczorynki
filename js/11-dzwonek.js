/* ---------- 🔔 dzwonek: lista powiadomień (do Ciebie / Twoje zaproszenia) ---------- */
const ME_KINDS=["invite","time","set","info"],OWN_KINDS=["join","pref","leave","decline","rejoin"];   // rejoin — KROK 46
const N_ICON={invite:"📩",time:"🕖",set:"✅",info:"✏️",join:"🙋",pref:"🕖",leave:"👋",decline:"🙅",rejoin:"🔁"};
const nWant=n=>wants.find(w=>w.id===n.want_id);
// 🔔 „przeczytane” pojedynczych pozycji bez własnego stanu w bazie (logowania, nowi, usunięte, imprezy, chęci) — pamięć tego urządzenia
const bsDone=()=>{try{return new Set(JSON.parse(localStorage.getItem("bellDone")||"[]"))}catch(e){return new Set()}};
const bsDoneAdd=ks=>{const s=bsDone();ks.forEach(k=>s.add(k));try{localStorage.setItem("bellDone",JSON.stringify([...s].slice(-400)))}catch(e){}};
const bsMk=k=>'<button type="button" class="nmk" data-mk="'+esc(k)+'" aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane">'+uiIcon("check")+'</button>';
// czy zaproszenie czeka na Twoją odpowiedź (skierowane do Ciebie, a Ty jeszcze nie odpowiedziałeś)
function wNeedsAct(w){
  if(!w||w.user_id===uid||new Date(w.starts_at).getTime()<Date.now()-15*60000)return false;
  if((joins[w.id]||[]).includes(uid)||(decls[w.id]||[]).includes(uid))return false;
  return wInvMe(w)||notifs.some(n=>n.want_id===w.id&&!n.read_at&&(n.kind==="invite"||n.kind==="set"));
}
const nNeedsAct=n=>(n.kind==="invite"||n.kind==="set")&&wNeedsAct(nWant(n));
function agoTxt(ts){
  const m=Math.round((Date.now()-new Date(ts).getTime())/60000);
  if(m<1)return "przed chwilą";if(m<60)return m+" min temu";
  const h=Math.round(m/60);if(h<24)return h+" h temu";
  const d=new Date(ts);return (dayDiff(d)===-1?"wczoraj":d.toLocaleDateString("pl-PL",{day:"numeric",month:"short"})+",")+" "+hhmm(d);   // starsze niż doba — z godziną
}
// kiedy zaproszenie do mnie przyszło: moje powiadomienie „zaproszenie” (też dopraszanie), inaczej utworzenie zaproszenia
function wSentAt(w){const n=notifs.filter(x=>x.want_id===w.id&&x.kind==="invite").sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))[0];return n?n.created_at:w.created_at||null}
// krótki opis nowości (najświeższe nieprzeczytane powiadomienie przy zaproszeniu)
function newsTxt(n,w){
  const a=n.actor||w.user_id,K=genders[a]==="K",v=(m,k)=>K?k:m,who='<b>'+esc(nickOf(a))+'</b>',pf=(prefs[w.id]||{})[a];
  switch(n.kind){
    case "invite":return a!==w.user_id?who+' '+v("doprosił","doprosiła")+' Cię':'nowe zaproszenie';
    case "time":return who+' '+v("zmienił","zmieniła")+' godzinę';
    case "info":return who+' '+v("zmienił","zmieniła")+' szczegóły jazdy (tytuł, tempo, miejsce, dystans albo trasę)';
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
  const title=(mine?'<b>'+when+'</b>'+(isPriv(w)&&!wGr(w)?' 🔒':'')
    :nk(w.user_id)+(wGr(w)&&typeof grRoleTag==="function"?grRoleTag(w):'')+' '+(isPriv(w)?'zaprasza Cię'+(wGr(w)?'':' 🔒'):'zaprasza wszystkich'))+(wGr(w)?' '+grTagHtml(w):'');   // 👥 KROK 71
  const sub=mine?[w.note?esc(w.note):'',isOpen(w)?'🕖 do ustalenia':'','🚴 jedzie '+(jn+1),dn?'🙅 '+dn:''].filter(Boolean).join(' · ')
    :[when,w.note?esc(w.note):'',joined?'🚴 Jedziesz':dec?'Nie dasz rady':act?(wLate(w)?'🏃 ruszyła — możesz jeszcze dogonić!':'⏳ czeka na Twoją odpowiedź'):''].filter(Boolean).join(' · ');
  const sent=!mine&&!un.length&&wSentAt(w)?' · <span class="nsent">wysłane '+agoTxt(wSentAt(w))+'</span>':'';   // przeczytane: kiedy przyszło (nieprzeczytane mają to w ramce nowości)
  const news=un.length?'<div class="nnews">'+N_ICON[un[0].kind]+' '+newsTxt(un[0],w)+' · '+agoTxt(un[0].created_at)+(un.length>1?' <span class="nmore">+'+(un.length-1)+'</span>':'')+'</div>':'';
  const btns=act?'<div class="sb">'+(isOpen(w)?'<button type="button" class="b" data-na="pref" data-wid="'+esc(w.id)+'">Pasuje mi o…</button>'
      :'<button type="button" class="b" data-na="join" data-wid="'+esc(w.id)+'">Jadę! · '+esc(hhmm(new Date(w.starts_at)))+'</button>')
    +(wDeclOk(w)?'<button type="button" class="b w" data-na="no" data-wid="'+esc(w.id)+'">Nie dam rady</button>':'')+'</div>':'';
  return '<div class="nit'+(mine?' mine':'')+(un.length?' new':'')+(isTest(w)?' test':'')+grCls(w)+'" data-wid="'+esc(w.id)+'"><div class="ic">'+(mine?'🙋':isPriv(w)?'📩':'🌍')+'</div>'
   +'<div class="tx">'+testTag(w)+wTitleHtml(w)+title+'<div class="w">'+sub+sent+'</div>'+news+btns+'</div>'+(un.length?(act?'<span class="dot"></span>':bsMk("w:"+w.id)):'')+'</div>';
}
// 🆕 nowi użytkownicy (wszyscy zalogowani — decyzja 2026-11-20): konta z nickiem z ostatnich 14 dni,
// bez ukrytych/zablokowanych (admini widzą wszystkich); „przeczytane” zapamiętane w tym urządzeniu
const nuList=()=>{if(!session)return [];const lim=Date.now()-14*864e5;
  return Object.keys(nicks).filter(id=>id!==uid&&joinedAt[id]&&new Date(joinedAt[id]).getTime()>lim&&(isAdmin||!modGone(id))).sort((a,b)=>new Date(joinedAt[b])-new Date(joinedAt[a]))};
const nuSeen=()=>{try{const v=localStorage.getItem("nuSeen");return v?+v:Date.now()-3*864e5}catch(e){return 0}};
const nuUnread=()=>{const s=nuSeen(),D=bsDone();return nuList().filter(id=>new Date(joinedAt[id]).getTime()>s&&!D.has("nu:"+id))};
const nuMarkSeen=()=>{try{localStorage.setItem("nuSeen",String(Date.now()))}catch(e){}};
function nuRow(id,un){const d=new Date(joinedAt[id]);
  return '<div class="nit'+(un?' new':'')+'" data-nu="'+esc(id)+'"><div class="ic">🆕</div><div class="tx">'+nk(id)+'<div class="w">'+(genders[id]==="K"?'dołączyła':'dołączył')+' '+esc(relDayPast(d).toLowerCase())+', '+esc(hhmm(d))+(tgLinks&&tgLinks.has(id)?' · ✈️ Telegram':'')+'</div></div>'+(un?bsMk("nu:"+id):'')+'</div>'}
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
const lgKey=x=>"lg:"+x.user_id+"|"+x.at;
const lgUnread=()=>{const s=lgSeen(),D=bsDone();return lgRows().filter(x=>!x.backfill&&new Date(x.at).getTime()>s&&!D.has(lgKey(x)))};
const lgWhen=d=>relDayPast(d).toLowerCase()+', '+hhmm(d);
// 🗑 usunięte zaproszenia (KROK 58; zgłoszenie właściciela 2026-11-17 11:01) — tylko admini, bez własnych usunięć
const dlSeen=()=>{try{const v=localStorage.getItem("dlSeen");return v?+v:Date.now()-864e5}catch(e){return 0}};
const dlRows=()=>lgOk?dlList.filter(x=>x.user_id!==uid):[];
const dlUnread=()=>{const s=dlSeen(),D=bsDone();return dlRows().filter(x=>new Date(x.created_at).getTime()>s&&!D.has("dl:"+x.id))};
function dlRow(x,un){const m=x.meta||{},d=new Date(x.created_at),k=genders[x.user_id]==="K",au=m.author;
  const who=nicks[x.user_id]?nk(x.user_id):'<b>ktoś</b>';
  const what=m.by_admin?' (admin) '+(k?'usunęła':'usunął')+' zaproszenie od '+(au&&nicks[au]?esc(nicks[au]):'ktoś'):' '+(k?'usunęła':'usunął')+' swoje zaproszenie';
  const st=m.starts_at?new Date(m.starts_at):null;
  const det=[st?'jazda: '+(st<new Date()?relDayPast(st):relDay(st)).toLowerCase()+' '+hhmm(st):'',m.joined?'zapisani: '+m.joined:'nikt nie był zapisany',m.private?'🔒 prywatne':'',m.test?'testowe':''].filter(Boolean).join(' · ');
  return '<div class="nit'+(un?' new':'')+'" data-nu="'+esc(x.user_id)+'"><div class="ic">🗑️</div><div class="tx">'+who+esc(what)+'<div class="w">'+esc(lgWhen(d))+' · '+esc(det)+'</div></div>'+(un?bsMk("dl:"+x.id):'')+'</div>'}
function lgRow(x,un){const d=new Date(x.at),k=genders[x.user_id]==="K";
  return '<div class="nit'+(un?' new':'')+'" data-nu="'+esc(x.user_id)+'"><div class="ic">🔑</div><div class="tx">'+nk(x.user_id)+'<div class="w">'+(k?'zalogowała się':'zalogował się')+' '+esc(lgWhen(d))
   +(x.backfill?'':x.prev_at?' · poprzednio: '+esc(agoTxt(x.prev_at)):' · ✨ pierwsze logowanie')+'</div></div>'+(un?bsMk(lgKey(x)):'')+'</div>'}
function lsRows(){if(!lgOk)return [];
  const on=onlineIds.filter(id=>id!==uid&&nicks[id]).map(id=>({user_id:id,now:true}));
  return on.concat(lsList.filter(x=>x.user_id!==uid&&nicks[x.user_id]&&!onlineIds.includes(x.user_id)))}
function lsRow(x){
  return '<div class="nit" data-nu="'+esc(x.user_id)+'"><div class="ic">'+(x.now?'🟢':'🕖')+'</div><div class="tx">'+nk(x.user_id)+'<div class="w">'+(x.now?'teraz w aplikacji':'w aplikacji '+esc(agoTxt(x.last_seen)))+'</div></div></div>'}
const bellUnread=()=>notifs.filter(n=>!n.read_at&&nWant(n)&&(ME_KINDS.includes(n.kind)||OWN_KINDS.includes(n.kind)));
function renderBell(){
  const b=$("bellbtn");if(!b)return;
  const on=!!session&&visOk,n=on?bellUnread().length+fbMineUnread().length+fbAdmUnread().length+nuUnread().length+stepsBadge()+evBellUn().length+repTodoN()+sigUnread().length+(typeof grBellN==="function"?grBellN():0)+(typeof svBellN==="function"?svBellN():0):0,bd=$("bellbadge");
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
const BS_MK={nu:1,lg:1,dl:1,ev:1,sig:1,forme:1,mine:1};   // sekcje z przyciskiem „Oznacz sekcję jako przeczytane”
function bsSec(k,title,un,total,body){
  const st=bsColGet(),col=k in st?!!st[k]:!un;
  return '<button type="button" class="bsec bsect'+(col?' col':'')+(un?' unr':'')+'" data-bsec="'+k+'" aria-expanded="'+(!col)+'"><span class="bst">'+title+'</span>'
   +(un?'<span class="cnt">'+un+'</span>':col&&total?'<span class="cnt0">'+total+'</span>':'')
   +'<svg class="bschev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>'
   +'<div class="bsecb'+(col?' hide':'')+'">'+(un&&BS_MK[k]?'<div class="bsmka"><button type="button" class="lnk" data-mks="'+k+'">'+uiIcon("check")+' Oznacz sekcję jako przeczytane</button></div>':'')+body+'</div>';
}
// zaproszenia widoczne w 🔔: „Do Ciebie” i „Twoje” — nieprzeczytane i czekające na odpowiedź na górze
function bsWants(){
  const act=w=>new Date(w.starts_at).getTime()>=Date.now()-3*36e5;
  const ord=(a,b)=>((wUnread(b).length?1:0)-(wUnread(a).length?1:0))||((wNeedsAct(b)?1:0)-(wNeedsAct(a)?1:0))||(new Date(a.starts_at)-new Date(b.starts_at));
  return {forme:wants.filter(w=>w.user_id!==uid&&act(w)&&(w.visibility!=="private"||wInvMe(w)||(joins[w.id]||[]).includes(uid))).sort(ord),
    mine:wants.filter(w=>w.user_id===uid&&act(w)).sort(ord)};
}
// 🧪 testerzy pod ręką (tylko admini): czekające prośby o testera (nawet przeczytane) + lista obecnych testerów; bez licznika nieprzeczytanych
const tstPending=()=>isAdmin?fbList.filter(f=>f.kind==="tester"&&f.user_id!==uid&&(f.status==="new"||f.status==="accepted")).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))):[];
function tstBellHtml(){
  const pend=tstPending(),ids=[...testerIds].filter(id=>nicks[id]).sort((a,b)=>nicks[a].localeCompare(nicks[b],"pl"));
  if(!isAdmin||(!pend.length&&!ids.length))return "";
  return bsSec("tst",'💉 Testerzy'+(pend.length?' · czeka '+pend.length:''),0,pend.length||ids.length,
    pend.map(f=>fbRow(f,true)).join("")
    +'<div class="bsempty">Obecni testerzy ('+ids.length+'): '+(ids.map(id=>nk(id)).join(" ")||"brak")+'</div>'
    +'<div class="bsempty">Dodawanie i usuwanie: ⚙️ → 🛡️ Administracja → Uprawnienia</div>');
}
function renderBellSheet(){
  const p=$("bellsheet"),{forme:forMe,mine}=bsWants();
  const keep=p.querySelector(".bslist"),st=keep?keep.scrollTop:0,nu=bellUnread().length+nuUnread().length+lgUnread().length+dlUnread().length+evBellUn().length+sigUnread().length+(typeof grPostUnN==="function"?grPostUnN():0)+(typeof svBellN==="function"?svBellN():0),EVB=evBellItems(),EVu=new Set(evBellUn().map(evKey)),LG=lgRows(),LGu=new Set(lgUnread()),DL=dlRows(),DLu=new Set(dlUnread()),LS=lsRows(),NU=nuList(),NUu=new Set(nuUnread()),SA=stepsAvail()?stepsList():[],SL=SA.filter(x=>!x.ok),uf=(L,U,g)=>L.slice().sort((a,b)=>(U.has(g(b))?1:0)-(U.has(g(a))?1:0)),sid=x=>x;
  const SEC=[
   (SL.length?bsSec("start",'✨ Dokończ start · '+(SA.length-SL.length)+' z '+SA.length,lsGet("stepsHide")==="1"?0:SL.length,SL.length,
      SL.map(x=>'<div class="nit stn"><div class="ic">'+({inst:"📲",ride:"🚴",tg:"🔔",fav:"⭐"}[x.k]||"✨")+'</div><div class="tx"><b>'+x.t.replace(" ⭐","")+'</b></div>'+(x.go?'<button type="button" class="lnk stgo" data-sb="'+x.k+'">'+x.go+' ›</button>':'')+'</div>').join("")
      +(lsGet("stepsHide")==="1"?'<div class="bsempty"><button type="button" class="lnk" data-sb="show">Pokaż z powrotem w Zaproszeniach ›</button></div>':'')):''),
   repBellHtml(),
   sigBellHtml(),
   typeof svBellHtml==="function"?svBellHtml():"",   // 🔧 przypomnienia serwisu roweru (KROK 88), js/20
   typeof grBellHtml==="function"?grBellHtml():"",   // 👥 zaproszenia do grup i prośby (KROK 70) + 📣 ogłoszenia grup (KROK 76), js/17
   (fbMineUnread().length?bsSec("msg",'💬 Wiadomości',fbMineUnread().length,fbMineUnread().length,fbMineUnread().map(f=>fbRow(f,false)).join("")):''),
   (fbAdmUnread().length?bsSec("adm",'🛡️ Zgłoszenia',fbAdmUnread().length,fbAdmUnread().length,fbAdmUnread().slice(0,5).map(f=>fbRow(f,true)).join("")):''),
   tstBellHtml(),
   (NU.length?bsSec("nu",'🆕 Nowi użytkownicy',NUu.size,NU.length,uf(NU,NUu,sid).slice(0,6).map(id=>nuRow(id,NUu.has(id))).join("")
      +(NU.length>6?'<div class="bsempty">i jeszcze '+(NU.length-6)+' z ostatnich 14 dni — pełna lista: ⚙️ → 🛡️ Administracja</div>':'')):''),
   (LG.length?bsSec("lg",'🔑 Ostatnie logowania',LGu.size,LG.length,uf(LG,LGu,sid).slice(0,6).map(x=>lgRow(x,LGu.has(x))).join("")
      +(LG.length>6?'<div class="bsempty">i jeszcze '+(LG.length-6)+' z ostatnich 14 dni</div>':'')
      +'<div class="bsempty">Liczy się wpisanie e-maila i hasła — z zainstalowanej aplikacji ludzie zwykle logują się raz.</div>'):''),
   (DL.length?bsSec("dl",'🗑️ Usunięte zaproszenia',DLu.size,DL.length,uf(DL,DLu,sid).slice(0,6).map(x=>dlRow(x,DLu.has(x))).join("")
      +(DL.length>6?'<div class="bsempty">i jeszcze '+(DL.length-6)+' z ostatnich 14 dni</div>':'')):''),
   (LS.length?bsSec("ls",'🟢 Ostatnio w aplikacji',0,LS.length,LS.slice(0,8).map(lsRow).join("")
      +(LS.length>8?'<div class="bsempty">i jeszcze '+(LS.length-8)+' z ostatnich 14 dni</div>':'')
      +'<div class="bsempty">Czas odświeża się co ok. 15 min, gdy ktoś ma otwartą aplikację.</div>'):''),
   (EVB.length?bsSec("ev",'🏁 Imprezy',EVu.size,EVB.length,uf(EVB,EVu,evKey).slice(0,8).map(x=>evBellRow(x,EVu.has(evKey(x)))).join("")
      +(EVB.length>8?'<div class="bsempty">i jeszcze '+(EVB.length-8)+' — zobacz w zakładce Imprezy</div>':'')):''),
   bsSec("forme",'📩 Do Ciebie',forMe.filter(w=>wUnread(w).length).length,forMe.length,
      forMe.length?forMe.map(bellRowHtml).join(""):'<div class="bsempty">Na razie nikt nie zaprasza.</div>'),
   bsSec("mine",'🙋 Twoje zaproszenia',mine.filter(w=>wUnread(w).length).length,mine.length,
      mine.length?mine.map(bellRowHtml).join(""):'<div class="bsempty">Nie masz aktywnych zaproszeń. <button type="button" class="lnk" data-bk="new">Idziemy na rower? ›</button></div>')
   
  ].filter(Boolean),bsUn=h=>/class="bsec bsect[^"]*\bunr\b/.test(h);
  SEC.sort((a,b)=>bsUn(b)-bsUn(a));   // sekcje z nowościami na górze
  p.innerHTML='<div class="bsbox" role="dialog" aria-modal="true" aria-label="Powiadomienia"><div class="bsgrab"></div>'
   +'<div class="bshead"><button type="button" class="lnk" data-bk="close">Zamknij</button><b>🔔 Powiadomienia</b>'
   +(nu?'<button type="button" class="lnk" data-bk="all" style="text-align:right">✓ Przeczytane</button>':'<span style="min-width:64px"></span>')+'</div>'
   +'<div class="bslist">'+SEC.join("")+'</div><div class="bshint">Podświetlone = nowe. Znaczek ✓ oznacza pozycję jako przeczytaną (albo całą sekcję). Dotknij nagłówka, żeby zwinąć lub rozwinąć.</div></div>';
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
  // od KROKU 64: zamknięcie 🔔 niczego nie oznacza jako przeczytane — robisz to sam (✓ przy pozycji, w sekcji albo „✓ Przeczytane”)
  if(stepsLeft().length)lsSet("stepsSeen","1");
  $("bellsheet").classList.add("hide");$("bellsheet").innerHTML="";
  renderBell();
}
// przejście do karty zaproszenia (Start: Twoje zaproszenie albo karta dnia)
function goToWant(w){
  show(0);
  let el;
  if(w.user_id===uid&&myOn()){
    const mine=wants.filter(x=>x.user_id===uid&&new Date(x.starts_at).getTime()>=Date.now()-3*36e5).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
    myIdx=Math.max(0,mine.findIndex(x=>x.id===w.id));renderWants();
    el=document.querySelector('#mywant .want[data-wid="'+w.id+'"]');
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
  const sgz=e.target.closest("[data-sgz]");if(sgz){const id=sgz.dataset.sgz;closeBell();show(0);openWantForm(null,{sig:id});return}
  if(e.target.closest("[data-sgx]")){closeBell();sigCancel();return}
  const mk1=e.target.closest("[data-mk]");   // ✓ przy pozycji
  if(mk1){const k=mk1.dataset.mk;
    if(k.startsWith("w:")){const w=wants.find(x=>x.id===k.slice(2));if(w)markRead(wUnread(w).filter(n=>!nNeedsAct(n)).map(n=>n.id))}
    else{bsDoneAdd([k]);renderBell()}
    return}
  const mks=e.target.closest("[data-mks]");   // ✓ cała sekcja
  if(mks){const k=mks.dataset.mks;
    if(k==="nu")nuMarkSeen();else if(k==="lg")lsSet("lgSeen",String(Date.now()));else if(k==="dl")lsSet("dlSeen",String(Date.now()));
    else if(k==="ev")lsSet("evBell",String(Date.now()));else if(k==="sig")lsSet("sigSeen",new Date().toISOString());
    else if(k==="forme"||k==="mine"){markRead(bsWants()[k].flatMap(w=>wUnread(w).filter(n=>!nNeedsAct(n)).map(n=>n.id)));return}
    renderBell();return}
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
    else{nuMarkSeen();lsSet("lgSeen",String(Date.now()));lsSet("dlSeen",String(Date.now()));lsSet("evBell",String(Date.now()));lsSet("sigSeen",new Date().toISOString());if(typeof grPostReadAll==="function")grPostReadAll();await markRead(bellUnread().map(n=>n.id).concat(typeof svBellRead==="function"?svBellRead():[]));renderBell();renderBellSheet()}
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
        if(!(joins[w.id]||[]).includes(uid)&&!await joinClashOk(w)){a.disabled=false;return}
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
// 👥 osoby w okienku zaproszenia: do 6 — etykiety, od 7 — zwinięta lista (jak „Dołączyło”, ulubieni na początku)
function popNks(lbl,ids,k,cnt){
  if(ids.length<=6)return '<div class="pmeta">'+lbl+(cnt?' ('+ids.length+')':'')+':</div><div class="nks">'+favFirst(ids).map(id=>nk(id)).join("")+'</div>';
  const fn=favNames(ids);
  return '<details class="jlist pjl" data-j="'+esc(k)+'"'+(joinOpen.has(k)?' open':'')+'><summary><span class="jc">'+lbl+' '+ids.length+'</span>'
   +(fn.length?'<span class="jf">· ⭐ '+esc(fn.join(", "))+'</span>':'')+'</summary>'
   +'<div class="jv">'+favFirst(ids).map(id=>'<div>'+nk(id)+(onlineIds.includes(id)?'<span class="note">🟢 teraz</span>':'')+'</div>').join("")+'</div></details>';
}
function renderPop(dir){   // dir: -1 / 1 = karta wjeżdża z lewej / prawej (przesuw), bez dir — bez animacji
  const p=$("popsheet"),it=popList[popIdx];if(!it){closePop();return}
  const {n,w,moved}=it,d=new Date(w.starts_at),wd=d.toLocaleDateString("pl-PL",{weekday:"long"}),dd=dayDiff(d);
  const day=dd>=0&&dd<=2?["Dziś","Jutro","Pojutrze"][dd]:wd.charAt(0).toUpperCase()+wd.slice(1)+" "+d.getDate()+" "+MON3[d.getMonth()].toLowerCase();
  const joined=(joins[w.id]||[]).includes(uid),priv=isPriv(w),actor=n.actor||w.user_id,time=n.kind==="time",set=n.kind==="set",open=isOpen(w);
  if(popSelFor!==w.id){popSelFor=w.id;popOther=false;const my=(prefs[w.id]||{})[uid];popSel=my?tkey(my):null}
  const inv=priv?invIds(w).filter(x=>x!==uid):[],going=(joins[w.id]||[]).filter(x=>x!==uid&&x!==w.user_id);
  const big=(q,t)=>'<button type="button" class="b big" data-q="'+q+'">'+t+'</button>';
  const sm=(q,t,c)=>'<button type="button" class="b '+c+'" data-q="'+q+'">'+t+'</button>';
  let btns;const noB=wDeclOk(w)?sm("no","Nie dam rady","w"):'';   // po starcie baza nie przyjmie „Nie dam rady”
  // otwarty zakres: wybór godziny w okienku („Pasuje mi o…”)
  if(open)btns='<div class="pmeta"><b style="color:var(--ink)">Kiedy możesz?</b> (liczba = ilu już wybrało)</div>'+slotsHtml(w,popSel,popOther)
    +'<button type="button" class="b big" data-q="pref"'+(popSel?'':' disabled')+'>Pasuje mi o '+(popSel?hhmm(new Date(popSel)):'…')+'</button>'
    +'<div class="pbtns">'+noB+sm("later","Przypomnij później","g")+'</div>';
  else if(set)btns=joined?big("read","OK 👍 Jedziesz o "+hhmm(d))+'<div class="pbtns">'+noB+'</div>'
    :big("join","Jadę! · "+hhmm(d))+'<div class="pbtns">'+noB+sm("later","Przypomnij później","g")+'</div>';
  else if(!time)btns=joined?big("read","OK 👍 Już jedziesz")+'<div class="pbtns">'+sm("later","Przypomnij później","g")+'</div>'
    :big("join","Jadę! · "+hhmm(d))+'<div class="pbtns">'+noB+sm("later","Przypomnij później","g")+'</div>';
  else btns=joined?big("read","OK 👍")+'<div class="pbtns">'+sm("leave","Rezygnuję","w")+'</div>'
    :big("join","Jadę! · "+hhmm(d))+'<div class="pbtns">'+sm("read","OK","w")+'</div>';
  p.innerHTML='<div class="sheetbox popbox'+grCls(w)+'" role="dialog" aria-modal="true"><button class="sclose" data-q="later" aria-label="Później">✕</button><div class="pcard'+(dir?(dir>0?' inr':' inl'):'')+'">'
   +(isTest(w)?'<span class="ttag" style="margin-right:6px">🧪 TEST</span>':'')+'<span class="ptag">'+(set?'✅ GODZINA USTALONA':time?'🕖 ZMIANA GODZINY':'📩 NOWE ZAPROSZENIE'+(priv&&!wGr(w)?' · 🔒 PRYWATNE':''))+'</span>'+(wGr(w)?' '+grTagHtml(w):'')
   +'<div class="ph">'+nk(actor,"Ktoś")+(wGr(w)&&typeof grRoleTag==="function"?grRoleTag(w,actor):'')+(set?' '+(genders[actor]==="K"?"ustaliła":"ustalił")+' godzinę':time?' '+(genders[actor]==="K"?"zmieniła":"zmienił")+' godzinę':' zaprasza Cię na rower')+'</div>'
   +'<div class="pwhen">'+esc(day+" "+wTime(w))+(dd>=0&&dd<=2?'<span>'+esc(wd)+'</span>':'')+'</div>'
   +(wLate(w)&&!joined?lateNote():'')
   +(open?'<div class="pmeta">🕖 Zakres godzin — wybierz, kiedy możesz; godzinę ustali '+esc(nickOf(w.user_id))+'.</div>':'')
   +(moved&&!open?'<div class="pmeta">'+(fromRange(w)?'✅ Godzina jest już ustalona — powyżej.':'🕖 Godzina była już zmieniana — powyżej aktualna.')+'</div>':'')
   +paceHtml(w)+bikeHtml(w)+durLineHtml(w)+placeHtml(w)+(w.note?'<div class="pnote">💬 '+esc(w.note)+'</div>':'')
   +(w.user_id!==actor&&!time?'<div class="pmeta">Zaproszenie od '+nk(w.user_id)+'</div>':'')
   +(inv.length?popNks("Zaproszeni też",inv,"pinv"+w.id,false):'')
   +(going.length&&!open?popNks("Jadą już",going,"pgo"+w.id,true):'')
   +btns
   +'</div>'
   +(popList.length>1?'<div class="pnav"><button type="button" class="parr" data-pd="-1" aria-label="Poprzednie zaproszenie"'+(popIdx===0?' disabled':'')+'>‹</button>'
     +(popList.length<=6?'<span class="pdots">'+popList.map((_,i)=>'<button type="button" class="pdt'+(i===popIdx?' on':'')+'" data-pi="'+i+'" aria-label="Powiadomienie '+(i+1)+'"><i></i></button>').join("")+'</span>':'')
     +'<button type="button" class="parr" data-pd="1" aria-label="Następne zaproszenie"'+(popIdx===popList.length-1?' disabled':'')+'>›</button></div><div class="pct">'+(popIdx+1)+' z '+popList.length+'</div>':'')
   +'<div class="ptg">Zaproszenie znajdziesz też na Starcie, w karcie dnia.</div></div>';
  p.classList.remove("hide");
}
/* ↔ karuzela zaproszeń w oknie startowym (2026-11-23, wariant C „przesuw”): przeciągnięcie karty palcem, strzałki ‹ › i kropki; karta wjeżdża z boku */
let popSwiped=false;
function popGo(k,dir){k=Math.max(0,Math.min(popList.length-1,k));if(k===popIdx)return;const d=dir||(k>popIdx?1:-1);popIdx=k;renderPop(d)}
(()=>{const sh=$("popsheet");let x0=0,y0=0,card=null,on=false,id=null;
  const snap=()=>{if(!card)return;card.style.transition="transform .22s cubic-bezier(.2,.8,.2,1)";card.style.transform="";card.style.opacity=""};
  sh.addEventListener("pointerdown",e=>{if(popList.length<2||e.pointerType==="mouse"&&e.button)return;card=e.target.closest(".pcard");if(!card)return;x0=e.clientX;y0=e.clientY;on=false;id=e.pointerId;card.style.transition="none"});
  sh.addEventListener("pointermove",e=>{if(!card||e.pointerId!==id)return;const dx=e.clientX-x0,dy=e.clientY-y0;
    if(!on){if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.2)return;on=true;try{sh.setPointerCapture(id)}catch(_){}}
    const edge=(popIdx===0&&dx>0)||(popIdx===popList.length-1&&dx<0);
    card.style.transform="translateX("+(edge?dx*.3:dx)+"px)";card.style.opacity=String(Math.max(.4,1-Math.abs(dx)/(sh.clientWidth*1.2)))});
  const end=e=>{if(!card||e.pointerId!==id)return;const c=card,dx=e.clientX-x0;card=null;if(!on)return;on=false;popSwiped=true;setTimeout(()=>{popSwiped=false},350);
    const d=dx<0?1:-1,ok=Math.abs(dx)>Math.min(110,sh.clientWidth*.22)&&((d>0&&popIdx<popList.length-1)||(d<0&&popIdx>0));
    if(ok){c.style.transition="transform .18s ease-in,opacity .18s";c.style.transform="translateX("+(d>0?"-":"")+"110%)";c.style.opacity="0";setTimeout(()=>popGo(popIdx+d,d),170)}
    else{c.style.transition="transform .22s cubic-bezier(.2,.8,.2,1)";c.style.transform="";c.style.opacity=""}};
  sh.addEventListener("pointerup",end);sh.addEventListener("pointercancel",e=>{if(card&&e.pointerId===id){snap();card=null;on=false}});
  document.addEventListener("keydown",e=>{if(!popOpen()||popList.length<2||/INPUT|TEXTAREA/.test((e.target||{}).tagName||""))return;if(e.key==="ArrowRight")popGo(popIdx+1,1);else if(e.key==="ArrowLeft")popGo(popIdx-1,-1)});
})();
function popNext(){popList=popPending();if(!popList.length){closePop();return}popIdx=Math.min(popIdx,popList.length-1);renderPop()}
$("popsheet").addEventListener("click",async e=>{
  if(popSwiped){popSwiped=false;return}   // klik po przeciągnięciu karty — pomijany
  const it=popList[popIdx];
  if(e.target===$("popsheet")){if(it){popIds(it).forEach(i=>popSnooze.add(i));saveSnooze()}popNext();return}
  const dot=e.target.closest("button[data-pi]");if(dot){popGo(+dot.dataset.pi);return}
  const arr=e.target.closest("button[data-pd]");if(arr){popGo(popIdx+(+arr.dataset.pd),+arr.dataset.pd);return}
  const st=e.target.closest("[data-t]");
  if(st&&it){
    if(st.dataset.t==="oth"){popOther=true;renderPop();const i=$("othtime");if(i)i.focus();return}
    if(st.dataset.t==="othok"){const v=otherTime(it.w);if(v==null){say("Podaj godzinę w dniu zaproszenia (nie w przeszłości).");return}popSel=v;popOther=false;renderPop();return}
    popSel=+st.dataset.t;renderPop();return;
  }
  const b=e.target.closest("button[data-q]");if(!b||!it)return;
  const q=b.dataset.q;
  // ✕ / „Przypomnij później" musi działać zawsze, nawet gdy popBusy wisi po zawieszonym zapytaniu (np. brak sieci)
  if(q==="later"){popIds(it).forEach(i=>popSnooze.add(i));saveSnooze();popBusy=false;popNext();say("Przypomnę przy następnym wejściu. Zaproszenie jest też na Starcie.");return}
  if(popBusy)return;
  const chosen=popSel;
  popBusy=true;
  try{
    if(q==="join"&&!(joins[it.w.id]||[]).includes(uid)){
      if(!await joinClashOk(it.w))return;
      const r=await sb.from("want_joins").insert({want_id:it.w.id});if(r.error)throw r.error;
      try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}
    }
    if(q==="join"&&(decls[it.w.id]||[]).includes(uid))await sb.from("want_declines").delete().eq("want_id",it.w.id).eq("user_id",uid);
    if(q==="pref"){if(!chosen)return;if(!await pickClashOk(it.w,chosen))return;await setPref(it.w,chosen)}
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

/* ---------- 🟡 „Mam ochotę” (KROK 64): sygnał „mam dziś ochotę pojeździć / pobiegać / na spacer / na wędrówkę” ----------
   Okrągły przycisk z machającą dłonią 👋 nad ➕ — tylko gdy na dziś nie ma zaproszeń i nie dałeś jeszcze znać.
   Pod 🔔 sekcja „Mają ochotę dziś” (przy rowerze „Zaproś” → zaproszenie publiczne z zakresem godzin, ta osoba zaproszona).
   Pop-up z zachętą przy pierwszych 3 wejściach. Przełącznik w 🚦 Funkcje testowe: „mam_ochote”. Kanał Telegram wysyła baza. */
const SIG_ACT={bike:["bike","Rower","pojeździć na rowerze"],run:["run","Bieg","pobiegać"],walk:["walk","Spacer","na spacer"],hike:["tree","Trekking","na wędrówkę"]};
let sigs=[],sigOk=false,sigDirty=true,sigDay="",sigBusy=false,sigPick="bike",sigView="",sigDoneT=0;
const sigToday=()=>localIso(new Date()).slice(0,10);
const sigOn=()=>!!session&&visOk&&feat("mam_ochote");
async function sigLoad(){
  if(!sigOn()){sigs=[];return}
  const t=sigToday();if(!sigDirty&&sigDay===t)return;
  const r=await sb.from("ride_signals").select("user_id,activity,is_test,created_at,cancelled_at").eq("day",t).limit(500);
  sigOk=!r.error;sigs=sigOk?(r.data||[]):[];sigDay=t;sigDirty=false;
}
const sigMine=()=>sigs.find(x=>x.user_id===uid);
// widoczne sygnały: bez wycofanych, ukrytych / zablokowanych i (przy „ukryj testowe”) cudzych testowych
const sigList=()=>sigs.filter(x=>!x.cancelled_at&&(x.user_id===uid||!modGone(x.user_id))&&!(hideTest&&x.is_test&&x.user_id!==uid))
  .sort((a,b)=>(a.user_id===uid?-1:b.user_id===uid?1:0)||String(b.created_at).localeCompare(String(a.created_at)));
const sigKey=x=>"sg:"+x.user_id+"|"+x.created_at;
const sigUnread=()=>{if(!sigOn())return [];const s=lsGet("sigSeen")||"",D=bsDone();return sigList().filter(x=>x.user_id!==uid&&x.created_at>s&&!D.has(sigKey(x)))};
const sigTodayBusy=()=>wants.some(w=>dayDiff(new Date(w.starts_at))===0&&!wDone(w)&&!w.is_test&&!(typeof demoIds!=="undefined"&&demoIds.has(w.user_id)));   // testowe i od kont demo nie chowają koła
const sigFabOn=()=>sigOn()&&sigOk&&!is_banned_me()&&!sigTodayBusy()&&!(sigMine()&&!sigMine().cancelled_at);
function is_banned_me(){return typeof modBanned!=="undefined"&&modBanned.has(uid)}
function sigFabSync(fabOn){
  const b=$("sigfab");if(!b)return;
  if(fabOn===undefined)fabOn=!$("fab").classList.contains("hide");
  const done=Date.now()<sigDoneT;
  b.classList.toggle("hide",!fabOn||!(sigFabOn()||done));b.classList.toggle("done",done);
}
// 👋 machająca dłoń (zamiast koła, 2026-11-24): żółta na zielonym tle, taka sama w obu motywach (wariant A), z łukami ruchu — kształt inny niż ✋ w liczniku „Jadę”
const sigWheel='<svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><path class="wva" d="M4.4 10.6a7 7 0 0 1 2.4-4M1.6 9.2a10 10 0 0 1 3.4-5.6" stroke="#f5d04e" stroke-width="2.1" stroke-linecap="round" opacity=".9"/><g transform="translate(-2 -1)"><g class="wvh" stroke="#f5d04e" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M23 14V9.2a1.9 1.9 0 0 0-3.8 0V14M19.2 13V7.4a1.9 1.9 0 0 0-3.8 0V13M15.4 13.4V9.2a1.9 1.9 0 0 0-3.8 0v7.6"/><path d="M23 11.4a1.9 1.9 0 1 1 3.8 0V17a7.6 7.6 0 0 1-7.6 7.6h-1.9c-2.7 0-4.3-.8-5.7-2.2l-3.4-3.4a1.9 1.9 0 0 1 2.7-2.7l2.5 2.5"/></g></g></svg>';
const sigCheck='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="#248a3d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function sigFabHtml(){const b=$("sigfab");if(b)b.innerHTML=Date.now()<sigDoneT?sigCheck:sigWheel}
function closeSig(){$("sigsheet").classList.add("hide");$("sigsheet").innerHTML="";sigView=""}
function openSig(view){if(!session)return;sigView=view||"pick";const m=sigMine();if(m&&SIG_ACT[m.activity])sigPick=m.activity;renderSig()}
function renderSig(){
  const p=$("sigsheet"),intro=sigView==="intro",tg=flags.mam_ochote&&flags.mam_ochote.state==="all";
  // jedno okienko: przy pierwszych wejściach (intro) z zachętą i podpowiedzią, gdzie jest dłoń; z dłoni — sam wybór
  p.innerHTML='<div class="sheetbox popbox sigbox" role="dialog" aria-modal="true"><button class="sclose" data-sg="later" aria-label="Zamknij">✕</button>'
   +'<span class="ptag">MAM OCHOTĘ</span>'
   +'<div class="ph">'+(intro?'Nie masz pomysłu na jazdę, ale masz ochotę pojeździć?':'Na co masz dziś ochotę?')+'</div>'
   +'<div class="pmeta">'+(intro?'Daj znać innym — bez godziny i trasy. Zobaczą to pod 🔔'+(tg?' i na kanale Telegram':'')+' i mogą Cię zaprosić.'
      :'Bez godziny i trasy. Inni zobaczą to pod 🔔'+(tg?' i na kanale Telegram':'')+'.')+'</div>'
   +'<div class="wbike sigacts">'+Object.keys(SIG_ACT).map(k=>'<button type="button" class="wbk'+(sigPick===k?' on':'')+'" data-sga="'+k+'" aria-pressed="'+(sigPick===k)+'">'+uiIcon(SIG_ACT[k][0])+'<span>'+SIG_ACT[k][1]+'</span></button>').join("")+'</div>'
   +'<button type="button" class="b big" data-sg="send"'+(sigBusy?' disabled':'')+'>Daj znać</button>'
   +'<div class="pbtns"><button type="button" class="b w" data-sg="later">'+(intro?'Później':'Nie teraz')+'</button></div>'
   +(intro?'<div class="signote"><span class="sigmini">'+sigWheel+'</span>Później znajdziesz to pod dłonią 👋 w prawym dolnym rogu ekranu.</div>':'')
   +'</div>';
  p.classList.remove("hide");
}
async function sigSend(){
  if(sigBusy)return;sigBusy=true;renderSig();
  try{
    const m=sigMine();let r;
    if(m)r=await sb.from("ride_signals").update({activity:sigPick,cancelled_at:null}).eq("user_id",uid).eq("day",sigDay||sigToday()).select("user_id");
    else r=await sb.from("ride_signals").insert({activity:sigPick}).select("user_id");
    if(r.error)throw r.error;
    if(!r.data||!r.data.length)throw new Error("funkcja jest jeszcze tylko dla testerów");
    sigBusy=false;closeSig();
    try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}
    sigDoneT=Date.now()+2600;sigFabHtml();sigFabSync();
    setTimeout(()=>{sigFabHtml();sigFabSync()},2700);
    say((genders[uid]==="K"?"Dałaś":"Dałeś")+" znać ✔ "+SIG_ACT[sigPick][1]+", dziś — inni zobaczą pod 🔔.");
    sigDirty=true;await syncNow();
  }catch(e){sigBusy=false;renderSig();
    say(e&&/BANNED/.test(e.message||"")?"Konto zablokowane — napisz do administratora.":"Nie udało się: "+(e&&e.message?e.message:"błąd"))}
}
async function sigCancel(){
  try{const r=await sb.from("ride_signals").update({cancelled_at:new Date().toISOString()}).eq("user_id",uid).eq("day",sigDay||sigToday()).select("user_id");
    if(r.error)throw r.error;sigDirty=true;await syncNow();say("Wycofane — przycisk z dłonią wrócił nad ➕.")}
  catch(e){say("Nie udało się: "+(e&&e.message?e.message:"błąd"))}
}
// 🔔 sekcja „Mają ochotę dziś”
function sigRow(x,un){
  const a=SIG_ACT[x.activity]||SIG_ACT.bike,me=x.user_id===uid,d=new Date(x.created_at);
  const btn=me?'<button type="button" class="lnk stgo" data-sgx="1">Wycofaj</button>'
    :x.activity==="bike"?'<button type="button" class="lnk stgo" data-sgz="'+esc(x.user_id)+'">Zaproś ›</button>':'';
  return '<div class="nit stn sgrow'+(un?' new':'')+'"><div class="ic">'+uiIcon(a[0])+'</div><div class="tx">'+(me?'<b>Ty</b>':nk(x.user_id))
    +(x.is_test?' <span class="ttag">🧪 TEST</span>':'')+'<div class="w">'+esc(a[1].toLowerCase())+' · '+esc(hhmm(d))+'</div></div>'+btn+(un?bsMk(sigKey(x)):'')+'</div>';
}
function sigBellHtml(){
  if(!sigOn())return "";
  const L=sigList();if(!L.length)return "";
  const U=new Set(sigUnread());
  return bsSec("sig",'🚲 Mają ochotę dziś',U.size,L.length,L.slice().sort((a,b)=>(U.has(b)?1:0)-(U.has(a)?1:0)).map(x=>sigRow(x,U.has(x))).join("")
    +'<div class="bsempty">Bez godziny i trasy. „Zaproś” otwiera zaproszenie na dziś z zakresem godzin — domyślnie widzi je tylko ta osoba (dostanie powiadomienie); w „Kto zobaczy?” możesz dopisać innych.</div>');
}
// pop-up z zachętą: pierwsze 3 wejścia (raz na uruchomienie), tylko gdy przycisk z dłonią jest widoczny
// (gdy przy starcie otwarta jest Pomoc albo inne okienko — pokazuje się zaraz po jego zamknięciu, najpóźniej 3 min od startu)
let sigIntroDone=false;const sigT0=Date.now();
function maybeSigIntro(){
  if(sigIntroDone||Date.now()-sigT0>18e4||!sigFabOn()||$("fab").classList.contains("hide"))return;
  const n=+(lsGet("sigIntro")||0);if(n>=3){sigIntroDone=true;return}
  if([...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide"))||gearOpen||needProfile()||pwMode||!$("wantform").classList.contains("hide"))return;
  sigIntroDone=true;lsSet("sigIntro",String(n+1));openSig("intro");
}
{const mo=new MutationObserver(()=>{if(!sigIntroDone)setTimeout(maybeSigIntro,450)});document.querySelectorAll(".sheet").forEach(el=>{if(el.id!=="sigsheet")mo.observe(el,{attributes:true,attributeFilter:["class"]})})}
$("sigfab").innerHTML=sigWheel;
$("sigfab").onclick=()=>{if(Date.now()<sigDoneT)return;openSig("pick")};
$("sigsheet").addEventListener("click",e=>{
  if(e.target===$("sigsheet")){closeSig();return}
  const a=e.target.closest("[data-sga]");if(a){sigPick=a.dataset.sga;renderSig();return}
  const b=e.target.closest("[data-sg]");if(!b)return;
  const k=b.dataset.sg;
  if(k==="later")closeSig();else if(k==="send")sigSend();
});
