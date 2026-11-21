/* 👥 Grupy (KROK 70) — commit A: ⚙️ → Edytuj profil → „Grupy” (zaproszenia i prośby, Moje grupy, wyszukiwarka jawnych, „Mam kod”, „Załóż grupę”),
   ekran grupy (Ludzie / O grupie), formularz grupy i okno kodu (#grsheet), zapraszanie przez okno wyboru osób (openWho "gr"),
   „Przekształć w grupę” w widoku listy, link #grupa=KOD.
   Wszystkie zmiany tylko funkcjami bazy (group_*); tabele są tylko do odczytu. Komunikaty błędów z bazy są po polsku → toast.
   Plik wczytywany jako ostatni: przy wczytaniu tylko rejestruje obsługę zdarzeń; niższe pliki wołają go z renderGear / kliknięć (przez typeof). */
let grK=null,grFromAdm=false;   // 👑 wszystkie grupy + prośby o limit (Administracja → Grupy)
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
  if(!session){grOk=null;grFor="";grMine=[];grMem={};grLim={};grReqs=[];return}
  grLoading=true;
  try{
    const a=await sb.from("group_members").select("group_id,role,status,invited_by,created_at,joined_at").eq("user_id",uid).limit(200);
    if(a.error)throw a.error;
    const mine=a.data||[],ids=mine.map(m=>m.group_id),mem={},lim={};
    if(ids.length){
      const [b,c,d]=await Promise.all([
        sb.from("groups").select("id,owner,name,icon,descr,area,color,visibility,join_mode,member_limit,code,archived_at").in("id",ids),
        sb.from("group_members").select("group_id,user_id,role,status,invited_by,created_at,joined_at").in("group_id",ids).limit(5000),
        sb.from("group_limit_requests").select("id,group_id,from_limit,to_limit,status").in("group_id",ids).eq("status","pending")]);
      if(b.error)throw b.error;if(c.error)throw c.error;
      (b.data||[]).forEach(x=>{grG[x.id]=Object.assign({},grG[x.id]||{},x)});
      ids.forEach(i=>{mem[i]=[]});(c.data||[]).forEach(x=>{(mem[x.group_id]=mem[x.group_id]||[]).push(x)});
      (d.data||[]).forEach(x=>{lim[x.group_id]=x});
    }
    grMine=mine.filter(m=>grG[m.group_id]);grMem=mem;grLim=lim;grOk=true;grFor=uid;
    grReqs=[];grMine.forEach(m=>{if(grIsMod(m.group_id))(grMem[m.group_id]||[]).forEach(x=>{if(x.status==="requested")grReqs.push(x)})});
    if(isKingReal())await grKLoad();else grK=null;
  }catch(err){grOk=false;grFor=uid;grMsg=grErr(err)==="Grupy wymagają KROKU 70 w bazie."?grErr(err):"Nie udało się wczytać grup: "+grErr(err)}
  grLoading=false;
}
function grRefresh(){try{if(gearOpen&&["main","nick","groups","group","gradm","admin","user","plist"].includes(gearView))renderGear();renderBell();if(wGrOk)renderWants()}catch(e){}}   // 👥 KROK 71: plakietki grup na kartach
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
  return '<div class="grir">'+grIco(x)+'<span class="grt" data-gx="open" data-gid="'+esc(x.id)+'"><b>'+esc(x.name)+'</b><small>'+(m.invited_by&&nicks[m.invited_by]?'zaprasza '+esc(nicks[m.invited_by]):'zaproszenie do grupy')+(x.area?' · '+esc(x.area):'')+'</small></span>'
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
      return gRow(grCol(x),grIc(x),esc(x.name),[R?R[0].toUpperCase()+R.slice(1):"",grOsob(n),x.visibility==="hidden"?"ukryta":""].filter(Boolean).join(" · "),'','data-gx="open" data-gid="'+esc(x.id)+'"')})
    .concat(req.map(m=>{const x=grG[m.group_id];return gRow(grCol(x),grIc(x),esc(x.name),"Prośba wysłana — czekasz na przyjęcie","",'data-gx="open" data-gid="'+esc(x.id)+'"')})));
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
    return '<div class="grir">'+grIco(x)+'<span class="grt" data-gx="open" data-gid="'+esc(x.id)+'"><b>'+esc(x.name)+'</b><small>'+[x.area?esc(x.area):"",grOsob(+x.members||0),x.join_mode==="open"?"wolne dołączanie":"na prośbę"].filter(Boolean).join(" · ")+'</small></span>'+btn+'</div>'}).join("")+'</div>';
}

/* 👥 ekran grupy: Ludzie / O grupie */
function grGroupHtml(){
  const g=grId,x=grG[g],st=grSt(g),role=grRole(g),mod=grIsMod(g),own=role==="owner";
  const meta=[x.visibility==="hidden"?"ukryta":"jawna",x.join_mode==="open"?"wolne dołączanie":"na prośbę",grOsob(grCnt(g))].join(" · ");
  let h=(grFromAdm&&isKingReal()?'<button class="sback" data-gx="adm">‹ Wszystkie grupy</button>':'<button class="sback" data-gx="hub">‹ Grupy</button>')+'<div class="grhead">'+grIco(x,true)+'<div class="sname">'+esc(x.name)
   +(own?'<span class="pledb" role="button" tabindex="0" data-gx="edit" title="Edytuj grupę" aria-label="Edytuj grupę">'+uiIcon("pencil")+'</span>':'')+'</div>'
   +'<div class="smail">'+meta+(GR_ROLE[role]?' · <span class="grrole">'+GR_ROLE[role]+'</span>':'')+'</div></div>';
  if(st==="invited"){const m=grMy(g);
    h+='<div class="grbox grwait"><div class="note" style="font-size:15px">'+(m.invited_by&&nicks[m.invited_by]?esc(nicks[m.invited_by])+' zaprasza Cię do tej grupy.':'Masz zaproszenie do tej grupy.')+'</div><div class="cfmb"><button type="button" class="cfmno" data-gx="dec" data-gid="'+esc(g)+'">Odrzuć</button><button type="button" class="cfmok" data-gx="acc" data-gid="'+esc(g)+'">Dołącz</button></div></div>'}
  else if(st==="requested")h+='<div class="grbox grwait"><div class="note" style="font-size:15px">Prośba wysłana — właściciel albo moderator zdecyduje.</div><button type="button" class="lnk" data-gx="leave">Wycofaj prośbę</button></div>';
  else if(!role&&grOn()&&x.visibility==="public"){const full=grCnt(g)>=+x.member_limit;
    h+=full?'<p class="note grwait">Grupa jest pełna.</p>':'<button type="button" class="b big" data-gx="join" data-gid="'+esc(g)+'">'+(x.join_mode==="open"?"Dołącz do grupy":"Poproś o dołączenie")+'</button>'}
  if(!role&&!isKingReal())return h+grAboutHtml(g,false);
  if(!role)h+='<p class="note grwait">👑 Podgląd administratora — nie jesteś w tej grupie.</p>';
  h+='<div class="seg grseg">'+[["ppl","Ludzie"],["about","O grupie"]].map(([k,t])=>'<button type="button" class="'+(grTab===k?'on':'')+'" data-gx="tab" data-v="'+k+'">'+t+'</button>').join("")+'</div>';
  return h+(grTab==="about"?grAboutHtml(g,true):grPplHtml(g));
}
function grPplHtml(g){
  const x=grG[g],role=grRole(g),mod=grIsMod(g),own=role==="owner",M=grMem[g]||[],used=grUsed(g),lim=+x.member_limit;
  const canInv=mod||(x.join_mode==="open"&&!!role);let h="";
  if(canInv)h+=gGrp("Zapraszanie",[gRow("#34c759","plus","Zaproś osoby","Z ulubionych, Twoich list albo wszystkich",'<span class="ios-v">'+used+' / '+lim+'</span>','data-gx="inv"')])
    +(used>=lim?'<p class="note" style="margin:8px 14px 0;font-size:13px;text-align:left">Limit miejsc wykorzystany (liczą się członkowie i zaproszeni).'+(own?' Poproś o więcej w zakładce „O grupie”.':'')+'</p>':'');
  const rq=mod?M.filter(m=>m.status==="requested"):[];
  if(rq.length)h+='<div class="ios"><div class="ios-gh">Proszą o dołączenie</div><div class="grbox">'+rq.map(r=>grReqRow(r,false)).join("")+'</div></div>';
  const ord={owner:0,mod:1,member:2},act=grAct(g).sort((a,b)=>(ord[a.role]-ord[b.role])||String(nicks[a.user_id]||"").localeCompare(String(nicks[b.user_id]||""),"pl"));
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
  Object.assign(gf,{mode:"form",id:id||"",busy:false,ids:pre.ids||[],name:x?x.name:pre.name||"",icon:x?grIc(x):"users",descr:x?x.descr||"":"",area:x?x.area||"":"",
    color:x?x.color:pre.color||grFreeCol(),vis:x?x.visibility:"public",join:x?x.join_mode:"request"});
  renderGrSheet(true);
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
        return '<button type="button" class="prow'+(st==="active"?' on':'')+(dis?' dis':'')+'" data-gk="pickg" data-gid="'+esc(g)+'"'+(dis?' disabled':'')+'><span class="cbx">'+CHECK+'</span><span class="pnm">'+grIco(x)+' '+esc(x.name)+'</span><span class="pjn">'+(st==="active"?"w grupie":st==="invited"?"zaproszony(a)":st==="requested"?"prosi — przyjmij w grupie":full?"brak miejsc":"")+'</span></button>'}).join("")
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
  }else{tt=gf.id?"Edytuj grupę":"Nowa grupa";const n=gf.ids.length;
    body='<div class="bslist grform">'+(n?'<div class="note" style="margin-top:6px;text-align:center;font-size:14px">Po założeniu zaprosisz '+grOsob(n).replace("osoba","osobę")+' z listy — członkiem zostanie ten, kto przyjmie zaproszenie.</div>':'')
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
     +'<div class="note plinfo" id="grinfo"></div></div>';
    btn='<button type="button" class="b big" data-gk="save"'+(gf.busy?' disabled':'')+'>'+(gf.id?"Zapisz zmiany":n?"Załóż grupę i zaproś "+n:"Załóż grupę")+'</button>';
  }
  p.innerHTML='<div class="bsbox bsauto" role="dialog" aria-modal="true"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-gk="close">Anuluj</button><b>'+tt+'</b><span style="min-width:64px"></span></div>'+body+btn+'</div>';
  if(first)setTimeout(()=>{const i=$(gf.mode==="code"?"grcode":"grname");if(i&&!i.value)i.focus()},50);
}
const grInfo=t=>{const i=$("grinfo");if(i)i.textContent=t};
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
    gf.busy=true;renderGrSheet();
    const args={p_name:n,p_icon:gf.icon,p_descr:gf.descr.trim(),p_area:gf.area.trim(),p_visibility:gf.vis,p_join_mode:gf.join,p_color:gf.color};
    try{let g=gf.id;
      if(g){const r=await sb.rpc("group_update",Object.assign({g},args));if(r.error)throw r.error;closeGr();say("Zapisano grupę „"+n+"”")}
      else{const r=await sb.rpc("group_create",args);if(r.error)throw r.error;g=r.data;closeGr();say("👥 Założono grupę „"+n+"”");
        if(gf.ids.length){try{await grInvite(g,gf.ids)}catch(err){say("Grupa założona, ale zaproszenia nie poszły: "+grErr(err))}}}
      await grLoad();grGo(g);
    }catch(err){gf.busy=false;renderGrSheet();grInfo(grErr(err))}return}
});
// przejście do ekranu grupy (otwiera ⚙️, jeśli zamknięte)
function grGo(g){grId=g;grTab="ppl";grOpenU="";pf.gm=null;if(!gearOpen){gearOpen=true;gearFrom=""}gearView=grG[g]?"group":"groups";renderGear()}

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
  return '<div class="grir wrap">'+grIco(x)+'<span class="grt" data-gx="open" data-gid="'+esc(x.id)+'"><b>'+esc(x.name)+'</b><small>'+esc(nicks[r.asked_by]||"właściciel")+' prosi: '+r.from_limit+' → '+r.to_limit+' · członków '+grCnt(x.id)+(grAct(x.id).some(m=>m.role==="mod")?' · jest moderator':'')+'</small></span>'
   +'<span class="grb"><button type="button" class="b small w" data-gx="lno" data-rq="'+esc(r.id)+'" data-gid="'+esc(x.id)+'">Odrzuć</button><button type="button" class="b small" data-gx="lok" data-rq="'+esc(r.id)+'" data-gid="'+esc(x.id)+'">Zatwierdź</button></span></div>'}
function grAdmRow(){if(!isKingReal())return "";grFresh();const n=grKReqN();
  return gRow("#0a84ff","users","Grupy",grK?"Wszystkie: "+grK.groups.filter(x=>!x.archived_at).length+(n?" · prośby o limit":""):"Wszystkie grupy i prośby o limit",n?'<span class="ios-bdg">'+n+'</span>':'','data-gx="adm"')}
function grAdmHtml(){
  let h='<button class="sback" data-c="backadm">‹ Administracja</button><div class="sname" style="margin-top:26px">👥 Grupy 👑</div>';
  if(!grK)return h+'<p class="note grwait">'+(grLoading?"Wczytuję…":"Nie udało się wczytać grup (KROK 70?).")+'</p>';
  if(grK.reqs.length)h+='<div class="ios"><div class="ios-gh">Prośby o większy limit</div><div class="grbox">'+grK.reqs.map(grLimRow).join("")+'</div></div>';
  const L=grK.groups,act=L.filter(x=>!x.archived_at),arch=L.filter(x=>x.archived_at),row=x=>gRow(grCol(x),grIc(x),esc(x.name),
     [esc(nicks[x.owner]||"bez właściciela"),grOsob(grCnt(x.id))+" / "+x.member_limit,x.visibility==="hidden"?"ukryta":"jawna",x.archived_at?"archiwum":""].filter(Boolean).join(" · "),"",'data-gx="open" data-gid="'+esc(x.id)+'"');
  h+=gGrp("Wszystkie grupy ("+act.length+")",act.map(row))+(act.length?'':'<p class="note grwait">Nikt jeszcze nie założył grupy.</p>')+gGrp("Archiwum ("+arch.length+")",arch.map(row));
  return h+'<p class="note" style="margin:10px 14px 0;font-size:13px;text-align:left">👑 Na czas rozwijania widzisz wszystkie grupy, także ukryte, i ich skład (wyłączenie — koniec KROKU 70).</p>';
}

/* 🔔 sekcja „Grupy”: zaproszenia do mnie i prośby do grup, w których jestem właścicielem / moderatorem (do załatwienia — liczą się do numerka) */
const grBellN=()=>session&&grOk&&grFor===uid?grMine.filter(m=>m.status==="invited").length+grReqs.length+grKReqN():0;
function grBellHtml(){const n=grBellN();if(!n)return "";
  return bsSec("grp","👥 Grupy",n,n,grMine.filter(m=>m.status==="invited").sort(grByName).map(grInvRow).join("")+grReqs.map(r=>grReqRow(r,true)).join("")+(grKReqN()?grK.reqs.map(grLimRow).join(""):"")
    +'<div class="bsempty"><button type="button" class="lnk" data-gx="hub">Wszystkie grupy: ⚙️ → Grupy ›</button></div>')}
$("bellsheet").addEventListener("click",async e=>{
  const b=e.target.closest("[data-gx]");if(!b||b.disabled||!session)return;
  const a=b.dataset.gx,g=b.dataset.gid,u=b.dataset.gu||"",x=grG[g],nm=nicks[u]||"tę osobę";
  if(a==="hub"||a==="open"){closeBell();if(a==="open"&&x){grGo(g);return}gearOpen=true;gearFrom="";gearView="groups";renderGear();grReload();return}
  if(!x)return;
  if(a==="acc")await grDo("group_answer",{g,accept:true},"👥 Dołączono do grupy „"+x.name+"”",b);
  else if(a==="dec"){if(await askOk("Odrzucić zaproszenie do „"+x.name+"”?","Odrzuć"))await grDo("group_answer",{g,accept:false},"Odrzucono zaproszenie.",b)}
  else if(a==="rok")await grDo("group_decide",{g,u,accept:true},"👥 "+nm+" — przyjęto do „"+x.name+"”",b);
  else if(a==="rno")await grDo("group_decide",{g,u,accept:false},"Odrzucono prośbę: "+nm,b);
  else if(a==="lok"||a==="lno")await grDo("group_limit_decide",{req:b.dataset.rq,approve:a==="lok"},a==="lok"?"✅ „"+x.name+"”: limit zwiększony.":"Odrzucono prośbę o limit „"+x.name+"”.",b);
});

/* 🖱 akcje w ⚙️ (atrybut data-gx — nie koliduje z data-c obsługiwanym w js/05) */
async function grDo(fn,args,okMsg,btn){
  if(btn)btn.disabled=true;
  try{const r=await sb.rpc(fn,args);if(r.error)throw r.error;if(okMsg)say(typeof okMsg==="function"?okMsg(r.data):okMsg);await grReload();return true}
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
  if(a==="tab"){grTab=b.dataset.v;grOpenU="";renderGear();return}
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
    if(await grDo("group_leave",{g},st==="requested"?"Wycofano prośbę.":own?"Grupa zamknięta.":"Wyszedłeś(-aś) z grupy „"+x.name+"”.",b)){gearView="groups";grFind=null;renderGear()}return}
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
function wGrTag(w){const x=grG[w.group_id];
  return '<span class="lockt grtag" style="background:'+(x?grInk(grCol(x)):'#6e6e73')+'">'+uiIcon(x?grIc(x):"users")+'<span>'+esc(x?x.name:"grupa")+'</span></span>'}
function wGrCls(w){const x=grG[w.group_id];return ' wgrp" style="--gc:'+(x?grCol(x):'#8e8e93')}
