/* ---------- stan ---------- */
const RECOVERY=/type=recovery/.test(location.hash||""),HASH_EXPIRED=/error_code=otp_expired/.test(location.hash||"");
let pwMode=false;
let sb=null,session=null,uid="",ready=false;
let me={nick:null},isAdmin=false,adminIds=[];
let nicks={},sorted=[],cur=-1,rsvps={},wants=[],joins={},lib=[];
let viewToken=0,shareFor=null,map1=null,map2=null;
let editId=null,formRoute,libFile=null;
const routeCache={},libCache={};

const nickOf=id=>nicks[id]||"ktoś";
/* płeć i kolory nicków */
let genders={},genderOk=false;
const DEF_COLORS={K:"#b0245f",M:"#1f56b3"},DEF_BGS={K:"#fde4ef",M:"#e3edfc"};
let nickColors={...DEF_COLORS},nickBgs={...DEF_BGS};
const HEX_RE=/^#[0-9a-fA-F]{6}$/;
const colorOf=id=>{const g=genders[id];return g&&HEX_RE.test(nickColors[g]||"")?nickColors[g]:""};
// nick jako kolorowy HTML (tekst zawsze przez esc)
// nick jako „pigułka”: kolor tekstu i tło zależne od płci (ustawia admin); bez płci — szara
const pill=(t,c,bg,live,uid_,extra,pre)=>'<span'+(uid_?' data-u="'+esc(uid_)+'"':'')+' class="nk'+(c&&bg==="none"?' nobg':'')+(live?' live" title="teraz w aplikacji':'')+'"'+(c?' style="color:'+c+';background:'+(bg==="none"?"transparent":bg)+'"':'')+'>'+(pre||'')+esc(t)+(extra||'')+'</span>';
/* ulubieni (prywatni: każdy widzi tylko swoich) */
let favs=new Set(),favOk=false;
const isFav=id=>favs.has(id);
const nk=(id,fallback)=>{const c=colorOf(id),g=genders[id],t=nicks[id]||fallback||"ktoś";return pill(t+(testerIds.has(id)?" 🧪":""),c,c?nickBgs[g]:"",onlineIds.includes(id),nicks[id]&&favOk&&id!==uid?id:"",fbBulb(id)?' '+uiIcon("bulb"):"",avImg(id,"nkav")+(isFav(id)?uiIcon("starf")+' ':""))};
const favFirst=ids=>ids.slice().sort((a,b)=>(isFav(b)?1:0)-(isFav(a)?1:0));
const nkList=ids=>'<div class="nks">'+favFirst(ids).map(id=>nk(id)).join("")+'</div>';
const favNames=ids=>favFirst(ids).filter(isFav).map(id=>nicks[id]).filter(Boolean);
// nick: min. 3 litery (KROK 20) — cyfry, spacje i znaki się nie liczą
const nickLetters=n=>String(n||"").replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g,"").length;
const nickShort=()=>!!me.nick&&nickLetters(me.nick)<3&&!isSuper(uid);
const needProfile=()=>!!session&&(!me.nick||(genderOk&&!genders[uid])||nickShort());
const isUpcoming=r=>new Date(r.when).getTime()>=Date.now()-3*36e5;
const firstUpcoming=()=>sorted.findIndex(isUpcoming);
function pickDefault(){const f=firstUpcoming();return f>=0?f:sorted.length-1}
const canEdit=r=>!!session&&(r.creator===uid||isAdmin);
function changedHtml(r){
  if(!r.edited_at)return "";
  const k="chg"+r.id;
  return '<details class="chg" data-j="'+esc(k)+'"'+(joinOpen.has(k)?' open':'')+'><summary>⚠️ Wydarzenie zmienione</summary>'
   +'<div class="chgb"><span class="chgd">'+esc(fmtWhen(r.edited_at))+'</span><br>'+esc(r.change_note||"Szczegóły zmiany nie zostały podane.")+'</div></details>';
}

async function getRoute(id){
  if(id in routeCache)return routeCache[id];
  const r=await sb.from("rides").select("route").eq("id",id).single();
  if(r.error)throw r.error;
  const pts=r.data&&r.data.route?parseRoute(r.data.route):false;
  routeCache[id]=pts;return pts;
}
async function getLibRoute(id){
  if(id in libCache)return libCache[id];
  const r=await sb.from("routes").select("route").eq("id",id).single();
  if(r.error)throw r.error;
  const pts=r.data&&r.data.route?parseRoute(r.data.route):false;
  libCache[id]=pts;return pts;
}

/* ---------- nagłówek: zwijanie przy przewijaniu ---------- */
let hdrCompact=false;
function onScroll(){
  const y=window.scrollY||document.documentElement.scrollTop||0;
  const c=hdrCompact?y>4:y>56;
  if(c!==hdrCompact){hdrCompact=c;$("hdr").classList.toggle("compact",c)}
}
window.addEventListener("scroll",onScroll,{passive:true});
onScroll();

