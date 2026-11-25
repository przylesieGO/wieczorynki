/* ---------- 🔔 dzwonek: lista powiadomień (do Ciebie / Twoje zaproszenia) ---------- */
const ME_KINDS=["invite","time","set","info","added"],OWN_KINDS=["join","pref","leave","decline","rejoin","added"];   // rejoin — KROK 46; added — KROK 101 (dopisany do zaproszenia z sygnału)
const N_ICON={invite:"📩",time:"🕖",set:"✅",info:"✏️",join:"🙋",pref:"🕖",leave:"👋",decline:"🙅",rejoin:"🔁",added:"➕"};
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
    case "added":return who+' '+v("dopisany","dopisana")+' do ekipy';   // 🤝 KROK 101: actor = dopisana osoba
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
  const sub=mine?[noteInl(w.note),isOpen(w)?'🕖 do ustalenia':'','🚴 jedzie '+(jn+1),dn?'🙅 '+dn:''].filter(Boolean).join(' · ')
    :[when,noteInl(w.note),joined?'🚴 Jedziesz':dec?'Nie dasz rady':act?(wLate(w)?'🏃 ruszyła — możesz jeszcze dogonić!':'⏳ czeka na Twoją odpowiedź'):''].filter(Boolean).join(' · ');
  const sent=!mine&&!un.length&&wSentAt(w)?' · <span class="nsent">wysłane '+agoTxt(wSentAt(w))+'</span>':'';   // przeczytane: kiedy przyszło (nieprzeczytane mają to w ramce nowości)
  // 🔒 prywatne zaproszenie od kogoś: kogo jeszcze zaproszono (prośba właściciela 2026-11-25; pełna lista — na karcie zaproszenia)
  const oi=!mine&&isPriv(w)?favFirst(invIds(w).filter(x=>x!==uid&&x!==w.user_id&&nicks[x])):[];
  const inv=oi.length?'<div class="w ninv">'+uiIcon("users")+' Zaproszeni też: '+oi.slice(0,3).map(x=>'<b>'+esc(nickOf(x))+'</b>').join(", ")+(oi.length>3?' +'+(oi.length-3):'')+'</div>':'';
  const news=un.length?'<div class="nnews">'+N_ICON[un[0].kind]+' '+newsTxt(un[0],w)+' · '+agoTxt(un[0].created_at)+(un.length>1?' <span class="nmore">+'+(un.length-1)+'</span>':'')+'</div>':'';
  const btns=act?'<div class="sb">'+(isOpen(w)?'<button type="button" class="b" data-na="pref" data-wid="'+esc(w.id)+'">Pasuje mi o…</button>'
      :'<button type="button" class="b" data-na="join" data-wid="'+esc(w.id)+'">Jadę! · '+esc(hhmm(new Date(w.starts_at)))+'</button>')
    +(wDeclOk(w)?'<button type="button" class="b w" data-na="no" data-wid="'+esc(w.id)+'">Nie dam rady</button>':'')+'</div>':'';
  return '<div class="nit'+(mine?' mine':'')+(un.length?' new':'')+(isTest(w)?' test':'')+grCls(w)+'" data-wid="'+esc(w.id)+'"><div class="ic">'+(mine?'🙋':isPriv(w)?'📩':'🌍')+'</div>'
   +'<div class="tx">'+testTag(w)+wTitleHtml(w)+title+'<div class="w">'+sub+sent+'</div>'+inv+news+btns+'</div>'+(un.length?(act?'<span class="dot"></span>':bsMk("w:"+w.id)):'')+'</div>';
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
const bellUnread=()=>notifs.filter(n=>!n.read_at&&nWant(n)&&!wDone(nWant(n))&&(ME_KINDS.includes(n.kind)||OWN_KINDS.includes(n.kind)));
function renderBell(){
  const b=$("bellbtn");if(!b)return;
  const on=!!session&&visOk,n=on?bellUnread().length+fbMineUnread().length+fbAdmUnread().length+nuUnread().length+stepsBadge()+evBellUn().length+repTodoN()+sigUnread().length+sigNotifUn().length+(typeof grBellN==="function"?grBellN():0)+(typeof svBellN==="function"?svBellN():0):0,bd=$("bellbadge");
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
// 🔔 otwarta lista nie przeskakuje przy odświeżeniu w tle (2026-11-24): kolejność sekcji i zwinięcie z poprzedniego widoku (bsLive)
let bsLive=null;
function bsSec(k,title,un,total,body){
  const st=bsColGet(),col=k in st?!!st[k]:bsLive&&k in bsLive.col?bsLive.col[k]:!un;
  return '<button type="button" class="bsec bsect'+(col?' col':'')+(un?' unr':'')+'" data-bsec="'+k+'" aria-expanded="'+(!col)+'"><span class="bst">'+title+'</span>'
   +(un?'<span class="cnt">'+un+'</span>':col&&total?'<span class="cnt0">'+total+'</span>':'')
   +'<svg class="bschev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>'
   +'<div class="bsecb'+(col?' hide':'')+'">'+(un&&BS_MK[k]?'<div class="bsmka"><button type="button" class="lnk" data-mks="'+k+'">'+uiIcon("check")+' Oznacz sekcję jako przeczytane</button></div>':'')+body+'</div>';
}
// zaproszenia widoczne w 🔔: „Do Ciebie” i „Twoje” — nieprzeczytane i czekające na odpowiedź na górze
function bsWants(){
  // zaproszenie znika spod 🔔, gdy jazda się skończy (start + czas trwania; 2026-11-25) — zakończone są w archiwum
  const act=w=>!wDone(w);
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
  const prevS=p.classList.contains("hide")?[]:[...p.querySelectorAll(".bsect[data-bsec]")];
  bsLive=prevS.length?{ord:prevS.map(b=>b.dataset.bsec),col:Object.fromEntries(prevS.map(b=>[b.dataset.bsec,b.classList.contains("col")]))}:null;
  const keep=p.querySelector(".bslist"),st=keep?keep.scrollTop:0,nu=bellUnread().length+nuUnread().length+lgUnread().length+dlUnread().length+evBellUn().length+sigUnread().length+sigNotifUn().length+(typeof grPostUnN==="function"?grPostUnN():0)+(typeof svBellN==="function"?svBellN():0),EVB=evBellItems(),EVu=new Set(evBellUn().map(evKey)),LG=lgRows(),LGu=new Set(lgUnread()),DL=dlRows(),DLu=new Set(dlUnread()),LS=lsRows(),NU=nuList(),NUu=new Set(nuUnread()),SA=stepsAvail()?stepsList():[],SL=SA.filter(x=>!x.ok),uf=(L,U,g)=>L.slice().sort((a,b)=>(U.has(g(b))?1:0)-(U.has(g(a))?1:0)),sid=x=>x;
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
  const bsK=h=>(h.match(/data-bsec="([^"]+)"/)||[])[1],bsI=h=>{const i=bsLive?bsLive.ord.indexOf(bsK(h)):-1;return i<0?999:i};
  SEC.sort((a,b)=>bsLive?bsI(a)-bsI(b):bsUn(b)-bsUn(a));   // sekcje z nowościami na górze — tylko przy otwarciu; potem kolejność stoi
  const head='<div class="bshead"><button type="button" class="lnk" data-bk="close">Zamknij</button><b>🔔 Powiadomienia</b>'
   +(nu?'<button type="button" class="lnk" data-bk="all" style="text-align:right">✓ Przeczytane</button>':'<span style="min-width:64px"></span>')+'</div>',list=SEC.join("");
  // okno już otwarte: podmiana tylko tego, co się zmieniło (bez ponownej animacji okna i migania) — 2026-11-24
  const box=p.classList.contains("hide")?null:p.querySelector(".bsbox");
  if(box&&box.querySelector(".bshead")&&keep){
    if(p._bsH!==head){box.querySelector(".bshead").outerHTML=head;p._bsH=head}
    if(p._bsL!==list){keep.innerHTML=list;keep.scrollTop=st;p._bsL=list}
    return}
  p._bsH=head;p._bsL=list;
  p.innerHTML='<div class="bsbox" role="dialog" aria-modal="true" aria-label="Powiadomienia"><div class="bsgrab"></div>'
   +head
   +'<div class="bslist">'+list+'</div><div class="bshint">Podświetlone = nowe. Znaczek ✓ oznacza pozycję jako przeczytaną (albo całą sekcję). Dotknij nagłówka, żeby zwinąć lub rozwinąć.</div></div>';
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
    const mine=wants.filter(x=>x.user_id===uid&&!wDone(x)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
    myIdx=Math.max(0,mine.findIndex(x=>x.id===w.id));renderWants();
    el=document.querySelector('#mywant .want[data-wid="'+w.id+'"]');
  }else{
    const k=localIso(new Date(w.starts_at)).slice(0,10);wantOpenDay=k;
    const ord=wants.filter(x=>localIso(new Date(x.starts_at)).slice(0,10)===k&&!wDone(x)&&!wAbove(x))
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
  if(e.target.closest("[data-sgx]")){closeBell();sigCancel();return}
  if(e.target.closest("[data-sge]")){closeBell();openSig("pick");return}
  if(e.target.closest("[data-sgsup]")){closeBell();sigInviteSuper();return}   // 🚲 „Super ekipa ›”
  const sga=e.target.closest("[data-sgadd]");if(sga){const [wid,ids]=sga.dataset.sgadd.split("|");closeBell();sigAddTo(wid,ids.split(","));return}   // 🚲 „Dopisz ›” (KROK 92b)
  const sgw=e.target.closest("[data-sgw]");if(sgw){const w=wants.find(x=>x.id===sgw.dataset.sgw);closeBell();if(w)goToWant(w);return}   // 🚲 „Jedziecie razem ›” (KROK 92)
  const sgc=e.target.closest("[data-sgc]");if(sgc){closeBell();sigInviteEkipa(sgc.dataset.sgc);return}   // 🚲 „Zaproś ekipę ›”
  const sgcx=e.target.closest("[data-sgcx]");if(sgcx){markRead([sgcx.dataset.sgcx]);renderBellSheet();return}   // ✓ „wycofał(a) sygnał” (KROK 91)   // ✏️ „Zmień” własny sygnał (KROK 90)
  const sgr=e.target.closest("[data-sgr]");if(sgr){sigReact(sgr.dataset.sgr);return}   // 👋 „Też mam ochotę”
  const sgh=e.target.closest("[data-sgh]");if(sgh){sigHideMsg(sgh.dataset.sgh);return}   // 🛡️ admin ukrywa komunikat
  const mk1=e.target.closest("[data-mk]");   // ✓ przy pozycji
  if(mk1){const k=mk1.dataset.mk;
    if(k.startsWith("w:")){const w=wants.find(x=>x.id===k.slice(2));if(w)markRead(wUnread(w).filter(n=>!nNeedsAct(n)).map(n=>n.id))}
    else if(k.startsWith("sg:"+uid+"|"))markRead(sigReactUn().map(n=>n.id));   // 👋 reakcje na mój sygnał
    else{bsDoneAdd([k]);renderBell()}
    return}
  const mks=e.target.closest("[data-mks]");   // ✓ cała sekcja
  if(mks){const k=mks.dataset.mks;
    if(k==="nu")nuMarkSeen();else if(k==="lg")lsSet("lgSeen",String(Date.now()));else if(k==="dl")lsSet("dlSeen",String(Date.now()));
    else if(k==="ev")lsSet("evBell",String(Date.now()));else if(k==="sig"){lsSet("sigSeen",new Date().toISOString());markRead(sigNotifUn().map(n=>n.id))}
    else if(k==="forme"||k==="mine"){markRead(bsWants()[k].flatMap(w=>wUnread(w).filter(n=>!nNeedsAct(n)).map(n=>n.id)));return}
    renderBell();return}
  const rpb=e.target.closest("[data-rep]");if(rpb){const id=rpb.dataset.rep;closeBell();repAskedAdd(id);openReport(id);return}
  const sc=e.target.closest("[data-bsec]");
  if(sc){const k=sc.dataset.bsec,st=bsColGet(),col=!sc.classList.contains("col");st[k]=col;if(k==="sig"&&!col)sigEkipaAutoRead();try{localStorage.setItem("bellCol",JSON.stringify(st))}catch(err){}
    renderBellSheet();return}
  if(fr){const f=fbList.find(x=>x.id===fr.dataset.fb);closeBell();fbOpen(fr.dataset.fb,f&&f.user_id!==uid&&isAdmin?"fbadmin":"bell");return}
  if(e.target===p){closeBell();return}
  const k=e.target.closest("[data-bk]");
  if(k){
    if(k.dataset.bk==="close")closeBell();
    else if(k.dataset.bk==="new"){closeBell();show(0);openWantForm(null)}
    else{nuMarkSeen();lsSet("lgSeen",String(Date.now()));lsSet("dlSeen",String(Date.now()));lsSet("evBell",String(Date.now()));lsSet("sigSeen",new Date().toISOString());if(typeof grPostReadAll==="function")grPostReadAll();await markRead(bellUnread().map(n=>n.id).concat(typeof svBellRead==="function"?svBellRead():[],sigNotifUn().map(n=>n.id)));renderBell();renderBellSheet()}
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
function popNks(lbl,ids,k,cnt){   // 👥 osoby w okienku zaproszenia: zawsze ta sama lista, przewijana góra–dół bez ramek (ok. 3 wiersze — 23:22), ulubieni na początku
  return '<div class="pnks"><div class="pmeta">'+lbl+(cnt?' ('+ids.length+')':'')+':</div><div class="nks">'+favFirst(ids).map(id=>nk(id)).join("")+'</div></div>';
}
// 🤝 zaproszenie od EKIPY / SUPER EKIPY (prośba właściciela 2026-11-25 22:21–22:55 — „ważna funkcjonalność”, ma być wyraźnie widać):
// z sygnału „Mam ochotę” (from_sig, KROK 101) → ekipa; z klamry (tytuł „SUPER EKIPA”) → super. W okienku złoty pas na górze ze złotą monetą z dłonią.
// znaczek „wysłał(a) sygnał”: złota moneta z dłonią + mały piorun, bez tekstu, przed nickiem autora (23:23)
const pekSig=u=>'<span class="pekby" title="'+(genders[u]==="K"?'Wysłała':'Wysłał')+' sygnał „Mam ochotę”" aria-label="'+(genders[u]==="K"?'Wysłała':'Wysłał')+' sygnał „Mam ochotę”">'+sigCoin()+'<i class="pekbolt">'+uiIcon("bolt")+'</i></span>';
const EK_GEN={bike:"jazdy",run:"biegu",walk:"spaceru",hike:"wędrówki"};   // „Doczekałeś się jazdy / biegu…!” — nowa aktywność bez wpisu: „wspólnego wyjścia”
const wEkipaKind=w=>!w?"":/^super ekipa/i.test(String(w.title||"").trim())?"super":w.from_sig?"ekipa":"";
function popEkipaHtml(w,inv){const k=wEkipaKind(w);if(!k)return "";const n=new Set([w.user_id,uid].concat(inv||[],joins[w.id]||[])).size;   // autor + ja + zaproszeni + dołączeni
  // jednowierszowy pas (23:33): moneta · EKIPA / SUPER EKIPA · 👥 liczba
  return '<div class="pekb">'+sigCoin()+'<b class="pekt">'+(k==="super"?'SUPER EKIPA':'EKIPA')+'</b><span class="pekn" title="'+n+' '+plf(n,["osoba","osoby","osób"])+' w ekipie">'+uiIcon("users")+'<b>'+n+'</b></span></div>'}
function popEkFrom(w,inv,actor){const A=wEkipaKind(w)==="super"?popSigAuthors(w,inv):[];
  if(A.length>=2)return '<div class="pekfrom">Ekipy '+A.slice(0,2).map(u=>'<span class="pekwho">'+pekSig(u)+nk(u)+'</span>').join('<span class="pekplus">+</span>')+(A.length>2?'<span class="pekplus">+'+(A.length-2)+'</span>':'')+'</div>';
  return '<div class="pekfrom">Zaprasza '+(actor===w.user_id?pekSig(actor):'')+nk(actor,"Ktoś")+'</div>'}
// SUPER EKIPA: autorzy dzisiejszych sygnałów tej aktywności wśród osób zaproszenia (autor zaproszenia pierwszy) — „Ekipy ⚡Stulls + ⚡TOSTER” (23:28–23:33)
function popSigAuthors(w,inv){const act=w.activity||"bike",P=[w.user_id,uid].concat(inv||[],joins[w.id]||[]);
  const S=new Set((typeof sigs!=="undefined"?sigs:[]).filter(x=>!x.cancelled_at&&(x.activity||"bike")===act).map(x=>x.user_id));
  return [...new Set(P)].filter(u=>S.has(u))}
function renderPop(dir){   // dir: -1 / 1 = karta wjeżdża z lewej / prawej (przesuw), bez dir — bez animacji
  const p=$("popsheet"),it=popList[popIdx];if(!it){closePop();return}
  const {n,w,moved}=it,d=new Date(w.starts_at),wd=d.toLocaleDateString("pl-PL",{weekday:"long"}),dd=dayDiff(d);
  const day=dd>=0&&dd<=2?["Dziś","Jutro","Pojutrze"][dd]:wd.charAt(0).toUpperCase()+wd.slice(1)+" "+d.getDate()+" "+MON3[d.getMonth()].toLowerCase();
  const joined=(joins[w.id]||[]).includes(uid),priv=isPriv(w),actor=n.actor||w.user_id,time=n.kind==="time",set=n.kind==="set",open=isOpen(w);
  if(popSelFor!==w.id){popSelFor=w.id;popOther=false;const my=(prefs[w.id]||{})[uid];popSel=my?tkey(my):null}
  const inv=priv?invIds(w).filter(x=>x!==uid):[],going=(joins[w.id]||[]).filter(x=>x!==uid&&x!==w.user_id);
  const big=(q,t)=>'<button type="button" class="b big" data-q="'+q+'">'+t+'</button>';
  const sm=(q,t,c)=>'<button type="button" class="b '+c+'" data-q="'+q+'">'+t+'</button>';
  // już zapisany (kliknięte „Jadę!”): zamiast przycisku-potwierdzenia zielony wiersz stanu + „Rezygnuję” i „OK” (prośba 22:57–23:01, bez emotek)
  const jOK=t=>'<button type="button" class="pjoined" data-q="read">'+uiIcon("check")+'<span>'+esc(t)+' — jesteś na liście</span></button><div class="pbtns">'+sm("leave","Rezygnuję","w")+'</div>';   // zielony wiersz = „OK” (zamyka i odhacza), bez osobnego OK (23:05)
  let btns;const noB=wDeclOk(w)?sm("no","Nie dam rady","w"):'',AV=actOf(w.activity);   // 🏃 KROK 94: „Biegnę!” / „Biegniesz” przy biegu   // po starcie baza nie przyjmie „Nie dam rady”
  // otwarty zakres: wybór godziny w okienku („Pasuje mi o…”)
  if(open)btns='<div class="pmeta"><b style="color:var(--ink)">Kiedy możesz?</b> (liczba = ilu już wybrało)</div>'+slotsHtml(w,popSel,popOther)
    +'<button type="button" class="b big" data-q="pref"'+(popSel?'':' disabled')+'>Pasuje mi o '+(popSel?hhmm(new Date(popSel)):'…')+'</button>'
    +'<div class="pbtns">'+noB+sm("later","Przypomnij później","g")+'</div>';
  else if(set)btns=joined?jOK(AV.verb_you+" o "+hhmm(d))
    :big("join",AV.verb+"! · "+hhmm(d))+'<div class="pbtns">'+noB+sm("later","Przypomnij później","g")+'</div>';
  else if(!time)btns=joined?jOK(AV.verb_you)
    :big("join",AV.verb+"! · "+hhmm(d))+'<div class="pbtns">'+noB+sm("later","Przypomnij później","g")+'</div>';
  else btns=joined?jOK(AV.verb_you+" o "+hhmm(d))
    :big("join",AV.verb+"! · "+hhmm(d))+'<div class="pbtns">'+sm("read","OK","w")+'</div>';
  p.innerHTML='<div class="sheetbox popbox'+grCls(w)+(priv?' ppriv':'')+(wEkipaKind(w)?' pekipa':'')+'" role="dialog" aria-modal="true"><button class="sclose" data-q="later" aria-label="Później">✕</button><div class="pcard'+(dir?(dir>0?' inr':' inl'):'')+'">'+popEkipaHtml(w,inv)
   +(isTest(w)?'<span class="ttag" style="margin-right:6px">'+uiIcon("flask")+' TEST</span>':'')+(set||time||!wEkipaKind(w)?'<span class="ptag">'+(set?'✅ GODZINA USTALONA':time?'🕖 ZMIANA GODZINY':'📩 NOWE ZAPROSZENIE')+'</span>':'')+(priv&&!wGr(w)&&!wEkipaKind(w)?' <span class="lockt priv">🔒 prywatne</span>':'')+(wGr(w)?' '+grTagHtml(w)+(priv?'<span class="sgpriv pp">'+uiIcon("lock")+' prywatne</span>':''):'')
   +(wEkipaKind(w)&&!set&&!time?'<div class="ph">'+(genders[uid]==="K"?'Doczekałaś':'Doczekałeś')+' się '+esc(EK_GEN[w.activity||"bike"]||'wspólnego wyjścia')+'!</div>'+popEkFrom(w,inv,actor):'')
   +(wEkipaKind(w)&&!set&&!time?'':'<div class="ph">'+(wEkipaKind(w)&&actor===w.user_id?pekSig(actor):'')+nk(actor,"Ktoś")+(wGr(w)&&typeof grRoleTag==="function"?grRoleTag(w,actor):'')+(set?' '+(genders[actor]==="K"?"ustaliła":"ustalił")+' godzinę':time?' '+(genders[actor]==="K"?"zmieniła":"zmienił")+' godzinę':' zaprasza Cię '+(actOf(w.activity).invite_txt||'na rower'))+'</div>')   // 🤝 ekipa: „Doczekałeś się jazdy!” zamiast „zaprasza Cię” (23:05–23:08)
   +'<div class="pwhen">'+esc(day+" "+wTime(w))+(dd>=0&&dd<=2?'<span>'+esc(wd)+'</span>':'')+'</div>'
   +(wLate(w)&&!joined?lateNote():'')
   +(open?'<div class="pmeta">🕖 Zakres godzin — wybierz, kiedy możesz; godzinę ustali '+esc(nickOf(w.user_id))+'.</div>':'')
   +(moved&&!open?'<div class="pmeta">'+(fromRange(w)?'✅ Godzina jest już ustalona — powyżej.':'🕖 Godzina była już zmieniana — powyżej aktualna.')+'</div>':'')
   +paceHtml(w)+bikeHtml(w)+durLineHtml(w)+(typeof wxHtml==="function"?wxHtml(w):'')+placeHtml(w)+noteHtml(w.note,"pnote")   // 🌡 pogoda jak na karcie (prośba 22:55)
   +(w.user_id!==actor&&!time?'<div class="pmeta">Zaproszenie od '+nk(w.user_id)+'</div>':'')
   +(inv.length?popNks("Zaproszeni też",inv,"pinv"+w.id,false):'')
   +(going.length&&!open?popNks("Dołączyli",going,"pgo"+w.id,true):'')
   +btns
   +'</div>'
   +(popList.length>1?'<div class="pnav"><button type="button" class="parr" data-pd="-1" aria-label="Poprzednie zaproszenie"'+(popIdx===0?' disabled':'')+'>‹</button>'
     +(popList.length<=6?'<span class="pdots">'+popList.map((_,i)=>'<button type="button" class="pdt'+(i===popIdx?' on':'')+'" data-pi="'+i+'" aria-label="Powiadomienie '+(i+1)+'"><i></i></button>').join("")+'</span>':'')
     +'<button type="button" class="parr" data-pd="1" aria-label="Następne zaproszenie"'+(popIdx===popList.length-1?' disabled':'')+'>›</button></div><div class="pct">'+(popIdx+1)+' z '+popList.length+'</div>':'')
   +'<div class="ptg">Zaproszenie znajdziesz też na Starcie, w karcie dnia.</div></div>';
  p.classList.remove("hide");
  if(typeof fillWx==="function")fillWx();
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

/* ---------- 🟡 „Mam ochotę” (KROK 64, 2.0 — KROK 90): sygnał „mam dziś ochotę pojeździć / pobiegać / na spacer / na wędrówkę” ----------
   Okrągły przycisk z machającą dłonią 👋 nad ➕ — tylko gdy na dziś nie ma zaproszeń i nie dałeś jeszcze znać.
   Okienko: aktywność → komunikat (4 gotowe + „Inne…”, do 40 znaków). 3.0 (2026-11-25): bez „Kto zobaczy?” — sygnał zawsze dla wszystkich; zaprasza tylko autor.
   Pod 🔔 sekcja „Ekipa na dziś” (dawniej „Mają ochotę dziś”): komunikat, „Zaproś ›” (każda aktywność, KROK 94), „👋 Też mam ochotę” (reakcje się sumują), u autora „Zmień” / „Wycofaj”.
   Pop-up „X ma ochotę” (raz na sygnał, kilka naraz — przewijane w bok); wyłącznik: ⚙️ → Jazdy i zaproszenia.
   Pop-up z zachętą przy pierwszych 3 wejściach. Przełącznik w 🚦 Funkcje testowe: „mam_ochote”. Kanał Telegram wysyła baza (tylko „Wszyscy”). */
// 🏃 KROK 94: aktywności z bazy (actOf / actAvail w js/03) — [ikona, nazwa, „ma ochotę …”]
const sigA=k=>{const a=actOf(k);return [a.icon||"bike",a.name,a.want_txt]};
const sigMsgs=k=>actOf(k).msgs||[];
const sigActKeys=()=>{const k=actAvail().map(x=>x.key);return k.length?k:["bike"]};   // do wyboru w okienku: „Wszyscy” (+ „Tylko testerzy” dla testerów)
let sigs=[],sigOk=false,sig2Ok=false,sigDirty=true,sigDay="",sigBusy=false,sigPick="bike",sigView="",sigDoneT=0;
let sigSoon={},sigReacts={},sigTo={},sigSeenDb=new Map(),sigSeenOk=false,sigBusyO=new Set();   // KROK 92: sigSeenDb {autor|czas sygnału → OK}   // KROK 90: reakcje {autor:[kto]} i odbiorcy prywatnych {autor:[kto]} (widoczne wg reguł bazy)
const sg={msg:"",own:false,vis:"all",pick:new Set(),gr:""};   // okienko: komunikat (own = „Inne…”), „Kto zobaczy?”
let sigPopQ=[],sigPopI=0;
const sigToday=()=>localIso(new Date()).slice(0,10);
const sigOn=()=>!!session&&visOk&&feat("mam_ochote");
async function sigLoad(){
  if(!sigOn()){sigs=[];return}
  const t=sigToday();if(!sigDirty&&sigDay===t)return;
  const dayCh=!!sigDay&&sigDay!==t;   // 🌙 minęła północ — wczorajsze sygnały wygasły (otwarte okienko zamyka się w sigDayOver)
  let r=await sb.from("ride_signals").select("user_id,activity,is_test,created_at,cancelled_at,msg,vis,msg_hidden").eq("day",t).limit(500);
  sig2Ok=!r.error;
  if(r.error)r=await sb.from("ride_signals").select("user_id,activity,is_test,created_at,cancelled_at").eq("day",t).limit(500);   // baza bez KROKU 90
  sigOk=!r.error;sigs=sigOk?(r.data||[]):[];sigDay=t;sigDirty=false;
  sigReacts={};sigTo={};
  if(sig2Ok&&sigs.length){
    const [a,b]=await Promise.all([sb.from("ride_signal_reacts").select("owner,user_id,created_at").eq("day",t).order("created_at").limit(2000),
      sb.from("ride_signal_to").select("owner,user_id").eq("day",t).limit(2000)]);
    if(!a.error)(a.data||[]).forEach(x=>(sigReacts[x.owner]=sigReacts[x.owner]||[]).push(x.user_id));
    if(!b.error)(b.data||[]).forEach(x=>(sigTo[x.owner]=sigTo[x.owner]||[]).push(x.user_id));
    // 👁 KROK 92: okienka „X ma ochotę” widziane / „OK” — zapamiętane na koncie (nie w przeglądarce)
    const c=await sb.from("ride_signal_seen").select("owner,sig_at,ok").gte("sig_at",new Date(Date.now()-36*36e5).toISOString()).limit(500);
    sigSeenOk=!c.error;sigSeenDb=new Map();if(sigSeenOk)(c.data||[]).forEach(x=>sigSeenDb.set(sigSk(x.owner,x.sig_at),!!x.ok));
    // 🚲 KROK 92b: sygnały, których ekipa już jedzie (zaproszenie prywatne, mnie w nim nie ma) — tylko tak/nie
    const bz=await sb.rpc("sig_busy_list");sigBusyO=new Set(bz.error?[]:(bz.data||[]).map(x=>typeof x==="string"?x:x.sig_busy_list||Object.values(x)[0]));
    // 🔒 KROK 101: ekipy zamknięte 15 min po starcie wspólnego zaproszenia — sygnał znika z listy, bez Reakcji i powiadomień
    const cl=await sb.rpc("sig_closed_list");const CL=new Set(cl.error?[]:(cl.data||[]).map(x=>typeof x==="string"?x:x.sig_closed_list||Object.values(x)[0]));
    sigs.forEach(x=>{x.closed=CL.has(x.user_id)});
    // ⏱ KROK 102: start i liczba zadeklarowanych wspólnego zaproszenia ekipy (licznik „Ekipa startuje o …” przy sygnale)
    const sn=await sb.rpc("sig_soon_list");sigSoon={};if(!sn.error)(sn.data||[]).forEach(x=>{sigSoon[x.owner]={at:new Date(x.starts_at),n:x.n}});
  }
  if(dayCh)sigDayOver();
}
// 🌙 sygnał „Mam ochotę” obowiązuje tylko w dniu wysłania (2026-11-25): po północy otwarte okienko sygnału zamyka się z komunikatem,
// a „Też mam ochotę!” / „Zaproś …” z okienka otwartego przed północą nie milczą (wcześniej klik po cichu nic nie robił)
const sigStale=()=>!!sigDay&&sigDay!==sigToday();
const SIG_GONE="Ten sygnał wygasł o północy — „Mam ochotę” obowiązuje tylko w dniu wysłania.";
function sigDayOver(){
  if((sigView==="pop"||sigView==="mine")&&!$("sigsheet").classList.contains("hide")){closeSig();say(SIG_GONE)}   // „Daj znać” (pick) zostaje — wyśle dzisiejszy sygnał
  try{if(!$("wantform").classList.contains("hide")&&wf.sigFor)wfUpdate()}catch(e){}   // formularz z sygnału: ostrzeżenie o innym dniu
}
// sprawdzenie przed akcją: wygasły (po północy) albo zniknął → komunikat, zamknięcie okienka i odświeżenie
function sigGoneCheck(x){
  if(!sigStale()&&x&&!x.cancelled_at)return false;
  if(sigView)closeSig();say(sigStale()?SIG_GONE:"Ten sygnał nie jest już aktywny.");
  sigDirty=true;Promise.resolve(syncNow()).catch(()=>{});return true;
}
// ⏳ ile zostało do północy — sygnał i wspólne zaproszenie ekipy liczą się tylko dziś; widać od 21:00, w ostatniej godzinie pomarańczowe (2026-11-25)
const sigLeftMin=()=>{const n=new Date(),m=new Date(n);m.setHours(24,0,0,0);return Math.max(0,Math.ceil((m-n)/6e4))};
// ⏱ KROK 102: godzinę przed startem wspólnego zaproszenia ekipy (do 15 min po starcie) — „Ekipa startuje o 19:00 · za 45 min · 4 os.”
const sigSoonMin=o=>{const s=sigSoon[o];if(!s)return null;const m=Math.round((s.at-Date.now())/6e4);return m<=60&&m>-15?m:null};
const sigSoonHtml=o=>{const m=sigSoonMin(o);if(m==null)return "";const s=sigSoon[o];
  return '<span class="sgleft hot">'+uiIcon("timer")+'Ekipa startuje o '+esc(hhmm(s.at))+' · '+(m>0?'za '+m+' min':'już jedzie')+' · '+s.n+' os.</span>'};
const sigLeftHtml=()=>{const m=sigLeftMin();if(m>180)return "";
  return '<span class="sgleft'+(m<=60?' hot':'')+'">'+uiIcon("hourglass")+'do końca dnia '+(m>=60?Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':''):m+' min')+'</span>'};
// odświeżenie tuż po północy (bez czekania na minutowy cykl)
(function sigMidnight(){const n=new Date(),m=new Date(n);m.setHours(24,0,5,0);setTimeout(()=>{if(sigOn()){sigDirty=true;Promise.resolve(syncNow()).catch(()=>{})}sigMidnight()},m-n)})();
const sigMine=()=>sigs.find(x=>x.user_id===uid);
const sigPriv=x=>x.vis==="pick";
const sigReactIds=x=>(sigReacts[x.user_id]||[]).filter(id=>id===uid||!modGone(id));
const sigIReact=x=>(sigReacts[x.user_id]||[]).includes(uid);
// widoczne sygnały: bez wycofanych, ukrytych / zablokowanych i (przy „ukryj testowe”) cudzych testowych
const sigList=()=>sigs.filter(x=>!x.cancelled_at&&!x.closed&&(x.user_id===uid||!modGone(x.user_id))&&!(hideTest&&x.is_test&&x.user_id!==uid)&&!(typeof demoHidU==="function"&&demoHidU(x.user_id)&&!sigIReact(x)))   // ⚙️ Ekipa demo ukryta (KROK 95): zostaje sygnał, któremu dałeś dłoń
  .sort((a,b)=>(a.user_id===uid?-1:b.user_id===uid?1:0)||String(b.created_at).localeCompare(String(a.created_at)));
const sigKey=x=>"sg:"+x.user_id+"|"+x.created_at;
const sigSk=(o,t)=>o+"|"+new Date(t).getTime();   // klucz pamięci okienek w bazie (KROK 92)
const sigDbSeen=x=>sigSeenDb.has(sigSk(x.user_id,x.created_at)),sigDbOk=x=>sigSeenDb.get(sigSk(x.user_id,x.created_at))===true;
// zapis w bazie: widziane (okienko pokazane) albo „OK” (też wiersz pod 🔔 przeczytany); bez KROKU 92 — tylko pamięć przeglądarki
function sigSeenSave(L,ok){
  if(!L.length||DEMO)return;
  L.forEach(x=>{const k=sigSk(x.user_id,x.created_at);sigSeenDb.set(k,ok||sigSeenDb.get(k)===true)});
  if(sigSeenOk)sb.rpc("sig_seen",{items:L.map(x=>({o:x.user_id,t:x.created_at})),set_ok:!!ok}).then(()=>{},()=>{});
}
const sigUnread=()=>{if(!sigOn())return [];const s=lsGet("sigSeen")||"",D=bsDone();return sigList().filter(x=>x.user_id!==uid&&x.created_at>s&&!D.has(sigKey(x))&&!sigDbOk(x)&&!sigEkipaRide(x))};
// 👋 „X też ma ochotę” (KROK 90) — nieprzeczytane powiadomienia z dziś, gdy mój sygnał jest aktywny
const sigReactUn=()=>{const m=sigMine();if(!sigOn()||!m||m.cancelled_at||m.closed||sigEkipaRide(m))return [];const t=sigToday();
  return notifs.filter(n=>n.kind==="sig_react"&&!n.read_at&&localIso(new Date(n.created_at)).slice(0,10)===t)};
// ✋ „X wycofał(a) sygnał” (KROK 91) — do osób, które dały „Też mam ochotę!”; nieprzeczytane z ostatnich 20 h
const sigCancelUn=()=>sigOn()?notifs.filter(n=>n.kind==="sig_cancel"&&!n.read_at&&Date.now()-new Date(n.created_at).getTime()<72e6&&!sigs.some(x=>x.user_id===n.actor&&!x.cancelled_at)):[];   // znika, gdy ta osoba dała dziś znać ponownie
const sigCancelRow=n=>'<div class="nit stn sgrow new"><div class="ic">'+uiIcon("hand")+'</div><div class="tx">'+nk(n.actor)
  +'<div class="w">'+(genders[n.actor]==="K"?'wycofała':'wycofał')+' swój sygnał „Mam ochotę” · '+esc(hhmm(new Date(n.created_at)))+'</div></div>'
  +'<button type="button" class="nmk" data-sgcx="'+esc(n.id)+'" aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane">'+uiIcon("check")+'</button></div>';
// 🚲 „Masz z kim jechać” (KROK 92): nieprzeczytane z dziś, gdy sygnał autora (actor) jest aktywny i ekipa nie ma jeszcze wspólnego zaproszenia
const sigEkipaUn=()=>{if(!sigOn())return [];const t=sigToday();
  return notifs.filter(n=>n.kind==="sig_ekipa"&&!n.read_at&&localIso(new Date(n.created_at)).slice(0,10)===t).filter(n=>{const x=sigs.find(s=>s.user_id===n.actor&&!s.cancelled_at&&!s.closed);return x&&!sigEkipaRide(x)})};
// 👋 „X też ma ochotę — ekipa już jedzie” (KROK 92b): do organizatora wspólnego zaproszenia, dopóki X nie jest w zaproszeniu
// KROK 94: przy biegu / spacerze nie „jedziemy” — teksty ekipy wg aktywności
const sigTogether=k=>actIsBike(k)?"Jedziecie razem ›":"Jesteście umówieni ›";
const sigAlready=k=>actIsBike(k)?"już jedzie":"już się umówiła";
const sigWPeople=w=>new Set([w.user_id,...invIds(w),...(joins[w.id]||[])]);
const sigLateUn=()=>{if(!sigOn())return [];const t=sigToday();
  return notifs.filter(n=>n.kind==="sig_late"&&!n.read_at&&localIso(new Date(n.created_at)).slice(0,10)===t).filter(n=>{const w=wants.find(x=>x.id===n.want_id);return w&&!wDone(w)&&new Date(w.starts_at).getTime()>Date.now()-15*6e4&&!sigWPeople(w).has(n.actor)})};   // KROK 101: 15 min po starcie — znika
const sigLateRow=n=>'<div class="nit stn sgrow new"><div class="ic">'+uiIcon("hand")+'</div><div class="tx">'+nk(n.actor)
  +'<div class="w">też ma ochotę — Wasza ekipa '+sigAlready((wants.find(x=>x.id===n.want_id)||{}).activity)+' · '+esc(hhmm(new Date(n.created_at)))+'</div></div>'
  +'<span class="sgbtns"><button type="button" class="lnk stgo" data-sgadd="'+esc(n.want_id+'|'+n.actor)+'">'+sigAddLbl([n.actor])+'</button></span>'
  +'<button type="button" class="nmk" data-sgcx="'+esc(n.id)+'" aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane">'+uiIcon("check")+'</button></div>';
// „Dopisz Nick ›” / „Dopisz (n) ›” — dopraszanie do zaproszenia z zaznaczonymi osobami
const sigAddLbl=ids=>{if(ids.length>1)return "Dopisz ("+ids.length+") ›";const n=String(nicks[ids[0]]||"").trim();return "Dopisz "+esc(n.length>14?n.slice(0,13)+"…":n)+" ›"};
function sigAddTo(wid,ids){
  const w=wants.find(x=>x.id===wid);if(!w){say("Tego zaproszenia nie da się teraz otworzyć.");return}
  openWho("add",wid);ws.pick=new Set(ids.filter(id=>!sigWPeople(w).has(id)));ws.topK=null;renderWho();
}
// ⏱ KROK 102: „Ekipa X startuje o …” (do wszystkich, godzinę przed startem) i ⏰ przypomnienie autora (Reakcje od godziny, brak zaproszenia)
const sigTodayN=k=>notifs.filter(n=>n.kind===k&&!n.read_at&&localIso(new Date(n.created_at)).slice(0,10)===sigToday());
const sigSoonUn=()=>sigOn()?sigTodayN("sig_soon").filter(n=>sigSoonMin(n.actor)!=null&&!(sigs.find(s=>s.user_id===n.actor)||{}).closed):[];
const sigRemindUn=()=>{const m=sigMine();if(!sigOn()||!m||m.cancelled_at||m.closed||sigEkipaRide(m))return [];return sigTodayN("sig_remind")};
const sigSoonRow=n=>{const x=sigs.find(s=>s.user_id===n.actor&&!s.cancelled_at&&!s.closed),mine=x&&sigIReact(x);
  return '<div class="nit stn sgrow new"><div class="ic">'+uiIcon("timer")+'</div><div class="tx">Ekipa '+nk(n.actor)+' startuje o <b>'+esc(hhmm(sigSoon[n.actor].at))+'</b>'
  +'<div class="w">zadeklarowanych: '+sigSoon[n.actor].n+' os. · Masz ochotę? Daj Reakcję — ktoś z ekipy Cię dopisze.</div></div>'
  +'<span class="sgbtns">'+(x&&sig2Ok&&x.user_id!==uid?'<button type="button" class="sgre'+(mine?' on':'')+'" data-sgr="'+esc(x.user_id)+'" aria-pressed="'+!!mine+'" aria-label="Też mam ochotę!">'+uiIcon("hand")+'</button>':'')+'</span>'
  +'<button type="button" class="nmk" data-sgcx="'+esc(n.id)+'" aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane">'+uiIcon("check")+'</button></div>'};
const sigRemindRow=n=>{const m=sigMine(),k=m?sigReactIds(m).filter(id=>id!==uid).length:0;
  return '<div class="nit stn sgrow new"><div class="ic">'+uiIcon("alarm")+'</div><div class="tx"><b>Od godziny masz chętnych</b>'
  +'<div class="w">'+k+' '+plf(k,["osoba","osoby","osób"])+' z „Też mam ochotę!”, a zaproszenia jeszcze nie ma</div></div>'
  +'<span class="sgbtns">'+(k?'<button type="button" class="lnk stgo" data-sgc="'+esc(uid)+'">Zaproś ekipę ('+k+') ›</button>':'')+'</span>'
  +'<button type="button" class="nmk" data-sgcx="'+esc(n.id)+'" aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane">'+uiIcon("check")+'</button></div>'};
const sigNotifUn=()=>sigReactUn().concat(sigCancelUn(),sigEkipaUn(),sigLateUn(),sigSoonUn(),sigRemindUn());   // powiadomienia sygnałów do licznika 🔔 i „przeczytane”
// wspólne zaproszenie ekipy na dziś (widoczne dla mnie): autor z ekipy + ktoś inny z ekipy zaproszony albo dołączony
function sigEkipaRide(x){
  if(!x||typeof wants==="undefined")return null;
  const E=new Set(sigEkipa(x));if(E.size<2)return null;
  // KROK 99: organizator może być spoza ekipy (np. z innego sygnału) — wystarczą 2 osoby z ekipy w zaproszeniu (jak sig_ekipa_ride_id w bazie)
  return wants.find(w=>dayDiff(new Date(w.range_from||w.starts_at))===0&&!wDone(w)
    &&(w.activity||"bike")===(x.activity||"bike")   // KROK 94: wspólne zaproszenie tylko z tą samą aktywnością co sygnał
    &&(()=>{const P=sigWPeople(w);return P.has(uid)   // tylko gdy ja jestem w zaproszeniu (👑 widzi cudze prywatne — to nie znaczy, że jedzie)
      &&[...P].filter(id=>E.has(id)).length>=2})())||null;
}
const sigEkipaRow=n=>{const x=sigs.find(s=>s.user_id===n.actor),E=x?sigEkipaOthers(x):[];
  return '<div class="nit stn sgrow new"><div class="ic">'+uiIcon("users")+'</div><div class="tx"><b>'+esc(actOf(x&&x.activity).with_txt||"Masz z kim jechać!")+'</b>'
  +'<div class="w">Ekipa '+(n.actor===uid?'z Twojego sygnału':'sygnału '+esc(nickOf(n.actor)))+' · '+(E.length+1)+' '+plf(E.length+1,["osoba","osoby","osób"])+' · '+esc(hhmm(new Date(n.created_at)))+'</div></div>'
  +'<span class="sgbtns">'+(E.length&&n.actor===uid?'<button type="button" class="lnk stgo" data-sgc="'+esc(n.actor)+'">Zaproś ekipę ('+E.length+') ›</button>':'')+'</span>'
  +'<button type="button" class="nmk" data-sgcx="'+esc(n.id)+'" aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane">'+uiIcon("check")+'</button></div>'};
const sigTodayBusy=()=>wants.some(w=>dayDiff(new Date(w.starts_at))===0&&!wDone(w)&&!w.is_test&&!(typeof demoIds!=="undefined"&&demoIds.has(w.user_id)));   // testowe i od kont demo nie chowają koła
const sigActive=()=>{const m=sigMine();return !!m&&!m.cancelled_at};   // mój sygnał jest dziś aktywny
const sigFabOn=()=>sigOn()&&sigOk&&!is_banned_me()&&!sigTodayBusy();   // przycisk zostaje też po wysłaniu sygnału (wygląda wtedy inaczej i otwiera „Twój sygnał”)
function is_banned_me(){return typeof modBanned!=="undefined"&&modBanned.has(uid)}
function sigFabSync(fabOn){
  const b=$("sigfab");if(!b)return;
  if(fabOn===undefined)fabOn=!$("fab").classList.contains("hide");
  const done=Date.now()<sigDoneT;
  b.classList.toggle("hide",!fabOn||!(sigFabOn()||done));b.classList.toggle("done",done);
  b.classList.toggle("act",!done&&sigActive());sigFabHtml();sigWinSync();
}
// 👋 machająca dłoń (zamiast koła, 2026-11-24): żółta na zielonym tle, taka sama w obu motywach (wariant A), z łukami ruchu — kształt inny niż ✋ w liczniku „Jadę”
const sigWheel='<svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><path class="wva" d="M4.4 10.6a7 7 0 0 1 2.4-4M1.6 9.2a10 10 0 0 1 3.4-5.6" stroke="#f5d04e" stroke-width="2.1" stroke-linecap="round" opacity=".9"/><g transform="translate(-2 -1)"><g class="wvh" stroke="#f5d04e" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M23 14V9.2a1.9 1.9 0 0 0-3.8 0V14M19.2 13V7.4a1.9 1.9 0 0 0-3.8 0V13M15.4 13.4V9.2a1.9 1.9 0 0 0-3.8 0v7.6"/><path d="M23 11.4a1.9 1.9 0 1 1 3.8 0V17a7.6 7.6 0 0 1-7.6 7.6h-1.9c-2.7 0-4.3-.8-5.7-2.2l-3.4-3.4a1.9 1.9 0 0 1 2.7-2.7l2.5 2.5"/></g></g></svg>';
const sigWheelG=sigWheel.replace(/#f5d04e/g,"#1a6a30");
const sigCoin=()=>'<span class="sgcoin" aria-hidden="true">'+sigWheelG+'</span>';
const sigCheck='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="#248a3d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function sigFabHtml(){
  const b=$("sigfab");if(!b)return;
  const done=Date.now()<sigDoneT,m=sigMine(),act=!done&&sigActive(),n=act?sigReactIds(m).filter(id=>id!==uid).length:0;
  // aktywny sygnał: mniejsza dłoń + zielony ptaszek po lewej i (gdy są reakcje) licznik „Też mam ochotę” po prawej
  const h=done?sigCheck:act?sigWheel+'<span class="sigbdg l">'+sigCheck+'</span>'+(n?'<span class="sigbdg r n">'+n+'</span>':''):sigWheel;
  if(b.dataset.h!==h){b.dataset.h=h;b.innerHTML=h}
  b.setAttribute("aria-label",act?"Twój sygnał „Mam ochotę”"+(n?" — "+n+" "+plf(n,["osoba","osoby","osób"])+" też ma ochotę":"")+" — otwórz":"Mam ochotę — daj znać, że chcesz dziś pojeździć");
}
function closeSig(){$("sigsheet").classList.add("hide");$("sigsheet").innerHTML="";sigView=""}
/* 🙋 Okno „Ekipa na dziś” — lista wszystkich dzisiejszych sygnałów z filtrami (te same wiersze co pod 🔔).
   Otwiera je machająca dłoń z licznikiem w wierszu „Twoje zaproszenia” i bombel „Sygnały” w Filtry → Relacja (prośba właściciela 2026-11-25).
   Pod 🔔 sygnały nadal są zawsze w całości — to powiadomienia; filtry dotyczą tylko tego okna. */
let sgwOpen=false;const sgwF={a:"",w:""};
const SGW_WHO=[["","Wszystkie","users"],["mine","Moje","user"],["react","Z moją Reakcją","hand"],["fav","Ulubieni","starf"]];
function sigWinOk(x){
  if(sgwF.a&&(x.activity||"bike")!==sgwF.a)return false;
  const R=sigReactIds(x);
  if(sgwF.w==="mine"&&x.user_id!==uid)return false;
  if(sgwF.w==="react"&&!(x.user_id!==uid&&R.includes(uid)))return false;
  if(sgwF.w==="fav"&&!([x.user_id].concat(R).some(isFav)))return false;
  return true}
function sigWinChips(){
  const A=FLT_ACT().map(([v,t])=>'<button type="button" class="fch'+(sgwF.a===v?' on':'')+'" data-swa="'+esc(v)+'">'+uiIcon(actOf(v).icon)+esc(t)+'</button>').join("");
  const W=SGW_WHO.map(([v,t,i])=>'<button type="button" class="fch'+(sgwF.w===v?' on':'')+'" data-sww="'+v+'">'+uiIcon(i)+t+'</button>').join("");
  return '<div class="sgwchips">'+A+'</div><div class="sgwchips">'+W+'</div>'}
function sigWinRender(){
  const p=$("sigwin");if(!p||p.classList.contains("hide"))return;
  const mb=$("mysigs");if(mb)mb.classList.toggle("fon",!!(sgwF.a||sgwF.w));
  if(!p.firstChild)p.innerHTML='<div class="bsbox" role="dialog" aria-modal="true" aria-label="Ekipa na dziś"><div class="bsgrab"></div><div class="bshead"><span></span><b>'+sigCoin()+'Ekipa na dziś</b><button type="button" class="lnk" data-swx="1">Zamknij</button></div><div class="bslist"><div id="sgwc"></div><div id="sgwl"></div></div></div>';
  $("sgwc").innerHTML=sigWinChips();
  const B=sigEkipaBody(sigWinOk,false),box=p.querySelector(".bslist"),y=box.scrollTop;   // te same wiersze co pod 🔔: klamra Super ekipy i powiadomienia ekipy (2026-11-25)
  $("sgwl").innerHTML=(B.L.length||B.notes?B.html:'')+(B.L.length?'':'<div class="note sgwempty">'+(sigList().length?'Brak sygnałów dla tych filtrów.':'Dziś nikt jeszcze nie dał znać.')+'</div>')+(sigList().length?sigHintHtml():'');
  box.scrollTop=y}
// „Masz z kim …” (nie u autora — on ma tam „Zaproś ekipę”) samo jako przeczytane po otwarciu okna „Ekipa” albo rozwinięciu sekcji pod 🔔
const sigEkipaAutoRead=()=>markRead(sigEkipaUn().filter(n=>n.actor!==uid).map(n=>n.id));
function openSigWin(){if(!sigOn())return;sigEkipaAutoRead();sgwOpen=true;const p=$("sigwin");p.classList.remove("hide");p.innerHTML="";sigWinRender()}
function closeSigWin(){sgwOpen=false;const p=$("sigwin");p.classList.add("hide");p.innerHTML=""}
function sigWinSync(){
  const b=$("mysigs");
  if(b){const on=sigOn();b.classList.toggle("hide",!on);
    if(on){const n=sigList().length,h=sigWheelG+'<span class="sgl">Ekipa</span><b class="sgn">'+n+'</b>';if(b.dataset.h!==h){b.dataset.h=h;b.innerHTML=h}b.classList.toggle("dis",!n);b.classList.toggle("fon",!!(sgwF.a||sgwF.w));   // 🔴 czerwona kropka: w oknie „Ekipa na dziś” zostały włączone filtry
      b.setAttribute("aria-label","Sygnały „Mam ochotę” — dziś "+n+" — otwórz listę");b.title="Sygnały „Mam ochotę” — dziś "+n}}
  if(sgwOpen){if(!sigOn())closeSigWin();else sigWinRender()}}
$("mysigs").addEventListener("click",openSigWin);
$("sigwin").addEventListener("click",e=>{
  if(e.target===$("sigwin")||e.target.closest("[data-swx]")){closeSigWin();return}
  const a=e.target.closest("[data-swa]");if(a){sgwF.a=sgwF.a===a.dataset.swa?"":a.dataset.swa;sigWinRender();return}
  const w=e.target.closest("[data-sww]");if(w){sgwF.w=w.dataset.sww;sigWinRender();return}
  if(e.target.closest("[data-sgsup]")){closeSigWin();sigInviteSuper();return}   // 🚲 „Super ekipa ›” z klamry
  const sgcx=e.target.closest("[data-sgcx]");if(sgcx){markRead([sgcx.dataset.sgcx]);sigWinRender();return}   // ✓ powiadomienie ekipy przeczytane
  if(e.target.closest("[data-sgx]")){closeSigWin();sigCancel();return}
  if(e.target.closest("[data-sge]")){closeSigWin();openSig("pick");return}
  const sga=e.target.closest("[data-sgadd]");if(sga){const [wid,ids]=sga.dataset.sgadd.split("|");closeSigWin();sigAddTo(wid,ids.split(","));return}
  const sgw=e.target.closest("[data-sgw]");if(sgw){const x=wants.find(y=>y.id===sgw.dataset.sgw);closeSigWin();if(x)goToWant(x);return}
  const sgc=e.target.closest("[data-sgc]");if(sgc){closeSigWin();sigInviteEkipa(sgc.dataset.sgc);return}
  const sgr=e.target.closest("[data-sgr]");if(sgr){sigReact(sgr.dataset.sgr);return}
  const sgh=e.target.closest("[data-sgh]");if(sgh){sigHideMsg(sgh.dataset.sgh);return}
});
function openSig(view){
  if(!session)return;sigView=view||"pick";const m=sigMine();
  if(m&&actList.some(x=>x.key===m.activity))sigPick=m.activity;
  // „Zmień” / ponowny sygnał: komunikat jak ostatnio dziś (3.0: sygnał zawsze dla wszystkich — bez „Kto zobaczy?”)
  sg.msg=m&&m.msg||"";sg.own=!!sg.msg&&!sigMsgs(sigPick).includes(sg.msg);
  sg.vis="all";sg.pick=new Set();sg.gr="";
  renderSig();
}
function sigMsgHtml(){
  if(!sig2Ok)return "";
  const P=sigMsgs(sigPick);
  return '<div class="sglbl">Komunikat <span class="note">(opcjonalnie)</span></div><div class="sgmsgs">'
   +P.map(t=>'<button type="button" class="chip'+(!sg.own&&sg.msg===t?' on':'')+'" data-sgm="'+esc(t)+'" aria-pressed="'+(!sg.own&&sg.msg===t)+'">'+esc(t)+'</button>').join("")
   +'<button type="button" class="chip'+(sg.own?' on':'')+'" data-sgm="" aria-pressed="'+sg.own+'">Inne…</button></div>'
   +(sg.own?'<input class="sgown" id="sgown" maxlength="40" placeholder="Twój komunikat, np. Jadę nad Bug" value="'+esc(sg.msg)+'" autocomplete="off"><div class="note sgcnt" id="sgcnt">'+sg.msg.length+'/40</div>':'');
}
// 🟡 „Twój sygnał” (okienko z przycisku z dłonią po wysłaniu): kto dał „Też mam ochotę”, Zaproś chętnych, Zmień, Wycofaj
function renderSigMine(){
  const p=$("sigsheet"),m=sigMine();
  if(!m||m.cancelled_at){closeSig();return}
  const a=sigA(m.activity),R=sigReactIds(m).filter(id=>id!==uid&&nicks[id]),n=R.length;
  const tg=flags.mam_ochote&&flags.mam_ochote.state==="all";
  p.innerHTML='<div class="sheetbox popbox sigbox sgmine" role="dialog" aria-modal="true"><button class="sclose" data-sg="later" aria-label="Zamknij">✕</button>'
   +'<span class="ptag">TWÓJ SYGNAŁ</span>'
   +'<div class="ph sgmh"><span class="sgmic">'+uiIcon(a[0])+'</span>'+esc(a[1])+' · '+esc(hhmm(new Date(m.created_at)))+'</div>'
   +(sigMsgTxt(m)?'<div class="sgmsg sgmm">'+sigMsgTxt(m)+'</div>':'')+'<div class="sgwx">'+sigWxHtml()+'</div>'
   +'<div class="pmeta">Widzą wszyscy zalogowani (pod 🔔'+(tg?' i na kanale Telegram':'')+'). Wygasa z końcem dnia.</div>'
   +(sig2Ok?'<div class="sglbl">Też mają ochotę'+(n?' ('+n+')':'')+'</div>'
     +(n?'<div class="sgrl">'+R.map(id=>'<span class="sgrc">'+uiIcon("hand")+nk(id)+'</span>').join("")+'</div>'
        :'<div class="note">Na razie nikt. Gdy ktoś da „Też mam ochotę!”, zobaczysz to tutaj i dostaniesz powiadomienie.</div>'):'')
   +(sig2Ok&&n?'<button type="button" class="b big sgmkeen" data-sg="keen">Zaproś ekipę ('+n+') ›</button>':'')
   +(sig2Ok?'<button type="button" class="lnk sgmbell" data-sg="bell">Cała ekipa pod 🔔 ›</button>':'')
   +'<div class="pbtns"><button type="button" class="b w" data-sg="edit">Zmień</button><button type="button" class="b w" data-sg="cancel">Wycofaj</button></div>'
   +'</div>';
  sigFillWx();
  if(p.classList.contains("hide"))p.classList.remove("hide");   // bez zbędnej zmiany klasy (obserwator okienek wywołuje updateFab)
}
function renderSig(){
  if(sigView==="mine"){renderSigMine();return}
  if(sigView==="pop"){renderSigPop();return}
  const p=$("sigsheet"),intro=sigView==="intro",tg=flags.mam_ochote&&flags.mam_ochote.state==="all",edit=!!(sigMine()&&!sigMine().cancelled_at);
  const fo=document.activeElement&&document.activeElement.id==="sgown";
  // jedno okienko: przy pierwszych wejściach (intro) z zachętą i podpowiedzią, gdzie jest dłoń; z dłoni — sam wybór
  p.innerHTML='<div class="sheetbox popbox sigbox" role="dialog" aria-modal="true"><button class="sclose" data-sg="later" aria-label="Zamknij">✕</button>'
   +'<span class="ptag">MAM OCHOTĘ</span>'
   +'<div class="ph">'+(intro?'Nie masz pomysłu na jazdę, ale masz ochotę pojeździć?':edit?'Zmień swój sygnał':'Na co masz dziś ochotę?')+'</div>'
   +'<div class="pmeta">'+(intro?'Daj znać innym — bez godziny i trasy. Zobaczą to pod 🔔'+(tg?' i na kanale Telegram':'')+' i mogą Cię zaprosić.'
      :'Bez godziny i trasy. Inni zobaczą to pod 🔔'+(tg?' i na kanale Telegram':'')+' i dadzą Reakcję — zaproszenie założysz Ty.')+'</div>'
   +'<div class="wbike sigacts">'+sigActKeys().map(k=>'<button type="button" class="wbk'+(sigPick===k?' on':'')+'" data-sga="'+esc(k)+'" aria-pressed="'+(sigPick===k)+'">'+uiIcon(sigA(k)[0])+'<span>'+esc(sigA(k)[1])+'</span></button>').join("")+'</div>'
   +sigMsgHtml()
   +'<button type="button" class="b big" data-sg="send"'+(sigBusy?' disabled':'')+'>'+(edit?'Zapisz':'Daj znać')+'</button>'
   +'<div class="pbtns"><button type="button" class="b w" data-sg="later">'+(intro?'Później':'Nie teraz')+'</button></div>'
   +(intro?'<div class="signote"><span class="sigmini">'+sigWheel+'</span>Później znajdziesz to pod zieloną dłonią w prawym dolnym rogu ekranu.</div>':'')
   +'</div>';
  p.classList.remove("hide");
  if(fo){const i=$("sgown");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}
}
const sigErr=e=>{const m=e&&e.message||"";
  return /BANNED/.test(m)?"Konto zablokowane — napisz do administratora."
    :/MSG_BAN/.test(m)?"Komunikat zawiera niedozwolone słowo albo link — popraw go."
    :/MSG_HIDDEN/.test(m)?"Administrator ukrył dziś Twój komunikat — wyślij sygnał bez komunikatu."
    :"Nie udało się: "+(m||"błąd")};
async function sigSend(){
  if(sigBusy)return;
  if(sigStale()){sigDirty=true;try{await syncNow()}catch(e){}}   // 🌙 po północy: najpierw dzisiejszy stan (nowy sygnał zamiast zmiany wczorajszego)
  const msg=sig2Ok?String(sg.msg||"").replace(/\s+/g," ").trim().slice(0,40):"";   // 3.0: sygnał zawsze dla wszystkich
  sigBusy=true;renderSig();
  try{
    const m=sigMine(),row={activity:sigPick},day=sigDay||sigToday();
    if(sig2Ok){row.msg=msg||null;row.vis="all"}
    let r;
    if(m)r=await sb.from("ride_signals").update(Object.assign({cancelled_at:null},row)).eq("user_id",uid).eq("day",day).select("user_id");
    else r=await sb.from("ride_signals").insert(row).select("user_id");
    if(r.error)throw r.error;
    if(!r.data||!r.data.length)throw new Error("funkcja jest jeszcze tylko dla testerów");
    if(sig2Ok&&m&&sigPriv(m)){   // dawny prywatny sygnał (sprzed 3.0) → czyścimy odbiorców
      const d=await sb.from("ride_signal_to").delete().eq("owner",uid).eq("day",day);if(d.error)throw d.error}
    const edit=!!(m&&!m.cancelled_at);
    sigBusy=false;closeSig();
    try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}
    if(!edit){sigDoneT=Date.now()+2600;sigFabHtml();sigFabSync();setTimeout(()=>{sigFabHtml();sigFabSync()},2700)}
    say(edit?"Zapisano ✔ "+sigA(sigPick)[1]:
      (genders[uid]==="K"?"Dałaś":"Dałeś")+" znać ✔ "+sigA(sigPick)[1]+", dziś — inni zobaczą pod 🔔.");
    sigDirty=true;await syncNow();sigFabSync();
  }catch(e){sigBusy=false;renderSig();say(sigErr(e))}
}
async function sigCancel(){
  if(sigGoneCheck(sigMine()))return;
  try{const r=await sb.from("ride_signals").update({cancelled_at:new Date().toISOString()}).eq("user_id",uid).eq("day",sigDay||sigToday()).select("user_id");
    if(r.error)throw r.error;const n=sig2Ok&&sigMine()?sigReactIds(sigMine()).filter(id=>id!==uid).length:0;sigDirty=true;await syncNow();
    say("Wycofane — przycisk z dłonią wrócił nad ➕."+(n?" "+n+" "+plf(n,["osoba z „Też mam ochotę” dostanie","osoby z „Też mam ochotę” dostaną","osób z „Też mam ochotę” dostanie"])+" znać.":""))}
  catch(e){say("Nie udało się: "+(e&&e.message?e.message:"błąd"))}
}
// 👋 „Też mam ochotę!” — reakcja (nie własny sygnał); drugie kliknięcie cofa
const sigReactBusy={};   // blokada podwójnego kliknięcia w czasie zapisu
async function sigReact(owner){
  const x=sigs.find(s=>s.user_id===owner);if(owner===uid||!sig2Ok)return;
  if(sigGoneCheck(x))return;
  const on=sigIReact(x),day=sigDay||sigToday(),prev=(sigReacts[owner]||[]).slice();
  if(sigReactBusy[owner])return;sigReactBusy[owner]=true;
  // od razu na ekranie (jedno przerysowanie), zapis w tle; przy błędzie wraca poprzedni stan
  if(on)sigReacts[owner]=prev.filter(id=>id!==uid);else sigReacts[owner]=prev.concat(uid);
  try{navigator.vibrate&&navigator.vibrate(on?8:25)}catch(e){}
  if(!on)bsDoneAdd([sigKey(x)]);   // dłoń „Też mam ochotę!” odhacza też wiersz (przeczytane) — sprawa załatwiona
  renderBell();if(sigView==="pop")renderSigPop();   // renderBell przerysowuje też otwarte 🔔
  try{
    const r=on?await sb.from("ride_signal_reacts").delete().eq("owner",owner).eq("day",day).eq("user_id",uid)
      :await sb.from("ride_signal_reacts").insert({owner,day});
    if(r.error)throw r.error;
    say(on?"Cofnięte.":"👋 "+nickOf(owner)+" dostanie znać, że też masz ochotę.");
    sigDirty=true;syncNow();
  }catch(e){sigReacts[owner]=prev;renderBell();if(sigView==="pop")renderSigPop();say(sigErr(e))}
  finally{sigReactBusy[owner]=false}
}
// komunikat sygnału → tytuł zaproszenia (≥ 6 znaków, jak tytuły w bazie) albo notatka (krótszy) — decyzja właściciela 2026-11-24 03:59
const sigPreset=x=>{const t=x&&x.msg&&!x.msg_hidden?String(x.msg).trim():"";return t.length>=6?{title:t}:t?{note:t}:{}};
// 🟡 „Zaproś ekipę ›” u autora: prywatne zaproszenie na dziś z zakresem godzin do osób, które dały „Też mam ochotę!”
function sigInviteKeen(){
  const m=sigMine();if(sigGoneCheck(m))return;
  const keen=sigReactIds(m).filter(id=>id!==uid&&nicks[id]);
  if(!keen.length){say("Nikt jeszcze nie dał znać, że też ma ochotę.");return}
  show(0);openWantForm(null,Object.assign({sig:uid,pick:keen,sigChetni:keen.length},sigPreset(m)));
}
// 🚲 „Ekipa na dziś”: jeden sygnał = jedna ekipa (autor + osoby z „Też mam ochotę!”). 3.0 (2026-11-25): zaproszenie ekipy zakłada TYLKO autor sygnału
const sigEkipa=x=>{const R=sigReactIds(x).filter(id=>nicks[id]);return [...new Set([x.user_id,...R])].filter(id=>nicks[id])};
const sigEkipaOthers=x=>sigEkipa(x).filter(id=>id!==uid);
function sigInviteEkipa(owner){
  const x=sigs.find(s=>s.user_id===owner);if(sigGoneCheck(x))return;
  if(owner===uid){sigInviteKeen();return}
  say("Zaproszenie ekipy zakłada autor sygnału — "+nickOf(owner)+" dostał(a) znać o Twojej Reakcji.");
}
// 🤝 „Super ekipa” 3.0 (wariant AA „podanie dłoni”, 2026-11-25): dwa sygnały tej samej aktywności łączą się, gdy autor A dał dłoń autorowi B
// i A dostał dłoń od kogoś z ekipy B (B albo osoby z dłonią u B) — dwie ekipy podały sobie dłonie. Łańcuch (A–B, B–C) = jedna Super ekipa.
// Zaproszenie zakłada tylko autor sygnału z klamry (tytuł „SUPER EKIPA”, w notatce jego komunikat); min. 3 osoby razem. Reszta widzi klamrę bez przycisku.
const sigShake=(a,b)=>sigReactIds(b).includes(a.user_id)&&(()=>{const EB=new Set(sigEkipa(b));return sigReactIds(a).some(id=>id!==a.user_id&&EB.has(id))})();
function sigSuperComps(){
  const L=sigList(),seen=new Set(),C=[];
  L.forEach(x=>{if(seen.has(x))return;const c=[x];seen.add(x);
    for(let i=0;i<c.length;i++)L.forEach(y=>{if(!seen.has(y)&&(y.activity||"bike")===(c[i].activity||"bike")&&(sigShake(c[i],y)||sigShake(y,c[i]))){seen.add(y);c.push(y)}});
    if(c.length>=2)C.push(c)});
  return C;
}
const sigSuperAll=S=>[...new Set(S.flatMap(sigEkipa))];
// klamra, w której jestem (autor albo dłoń): najpierw ta z moim sygnałem, potem największa
const sigSuperSigs=()=>{if(!sig2Ok)return [];const own=S=>S.some(x=>x.user_id===uid)?1:0;
  return sigSuperComps().filter(S=>sigSuperAll(S).includes(uid)).sort((a,b)=>own(b)-own(a)||b.length-a.length)[0]||[]};
const sigSuperIds=S=>sigSuperAll(S).filter(id=>id!==uid);
const sigSuperOn=S=>S.length>=2&&sigSuperAll(S).length>=3;
const sigSuperOrg=S=>S.some(x=>x.user_id===uid);   // zaprasza tylko autor sygnału z klamry
function sigInviteSuper(){
  if(sigStale()){sigGoneCheck(null);return}
  const S=sigSuperSigs();if(!sigSuperOn(S)){say("Super ekipa powstaje, gdy dwie ekipy podadzą sobie dłonie: dajesz Reakcję na sygnał innej osoby, a ktoś z jej ekipy na Twój.");return}
  if(!sigSuperOrg(S)){say("Super ekipę zaprasza autor jednego z połączonych sygnałów.");return}
  const ids=sigSuperIds(S),mine=S.find(x=>x.user_id===uid),src=mine;
  // tytuł „SUPER EKIPA”; w notatce komunikat „Mam ochotę” osoby, która kliknęła (o ile ma własny sygnał z komunikatem)
  const note=mine&&mine.msg&&!mine.msg_hidden?String(mine.msg).trim():"";
  show(0);openWantForm(null,Object.assign({sig:src.user_id,pick:ids,sigChetni:ids.length,title:"SUPER EKIPA"},note?{note}:{}));
}
const sigMiniAv=id=>{const a=avData[id]&&avData[id].d;return '<span class="sgmav'+(genders[id]==="K"?' k':'')+(a?' ph':'')+'">'+(a?avImg(id,"gavi"):esc(String(nicks[id]||"?").charAt(0).toUpperCase()))+'</span>'};
// wspólne zaproszenie na dziś, w którym są już wszyscy z klamry (i ja) → „Jedziecie razem ›” zamiast „Super ekipa ›”
function sigSuperRide(S){
  const ids=sigSuperIds(S);if(!ids.length||typeof wants==="undefined")return null;
  const sa=(S[0]&&S[0].activity)||"bike";
  return wants.find(w=>dayDiff(new Date(w.range_from||w.starts_at))===0&&!wDone(w)&&(w.activity||"bike")===sa&&(()=>{const P=new Set([w.user_id,...invIds(w),...(joins[w.id]||[])]);return P.has(uid)&&ids.every(id=>P.has(id))})())||null;
}
// wspólne zaproszenie na dziś, w którym jestem i są już niektórzy z klamry, ale nie wszyscy → „Dopisz (n) ›” zamiast „Super ekipa ›” (2026-11-24)
function sigSuperPart(S){
  const ids=sigSuperIds(S);if(!ids.length||typeof wants==="undefined")return null;
  for(const w of wants){
    if(dayDiff(new Date(w.range_from||w.starts_at))!==0||wDone(w)||!wantCanInvite(w)||(w.activity||"bike")!==((S[0]&&S[0].activity)||"bike"))continue;
    const P=sigWPeople(w);if(!P.has(uid))continue;
    const miss=ids.filter(id=>!P.has(id));
    if(miss.length&&miss.length<ids.length)return {w,miss};
  }
  return null;
}
function sigSuperHtml(S,rows){
  const ids=sigSuperIds(S),show4=ids.slice(0,4),more=ids.length-show4.length,RW=sigSuperRide(S),PT=RW?null:sigSuperPart(S);
  return '<div class="sgsup"><div class="sgsupbar"><span class="sgstack">'+show4.map(sigMiniAv).join("")+(more>0?'<span class="sgmav more">+'+more+'</span>':'')+'</span>'
    +(RW?'<button type="button" class="b sgsupbtn" data-sgw="'+esc(RW.id)+'">'+uiIcon("users")+' '+sigTogether(RW.activity)+'</button></div>'
       :PT?'<button type="button" class="b sgsupbtn" data-sgadd="'+esc(PT.w.id+'|'+PT.miss.join(","))+'">'+uiIcon("users")+' '+sigAddLbl(PT.miss)+'</button></div>'
       :sigSuperOrg(S)?'<button type="button" class="b sgsupbtn" data-sgsup="1">'+uiIcon("users")+' Super ekipa ('+ids.length+') ›</button></div>'
       :'<span class="sgsupnote">'+uiIcon("users")+' Ekipy podały sobie dłonie — zaprosi autor sygnału</span></div>')
    +(!RW&&sigLeftHtml()?'<div class="sgsupleft">'+sigLeftHtml()+'</div>':'')
    +'<div class="sgsupbody">'+rows+'</div></div>';
}
// ✨ „z jajem” (2026-11-24): wtrącenie pogody przy ekstremach (burza, ulewa, śnieg, upał, mróz, silne porywy) pod komunikatem w okienkach sygnału
let sigWxC={t:0,x:null};
const sigWxHtml=()=>sigWxC.x?uiIcon(sigWxC.x[0])+'<span>'+esc(sigWxC.x[1])+'</span>':'';
async function sigWxCalc(){
  try{
    const J=await getWxJ(WX_LAT,WX_LON),H=J.hourly,off=(J.utc_offset_seconds||0)*1000,i=H.time.indexOf(new Date(Date.now()+off+30*60000).toISOString().slice(0,13)+":00");
    if(i<0)return null;
    const t=H.temperature_2m?H.temperature_2m[i]:null,g=H.wind_gusts_10m?H.wind_gusts_10m[i]:0,c=H.weather_code?H.weather_code[i]:null,mm=H.precipitation?H.precipitation[i]:0;
    if(c!=null&&c>=95)return ["storm","Dziś burze — wybierzcie trasę blisko domu."];
    if(c===65||c===67||c===82||mm>=2)return ["rain","Dziś ulewny deszcz — peleryna się przyda."];
    if(c!=null&&c>=71&&c<=86)return ["snow","Dziś śnieg — ostrożnie na zakrętach."];
    if(t!=null&&t>=30)return ["flame","Upał "+Math.round(t)+"°C — zabierz dużo wody."];
    if(t!=null&&t<=0)return ["snow","Mróz "+Math.round(t)+"°C — ubierz się na cebulkę."];
    if(g>=50)return ["windy","Porywy do "+Math.round(g)+" km/h — wiatr będzie wiał w oczy."];
    return null;
  }catch(e){return null}
}
function sigFillWx(){
  if(Date.now()-sigWxC.t<6e5)return;
  sigWxC.t=Date.now();   // jedno zapytanie na 10 minut
  sigWxCalc().then(x=>{sigWxC.x=x;const h=sigWxHtml();document.querySelectorAll("#sigsheet .sgwx").forEach(e=>{e.innerHTML=h})});
}
// 🎉 konfetti u autora: gdy przybywa osób z „Też mam ochotę!” (pierwszy raz po otwarciu aplikacji — też, gdy reakcje przyszły pod jego nieobecność)
function sigConfettiBurst(){
  if(window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const c=document.createElement("div");c.className="sgconf";c.setAttribute("aria-hidden","true");
  const cols=["#f5b82e","#248a3d","#2f7fd1","#d64545","#9b59b6","#ff9f0a"];
  for(let i=0;i<36;i++){const p=document.createElement("i");
    p.style.cssText="left:"+(Math.random()*100)+"%;background:"+cols[i%cols.length]+";--x:"+Math.round((Math.random()-.5)*160)+"px;--r:"+Math.round(Math.random()*720-360)+"deg;animation-delay:"+(Math.random()*.35).toFixed(2)+"s;animation-duration:"+(1.5+Math.random()*.9).toFixed(2)+"s";
    c.appendChild(p)}
  document.body.appendChild(c);setTimeout(()=>c.remove(),2900);
  try{navigator.vibrate&&navigator.vibrate([20,40,20])}catch(e){}
}
function sigConfetti(){
  if(DEMO||!uid)return;
  const m=sigMine(),k="sigRc:"+uid+":"+sigToday();
  if(!m||m.cancelled_at||!sig2Ok){return}
  const n=sigReactIds(m).filter(id=>id!==uid).length,prev=lsGet(k);
  lsSet(k,String(n));
  if(n>0&&(prev==null||n>+prev))sigConfettiBurst();
}
async function sigHideMsg(owner){
  if(!isAdmin||!await askOk("Ukryć komunikat „"+((sigs.find(s=>s.user_id===owner)||{}).msg||"")+"”?\n\nZniknie u wszystkich. "+nickOf(owner)+" nie wpisze dziś nowego komunikatu (sygnał zostaje).","Ukryj",true))return;
  const r=await sb.rpc("sig_hide_msg",{o:owner,d:sigDay||sigToday()});
  if(r.error){say("Nie udało się: "+r.error.message);return}
  sigDirty=true;await syncNow();say("Komunikat ukryty.");
}
// komunikat w dymku / w wierszu (ukryty przez admina — bez treści)
const sigMsgTxt=x=>x.msg&&!x.msg_hidden?'„'+esc(x.msg)+'”':'';
const sigReactTxt=x=>{const L=sigReactIds(x);if(!L.length)return '';
  const me=L.includes(uid),o=L.filter(id=>id!==uid),n=o.length;
  // „Ty, Kasia i Piotr też mają ochotę” / „Kasia i 3 inne osoby…” (przy więcej niż 2 cudzych)
  const nm=(me?['Ty']:[]).concat(n<=2?o.map(id=>esc(nickOf(id))):[esc(nickOf(o[0])),(n-1)+' '+plf(n-1,["inna osoba","inne osoby","innych osób"])]);
  return uiIcon("hand")+'<b class="sgrn">'+L.length+'</b><span>'+(nm.length>1?nm.slice(0,-1).join(", ")+' i '+nm[nm.length-1]:nm[0])
    +' '+(L.length>1?'też mają':'też '+(me?'masz':'ma'))+' ochotę</span>';};
// 🔔 sekcja „Mają ochotę dziś”
// wspólne zaproszenie na dziś, w którym jestem ja i autor sygnału (np. z „Super ekipy”) — także gdy cofnąłem Reakcję (2026-11-24)
function sigWithRide(x){
  if(!x||x.user_id===uid||typeof wants==="undefined")return null;
  return wants.find(w=>dayDiff(new Date(w.range_from||w.starts_at))===0&&!wDone(w)&&(w.activity||"bike")===(x.activity||"bike")
    &&(()=>{const P=sigWPeople(w);return P.has(uid)&&P.has(x.user_id)})())||null;
}
// supWid: wiersz w klamrze Super ekipy, której pasek prowadzi do zaproszenia supWid — wtedy wiersz nie zaprasza osobno (2026-11-24)
function sigRow(x,un,supWid){
  const a=sigA(x.activity),me=x.user_id===uid,d=new Date(x.created_at),rc=sigReactIds(x).length,mine=sigIReact(x);
  const RW=sig2Ok&&(me||mine)?sigEkipaRide(x):null;   // 🚲 KROK 92: ekipa ma już wspólne zaproszenie na dziś
  const TW=RW||(me?null:sigWithRide(x));   // jedziemy już razem (wspólne zaproszenie z autorem sygnału) — zamiast „Zaproś …”
  const busy=!TW&&(me||mine)&&sigBusyO.has(x.user_id);   // ekipa już jedzie (prywatne zaproszenie, mnie w nim nie ma)
  const E=sig2Ok&&!TW&&!busy&&!supWid&&me?sigEkipaOthers(x):[],chetni=E.length;   // 🚲 „Zaproś ekipę ›” — tylko autor (3.0), gdy są chętni
  const late=RW&&wantCanInvite(RW)?sigEkipa(x).filter(id=>!sigWPeople(RW).has(id)):[];   // 🚲 KROK 92b: ktoś z ekipy jeszcze nie w zaproszeniu
  const rw=TW&&supWid&&TW.id===supWid?'':(TW?'<button type="button" class="lnk stgo" data-sgw="'+esc(TW.id)+'">'+sigTogether(TW.activity)+'</button>':'')
    +(late.length?'<button type="button" class="lnk stgo" data-sgadd="'+esc(RW.id+'|'+late.join(","))+'">'+sigAddLbl(late)+'</button>':'');
  // 🔗 „Jedziecie razem ›” / „Dopisz … ›” — w jednym rzędzie pod licznikiem (2026-11-25, prośba właściciela: z prawej robił się gęsty blok)
  const rwRow=rw?'<div class="sgln">'+rw+'</div>':'';
  const btn=me?'<span class="sgbtns">'+(chetni?'<button type="button" class="lnk stgo" data-sgc="'+esc(x.user_id)+'">Zaproś ekipę ('+E.length+') ›</button>':'')+'<button type="button" class="lnk stgo" data-sge="1">Zmień</button><button type="button" class="lnk stgo" data-sgx="1">Wycofaj</button></span>'
    :'<span class="sgbtns">'
      +(sig2Ok?'<button type="button" class="sgre'+(mine?' on':'')+'" data-sgr="'+esc(x.user_id)+'" aria-pressed="'+mine+'" title="'+(mine?'Cofnij':'Też mam ochotę!')+'" aria-label="'+(mine?'Cofnij „Też mam ochotę”':'Też mam ochotę!')+'">'+uiIcon("hand")+(rc?'<b>'+rc+'</b>':'')+'</button>':'')+'</span>';
  return '<div class="nit stn sgrow'+(un?' new':'')+'"><div class="ic">'+uiIcon(a[0])+'</div><div class="tx">'+(me?'<b>Ty</b>':nk(x.user_id))
    +(x.is_test?' <span class="ttag">'+uiIcon("flask")+' TEST</span>':'')
    +'<div class="w">'+esc(a[1].toLowerCase())+' · '+esc(hhmm(d))+(sigSoonHtml(x.user_id)?' '+sigSoonHtml(x.user_id):!TW&&!busy&&!supWid?' '+sigLeftHtml():'')+'</div>'+rwRow
    +(sigMsgTxt(x)?'<div class="sgmsg">'+sigMsgTxt(x)+(isAdmin&&!me?' <button type="button" class="lnk sghide" data-sgh="'+esc(x.user_id)+'">Ukryj</button>':'')+'</div>':'')
    +(x.msg_hidden&&me?'<div class="note">Komunikat ukryty przez administratora.</div>':'')
    +(rc&&(me||rc>1||!mine)?'<div class="sgrt">'+sigReactTxt(x)+'</div>':'')
    +(busy?'<div class="note">Ekipa '+sigAlready(x.activity)+' — organizator dostał znać i może Cię dopisać.</div>':'')
    +'</div>'+btn+(un?bsMk(sigKey(x)):'')+'</div>';
}
// wnętrze „Ekipa na dziś” — wspólne dla sekcji pod 🔔 i okna z machającą dłonią (2026-11-25): klamra Super ekipy, „Masz z kim …”, „Ekipa startuje”, przypomnienia, wycofane sygnały
// keep — filtr wierszy sygnałów (okno „Ekipa na dziś”); powiadomienia (przypomnienia, „Dopisz”, wycofane) zawsze w całości; bell — podświetlenie nowych i sortowanie nieprzeczytanych na górze
function sigEkipaBody(keep,bell){
  const L=sigList().filter(keep||(()=>true)),C=sigCancelUn(),EK=sigEkipaUn(),LT=sigLateUn(),SO=sigSoonUn(),RM=sigRemindUn();
  const U=bell?new Set(sigUnread()):new Set(),RU=bell?sigReactUn().length:0;
  const SS=sigSuperSigs(),sup=sigSuperOn(SS)&&SS.some(x=>L.includes(x));   // klamra zostaje, gdy pasuje choć jeden jej sygnał — pokazuje tylko pasujące wiersze
  const sorted=bell?L.slice().sort((a,b)=>(U.has(b)?1:0)-(U.has(a)?1:0)):L.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const un=x=>U.has(x)||(bell&&x.user_id===uid&&RU>0),rowf=x=>sigRow(x,un(x));
  // w klamrze: zaproszenie z paska („Jedziecie razem ›” / „Dopisz ›”) nie powtarza się przy każdym sygnale (2026-11-24)
  const supW=sup?(sigSuperRide(SS)||(sigSuperPart(SS)||{}).w||null):null,rowfS=x=>sigRow(x,un(x),supW&&supW.id);
  const rowsAll=sup?sigSuperHtml(SS,sorted.filter(x=>SS.includes(x)).map(rowfS).join(""))+sorted.filter(x=>!SS.includes(x)).map(rowf).join(""):sorted.map(rowf).join("");
  // „Masz z kim …” w oknie „Ekipa na dziś”: bez dublowania — gdy sygnał tej ekipy jest na liście / w klamrze, a ja nie jestem autorem (2026-11-25)
  const EKs=bell?EK:EK.filter(n=>n.actor===uid||!L.some(x=>x.user_id===n.actor));
  const notes=RM.length+SO.length+LT.length+EKs.length+C.length;
  return {L,U,RU,C,EK,LT,SO,RM,notes,html:RM.map(sigRemindRow).join("")+SO.map(sigSoonRow).join("")+LT.map(sigLateRow).join("")+EKs.map(sigEkipaRow).join("")+rowsAll+C.map(sigCancelRow).join("")};
}
const sigHintHtml=()=>'<div class="bsempty">Bez godziny i trasy.'+(sig2Ok?' Dłoń = „też mam ochotę” — autor dostanie znać i zaprosi ekipę (zaproszenie na dziś z zakresem godzin). Gdy dajesz Reakcję na cudzy sygnał, a ktoś z tamtej ekipy na Twój — ekipy łączą się w Super ekipę.':'')+'</div>';
function sigBellHtml(){
  if(!sigOn())return "";
  // sygnały to powiadomienia — Filtry ich nie zawężają (decyzja właściciela 2026-11-25)
  const B=sigEkipaBody(null,true);if(!B.L.length&&!B.C.length&&!B.LT.length&&!B.SO.length)return "";
  return bsSec("sig",sigCoin()+'Ekipa na dziś',B.U.size+B.RU+B.notes,B.L.length+B.notes,B.html+sigHintHtml());
}
/* 💬 pop-up „X ma ochotę” (KROK 90): raz na sygnał; kilka naraz — jedno okienko przewijane w bok */
const sigPopOff=()=>lsGet("sigPopOff")==="1";
// pamięć pokazanych okienek — osobno dla każdego konta (zakładki ?konto=N w jednej przeglądarce)
function sigPopSeen(){try{return new Set(JSON.parse(lsGet("sigPop:"+uid)||"[]"))}catch(e){return new Set()}}
function maybeSigPop(){
  if(!sigOn()||!sigOk||sigPopOff()||DEMO)return;
  if([...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide"))||gearOpen||needProfile()||pwMode||!$("wantform").classList.contains("hide"))return;
  const S=sigPopSeen(),L=sigList().filter(x=>x.user_id!==uid&&!S.has(sigKey(x))&&!sigDbSeen(x)&&!x.is_test&&!sigEkipaRide(x));
  if(!L.length)return;
  L.forEach(x=>S.add(sigKey(x)));lsSet("sigPop:"+uid,JSON.stringify([...S].slice(-120)));
  sigSeenSave(L,false);   // KROK 92: nie wróci na innym urządzeniu ani w innej przeglądarce
  sigPopQ=L.map(x=>x.user_id);sigPopI=0;sigView="pop";renderSigPop();
}
function sigAvHtml(id){
  const a=avData[id]&&avData[id].d;
  return '<span class="sgpav'+(genders[id]==="K"?' k':'')+(a?' ph':'')+'">'+(a?avImg(id,"gavi"):esc(String(nicks[id]||"?").charAt(0).toUpperCase()))+'</span>';
}
function renderSigPop(){
  const p=$("sigsheet"),L=sigPopQ.map(id=>sigs.find(s=>s.user_id===id)).filter(x=>x&&!x.cancelled_at);
  if(!L.length){closeSig();return}
  if(sigPopI>=L.length)sigPopI=L.length-1;
  const n=L.length,first=L[0],K=genders[first.user_id]==="K";
  const card=x=>{const a=sigA(x.activity),mine=sigIReact(x),rc=sigReactIds(x).length;
    return '<div class="sgpcard">'
     +'<div class="sgpava">'+sigAvHtml(x.user_id)+'<span class="sgpact" data-a="'+esc(x.activity)+'">'+uiIcon(a[0])+'</span></div>'
     +'<div class="sgpnick">'+nk(x.user_id)+'</div>'
     +'<div class="sgpbub">'+(sigMsgTxt(x)||'Mam dziś ochotę '+esc(a[2])+'!')+'<small>'+esc(a[1].toLowerCase())+' · '+esc(hhmm(new Date(x.created_at)))+(sigLeftHtml()?' '+sigLeftHtml():'')+'</small></div>'
     +(rc?'<div class="sgrt">'+sigReactTxt(x)+'</div>':'')
     +'<div class="sgwx">'+sigWxHtml()+'</div>'
     +'<div class="pbtns">'   // 3.0: tylko Reakcja — zaproszenie zakłada autor sygnału
       +(sig2Ok?'<button type="button" class="b'+(mine?' w':'')+' sgre2'+(mine?' on':'')+'" data-sgr="'+esc(x.user_id)+'" aria-pressed="'+mine+'">'+uiIcon("hand")+' '+(mine?'Też masz ochotę ✔':'Też mam ochotę!')+'</button>':'')+'</div>'
     +'</div>'};
  p.innerHTML='<div class="sheetbox popbox sigbox sgpop" role="dialog" aria-modal="true"><button class="sclose" data-sg="popx" aria-label="Zamknij">✕</button>'
   +'<span class="ptag">MAM OCHOTĘ</span>'
   +'<div class="ph">'+(n===1?esc(nickOf(first.user_id))+' ma ochotę':esc(nickOf(first.user_id))+' i '+(n-1)+' '+plf(n-1,["inna osoba","inne osoby","innych osób"])+' mają ochotę')+'</div>'
   +'<div class="sgpc" id="sgpc">'+L.map(card).join("")+'</div>'
   +(n>1?'<div class="sgpdots">'+L.map((x,i)=>'<button type="button" class="'+(i===sigPopI?'on':'')+'" data-sgd="'+i+'" aria-label="'+(i+1)+' z '+n+'"></button>').join("")+'</div>':'')
   +'<div class="pbtns"><button type="button" class="b" data-sg="popok">OK</button></div>'
   +'<div class="note sgpnote">Wyłączysz te okienka w ⚙️ → Jazdy i zaproszenia.</div></div>';
  p.classList.remove("hide");
  sigFillWx();
  const c=$("sgpc");if(c){c.scrollLeft=sigPopI*c.clientWidth;
    c.onscroll=()=>{const i=Math.round(c.scrollLeft/Math.max(1,c.clientWidth));if(i!==sigPopI){sigPopI=i;p.querySelectorAll(".sgpdots button").forEach((b,j)=>b.classList.toggle("on",j===i))}}}
}
// pop-up z zachętą: pierwsze 3 wejścia (raz na uruchomienie), tylko gdy przycisk z dłonią jest widoczny
// (gdy przy starcie otwarta jest Pomoc albo inne okienko — pokazuje się zaraz po jego zamknięciu, najpóźniej 3 min od startu)
let sigIntroDone=false;const sigT0=Date.now();
function maybeSigIntro(){
  if(sigIntroDone||Date.now()-sigT0>18e4||!sigFabOn()||sigActive()||$("fab").classList.contains("hide"))return;
  const n=+(lsGet("sigIntro")||0);if(n>=3){sigIntroDone=true;return}
  if([...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide"))||gearOpen||needProfile()||pwMode||!$("wantform").classList.contains("hide"))return;
  sigIntroDone=true;lsSet("sigIntro",String(n+1));openSig("intro");
}
{const mo=new MutationObserver(()=>{setTimeout(()=>{if(!sigIntroDone)maybeSigIntro();maybeSigPop()},450)});document.querySelectorAll(".sheet").forEach(el=>{if(el.id!=="sigsheet")mo.observe(el,{attributes:true,attributeFilter:["class"]})})}
$("sigfab").innerHTML=sigWheel;
$("sigfab").onclick=()=>{if(Date.now()<sigDoneT)return;openSig(sigActive()?"mine":"pick")};
$("sigsheet").addEventListener("click",e=>{
  if(e.target===$("sigsheet")){closeSig();return}
  const a=e.target.closest("[data-sga]");if(a){if(sigPick!==a.dataset.sga&&!sg.own)sg.msg="";sigPick=a.dataset.sga;renderSig();return}
  const mm=e.target.closest("[data-sgm]");
  if(mm){const t=mm.dataset.sgm;if(!t){sg.own=!sg.own;sg.msg="";renderSig();if(sg.own){const i=$("sgown");if(i)i.focus()}}else{sg.own=false;sg.msg=sg.msg===t?"":t;renderSig()}return}
  const rr=e.target.closest("[data-sgr]");if(rr){sigReact(rr.dataset.sgr);return}
  const dt=e.target.closest("[data-sgd]");if(dt){sigPopI=+dt.dataset.sgd;const c=$("sgpc");if(c)c.scrollTo({left:sigPopI*c.clientWidth,behavior:"smooth"});return}
  const b=e.target.closest("[data-sg]");if(!b)return;
  const k=b.dataset.sg;
  if(k==="popok"){const L=sigPopQ.map(id=>sigs.find(s=>s.user_id===id)).filter(Boolean);bsDoneAdd(L.map(sigKey));sigSeenSave(L,true);closeSig();renderBell();return}   // „OK” = przeczytane też pod 🔔
  if(k==="later"||k==="popx")closeSig();else if(k==="send")sigSend();
  else if(k==="edit")openSig("pick");else if(k==="keen"){closeSig();sigInviteKeen()}else if(k==="cancel"){closeSig();sigCancel()}else if(k==="bell"){closeSig();$("bellbtn").click()}
});
$("sigsheet").addEventListener("input",e=>{if(e.target.id==="sgown"){sg.msg=e.target.value.slice(0,40);const c=$("sgcnt");if(c)c.textContent=sg.msg.length+"/40"}});
// wybór z okna „Kogo zapraszasz?” (js/10, tryb „sig”) wraca tutaj
function sigPicked(vis,ids,gr){sg.vis=vis;sg.pick=new Set(ids);sg.gr=gr||"";if(sigView&&sigView!=="pop")renderSig()}
renderSig=shWrap(renderSig,"sigsheet");renderPop=shWrap(renderPop,"popsheet",dir=>!dir);   // 📱 bez skoku na górę („Mam ochotę”, okienko zaproszenia — poza przejściem do kolejnej karty)
