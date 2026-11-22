/* 👥 Grupy (KROK 70) — commit A: ⚙️ → Edytuj profil → „Grupy” (zaproszenia i prośby, Moje grupy, wyszukiwarka jawnych, „Mam kod”, „Załóż grupę”),
   ekran grupy (Ludzie / O grupie), formularz grupy i okno kodu (#grsheet), zapraszanie przez okno wyboru osób (openWho "gr"),
   „Przekształć w grupę” w widoku listy, link #grupa=KOD. 📣 KROK 76: zakładka „Tablica” (ogłoszenia grupy) — blok na końcu pliku.
   Wszystkie zmiany tylko funkcjami bazy (group_*); tabele są tylko do odczytu. Komunikaty błędów z bazy są po polsku → toast.
   Plik wczytywany jako ostatni: przy wczytaniu tylko rejestruje obsługę zdarzeń; niższe pliki wołają go z renderGear / kliknięć (przez typeof). */
let grK=null,grFromAdm=false;   // 👑 wszystkie grupy + prośby o limit (Administracja → Grupy)
let grPN=[];   // 📣 nieprzeczytane powiadomienia o ogłoszeniach (g_post / g_pin) — plakietki w „Moje grupy” i sekcja w 🔔
let grOk=null,grMsg="",grFor="",grLoading=false,grMine=[],grG={},grMem={},grLim={},grReqs=[],grId="",grTab="ppl",grOpenU="",grFind=null,grQ="",grFindT=0;
const GR_ICONS=["users","bike","mtb","gravel","road","run","walk","tree","flag","trophy","medal","heart","coffee","sun","moon","city"];
const GR_ROLE={owner:"właściciel",mod:"moderator",member:""};
const grOn=()=>!!session&&feat("grupy");
// 🎨 kolor grupy: z paletki (nazwa) albo własny #rrggbb (KROK 72)
const GR_HEX=/^#[0-9a-f]{6}$/;
const grCol=x=>x&&GR_HEX.test(x.color)?x.color:PL_COL[x&&x.color]||PL_COL.blue;
// tło pod biały napis: kolor grupy przyciemniony, aż kontrast z bielą ≥ 4,5 : 1 (żółte, zielone, turkusowe stają się czytelne)
function grInk(c){
  let [r,g,b]=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  const L=()=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
  for(let i=0;i<14&&1.05/(L()+.05)<4.5;i++){r=Math.round(r*.88);g=Math.round(g*.88);b=Math.round(b*.88)}
  return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
}
// nowa grupa: pierwszy kolor z paletki, którego nie mam jeszcze w swoich grupach
const grFreeCol=()=>{const U=new Set(grMine.filter(m=>m.status==="active"&&grG[m.group_id]).map(m=>grG[m.group_id].color));return Object.keys(PL_COL).find(c=>!U.has(c))||"blue"};
const grIc=x=>GR_ICONS.includes(x&&x.icon)?x.icon:"users";
// 👁 przy nazwie grupy w całej aplikacji (2026-11-23, wariant A): oko = jawna, przekreślone oko = ukryta, kłódka = dołączenie na prośbę (wolne — bez ikony), kółko = liczba członków
const grMemN=x=>grG[x.id]&&(grRole(x.id)||grG[x.id].members!=null)?grCnt(x.id):x.members!=null?+x.members:null;
function grBadges(x){if(!x)return "";const G=grG[x.id]||{},vis=x.visibility||G.visibility,jm=x.join_mode||G.join_mode,n=grMemN(x);
  return '<span class="grbg">'+(vis==="hidden"?'<span title="ukryta">'+uiIcon("eyeoff")+'</span>':'<span title="jawna">'+uiIcon("eye")+'</span>')
   +(jm==="request"?'<span title="dołączenie na prośbę">'+uiIcon("lock")+'</span>':'')+(n!=null?'<span class="grmc" title="członkowie">'+n+'</span>':'')+'</span>'}
const grNmTag=x=>'<span class="grnmw"><span class="grnm">'+esc(x.name)+'</span>'+(x.owner&&typeof demoIds!=="undefined"&&demoIds.has(x.owner)?'<span class="nkdemo" title="grupa demo — konta testowe">DEMO</span>':'')+grBadges(x)+'</span>';   // 🧪 KROK 75: plakietka przy grupach kont demo
const grIco=(x,big)=>'<span class="grico'+(big?' big':'')+'" style="background:'+grCol(x)+'" aria-hidden="true">'+uiIcon(grIc(x))+'</span>';
const grMy=g=>grMine.find(m=>m.group_id===g)||null;
const grSt=g=>{const m=grMy(g);return m?m.status:""};
const grRole=g=>{const m=grMy(g);return m&&m.status==="active"?m.role:""};
const grIsMod=g=>grRole(g)==="owner"||grRole(g)==="mod";
const grName=g=>grG[g]?grG[g].name:"grupa";
const grAct=g=>(grMem[g]||[]).filter(x=>x.status==="active");
const grUsed=g=>(grMem[g]||[]).filter(x=>x.status==="active"||x.status==="invited").length;
const grCnt=g=>grRole(g)?grAct(g).length:(grG[g]&&grG[g].members!=null?+grG[g].members:0);
const grOsob=n=>n+" "+plf(n,["osoba","osoby","osób"]);
const grLink=x=>location.origin+location.pathname+"#grupa="+encodeURIComponent(x.code||"");
const grErr=e=>{const m=e&&e.message||"błąd";if(/groups_color_check/.test(m))return "Własny kolor grupy wymaga KROKU 72 w bazie.";return /relation|schema cache|does not exist|Could not find/i.test(m)?"Grupy wymagają KROKU 70 w bazie.":m};
const grByName=(a,b)=>grName(a.group_id).localeCompare(grName(b.group_id),"pl");

/* 📥 dane: moje członkostwa (też zaproszenia i prośby) + grupy + skład + prośby o limit; wczytywane przy pierwszym pokazaniu */
async function grLoad(){
  if(!session){grOk=null;grFor="";grMine=[];grMem={};grLim={};grReqs=[];grPN=[];return}
  grLoading=true;
  try{
    const a=await sb.from("group_members").select("group_id,role,status,invited_by,created_at,joined_at").eq("user_id",uid).limit(200);
    if(a.error)throw a.error;
    const mine=a.data||[],ids=mine.map(m=>m.group_id),mem={},lim={};
    if(ids.length){
      const [b,c,d]=await Promise.all([
        sb.from("groups").select("id,owner,name,icon,descr,area,color,visibility,join_mode,member_limit,code,archived_at,posts_mods_only").in("id",ids),
        sb.from("group_members").select("group_id,user_id,role,status,invited_by,created_at,joined_at").in("group_id",ids).limit(5000),
        sb.from("group_limit_requests").select("id,group_id,from_limit,to_limit,status").in("group_id",ids).eq("status","pending")]);
      if(b.error)throw b.error;if(c.error)throw c.error;
      (b.data||[]).forEach(x=>{grG[x.id]=Object.assign({},grG[x.id]||{},x)});
      ids.forEach(i=>{mem[i]=[]});(c.data||[]).forEach(x=>{(mem[x.group_id]=mem[x.group_id]||[]).push(x)});
      (d.data||[]).forEach(x=>{lim[x.group_id]=x});
    }
    // 📣 nieprzeczytane ogłoszenia z moich grup (osobno od powiadomień o zaproszeniach — nie wypychają ich z limitu 80)
    const pn=ids.length?await sb.from("notifications").select("id,kind,group_id,actor,created_at").eq("user_id",uid).in("kind",["g_post","g_pin"]).is("read_at",null).order("created_at",{ascending:false}).limit(300):{data:[]};
    grPN=pn.error?[]:(pn.data||[]).filter(n=>grG[n.group_id]);
    grMine=mine.filter(m=>grG[m.group_id]);grMem=mem;grLim=lim;grOk=true;grFor=uid;
    grReqs=[];grMine.forEach(m=>{if(grIsMod(m.group_id))(grMem[m.group_id]||[]).forEach(x=>{if(x.status==="requested")grReqs.push(x)})});
    if(isKingReal())await grKLoad();else grK=null;
  }catch(err){grOk=false;grFor=uid;grMsg=grErr(err)==="Grupy wymagają KROKU 70 w bazie."?grErr(err):"Nie udało się wczytać grup: "+grErr(err)}
  grLoading=false;
}
function grRefresh(){try{if(gearOpen&&["main","nick","groups","group","gradm","admin","user","plist"].includes(gearView))renderGear();renderBell();if(wGrOk)renderWants();if(wGrOk&&!$("popsheet").classList.contains("hide"))renderPop()}catch(e){}}   // 👥 KROK 71: plakietki grup na kartach i w okienku nowego zaproszenia (nazwa zamiast „grupa”, gdy grupy dociągną się po okienku)
async function grReload(){await grLoad();grRefresh()}
const grFresh=()=>{if(session&&grFor!==uid){grOk=null;grMine=[];grMem={};grLim={};grReqs=[];grFind=null}if(session&&grOk===null&&!grLoading)grReload()};

/* ⚙️ → Edytuj profil → wiersz „Grupy” (obok „Ulubieni i listy”) */
function grRow(){
  if(!session)return "";grFresh();
  const has=grOk&&grMine.length;if(!grOn()&&!has)return "";
  const inv=grMine.filter(m=>m.status==="invited").length+grReqs.length,n=grMine.filter(m=>m.status==="active").length;
  return gRow("#0a84ff","users","Grupy"+betaTag("grupy"),n?"Twoje grupy: "+n:"Kluby i paczki znajomych",inv?'<span class="ios-bdg">'+inv+'</span>':n?'<span class="ios-v">'+n+'</span>':'','data-gx="hub"');
}

/* ⚙️ widoki „groups” (lista grup) i „group” (jedna grupa) — renderGear w js/05 */
function grHtml(){return gearView==="gradm"&&isKingReal()?grAdmHtml():gearView==="group"&&grG[grId]?grGroupHtml():grHubHtml()}
const grBtns=(no,yes,attrs)=>'<span class="grb"><button type="button" class="b small w" data-gx="'+no+'" '+attrs+'>Odrzuć</button><button type="button" class="b small" data-gx="'+yes+'" '+attrs+'>'+(yes==="acc"?"Dołącz":"Przyjmij")+'</button></span>';
function grInvRow(m){const x=grG[m.group_id];
  return '<div class="grir">'+grIco(x)+'<span class="grt" data-gx="open" data-gid="'+esc(x.id)+'"><b>'+grNmTag(x)+'</b><small>'+(m.invited_by&&nicks[m.invited_by]?'zaprasza '+esc(nicks[m.invited_by]):'zaproszenie do grupy')+(x.area?' · '+esc(x.area):'')+'</small></span>'
   +grBtns("dec","acc",'data-gid="'+esc(x.id)+'"')+'</div>'}
function grReqRow(r,withGroup){
  return '<div class="grir"><span class="grt">'+nk(r.user_id,"ktoś")+(withGroup?'<small>prosi o dołączenie do „'+esc(grName(r.group_id))+'”</small>':'')+'</span>'
   +grBtns("rno","rok",'data-gid="'+esc(r.group_id)+'" data-gu="'+esc(r.user_id)+'"')+'</div>'}
function grHubHtml(){
  grFresh();
  let h=backBtn()+'<div class="sname" style="margin-top:26px">Grupy'+betaTag("grupy")+'</div><div class="smail">Kluby i paczki znajomych: wspólny skład, role i zaproszenia do grupy.</div>';
  if(grOk===false)return h+'<p class="note grwait">'+esc(grMsg)+'</p>';
  if(grOk===null)return h+'<p class="note grwait">Wczytuję grupy…</p>';
  const inv=grMine.filter(m=>m.status==="invited").sort(grByName),req=grMine.filter(m=>m.status==="requested").sort(grByName),act=grMine.filter(m=>m.status==="active").sort(grByName);
  if(inv.length||grReqs.length)h+='<div class="ios"><div class="ios-gh">Do Ciebie</div><div class="grbox">'+inv.map(grInvRow).join("")+grReqs.map(r=>grReqRow(r,true)).join("")+'</div></div>';
  h+=gGrp("Moje grupy",act.map(m=>{const x=grG[m.group_id],n=grCnt(x.id),R=GR_ROLE[m.role];
      const un=grUnN(x.id);
      return gRow(grCol(x),grIc(x),grNmTag(x),[R?R[0].toUpperCase()+R.slice(1):"",un?(un===1?"nowe ogłoszenie":"nowe ogłoszenia"):""].filter(Boolean).join(" · "),un?'<span class="ios-bdg" aria-label="Nowe ogłoszenia: '+un+'">'+un+'</span>':'','data-gx="open" data-gid="'+esc(x.id)+'"')})
    .concat(req.map(m=>{const x=grG[m.group_id];return gRow(grCol(x),grIc(x),grNmTag(x),"Prośba wysłana — czekasz na przyjęcie","",'data-gx="open" data-gid="'+esc(x.id)+'"')})));
  if(!act.length&&!req.length&&!inv.length)h+='<p class="note" style="margin:10px 14px 0;font-size:14px;text-align:left">Nie należysz jeszcze do żadnej grupy. Załóż własną albo znajdź grupę niżej.</p>';
  if(grOn()){
    h+=gGrp("Dołącz albo załóż",[gRow("#34c759","plus","Załóż grupę","Np. MTB Przylesie, Gravel w niedzielę","",'data-gx="new"'),
       gRow("#8e8e93","link","Mam kod albo link","Dołączysz też do grupy ukrytej","",'data-gx="code"')]);
    if(grFind===null)grSearch("");
    h+='<div class="ios"><div class="ios-gh">Grupy jawne</div></div><input class="bsq srch" id="grq" type="search" placeholder="Szukaj: nazwa albo okolica…" autocomplete="off" value="'+esc(grQ)+'"><div id="grfind">'+grFindHtml()+'</div>';
  }
  return h;
}
async function grSearch(q){
  try{const r=await sb.rpc("groups_search",{q:q||""});if(r.error)throw r.error;
    grFind=r.data||[];grFind.forEach(x=>{grG[x.id]=Object.assign({},grG[x.id]||{},x,{visibility:"public"})})}
  catch(err){grFind=[];say("Grupy: "+grErr(err))}
  const f=$("grfind");if(f)f.innerHTML=grFindHtml();
}
function grFindHtml(){
  if(grFind===null)return '<p class="note grwait">Wczytuję…</p>';
  if(!grFind.length)return '<p class="note grwait">'+(grQ.trim()?"Nie znaleziono takiej grupy.":"Nie ma jeszcze grup jawnych — załóż pierwszą.")+'</p>';
  return '<div class="grbox">'+grFind.map(x=>{const st=grSt(x.id)||x.my_status||"",full=+x.members>=+x.member_limit;
    const btn=st==="active"?'<span class="note">Jesteś</span>':st==="requested"?'<span class="note">Czekasz</span>':st==="invited"?'<button type="button" class="b small" data-gx="acc" data-gid="'+esc(x.id)+'">Dołącz</button>'
      :full?'<span class="note">Pełna</span>':'<button type="button" class="b small'+(x.join_mode==="open"?'':' w')+'" data-gx="join" data-gid="'+esc(x.id)+'">'+(x.join_mode==="open"?"Dołącz":"Poproś")+'</button>';
    return '<div class="grir">'+grIco(x)+'<span class="grt" data-gx="open" data-gid="'+esc(x.id)+'"><b>'+grNmTag(x)+'</b><small>'+[x.area?esc(x.area):"",x.join_mode==="open"?"wolne dołączanie":"na prośbę"].filter(Boolean).join(" · ")+'</small></span>'+btn+'</div>'}).join("")+'</div>';
}

/* 👥 ekran grupy: Tablica / Ludzie / Statystyki / O grupie */
function grGroupHtml(){
  const g=grId,x=grG[g],st=grSt(g),role=grRole(g),mod=grIsMod(g),own=role==="owner";
  const meta=[x.visibility==="hidden"?"ukryta":"jawna",x.join_mode==="open"?"wolne dołączanie":"na prośbę",grOsob(grCnt(g))].join(" · ");
  let h=(grFromAdm&&isKingReal()?'<button class="sback" data-gx="adm">‹ Wszystkie grupy</button>':'<button class="sback" data-gx="hub">‹ Grupy</button>')+'<div class="grhead">'+grIco(x,true)+'<div class="sname">'+grNmTag(x)
   +(own?'<span class="pledb" role="button" tabindex="0" data-gx="edit" title="Edytuj grupę" aria-label="Edytuj grupę">'+uiIcon("pencil")+'</span>':'')+'</div>'
   +'<div class="smail">'+meta+(GR_ROLE[role]?' · <span class="grrole">'+GR_ROLE[role]+'</span>':'')+'</div></div>';
  if(st==="invited"){const m=grMy(g);
    h+='<div class="grbox grwait"><div class="note" style="font-size:15px">'+(m.invited_by&&nicks[m.invited_by]?esc(nicks[m.invited_by])+' zaprasza Cię do tej grupy.':'Masz zaproszenie do tej grupy.')+'</div><div class="cfmb"><button type="button" class="cfmno" data-gx="dec" data-gid="'+esc(g)+'">Odrzuć</button><button type="button" class="cfmok" data-gx="acc" data-gid="'+esc(g)+'">Dołącz</button></div></div>'}
  else if(st==="requested")h+='<div class="grbox grwait"><div class="note" style="font-size:15px">Prośba wysłana — właściciel albo moderator zdecyduje.</div><button type="button" class="lnk" data-gx="leave">Wycofaj prośbę</button></div>';
  else if(!role&&grOn()&&x.visibility==="public"){const full=grCnt(g)>=+x.member_limit;
    h+=full?'<p class="note grwait">Grupa jest pełna.</p>':'<button type="button" class="b big" data-gx="join" data-gid="'+esc(g)+'">'+(x.join_mode==="open"?"Dołącz do grupy":"Poproś o dołączenie")+'</button>'}
  if(!role&&!isKingReal())return h+grAboutHtml(g,false);
  if(!role)h+='<p class="note grwait">👑 Podgląd administratora — nie jesteś w tej grupie.</p>';
  // 📣 KROK 76: „Tablica” tylko dla członków (👑 spoza grupy jej nie widzi — reguły w bazie)
  const tabs=(role?[["board","Tablica"]]:[]).concat([["ppl","Ludzie"]],role?[["stats","Staty"]]:[],[["about","O grupie"]]);if((grTab==="board"||grTab==="stats")&&!role)grTab="ppl";   // 📊 KROK 78: statystyki też tylko dla członków
  h+='<div class="seg grseg">'+tabs.map(([k,t])=>{const un=k==="board"?grUnN(g):0;return '<button type="button" class="'+(grTab===k?'on':'')+'" data-gx="tab" data-v="'+k+'">'+t+(un?' <span class="ios-bdg">'+un+'</span>':'')+'</button>'}).join("")+'</div>';
  return h+(grTab==="about"?grAboutHtml(g,true):grTab==="board"?grBoardHtml(g):grTab==="stats"?grStatsHtml(g):grPplHtml(g));
}
function grPplHtml(g){
  const x=grG[g],role=grRole(g),mod=grIsMod(g),own=role==="owner",M=grMem[g]||[],used=grUsed(g),lim=+x.member_limit;
  const canInv=mod||(x.join_mode==="open"&&!!role);let h="";
  if(canInv)h+=gGrp("Zapraszanie",[gRow("#34c759","plus","Zaproś osoby","Z ulubionych, Twoich list albo wszystkich",'<span class="ios-v">'+used+' / '+lim+'</span>','data-gx="inv"')])
    +(used>=lim?'<p class="note" style="margin:8px 14px 0;font-size:13px;text-align:left">Limit miejsc wykorzystany (liczą się członkowie i zaproszeni).'+(own?' Poproś o więcej w zakładce „O grupie”.':'')+'</p>':'');
  const rq=mod?M.filter(m=>m.status==="requested"):[];
  if(rq.length)h+='<div class="ios"><div class="ios-gh">Proszą o dołączenie</div><div class="grbox">'+rq.map(r=>grReqRow(r,false)).join("")+'</div></div>';
  const ord={owner:0,mod:1,member:2},act=grAct(g).sort((a,b)=>(ord[a.role]-ord[b.role])||((isFav(b.user_id)?1:0)-(isFav(a.user_id)?1:0))||String(nicks[a.user_id]||"").localeCompare(String(nicks[b.user_id]||""),"pl"));   // ⭐ rola (właściciel, moderatorzy), w obrębie roli ulubieni na górze, potem nick
  h+='<div class="ios"><div class="ios-gh">Członkowie ('+act.length+')</div></div>'+pfBar("gm",act.length)
   +'<div class="sleft" data-pfl="gm">'+act.map(m=>{const id=m.user_id,R=GR_ROLE[m.role],me=id===uid;
     const can=!me&&(own||(mod&&m.role==="member")),open=can&&grOpenU===id;
     return '<div class="grm" data-pu="'+esc(id)+'"><div class="arow">'+nk(id,"ktoś")+(R?'<span class="note grrole">'+R+'</span>':'')+(me?'<span class="note">to Ty</span>':'')
       +(can?'<button type="button" class="plrm'+(open?' on':'')+'" data-gx="man" data-gu="'+esc(id)+'" aria-expanded="'+open+'" aria-label="Zarządzaj: '+esc(nicks[id]||"")+'" title="Zarządzaj">'+uiIcon("sliders")+'</button>':'')+'</div>'
       +(open?'<div class="gract">'+(own?'<button type="button" class="b small w" data-gx="role" data-gu="'+esc(id)+'">'+(m.role==="mod"?"Odbierz moderatora":"Zrób moderatorem")+'</button><button type="button" class="b small w" data-gx="xfer" data-gu="'+esc(id)+'">Przekaż grupę</button>':'')
          +'<button type="button" class="b small bad" data-gx="rm" data-gu="'+esc(id)+'">Usuń z grupy</button></div>':'')+'</div>'}).join("")
   +'<div class="note pfnone hide">Nikt nie pasuje do filtra.</div></div>';
  const iv=mod?M.filter(m=>m.status==="invited"):[];
  if(iv.length)h+='<div class="ios"><div class="ios-gh">Zaproszeni — czekają na odpowiedź ('+iv.length+')</div></div><div class="sleft">'+iv.map(m=>'<div class="grm"><div class="arow">'+nk(m.user_id,"ktoś")
     +(m.invited_by&&nicks[m.invited_by]&&m.invited_by!==uid?'<span class="note">zapr. '+esc(nicks[m.invited_by])+'</span>':'')
     +(own||m.invited_by===uid||mod?'<button type="button" class="plrm" data-gx="rm" data-gu="'+esc(m.user_id)+'" aria-label="Cofnij zaproszenie" title="Cofnij zaproszenie">'+uiIcon("xcircle")+'</button>':'')+'</div></div>').join("")+'</div>';
  if(own&&act.length>=20&&!act.some(m=>m.role==="mod"))h+='<p class="note" style="margin:10px 14px 0;font-size:13px;text-align:left">Grupa rośnie — wyznacz moderatora (ikona przy osobie → „Zrób moderatorem”).</p>';
  return h;
}
function grAboutHtml(g,member){
  const x=grG[g],role=grRole(g),mod=grIsMod(g),own=role==="owner",lr=grLim[g],used=grUsed(g);
  let h=(x.descr||x.area?'<div class="ios"><div class="ios-gh">O grupie</div><div class="grbox">'+(x.descr?'<div class="grdesc">'+esc(x.descr)+'</div>':'')
     +(x.area?'<div class="note grarea">'+uiIcon("pin")+' '+esc(x.area)+'</div>':'')+'</div></div>':'');
  if(!member)return h;
  if(x.code)h+=gGrp("Zaproszenie linkiem",[gRow("#0a84ff","link","Kopiuj link do grupy","Kod: "+esc(x.code)+" · kto ma link, może dołączyć"+(x.join_mode==="open"?"":" (na prośbę)"),"",'data-gx="copy"'),
     mod?gRow("#8e8e93","repeat","Nowy kod","Stary link przestanie działać","",'data-gx="newcode"'):""]);
  h+=gGrp("Miejsca",[own&&!lr?gRow("#ff9f0a","users","Zajęte: "+used+" z "+x.member_limit,"Poproś o większy limit — decyduje główny administrator","",'data-gx="limit"'):""])
   +(!own||lr?'<p class="note" style="margin:8px 14px 0;font-size:13px;text-align:left">Zajęte miejsca: '+used+' z '+x.member_limit+' (członkowie i zaproszeni).'+(lr?' Prośba o limit '+lr.to_limit+' czeka na decyzję.':'')+'</p>':'');
  if(own)h+='<div class="ios"><div class="ios-gh">Tablica — kto pisze</div></div><div class="seg grfseg">'+[["all","Wszyscy członkowie"],["mods","Właściciel i moderatorzy"]].map(([k,t])=>'<button type="button" class="'+((!!x.posts_mods_only)===(k==="mods")?'on':'')+'" data-gx="pmode" data-v="'+k+'">'+t+'</button>').join("")+'</div>'
     +'<p class="note" style="margin:8px 14px 0;font-size:13px;text-align:left">Czytają zawsze wszyscy członkowie. Przypinają, usuwają cudze wpisy: właściciel i moderatorzy.</p>';
  if(own)h+=gGrp("Zarządzanie",[gRow(grCol(x),"pencil","Edytuj grupę","Nazwa, ikona, opis, okolica, kolor, widoczność","",'data-gx="edit"'),
     gRow("#5856d6","user","Przekaż grupę","Wybierz osobę w zakładce „Ludzie”","",'data-gx="xferhint"'),
     gRow("#ff3b30","trash","Usuń grupę","Znikną członkostwa i zaproszenia","",'data-gx="del"')]);
  if(!own&&isKingReal())h+=gGrp("👑 Administrator",[gRow("#ff3b30","trash","Usuń grupę","Np. za treści łamiące zasady — znikną członkostwa i zaproszenia","",'data-gx="del"')]);
  const alone=own&&!grAct(g).some(m=>m.user_id!==uid);
  if(!role)return h;
  if(!own||alone)h+='<div class="ios-grp" style="margin-top:22px"><button type="button" class="ios-it ios-row ios-out" data-gx="leave">'+(alone?"Zamknij grupę (archiwum)":"Wyjdź z grupy")+'</button></div>';
  else h+='<p class="note" style="margin:14px 14px 0;font-size:13px;text-align:left">Żeby wyjść z grupy, najpierw przekaż ją innej osobie.</p>';
  return h;
}
// okno wyboru osób (js/10, tryb "gr"): kto już jest w grupie albo ma zaproszenie — widoczny, ale nie do wybrania
function grDis(g){const M=new Map();(grMem[g]||[]).forEach(x=>{if(x.status==="active")M.set(x.user_id,"w grupie");else if(x.status==="invited")M.set(x.user_id,"zaproszony(a)")});return M}
async function grInvite(g,ids){
  const r=await sb.rpc("group_invite",{g,users:ids});if(r.error)throw r.error;
  const n=+r.data||0;say(n?"👥 „"+grName(g)+"”: wysłano "+n+" "+plf(n,["zaproszenie","zaproszenia","zaproszeń"])+". Osoby zobaczą je w ⚙️ → Grupy.":"Nikt nowy — te osoby już są w grupie albo mają zaproszenie.");
  await grReload();return n;
}

/* 🪟 okno #grsheet: formularz grupy („Nowa grupa” / „Edytuj grupę”) i „Mam kod” */
const gf={mode:"form",id:"",name:"",icon:"users",descr:"",area:"",color:"blue",vis:"public",join:"request",ids:[],busy:false,code:"",prev:null};
function grSheet(){let p=$("grsheet");if(!p){p=document.createElement("div");p.className="sheet bsh hide";p.id="grsheet";document.body.appendChild(p)}return p}
function openGrForm(id,pre){
  if(!session)return;if(needProfile()){askNick();return}
  const x=id?grG[id]:null;pre=pre||{};
  Object.assign(gf,{mode:"form",id:id||"",busy:false,ids:(pre.ids||[]).filter(u=>u!==uid),off:new Set(),invOpen:(pre.ids||[]).length<=10,name:x?x.name:pre.name||"",icon:x?grIc(x):"users",descr:x?x.descr||"":"",area:x?x.area||"":"",
    color:x?x.color:pre.color||grFreeCol(),vis:x?x.visibility:"public",join:x?x.join_mode:"request"});
  renderGrSheet(true);
}
/* 👥 nowa grupa z list (2026-11-22): kogo zaprosić od razu — wybór w oknie osób (openWho "grn": listy, ulubieni, filtry),
   podgląd z ptaszkami (odznaczanie), licznik wolnych miejsc; za dużo osób = przycisk nieaktywny (group_invite przy przekroczeniu limitu odrzuca całość) */
const grStartLim=()=>{const v=+(window.grStartLimV||0);return v>1?v:30};   // groups_member_limit z app_settings (js/14), domyślnie 30
const grFree=()=>grStartLim()-1;   // jedno miejsce zajmuje zakładający
const grIdsAll=()=>(gf.ids||[]).filter(u=>u!==uid&&nicks[u]&&!modGone(u));
const grIdsOn=()=>grIdsAll().filter(u=>!gf.off.has(u));
const grOver=()=>grIdsOn().length-grFree();
function grPicked(ids){gf.ids=ids.filter(u=>u!==uid);gf.off=new Set();gf.invOpen=true;renderGrSheet()}   // powrót z okna wyboru osób
function grInvHtml(){
  const A=grIdsAll(),n=grIdsOn().length,F=grFree(),L=grStartLim(),ov=n-F,col=!gf.invOpen;
  let h='<label>Zaproś od razu <span class="pe-opt">(opcjonalnie)</span></label>'
   +'<button type="button" class="prow pladd" data-gk="who"><span class="cbx plplus">+</span><span class="pnm">'+(A.length?"Zmień wybór…":"Wybierz osoby… (Twoje listy, ulubieni)")+'</span></button>';
  if(A.length){const all=n===A.length;
    h+=secBar(uiIcon("users"),"Wybrane osoby",A.length,col,n<A.length?"zaznaczono "+n:"",'data-gk="invt"',false)
     +'<div class="secb'+(col?' hide':'')+'"><div class="secact"><button type="button" class="lnk" data-gk="tglall">'+(all?"Odznacz wszystkich":"Zaznacz wszystkich")+'</button></div>'
     +(col?'':A.sort((a,b)=>nicks[a].localeCompare(nicks[b],"pl")).map(u=>'<button type="button" class="prow'+(gf.off.has(u)?'':' on')+'" data-gk="tgl" data-gu="'+esc(u)+'"><span class="cbx">'+CHECK+'</span><span class="pnm">'+nk(u)+'</span></button>').join(""))+'</div>'}
  h+='<div class="note grfh grcnt'+(ov>0?' over':'')+'">'+(ov>0?"Za dużo o "+ov+" — odznacz "+ov+" "+plf(ov,["osobę","osoby","osób"])+". Wolnych miejsc: "+F+" (limit grupy "+L+", w tym Ty)."
     :n?"Zaprosisz "+n+" "+plf(n,["osobę","osoby","osób"])+" · wolnych miejsc: "+F+". Członkiem zostanie ten, kto przyjmie zaproszenie."
     :"Wolnych miejsc: "+F+" (limit grupy "+L+", w tym Ty). Zaproszenie dostaną pod 🔔.")+'</div>';
  return h;
}
function openGrCode(code){
  if(!session){say("Zaloguj się, żeby dołączyć do grupy.");return}if(needProfile()){askNick();return}
  Object.assign(gf,{mode:"code",code:code||"",prev:null,busy:false});renderGrSheet(true);if(code)grCheckCode();
}
/* 👤 karta osoby → „Dodaj do grupy…”: grupy, do których mogę zapraszać (właściciel / moderator; członek — gdy dołączanie wolne) */
const grCanInv=g=>{const x=grG[g];return grIsMod(g)||(!!grRole(g)&&x&&x.join_mode==="open")};
const grInvGroups=()=>grMine.filter(m=>m.status==="active"&&grCanInv(m.group_id)).sort(grByName).map(m=>m.group_id);
const grUserSt=(g,u)=>{const m=(grMem[g]||[]).find(x=>x.user_id===u);return m?m.status:""};
function grAddRow(u){
  if(!session||u===uid||!grOk||grFor!==uid)return "";
  const G=grInvGroups();if(!G.length&&!grOn())return "";
  const inG=grMine.filter(m=>m.status==="active"&&grUserSt(m.group_id,u)==="active").map(m=>grName(m.group_id));
  return gRow("#0a84ff","users","Dodaj do grupy…",inG.length?"W grupach: "+esc(inG.join(", ")):G.length?"Zaproś do jednej z Twoich grup":"Załóż grupę i zaproś tę osobę",inG.length?'<span class="ios-v">'+inG.length+'</span>':'','data-gx="addto" data-gu="'+esc(u)+'"');
}
function openGrPick(u){if(!session||!nicks[u])return;Object.assign(gf,{mode:"pick",u,busy:false});renderGrSheet(true)}
function closeGr(){const p=grSheet();p.classList.add("hide");p.innerHTML=""}
const grSeg=(k,v,opts)=>'<div class="seg grfseg">'+opts.map(([o,t])=>'<button type="button" class="'+(v===o?'on':'')+'" data-'+k+'="'+o+'">'+t+'</button>').join("")+'</div>';
function grKeep(){const v=i=>{const e=$(i);return e?e.value:null};["name","descr","area"].forEach(k=>{const e=v("gr"+k);if(e!=null)gf[k]=e});const c=v("grcode");if(c!=null)gf.code=c}
function renderGrSheet(first){
  const p=grSheet();p.classList.remove("hide");if(!first)grKeep();
  let tt,body,btn;
  if(gf.mode==="pick"){tt="Dodaj do grupy";const G=grInvGroups();
    body='<div class="note" style="margin-top:6px;text-align:center;font-size:14px">Do której grupy zaprosić '+nk(gf.u)+'?</div><div class="bslist">'
     +(G.length?G.map(g=>{const x=grG[g],st=grUserSt(g,gf.u),full=grUsed(g)>=+x.member_limit,dis=!!st||full||gf.busy;
        return '<button type="button" class="prow'+(st==="active"?' on':'')+(dis?' dis':'')+'" data-gk="pickg" data-gid="'+esc(g)+'"'+(dis?' disabled':'')+'><span class="cbx">'+CHECK+'</span><span class="pnm">'+grIco(x)+' '+grNmTag(x)+'</span><span class="pjn">'+(st==="active"?"w grupie":st==="invited"?"zaproszony(a)":st==="requested"?"prosi — przyjmij w grupie":full?"brak miejsc":"")+'</span></button>'}).join("")
       :'<div class="bsempty">Nie masz grup, do których możesz zapraszać.</div>')
     +(grOn()?'<button type="button" class="prow pladd" data-gk="picknew"><span class="cbx plplus">+</span><span class="pnm">Nowa grupa (zaprosisz: '+esc(nicks[gf.u]||"")+')</span></button>':'')+'</div>';
    btn='<button type="button" class="b big" data-gk="close">Gotowe</button>';
  }else if(gf.mode==="code"){tt="Dołącz kodem";const pv=gf.prev,st=pv&&pv.status;
    body='<div class="note" style="margin-top:6px;text-align:center;font-size:14px">Wklej link do grupy albo wpisz kod, który dostałeś(-aś).</div>'
     +'<div class="wsqrow"><input class="bsq" id="grcode" type="text" maxlength="200" placeholder="Kod albo link" autocomplete="off" value="'+esc(gf.code)+'"><button type="button" class="b small" data-gk="check"'+(gf.busy?' disabled':'')+'>Sprawdź</button></div>'
     +'<div class="note plinfo" id="grinfo"></div>'
     +(pv?'<div class="grbox" style="margin-top:8px"><div class="grir">'+grIco(pv)+'<span class="grt"><b>'+esc(pv.name)+'</b><small>'+[pv.area?esc(pv.area):"",grOsob(+pv.members||0),pv.join_mode==="open"?"wolne dołączanie":"na prośbę",pv.visibility==="hidden"?"ukryta":""].filter(Boolean).join(" · ")+'</small></span></div>'
       +(pv.descr?'<div class="grdesc" style="font-size:14px;padding-bottom:8px">'+esc(pv.descr)+'</div>':'')+'</div>':'');
    btn=pv?(st==="active"?'<button type="button" class="b big" data-gk="openg">Jesteś w tej grupie — otwórz</button>':st==="requested"?'<button type="button" class="b big w" data-gk="openg">Prośba już wysłana — otwórz</button>'
      :'<button type="button" class="b big" data-gk="joincode"'+(gf.busy?' disabled':'')+'>'+(st==="invited"||pv.join_mode==="open"?"Dołącz do grupy":"Poproś o dołączenie")+'</button>'):'';
  }else{tt=gf.id?"Edytuj grupę":"Nowa grupa";const n=gf.id?0:grIdsOn().length,ov=!gf.id&&grOver()>0;
    body='<div class="bslist grform">'
     +'<label for="grname">Nazwa</label><input class="bsq" id="grname" type="text" maxlength="40" placeholder="Np. MTB Przylesie" autocomplete="off" value="'+esc(gf.name)+'">'
     +'<label>Ikona i kolor</label><div class="gricons" role="radiogroup" aria-label="Ikona grupy">'+GR_ICONS.map(k=>'<button type="button" class="gricb'+(gf.icon===k?' on':'')+'" data-gic="'+k+'"'+(gf.icon===k?' style="background:'+grCol(gf)+'"':'')+' aria-label="Ikona '+k+'">'+uiIcon(k)+'</button>').join("")+'</div>'
     +'<div class="plcols" role="radiogroup" aria-label="Kolor grupy">'+Object.keys(PL_COL).map(c=>'<button type="button" class="plcol'+(gf.color===c?' on':'')+'" data-gcl="'+c+'" style="background:'+PL_COL[c]+'" aria-label="Kolor '+c+'"></button>').join("")
     // 🎨 własny kolor (KROK 72): kółko z tęczą (albo wybranym kolorem) otwiera systemowy wybierak; pipeta — gdy przeglądarka ją ma
     +'<label class="plcol plcust'+(GR_HEX.test(gf.color)?' on':'')+'" id="grcust" title="Własny kolor"'+(GR_HEX.test(gf.color)?' style="background:'+gf.color+'"':'')+'><input type="color" id="grcolin" value="'+grCol(gf)+'" aria-label="Własny kolor grupy"></label></div>'
     +'<div class="grcolx">'+(GR_HEX.test(gf.color)?'<span class="note">Własny kolor '+gf.color+'</span>':'<span class="note">Ostatnie kółko — własny kolor</span>')
     +('EyeDropper' in window?'<button type="button" class="lnk" data-gk="eyedrop">'+uiIcon("pipette")+' Pipeta</button>':'')+'</div>'
     +'<label for="grdescr">Opis <span class="pe-opt">(opcjonalnie)</span></label><textarea class="bsmsg" id="grdescr" maxlength="500" rows="3" placeholder="Dla kogo jest grupa, jak często jeździcie…">'+esc(gf.descr)+'</textarea>'
     +'<label for="grarea">Okolica <span class="pe-opt">(opcjonalnie)</span></label><input class="bsq" id="grarea" type="text" maxlength="60" placeholder="Np. Przylesie, Zalesie" autocomplete="off" value="'+esc(gf.area)+'">'
     +'<label>Kto znajdzie grupę?</label>'+grSeg("gvis",gf.vis,[["public","Jawna"],["hidden","Ukryta"]])
     +'<div class="note grfh">'+(gf.vis==="public"?"Widać ją w wyszukiwarce (tylko zalogowani).":"Nie ma jej w wyszukiwarce — wejście tylko z zaproszenia albo linku.")+'</div>'
     +'<label>Dołączanie</label>'+grSeg("gjm",gf.join,[["request","Na prośbę"],["open","Wolne"]])
     +'<div class="note grfh">'+(gf.join==="open"?"Każdy, kto znajdzie grupę albo ma link, dołącza od razu. Członkowie też mogą zapraszać.":"Prośby przyjmuje właściciel albo moderator. Zapraszają właściciel i moderatorzy.")+'</div>'
     +(gf.id?'':grInvHtml())
     +'<div class="note plinfo" id="grinfo"></div></div>';
    btn='<button type="button" class="b big" data-gk="save"'+(gf.busy||ov?' disabled':'')+'>'+(gf.id?"Zapisz zmiany":n?"Załóż grupę i zaproś "+n:"Załóż grupę")+'</button>';
  }
  const L0=first?null:p.querySelector(".bslist"),sc=L0?L0.scrollTop:0;
  p.innerHTML='<div class="bsbox bsauto" role="dialog" aria-modal="true"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-gk="close">Anuluj</button><b>'+tt+'</b><span style="min-width:64px"></span></div>'+body+btn+'</div>';
  const L1=sc?p.querySelector(".bslist"):null;if(L1)L1.scrollTop=sc;
  if(first)setTimeout(()=>{const i=$(gf.mode==="code"?"grcode":"grname");if(i&&!i.value)i.focus()},50);
}
const grInfo=t=>{const i=$("grinfo");if(i){i.textContent=t;if(t)i.scrollIntoView({block:"nearest"})}};   // komunikat widoczny także przy przewiniętym formularzu
const grCodeOf=s=>{s=String(s||"").trim();const m=/grupa=([0-9a-z]+)/i.exec(s);return (m?m[1]:s).replace(/[^0-9a-z]/gi,"").toLowerCase()};
async function grCheckCode(){
  grKeep();const c=grCodeOf(gf.code);if(c.length<4){grInfo("Wpisz kod albo wklej link.");return}
  gf.busy=true;renderGrSheet();
  try{const r=await sb.rpc("group_by_code",{c});if(r.error)throw r.error;gf.busy=false;gf.prev=r.data||null;const i=$("grcode");if(i)i.value=c;gf.code=c;renderGrSheet();if(!gf.prev)grInfo("Kod nie pasuje do żadnej grupy.")}
  catch(err){gf.busy=false;renderGrSheet();grInfo(grErr(err))}
}
// 🎨 własny kolor: podgląd na żywo bez przerysowania (wybierak zostaje otwarty), zapis w formularzu po zamknięciu wybieraka
const grColLive=c=>{gf.color=c;const k=$("grcust");if(k){k.style.background=c;k.classList.add("on")}grSheet().querySelectorAll(".plcol.on[data-gcl]").forEach(b=>b.classList.remove("on"));const i=grSheet().querySelector(".gricb.on");if(i)i.style.background=c};
grSheet().addEventListener("change",e=>{if(e.target.id==="grcolin"){const c=String(e.target.value||"").toLowerCase();if(GR_HEX.test(c)){gf.color=c;renderGrSheet()}}});
grSheet().addEventListener("input",e=>{if(e.target.id==="grcolin"){const c=String(e.target.value||"").toLowerCase();if(GR_HEX.test(c))grColLive(c);return}if(e.target.id==="grcode"&&gf.prev){gf.prev=null;gf.code=e.target.value;renderGrSheet();const i=$("grcode");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}else grInfo("")});
grSheet().addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.target.id==="grcode"||e.target.id==="grname"||e.target.id==="grarea")){e.preventDefault();const b=grSheet().querySelector(gf.mode==="code"&&!gf.prev?'[data-gk="check"]':'[data-gk="save"],[data-gk="joincode"]');if(b&&!b.disabled)b.click()}});
grSheet().addEventListener("click",async e=>{
  const p=grSheet();if(e.target===p){closeGr();return}
  const ic=e.target.closest("[data-gic]");if(ic){gf.icon=ic.dataset.gic;renderGrSheet();return}
  const cl=e.target.closest("[data-gcl]");if(cl){gf.color=cl.dataset.gcl;renderGrSheet();return}
  const vs=e.target.closest("[data-gvis]");if(vs){gf.vis=vs.dataset.gvis;renderGrSheet();return}
  const jm=e.target.closest("[data-gjm]");if(jm){gf.join=jm.dataset.gjm;renderGrSheet();return}
  const k=e.target.closest("[data-gk]");if(!k||k.disabled)return;const a=k.dataset.gk;
  if(a==="eyedrop"){try{const r=await new EyeDropper().open(),c=String(r&&r.sRGBHex||"").toLowerCase();if(GR_HEX.test(c)){gf.color=c;renderGrSheet()}}catch(err){}return}   // 🎨 pipeta (Chrome/Edge na komputerze)
  if(a==="close"){closeGr();return}
  if(a==="who"){grKeep();openWho("grn",grIdsOn());return}   // 👥 okno wyboru osób nad formularzem
  if(a==="invt"){gf.invOpen=!gf.invOpen;renderGrSheet();return}
  if(a==="tgl"){const u=k.dataset.gu;gf.off.has(u)?gf.off.delete(u):gf.off.add(u);renderGrSheet();return}
  if(a==="tglall"){const A=grIdsAll();gf.off=A.every(u=>!gf.off.has(u))?new Set(A):new Set();renderGrSheet();return}
  if(a==="check"){await grCheckCode();return}
  if(a==="pickg"){const g=k.dataset.gid;gf.busy=true;renderGrSheet();try{await grInvite(g,[gf.u])}catch(err){say(grErr(err))}gf.busy=false;if(gf.mode==="pick"&&!grSheet().classList.contains("hide"))renderGrSheet();return}
  if(a==="picknew"){openGrForm("",{ids:[gf.u]});return}
  if(a==="openg"){const g=gf.prev&&gf.prev.id;closeGr();if(g){await grLoad();grGo(g)}return}
  if(a==="joincode"){const pv=gf.prev;if(!pv)return;gf.busy=true;renderGrSheet();
    try{const r=await sb.rpc("group_join_code",{c:grCodeOf(gf.code)});if(r.error)throw r.error;closeGr();
      say(r.data==="active"?"👥 Dołączono do grupy „"+pv.name+"”":"🙋 Wysłano prośbę o dołączenie do „"+pv.name+"”");await grLoad();grGo(pv.id)}
    catch(err){gf.busy=false;renderGrSheet();grInfo(grErr(err))}return}
  if(a==="save"){grKeep();const n=gf.name.trim().replace(/\s+/g," ");
    if(n.length<3||n.length>40){grInfo("Nazwa grupy: od 3 do 40 znaków.");return}
    const inv=gf.id?[]:grIdsOn();if(!gf.id&&grOver()>0){grInfo("Za dużo osób do zaproszenia — odznacz "+grOver()+".");return}
    gf.busy=true;renderGrSheet();
    const args={p_name:n,p_icon:gf.icon,p_descr:gf.descr.trim(),p_area:gf.area.trim(),p_visibility:gf.vis,p_join_mode:gf.join,p_color:gf.color};
    try{let g=gf.id;
      if(g){const r=await sb.rpc("group_update",Object.assign({g},args));if(r.error)throw r.error;closeGr();say("Zapisano grupę „"+n+"”")}
      else{const r=await sb.rpc("group_create",args);if(r.error)throw r.error;g=r.data;closeGr();say("👥 Założono grupę „"+n+"”");
        if(inv.length){try{await grInvite(g,inv)}catch(err){say("Grupa założona, ale zaproszenia nie poszły: "+grErr(err))}}}
      await grLoad();grGo(g);
    }catch(err){gf.busy=false;renderGrSheet();grInfo(grErr(err))}return}
});
// przejście do ekranu grupy (otwiera ⚙️, jeśli zamknięte)
function grGo(g){grId=g;grTab=grRole(g)?"board":"ppl";grOpenU="";grOpenP="";grEditP="";pf.gm=null;if(!gearOpen){gearOpen=true;gearFrom=""}gearView=grG[g]?"group":"groups";renderGear();if(grTab==="board")grPostsLoad(g)}

/* 👑 Administracja → Grupy: wszystkie grupy (👑 tymczasowo widzi też ukryte — KROK 70) i prośby o większy limit */
async function grKLoad(){
  const [a,b,c]=await Promise.all([
    sb.from("groups").select("id,owner,name,icon,descr,area,color,visibility,join_mode,member_limit,code,created_at,archived_at").order("created_at",{ascending:false}).limit(500),
    sb.from("group_limit_requests").select("id,group_id,asked_by,from_limit,to_limit,status,created_at").eq("status","pending").order("created_at").limit(100),
    sb.from("group_members").select("group_id,user_id,role,status,invited_by,created_at,joined_at").limit(10000)]);
  if(a.error||b.error||c.error){grK=null;return}
  const cnt={},mem={};(c.data||[]).forEach(x=>{(mem[x.group_id]=mem[x.group_id]||[]).push(x);if(x.status==="active")cnt[x.group_id]=(cnt[x.group_id]||0)+1});
  (a.data||[]).forEach(x=>{grG[x.id]=Object.assign({},grG[x.id]||{},x,{members:cnt[x.id]||0});if(!grMy(x.id))grMem[x.id]=mem[x.id]||[]});
  grK={groups:a.data||[],reqs:(b.data||[]).filter(r=>grG[r.group_id])};
}
const grKReqN=()=>isKingReal()&&grK?grK.reqs.length:0;
function grLimRow(r){const x=grG[r.group_id];
  return '<div class="grir wrap">'+grIco(x)+'<span class="grt" data-gx="open" data-gid="'+esc(x.id)+'"><b>'+grNmTag(x)+'</b><small>'+esc(nicks[r.asked_by]||"właściciel")+' prosi: '+r.from_limit+' → '+r.to_limit+' · członków '+grCnt(x.id)+(grAct(x.id).some(m=>m.role==="mod")?' · jest moderator':'')+'</small></span>'
   +'<span class="grb"><button type="button" class="b small w" data-gx="lno" data-rq="'+esc(r.id)+'" data-gid="'+esc(x.id)+'">Odrzuć</button><button type="button" class="b small" data-gx="lok" data-rq="'+esc(r.id)+'" data-gid="'+esc(x.id)+'">Zatwierdź</button></span></div>'}
function grAdmRow(){if(!isKingReal())return "";grFresh();const n=grKReqN();
  return gRow("#0a84ff","users","Grupy",grK?"Wszystkie: "+grK.groups.filter(x=>!x.archived_at).length+(n?" · prośby o limit":""):"Wszystkie grupy i prośby o limit",n?'<span class="ios-bdg">'+n+'</span>':'','data-gx="adm"')}
function grAdmHtml(){
  let h='<button class="sback" data-c="backadm">‹ Administracja</button><div class="sname" style="margin-top:26px">👥 Grupy 👑</div>';
  if(!grK)return h+'<p class="note grwait">'+(grLoading?"Wczytuję…":"Nie udało się wczytać grup (KROK 70?).")+'</p>';
  if(grK.reqs.length)h+='<div class="ios"><div class="ios-gh">Prośby o większy limit</div><div class="grbox">'+grK.reqs.map(grLimRow).join("")+'</div></div>';
  const L=grK.groups,act=L.filter(x=>!x.archived_at),arch=L.filter(x=>x.archived_at),row=x=>gRow(grCol(x),grIc(x),grNmTag(x),
     [esc(nicks[x.owner]||"bez właściciela"),"limit "+x.member_limit,x.archived_at?"archiwum":""].filter(Boolean).join(" · "),"",'data-gx="open" data-gid="'+esc(x.id)+'"');
  h+=gGrp("Wszystkie grupy ("+act.length+")",act.map(row))+(act.length?'':'<p class="note grwait">Nikt jeszcze nie założył grupy.</p>')+gGrp("Archiwum ("+arch.length+")",arch.map(row));
  return h+'<p class="note" style="margin:10px 14px 0;font-size:13px;text-align:left">👑 Na czas rozwijania widzisz wszystkie grupy, także ukryte, i ich skład (wyłączenie — koniec KROKU 70).</p>';
}

/* 🔔 sekcja „Grupy”: zaproszenia do mnie i prośby do grup, w których jestem właścicielem / moderatorem (do załatwienia — liczą się do numerka) */
const grBellToDo=()=>session&&grOk&&grFor===uid?grMine.filter(m=>m.status==="invited").length+grReqs.length+grKReqN():0;
const grBellN=()=>grBellToDo()+grPostUnN();   // licznik na 🔔: do załatwienia + nieprzeczytane ogłoszenia
function grBellHtml(){return grBellToDoHtml()+grPostBellHtml()}
function grBellToDoHtml(){const n=grBellToDo();if(!n)return "";
  return bsSec("grp","👥 Grupy",n,n,grMine.filter(m=>m.status==="invited").sort(grByName).map(grInvRow).join("")+grReqs.map(r=>grReqRow(r,true)).join("")+(grKReqN()?grK.reqs.map(grLimRow).join(""):"")
    +'<div class="bsempty"><button type="button" class="lnk" data-gx="hub">Wszystkie grupy: ⚙️ → Grupy ›</button></div>')}
$("bellsheet").addEventListener("click",async e=>{
  const b=e.target.closest("[data-gx]");if(!b||b.disabled||!session)return;
  const a=b.dataset.gx,g=b.dataset.gid,u=b.dataset.gu||"",x=grG[g],nm=nicks[u]||"tę osobę";
  if(a==="hub"||a==="open"){closeBell();if(a==="open"&&x){grGo(g);return}gearOpen=true;gearFrom="";gearView="groups";renderGear();grReload();return}
  if(a==="pgo"){closeBell();if(x){grFromAdm=false;grGo(g)}return}   // 📣 ogłoszenie → tablica grupy (wejście oznacza przeczytane)
  if(a==="pread"){grPostSeen(g);renderBellSheet();return}
  if(a==="pall"){grPostReadAll();renderBellSheet();return}
  if(!x)return;
  if(a==="acc")await grDo("group_answer",{g,accept:true},"👥 Dołączono do grupy „"+x.name+"”",b);
  else if(a==="dec"){if(await askOk("Odrzucić zaproszenie do „"+x.name+"”?","Odrzuć"))await grDo("group_answer",{g,accept:false},"Odrzucono zaproszenie.",b)}
  else if(a==="rok")await grDo("group_decide",{g,u,accept:true},"👥 "+nm+" — przyjęto do „"+x.name+"”",b);
  else if(a==="rno")await grDo("group_decide",{g,u,accept:false},"Odrzucono prośbę: "+nm,b);
  else if(a==="lok"||a==="lno")await grDo("group_limit_decide",{req:b.dataset.rq,approve:a==="lok"},a==="lok"?"✅ „"+x.name+"”: limit zwiększony.":"Odrzucono prośbę o limit „"+x.name+"”.",b);
});

/* 🖱 akcje w ⚙️ (atrybut data-gx — nie koliduje z data-c obsługiwanym w js/05) */
async function grDo(fn,args,okMsg,btn,pre){   // pre: zmiana widoku zaraz po udanej akcji, przed odświeżeniem (bez starego „3 osoby” na ekranie)
  if(btn)btn.disabled=true;
  try{const r=await sb.rpc(fn,args);if(r.error)throw r.error;if(okMsg)say(typeof okMsg==="function"?okMsg(r.data):okMsg);if(pre){pre();renderGear()}await grReload();return true}
  catch(err){if(btn)btn.disabled=false;say(grErr(err));return false}
}
$("gearpanel").addEventListener("click",async e=>{
  const b=e.target.closest("[data-gx]");if(!b||b.disabled||!session)return;
  const a=b.dataset.gx,g=b.dataset.gid||grId,u=b.dataset.gu||"",nm=nicks[u]||"tę osobę",x=grG[g];
  if(a==="adm"){grFromAdm=false;gearView="gradm";renderGear();grReload();return}
  if(a==="addto"){openGrPick(u);return}
  if(a==="hub"){grFromAdm=false;if(gearView==="nick")gearFrom="nick";grOpenU="";gearView="groups";renderGear();grReload();return}
  if(a==="open"){grFromAdm=gearView==="gradm"||(gearView==="group"&&grFromAdm);grGo(g);return}
  if(a==="new"){openGrForm("");return}
  if(a==="code"){openGrCode("");return}
  if(a==="pl2gr"){const l=plById(plId);if(!l)return;openGrForm("",{name:l.name,color:l.color,ids:plIds(l.id)});return}
  if(a==="tab"){grTab=b.dataset.v;grOpenU="";grOpenP="";renderGear();if(grTab==="board")grPostsLoad(grId);if(grTab==="stats")grStatsLoad(grId);return}
  if(a==="stm"){grStM=b.dataset.v==="km"?"km":"n";renderGear();return}   // 📊 wykres miesięcy: Jazdy / Km
  if(/^p(man|like|add|edit|cancel|save|pin|del|rep|mode)$/.test(a)){await grPostAct(a,b);return}   // 📣 tablica (KROK 76)
  if(a==="man"){grOpenU=grOpenU===u?"":u;renderGear();return}
  if(a==="inv"){openWho("gr",g);return}
  if(a==="edit"){openGrForm(g);return}
  if(a==="xferhint"){grTab="ppl";renderGear();say("Kliknij ikonę zarządzania przy osobie → „Przekaż grupę”.");return}
  if(a==="copy"&&x){const t=grLink(x);try{await navigator.clipboard.writeText(t);say("🔗 Link skopiowany — wyślij go osobom, które chcesz zaprosić.")}catch(err){say(t)}return}
  if(!x)return;
  if(a==="acc"){await grDo("group_answer",{g,accept:true},"👥 Dołączono do grupy „"+x.name+"”",b);return}
  if(a==="dec"){if(!await askOk("Odrzucić zaproszenie do „"+x.name+"”?","Odrzuć"))return;await grDo("group_answer",{g,accept:false},"Odrzucono zaproszenie.",b);if(gearView==="group"&&!grSt(g)){gearView="groups";renderGear()}return}
  if(a==="rok"){await grDo("group_decide",{g,u,accept:true},"👥 "+nm+" — przyjęto do „"+x.name+"”",b);return}
  if(a==="rno"){await grDo("group_decide",{g,u,accept:false},"Odrzucono prośbę: "+nm,b);return}
  if(a==="lok"||a==="lno"){await grDo("group_limit_decide",{req:b.dataset.rq,approve:a==="lok"},a==="lok"?"✅ „"+x.name+"”: limit zwiększony.":"Odrzucono prośbę o limit „"+x.name+"”.",b);return}
  if(a==="join"){await grDo("group_join",{g},d=>d==="active"?"👥 Dołączono do grupy „"+x.name+"”":"🙋 Wysłano prośbę — właściciel albo moderator zdecyduje.",b);if(gearView==="groups")grSearch(grQ);return}
  if(a==="role"){const m=(grMem[g]||[]).find(y=>y.user_id===u);if(!m)return;const to=m.role==="mod"?"member":"mod";
    await grDo("group_set_role",{g,u,p_role:to},to==="mod"?"🛡 "+nm+" — moderator grupy":nm+" — już nie moderator",b);return}
  if(a==="xfer"){if(!await askOk("Przekazać grupę „"+x.name+"” — "+nm+"?\n\nTy zostaniesz moderatorem. Tylko nowy właściciel będzie mógł to cofnąć.","Przekaż"))return;
    grOpenU="";await grDo("group_transfer",{g,u},"👑 Nowy właściciel grupy: "+nm,b);return}
  if(a==="rm"){const m=(grMem[g]||[]).find(y=>y.user_id===u),inv=m&&m.status==="invited";
    if(!await askOk(inv?"Cofnąć zaproszenie dla "+nm+"?":"Usunąć "+nm+" z grupy „"+x.name+"”?",inv?"Cofnij":"Usuń",1))return;
    grOpenU="";await grDo("group_remove",{g,u},inv?"Cofnięto zaproszenie: "+nm:"Usunięto z grupy: "+nm,b);return}
  if(a==="newcode"){if(!await askOk("Utworzyć nowy kod grupy?\n\nStary link przestanie działać.","Nowy kod"))return;await grDo("group_new_code",{g},"🔗 Nowy kod gotowy — skopiuj nowy link.",b);return}
  if(a==="limit"){if(!await askOk("Poprosić o większy limit miejsc?\n\nDecyduje główny administrator — dostaniesz odpowiedź w aplikacji.","Poproś"))return;await grDo("group_limit_ask",{g},d=>"Wysłano prośbę o limit "+d+" osób.",b);return}
  if(a==="leave"){const st=grSt(g),own=grRole(g)==="owner";
    if(!await askOk(st==="requested"?"Wycofać prośbę o dołączenie do „"+x.name+"”?":own?"Zamknąć grupę „"+x.name+"”?\n\nJesteś w niej sam(a) — grupa trafi do archiwum.":"Wyjść z grupy „"+x.name+"”?",st==="requested"?"Wycofaj":own?"Zamknij":"Wyjdź",1))return;
    await grDo("group_leave",{g},st==="requested"?"Wycofano prośbę.":own?"Grupa zamknięta.":"Wyszedłeś(-aś) z grupy „"+x.name+"”.",b,()=>{gearView="groups";grFind=null});return}
  if(a==="del"){if(!await askOk("Usunąć grupę „"+x.name+"”?\n\nZnikną członkostwa i zaproszenia. Tego nie da się cofnąć.","Usuń grupę",1))return;
    if(await grDo("group_delete",{g},"Usunięto grupę „"+x.name+"”.",b)){delete grG[g];gearView=grFromAdm&&isKingReal()?"gradm":"groups";grFind=null;renderGear()}return}
});
$("gearpanel").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.dataset&&e.target.dataset.gx==="edit"){e.preventDefault();openGrForm(grId)}});
$("gearpanel").addEventListener("input",e=>{if(e.target.id!=="grq")return;grQ=e.target.value;clearTimeout(grFindT);grFindT=setTimeout(()=>grSearch(grQ),300)});

// pierwsze wczytanie: przy starcie js/14 może ruszyć, zanim ten plik się wczyta — wtedy grupy dociągamy tutaj
(()=>{let n=0;const t=setInterval(()=>{n++;if(n>120){clearInterval(t);return}if(!ready||!session)return;clearInterval(t);if(grOk===null&&!grLoading)grReload()},1000)})();

/* 🔗 link #grupa=KOD — po zalogowaniu i wybraniu nicku otwiera okno „Dołącz kodem” */
(()=>{const m=/#grupa=([0-9a-z]{4,20})/i.exec(location.hash||"");if(!m)return;const code=m[1];
  try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
  let n=0,told=false;const t=setInterval(()=>{n++;if(n>900){clearInterval(t);return}
    if(!ready)return;if(!session){if(!told&&n>3){told=true;say("Zaloguj się, żeby dołączyć do grupy z linku.")}return}
    if(!nicks[uid])return;clearInterval(t);openGrCode(code)},1000)})();

/* 👥 zaproszenie na rower dla grupy (KROK 71) — pomocniki dla js/10, js/11, js/14 (wołane przez typeof przy rysowaniu i odświeżaniu)
   grActIds: moje aktywne grupy (porównanie przed/po odświeżeniu); grForWant: grupy do wyboru w „Kto zobaczy?” (aktywne, nie w archiwum);
   wGrTag: plakietka „👥 nazwa” w kolorze i z ikoną grupy (jak w ⚙️ → Grupy); grMemIds: aktywni członkowie bez mnie */
const grActIds=()=>grMine.filter(m=>m.status==="active").map(m=>m.group_id).sort().join(",");
const grIn=g=>!!g&&grMine.some(m=>m.group_id===g&&m.status==="active");
function grForWant(){return grOk?grMine.filter(m=>m.status==="active"&&grG[m.group_id]&&!grG[m.group_id].archived_at).map(m=>grG[m.group_id]).sort((a,b)=>a.name.localeCompare(b.name,"pl")):[]}
const grMemIds=g=>grAct(g).map(x=>x.user_id).filter(id=>id!==uid);
// 🎨 etykieta wypełniona kolorem grupy (przyciemnionym pod biały napis) + biała ikona grupy; tło karty — odcień koloru grupy i pasek z lewej
// klikalna: otwiera grupę (⚙️ → Grupy → grupa); działa na kartach, w Twoich zaproszeniach, w 🔔 i w okienku nowego zaproszenia
function grTagId(g){const x=grG[g];
  return '<span class="lockt grtag" role="button" tabindex="0" data-grgo="'+esc(g)+'" title="Otwórz grupę" style="background:'+(x?grInk(grCol(x)):'#6e6e73')+'">'+uiIcon(x?grIc(x):"users")+'<span>'+esc(x?x.name:"grupa")+'</span>'+(x?grBadges(x):'')+'</span>'}
const wGrTag=w=>grTagId(w.group_id);
/* 👥 wspólne grupy (2026-11-22): moje aktywne grupy, w których osoba też jest aktywnym członkiem — widać tylko członkom (reguły bazy), bez dodatkowych zapytań */
const grHasMine=()=>!!(session&&grOk&&grFor===uid&&grMine.some(m=>m.status==="active"&&grG[m.group_id]&&!grG[m.group_id].archived_at));
const grCommon=u=>!u||u===uid||!grHasMine()?[]:grMine.filter(m=>m.status==="active"&&grG[m.group_id]&&!grG[m.group_id].archived_at&&grUserSt(m.group_id,u)==="active").map(m=>m.group_id).sort((a,b)=>grG[a].name.localeCompare(grG[b].name,"pl"));
function grCommonHtml(u){const C=grCommon(u);return C.length?'<div class="staz ucgr">'+uiIcon("users")+" "+(C.length>1?"Wspólne grupy":"Wspólna grupa")+': '+C.map(grTagId).join(" ")+'</div>':""}
/* etykieta roli (właściciel / moderator) przy nicku zakładającego zaproszenie grupy — poza ekranem grupy (karty, 🔔, Twoje zaproszenia) */
function grRoleOf(g,u){const m=g&&grMem[g]&&grMem[g].find(x=>x.user_id===u&&x.status==="active");return m&&GR_ROLE[m.role]||""}
const grRoleTag=(w,u)=>{const r=w&&w.group_id?grRoleOf(w.group_id,u||w.user_id):"";return r?'<span class="grrole grrt">'+r+'</span>':""}
function wGrCls(w){const x=grG[w.group_id];return ' wgrp" style="--gc:'+(x?grCol(x):'#8e8e93')}
// 👥 klik w etykietę grupy → okno grupy; okienko nowego zaproszenia odkładamy na później (jak klik obok), 🔔 zamykamy
function grTagGo(t){const g=t.dataset.grgo;if(!g||!session)return;
  if(!$("popsheet").classList.contains("hide")){try{const it=popList[popIdx];if(it){popIds(it).forEach(i=>popSnooze.add(i));saveSnooze()}}catch(e){}closePop()}
  if(!$("bellsheet").classList.contains("hide"))closeBell();
  grFromAdm=false;grGo(g);if(!grG[g])say("Tej grupy nie widzisz — nie jesteś jej członkiem.");else if(!grSt(g))grReload()}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-grgo]");if(!t)return;e.preventDefault();e.stopPropagation();grTagGo(t)},true);
document.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const t=e.target.closest&&e.target.closest("[data-grgo]");if(!t)return;e.preventDefault();e.stopPropagation();grTagGo(t)},true);

/* 📣 Tablica ogłoszeń grupy (KROK 76): ⚙️ → Grupy → grupa → zakładka „Tablica” (przypięty wpis na górze, niżej od najnowszego, pole na dole).
   Czytają i piszą tylko aktywni członkowie (reguły w bazie); zmiany tylko funkcjami group_post_* (komunikaty z bazy po polsku → toast).
   Odświeżanie: sync_since → klucz „gpost” (grPostSync z js/14) — tylko otwarta tablica pobiera wpisy na nowo; bez nowych połączeń.
   Powiadomienia: g_post / g_pin w grPN (grLoad) → plakietka w „Moje grupy”, przy zakładce i sekcja „📣 Ogłoszenia grup” w 🔔;
   wejście na tablicę oznacza ogłoszenia tej grupy jako przeczytane. */
let grPosts={g:"",list:[],likes:{},ok:null,busy:false,msg:""},grOpenP="",grEditP="",grDraft="",grDraftE="",grPBusy=false;
const GP_MAX=500;
const grUnN=g=>grPN.filter(n=>n.group_id===g).length;
const grPostUnN=()=>session&&grOk&&grFor===uid?grPN.length:0;
const grBoardOn=()=>gearOpen&&gearView==="group"&&grTab==="board"&&!!grRole(grId);
const grPostById=id=>grPosts.list.find(p=>p.id===id)||null;
async function grPostsLoad(g){
  if(!g||!session||!grRole(g))return;
  if(grPosts.g!==g)grPosts={g,list:[],likes:{},ok:null,busy:true,msg:""};else grPosts.busy=true;
  try{const [a,b]=await Promise.all([
      sb.from("group_posts").select("id,author,body,pinned,created_at,edited_at").eq("group_id",g).order("created_at",{ascending:false}).limit(100),
      sb.from("group_post_likes").select("post_id,user_id").eq("group_id",g).limit(5000)]);
    if(a.error)throw a.error;const L={};((!b.error&&b.data)||[]).forEach(x=>{(L[x.post_id]=L[x.post_id]||[]).push(x.user_id)});
    if(grPosts.g!==g)return;grPosts={g,list:(a.data||[]).sort((x,y)=>String(y.created_at).localeCompare(String(x.created_at))),likes:L,ok:true,busy:false,msg:""};
  }catch(err){if(grPosts.g!==g)return;grPosts={g,list:[],likes:{},ok:false,busy:false,msg:/group_posts|schema cache|does not exist/i.test(err&&err.message||"")?"Tablica wymaga KROKU 76 w bazie.":"Nie udało się wczytać tablicy: "+grErr(err)}}
  if(grBoardOn()&&grId===g)grPostSeen(g);
  grBoardPaint();
}
// odświeżenie z sync_since: tylko gdy ta tablica jest właśnie na ekranie
async function grPostSync(ids){if(grBoardOn()&&(ids||[]).includes(grId))await grPostsLoad(grId)}
// przeczytane: ogłoszenia jednej grupy (wejście na tablicę, ✓ w 🔔) albo wszystkie
function grPostRead(ids){if(!ids.length)return;const S=new Set(ids);grPN=grPN.filter(n=>!S.has(n.id));
  try{sb.from("notifications").update({read_at:new Date().toISOString()}).in("id",ids).then(()=>{},()=>{})}catch(e){}renderBell()}
const grPostSeen=g=>grPostRead(grPN.filter(n=>n.group_id===g).map(n=>n.id));
const grPostReadAll=()=>grPostRead(grPN.map(n=>n.id));
// tylko lista wpisów (pole pisania zostaje — nie gubi kursora ani tekstu)
function grBoardPaint(){const e=$("grplist");if(e&&grBoardOn()&&grPosts.g===grId)e.innerHTML=grPListHtml(grId)}
function grBoardHtml(g){
  if(grPosts.g!==g&&!grPosts.busy)setTimeout(()=>{if(grPosts.g!==g||(!grPosts.busy&&grPosts.ok===null))grPostsLoad(g)},0);
  return '<div id="grplist">'+grPListHtml(g)+'</div>'+grComposeHtml(g);
}
function grPListHtml(g){
  if(grPosts.g!==g||grPosts.ok===null)return '<p class="note grwait">Wczytuję tablicę…</p>';
  if(grPosts.ok===false)return '<p class="note grwait">'+esc(grPosts.msg)+'</p>';
  const L=grPosts.list,pin=L.filter(p=>p.pinned),rest=L.filter(p=>!p.pinned);
  if(!L.length)return '<p class="note grwait">Na tablicy jeszcze nic nie ma. Napisz pierwsze ogłoszenie — zobaczą je wszyscy członkowie grupy.</p>';
  return (pin.length?'<div class="ios"><div class="ios-gh">'+uiIcon("pushpin")+' Przypięte</div><div class="grbox gpin">'+pin.map(grPostHtml).join("")+'</div></div>':'')
    +(rest.length?'<div class="ios"><div class="ios-gh">Ogłoszenia</div><div class="grbox">'+rest.map(grPostHtml).join("")+'</div></div>':'')
    +(L.length>=100?'<p class="note" style="margin:8px 14px 0;font-size:13px;text-align:left">Widać 100 najnowszych wpisów.</p>':'');
}
function grPostHtml(p){
  const g=grPosts.g,me=p.author===uid,mod=grIsMod(g),lk=grPosts.likes[p.id]||[],mine=lk.includes(uid),open=grOpenP===p.id;
  const who=lk.filter(u=>u!==uid&&nicks[u]).map(u=>nicks[u]),lkTxt=(mine?["Ty"]:[]).concat(who.slice(0,mine?2:3)).join(", ")+(lk.length>3?" i "+(lk.length-3)+" "+plf(lk.length-3,["inna osoba","inne osoby","innych osób"]):"");
  const acts=(me?'<button type="button" class="b small w" data-gx="pedit" data-pid="'+esc(p.id)+'">Edytuj</button>':'')
    +(mod?'<button type="button" class="b small w" data-gx="ppin" data-pid="'+esc(p.id)+'">'+(p.pinned?"Odepnij":"Przypnij na górze")+'</button>':'')
    +(!me?'<button type="button" class="b small w" data-gx="prep" data-pid="'+esc(p.id)+'">Zgłoś</button>':'')
    +(me||mod?'<button type="button" class="b small bad" data-gx="pdel" data-pid="'+esc(p.id)+'">Usuń</button>':'');
  return '<div class="gpost'+(grEditP===p.id?' gped':'')+'"><div class="gph">'+nk(p.author,"usunięte konto")+'<span class="note">'+esc(agoTxt(p.created_at))+(p.edited_at?' · edytowano':'')+'</span>'
    +'<button type="button" class="plrm'+(open?' on':'')+'" data-gx="pman" data-pid="'+esc(p.id)+'" aria-expanded="'+open+'" aria-label="Opcje wpisu" title="Opcje wpisu">'+uiIcon("sliders")+'</button></div>'
    +'<div class="gpb">'+esc(p.body)+'</div>'
    +'<div class="gpf"><button type="button" class="gplk'+(mine?' on':'')+'" data-gx="plike" data-pid="'+esc(p.id)+'" aria-pressed="'+mine+'" aria-label="Polecam'+(lk.length?' — '+lk.length:'')+'">'+uiIcon("thumb")+(lk.length?'<span>'+lk.length+'</span>':'')+'</button>'
    +(lkTxt?'<span class="note gplkn">'+esc(lkTxt)+'</span>':'')+'</div>'
    +(open?'<div class="gract">'+acts+'</div>':'')+'</div>';
}
function grComposeHtml(g){
  const x=grG[g],ed=!!grEditP&&!!grPostById(grEditP),can=!x.posts_mods_only||grIsMod(g),t=ed?grDraftE:grDraft;
  if(!can&&!ed)return '<p class="note grwait gplock">'+uiIcon("lock")+' Na tej tablicy piszą tylko właściciel i moderatorzy.</p>';
  return '<div class="ios"><div class="ios-gh">'+(ed?"Zmień ogłoszenie":"Napisz ogłoszenie")+'</div></div><div class="gpcomp">'
    +'<textarea class="bsmsg" id="gpbody" rows="3" maxlength="'+GP_MAX+'" aria-label="'+(ed?"Zmień ogłoszenie":"Napisz ogłoszenie")+'" placeholder="Np. W sobotę o 9:00 spod kościoła, tempo spokojne — kto jedzie?">'+esc(t)+'</textarea>'
    +'<div class="gpcr"><span class="note" id="gpcnt">'+t.length+' / '+GP_MAX+'</span>'+(ed?'<button type="button" class="b small w" data-gx="pcancel">Anuluj</button>':'')
    +'<button type="button" class="b small" data-gx="'+(ed?"psave":"padd")+'"'+(grPBusy?' disabled':'')+'>'+(ed?"Zapisz zmianę":"Opublikuj")+'</button></div>'
    +'<p class="note gphint">'+(ed?(grPostById(grEditP).pinned?"Wpis jest przypięty — członkowie dostaną powiadomienie o zmianie.":"Zmiana bez nowego powiadomienia; przy wpisie pojawi się „edytowano”."):"Widzą tylko członkowie grupy — dostaną powiadomienie pod 🔔.")+'</p></div>';
}
// 🖱 akcje tablicy (wołane z obsługi kliknięć w ⚙️)
async function grPostAct(a,b){
  const g=grId,pid=b.dataset.pid||"",p=grPostById(pid);
  const run=async(fn,args,ok)=>{grPBusy=true;b.disabled=true;
    try{const r=await sb.rpc(fn,args);if(r.error)throw r.error;if(ok)say(ok);grPBusy=false;return true}
    catch(err){grPBusy=false;b.disabled=false;say(grErr(err));return false}};
  if(a==="pman"){grOpenP=grOpenP===pid?"":pid;grBoardPaint();return}
  if(a==="pmode"){const m=b.dataset.v==="mods";if(!!(grG[g]&&grG[g].posts_mods_only)===m)return;
    if(await run("group_posts_mode",{g,mods_only:m},m?"📣 Na tablicy piszą teraz tylko właściciel i moderatorzy.":"📣 Na tablicy piszą wszyscy członkowie."))await grReload();return}
  if(a==="plike"){if(!p)return;const L=grPosts.likes[pid]=grPosts.likes[pid]||[],on=!L.includes(uid);
    if(on)L.push(uid);else L.splice(L.indexOf(uid),1);grBoardPaint();   // od razu na ekranie; przy błędzie cofamy
    const r=await sb.rpc("group_post_like",{p:pid,on_:on});
    if(r.error){if(on)L.splice(L.indexOf(uid),1);else L.push(uid);grBoardPaint();say(grErr(r.error))}return}
  if(a==="pedit"){if(!p)return;grEditP=pid;grDraftE=p.body;grOpenP="";renderGear();setTimeout(()=>{const t=$("gpbody");if(t){t.focus();t.scrollIntoView({block:"center",behavior:"smooth"})}},60);return}
  if(a==="pcancel"){grEditP="";grDraftE="";renderGear();return}
  if(a==="padd"||a==="psave"){const ed=a==="psave",t=(ed?grDraftE:grDraft).trim();
    if(!t){say("Wpis jest pusty.");return}if(t.length>GP_MAX){say("Wpis: najwyżej "+GP_MAX+" znaków.");return}
    if(ed&&p===null&&!grPostById(grEditP)){grEditP="";renderGear();say("Tego wpisu już nie ma.");return}
    if(!await run(ed?"group_post_edit":"group_post_add",ed?{p:grEditP,p_body:t}:{g,p_body:t},ed?"Zapisano zmianę.":"📣 Opublikowano — członkowie zobaczą ogłoszenie."))return;
    if(ed){grEditP="";grDraftE=""}else grDraft="";
    await grPostsLoad(g);renderGear();return}
  if(!p){grBoardPaint();return}
  if(a==="ppin"){grOpenP="";if(await run("group_post_pin",{p:pid,on_:!p.pinned},p.pinned?"Odpięto wpis.":"📌 Przypięto na górze tablicy — członkowie dostaną powiadomienie."))await grPostsLoad(g);return}
  if(a==="pdel"){const mine=p.author===uid;
    if(!await askOk(mine?"Usunąć Twój wpis?":"Usunąć wpis — "+(nicks[p.author]||"usunięte konto")+"?\n\nTego nie da się cofnąć.","Usuń",1))return;
    grOpenP="";if(grEditP===pid){grEditP="";grDraftE=""}
    if(await run("group_post_delete",{p:pid},"Usunięto wpis."))await grPostsLoad(g);return}
  if(a==="prep"){if(!await askOk("Zgłosić ten wpis głównemu administratorowi?\n\nZobaczy treść wpisu i nazwę grupy. Autor nie dowie się, kto zgłosił.","Zgłoś",1))return;
    grOpenP="";if(await run("group_post_report",{p:pid},"🚩 Zgłoszono — administrator się tym zajmie."))grBoardPaint();return}
}
// pole pisania: tekst w pamięci (przerysowanie ⚙️ go nie gubi) i licznik znaków
$("gearpanel").addEventListener("input",e=>{if(e.target.id!=="gpbody")return;const v=e.target.value;if(grEditP)grDraftE=v;else grDraft=v;
  const c=$("gpcnt");if(c){c.textContent=v.length+" / "+GP_MAX;c.classList.toggle("gpfull",v.length>=GP_MAX)}});
// 🔔 sekcja „📣 Ogłoszenia grup”: jedna pozycja na grupę (ile nowych, od kogo, kiedy); ✓ przy pozycji albo dla całej sekcji
function grPostBellHtml(){
  if(!grPostUnN())return "";
  const by={};grPN.forEach(n=>{(by[n.group_id]=by[n.group_id]||[]).push(n)});
  const G=Object.keys(by).filter(g=>grG[g]).sort((a,b)=>String(by[b][0].created_at).localeCompare(String(by[a][0].created_at)));
  return bsSec("gpo","📣 Ogłoszenia grup",grPN.length,grPN.length,
    '<div class="bsmka"><button type="button" class="lnk" data-gx="pall">'+uiIcon("check")+' Oznacz sekcję jako przeczytane</button></div>'
    +G.map(g=>{const L=by[g],x=grG[g],n=L.length,pin=L.some(k=>k.kind==="g_pin"),who=[...new Set(L.map(k=>nicks[k.actor]).filter(Boolean))];
      return '<div class="nit new" data-gx="pgo" data-gid="'+esc(g)+'" role="button" tabindex="0"><div class="ic gpic" style="background:'+grCol(x)+'">'+uiIcon("mega")+'</div><div class="tx"><b>'+grNmTag(x)+'</b>'
        +'<div class="w">'+(n>1?n+" "+plf(n,["nowe ogłoszenie","nowe ogłoszenia","nowych ogłoszeń"]):pin?"przypięte ogłoszenie":"nowe ogłoszenie")+(who.length?' · '+esc(who.slice(0,3).join(", ")):'')+' · '+esc(agoTxt(L[0].created_at))+'</div></div>'
        +'<button type="button" class="nmk" data-gx="pread" data-gid="'+esc(g)+'" aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane">'+uiIcon("check")+'</button></div>'}).join(""));
}

/* 📊 Statystyki grupy (KROK 78): ⚙️ → Grupy → grupa → zakładka „Statystyki” (tylko członkowie — kontrola w bazie, group_stats).
   Liczą się tylko odbyte jazdy grupy (zaproszenia „dla grupy”); klocki jak w „Moich jazdach” (js/13): .stats, details.stsec, .lch, .hcal, .nbars, .urrec.
   Dane pobierane przy wejściu na zakładkę, ponownie najwcześniej po minucie; bez odświeżania w tle (oszczędność limitów). */
let grSS={g:"",d:null,ok:null,msg:"",at:0,busy:false},grStM="n",grStSeen=false;
const MON_S=["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
async function grStatsLoad(g,force){
  if(!g||!session||!grRole(g)||grSS.busy)return;
  if(!force&&grSS.g===g&&grSS.ok&&Date.now()-grSS.at<60000)return;
  if(grSS.g!==g)grSS={g,d:null,ok:null,msg:"",at:0,busy:false};grSS.busy=true;
  try{const r=await sb.rpc("group_stats",{g});if(r.error)throw r.error;if(grSS.g!==g)return;grSS={g,d:r.data,ok:true,msg:"",at:Date.now(),busy:false}}
  catch(err){if(grSS.g!==g)return;grSS={g,d:null,ok:false,at:Date.now(),busy:false,msg:/group_stats|schema cache|does not exist/i.test(err&&err.message||"")?"Statystyki wymagają KROKU 78 w bazie.":"Nie udało się wczytać statystyk: "+grErr(err)}}
  if(gearOpen&&gearView==="group"&&grTab==="stats"&&grId===g)renderGear();
}
function grStatsHtml(g){
  if(grSS.g!==g||grSS.ok===null){setTimeout(()=>grStatsLoad(g),0);return '<p class="note grwait">Liczę statystyki…</p>'}
  if(grSS.ok===false)return '<p class="note grwait">'+esc(grSS.msg)+'</p>';
  const d=grSS.d||{},n=+d.n||0,t=(v,l)=>'<div class="st"><b>'+v+'</b><span>'+l+'</span></div>';
  if(!grStSeen){grStSeen=true;joinOpen.add("gs_mon");joinOpen.add("gs_ppl")}
  const sec=(k,h,sum,body)=>'<details class="stsec" data-j="gs_'+k+'"'+(joinOpen.has("gs_"+k)?' open':'')+'><summary><span>'+h+'</span>'+(sum!==""&&sum!=null?'<span class="stsum">'+sum+'</span>':'')+'</summary><div class="stbody">'+body+'</div></details>';
  let h='<div class="smail gsintro">Odbyte jazdy grupy — tylko zaproszenia „dla grupy”'+(d.first?', od '+esc(fmtD(d.first)):'')+'. Widzą tylko członkowie.</div>';
  if(!n)return h+'<p class="note grwait">Grupa nie ma jeszcze odbytych wspólnych jazd. Zaproszenie „dla grupy” wybierzesz w „Kto zobaczy?”.</p>';
  h+='<div class="sleft"><div class="stats">'+t(n,plf(n,["jazda","jazdy","jazd"]))+t(Math.round(+d.km||0).toLocaleString("pl-PL"),"km tras")+t(d.ppl_avg!=null?fmt1(+d.ppl_avg):"—","śr. osób na jeździe")
    +t(uiIcon("flame")+' '+(+d.streak||0),plf(+d.streak||0,["tydzień","tygodnie","tygodni"])+' z rzędu')+'</div>';
  if(kmFun(+d.pkm||0))h+='<div class="urln">'+uiIcon("map")+' Razem przejechaliście '+Math.round(+d.pkm).toLocaleString("pl-PL")+' km. '+esc(kmFun(+d.pkm))+'</div>';
  if(+d.t)h+='<p class="note">W tym '+uiIcon("flask")+' '+d.t+' '+plf(+d.t,["testowa jazda","testowe jazdy","testowych jazd"])+'.</p>';
  h+=sec("mon",uiIcon("trend")+" Miesiące",(+d.d30||0)+' w 30 dni',grStMonHtml(d))
    +sec("cal",uiIcon("cal")+" Kalendarz aktywności","",grStCalHtml(d))
    +sec("when",uiIcon("clock")+" Kiedy jeździcie","",grStWhenHtml(d))
    +sec("ppl",uiIcon("users")+" Najaktywniejsi",(d.people||[]).length+' '+plf((d.people||[]).length,["osoba","osoby","osób"]),grStPplHtml(d))
    +sec("rec",uiIcon("trophy")+" Rekordy grupy","",grStRecHtml(d));
  return h+'</div><p class="note gsfoot">Uczestnicy = autor i zapisani, bez osób, które w „Jak poszło?” odpowiedziały, że nie pojechały. Km jazdy = średnia z „Jak poszło?” (bez odpowiedzi — plan trasy).</p>';
}
// 📈 12 miesięcy: linia z wypełnieniem, przełącznik Jazdy / Km
function grStMonHtml(d){
  const M=d.months||[],km=grStM==="km",v=M.map(m=>km?+m.km||0:+m.n||0),L=v.length;if(!L)return "";
  const W=300,H=120,mx=Math.max(1,...v),px=i=>14+i*(W-28)/Math.max(1,L-1),py=n=>H-22-n/mx*(H-46);
  const p=v.map((n,i)=>(i?'L':'M')+px(i).toFixed(1)+' '+py(n).toFixed(1)).join(' '),top=v.indexOf(mx),fv=n=>km?Math.round(n).toLocaleString("pl-PL"):n;
  return '<div class="ios-seg urseg">'+[["n","Jazdy"],["km","Km"]].map(([k,t])=>'<button type="button" data-gx="stm" data-v="'+k+'" class="'+(grStM===k?"on":"")+'">'+t+'</button>').join("")+'</div>'
   +'<svg class="lch" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(km?'Kilometry':'Jazdy')+' grupy w ostatnich 12 miesiącach">'
   +[0,.5,1].map(f=>'<line class="lg" x1="8" x2="'+(W-8)+'" y1="'+(24+f*(H-46)).toFixed(1)+'" y2="'+(24+f*(H-46)).toFixed(1)+'"/>').join("")
   +'<path class="la" d="'+p+' L'+px(L-1).toFixed(1)+' '+(H-22)+' L'+px(0).toFixed(1)+' '+(H-22)+' Z"/><path class="ll" d="'+p+'"/>'
   +v.map((n,i)=>n?'<circle class="ld" cx="'+px(i).toFixed(1)+'" cy="'+py(n).toFixed(1)+'" r="'+(i===top?4.5:3)+'"><title>'+esc(MON_S[+String(M[i].m).slice(5,7)-1]+' '+String(M[i].m).slice(0,4))+': '+(+M[i].n)+' '+plf(+M[i].n,["jazda","jazdy","jazd"])+', '+Math.round(+M[i].km)+' km</title></circle>':'').join("")
   +(mx>0&&v[top]?'<text class="lt" x="'+px(top).toFixed(1)+'" y="'+(py(v[top])-9).toFixed(1)+'" text-anchor="'+(top<2?'start':top>L-3?'end':'middle')+'">'+fv(v[top])+(km?' km':'')+'</text>':'')
   +M.map((m,i)=>'<text class="lt" x="'+px(i).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+MON_S[+String(m.m).slice(5,7)-1]+'</text>').join("")+'</svg>';
}
// 📅 26 tygodni, kratka = dzień (dotknięcie → podpowiedź, obsługa .hcal rect w js/13)
function grStCalHtml(d){
  const day=864e5,today=startOfDay(new Date()).getTime(),mon=today-((new Date().getDay()+6)%7)*day,first=mon-25*7*day,by={},tt={};
  (d.days||[]).forEach(x=>{const k=new Date(x.d+"T00:00").getTime();by[k]=+x.n||0;tt[k]=(x.tt||[]).join(", ")});
  const cw=(300-26)/26,s=cw-2.2;let cells="";
  for(let w=0;w<26;w++)for(let dd=0;dd<7;dd++){const t=first+(w*7+dd)*day;if(t>today)continue;const n=by[t]||0;
    cells+='<rect class="hc l'+(n?Math.min(4,n+1):0)+(t===today?' td':'')+'" x="'+(26+w*cw).toFixed(1)+'" y="'+(2+dd*(s+2.2)).toFixed(1)+'" width="'+s.toFixed(1)+'" height="'+s.toFixed(1)+'" rx="2"><title>'
      +esc(new Date(t).toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"}))+(n?': '+n+' '+plf(n,["jazda","jazdy","jazd"]):'')+(tt[t]?' · 🏷 '+esc(tt[t]):'')+'</title></rect>'}
  const H=Math.ceil(4+7*(s+2.2)),act=(d.days||[]).length;
  return '<svg class="hcal" viewBox="0 0 300 '+H+'" role="img" aria-label="Jazdy grupy z 26 tygodni">'
   +[[0,"pn"],[2,"śr"],[4,"pt"],[6,"nd"]].map(([i,t])=>'<text class="lt" x="0" y="'+(2+i*(s+2.2)+s-1).toFixed(1)+'">'+t+'</text>').join("")+cells+'</svg>'
   +'<div class="nbl"><span>Od '+esc(new Date(first).toLocaleDateString("pl-PL",{day:"numeric",month:"short"}))+' · '+act+' '+plf(act,["dzień","dni","dni"])+' z jazdą</span><span class="hleg">mniej <i class="hc l1"></i><i class="hc l2"></i><i class="hc l4"></i> więcej</span></div>';
}
// 🕖 dni tygodnia i godziny startu (słupki jak w Statystykach)
function grStWhenHtml(d){
  const bars=(v,lab)=>{const mx=Math.max(1,...v);return '<div class="nbars">'+v.map(n=>'<i style="height:'+(n?Math.max(6,Math.round(n/mx*100)):0)+'%"'+(n?'':' class="z"')+'>'+(n?'<b>'+n+'</b>':'')+'</i>').join("")+'</div>'
    +'<div class="gsbl">'+lab.map(x=>'<span>'+x+'</span>').join("")+'</div>'};
  const dow=d.dow||[0,0,0,0,0,0,0],hr=d.hours||[],B=[...Array(8)].map((_,i)=>(+hr[i*3]||0)+(+hr[i*3+1]||0)+(+hr[i*3+2]||0));
  const dm=Math.max(...dow),hm=Math.max(...hr.map(Number)),ph=hr.map(Number).indexOf(hm);
  return (dm?'<div class="urln">'+uiIcon("heart")+' Najczęściej: <b>'+DOWN[dow.indexOf(dm)]+'</b>'+(hm?', start ok. <b>'+ph+':00</b>':'')+'</div>':'')
   +'<div class="gsh">Dni tygodnia</div>'+bars(dow.map(Number),["pn","wt","śr","czw","pt","sb","nd"])
   +'<div class="gsh">Godzina startu</div>'+bars(B,["0–3","3–6","6–9","9–12","12–15","15–18","18–21","21–24"]);
}
// 👥 wszyscy członkowie, top 5 wyróżnione
function grStPplHtml(d){
  const P=d.people||[],mx=Math.max(1,...P.map(p=>+p.n||0));
  return '<div class="gspl">'+P.map((p,i)=>{const n=+p.n||0,top=n>0&&i<5,R=GR_ROLE[p.role];
    return '<div class="gsp'+(top?' top':'')+(p.u===uid?' me':'')+'"><span class="gsr">'+(top&&i<3?uiIcon("medal"):i+1)+'</span><div class="gsm"><div class="gsn">'+nk(p.u,"ktoś")+(R?'<span class="note grrole">'+R+'</span>':'')+(p.u===uid?'<span class="note">to Ty</span>':'')+'</div>'
      +'<div class="note">'+(n?n+' '+plf(n,["jazda","jazdy","jazd"])+' · '+Math.round(+p.km||0).toLocaleString("pl-PL")+' km'+(+p.led?' · założył(a) '+p.led:'')+(p.last?' · ostatnio '+esc(fmtD(p.last)):''):'jeszcze bez wspólnej jazdy')+'</div>'
      +'<div class="gsbar"><i style="width:'+Math.round(n/mx*100)+'%"></i></div></div></div>'}).join("")+'</div>'
   +'<p class="note">Kolejność: liczba wspólnych jazd, potem km. Pierwsza piątka wyróżniona.</p>';
}
// 🏆 rekordy grupy
function grStRecHtml(d){
  const ti=x=>x&&x.title?' „'+esc(x.title)+'”':'',mo=m=>new Date(String(m).slice(0,10)+"T12:00").toLocaleDateString("pl-PL",{month:"long",year:"numeric"});
  const r=[d.rec_km?uiIcon("ruler")+' Najdłuższa: <b>'+fmt1(+d.rec_km.km)+' km</b>'+ti(d.rec_km)+' · '+esc(fmtD(d.rec_km.d)):'',
    d.rec_ppl&&+d.rec_ppl.n>1?uiIcon("users")+' Najliczniejsza: <b>'+d.rec_ppl.n+' '+plf(+d.rec_ppl.n,["osoba","osoby","osób"])+'</b>'+ti(d.rec_ppl)+' · '+esc(fmtD(d.rec_ppl.d)):'',
    d.rec_kmh?uiIcon("bolt")+' Najszybsza: <b>'+fmt1(+d.rec_kmh.kmh)+' km/h</b>'+ti(d.rec_kmh)+' · '+esc(fmtD(d.rec_kmh.d)):'',
    d.rec_month?uiIcon("chart")+' Najlepszy miesiąc: <b>'+esc(mo(d.rec_month.m))+'</b> · '+d.rec_month.n+' '+plf(+d.rec_month.n,["jazda","jazdy","jazd"])+(+d.rec_month.km?', '+Math.round(+d.rec_month.km)+' km':''):'',
    +d.streak_best?uiIcon("flame")+' Najdłuższa seria: <b>'+d.streak_best+' '+plf(+d.streak_best,["tydzień","tygodnie","tygodni"])+'</b> z rzędu':''].filter(Boolean);
  return r.length?'<div class="urrec">'+r.map(x=>'<div>'+x+'</div>').join("")+'</div><p class="note">Seria = kolejne tygodnie (pon.–niedz.) z co najmniej jedną jazdą grupy.</p>':'<p class="note">Rekordy pojawią się po pierwszych jazdach z km.</p>';
}
