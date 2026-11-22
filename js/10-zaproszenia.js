/* ---------- 🚴 „Jak poszło?” po jeździe (KROK 39; decyzje właściciela 2026-11-15 20:08) ---------- */
// wszystkie pytania + ocena trasy GPX; odpowiedzi widzą wszyscy; autor potwierdza obecność innych
let reportOk=false,reports={},repHash="",rs=null,repShown=false,userRides={};
const REP_TAGS=[["sun","☀️ słonecznie"],["wind","💨 pod wiatr"],["tailwind","🌬 wiatr w plecy"],["rain","🌧 padało"],["gravelp","✨ szutry premium"],["forest","🌳 przez las"],["mud","💧 błoto"],["climb","⛰️ podjazdy"],["rough","🪨 trudny teren"],["fast","🔥 mocne tempo"],["flat","🛞 guma"],["coffee","☕ przerwa na kawę"],["icecream","🍦 lody"],["view","🌅 widoki"]];
const REP_TAGS_OLD=["wind","rain","flat","coffee","rough","view"];   // bez KROKU 57 baza przyjmuje tylko te
const repSkip=()=>{try{return new Set(JSON.parse(localStorage.getItem("repSkip")||"[]"))}catch(e){return new Set()}};
// okienko „Jak poszło?” pokazuje się samo tylko RAZ po każdej jeździe — potem jazda czeka w 🔔 (prośba właściciela 2026-11-17 21:21)
const repAsked=()=>{try{return new Set(JSON.parse(localStorage.getItem("repAsked")||"[]"))}catch(e){return new Set()}};
function repAskedAdd(id){const a=[...repAsked()].filter(x=>x!==id);a.push(id);try{localStorage.setItem("repAsked",JSON.stringify(a.slice(-300)))}catch(e){}}
function repAutoOpen(id){repAskedAdd(id);openReport(id)}
const myRep=w=>(reports[w.id]||[]).find(r=>r.user_id===uid);
const repCan=w=>!!session&&reportOk&&wantStart(w).getTime()<=Date.now()&&Date.now()-new Date(w.starts_at).getTime()<7*864e5&&(w.user_id===uid||(joins[w.id]||[]).includes(uid));
// testowe: pytamy też po nich (decyzja właściciela 13:15 — pomaga w testach), ale ich odpowiedzi nie liczą się do statystyk (KROK 45)
// pytanie można wyłączyć: ⚙️ → Jazdy i zaproszenia → „Pytaj „Jak poszło?” po jeździe” (localStorage.repOff)
const repOff=()=>{try{return localStorage.getItem("repOff")==="1"}catch(e){return false}};
function repPending(){
  const sk=repSkip(),lt=repAsked();
  return wants.filter(w=>wDone(w)&&Date.now()-wantEnd(w).getTime()<3*864e5&&repCan(w)&&!myRep(w)&&!sk.has(w.id)&&!lt.has(w.id))
    .sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at));
}
function maybeReport(){
  if(!session||!reportOk||pwMode||needProfile()||anySheetOpen()||gearOpen)return;
  if(repHash){const w=wants.find(x=>x.id===repHash);repHash="";if(w&&repCan(w)){openReport(w.id);return}}
  if(repShown||repOff())return;const p=repPending();if(!p.length)return;
  repShown=true;repAutoOpen(p[0].id);
}
// 🔔 sekcja „Jak poszło?”: jazdy z 30 dni (moje i te, do których dołączyłem), ile ocenionych, co jeszcze można ocenić (do 7 dni)
function repBell(){
  if(!session||!reportOk)return null;
  const m=Date.now()-30*864e5,sk=repSkip();
  const all=wants.filter(w=>wDone(w)&&wantEnd(w).getTime()>m&&(w.user_id===uid||(joins[w.id]||[]).includes(uid)));
  const todo=all.filter(w=>!myRep(w)&&repCan(w)&&!sk.has(w.id)).sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at));
  return {n:all.length,rated:all.filter(w=>myRep(w)).length,todo};
}
const repTodoN=()=>{const r=repBell();return r?r.todo.length:0};
// 🏷 tytuł zaproszenia — jeden wspólny element na kartach, w 🔔, w „Jak poszło?”, w Archiwum
// tytuł domyślny — ta sama zasada co want_auto_title() w bazie (KROK 65): dzień + pora + rower
function autoTitle(d,bike){if(!d)return "";
  const dw=(d.getDay()+6)%7,h=d.getHours(),st=["Poniedziałkow","Wtorkow","Środow","Czwartkow","Piątkow","Sobotn","Niedzieln"][dw],soft=dw===5;
  const [g,pora]=h<5?["f","nocna jazda"]:h<10?["m","poranek"]:h<13?["n","przedpołudnie"]:h<17?["n","popołudnie"]:h<21?["m","wieczór"]:["f","nocna jazda"];
  return st+(soft?{m:"i",n:"ie",f:"ia"}[g]:{m:"y",n:"e",f:"a"}[g])+" "+pora+({road:" na szosie",gravel:" na gravelu",mtb:" w terenie",trekking:" turystycznie"}[bike]||"")}
// tytuł domyślny wpisany w pole; dopóki autor go nie zmieni, nadąża za dniem, godziną i rowerem
function wfTitleHint(){const el=$("wtitlehint"),inp=$("wtitle");if(!el||!inp)return;
  if(wf.titleAuto)inp.value=autoTitle(wfDate(),wf.bike);
  el.textContent="Ułożony automatycznie — możesz go zmienić.";el.classList.toggle("hide",!titleOk||!wf.titleAuto||!inp.value)}
const wTitleHtml=w=>w.title?'<div class="wtl">'+uiIcon("tag")+'<span>'+esc(w.title)+'</span></div>':'';
function repBellRow(w){const d=new Date(w.starts_at);
  return '<div class="nit stn"><div class="ic">🚴</div><div class="tx">'+wTitleHtml(w)+'<b>'+esc(relDayPast(d)+' · '+hhmm(d))+'</b>'
   +'<div class="w">'+(w.user_id===uid?'Twoje zaproszenie':'z '+esc(nickOf(w.user_id)))+(w.place?' · '+esc(w.place):w.note?' · '+esc(w.note.slice(0,40)):'')+(isTest(w)?' · test':'')+'</div></div>'
   +'<button type="button" class="lnk stgo" data-rep="'+esc(w.id)+'">Oceń ›</button></div>'}
function repBellHtml(){
  const r=repBell();if(!r||!r.n)return "";const K=genders[uid]==="K";
  return bsSec("rep",'🚴 Jak poszło? · 30 dni',r.todo.length,r.todo.length,
    '<div class="bsempty repsum">'+(K?'Jeździłaś':'Jeździłeś')+': <b>'+r.n+'</b> · ocenione: <b>'+r.rated+'</b> · do oceny: <b>'+r.todo.length+'</b></div>'
    +(r.todo.length?r.todo.map(repBellRow).join(""):'<div class="bsempty">✅ Wszystko ocenione — dzięki!</div>'));
}
function openReport(id){
  const w=wants.find(x=>x.id===id);if(!w)return;
  const mine=myRep(w),plan=kmOf(w);
  rs={id,went:mine?mine.went:null,kmMode:mine&&mine.km!=null?(plan&&+mine.km===plan?"plan":"own"):plan?"plan":"own",km:mine&&mine.km!=null?String(+mine.km):"",kmh:mine&&mine.avg_kmh!=null?String(+mine.avg_kmh):"",
    rating:mine&&mine.rating||0,rrating:mine&&mine.route_rating||0,tags:new Set(mine&&mine.tags||[]),who:{},
    rv:rbOk&&w.route_base_id&&!isTest(w)?rvEmpty():null};
  // ocena trasy z bazy: wczytaj swoją dotychczasową
  if(rs.rv){const rid=w.route_base_id,sid=id;sb.from("route_reviews").select("rating,scenic,difficulty,traffic,tags,comment").eq("route_id",rid).eq("user_id",uid).limit(1).then(r=>{const d=r&&r.data&&r.data[0];
      if(d&&rs&&rs.id===sid&&rs.rv&&!rs.rvTouched){const v=rvFrom(d);v.comment=rs.rv.comment||v.comment;rs.rv=v;if(!rs.rrating&&d.rating)rs.rrating=d.rating;renderRep()}},()=>{})}
  if(w.user_id===uid)(joins[w.id]||[]).filter(x=>x!==uid).forEach(x=>{const r=(reports[w.id]||[]).find(y=>y.user_id===x);rs.who[x]=r?r.went:true});
  renderRep();
}
function closeRep(){const p=$("repsheet");p.classList.add("hide");p.innerHTML="";rs=null}
const starsRow=(k,v)=>'<div class="rstars">'+[1,2,3,4,5].map(n=>'<button type="button" class="rst'+(n<=v?' on':'')+'" data-rs="'+k+'" data-v="'+n+'" aria-label="'+n+' na 5">★</button>').join("")+'</div>';
function renderRep(){
  const w=rs&&wants.find(x=>x.id===rs.id);if(!w){closeRep();return}
  const plan=kmOf(w),p=$("repsheet"),pend=repPending(),idx=pend.findIndex(x=>x.id===w.id),own=w.user_id===uid;
  const others=Object.keys(rs.who),RR=reports[w.id]||[];
  p.classList.remove("hide");
  p.innerHTML='<div class="bsbox repbox" role="dialog" aria-modal="true" aria-label="Jak poszło?"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-rs="later">Później</button><b>🚴 Jak poszło?</b><span style="min-width:64px;text-align:right" class="note">'+(pend.length>1&&idx>=0?(idx+1)+' z '+pend.length:'')+'</span></div>'
   +'<div class="bslist">'
   +(isTest(w)?'<div class="rtest"><span class="ttag">🧪 TEST</span> Testowa jazda — odpowiedź na próbę, nie liczy się do statystyk.</div>':'')
   +wTitleHtml(w)+'<div class="rsub">'+esc(relDayPast(new Date(w.starts_at))+" · "+hhmm(new Date(w.starts_at)))+(w.place?' · 📍 '+esc(w.place):'')+'<br>'+nk(w.user_id)+(own?' <span class="note">(Twoje zaproszenie)</span>':'')+'</div>'
   +(myRep(w)?'<div class="myrep" style="margin-top:10px">✏️ '+(genders[uid]==="K"?'Odpowiedziałaś':'Odpowiedziałeś')+(myRep(w).updated_at?' '+esc(new Date(myRep(w).updated_at).toLocaleDateString("pl-PL",{day:"numeric",month:"numeric"})):'')+' — możesz zmienić i zapisać ponownie.</div>':'')
   +'<div class="bsgrp">'+(genders[uid]==="K"?'Pojechałaś?':'Pojechałeś?')+'</div><div class="seg rseg"><button type="button" data-rs="went" data-v="1" class="'+(rs.went===true?'on':'')+'">✅ Tak</button><button type="button" data-rs="went" data-v="0" class="'+(rs.went===false?'on':'')+'">❌ '+(genders[uid]==="K"?'Nie dałam rady':'Nie dałem rady')+'</button></div>'
   +(rs.went?'<div class="bsgrp">Ile km?</div><div class="fchips">'+(plan?[["plan","Jak w planie · "+String(plan).replace(".",",")+" km"],["less","Mniej"],["more","Więcej"]]:[]).map(([v,t])=>'<button type="button" class="fch'+(rs.kmMode===v?' on':'')+'" data-rs="km" data-v="'+v+'">'+esc(t)+'</button>').join("")+'</div>'
      +(rs.kmMode!=="plan"||!plan?'<div class="rrow"><input type="text" inputmode="decimal" maxlength="6" id="repkm" placeholder="km" value="'+esc(rs.km)+'"><span>km</span></div>':'')
      +'<div class="bsgrp">Średnia prędkość <span class="note">(opcjonalnie)</span></div><div class="rrow"><input type="text" inputmode="decimal" maxlength="5" id="repkmh" placeholder="np. 21" value="'+esc(rs.kmh)+'"><span>km/h</span></div>'
      +'<div class="bsgrp">Oceń jazdę</div>'+starsRow("rating",rs.rating)
      +(w.route_km!=null?'<div class="bsgrp">Oceń trasę GPX · '+String(w.route_km).replace(".",",")+' km</div>'+starsRow("rrating",rs.rrating)
        +(rs.rv?'<div class="rvbox"><div class="note" style="margin-bottom:4px">📚 Trasa z Bazy tras — Twoja ocena trafi do rankingów.</div>'+rvFieldsHtml(rs.rv,false)+'</div>'
          :'<div class="note">Dobre trasy trafią do bazy tras do kolejnych zaproszeń.</div>'):'')
      +'<div class="bsgrp">Jak było? <span class="note">(dotknij, co pasuje)</span></div><div class="fchips">'+REP_TAGS.map(([v,t])=>'<button type="button" class="fch'+(rs.tags.has(v)?' on':'')+'" data-rs="tag" data-v="'+v+'">'+t+'</button>').join("")+'</div>':'')
   +(own&&others.length?'<div class="bsgrp">Kto był? <span class="note">(potwierdzasz za innych)</span></div>'+others.map(id=>{const r=RR.find(y=>y.user_id===id&&y.self);
      return r?'<div class="prow rwho"><span class="pnm">'+nk(id)+'</span><span class="note">'+(r.went?'✅ sam(a) potwierdził(a)':'❌ nie pojechał(a)')+'</span></div>'
        :'<button type="button" class="prow rwho'+(rs.who[id]?' on':'')+'" data-rs="who" data-v="'+esc(id)+'"><span class="cbx">'+CHECK+'</span><span class="pnm">'+nk(id)+'</span><span class="note">'+(rs.who[id]?'był(a)':'nie był(a)')+'</span></button>'}).join(""):'')
   +'<button type="button" class="lnk rskip" data-rs="skip">Nie pytaj o tę jazdę</button>'
   +'<button type="button" class="lnk rskip rskip2" data-rs="off">Nie pytaj mnie po jazdach</button></div>'
   +'<button type="button" class="b big" data-rs="save"'+(rs.went==null?' disabled':'')+'>Zapisz</button></div>';
}
const relDayPast=d=>{const n=dayDiff(d);return n===0?"Dziś":n===-1?"Wczoraj":d.toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"})};
async function saveReport(){
  const w=wants.find(x=>x.id===rs.id);if(!w)return;
  const plan=kmOf(w),num=v=>{const x=parseFloat(String(v).replace(",","."));return isFinite(x)?x:null};
  let km=null;if(rs.went){km=rs.kmMode==="plan"&&plan?plan:num(rs.km);if(km!=null&&(km<0||km>1000)){say("Podaj km od 0 do 1000.");return}}
  let kmh=rs.went?num(rs.kmh):null;if(kmh!=null&&(kmh<3||kmh>60)){say("Średnia prędkość: od 3 do 60 km/h.");return}
  const row={want_id:w.id,user_id:uid,went:!!rs.went,km,avg_kmh:kmh,rating:rs.went&&rs.rating||null,route_rating:rs.went&&w.route_km!=null&&rs.rrating||null,tags:rs.went?[...rs.tags]:[]};
  try{
    let r=await sb.from("ride_reports").upsert(row,{onConflict:"want_id,user_id"});
    if(r.error&&/tags/i.test(r.error.message||"")&&row.tags.some(t=>!REP_TAGS_OLD.includes(t))){   // brak KROKU 57 — zapisz bez nowych etykiet
      row.tags=row.tags.filter(t=>REP_TAGS_OLD.includes(t));r=await sb.from("ride_reports").upsert(row,{onConflict:"want_id,user_id"});
      if(!r.error)say("Zapisano — nowe etykiety zadziałają po KROKU 57 w bazie.")}
    if(r.error)throw r.error;
    // ⭐ ocena trasy z bazy (etap 2) — razem z odpowiedzią
    if(rs.rv&&rs.went&&w.route_base_id){const v=Object.assign({},rs.rv,{rating:rs.rrating||0}),rr=rvRow(w.route_base_id,v,w.id);
      if(rvHas(rr))try{await rvSave(rr)}catch(err){say("Odpowiedź zapisana, ale ocena trasy nie: "+(err&&err.message||"błąd"))}}
    const RR=reports[w.id]=(reports[w.id]||[]).filter(x=>x.user_id!==uid);RR.push(Object.assign({self:true,updated_at:new Date().toISOString()},row));
    if(w.user_id===uid)for(const id of Object.keys(rs.who)){
      if(RR.some(y=>y.user_id===id&&y.self))continue;
      const q=await sb.from("ride_reports").upsert({want_id:w.id,user_id:id,went:!!rs.who[id]},{onConflict:"want_id,user_id"});
      if(!q.error){const i=RR.findIndex(y=>y.user_id===id);const o={want_id:w.id,user_id:id,went:!!rs.who[id],self:false,km:null,rating:null,tags:[]};if(i>=0)RR[i]=o;else RR.push(o)}
    }
    closeRep();renderWants();say(rs===null&&row.went?"Dzięki! Zapisano 🚴":"Dzięki! Zapisano.");
    renderBell();
    setTimeout(()=>{if(repOff())return;const p=repPending();if(p.length&&!anySheetOpen())repAutoOpen(p[0].id)},600);
  }catch(e){say("Nie udało się zapisać: "+(e&&e.message?e.message:"błąd"))}
}
$("repsheet").addEventListener("click",e=>{
  if(e.target===$("repsheet")){repLaterAdd();closeRep();renderBell();return}
  const rvb=e.target.closest("[data-rv]");
  if(rvb&&rs&&rs.rv){rs.rvTouched=true;rvClick(rs.rv,rvb);const sc=$("repsheet").querySelector(".bslist"),t=sc?sc.scrollTop:0;renderRep();const s2=$("repsheet").querySelector(".bslist");if(s2)s2.scrollTop=t;return}
  const b=e.target.closest("[data-rs]");if(!b||!rs)return;const k=b.dataset.rs,v=b.dataset.v;
  if(k==="later"){repLaterAdd();closeRep();renderBell();say("Jazda czeka w 🔔 Powiadomieniach.");return}
  if(k==="skip"){const sk=repSkip();sk.add(rs.id);try{localStorage.setItem("repSkip",JSON.stringify([...sk]))}catch(err){}closeRep();renderWants();renderBell();return}
  if(k==="off"){try{localStorage.setItem("repOff","1")}catch(err){}closeRep();renderWants();say("Nie będę pytać po jazdach. Włączysz w ⚙️ → Jazdy i zaproszenia.");return}
  if(k==="save"){saveReport();return}
  if(k==="went")rs.went=v==="1";
  if(k==="km"){rs.kmMode=v;const w=wants.find(x=>x.id===rs.id),plan=kmOf(w);if(v!=="plan"&&!rs.km&&plan)rs.km=String(plan)}
  if(k==="rating")rs.rating=rs.rating===+v?0:+v;
  if(k==="rrating")rs.rrating=rs.rrating===+v?0:+v;
  if(k==="tag"){rs.tags.has(v)?rs.tags.delete(v):rs.tags.add(v)}
  if(k==="who")rs.who[v]=!rs.who[v];
  const sc=$("repsheet").querySelector(".bslist"),top=sc?sc.scrollTop:0;renderRep();const s2=$("repsheet").querySelector(".bslist");if(s2)s2.scrollTop=top;
  if(k==="km"&&v!=="plan"){const i=$("repkm");if(i)i.focus()}
});
$("repsheet").addEventListener("input",e=>{if(!rs)return;if(e.target.id==="repkm")rs.km=e.target.value;if(e.target.id==="repkmh")rs.kmh=e.target.value;if(e.target.id==="rvcom"&&rs.rv){rs.rv.comment=e.target.value;rs.rvTouched=true}});
function repLaterAdd(){if(rs)repAskedAdd(rs.id)}
// podsumowanie odpowiedzi do archiwum
// ✅ „Twoja odpowiedź” na karcie (prośba właściciela 2026-11-16 12:31: widać, że już odpowiedziałem)
function myRepHtml(w){
  const r=myRep(w);if(!r)return "";const K=genders[uid]==="K",when=r.updated_at?new Date(r.updated_at):null;
  const bits=r.self===false?[(r.went?'✅ autor potwierdził, że '+(K?'byłaś':'byłeś'):'❌ autor zaznaczył, że '+(K?'nie byłaś':'nie byłeś'))]
    :[r.went?(K?'✅ pojechałaś':'✅ pojechałeś'):(K?'❌ nie pojechałaś':'❌ nie pojechałeś'),r.km!=null?fmt1(+r.km)+' km':'',r.avg_kmh!=null?'⚡ '+fmt1(+r.avg_kmh)+' km/h':'',r.rating?'jazda '+'★'.repeat(r.rating):'',r.route_rating?'trasa '+'★'.repeat(r.route_rating):''];
  return '<div class="ail myrep"><b>'+(r.self===false?'Twoja jazda':(K?'Odpowiedziałaś':'Odpowiedziałeś'))+(when?' '+esc(when.toLocaleDateString("pl-PL",{day:"numeric",month:"numeric"}))+'</b>':'</b>')+': '+bits.filter(Boolean).map(esc).join(" · ")+'</div>';
}
function repSum(w){
  const R=reports[w.id]||[];if(!R.length)return null;
  const yes=R.filter(r=>r.went),sp=yes.filter(r=>r.self&&r.avg_kmh!=null).map(r=>+r.avg_kmh),sk=yes.filter(r=>r.self&&r.km!=null).map(r=>+r.km),rt=R.filter(r=>r.rating).map(r=>r.rating),rr=R.filter(r=>r.route_rating).map(r=>r.route_rating);
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null,tc={};R.forEach(r=>(r.tags||[]).forEach(t=>tc[t]=(tc[t]||0)+1));
  return {yes:yes.map(r=>r.user_id),n:R.length,km:avg(sk),kmh:avg(sp),kmhN:sp.length,rating:avg(rt),rn:rt.length,route:avg(rr),tags:tc};
}
const fmt1=x=>(Math.round(x*10)/10).toString().replace(".",",");
/* ---------- 🗄 archiwum zakończonych zaproszeń (30 dni; KROK 38) ---------- */
let archOpen=false,archAll=false;
const wPeople=w=>[w.user_id,...(joins[w.id]||[]).filter(x=>x!==w.user_id)];
const wExpired=w=>isOpen(w)&&!(joins[w.id]||[]).some(x=>x!==w.user_id);
function archSum(L){
  const R=L.filter(w=>!wExpired(w)&&!isTest(w)),ppl=new Set();let km=0,real=0;   // podsumowanie bez testowych
  const sp=[];R.forEach(w=>{const s=repSum(w);(s?s.yes:wPeople(w)).forEach(x=>ppl.add(x));if(s&&s.km!=null){km+=s.km;real++}else km+=kmOf(w)||0;if(s&&s.kmh!=null)sp.push(s.kmh)});
  return {n:R.length,p:ppl.size,km:Math.round(km),real,kmh:sp.length?sp.reduce((a,b)=>a+b,0)/sp.length:null};
}
function archItem(w){
  const d=new Date(w.starts_at),ex=wExpired(w),pp=wPeople(w),k=kmOf(w);
  const dd=dayDiff(d),dt=(dd===0?"Dziś":dd===-1?"Wczoraj":d.toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"}))+" · "+(isOpen(w)?wTime(w):hhmm(d));
  return '<div class="ai'+(isTest(w)?' test':'')+'">'+wTitleHtml(w)+'<div class="ait"><b>'+esc(dt)+'</b>'+(isTest(w)?' <span class="ttag">🧪 TEST</span>':'')+'<span class="'+(ex?'aex':'aok')+'">'+(ex?'⌛ wygasło':'zakończone')+'</span></div>'
   +'<div class="ail">'+nk(w.user_id)+(w.place?' · 📍 '+esc(w.place+(w.place_city?' · '+w.place_city:'')):'')+'</div>'
   +(ex?'<div class="ail note">Godzina nieustalona, nikt nie dołączył.</div>':(()=>{const S=repSum(w);
     return (S?'<div class="ail">✅ Potwierdziło '+S.yes.length+' z '+pp.length+': '+S.yes.map(id=>nk(id)).join(" ")+'</div>'+(pp.length>S.n?'<div class="ail note">❓ bez odpowiedzi: '+(pp.length-S.n)+'</div>':'')
        :'<div class="ail">🚴 Pojechało '+pp.length+': '+pp.map(id=>nk(id)).join(" ")+'</div>')
      +'<div class="ail note">'+[S&&S.km!=null?'📏 '+fmt1(S.km)+' km (z odpowiedzi)':w.route_km!=null?'🗺️ trasa '+String(w.route_km).replace(".",",")+' km':k?'📏 ok. '+k+' km':'',
         S&&S.km!=null&&w.route_km!=null?'🗺️ plan '+String(w.route_km).replace(".",",")+' km':'',
         S&&S.kmh!=null?'⚡ śr. '+fmt1(S.kmh)+' km/h'+(S.kmhN>1?' ('+S.kmhN+' os.)':''):'',
         '⏱ '+durTxt(wantDur(w)),w.pace?paceTxt(w.pace):''].filter(Boolean).map(esc).join(" · ")+'</div>'
      +(S&&(S.rating||S.route||Object.keys(S.tags).length)?'<div class="ail">'+(S.rating?'<span class="rpb">★ '+fmt1(S.rating)+' <small>jazda ('+S.rn+')</small></span> ':'')+(S.route?'<span class="rpb">★ '+fmt1(S.route)+' <small>trasa</small></span> ':'')
         +Object.entries(S.tags).sort((a,b)=>b[1]-a[1]).map(([t,c])=>{const x=REP_TAGS.find(y=>y[0]===t);return x?'<span class="rpt">'+esc(x[1])+(c>1?' ×'+c:'')+'</span>':''}).join("")+'</div>':'')
      +(hasRoute(w)&&rbBtnHtml(w)?'<div class="wrb" style="margin-top:6px">'+rbBtnHtml(w)+'</div>':'')
      +myRepHtml(w)
      +(repCan(w)&&!myRep(w)?'<button type="button" class="b g rbtn" data-arch="rep" data-id="'+esc(w.id)+'">✍️ Jak poszło? Uzupełnij</button>':repCan(w)?'<button type="button" class="lnk rbtn" data-arch="rep" data-id="'+esc(w.id)+'">✏️ Zmień swoją odpowiedź</button>':'')})())+'</div>';
}
function renderArch(all){
  const box=$("wantarch");if(!box)return;
  if(!session){box.innerHTML="";return}
  const since=Date.now()-30*864e5,L=all.filter(w=>wDone(w)&&new Date(w.starts_at).getTime()>since).sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at));
  if(!L.length){box.innerHTML="";return}
  const S=archSum(L),show=archAll?L:L.slice(0,3);
  box.innerHTML='<div class="arch"><button type="button" class="ah" data-arch="t">🗄 Archiwum · 30 dni'+(repPending().length?' <em class="rpend">✍️ '+repPending().length+'</em>':'')+'<span>'+L.length+' '+(archOpen?'⌃':'⌄')+'</span></button>'
   +(archOpen?'<div class="asum">📊 Ostatnie 30 dni: '+S.n+' '+plf(S.n,["jazda","jazdy","jazd"])+' · '+S.p+' '+plf(S.p,["osoba","osoby","osób"])+(S.km?' · ok. '+S.km+' km'+(S.real?(S.real===S.n?'':' (część z planu)'):' (plan)'):'')+(S.kmh!=null?' · ⚡ śr. '+fmt1(S.kmh)+' km/h':'')+'</div>'
     +show.map(archItem).join("")
     +(L.length>3?'<button type="button" class="lnk amore" data-arch="all">'+(archAll?'Zwiń ⌃':'Pokaż wszystkie ('+L.length+') ›')+'</button>':'')
     +'<div class="note anote">„Pojechało” = autor i osoby z „Jadę!”; „Potwierdziło” i km — z odpowiedzi „🚴 Jak poszło?”.</div>':'')+'</div>';
}
$("wantarch").addEventListener("click",e=>{const b=e.target.closest("[data-arch]");if(!b)return;
  if(b.dataset.arch==="rep"){openReport(b.dataset.id);return}
  if(b.dataset.arch==="t")archOpen=!archOpen;else archAll=!archAll;renderArch(wants)});
/* ---------- 🔍 filtry zaproszeń (decyzje właściciela 2026-11-15 18:58: jak w makiecie filtry.png + z karty osoby) ---------- */
// zapamiętane w telefonie; działają na listę zaproszeń (karty dni i Twoje zaproszenia), nie na 🔔
const fltEmpty=()=>({who:"",vis:"",act:"",grp:"",when:"",date:"",where:"",bike:"",pace:"",user:"",demo:""});   // vis: Widoczność, act: Aktywność, grp: 👥 grupa (KROK 71)
let flt=(()=>{let f;try{f=Object.assign(fltEmpty(),JSON.parse(localStorage.getItem("flt")||"{}"))}catch(e){f=fltEmpty()}
  if(f.who==="priv"||f.who==="open"){f.vis=f.who;f.who=""}   // „Czyje” rozdzielone na Relację i Widoczność — stary zapis przenosimy
  if(f.demo==="only")f.demo="";   // „Tylko od kont demo” zniknęło: konta demo to teraz przełącznik pokaż/ukryj
  return f})(),fltQ="",fltSub="",fltScroll=0;
function fltSave(){try{localStorage.setItem("flt",JSON.stringify(flt))}catch(e){}}
const fltBikeOn=()=>!flt.act||flt.act==="bike";   // rodzaj roweru ma sens tylko dla roweru (albo bez wybranej aktywności)
const fltKeys=()=>Object.keys(fltEmpty()).filter(k=>k!=="date"&&flt[k]&&(k!=="bike"||fltBikeOn()));
const fltActive=()=>fltKeys().length>0;
const wUpcoming=w=>!wDone(w);
const lc=t=>(t||"").toLocaleLowerCase("pl");
// najbliższy weekend; w niedzielę: dziś + następny weekend
function fltWknd(){const d=new Date().getDay();return d===6?[0,1]:d===0?[0,6,7]:[6-d,7-d]}
function fltOk(w){
  const j=joins[w.id]||[],dd=dayDiff(new Date(w.starts_at));
  if(flt.who==="mine"&&w.user_id!==uid)return false;
  if(flt.who==="going"&&(w.user_id===uid||!j.includes(uid)))return false;
  if(flt.who==="inv"&&(w.user_id===uid||!wInvMe(w)))return false;   // zaproszony = prywatne z moim wpisem na liście albo grupowe, w których jestem członkiem (nie moje)
  if(flt.who==="part"&&w.user_id!==uid&&!j.includes(uid))return false;   // biorę udział = moje + te, na które jadę
  if(flt.who==="fav"&&!(isFav(w.user_id)||j.some(isFav)))return false;
  if(flt.vis==="priv"&&w.visibility!=="private")return false;
  if(flt.vis==="open"&&w.visibility==="private")return false;
  if(flt.act&&(w.activity||"bike")!==flt.act)return false;
  if(flt.grp&&wGr(w)!==flt.grp)return false;
  if(flt.when==="today"&&dd!==0)return false;
  if(flt.when==="tom"&&dd!==1)return false;
  if(flt.when==="wknd"&&!fltWknd().includes(dd))return false;
  if(flt.when==="7d"&&(dd<0||dd>6))return false;
  if(flt.when==="date"&&flt.date&&localIso(new Date(w.starts_at)).slice(0,10)!==flt.date)return false;
  if(flt.where){const [t,v]=[flt.where.slice(0,1),flt.where.slice(2)];
    if(t==="c"&&w.place_city!==v)return false;
    if(t==="a"&&(w.place_city+"|"+w.place_area)!==v)return false;
    if(t==="p"&&lc(w.place)!==lc(v))return false;
    if(t==="q"&&![w.place,w.place_city,w.place_area].some(x=>lc(x).includes(lc(v))))return false}
  if(fltBikeOn()){if(flt.bike==="all"&&w.bike)return false;
    if(flt.bike&&flt.bike!=="all"&&w.bike&&w.bike!==flt.bike)return false}
  if(flt.pace&&w.pace!==flt.pace)return false;
  if(flt.user&&w.user_id!==flt.user&&!j.includes(flt.user))return false;
  if(flt.demo&&typeof demoIds!=="undefined"){const dm=demoIds.has(w.user_id);if(flt.demo==="only"&&!dm||flt.demo==="hide"&&dm)return false}   // zaproszenia od kont demo (dla wszystkich)
  return true;
}
const FLT_WHO=[["mine","Moje"],["going","Jadę"],["inv","Zaproszony"],["part","Biorę udział"],["fav","Ulubieni"]];   // „Biorę udział” tylko z licznika nad listą (w oknie bez bomblu)
const FLT_VIS=[["open","Otwarte"],["priv","Prywatne"]];
const FLT_ACT=[["bike","Rower"],["run","Bieganie"],["walk","Spacery"],["hike","Trekking"]];   // klucze jak SIG_ACT (js/11) i wants.activity
const FLT_ICO={mine:"user",going:"check",inv:"mail",fav:"star",open:"globe",priv:"lock",bike:"bike",run:"run",walk:"walk",hike:"tree"};
const FLT_WHEN=[["today","Dziś"],["tom","Jutro"],["wknd","Weekend"],["7d","7 dni"]];
const FLT_BIKE=()=>[["all","Dla wszystkich"]].concat(Object.entries(BIKES).map(([k,t])=>[k,t.replace(/^\S+\s/,"")]));
const FLT_PACE=()=>Object.entries(PACES).map(([k,x])=>[k,x.e+" "+x.r.replace(" km/h","")]);
function fltLabel(k){
  const v=flt[k],f=a=>(a.find(x=>x[0]===v)||[,v])[1];
  if(k==="who")return f(FLT_WHO);
  if(k==="vis")return f(FLT_VIS);
  if(k==="act")return f(FLT_ACT);
  if(k==="when")return v==="date"?(flt.date?new Date(flt.date+"T12:00").toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"}):"Data"):f(FLT_WHEN);
  if(k==="where"){const t=v.slice(0,1),x=v.slice(2);return t==="a"?x.replace("|"," · "):t==="q"?"„"+x+"”":x}
  if(k==="bike")return f(FLT_BIKE());
  if(k==="pace")return f(FLT_PACE());
  if(k==="user")return nicks[v]||"osoba";
  if(k==="grp")return grNm(v);
  if(k==="demo")return v==="hide"?"Bez kont demo":v;
  return v;
}
function renderWants(){try{renderSteps()}catch(e){}
  const all=wants,on=!!session&&fltActive();
  if(on)wants=all.filter(fltOk);
  try{renderWants0()}finally{wants=all}
  renderArch(all);
  const ws=$("wstat");if(ws){const up=all.filter(wUpcoming),me=up.filter(w=>w.user_id===uid||(joins[w.id]||[]).includes(uid)).length;   // widoczne dla mnie / biorę udział
    ws.classList.toggle("hide",!session);ws.innerHTML=uiIcon("hand")+'<button type="button" data-ws="all" class="'+(flt.who!=="part"?"on":"")+'">'+up.length+'</button><s>/</s><button type="button" data-ws="part" class="'+(flt.who==="part"?"on":"")+'">'+me+'</button>';
    ws.title="Zaproszenia widoczne dla Ciebie / te, w których bierzesz udział";ws.setAttribute("aria-label","Zaproszeń widocznych: "+up.length+", w których bierzesz udział: "+me)}
  const b=$("fltbtn"),bar=$("fltbar");if(!b)return;
  b.classList.toggle("hide",!session);b.classList.toggle("on",on);
  const n=fltKeys().length;$("fltn").textContent=n;$("fltn").classList.toggle("hide",!on);
  if(!on){bar.classList.add("hide");bar.innerHTML="";return}
  const up=all.filter(wUpcoming),shown=up.filter(fltOk).length;
  bar.classList.remove("hide");
  bar.innerHTML='<div class="fltchips">'+fltKeys().map(k=>'<button type="button" class="fac" data-fx="'+k+'">'+esc(fltLabel(k))+' ✕</button>').join("")+'<button type="button" class="lnk fclr" data-fx="*">Wyczyść</button></div>'
   +'<div class="note fcnt">'+shown+' z '+up.length+' zaproszeń</div>';
  if(!shown){const l=$("wantlist");if(l)l.innerHTML='<div class="note" style="margin-top:12px">Brak zaproszeń dla tych filtrów. <button type="button" class="lnk" data-fx="*">Wyczyść filtry</button></div>'}
}
document.addEventListener("click",e=>{const x=e.target.closest("[data-fx]");if(!x||!x.closest("#fltbar,#wantlist"))return;
  if(x.dataset.fx==="*")flt=fltEmpty();else{flt[x.dataset.fx]="";if(x.dataset.fx==="when")flt.date=""}
  fltSave();renderWants()});
$("fltbtn").addEventListener("click",()=>openFlt());
$("wstat").addEventListener("click",e=>{const b=e.target.closest("button[data-ws]");if(!b)return;   // licznik: pierwsza liczba = wszystkie, druga = tylko moje i te, na które jadę
  flt.who=b.dataset.ws==="part"&&flt.who!=="part"?"part":"";if(flt.who!=="part"&&b.dataset.ws==="all")flt.who="";fltSave();renderWants()});
function fltChip(k,v,t,ico){return '<button type="button" class="fch'+(flt[k]===v?' on':'')+'" data-fk="'+k+'" data-fv="'+esc(v)+'">'+(ico?uiIcon(ico):'')+esc(t)+'</button>'}
// przełącznik pokaż/ukryj: zielone V = pokazywane, czerwone X = ukryte
const fltTg=(k,t,off)=>'<button type="button" class="fch ftg'+(off?' off':'')+'" data-fk="'+k+'" aria-pressed="'+!off+'" aria-label="'+t+(off?': ukryte':': pokazywane')+'">'+uiIcon(off?"x":"check")+t+'</button>';
const fltUfGet=()=>{try{return JSON.parse(localStorage.getItem("fltUF")||"{}")}catch(e){return {}}};
function fltUfBump(id){const m=fltUfGet();m[id]=(m[id]||0)+1;try{localStorage.setItem("fltUF",JSON.stringify(m))}catch(e){}}
function fltHl(t,q){if(!q)return esc(t);const i=lc(t).indexOf(q);return i<0?esc(t):esc(t.slice(0,i))+"<mark>"+esc(t.slice(i,i+q.length))+"</mark>"+esc(t.slice(i+q.length))}
// ocena trafienia: im wyżej, tym bliżej pola wpisywania (lista rośnie w górę); wybrane zawsze zostają widoczne
function fltScore(t,q,base,on){if(q){const l=lc(t);if(l.startsWith(q))base=20;else if(l.split(/[\s·|]+/).some(x=>x.startsWith(q)))base=15;else if(l.includes(q))base=10;else return -1}return base+(on?(q?3:30):0)}
function fltItems(k,q){
  const out=[];
  if(k==="where"){
    const up=wants.filter(wUpcoming),seen=new Set();
    const add=(v,t,ty,b)=>{if(seen.has(v))return;seen.add(v);const sc=fltScore(t,q,b,flt.where===v);if(sc>=0)out.push({v,t,ty,sc})};
    up.forEach(w=>{if(w.place_city)add("c:"+w.place_city,w.place_city,"miasto",2)});places.forEach(x=>{if(x.city)add("c:"+x.city,x.city,"miasto",2)});
    up.forEach(w=>{if(w.place_city&&w.place_area)add("a:"+w.place_city+"|"+w.place_area,w.place_city+" · "+w.place_area,"dzielnica",1)});
    up.forEach(w=>{if(w.place)add("p:"+w.place,w.place,"miejsce",0)});places.forEach(x=>add("p:"+x.name,x.name,"miejsce",0));
    if(flt.where&&!seen.has(flt.where)&&flt.where.slice(0,2)!=="q:")out.push({v:flt.where,t:fltLabel("where"),ty:"",sc:33});
    if(q)out.push({v:"q:"+fltQ.trim(),t:"Szukaj „"+fltQ.trim()+"”",ty:"",sc:100,ico:"search",free:1});
    else if(flt.where&&flt.where.slice(0,2)==="q:")out.push({v:flt.where,t:fltLabel("where"),ty:"",sc:33,ico:"search",free:1});
  }else if(k==="grp"){
    const L=wGrList().map(x=>({id:x.id,name:x.name}));if(flt.grp&&!L.some(x=>x.id===flt.grp))L.push({id:flt.grp,name:fltLabel("grp")});
    L.forEach(x=>{const sc=fltScore(x.name,lc(fltQ.trim()),0,flt.grp===x.id);if(sc>=0)out.push({v:x.id,t:x.name,ty:"",sc,ico:"users",bdg:typeof grBadges==="function"&&grG[x.id]?grBadges(grG[x.id]):""})});
  }else{
    // bez wpisanego tekstu: osoby z zaproszeń (ulubieni i najczęściej wybierani niżej, czyli bliżej pola); z tekstem: wszyscy użytkownicy
    const fq=fltUfGet(),nk=nickKey(fltQ.trim()),ids=new Set(nk?Object.keys(nicks):[]);
    if(!nk)wants.filter(wUpcoming).forEach(w=>{ids.add(w.user_id);(joins[w.id]||[]).forEach(x=>ids.add(x))});
    if(flt.user)ids.add(flt.user);
    [...ids].filter(id=>nicks[id]&&id!==uid&&!modGone(id)&&(!nk||nickKey(nicks[id]).includes(nk)||id===flt.user)).forEach(id=>{
      const n=nickKey(nicks[id]);let sc=isFav(id)?2:fq[id]>0?1:0;
      if(nk)sc=n.startsWith(nk)?20:10;
      if(id===flt.user)sc+=nk?3:30;
      out.push({v:id,t:nicks[id],ty:fq[id]>0&&!isFav(id)?"wybierano "+fq[id]+"×":"",sc,fav:isFav(id),user:1})});
  }
  return out;
}
function fltStackHtml(){
  const k=fltSub,q=lc(fltQ.trim());
  let r=fltItems(k,q).sort((a,b)=>a.sc-b.sc||b.t.localeCompare(a.t,"pl"));
  const more=Math.max(0,r.length-6);r=r.slice(-6);
  if(!r.length)return '<div class="note">'+(q?'Nic nie znaleziono.':k==="where"?'Brak miejsc w zaproszeniach.':k==="grp"?'Brak grup.':'Brak osób w zaproszeniach — wpisz nick.')+'</div>';
  return (more?'<div class="note fmore">'+uiIcon("up")+'<span>jeszcze '+more+' — wpisz dalej, żeby zawęzić</span></div>':'')
   +'<div class="fulist">'+r.map(x=>{const on=flt[k]===x.v;
     return '<button type="button" class="fusr'+(on?' on':'')+'" data-fk="'+k+'" data-fv="'+esc(x.v)+'"><span class="fuic'+(x.ico?' g':'')+'">'+(x.fav?uiIcon("starf"):x.ico?uiIcon(x.ico):'')+'</span><span class="fun">'+(x.free||x.user?esc(x.t):fltHl(x.t,q))+(x.user&&typeof demoTag==="function"?demoTag(x.v):'')+(x.bdg||'')+'</span>'+(x.ty?'<small>'+x.ty+'</small>':'')+(on?'<span class="fuck">'+uiIcon("check")+'</span>':'')+'</button>'}).join("")+'</div>';
}
const fltHasGrp=()=>wGrList().length>0||!!flt.grp;
// grupy: bombel w rzędzie Widoczność (po „Prywatne”), otwiera podekran z listą rosnącą w górę nad polem wpisywania
const fltGrpChip=()=>'<button type="button" class="fch'+(flt.grp?' on':'')+'" data-fk="sub" data-fv="grp">'+uiIcon("users")+esc(flt.grp?fltLabel("grp"):"Grupy")+'<svg class="fchev r" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>';
const fltHasDemo=()=>(typeof demoIds!=="undefined"&&demoIds.size)||!!flt.demo;
const fltHasAct=()=>!!flt.act||wants.some(w=>w.activity&&w.activity!=="bike");   // sekcja „Aktywność” tylko gdy w zaproszeniach są inne aktywności niż rower
function fltSecs(){
  return {src:(testOk?fltTg("ht","Zaproszenia testowe",hideTest):'')+(fltHasDemo()?fltTg("tgdemo","Konta demo",flt.demo==="hide"):''),
    vis:FLT_VIS.map(([v,t])=>fltChip("vis",v,t,FLT_ICO[v])).join("")+(fltHasGrp()?fltGrpChip():""),
    act:FLT_ACT.map(([v,t])=>fltChip("act",v,t,typeof SIG_ACT!=="undefined"&&SIG_ACT[v]?SIG_ACT[v][0]:FLT_ICO[v])).join(""),
    when:FLT_WHEN.filter(x=>x[0]!=="7d").map(([v,t])=>fltChip("when",v,t)).join("")+'<label class="fch fdate'+(flt.when==="date"?' on':'')+'">'+uiIcon("cal")+'<input type="date" id="fltdate" value="'+esc(flt.when==="date"?flt.date:"")+'"></label>',
    who:FLT_WHO.filter(x=>x[0]!=="part").map(([v,t])=>fltChip("who",v,t,FLT_ICO[v])).join(""),
    bike:FLT_BIKE().map(([v,t])=>fltChip("bike",v,t)).join(""),
    pace:FLT_PACE().map(([v,t])=>fltChip("pace",v,t)).join("")};
}
function fltDraw(){
  if(fltSub){const s=$("fltstk");if(s)s.innerHTML=fltStackHtml();return}
  const S=fltSecs();Object.keys(S).forEach(k=>{const el=$("flt_"+k);if(el)el.innerHTML=S[k]});
  ["where","user"].forEach(k=>{const el=$("fsum_"+k);if(!el)return;el.textContent=flt[k]?fltLabel(k):(k==="where"?"Wszędzie":"Wszyscy");el.classList.toggle("fnone",!flt[k])});
  const bb=$("fltbikebox");if(bb)bb.classList.toggle("hide",!fltBikeOn());
  const n=wants.filter(wUpcoming).filter(fltOk).length;$("fltok").textContent=fltActive()?"Pokaż "+n+" "+(n===1?"zaproszenie":n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?"zaproszenia":"zaproszeń"):"Gotowe";
}
function fltRefresh(){fltDraw();renderWants()}
// okno: widok główny (bomble w rzędach przewijanych w bok) albo podekran „Gdzie” / „Osoba” z polem wpisywania na dole (wyniki rosną w górę)
function fltMainHtml(){
  const sec=(k,t)=>'<div class="fsec"><div class="bsgrp">'+t+'</div><div class="fchips" id="flt_'+k+'"></div></div>';
  const go=(k,ico,t)=>'<div class="fsec"><button type="button" class="secbar fgo" data-fk="sub" data-fv="'+k+'"><span class="bst">'+uiIcon(ico)+'<span>'+t+'</span></span><span class="wsplsel" id="fsum_'+k+'"></span><svg class="bschev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>';
  return '<div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-fk="close">Zamknij</button><b>Filtry</b><button type="button" class="lnk" data-fk="clear" style="color:var(--bad);text-align:right">Wyczyść</button></div>'
   +'<div class="bslist" id="fltlist">'+((testOk||fltHasDemo())?sec("src","Źródło zaproszeń"):'')+sec("vis","Widoczność")+(fltHasAct()?sec("act","Aktywność"):'')+sec("when","Kiedy")+sec("who","Relacja")+(bikeOk?'<div id="fltbikebox"'+(fltBikeOn()?'':' class="hide"')+'>'+sec("bike","Rodzaj roweru")+'</div>':'')+(paceOk?sec("pace","Tempo"):'')
   +(placeOk?go("where","pin","Gdzie"):'')+go("user","user","Osoba")+'</div>'
   +'<button type="button" class="b big" id="fltok" data-fk="close">Gotowe</button>';
}
function fltSubHtml(){
  const T=fltSub==="where"?["Gdzie","Miasto, dzielnica, miejsce…"]:fltSub==="grp"?["Grupa","Nazwa grupy…"]:["Osoba","Nick…"];
  return '<div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-fk="back">Filtry</button><b>'+T[0]+'</b><span style="min-width:64px"></span></div>'
   +'<div class="fstk" id="fltstk"></div><input class="bsq srch" id="fltq" type="search" placeholder="'+T[1]+'" autocomplete="off" value="'+esc(fltQ)+'">'
   +'<button type="button" class="b big" data-fk="back">Gotowe</button>';
}
function renderFlt(){
  const p=$("fltsheet");p.innerHTML='<div class="bsbox fltbox" role="dialog" aria-modal="true" aria-label="Filtry">'+(fltSub?fltSubHtml():fltMainHtml())+'</div>';
  fltDraw();const l=$("fltlist");if(l&&fltScroll){l.scrollTop=fltScroll;fltScroll=0}
}
function openFlt(){$("fltsheet").classList.remove("hide");fltSub="";fltQ="";fltScroll=0;renderFlt()}
function closeFlt(){const p=$("fltsheet");p.classList.add("hide");p.innerHTML=""}
$("fltsheet").addEventListener("click",e=>{
  if(e.target===$("fltsheet")){closeFlt();return}
  const b=e.target.closest("[data-fk]");if(!b||b.tagName==="LABEL")return;
  const k=b.dataset.fk;
  if(k==="close"){closeFlt();return}
  if(k==="clear"){flt=fltEmpty();fltQ="";fltSave();fltRefresh();return}
  if(k==="sub"){const l=$("fltlist");fltScroll=l?l.scrollTop:0;fltSub=b.dataset.fv;fltQ="";renderFlt();return}
  if(k==="back"){fltSub="";fltQ="";renderFlt();return}
  if(k==="tgdemo"){flt.demo=flt.demo==="hide"?"":"hide";fltSave();fltRefresh();return}
  if(k==="ht"){hideTest=!hideTest;try{localStorage.setItem("hideTest",hideTest?"1":"0")}catch(err){}deriveWants();fltRefresh();syncNow();return}   // to samo ustawienie co ⚙️ → Testy
  const v=b.dataset.fv;flt[k]=flt[k]===v?"":v;if(k==="when")flt.date="";
  if(k==="act"&&flt.act&&flt.act!=="bike")flt.bike="";   // rodzaj roweru nie dotyczy innych aktywności
  if(k==="user"&&flt.user)fltUfBump(flt.user);
  fltSave();fltRefresh();
});
$("fltsheet").addEventListener("input",e=>{if(e.target.id==="fltq"){fltQ=e.target.value;const s=$("fltstk");if(s)s.innerHTML=fltStackHtml()}});
$("fltsheet").addEventListener("change",e=>{if(e.target.id==="fltdate"){flt.date=e.target.value;flt.when=flt.date?"date":"";fltSave();fltRefresh()}});
let placesGeoDone=false;
async function fillPlaceCities(loud){
  const L=places.filter(y=>y.lat!=null&&!y.city);let okN=0,err="";
  if(loud&&!L.length){say("Wszystkie miejsca z pinezką mają już miasto.");return}
  if(loud)say("🏙 Sprawdzam miasta w OpenStreetMap… ("+L.length+")");
  for(const x of L){
    const g=await revGeo(x.lat,x.lon);
    if(!g.city){err=g.err||"OpenStreetMap nie podał miasta";}
    else{const u=await sb.from("places").update({city:g.city,area:g.area||null}).eq("id",x.id).select("id");
      if(u.error||!u.data||!u.data.length)err="baza nie zapisała"+(u.error?": "+u.error.message:" (brak uprawnień)");else{x.city=g.city;x.area=g.area||null;okN++}}
    await new Promise(r=>setTimeout(r,1100)); // OpenStreetMap: maks. 1 zapytanie na sekundę
  }
  if(loud)say(okN===L.length?"🏙 Uzupełniono miasta: "+okN:"🏙 Uzupełniono "+okN+" z "+L.length+(err?" — "+err:""));
  // zaproszenia bez miasta — z listy miejsc
  wants.forEach(w=>{if(w.place&&!w.place_city){const x=places.find(y=>y.city&&y.name.toLowerCase()===w.place.toLowerCase());if(x){w.place_city=x.city;w.place_area=w.place_area||x.area||null}}});
  renderWants();if(gearOpen&&gearView==="places")renderGear();
}
// miasto i dzielnica z pinezki — OpenStreetMap (Nominatim), bez klucza
async function revGeo(la,lo){
  try{const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=pl&lat="+la+"&lon="+lo);if(!r.ok)return {err:"OpenStreetMap odpowiedział błędem "+r.status};
    const a=(await r.json()).address||{},city=a.city||a.town||a.village||a.municipality||null;let area=a.city_district||a.suburb||a.borough||a.quarter||null;
    if(area&&city&&area===city)area=null;return {city:city?city.slice(0,60):null,area:area?area.slice(0,60):null}}catch(e){return {err:"brak połączenia z OpenStreetMap"}}
}
function renderWants0(){
  const guest=!session;
  $("wantguest").classList.toggle("hide",!guest);
  $("wantmain").classList.toggle("hide",guest);
  if(guest)return;
  renderMyWant();
  const list=wants.filter(w=>!wDone(w)&&!(myOn()&&w.user_id===uid));
  const box=$("wantlist");
  if(!list.length&&myCnt){box.innerHTML='<div class="note wonly">Poza Tobą nikt jeszcze nie zaprasza.</div>';wsecSync();return}
  if(!list.length){box.innerHTML='<div class="wempty"><div class="wemi">'+uiIcon("bike")+'</div><b>Nikt jeszcze nie zaprasza</b><span>Bądź pierwszy — wybierz dzień i godzinę, a reszta ekipy dostanie zaproszenie.</span>'
     +'<button type="button" class="b wembtn" data-wnew="1">'+uiIcon("plus")+' Zaproś na rower</button></div>';wsecSync();return}
  // grupowanie po dniu: jedna rozwijana karta na dzień
  const days=[];
  list.slice().sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).forEach(w=>{
    const k=localIso(new Date(w.starts_at)).slice(0,10);
    let d=days.find(x=>x.k===k);if(!d){d={k,ws:[]};days.push(d)}
    d.ws.push(w);
  });
  // tylko jedna karta rozwinięta: zapamiętana, a na start najbliższy dzień
  wdayWs={};days.forEach(d=>{wdayWs[d.k]=d.ws});
  const openDay=wantOpenDay===undefined||(wantOpenDay&&!days.some(x=>x.k===wantOpenDay))?days[0].k:wantOpenDay;
  box.innerHTML=days.map((d,i)=>{
    const dt=new Date(d.ws[0].starts_at),n=dayDiff(dt);
    const ppl=new Set();let me=false;
    d.ws.forEach(w=>{ppl.add(w.user_id);(joins[w.id]||[]).forEach(x=>ppl.add(x));if(w.user_id===uid||(joins[w.id]||[]).includes(uid))me=true});
    const open=openDay===d.k;
    const cnt=d.ws.length,zg=cnt===1?"zgłoszenie":(cnt%10>=2&&cnt%10<=4&&(cnt%100<10||cnt%100>=20))?"zgłoszenia":"zgłoszeń";
    const osFor=nn=>nn===1?"osoba":(nn%10>=2&&nn%10<=4&&(nn%100<10||nn%100>=20))?"osoby":"osób";
    const wd=dt.toLocaleDateString("pl-PL",{weekday:"long"});
    // kto zaprasza tego dnia (zwinięta karta — bez rozwijania karuzeli): ⭐ ulubieni na początku, do 3 imion + „+N”
    const authIds=favFirst([...new Set(d.ws.map(w=>w.user_id))]),authNames=authIds.map(id=>nicks[id]||"ktoś");
    const authTxt=authNames.length>3?authNames.slice(0,3).join(", ")+" +"+(authNames.length-3):authNames.join(", ");
    // kto jedzie tego dnia (osobna linia pod godzinami): „Ty i N osoby jadą” (N = inni, bez Ciebie) / „N osoby jadą”
    const others=me?ppl.size-1:ppl.size;
    const ty='<span class="wme">Ty</span>';
    const pplHtml=me?(others>0?ty+" i "+others+" "+osFor(others)+" jadą":ty+" jedziesz"):esc(ppl.size+" "+osFor(ppl.size)+(ppl.size===1?" jedzie":" jadą"));
    // trwająca jazda: jej godzina na pomarańczowo (jak znacznik TRWA) i zawsze na początku listy
    // karuzela w kolejności czasu (⭐ ulubieni widać przy nicku na karcie — nk()); godziny u góry: klik przewija/otwiera właściwe zaproszenie
    const mineTop=d.ws.filter(wAbove),ord=d.ws.filter(w=>!wAbove(w));
    const wdCap=wd.charAt(0).toUpperCase()+wd.slice(1);
    const l1=n>=0&&n<=2?esc(["Dziś","Jutro","Pojutrze"][n])+' <i>· '+esc(wdCap)+'</i>':esc(wdCap);
    return '<details class="wday'+(cnt>1?' wmulti':'')+'" data-day="'+d.k+'"'+(open?' open':'')+'><summary>'
     +'<div class="ftile'+(n===0?' today':'')+(d.ws.some(wLive)?' live':'')+'">'+ftInner(dt)+ftWxHtml(d.ws)+'</div>'
     +'<div class="wtx"><div class="wl1">'+l1+' · <span class="whrs'+(open?' whrsall':'')+'">'+wHrsHtml(d.ws,open)+'</span></div>'
     +'<div class="wl3">Od: '+esc(authTxt)+'</div>'
     +'<div class="wl2">'+pplHtml+'</div></div>'+wl4Html(d.ws)
     +(cnt>1?'<span class="wcnt" aria-label="'+cnt+' '+zg+'">'+cnt+'</span>':'')
     +'</summary>'+mineTop.map(wantDayHtml).join("")+(ord.length>1
       ?'<div class="dcar" data-day="'+d.k+'">'+ord.map(wantHtml).join("")+'</div><div class="mydots ddots">'+ord.map((_,i)=>'<button type="button" data-ddot="'+i+'" class="'+(i===(dayIdx[d.k]||0)?'on':'')+'" aria-label="Zaproszenie '+(i+1)+'"></button>').join("")+'<span>'+(Math.min(dayIdx[d.k]||0,ord.length-1)+1)+' z '+ord.length+'</span></div>'
       :ord.length?wantHtml(ord[0]):'')+'</details>';
  }).join("");
  box.querySelectorAll(".dcar").forEach(c=>dcarRestore(c));
  fillWx();fillFtWx();
  wsecSync();
}
/* godziny w nagłówku karty dnia: zwinięta karta — 4 + „+N” (etykieta); rozwinięta — wszystkie, klikalne (przewijają/otwierają właściwe zaproszenie w karuzeli) */
function wHrsHtml(ws,open){
  const hw=ws.filter(wLive).concat(ws.filter(w=>!wLive(w)));
  const mk=w=>'<button type="button" class="whb'+(wLive(w)?' hlive':'')+'" data-whr="'+esc(w.id)+'"'+(wLive(w)?' title="Trwa"':'')+'>'+wTime(w)+'</button>';
  return open?hw.map(mk).join(""):hw.slice(0,4).map(mk).join("")+(hw.length>4?'<b class="whmore">+'+(hw.length-4)+'</b>':'');
}
/* karuzela zaproszeń w karcie dnia */
const dayIdx={};
function dcarGoto(c,idx,smooth){
  const it=c.children[idx];if(!it)return;
  const left=it.offsetLeft-c.offsetLeft-(c.clientWidth-it.offsetWidth)/2;
  if(smooth)c.scrollTo({left,behavior:"smooth"});else c.scrollLeft=left;
  dayIdx[c.dataset.day]=idx;
  const dots=c.nextElementSibling;if(dots){[...dots.querySelectorAll("button")].forEach((b,i)=>b.classList.toggle("on",i===idx));const sp=dots.querySelector("span");if(sp)sp.textContent=(idx+1)+" z "+c.children.length}
}
function dcarRestore(c,tries){
  // dzień mógł się właśnie otworzyć — przeglądarka czasem nie zdążyła jeszcze policzyć szerokości w tej samej klatce
  if(!c.clientWidth){if((tries||0)<6)requestAnimationFrame(()=>dcarRestore(c,(tries||0)+1));return}
  dcarGoto(c,Math.min(dayIdx[c.dataset.day]||0,c.children.length-1),false);
}
$("wantlist").addEventListener("scroll",e=>{
  const c=e.target;if(!(c.classList&&c.classList.contains("dcar")))return;
  const mid=c.scrollLeft+c.clientWidth/2;let best=0,bd=1e9;
  [...c.children].forEach((x,i)=>{const d=Math.abs(x.offsetLeft-c.offsetLeft+x.offsetWidth/2-mid);if(d<bd){bd=d;best=i}});
  dayIdx[c.dataset.day]=best;
  const dots=c.nextElementSibling;if(dots){[...dots.querySelectorAll("button")].forEach((b,i)=>b.classList.toggle("on",i===best));const sp=dots.querySelector("span");if(sp)sp.textContent=(best+1)+" z "+c.children.length}
},true);
$("wantlist").addEventListener("click",e=>{
  const b=e.target.closest("button[data-ddot]");if(!b)return;
  const c=b.closest(".ddots").previousElementSibling;if(c)dcarGoto(c,+b.dataset.ddot,true);
});
// 🕖 klik w godzinę u góry karty dnia: otwiera dzień (jeśli zwinięty) i przewija do tego zaproszenia — w karuzeli albo wśród „Twoich” przypiętych wyżej
$("wantlist").addEventListener("click",e=>{
  const hb=e.target.closest("button.whb");if(!hb)return;
  e.preventDefault();e.stopPropagation();
  const d=hb.closest("details.wday");if(!d)return;
  const wid=hb.dataset.whr,dc=d.querySelector(".dcar");
  const idx=dc?[...dc.children].findIndex(x=>x.dataset.wid===wid):-1;
  if(idx>=0){
    if(d.open)dcarGoto(dc,idx,true);else{dayIdx[d.dataset.day]=idx;d.open=true}
  }else{
    const pin=d.querySelector('[data-wid="'+CSS.escape(wid)+'"]');
    if(!d.open)d.open=true;
    if(pin)requestAnimationFrame(()=>pin.scrollIntoView({block:"nearest",behavior:"smooth"}));
  }
});
let wantOpenDay;// undefined = domyślnie najbliższy dzień, null = wszystkie zwinięte
const MON3=["STY","LUT","MAR","KWI","MAJ","CZE","LIP","SIE","WRZ","PAŹ","LIS","GRU"];
$("wantlist").addEventListener("toggle",e=>{
  const d=e.target;if(!(d.classList&&d.classList.contains("wday")))return;
  const byUser=d.dataset.user==="1";delete d.dataset.user;
  const wh=d.querySelector(".whrs");if(wh){wh.classList.toggle("whrsall",d.open);wh.innerHTML=wHrsHtml(wdayWs[d.dataset.day]||[],d.open)}
  if(d.open){
    wantOpenDay=d.dataset.day;
    const dc=d.querySelector(".dcar");if(dc)requestAnimationFrame(()=>dcarRestore(dc));
    // zwiń pozostałe karty
    $("wantlist").querySelectorAll("details.wday[open]").forEach(x=>{if(x!==d)x.open=false});
    if(byUser)requestAnimationFrame(()=>{const s=d.querySelector("summary");if(s)s.scrollIntoView({block:"nearest",behavior:"smooth"})});
  }else if(byUser&&wantOpenDay===d.dataset.day)wantOpenDay=null;
  // animacja przewracania kartki tylko przy ręcznym rozwinięciu
  if(d.open&&byUser){const t=d.querySelector(".ftile");if(t){t.classList.remove("flipping");void t.offsetWidth;t.classList.add("flipping");setTimeout(()=>t.classList.remove("flipping"),600)}}
},true);
$("wantlist").addEventListener("click",e=>{const s=e.target.closest("details.wday>summary");if(s&&!e.target.closest(".whb"))s.parentElement.dataset.user="1"});
/* dołączeni: do 2 osób pigułki, od 3 — zwinięta lista (ulubieni na początku) */
const joinOpen=new Set();
function joinedHtml(wid,ids,empty,few,many){
  if(!ids.length)return '<div class="meta">'+empty+'</div>';
  if(ids.length<=2)return '<div class="meta">'+(few||"Dołączyli")+' ('+ids.length+'):'+nkList(ids)+'</div>';
  const fn=favNames(ids);
  return '<details class="jlist" data-j="'+esc(wid)+'"'+(joinOpen.has(wid)?' open':'')+'><summary><span class="jc">'+(many||"👥 Dołączyło")+' '+ids.length+'</span>'
   +(fn.length?'<span class="jf">· ⭐ '+esc(fn.join(", "))+'</span>':'')+'</summary>'
   +'<div class="jv">'+favFirst(ids).map(id=>'<div>'+nk(id)+(onlineIds.includes(id)?'<span class="note">🟢 teraz</span>':'')+'</div>').join("")+'</div></details>';
}
document.addEventListener("toggle",e=>{
  const d=e.target;if(!(d.classList&&(d.classList.contains("jlist")||d.classList.contains("chg")||d.classList.contains("stsec"))))return;
  d.open?joinOpen.add(d.dataset.j):joinOpen.delete(d.dataset.j);
},true);
// w karcie dnia: Twoje zaproszenie jest już pełne na górze („Twoje zaproszenia”) — tu tylko krótka linia z przejściem w górę
const wAbove=w=>w.user_id===uid&&!!document.querySelector('#mywant [data-wid="'+w.id+'"]');
function wantDayHtml(w){
  const jn=(joins[w.id]||[]).length;
  return '<div class="want wmine'+(isTest(w)?' test':'')+'" data-wid="'+esc(w.id)+'"><div class="wmn"><span class="wmt">'+uiIcon("hand")+'<b>Twoje · '+esc(wTime(w))+'</b></span>'
   +'<span class="wms">'+(jn?'dołączyło: '+jn:'nikt jeszcze nie dołączył')+(isTest(w)?' · test':'')+'</span></div>'
   +'<button type="button" class="lnk wmup" data-wmup="'+esc(w.id)+'" aria-label="Pokaż wyżej">Wyżej ↑</button></div>';
}
// 🕖 po ustaleniu godziny: osoba, która wybierała z zakresu, widzi swój wybór i ustaloną godzinę (prośba właściciela 2026-11-20 19:17)
function myPickHtml(w,myp,joined,mine){
  if(mine||!joined||!myp||!w.settled_at)return "";
  const a=hhmm(new Date(myp)),b=hhmm(new Date(w.starts_at));
  return '<div class="meta">🕖 Twój wybór: <b>'+esc(a)+'</b>'+(a===b?' · ustalono na tę godzinę':' · ustalono <b>'+esc(b)+'</b>')+'</div>';
}
function wantHtml(w){
    const j=joins[w.id]||[],mine=w.user_id===uid,joined=j.includes(uid),others=j.filter(x=>x!==w.user_id);
    const priv=isPriv(w),canInv=priv&&!mine&&wantCanInvite(w);
    // admin widzi cudze prywatne zaproszenie tylko podglądowo (bez „Jadę!”), chyba że jest zaproszony
    const peek=priv&&!mine&&!wInvMe(w)&&!joined;
    const open=isOpen(w)&&!wLive(w),myp=(prefs[w.id]||{})[uid],dec=(decls[w.id]||[]).includes(uid),live=wLive(w);
    return '<div class="want'+(mine?' mine':'')+(isTest(w)?' test':'')+grCls(w)+'" data-wid="'+esc(w.id)+'">'+(peek?testTag(w):'<div class="wlab'+(mine?' me':priv?'':' all')+'">'+(mine?'🙋 TY ZAPRASZASZ':priv?'📩 ZAPRASZA CIĘ':'🌍 ZAPRASZA WSZYSTKICH')+'</div>'+testTag(w))+(live?'<div class="wlivet">'+trwaTag()+'</div>':'')+wTitleHtml(w)+'<div class="wtop">'+nk(w.user_id)+(wGr(w)&&typeof grRoleTag==="function"?grRoleTag(w):'')+'<span>🕖 <b>'+esc(wTime(w))+'</b></span>'+(open?'<span class="wopen">godzina do ustalenia</span>':fromRange(w)?'<span class="lockt">✅ ustalona</span>':'')+(priv?(wGr(w)?grTagHtml(w)+(peek?'<span class="lockt">👁 podgląd admina</span>':''):'<span class="lockt">🔒 prywatne'+(peek?' · 👁 podgląd admina':'')+'</span>'):'')+(mine?'<span class="note">(Twoje zaproszenie)</span>':'')+'</div>'
     +(live?liveHtml(w):'')
     +paceHtml(w)+bikeHtml(w)+(live?'':durLineHtml(w))+placeHtml(w)+(w.note?'<div class="wnt">💬 '+esc(w.note)+'</div>':'')+(live?'':wxHtml(w))+routeBoxHtml(w)
     +invitedHtml(w)
     +(open?tallyHtml(w):joinedHtml(w.id,others,mine?'Na razie nikt się nie dołączył.':'Na razie nikt więcej.')+declHtml(w)+(live?'':myPickHtml(w,myp,joined,mine)))
     +(wLate(w)&&!mine&&!peek&&!joined?lateNote():'')
     +'<div class="acts">'
     +(mine?(live?'':(open?'<button class="b join" data-my="settle" data-id="'+esc(w.id)+'" title="Ustal godzinę">✅ Ustal '+esc(hhmm(new Date(wBest(w))))+'</button>':'<button class="b g join" data-my="edit" data-id="'+esc(w.id)+'">✏️ Edytuj</button>')
        +(priv?'<button class="ib" data-my="inv" data-id="'+esc(w.id)+'" title="Zaproś kogoś jeszcze" aria-label="Zaproś kogoś jeszcze">'+ICON.addp+'</button>':'')
        +'<button class="ib" data-my="share" data-id="'+esc(w.id)+'" title="Udostępnij" aria-label="Udostępnij">'+ICON.share+'</button>'):live&&!wLate(w)&&!joined?'<span class="note" style="flex:1">🚴 Jazda trwa — dołączyć już nie można.</span>':peek?'<span class="note" style="flex:1">Nie jesteś zaproszony — możesz tylko podejrzeć lub usunąć.</span>'
       :open?'<button class="b join'+(joined?' g':'')+'" data-w="pref" data-id="'+esc(w.id)+'">'+(joined&&myp?'✓ '+esc(hhmm(new Date(myp)))+' · zmień':dec?'Jednak mogę? Wybierz godzinę':'Pasuje mi o…')+'</button>'
       :'<button class="b join'+(joined?' g':'')+'" data-w="join" data-id="'+esc(w.id)+'">'+(joined?'Rezygnuję':dec?'Jednak jadę!':'Jadę!')+'</button>')
     +(canInv&&!live?'<button class="ib" data-w="inv" data-id="'+esc(w.id)+'" title="Zaproś kogoś jeszcze" aria-label="Zaproś kogoś jeszcze">'+ICON.addp+'</button>':'')
     +((mine||isAdmin)?'<button class="ib del'+(mine?'':' adm')+'" data-w="del" data-id="'+esc(w.id)+'" title="'+(mine?'Odwołaj zaproszenie':'Usuń (admin)')+'" aria-label="'+(mine?'Odwołaj zaproszenie':'Usuń (admin)')+'">'+ICON.del+'</button>':'')
     +'</div>'
     +'</div>';
}
/* ---------- formularz zaproszenia: dzień + zegar klapkowy + notatka ---------- */
const wf={day:"0",h:19,m:0,h2:21,m2:0,mode:"one",editId:null,vis:"all",pick:new Set()};
const WX_LAT=52.23,WX_LON=21.01; // pogoda dla Warszawy (środek mapy)
function wfDate(){
  let d;
  if(wf.day==="x"){
    if(!$("wdt").value)return null;
    const [y,mo,da]=$("wdt").value.split("-").map(Number);d=new Date(y,mo-1,da,wf.h,wf.m);
  }else{d=new Date();d.setDate(d.getDate()+(+wf.day));d.setHours(wf.h,wf.m,0,0)}
  return d;
}
function wfLabel(d){return relDay(d)+" "+hhmm(d)}
// koniec zakresu (ten sam dzień co początek)
function wfDate2(){const d=wfDate();if(!d)return null;const e=new Date(d);e.setHours(wf.h2,wf.m2,0,0);if(e<=d)e.setDate(e.getDate()+1);return e}   // „do” wcześniejsze niż „od” = następnego dnia (np. 22:30–01:30)
const wfRange=()=>rangeOk&&wf.mode==="range";
function wfSetMode(m){
  wf.mode=m;const r=m==="range";
  [...$("wmode").children].forEach(b=>b.classList.toggle("on",b.dataset.mode===m));
  ["flbl1","flbl2","fclock2"].forEach(id=>$(id).classList.toggle("hide",!r));
  $("fclock").classList.toggle("sm",r);
  wfEndFix();
  wfUpdate();
}
// „do” pilnuje tylko różnicy względem „od”: min. 2 h, maks. 12 h; „do” wcześniejsze niż „od” = następnego dnia (22:30–01:30); wymuszone „do” = „od” + 2 h
const WF_MIN=120,WF_MAX=720;
const wfGap=()=>(((wf.h2*60+wf.m2)-(wf.h*60+wf.m))%1440+1440)%1440;   // minuty od „od” do „do” (0 = ten sam zegar)
function wfEndFix(){
  const s=wf.h*60+wf.m,g=wfGap();
  if(g<WF_MIN){const t=(s+WF_MIN)%1440;wfSetTime2(Math.floor(t/60),t%60)}
  else if(g>WF_MAX){const t=(s+WF_MAX)%1440;wfSetTime2(Math.floor(t/60),t%60)}
}
// skróty godzin: nieaktywne, gdy godzina już minęła (dla zakresu — gdy start za wcześnie)
function wfQuickSync(){
  const b=wfDate(),lim=Date.now()+(wfRange()?65:5)*60000;
  [...$("wquick").children].forEach(x=>{const [h,m]=x.dataset.q.split(":").map(Number);let dis=false;if(b){const t=new Date(b);t.setHours(h,m,0,0);dis=t.getTime()<lim}x.disabled=dis});
}
function wfSetTime2(hh,mm){
  wf.h2=((hh%24)+24)%24;wf.m2=mm;
  flipCard($("fch2"),pad(wf.h2));flipCard($("fcm2"),pad(wf.m2));
  wfUpdate();
}
function flipCard(el,txt){
  if(el.textContent===txt)return;
  el.textContent=txt;el.classList.remove("flipping");void el.offsetWidth;el.classList.add("flipping");
}
function wfSetDay(day,keep){
  wf.day=day;
  [...$("wdays").children].forEach(b=>b.classList.toggle("on",b.dataset.d===day));
  $("wdwrap").classList.toggle("hide",day!=="x");
  if(day==="x"&&!$("wdt").value&&!keep){const t=new Date();t.setDate(t.getDate()+3);$("wdt").value=localIso(t).slice(0,10)}
}
function wfApplyAt(d){
  const a=wfDate(),b=wfRange()?wfDate2():null,len=a&&b?b-a:2*36e5,n=dayDiff(d);
  if(n>=0&&n<=1)wfSetDay(String(n));else{$("wdt").value=localIso(d).slice(0,10);wfSetDay("x",true)}
  wf.h=d.getHours();wf.m=d.getMinutes();$("fch").textContent=pad(wf.h);$("fcm").textContent=pad(wf.m);
  const e=new Date(d.getTime()+Math.max(len,15*6e4));wf.h2=e.getHours();wf.m2=e.getMinutes();$("fch2").textContent=pad(wf.h2);$("fcm2").textContent=pad(wf.m2);
  wfEndFix();
  wfUpdate();
}
function wfSetTime(hh,mm){
  wf.h=((hh%24)+24)%24;wf.m=mm;
  flipCard($("fch"),pad(wf.h));flipCard($("fcm"),pad(wf.m));
  wfEndFix();
  wfUpdate();
}
function wfStep(unit,dir){
  const two=unit.endsWith("2");
  // 🌙 godzina startu przez północ → następny / poprzedni dzień (nie wcześniej niż dziś), jak w pogodzie
  if(!two){const d=wfDate();if(d){const n=new Date(d);
    if(unit[0]==="h")n.setHours(n.getHours()+dir);else{const m=dir>0?(Math.floor(wf.m/15)+1)*15:(Math.ceil(wf.m/15)-1)*15;n.setMinutes(m)}
    if(localIso(n).slice(0,10)!==localIso(d).slice(0,10)&&dayDiff(n)>=0){wfApplyAt(n);flipCard($("fch"),pad(wf.h));flipCard($("fcm"),pad(wf.m));try{navigator.vibrate&&navigator.vibrate(8)}catch(x){}return}}}
  let hh=two?wf.h2:wf.h,mm=two?wf.m2:wf.m;
  if(unit[0]==="h")hh+=dir;
  else{
    mm=dir>0?(Math.floor(mm/15)+1)*15:(Math.ceil(mm/15)-1)*15;
    if(mm>=60){mm=0;hh++}else if(mm<0){mm=45;hh--}
  }
  if(two){   // „do” nie bliżej niż 2 h od „od” i nie dalej niż 12 h (może wypaść po północy); na granicy zakres przesuwa się razem z „od”
    const s=wf.h*60+wf.m,g=((hh*60+mm-s)%1440+1440)%1440;
    if((dir<0&&g<WF_MIN)||(dir>0&&g>WF_MAX)){
      const de=wfDate2(),ne=de?new Date(de):null;
      if(ne){ne.setHours(hh,mm,0,0);const ns=new Date(ne.getTime()-(dir>0?WF_MAX:WF_MIN)*6e4);
        if(ns.getTime()>=Date.now()){wfApplyAt(ns);wfSetTime2(ne.getHours(),ne.getMinutes());flipCard($("fch"),pad(wf.h));flipCard($("fcm"),pad(wf.m));try{navigator.vibrate&&navigator.vibrate(8)}catch(x){}}
        else say("Zakres nie może zacząć się w przeszłości.")}
      return}
    if(g<WF_MIN||g>WF_MAX)return;
  }
  two?wfSetTime2(hh,mm):wfSetTime(hh,mm);
}
function wfTestSync(){try{wfRbSync()}catch(e){}
  [...$("wtest").children].forEach(b=>b.classList.toggle("on",(b.dataset.test==="1")===wf.test));
  $("wtestnote").textContent=wf.test?"🧪 Na próbę — będzie przygaszone, z czerwoną migającą plakietką TEST; na kanale Telegram z oznaczeniem „TESTOWE”. Testowe zostaną kiedyś usunięte.":"🚴 Prawdziwa jazda — zaproszenie zobaczą wszyscy bez plakietki TEST.";
}
let wxTimer=null;
function wfUpdate(){
  wfTitleHint();
  try{wfQuickSync()}catch(e){}
  try{const nx=wfRange()&&wf.h2*60+wf.m2<=wf.h*60+wf.m;$("flbl2").textContent=nx?"DO · NASTĘPNEGO DNIA":"DO"}catch(e){}
  const d=wfDate(),btn=$("wsave");
  const tst=!wf.editId&&testOk&&wf.test;
  btn.classList.toggle("tbtn",tst);
  btn.textContent=(wf.editId?"Zapisz zmianę":(tst?"🧪 ":"")+(wfPriv()?"🔒 Wyślij":tst?"Wyślij testowe":"Wyślij zaproszenie"))+(d?" · "+wfLabel(d)+(wfRange()?"–"+pad(wf.h2)+":"+pad(wf.m2):""):"");
  clearTimeout(wxTimer);
  const box=$("wwx");
  try{wfDurSync()}catch(e){}
  if(!d){box.classList.add("hide");return}
  wxTimer=setTimeout(async()=>{
    try{
      const w=await getWind(WX_LAT,WX_LON,d);
      if(wfDate()&&wfDate().getTime()!==d.getTime())return;
      box.textContent="🌬 "+wfLabel(d)+": wiatr "+Math.round(w.speed)+" km/h z "+NAMES[Math.round(w.dir/45)%8]+(w.temp!=null?" · "+Math.round(w.temp)+"°C":"");
      box.classList.remove("hide");
    }catch(e){
      if(e.code==="range"){box.textContent="🌬 "+e.message;box.classList.remove("hide")}else box.classList.add("hide");
    }
  },350);
}
// notatka: lista gotowych + „Własna…” (pole tekstowe)
function wfNoteSync(){
  const v=$("wnote").value.trim(),s=$("wnotesel");
  const preset=[...s.options].some(o=>o.value!=="*"&&o.value===v);
  s.value=preset?v:"*";
  $("wnote").classList.toggle("hide",preset);
}
function lastWant(){try{return JSON.parse(localStorage.getItem("lastWant")||"null")}catch(e){return null}}
function openWantForm(w,preset){
  if(!session){say("Najpierw zaloguj się.");return}
  if(needProfile()){askNick();return}
  wf.editId=w?w.id:null;
  wf.sigFor=!w&&preset&&preset.sig||null;   // 🟡 zaproszenie z „Mam ochotę” — ta osoba zostanie zaproszona
  wf.vis="all";wf.pick=new Set();wf.gr="";   // 👥 wf.gr: grupa zaproszenia (KROK 71)
  wf.test=!DEMO;$("wtestwrap").classList.toggle("hide",!!w||!testOk||DEMO);wfTestSync();   // 🎮 w demo bez przełącznika „testowe”
  wf.route=null;wf.routeName="";wf.routeHad=hasRoute(w);wf.routeTouched=false;$("wrfile").value="";
  wf.rbId=w&&w.route_base_id||null;wf.rbAdd=null;wf.rbName="";
  $("wroutewrap").classList.toggle("hide",!wRouteOk);
  if(w&&hasRoute(w)){getWantRoute(w.id).then(p=>{if(wf.editId===w.id&&!wf.routeTouched){wf.route=p||null;wfRouteSync()}}).catch(()=>{})}
  wf.pace=w&&w.pace||null;wf.bike=w&&w.bike||null;wbikeRender();$("wbikewrap").classList.toggle("hide",!bikeOk);wf.pcity=w&&w.place_city||null;wf.parea=w&&w.place_area||null;wf.km=w&&w.km!=null?+w.km:null;wf.dur=w&&w.dur_min||null;wf.kmOwn=false;wf.durOwn=false;wf.place=w&&w.place||null;wf.plat=w&&w.place_lat!=null?+w.place_lat:null;wf.plon=w&&w.place_lon!=null?+w.place_lon:null;wf.placeOwn=false;wf.placeMap=false;wf.placeAdd=false;wfPlaceSync();$("wpacewrap").classList.toggle("hide",!paceOk);wfPaceSync();
  wfRouteSync();
  if(preset&&preset.pick){wf.vis="pick";wf.pick=new Set(preset.pick)}
  // z „Mam ochotę”: domyślnie TYLKO ta osoba (prywatne zaproszenie); „Kto zobaczy?” pozwala dopisać kogoś jeszcze albo otworzyć dla wszystkich
  if(wf.sigFor&&wf.sigFor!==uid&&visOk&&!(preset&&preset.pick)){wf.vis="pick";wf.pick=new Set([wf.sigFor])}
  // edycja: „Kto zobaczy?” startuje z obecnego stanu (prywatne → wybrane osoby = obecni zaproszeni)
  if(w&&isPriv(w)){wf.vis="pick";wf.pick=new Set((invs[w.id]||[]).map(x=>x.u));wf.gr=wGr(w)}
  $("wwhowrap").classList.toggle("hide",!visOk);
  renderWhoBtn();
  $("wftitle").textContent="Planowany start";
  let d;
  if(w)d=new Date(w.starts_at);
  else{
    // domyślnie: dziś, najbliższy pełny kwadrans od teraz (18:04 → 18:15); „↺ Jak ostatnio” ustawia godzinę z poprzedniego zaproszenia
    d=new Date();d.setSeconds(0,0);d.setMinutes(Math.ceil((d.getMinutes()+1)/15)*15);
    // z „Przed jazdą” w bazie tras: dzień i godzina sprawdzone przy pogodzie (jeśli jeszcze nie minęły)
    if(preset&&preset.at&&preset.at.getTime()>Date.now())d=new Date(preset.at);
    // z „Mam ochotę”: zakres zaczyna się najwcześniej za ok. 1,5 h — wcześniejszy zakres ustala się sam (bez „Pasuje mi o…”)
    if(wf.sigFor&&!(preset&&preset.at)){d=new Date(Date.now()+90*60000);d.setSeconds(0,0);d.setMinutes(Math.ceil(d.getMinutes()/15)*15)}
  }
  const n=dayDiff(d);
  if(n>=0&&n<=1)wfSetDay(String(n));else{$("wdt").value=localIso(d).slice(0,10);wfSetDay("x",true)}
  $("fch").textContent=pad(d.getHours());$("fcm").textContent=pad(d.getMinutes());
  wf.h=d.getHours();wf.m=d.getMinutes();
  // zakres godzin: przy edycji otwartego zakresu — jego koniec; inaczej domyślnie +2 h
  const rangeEdit=!!w&&isOpen(w),e=rangeEdit?new Date(w.range_to):new Date(d.getTime()+2*36e5);
  if(rangeEdit){const f=new Date(w.range_from);$("fch").textContent=pad(f.getHours());$("fcm").textContent=pad(f.getMinutes());wf.h=f.getHours();wf.m=f.getMinutes()}
  wf.h2=e.getHours();wf.m2=e.getMinutes();$("fch2").textContent=pad(wf.h2);$("fcm2").textContent=pad(wf.m2);
  $("wmode").classList.toggle("hide",!rangeOk||(!!w&&fromRange(w)));
  wfSetMode(rangeEdit||(wf.sigFor&&rangeOk)?"range":"one");
  $("wnote").value=w?(w.note||""):"";wfNoteSync();wf.noAuto=!!w&&!w.title&&!w.title_auto;   // starsze zaproszenie bez tytułu — bez domyślnego (decyzja: tylko nowe)
  wf.titleAuto=!wf.noAuto&&(!w||!!w.title_auto);$("wtitle").value=w&&!wf.titleAuto?(w.title||""):"";wfTitleHint();$("wtitlewrap").classList.toggle("hide",!titleOk);
  const L=lastWant();
  $("wlast").classList.toggle("hide",!L||!!w);
  if(L)$("wlast").textContent="↺ Jak ostatnio: "+pad(L.h)+":"+pad(L.m)+(L.note?" · "+L.note:"");
  $("wfhtitle").textContent=w?"✏️ Edytuj zaproszenie":"🚲 Zaproś na rower";
  $("wfask").classList.add("hide");
  $("wantform").classList.remove("hide");document.body.classList.add("wfopen");
  $("wfscroll").scrollTop=0;
  wfUpdate();
  wf.snap0=wfSnap();
}
/* 🗺️ trasa w zaproszeniu (KROK 23) */
let wRouteOk=false;const wRouteCache={};
const hasRoute=w=>!!w&&w.route_km!=null;
const WANT_PACE=19; // km/h — szacunek czasu bez wybranego tempa (właściciel: 18–20 km/h)
// ⏱ tempo zaproszenia (KROK 28): brak = dowolne
const PACES={senior:{e:"🐢",n:"Senior Adventure",r:"15–18 km/h",d:"spokojnie, z przerwami",v:16.5},tour:{e:"🚴",n:"Turystycznie",r:"18–24 km/h",d:"równo, bez ścigania",v:21},speed:{e:"⚡",n:"SPEEDAY",r:"26+ km/h",d:"szybko, dla wyjeżdżonych",v:27}};
let paceOk=false;
// własne tempo (tekst): średnia z liczb w tekście, np. „20–22 km/h” → 21
const wPaceKmh=p=>{if(PACES[p])return PACES[p].v;const n=String(p||"").match(/\d+(?:[.,]\d+)?/g);if(!n)return WANT_PACE;const v=n.map(x=>+x.replace(",",".")).filter(x=>x>=5&&x<=60);return v.length?v.reduce((a,b)=>a+b,0)/v.length:WANT_PACE};
// ⏱ czas jazdy (KROK 29): trasa/dystans ÷ prędkość tempa (bez tempa 19 km/h), inaczej „na ile jedziesz” (domyślnie 2 h)
let distOk=false;const DUR_DEF=120,RIDE_GAP=15;
// stan jazdy: trwa (od startu do końca czasu jazdy) / zakończona (→ archiwum)
// kafelek daty; w trakcie jazdy (.live) zamienia się w logo z kręcącymi się kołami + „TRWA”
let wdayWs={};
const FT_LIVE='<svg class="ftlogo" viewBox="0 0 120 120" aria-hidden="true"><g class="bw1"><circle cx="44" cy="62" r="25" fill="none" stroke="#fff" stroke-width="9" stroke-dasharray="118 39"/></g><g class="bw2"><circle cx="76" cy="62" r="25" fill="none" stroke="#fbbf24" stroke-width="9" stroke-dasharray="118 39"/></g><circle cx="44" cy="62" r="4" fill="#fff"/><circle cx="76" cy="62" r="4" fill="#fbbf24"/></svg><div class="ftrwa">TRWA<i></i><i></i><i></i></div>';
// zwinięty dzień: kolorowe chipy — pogoda, tempa i rowery z zaproszeń tego dnia (po rozwinięciu ukryte w CSS)
function wl4Html(ws){
  const pc=[...new Set(ws.map(w=>w.pace).filter(p=>p&&PACES[p]))].map(p=>'<span class="wpc wpc-'+p+'">'+PACES[p].e+' '+esc(PACES[p].n)+'</span>');
  const bk=[...new Set(ws.map(w=>w.bike).filter(b=>b&&BIKES[b]))].map(b=>'<span class="wpc wbk">'+BIKES[b]+'</span>');
  const wx=dWxHtml(ws);if(!wx&&!pc.length&&!bk.length)return '';
  return '<div class="wl4">'+wx+pc.join("")+bk.join("")+'</div>';
}
function ftInner(dt){return '<div class="fu">'+pad(dt.getDate())+'</div><div class="ft">'+pad(dt.getDate())+'</div><div class="fb">'+MON3[dt.getMonth()]+'</div><div class="fs"></div><div class="fh"></div><div class="fh2"></div>'+FT_LIVE}
// co minutę: start/koniec jazdy przełącza kafelek bez przeładowania listy
function ftLiveSync(){document.querySelectorAll("details.wday[data-day]").forEach(el=>{const ws=wdayWs[el.dataset.day];const t=el.querySelector(".ftile");if(ws&&t&&t.classList.contains("live")!==ws.some(wLive))renderWants()})}
const wLive=w=>{const n=Date.now();return wantStart(w).getTime()<=n&&wantEnd(w).getTime()>n};
// spóźnialscy: przez 15 min po starcie zwykłej jazdy można jeszcze dołączyć (baza tego nie blokuje) — krótki komunikat zamiast „Jazda trwa”
const wLate=w=>!isOpen(w)&&wLive(w)&&Date.now()<new Date(w.starts_at).getTime()+15*60000;
const lateNote=()=>'<div class="note latenote">🏃 Jazda już ruszyła — możesz jeszcze dogonić!</div>';
const wDone=w=>wantEnd(w).getTime()<=Date.now();
const trwaTag=()=>'<span class="trwa">🚴 TRWA<span class="tdots" aria-hidden="true"><i></i><i></i><i></i></span></span>';
function liveHtml(w){
  const s=wantStart(w).getTime(),e=wantEnd(w).getTime(),n=Date.now(),pc=Math.max(3,Math.min(100,Math.round((n-s)/(e-s)*100)));
  return '<div class="lbar"><i style="width:'+pc+'%"></i></div><div class="note lrem">do ok. '+esc(hhmm(new Date(e)))+' · jeszcze ok. '+esc(durTxt((e-n)/60000))+'</div>';
}
const kmOf=w=>w?(w.route_km!=null?+w.route_km:w.km!=null?+w.km:null):null;
const wantDur=w=>{const k=kmOf(w);return k?Math.round(k/wPaceKmh(w.pace)*60):(w&&w.dur_min)||DUR_DEF};
const wantStart=w=>new Date(isOpen(w)?w.range_from:w.starts_at);
const wantEnd=w=>new Date(new Date(isOpen(w)?w.range_to:w.starts_at).getTime()+wantDur(w)*60000);
const hasDurInfo=w=>!!w&&(kmOf(w)!=null||!!w.dur_min);
function durLineHtml(w){
  if(!distOk||!hasDurInfo(w))return "";
  const k=kmOf(w),open=isOpen(w);
  return '<div class="wdur">'+(k!=null&&!hasRoute(w)?'📏 '+kmTxt(k).replace(",0","")+' km · ':'')+'⏱ '+(open?'jazda ok. '+durTxt(wantDur(w)):'ok. '+hhmm(wantStart(w))+'–'+hhmm(wantEnd(w)))+'</div>';
}
const paceTxt=p=>PACES[p]?PACES[p].e+' '+PACES[p].n+' · '+PACES[p].r:'⏱ '+p;
const BIKES={road:"🛣 Szosa",gravel:"🪨 Gravel",mtb:"⛰ MTB",trekking:"🌳 Trekking"};
const bikeHtml=w=>w&&w.bike&&BIKES[w.bike]?'<div class="wpcw"><span class="wpc wbk">'+BIKES[w.bike]+'</span></div>':'';
const paceHtml=w=>w&&w.pace?'<div class="wpcw"><span class="wpc wpc-'+(PACES[w.pace]?w.pace:'own')+'">'+esc(paceTxt(w.pace))+'</span></div>':'';
function wfPaceSync(){
  const p=wf.pace||"",s=$("wpacesel"),own=!!p&&!PACES[p];
  s.value=own?"*":p;$("wpaceown").classList.toggle("hide",!own);if(own)$("wpaceown").value=p;
}
// formularz: czas jazdy tego zaproszenia (min)
function wfKm(){return wf.route?routeKm(wf.route):wf.km||null}
function wfDurMin(){const k=wfKm();return k?Math.round(k/wPaceKmh(wf.pace)*60):wf.dur||DUR_DEF}
function wfDurSync(){
  if(!distOk){["wdistwrap","wdurwrap","wdurinfo","wfclash"].forEach(x=>$(x).classList.add("hide"));return}
  const R=!!wf.route;$("wdistwrap").classList.toggle("hide",R);$("wdurwrap").classList.toggle("hide",R||!!wf.km);
  const ks=$("wkmsel"),kp=wf.km&&[...ks.options].some(o=>o.value===String(wf.km));
  if(wf.km&&!kp)wf.kmOwn=true;
  ks.value=wf.kmOwn?"*":wf.km?String(wf.km):"";$("wkmown").classList.toggle("hide",!wf.kmOwn);
  if(wf.kmOwn&&wf.km&&document.activeElement!==$("wkmown"))$("wkmown").value=String(wf.km).replace(".",",");
  const ds=$("wdursel"),dp=[...ds.options].some(o=>o.value===String(wf.dur||DUR_DEF));
  if(!dp)wf.durOwn=true;
  ds.value=wf.durOwn?"*":String(wf.dur||DUR_DEF);$("wdurown").classList.toggle("hide",!wf.durOwn);
  if(wf.durOwn&&wf.dur&&document.activeElement!==$("wdurown"))$("wdurown").value=durOwnTxt(wf.dur);
  const d=wfDate(),i=$("wdurinfo"),k=wfKm(),m=wfDurMin();
  if(!d){i.classList.add("hide");$("wfclash").classList.add("hide");return}
  const st=d,en=new Date((wfRange()?wfDate2():d).getTime()+m*60000);
  // godzina już minęła (np. „Dziś 00:00” po przewinięciu zegara przez północ)
  if(st.getTime()<Date.now()-5*60000){
    const tom=wf.day==="0";
    i.innerHTML='<div class="wclash" style="margin:0">⚠️ '+esc(wfLabel(st))+' już minęła'+(tom?' — to był dzisiejszy ranek. Jazda po północy to „Jutro”.':'.')+'</div>'
      +(tom?'<button type="button" class="lnk wtom" style="font-weight:700;color:var(--acc);margin-top:4px">Ustaw jutro '+hhmm(st)+'</button>':'');
    i.classList.add("bad");i.classList.remove("hide");
    const fb=$("wfclash");fb.innerHTML='⚠️ '+esc(wfLabel(st))+' już minęła'+(tom?' · <button type="button" class="lnk wtom">Ustaw jutro '+hhmm(st)+'</button>':'');fb.classList.remove("hide");
    wf.jump=null;return}
  const nd=localIso(en).slice(0,10)!==localIso(st).slice(0,10)?' <span class="note">(nast. dnia)</span>':'';
  i.innerHTML='⏱ '+(wfRange()?'Jazda ok. '+durTxt(m)+' → koniec najpóźniej ok. '+hhmm(en)+nd:'Jazda ok. '+hhmm(st)+'–'+hhmm(en)+nd+' ('+durTxt(m)+')')
    +(k?' <span class="note">· '+kmTxt(k).replace(",0","")+' km przy '+String(Math.round(wPaceKmh(wf.pace)*10)/10).replace(".",",")+' km/h</span>':'');
  // od razu: czy nachodzi na inną Twoją jazdę (+15 min zapasu)
  const cl=wfClash(st,en);wf.jump=null;
  if(cl){const cs=wantStart(cl),ce=wantEnd(cl);
    if(cs<=st){const nx=ceil5(ce.getTime()+RIDE_GAP*60000);
      wf.jump=localIso(nx).slice(0,10)===localIso(st).slice(0,10)?nx:null;
      i.innerHTML+='<div class="wclash">⚠️ Nachodzi na Twoją jazdę '+esc(relDay(cs).toLowerCase())+' '+hhmm(cs)+'–'+hhmm(ce)+'. Najwcześniej o <b>'+hhmm(nx)+'</b>.'+(wf.jump?' <button type="button" class="lnk wjump">Ustaw '+hhmm(nx)+'</button>':'')+'</div>'}
    else i.innerHTML+='<div class="wclash">⚠️ '+esc(relDay(cs))+' o '+hhmm(cs)+' masz już jazdę — ta skończyłaby się ok. '+hhmm(en)+'. Wybierz wcześniejszą godzinę albo krótszą jazdę.</div>'}
  const jc=cl?null:wfJoinedClash(st,en);   // 🔁 zapisany na inną jazdę w tym czasie — przy wysyłaniu „Przenieś się” (jak przy „Jadę!”)
  if(jc){const cs=wantStart(jc),ce=wantEnd(jc);i.innerHTML+='<div class="wclash">🔁 Jedziesz już '+esc(relDay(cs).toLowerCase())+' '+hhmm(cs)+'–'+hhmm(ce)+' ('+esc(nickOf(jc.user_id))+') — przy wysyłaniu zapytam, czy się przenieść.</div>'}
  i.classList.toggle("bad",!!cl);
  const fb=$("wfclash");
  if(cl){const cs=wantStart(cl),ce=wantEnd(cl);
    fb.innerHTML='⚠️ Nachodzi na jazdę '+esc(relDay(cs).toLowerCase())+' '+hhmm(cs)+'–'+hhmm(ce)+(wf.jump?' · <button type="button" class="lnk wjump">Ustaw '+hhmm(wf.jump)+'</button>':cs>st?' · wybierz wcześniejszą godzinę':'');
    fb.classList.remove("hide")}else fb.classList.add("hide");
  i.classList.remove("hide");
}
// czy nowe zaproszenie nachodzi na jazdę innej osoby, na którą jestem zapisany (z zapasem 15 min)
function wfJoinedClash(st,en){
  const g=RIDE_GAP*60000;
  return wants.filter(w=>w.user_id!==uid&&w.id!==wf.editId&&!isOpen(w)&&wantEnd(w).getTime()>Date.now()&&(joins[w.id]||[]).includes(uid))
    .find(w=>st.getTime()<wantEnd(w).getTime()+g&&wantStart(w).getTime()<en.getTime()+g)||null;
}
// czy nowe zaproszenie nachodzi na inne moje (z zapasem 15 min)
function wfClash(st,en){
  const g=RIDE_GAP*60000;
  return wants.filter(w=>w.user_id===uid&&w.id!==wf.editId&&wantEnd(w).getTime()>Date.now())
    .find(w=>st.getTime()<wantEnd(w).getTime()+g&&wantStart(w).getTime()<en.getTime()+g);
}
// 🔁 „Jadę!” a inna Twoja jazda w tym czasie (+15 min zapasu, jak przy zakładaniu): prowadzisz → blokada; jesteś zapisany → „Przenieś się”
function joinClash(w){
  const g=RIDE_GAP*60000,s=wantStart(w).getTime(),e=wantEnd(w).getTime();
  return wants.filter(x=>x.id!==w.id&&!isOpen(x)&&wantEnd(x).getTime()>Date.now()&&(x.user_id===uid||(joins[x.id]||[]).includes(uid)))
    .find(x=>s<wantEnd(x).getTime()+g&&wantStart(x).getTime()<e+g)||null;
}
async function joinClashOk(w){
  if(isOpen(w))return true;
  const c=joinClash(w);if(!c)return true;
  if(c.user_id===uid){const cs=wantStart(c);say("Prowadzisz jazdę "+relDay(cs).toLowerCase()+" "+hhmm(cs)+"–"+hhmm(wantEnd(c))+" — najpierw ją usuń albo zmień godzinę.");return false}
  return leaveForClash(c,wantStart(w));
}
// „Przenieś się”: pytanie i wypisanie z jazdy c (wspólne dla „Jadę!” i zakładania zaproszenia)
async function leaveForClash(c,to){
  const cs=wantStart(c),when=relDay(cs).toLowerCase()+" "+hhmm(cs)+"–"+hhmm(wantEnd(c));
  if(!await askOk("Jedziesz już "+when+". Przenieść się na "+(dayDiff(to)===dayDiff(cs)?"":relDay(to).toLowerCase()+" ")+hhmm(to)+"?\n\nZrezygnujesz z tamtej jazdy ("+nickOf(c.user_id)+" dostanie powiadomienie).","Przenieś się"))return false;
  const r=await sb.from("want_joins").delete().eq("want_id",c.id).eq("user_id",uid);
  if(r.error){say("Nie udało się zrezygnować z tamtej jazdy: "+r.error.message);return false}
  joins[c.id]=(joins[c.id]||[]).filter(x=>x!==uid);return true;
}
const ceil5=t=>new Date(Math.ceil(t/300000)*300000);
const kmTxt=k=>Number(k).toFixed(1).replace(".",",");
function wfRouteSync(){
  const i=$("wrinfo"),R=wf.route;
  $("wrlbl").textContent=R?"🗺️ Zmień plik GPX":"🗺️ Dodaj plik GPX";
  const dl=$("wrdel");if(!dl.innerHTML)dl.innerHTML=ICON.del;dl.classList.toggle("hide",!R);
  i.innerHTML=R?'<span>✅ '+kmTxt(routeKm(R))+' km · ⏱ ≈ '+esc(durTxt(routeKm(R)/wPaceKmh(wf.pace)*60))+(wf.pace?' <span class="note">('+esc(PACES[wf.pace]?PACES[wf.pace].r:wf.pace)+')</span>':'')+(wf.rbId?' · 📚 '+esc(wf.routeName||'z bazy tras'):wf.routeName?' · '+esc(wf.routeName):'')+'</span>'
    :(wf.editId&&wf.routeHad?'<span class="note">Trasa zostanie usunięta po zapisaniu.</span>':'<span class="note">Inni zobaczą długość, mapę z wiatrem i pobiorą GPX.</span>');
  wfDurSync();try{wfRbSync()}catch(e){}
}
async function getWantRoute(id){
  if(id in wRouteCache)return wRouteCache[id];
  const r=await sb.from("wants").select("route").eq("id",id).single();
  if(r.error)throw r.error;
  const pts=r.data&&r.data.route?parseRoute(r.data.route):false;
  wRouteCache[id]=pts;return pts;
}
function closeWantForm(){$("wantform").classList.add("hide");$("wfask").classList.add("hide");document.body.classList.remove("wfopen");wf.editId=null}
// czy w formularzu coś zmieniono od otwarcia (wtedy ✕ / Anuluj pytają)
// 📍 punkt zbiórki (KROK 35): wspólna lista miejsc + własne + pinezka z mapy
let placeOk=false,bikeOk=false,places=[],wantsAll=[];
const mapUrl=(lat,lon,name)=>"https://www.google.com/maps/search/?api=1&query="+(lat!=null?lat+","+lon:encodeURIComponent(name||""));
function placeHtml(w){
  if(!w||!w.place)return "";
  const g=w.place_lat!=null;
  return '<div class="wplace">📍 <b>'+esc(w.place)+'</b>'+(w.place_city?' · '+esc(w.place_city+(w.place_area?' · '+w.place_area:'')):'')+(g?' · <a href="'+esc(mapUrl(w.place_lat,w.place_lon))+'" target="_blank" rel="noopener">Mapa ›</a>':'')+'</div>';
}
function wfPlaceSync(){
  if(!placeOk){$("wplacewrap").classList.add("hide");return}
  $("wplacewrap").classList.remove("hide");
  const s=$("wplacesel"),cur=wf.place||"",known=places.find(x=>x.name.toLowerCase()===cur.toLowerCase());
  s.innerHTML='<option value="">— bez punktu zbiórki —</option>'+places.map(x=>'<option value="p:'+esc(x.id)+'">'+esc(x.name)+(x.lat!=null?' · na mapie':'')+'</option>').join("")
    +'<option value="own">Inne miejsce… (wpisz)</option><option value="map">Wskaż na mapie…</option>';
  s.value=wf.placeOwn?"own":!cur?"":known&&!wf.placeMap?"p:"+known.id:"own";
  $("wplaceown").classList.toggle("hide",!(wf.placeOwn||(cur&&!known)));
  if(!$("wplaceown").classList.contains("hide")&&document.activeElement!==$("wplacename"))$("wplacename").value=cur;
  const sw=$("wpladd");sw.classList.toggle("on",!!wf.placeAdd);sw.setAttribute("aria-checked",!!wf.placeAdd);
  $("wpladd").closest(".wpladd").classList.toggle("hide",!!known);
  const inf=$("wplinfo");
  if(cur&&wf.plat!=null){inf.innerHTML='📌 Pinezka'+(wf.pcity?': '+esc(wf.pcity+(wf.parea?' · '+wf.parea:'')):': '+wf.plat.toFixed(4)+', '+wf.plon.toFixed(4))+' · <button type="button" class="lnk" id="wplmap">zmień na mapie</button> · <button type="button" class="lnk" id="wplnopin" style="color:var(--bad)">usuń pinezkę</button>';inf.classList.remove("hide")}
  else if(cur){inf.innerHTML='<button type="button" class="lnk" id="wplmap">📌 Dodaj pinezkę na mapie</button> <span class="note">— łatwiej trafić</span>';inf.classList.remove("hide")}
  else inf.classList.add("hide");
}
// mapa do wskazania miejsca (Leaflet / OpenStreetMap)
let pickMap=null,pickMk=null,pickCtx=null;
function openPlaceMap(ctx){
  pickCtx=ctx||null;const nm=ctx?ctx.name:wf.place,la=ctx?ctx.lat:wf.plat,lo=ctx?ctx.lon:wf.plon;
  const p=$("mapsheet");
  p.innerHTML='<div class="sheetbox popbox mapbox" role="dialog" aria-modal="true"><button class="sclose" data-mp="close" aria-label="Zamknij">✕</button>'
   +'<div class="ph" style="margin-top:0">📍 Wskaż punkt zbiórki</div><div class="note" style="text-align:center">Dotknij mapy albo przesuń pinezkę. Przybliżaj dwoma palcami.</div>'
   +'<div id="pickmap" class="pickmap"></div>'
   +'<input id="mapname" maxlength="40" placeholder="Nazwa miejsca, np. Pod ratuszem" value="'+esc(nm||"")+'"'+(ctx?' disabled':'')+'>'
   +'<div class="mpbtns"><button type="button" class="lnk" data-mp="me">📍 Moja lokalizacja</button></div>'
   +'<button type="button" class="b big" data-mp="ok">Gotowe</button></div>';
  p.classList.remove("hide");
  const c=la!=null?[+la,+lo]:(()=>{const k=places.find(x=>x.lat!=null);return k?[+k.lat,+k.lon]:[52.7031,21.0838]})();
  needL().then(()=>setTimeout(()=>{
    if(!$("pickmap"))return;
    try{pickMap=L.map("pickmap",{zoomControl:true}).setView(c,la!=null?17:15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(pickMap);
      pickMk=L.marker(c,{draggable:true}).addTo(pickMap);
      pickMap.on("click",e=>pickMk.setLatLng(e.latlng));
    }catch(e){$("pickmap").innerHTML='<div class="note" style="padding:20px">Nie udało się wczytać mapy (sprawdź internet).</div>'}
  },60));
}
function closePlaceMap(){const p=$("mapsheet");try{pickMap&&pickMap.remove()}catch(e){}pickMap=null;pickMk=null;p.classList.add("hide");p.innerHTML=""}
$("mapsheet").addEventListener("click",e=>{
  const b=e.target.closest("[data-mp]");
  if(e.target===$("mapsheet")||(b&&b.dataset.mp==="close")){const c=pickCtx;closePlaceMap();if(!c)wfPlaceSync();return}
  if(!b)return;
  if(b.dataset.mp==="me"){if(!navigator.geolocation){say("Telefon nie podaje lokalizacji.");return}
    navigator.geolocation.getCurrentPosition(x=>{const ll=[x.coords.latitude,x.coords.longitude];if(pickMap){pickMap.setView(ll,17);pickMk.setLatLng(ll)}},()=>say("Brak zgody na lokalizację — wskaż miejsce palcem."),{timeout:8000});return}
  if(b.dataset.mp==="ok"){
    const n=$("mapname").value.trim();if(n.length<2){say("Wpisz nazwę miejsca (min. 2 znaki).");$("mapname").focus();return}
    const ll=pickMk?pickMk.getLatLng():null;if(!ll){closePlaceMap();return}
    if(pickCtx&&pickCtx.onOk){const cb=pickCtx.onOk;closePlaceMap();cb(+ll.lat.toFixed(6),+ll.lng.toFixed(6));return}
    const known=places.find(x=>x.name.toLowerCase()===n.toLowerCase());
    wf.place=n;wf.plat=+ll.lat.toFixed(6);wf.plon=+ll.lng.toFixed(6);wf.placeOwn=!known;wf.placeMap=!!known;if(!known)wf.placeAdd=true;
    wf.pcity=known&&known.city||null;wf.parea=known&&known.area||null;
    closePlaceMap();wfPlaceSync();
    // miasto i dzielnica z pinezki (OpenStreetMap) — pod filtr „Gdzie”
    if(bikeOk){const la=wf.plat,lo=wf.plon;revGeo(la,lo).then(g=>{if(wf.plat===la&&wf.plon===lo&&g.city){wf.pcity=g.city;wf.parea=g.area||null;wfPlaceSync()}})}
  }
});
async function savePlaceToList(){
  if(!placeOk||!wf.placeAdd||!wf.place)return;
  if(places.some(x=>x.name.toLowerCase()===wf.place.toLowerCase()))return;
  try{const row={name:wf.place,lat:wf.plat,lon:wf.plon};if(bikeOk&&wf.pcity){row.city=wf.pcity;row.area=wf.parea||null}const r=await sb.from("places").insert(row).select(bikeOk?"id,name,lat,lon,created_by,city,area":"id,name,lat,lon,created_by").single();if(!r.error&&r.data)places.push(r.data)}catch(e){}
}
function wfSnap(){return JSON.stringify([wf.day,$("wdt").value,wf.mode,wf.h,wf.m,wf.h2,wf.m2,wf.vis,[...wf.pick].sort(),wf.gr,wf.test,wf.pace,wf.bike,wf.km,wf.dur,wf.place,wf.plat,(wf.titleAuto?"":$("wtitle").value.trim()),$("wnote").value.trim(),!!wf.route,wf.routeTouched])}
function wfTryClose(){
  if($("wantform").classList.contains("hide"))return;
  if(wf.snap0&&wfSnap()!==wf.snap0){
    $("wfasktxt").textContent="Ustawienia ("+(wfDate()?wfLabel(wfDate()):"")+") nie zostaną zapisane.";
    $("wfask").classList.remove("hide");return;
  }
  closeWantForm();
}
$("wfx").onclick=wfTryClose;
$("wpacesel").addEventListener("change",()=>{const v=$("wpacesel").value;
  if(v==="*"){wf.pace=null;$("wpaceown").value="";$("wpaceown").classList.remove("hide");$("wpaceown").focus()}
  else{wf.pace=v||null;$("wpaceown").classList.add("hide")}
  wfRouteSync()});
const WBIKE=[["","bike","Każdy"],["road","road","Szosa"],["gravel","gravel","Gravel"],["mtb","mtb","MTB"],["trekking","tree","Trekking"]];
function wbikeRender(){const el=$("wbikesel");if(!el)return;el.innerHTML=WBIKE.map(([v,k,t])=>'<button type="button" class="wbk'+((wf.bike||"")===v?' on':'')+'" data-wbk="'+v+'" aria-pressed="'+((wf.bike||"")===v)+'">'+uiIcon(k)+'<span>'+t+'</span></button>').join("")}
$("wbikesel").addEventListener("click",e=>{const b=e.target.closest("[data-wbk]");if(!b)return;wf.bike=b.dataset.wbk||null;wbikeRender();wfTitleHint()});
$("wpaceown").addEventListener("input",()=>{wf.pace=$("wpaceown").value.trim().slice(0,30)||null;wfRouteSync()});
const wfJump=e=>{
  if(e.target.closest(".wtom")){wfSetDay("1");wfUpdate();try{navigator.vibrate&&navigator.vibrate(8)}catch(x){}return}
  if(!e.target.closest(".wjump")||!wf.jump)return;
  const j=wf.jump,len=wfRange()?wfGap():0;wfSetTime(j.getHours(),j.getMinutes());
  if(len>0){const e2=new Date(j.getTime()+len*60000);wfSetTime2(e2.getHours(),e2.getMinutes())}
  wfUpdate();try{navigator.vibrate&&navigator.vibrate(8)}catch(x){}};
$("wdurinfo").addEventListener("click",wfJump);$("wfclash").addEventListener("click",wfJump);
$("wplacesel").addEventListener("change",()=>{const v=$("wplacesel").value;
  if(v==="map"){openPlaceMap();return}
  if(v==="own"){wf.placeOwn=true;wf.placeMap=false;wf.place="";wf.plat=wf.plon=null;wf.pcity=wf.parea=null;wf.placeAdd=false;wfPlaceSync();$("wplacename").value="";$("wplacename").focus();return}
  wf.placeOwn=false;wf.placeMap=false;wf.placeAdd=false;
  if(!v){wf.place=null;wf.plat=wf.plon=null;wf.pcity=wf.parea=null}else{const x=places.find(y=>"p:"+y.id===v);wf.place=x?x.name:null;wf.plat=x&&x.lat!=null?+x.lat:null;wf.plon=x&&x.lon!=null?+x.lon:null;wf.pcity=x&&x.city||null;wf.parea=x&&x.area||null}
  wfPlaceSync()});
$("wplacename").addEventListener("input",()=>{wf.place=$("wplacename").value.trim().slice(0,40)||null;if(!wf.place)wf.plat=wf.plon=null;const i=$("wplinfo");if(wf.place&&wf.plat==null){i.innerHTML='<button type="button" class="lnk" id="wplmap">📌 Dodaj pinezkę na mapie</button> <span class="note">— łatwiej trafić</span>';i.classList.remove("hide")}else if(!wf.place)i.classList.add("hide")});
$("wpladd").addEventListener("click",()=>{wf.placeAdd=!wf.placeAdd;wfPlaceSync()});
$("wplinfo").addEventListener("click",e=>{if(e.target.id==="wplmap")openPlaceMap();if(e.target.id==="wplnopin"){wf.plat=wf.plon=null;wf.pcity=wf.parea=null;wfPlaceSync()}});
$("wkmsel").addEventListener("change",()=>{const v=$("wkmsel").value;
  if(v==="*"){wf.km=null;wf.kmOwn=true;$("wkmown").value="";wfDurSync();$("wkmown").focus();return}wf.kmOwn=false;wf.km=v?+v:null;
  wfDurSync()});
$("wkmown").addEventListener("input",()=>{const v=parseFloat($("wkmown").value.replace(",","."));wf.km=v>=1&&v<=400?Math.round(v*10)/10:null;wfDurSync()});
$("wdursel").addEventListener("change",()=>{const v=$("wdursel").value;
  if(v==="*"){wf.durOwn=true;$("wdurown").value="";wfDurSync();$("wdurown").focus();return}wf.durOwn=false;wf.dur=+v;
  wfDurSync()});
// „Inny…”: godziny (3,5 · 3,5 h), minuty (40 min · liczba > 12) albo 1:30
function durParse(t){t=String(t||"").trim().toLowerCase().replace(",",".");if(!t)return null;let m;
  const hm=t.match(/^(\d{1,2}):(\d{1,2})$/);
  if(hm)m=+hm[1]*60+ +hm[2];
  else{const v=parseFloat(t);if(!(v>0))return null;m=/m/.test(t)?v:/h|g/.test(t)?v*60:v>12?v:v*60}
  m=Math.round(m/5)*5;return m>=15&&m<=720?m:null}
const durOwnTxt=m=>m<60||m%30?m+" min":String(m/60).replace(".",",")+" h";
$("wdurown").addEventListener("input",()=>{wf.dur=durParse($("wdurown").value);wfDurSync()});
$("wfaskno").onclick=closeWantForm;
$("wfaskback").onclick=()=>$("wfask").classList.add("hide");
$("wantform").addEventListener("click",e=>{if(e.target.id==="wantform")wfTryClose()});
/* ➕ pływający przycisk: widoczny na Starcie, chowa się przy formularzu i okienkach; gość — wyszarzony */
function updateFab(){
  const f=$("fab");if(!f)return;
  const anySheet=[...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide"));
  const on=(!!session||guestMode)&&curTab===0&&!pwMode&&!anySheet&&$("wantform").classList.contains("hide");
  f.classList.toggle("hide",!on);f.classList.toggle("off",!session);
  f.setAttribute("aria-disabled",session?"false":"true");
  document.body.classList.toggle("hasfab",on);
  if(typeof sigFabSync==="function")sigFabSync(on);   // 🟡 „Mam ochotę” (KROK 64)
  updateTop();
}
// ⬆ „Na górę”: po przewinięciu ponad ok. 1 ekran; chowa się przy okienkach
function updateTop(){
  const t=$("totop");if(!t)return;
  const y=window.scrollY||document.documentElement.scrollTop||0;
  const anySheet=[...document.querySelectorAll(".sheet")].some(x=>!x.classList.contains("hide"));
  t.classList.toggle("on",y>Math.min(500,window.innerHeight*.6)&&!anySheet&&$("wantform").classList.contains("hide"));
}
$("totop").onclick=()=>{window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}};
let fabY=0;
window.addEventListener("scroll",()=>{
  const y=window.scrollY||document.documentElement.scrollTop||0,f=$("fab");
  if(y<80)f.classList.remove("mini");else if(y>fabY+6)f.classList.add("mini");else if(y<fabY-6)f.classList.remove("mini");
  fabY=y;updateTop();
},{passive:true});
document.addEventListener("click",e=>{if(e.target.closest("[data-wnew]")){if(!session){say("Zaloguj się, żeby zaprosić na rower.");return}openWantForm(null)}});
$("fab").onclick=()=>{
  if(!session){say("Zaloguj się, żeby zaprosić na rower.");return}
  openWantForm(null);
};
// okienka i formularz otwierają się w wielu miejscach — pilnujemy zmian klasy „hide”
{const mo=new MutationObserver(updateFab);document.querySelectorAll(".sheet,#welcome").forEach(el=>mo.observe(el,{attributes:true,attributeFilter:["class"]}))}
$("wcancel").onclick=wfTryClose;
$("wrfile").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  const p=parseGpx(await f.text());
  if(p.length<2){say("Nie znaleziono punktów trasy w pliku GPX.");e.target.value="";return}
  wf.route=thin(p,500);wf.routeName=f.name.replace(/\.gpx$/i,"");wf.rbId=null;wf.rbName="";wf.routeTouched=true;wfRouteSync();
});
$("wrdel").addEventListener("click",()=>{wf.route=null;wf.routeName="";wf.rbId=null;wf.routeTouched=true;$("wrfile").value="";wfRouteSync()});
$("wtest").addEventListener("click",e=>{const b=e.target.closest("button[data-test]");if(!b)return;wf.test=b.dataset.test==="1";wfTestSync();wfUpdate()});
$("wdays").addEventListener("click",e=>{const b=e.target.closest("button[data-d]");if(!b)return;wfSetDay(b.dataset.d);wfUpdate()});
$("wdt").addEventListener("change",wfUpdate);
["fclock","fclock2"].forEach(id=>$(id).addEventListener("click",e=>{const b=e.target.closest(".farr");if(!b)return;wfStep(b.closest(".fcol").dataset.u,+b.dataset.s)}));
$("wmode").addEventListener("click",e=>{const b=e.target.closest("button[data-mode]");if(b)wfSetMode(b.dataset.mode)});
// kółko myszy i przeciąganie palcem po kartkach
let wheelT=0;
["fch","fcm","fch2","fcm2"].forEach(id=>{
  const el=$(id),unit={fch:"h",fcm:"m",fch2:"h2",fcm2:"m2"}[id];
  el.addEventListener("wheel",e=>{e.preventDefault();const now=Date.now();if(now-wheelT<110)return;wheelT=now;wfStep(unit,e.deltaY<0?1:-1)},{passive:false});
  let y0=null;
  el.addEventListener("touchstart",e=>{y0=e.touches[0].clientY},{passive:true});
  el.addEventListener("touchmove",e=>{
    if(y0==null)return;e.preventDefault();
    const y=e.touches[0].clientY;
    while(y0-y>=26){wfStep(unit,1);y0-=26}
    while(y-y0>=26){wfStep(unit,-1);y0+=26}
  },{passive:false});
  el.addEventListener("touchend",()=>{y0=null});
  let my0=null;
  el.addEventListener("mousedown",e=>{my0=e.clientY;e.preventDefault()});
  window.addEventListener("mousemove",e=>{
    if(my0==null)return;
    while(my0-e.clientY>=20){wfStep(unit,1);my0-=20}
    while(e.clientY-my0>=20){wfStep(unit,-1);my0+=20}
  });
  window.addEventListener("mouseup",()=>{my0=null});
});
$("wquick").addEventListener("click",e=>{
  const b=e.target.closest("button[data-q]");if(!b||b.disabled)return;
  // skok: ustawia tylko zegar „od” (dzień bez zmian); „do” = „od” + 2 h
  const [hh,mm]=b.dataset.q.split(":").map(Number),t=(hh*60+mm+WF_MIN)%1440;
  wfSetTime(hh,mm);wfSetTime2(Math.floor(t/60),t%60);
});
$("wtitle").addEventListener("input",()=>{wf.titleAuto=false;wfTitleHint()});
$("wtitle").addEventListener("focus",()=>{if(wf.titleAuto)$("wtitle").select()});
$("wtitle").addEventListener("blur",()=>{if(!$("wtitle").value.trim()&&!wf.noAuto){wf.titleAuto=true;wfTitleHint()}});
$("wnotesel").addEventListener("change",()=>{
  const v=$("wnotesel").value;
  if(v==="*"){$("wnote").value="";$("wnote").classList.remove("hide");$("wnote").focus()}
  else{$("wnote").value=v;$("wnote").classList.add("hide")}
});
$("wlast").onclick=()=>{
  const L=lastWant();if(!L)return;
  const d=wfDate()||new Date();d.setHours(L.h,L.m,0,0);
  if(wf.day==="0"&&d.getTime()<Date.now()+5*60000)wfSetDay("1");
  wfSetTime(L.h,L.m);$("wnote").value=L.note||"";wfNoteSync();
};
$("wsave").onclick=async()=>{
  if(!session){say("Najpierw zaloguj się.");return}
  if(needProfile()){askNick();return}
  const d=wfDate();
  if(!d){say("Wybierz datę.");return}
  if(d.getTime()<Date.now()-5*60000){say("Ten termin już minął — wybierz późniejszą godzinę.");return}
  const rng=wfRange(),d2=rng?wfDate2():null;
  if(rng&&(d2-d<WF_MIN*6e4||d2-d>WF_MAX*6e4)){say("Zakres musi trwać od 2 do 12 godzin.");return}
  if(rng&&d.getTime()<Date.now()+65*60000){say("Zakres zaczyna się za mniej niż godzinę — wtedy godzina ustala się sama i nikt nie może zaproponować swojej. Przesuń początek zakresu albo wybierz „Godzina”.");return}
  const note=$("wnote").value.trim()||null,title=wf.titleAuto?null:($("wtitle").value.trim()||null),k=localIso(d).slice(0,10);
  if(title&&title.length<6){say("Tytuł: co najmniej 6 znaków — albo zostaw puste (tytuł ułoży się sam).");return}
  // kilka zaproszeń dziennie wolno (decyzja 2026-11-15) — blokada tylko dla tej samej godziny startu
  const same=wants.find(w=>w.user_id===uid&&w.id!==wf.editId&&Math.abs(new Date(w.starts_at).getTime()-d.getTime())<60000);
  if(same){say("Masz już zaproszenie na "+wfLabel(d).toLowerCase()+" — wybierz inną godzinę albo zmień tamto.");return}
  if(distOk){
    const en=new Date((rng?d2:d).getTime()+wfDurMin()*60000),cl=wfClash(d,en);
    if(cl){const cs=wantStart(cl),ce=wantEnd(cl);
      say(cs<=d?"Twoja jazda "+relDay(cs).toLowerCase()+" o "+hhmm(cs)+" potrwa do ok. "+hhmm(ce)+" — następne zaproszenie najwcześniej o "+hhmm(ceil5(ce.getTime()+RIDE_GAP*60000))+"."
               :relDay(cs)+" o "+hhmm(cs)+" masz już jazdę — ta skończyłaby się ok. "+hhmm(en)+". Wybierz wcześniejszą godzinę albo krótszą jazdę.");
      return}
    const jc=wfJoinedClash(d,en);if(jc&&!await leaveForClash(jc,d))return;
  }
  const priv=!wf.editId&&wfPriv(),ids=priv?wfInvIds():[];
  // edycja: zmiana „Kto zobaczy?” (osoby, które już dołączyły, zostają zaproszone)
  const ow1=wf.editId?wants.find(x=>x.id===wf.editId):null,ePriv=!!ow1&&visOk&&wfPriv(),
    eJoined=ow1?(joins[ow1.id]||[]).filter(x=>x!==uid):[],eTarget=ePriv?[...new Set([...wfInvIds(),...eJoined])]:[];
  if(ePriv&&!eTarget.length&&!wf.gr){say(wf.vis==="fav"?"Nie masz jeszcze ulubionych — wybierz osoby w „Kto zobaczy”.":"Wybierz co najmniej jedną osobę w „Kto zobaczy”.");return}
  let visMsg="";
  // prywatne → wszyscy: potwierdzenie (ogłoszenie na kanale Telegram nie da się cofnąć; baza wysyła je tylko raz — KROK 52)
  if(ow1&&visOk&&isPriv(ow1)&&!ePriv&&!await askOk("Zaproszenie zobaczą wszyscy zalogowani.\n\nJeśli jeszcze nie było na kanale Telegram, trafi tam teraz — wiadomości z kanału nie da się cofnąć (nawet gdy później znów zrobisz je prywatnym).\n\nZapisać?","Zapisz"))return;
  if(priv&&!ids.length&&!wf.gr){say(wf.vis==="fav"?"Nie masz jeszcze ulubionych — wybierz osoby w „Kto zobaczy”.":"Wybierz co najmniej jedną osobę w „Kto zobaczy”.");return}
  let editedPriv=false,sigInv=null;
  try{
    await savePlaceToList();
    // 📚 baza tras: trasa wybrana z bazy albo dodana przełącznikiem „Dodaj do bazy tras”
    let rbUse=null,rbNew=null;
    if(rbOk&&wRouteOk&&wf.route&&(!wf.editId||wf.routeTouched)){
      if(wf.rbId)rbUse=wf.rbId;
      else if(rbAddOn()){const nm=(wf.rbName||wf.routeName||"").trim();
        const r=await rbAddRoute(wf.route,nm.length>=2?nm:"Trasa "+kmTxt(routeKm(wf.route))+" km",{bike:wf.bike||null,city:wf.place&&wf.pcity||null});
        if(r){rbUse=r.id;if(r.isNew)rbNew=r.id}}
    }
    if(wf.editId){
      const ow0=wants.find(x=>x.id===wf.editId),upd={starts_at:d.toISOString(),note};if(titleOk)upd.title=title;if(paceOk)upd.pace=wf.pace||null;if(placeOk){upd.place=wf.place||null;upd.place_lat=wf.place?wf.plat:null;upd.place_lon=wf.place?wf.plon:null}if(bikeOk){upd.bike=wf.bike||null;upd.place_city=wf.place&&wf.pcity||null;upd.place_area=wf.place&&wf.parea||null}if(distOk){const R=wf.route||(!wf.routeTouched&&hasRoute(ow0));upd.km=R?null:wf.km||null;upd.dur_min=R||wf.km?null:wf.dur||DUR_DEF}
      if(wRouteOk&&wf.routeTouched){upd.route=wf.route?routeJson(wf.route):null;upd.route_km=wf.route?+routeKm(wf.route).toFixed(1):null;delete wRouteCache[wf.editId];if(rbOk)upd.route_base_id=wf.route?rbUse:null}
      if(rbNew)sb.from("route_base").update({src_want:wf.editId}).eq("id",rbNew).then(()=>{},()=>{});
      if(rng){upd.range_from=d.toISOString();upd.range_to=d2.toISOString();upd.settled_at=null}
      else if(isOpen(ow0)){upd.range_from=null;upd.range_to=null}
      const res=await sb.from("wants").update(upd).eq("id",wf.editId).select("id");
      if(res.error||!res.data||!res.data.length)throw new Error(res.error?res.error.message:"zmiana terminu wymaga KROKU 11 w bazie");
      const ow=wants.find(x=>x.id===wf.editId);editedPriv=!!ow&&((invs[ow.id]||[]).length>0||(joins[ow.id]||[]).some(x=>x!==uid));
      if(ow1&&visOk){
        const was=isPriv(ow1),cur=(invs[ow1.id]||[]).map(x=>x.u);
        const gOld=wGr(ow1)||null,gNew=ePriv&&wf.gr||null,gCh=wGrOk&&gOld!==gNew;   // 👥 KROK 71: widoczność i grupa jednym zapisem
        if(was!==ePriv||gCh){const vu={visibility:ePriv?"private":"all"};if(wGrOk)vu.group_id=gNew;
          const rv=await sb.from("wants").update(vu).eq("id",ow1.id).select("id");
          if(rv.error||!rv.data||!rv.data.length)throw new Error(rv.error&&rv.error.message?"termin zapisany, ale „Kto zobaczy”: "+rv.error.message:"termin zapisany, ale zmiana „Kto zobaczy” wymaga KROKU 52 w bazie");
          visMsg=gNew&&gCh?" 👥 Teraz widzi grupa „"+grNm(gNew)+"”"+(eTarget.length?" i wybrane osoby.":"."):was!==ePriv?(ePriv?" 🔒 Teraz widzą tylko zaproszeni.":" 🌍 Teraz widzą wszyscy."):" 🔒 Grupa zdjęta — widzą tylko zaproszeni."}
        if(ePriv){const add=eTarget.filter(u=>!cur.includes(u)),rem=cur.filter(u=>!eTarget.includes(u));
          if(add.length){const ri=await sb.from("want_invitees").insert(add.map(u=>({want_id:ow1.id,user_id:u,added_by:uid})));if(ri.error)throw ri.error}
          if(rem.length){const rd=await sb.from("want_invitees").delete().eq("want_id",ow1.id).in("user_id",rem);if(rd.error)throw rd.error}
          const nNew=add.filter(u=>!eJoined.includes(u)).length;
          if(nNew)visMsg+=" Zaproszono "+nNew+" "+plf(nNew,["nową osobę","nowe osoby","nowych osób"])+".";
          if(rem.length)visMsg+=" Usunięto z zaproszonych: "+rem.length+".";}
      }
    }else{
      const row={starts_at:d.toISOString(),note};if(titleOk&&title)row.title=title;if(paceOk&&wf.pace)row.pace=wf.pace;if(placeOk&&wf.place){row.place=wf.place;if(wf.plat!=null){row.place_lat=wf.plat;row.place_lon=wf.plon}}if(bikeOk){if(wf.bike)row.bike=wf.bike;if(wf.place&&wf.pcity){row.place_city=wf.pcity;if(wf.parea)row.place_area=wf.parea}}if(distOk&&!wf.route){if(wf.km)row.km=wf.km;else row.dur_min=wf.dur||DUR_DEF}if(priv)row.visibility="private";if(priv&&wGrOk&&wf.gr)row.group_id=wf.gr;if(testOk)row.is_test=!!wf.test;if(wRouteOk&&wf.route){row.route=routeJson(wf.route);row.route_km=+routeKm(wf.route).toFixed(1)}if(rbOk&&rbUse)row.route_base_id=rbUse;
      if(rng){row.range_from=d.toISOString();row.range_to=d2.toISOString()}
      const res=await sb.from("wants").insert(row).select("id").single();
      if(res.error)throw res.error;
      if(rbNew)sb.from("route_base").update({src_want:res.data.id}).eq("id",rbNew).then(()=>{},()=>{});
      if(priv&&ids.length){
        const r2=await sb.from("want_invitees").insert(ids.map(u=>({want_id:res.data.id,user_id:u,added_by:uid})));
        if(r2.error){await sb.from("wants").delete().eq("id",res.data.id);throw r2.error}
      }
      // 🟡 z „Mam ochotę”: osoba, która dała znać, dostaje zaproszenie (także przy publicznym)
      if(wf.sigFor&&wf.sigFor!==uid&&!ids.includes(wf.sigFor)){const r3=await sb.from("want_invitees").insert({want_id:res.data.id,user_id:wf.sigFor,added_by:uid});if(!r3.error)sigInv=wf.sigFor}
    }
    try{localStorage.setItem("lastWant",JSON.stringify({h:wf.h,m:wf.m,note}))}catch(e){}
    try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}
    const wasEdit=!!wf.editId;
    closeWantForm();$("wnote").value="";$("wtitle").value="";
    await syncNow();
    const lbl=wfLabel(d)+(rng?"–"+hhmm(d2):"");
    if(sigInv){say("Wysłane ✔ "+lbl+" — "+(nicks[sigInv]||"ta osoba")+" dostanie zaproszenie.");return}
    say(wasEdit?"Zapisano ✔ "+lbl+(visMsg||(editedPriv&&visOk?" — zaproszeni dostaną powiadomienie.":""))
      :priv&&wf.gr?"Wysłane 👥 do grupy „"+grNm(wf.gr)+"”"+(ids.length?" i "+ids.length+" "+osob(ids.length):"")+" ✔ Dostaną powiadomienie w aplikacji.":priv?"Wysłane 🔒 do "+ids.length+" "+osob(ids.length)+" ✔ Dostaną powiadomienie w aplikacji.":testOk&&wf.test?"Wysłane 🧪 testowe zaproszenie na "+lbl+" ✔ (na kanale Telegram z oznaczeniem TESTOWE)":"Wysłane ✔ Zaproszenie na "+lbl+(DEMO?" (demo — nikt poza Tobą go nie zobaczy).":" jest też na kanale Telegram."));
  }catch(e){say("Nie udało się: "+(e&&e.message?e.message:"błąd"))}
};
/* ---------- Twoje zaproszenie (zamiast dużego przycisku) ---------- */
// 🔀 przełącznik „Twoje zaproszenia” (prośba właściciela 2026-11-17 21:21): włączony — osobno na górze (karuzela),
// wyłączony — zwinięte, a Twoje zaproszenia wracają do kalendarza na swoje godziny; zapamiętane w telefonie
const myOn=()=>{try{return localStorage.getItem("myOff")!=="1"}catch(e){return true}};
let myCnt=0;
function wsecSync(){const hasMy=myCnt>0,hasCal=!!$("wantlist").querySelector(".wday"),on=myOn();
  $("wsecmy").classList.toggle("hide",!hasMy);$("wseccal").classList.toggle("hide",!(hasMy&&hasCal));
  const sw=$("mysw");sw.classList.toggle("on",on);sw.setAttribute("aria-checked",String(on));
  $("wsecmyn").textContent=hasMy?' · '+myCnt+(on?'':' · w kalendarzu'):''}
$("mysw").addEventListener("click",()=>{const on=!myOn();try{localStorage.setItem("myOff",on?"0":"1")}catch(e){}renderWants();say(on?"Twoje zaproszenia — osobno na górze.":"Twoje zaproszenia — w kalendarzu, na swoich godzinach.")});
document.addEventListener("click",e=>{const b=e.target.closest("[data-wmup]");if(!b)return;const w=wants.find(x=>x.id===b.dataset.wmup);if(w)goToWant(w)});
function renderMyWant(){
  const box=$("mywant");if(!box)return;
  const act=w=>!wDone(w);
  const mine=wants.filter(w=>w.user_id===uid&&act(w)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
  const others=wants.filter(w=>w.user_id!==uid&&act(w)&&dayDiff(new Date(w.starts_at))===0).length;
  const bd=$("wbadge");bd.innerHTML='<span class="fbn">'+others+'</span><span class="fbd"> dziś</span>';bd.classList.toggle("hide",!others);
  myCnt=mine.length;
  if(!mine.length||!myOn()){box.innerHTML="";return}
  // kilka zaproszeń: karuzela przewijana w bok (z kropkami)
  const card=(w,i)=>{
    const d=new Date(w.starts_at),j=(joins[w.id]||[]).filter(x=>x!==uid);
    const wd=d.toLocaleDateString("pl-PL",{weekday:"long"}),n=dayDiff(d);
    const priv=isPriv(w),ni=(invs[w.id]||[]).length;
    const live=wLive(w);
    if(live)return '<div class="mywant live'+(isTest(w)?' test':'')+grCls(w)+'" data-i="'+i+'" data-wid="'+esc(w.id)+'"><div class="myh">🙋 Ty zapraszasz '+trwaTag()+(isTest(w)?' <span class="ttag">🧪 TEST</span>':'')+(mine.length>1?' · '+(i+1)+' z '+mine.length:'')+'</div>'
     +wTitleHtml(w)+'<div class="myt">'+esc(relDay(new Date(w.starts_at))+" "+hhmm(new Date(w.starts_at)))+'</div>'+liveHtml(w)
     +paceHtml(w)+bikeHtml(w)+placeHtml(w)+(w.note?'<div class="mym">💬 '+esc(w.note)+'</div>':'')
     +'<div class="mym">'+joinedHtml("my"+w.id,j,'Jedziesz sam(a).')+'</div>'
     +'<div class="linfo">🔒 Jazda trwa — nie można już edytować, dołączać ani doprosić. Po zakończeniu trafi do archiwum.</div>'
     +'<div class="acts"><button class="b g join" data-my="share" data-id="'+esc(w.id)+'">Udostępnij</button><button class="ib del" data-my="del" data-id="'+esc(w.id)+'" title="Usuń zaproszenie" aria-label="Usuń zaproszenie">'+ICON.del+'</button></div></div>';
    return '<div class="mywant'+(isTest(w)?' test':'')+grCls(w)+'" data-i="'+i+'" data-wid="'+esc(w.id)+'"><div class="myh">🙋 Ty zapraszasz'+(isTest(w)?' <span class="ttag">🧪 TEST</span>':'')+(mine.length>1?' · '+(i+1)+' z '+mine.length:'')+(priv?(wGr(w)?grTagHtml(w):'<span class="lockt">🔒 dla '+ni+' '+osob(ni)+'</span>'):'')+'</div>'
     +wTitleHtml(w)+'<div class="myt'+(isOpen(w)?' rng':'')+'">'+esc(n>=0&&n<=2?["Dziś","Jutro","Pojutrze"][n]+" "+wTime(w):wd.charAt(0).toUpperCase()+wd.slice(1)+" "+wTime(w))+(n>=0&&n<=2?'<span>'+esc(wd)+'</span>':'')+'</div>'
     +(isOpen(w)?'<div class="mym">🕖 Godzina do ustalenia'+(new Date(w.range_from).getTime()>Date.now()+36e5?' — ustali się sama '+esc(hhmm(new Date(new Date(w.range_from).getTime()-36e5)))+', jeśli jej nie wybierzesz':'')+'</div>':fromRange(w)?'<div class="mym">✅ Godzina ustalona</div>':'')
     +paceHtml(w)+bikeHtml(w)+durLineHtml(w)+placeHtml(w)+(w.note?'<div class="mym">💬 '+esc(w.note)+'</div>':'')+wxHtml(w)+routeBoxHtml(w)
     +(priv?'<div class="mym">'+invitedHtml(w)+'</div>':'')
     +(isOpen(w)?'<div class="mym">'+tallyHtml(w)+'</div>'+(wTally(w).length?'<div class="prop">✨ Propozycja: <b>'+esc(hhmm(new Date(wBest(w))))+'</b> — pasuje '+wTally(w)[0].ids.length+' '+plf(wTally(w)[0].ids.length,["osobie","osobom","osobom"])+'</div>':'')
       :'<div class="mym">'+joinedHtml("my"+w.id,j,'Na razie nikt nie dołączył.')+declHtml(w)+'</div>')
     +'<div class="acts">'+(isOpen(w)?'<button class="b join" data-my="settle" data-id="'+esc(w.id)+'" title="Ustal godzinę">✅ Ustal '+esc(hhmm(new Date(wBest(w))))+'</button>':'<button class="b g join" data-my="edit" data-id="'+esc(w.id)+'">✏️ Edytuj</button>')
     +(priv?'<button class="ib" data-my="inv" data-id="'+esc(w.id)+'" title="Zaproś kogoś jeszcze" aria-label="Zaproś kogoś jeszcze">'+ICON.addp+'</button>':'')
     +'<button class="ib" data-my="share" data-id="'+esc(w.id)+'" title="Udostępnij" aria-label="Udostępnij">'+ICON.share+'</button>'
     +'<button class="ib del" data-my="del" data-id="'+esc(w.id)+'" title="Odwołaj zaproszenie" aria-label="Odwołaj zaproszenie">'+ICON.del+'</button></div>'
     +(isOpen(w)?'<div class="myl"><button class="lnk" data-my="settlepick" data-id="'+esc(w.id)+'">Wybierz inną godzinę ›</button><button class="lnk" data-my="edit" data-id="'+esc(w.id)+'">Zmień zakres ›</button></div>':'')+'</div>';
  };
  const multi=mine.length>1,keep=multi?Math.min(myIdx,mine.length-1):0;
  box.innerHTML='<div class="mycar'+(multi?' multi':'')+'" id="mycar">'+mine.map(card).join("")+'</div>'
   +(multi?'<div class="mydots" id="mydots">'+mine.map((_,i)=>'<button type="button" data-dot="'+i+'" class="'+(i===keep?'on':'')+'" aria-label="Zaproszenie '+(i+1)+'"></button>').join("")+'</div>':'')
   +'<button class="lnk mynew" data-my="new">+ Zaproś na kolejną jazdę</button>';
  if(multi){const c=$("mycar");const it=c.children[keep];if(it)c.scrollLeft=it.offsetLeft-c.offsetLeft}
  fillWx();
}
let myIdx=0;
function myCarIdx(){
  const c=$("mycar");if(!c||!c.children.length)return 0;
  const w=c.children[0].getBoundingClientRect().width+10;
  return Math.max(0,Math.min(c.children.length-1,Math.round(c.scrollLeft/w)));
}
$("mywant").addEventListener("scroll",e=>{
  if(e.target.id!=="mycar")return;
  myIdx=myCarIdx();
  const dots=$("mydots");if(dots)[...dots.children].forEach((b,i)=>b.classList.toggle("on",i===myIdx));
},true);
async function myClick(e){
  const dot=e.target.closest("button[data-dot]");
  if(dot){const c=$("mycar"),it=c&&c.children[+dot.dataset.dot];if(it)c.scrollTo({left:it.offsetLeft-c.offsetLeft,behavior:"smooth"});return}
  const b=e.target.closest("button[data-my]");if(!b)return;
  const w=wants.find(x=>x.id===b.dataset.id);
  if(b.dataset.my==="new"){openWantForm(null);return}
  if(!w)return;
  if(b.dataset.my==="edit"){openWantForm(w);return}
  if(b.dataset.my==="inv"){openWho("add",w.id);return}
  if(b.dataset.my==="settlepick"){openPick("settle",w.id);return}
  if(b.dataset.my==="settle"){
    const t=wBest(w);
    if(!await askOk("Ustalić godzinę "+hhmm(new Date(t))+"? Zaproszeni dostaną powiadomienie.","Ustal "+hhmm(new Date(t))))return;
    try{await settleWant(w,t);await syncNow();say("✅ Ustalono "+wfLabel(new Date(t))+" — zaproszeni dostaną powiadomienie.")}
    catch(err){say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
    return;
  }
  if(b.dataset.my==="share"){
    const d=new Date(w.starts_at),url=location.origin+location.pathname;
    const t="🚴 Idziemy na rower? "+(w.title?"„"+w.title+"” · ":"")+wfLabel(d)+(w.note?" · "+w.note:"")+"\nDołącz w PrzylesieGo!";
    if(navigator.share){try{await navigator.share({title:"Idziemy na rower?",text:t,url});return}catch(err){if(err&&err.name==="AbortError")return}}
    try{await navigator.clipboard.writeText(t+"\n"+url);say("Skopiowano zaproszenie — wklej je znajomym.")}catch(err){say(t+" "+url)}
    return;
  }
  if(b.dataset.my==="del"){
    askDelete("want",w.id);
  }
}
$("mywant").addEventListener("click",myClick);
// Twoje zaproszenia w kalendarzu (przełącznik wyłączony) — te same przyciski co na górze
$("wantlist").addEventListener("click",e=>{if(e.target.closest("button[data-my]"))myClick(e)});
$("wantlist").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-w]");if(!b)return;
  const id=b.dataset.id;
  if(b.dataset.w==="inv"){openWho("add",id);return}
  if(b.dataset.w==="pref"){openPick("pref",id);return}
  try{
    if(b.dataset.w==="join"){
      if(needProfile()){askNick();return}
      const joined=(joins[id]||[]).includes(uid);
      if(!joined){const w=wants.find(x=>x.id===id);if(w&&!await joinClashOk(w))return}
      const res=joined?await sb.from("want_joins").delete().eq("want_id",id).eq("user_id",uid):await sb.from("want_joins").insert({want_id:id});
      if(res.error)throw res.error;
      if(!joined&&(decls[id]||[]).includes(uid))await sb.from("want_declines").delete().eq("want_id",id).eq("user_id",uid);
    }else{
      askDelete("want",id);return;
    }
    await syncNow();
  }catch(err){say("Operacja nie powiodła się"+(err&&err.message?": "+err.message:"."))}
});

/* ---------- zaproszenia dla wybranych osób (KROK 13) ---------- */
let visOk=false,invs={},notifs=[];
/* 🧪 zaproszenia testowe (KROK 22) */
let testOk=false;const isTest=w=>!!w&&!!w.is_test&&!pv&&!PV_GUEST;   // w podglądzie 👑 testowe wyglądają jak prawdziwe
const testTag=w=>isTest(w)?'<span class="ttag">🧪 TEST</span>':'';
const CHECK='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const plf=(n,f)=>n===1?f[0]:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?f[1]:f[2];
const osob=n=>n===1?"osoby":"osób"; // „dla 1 osoby”, „dla 5 osób”
const isPriv=w=>!!w&&w.visibility==="private";
// 👥 zaproszenie dla grupy (KROK 71): wants.group_id; wGrOk ustawia wczytanie (js/14); nazwa/kolor/skład grupy — js/17 (przez typeof)
let wGrOk=false;
const wGr=w=>wGrOk&&!!w&&w.group_id||"";
const grTagHtml=w=>wGr(w)&&typeof wGrTag==="function"?wGrTag(w):"";
const grNm=g=>typeof grName==="function"?grName(g):"grupa";
// 🎨 karta w kolorze grupy: dopisek do atrybutu class (kończy się przed zamykającym cudzysłowem) — „ wgrp\" style=\"--gc:#…”
const grCls=w=>wGr(w)&&typeof wGrCls==="function"?wGrCls(w):"";
// grupy do wyboru w „Kto zobaczy?” (aktywne członkostwa, nie w archiwum) — tylko gdy baza ma KROK 71
const wGrList=()=>wGrOk&&typeof grForWant==="function"?grForWant():[];
const invIds=w=>(invs[w.id]||[]).map(x=>x.u);
// zaproszony: wpis w want_invitees albo aktywny członek grupy zaproszenia (👥 KROK 71)
const wInvMe=w=>invIds(w).includes(uid)||(!!wGr(w)&&typeof grIn==="function"&&grIn(w.group_id));
const wantCanInvite=w=>isPriv(w)&&new Date(w.starts_at).getTime()>Date.now()-36e5&&(w.user_id===uid||wInvMe(w));
// lista zaproszonych: do 2 osób pigułki, od 3 — zwinięta (jak „Dołączyło”); „dopr. X” przy dopraszanych
function invitedHtml(w){
  if(!isPriv(w))return "";
  const L=(invs[w.id]||[]).slice().sort((a,b)=>((isFav(b.u)?1:0)-(isFav(a.u)?1:0))||String(nicks[a.u]||"").localeCompare(String(nicks[b.u]||""),"pl"));
  const by=x=>x.by&&x.by!==w.user_id&&nicks[x.by]?'dopr. '+esc(nicks[x.by]):'';
  if(!L.length)return wGr(w)?'':'<div class="meta">🔒 Zaproszeni: nikt</div>';   // 👥 grupa bez dodatkowych osób
  if(L.length<=2)return '<div class="meta">🔒 Zaproszeni ('+L.length+'):<div class="nks">'+L.map(x=>nk(x.u)+(by(x)?'<span class="note">'+by(x)+'</span>':'')).join("")+'</div></div>';
  const k="inv"+w.id,fn=favNames(L.map(x=>x.u));
  return '<details class="jlist" data-j="'+esc(k)+'"'+(joinOpen.has(k)?' open':'')+'><summary><span class="jc">🔒 Zaproszeni '+L.length+'</span>'
   +(fn.length?'<span class="jf">· ⭐ '+esc(fn.join(", "))+'</span>':'')+'</summary>'
   +'<div class="jv">'+L.map(x=>'<div>'+nk(x.u)+'<span class="note">'+[by(x),onlineIds.includes(x.u)?'🟢 teraz':''].filter(Boolean).join(' · ')+'</span></div>').join("")+'</div></details>';
}
/* pole „Kto zobaczy” w formularzu */
const wfPriv=()=>visOk&&(wf.vis!=="all"||!!wf.gr);
function wfInvIds(){return (wf.vis==="fav"?[...favs]:[...wf.pick]).filter(id=>id!==uid&&nicks[id])}
function renderWhoBtn(){
  const b=$("wwho");if(!b)return;
  const ids=wf.vis==="all"?[]:wfInvIds(),names=favFirst(ids).map(id=>nicks[id]);
  // 👥 grupa (+ ewentualnie dodatkowe osoby): ikona i kolor grupy jak w ⚙️ → Grupy
  if(wf.gr&&typeof grG!=="undefined"){const x=grG[wf.gr],n=typeof grMemIds==="function"?grMemIds(wf.gr).length+1:0;
    b.className="who priv";
    b.innerHTML='<span class="wic">'+(x&&typeof grIco==="function"?grIco(x):'👥')+'</span><span class="wtx"><b>'+esc(grNm(wf.gr)+(n?" ("+n+")":""))+'</b><span>'+esc(ids.length?"Członkowie grupy + "+names.join(", "):"Członkowie grupy, także nowi")+'</span></span><span class="war">›</span>';
    return}
  const [ic,t,s]=wf.vis==="all"?["🌍","Wszyscy","Wszyscy zalogowani + kanał Telegram"]
    :wf.vis==="fav"?["⭐","Ulubieni ("+ids.length+")",names.join(", ")||"Nie masz jeszcze ulubionych"]
    :(()=>{const l=plOk&&plMatch(ids);return l?["📋",l.name+" ("+ids.length+")",names.join(", ")]:["👥","Wybrane osoby ("+ids.length+")",names.join(", ")||"Nikogo nie wybrano"]})();
  b.className="who"+(wf.vis==="all"?"":" priv");
  b.innerHTML='<span class="wic">'+ic+'</span><span class="wtx"><b>'+esc(t)+'</b><span>'+esc(s)+'</span></span><span class="war">›</span>';
}
$("wwho").onclick=()=>openWho("form");
/* okno „Kogo zapraszasz?” (wysuwane od dołu): wybór do formularza albo dopraszanie do zaproszenia */
const ws={mode:"form",vis:"all",pick:new Set(),want:null,q:""};
const favIds=()=>[...favs].filter(id=>nicks[id]&&id!==uid);
// 📋 osoby z listy, które da się zaznaczyć w tym oknie (bez już zaproszonych / niedostępnych)
function whoPlAvail(lid){const P=new Set(whoPeople()),D=whoDis();return plIds(lid).filter(id=>P.has(id)&&!D.has(id))}
// 📋 zwijana sekcja „Listy” (domyślnie zwinięta; w nagłówku nazwy zaznaczonych list) — kółko z ptaszkiem = cała lista zaznaczona
function whoPlHtml(){
  if(!plOk)return "";
  const L=plists.filter(l=>!(ws.mode==="pl"&&l.id===ws.want)).map(l=>[l,whoPlAvail(l.id)]).filter(x=>x[1].length);
  if(!L.length)return "";
  const on=([l,A])=>ws.vis==="pick"&&A.every(id=>ws.pick.has(id)),sel=L.filter(on).map(x=>x[0].name),col=!ws.plOpen;
  // wygląd jak zwijane sekcje pod 🔔 (pasek + drabinka), większy; zielone tło, gdy wybrano listę
  return secBar(uiIcon("list"),"Twoje listy",L.length,col,esc(sel.join(", ")),'data-k="plt"',sel.length)
   +'<div class="secb'+(col?' hide':'')+'">'+(col?'':L.map(x=>'<button type="button" class="prow'+(on(x)?' on':'')+'" data-wpl="'+esc(x[0].id)+'"><span class="cbx">'+CHECK+'</span><span class="pnm">'+plDot(x[0])+esc(x[0].name)+plEd(x[0])+'</span><span class="pon">'+x[1].length+' '+plf(x[1].length,["osoba","osoby","osób"])+'</span></button>').join(""))+'</div>';
}
function openWho(mode,wantId){
  if(!session)return;
  if(needProfile()){askNick();return}
  ws.mode=mode;ws.want=wantId||null;ws.q="";
  ws.gr=mode==="form"&&wGrList().some(x=>x.id===wf.gr)?wf.gr:"";   // 👥 grupa (KROK 71)
  ws.msg="";pf.who=null;   // 🔎 filtry od nowa przy każdym otwarciu
  if(mode==="pl"){ws.vis="pick";ws.pick=new Set(plIds(wantId))}   // 📋 osoby na liście (KROK 68)
  else if(mode==="form"){ws.vis=wf.vis;ws.pick=new Set(wf.vis==="fav"?favIds():wf.pick);whoLocked().forEach(id=>ws.pick.add(id))}
  else if(mode==="evf"){ws.vis="pick";ws.pick=new Set(ef&&ef.inv||[]);ws.msg=ef&&ef.invMsg||""}
  else if(mode==="grn"){ws.vis="pick";ws.pick=new Set(wantId||[]);ws.want=null}   // 👥 nowa grupa (js/17): wybór wraca do formularza grupy
  else{ws.vis="pick";ws.pick=new Set()}
  // domyślnie: Listy zwinięte, ⭐ Ulubieni rozwinięci, Pozostali zwinięci; przy ≤10 osobach wszystko rozwinięte
  const few=whoPeople().length<=10;ws.col={f:false,o:!few};
  // 📋 wybrana już lista (np. przy edycji zaproszenia) → sekcja „Twoje listy” od razu rozwinięta
  const plSel=ws.vis==="pick"&&plOk&&plists.some(l=>{const A=whoPlAvail(l.id);return A.length&&A.every(id=>ws.pick.has(id))});
  ws.plOpen=few||plSel||mode==="grn";ws.grOpen=!!ws.gr||wGrList().length<=3;
  $("whosheet").classList.toggle("ontop",mode==="grn");   // nad oknem formularza grupy (#grsheet)
  renderWho(true);
}
function closeWho(){const p=$("whosheet");p.classList.add("hide");p.innerHTML=""}
function whoPeople(){
  let ids=Object.keys(nicks).filter(id=>id!==uid&&!modGone(id));
  if(ws.mode==="add"){const w=wants.find(x=>x.id===ws.want),ex=new Set(w?[w.user_id,...invIds(w)]:[]);ids=ids.filter(id=>!ex.has(id))}
  if(whoEv())ids=ids.filter(evAccess);
  return ids.sort((a,b)=>nicks[a].localeCompare(nicks[b],"pl"));
}
const whoEv=()=>ws.mode==="ev"||ws.mode==="evf";
// 🏁 impreza: kto już jest zaproszony albo jedzie — widoczny, ale nie do wybrania
function whoDis(){const M=new Map();if(ws.mode==="gr"&&typeof grDis==="function")return grDis(ws.want);
  if(ws.mode==="form"&&ws.gr&&ws.vis!=="all"&&typeof grMemIds==="function"){grMemIds(ws.gr).forEach(id=>M.set(id,"w grupie"));return M}if(ws.mode!=="ev")return M;
  (evPart[ws.want]||[]).forEach(p=>M.set(p.user_id,"już jedzie"));
  evInv.filter(x=>x.event_id===ws.want).forEach(x=>{if(!M.has(x.user_id))M.set(x.user_id,"już zaproszony(a)")});return M}
// edycja zaproszenia: osoby, które już dołączyły, zostają zaproszone (nie da się ich odznaczyć)
const whoLocked=()=>new Set(ws.mode==="form"&&wf.editId?(joins[wf.editId]||[]).filter(x=>x!==uid):[]);
const whoRow=(id,on)=>{const dn=whoDis().get(id);if(dn)return '<button type="button" class="prow dis" data-p="'+esc(id)+'"><span class="cbx"></span><span class="pnm">'+nk(id)+'</span><span class="pjn">'+esc(dn)+'</span></button>';
  const lk=whoLocked().has(id);return '<button type="button" class="prow'+(on||lk?' on':'')+(lk?' lock':'')+'" data-p="'+esc(id)+'"><span class="cbx">'+CHECK+'</span><span class="pnm">'+nk(id)+'</span>'+(lk?'<span class="pjn">dołączył(a)</span>':onlineIds.includes(id)?'<span class="pon">🟢 teraz</span>':'')+'</button>'};
// nagłówek grupy z „Zaznacz wszystkich / Odznacz”
// ▸ zwijanie sekcji (Ulubieni / Pozostali): przy szukaniu lub filtrze wszystko rozwinięte; w zwiniętej sekcji licznik zaznaczonych
const whoFiltering=()=>ws.vis==="pick"&&(!!ws.q.trim()||pfOn("who"));
const whoColl=g=>!whoFiltering()&&!!(ws.col&&ws.col[g]);
// ▸ jeden wygląd zwijanych sekcji osób i list (duży pasek jak pod 🔔): ikona, nazwa, licznik, dopisek, strzałka; „unr” = zielone tło
const secBar=(ico,t,n,col,extra,attrs,unr)=>'<button type="button" class="secbar'+(col?' col':'')+(unr?' unr':'')+'" '+attrs+' aria-expanded="'+!col+'"><span class="bst">'+ico+'<span>'+t+'</span></span>'
  +'<span class="cnt0">'+n+'</span>'+(extra?'<span class="wsplsel">'+extra+'</span>':'')+'<svg class="bschev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'+'</button>';
const whoGrp=(t,ids,g,tog)=>{if(!ids.length)return '';const D=whoDis();ids=ids.filter(id=>!D.has(id));if(!ids.length)return '<div class="bsgrp">'+t+'</div>';const L=whoLocked(),all=ids.every(id=>ws.pick.has(id)||L.has(id)),free=ids.some(id=>!L.has(id));
  const sel=free?'<button type="button" class="lnk" data-k="grp" data-g="'+g+'">'+(all?'Odznacz':'Zaznacz wszystkich')+'</button>':'';
  if(!tog)return '<div class="bsgrp gl"><span>'+t+'</span>'+sel+'</div>';
  // dwie sekcje: duży zwijany pasek; „Zaznacz wszystkich” w środku sekcji
  const col=whoColl(g),k=ids.filter(id=>ws.pick.has(id)||L.has(id)).length;
  return secBar(g==="f"?'<span class="secstar">'+uiIcon("starf")+'</span>':uiIcon("users"),g==="f"?"Ulubieni":"Pozostali",ids.length,col,k?"zaznaczono "+k:"",'data-k="gtog" data-g="'+g+'"',false)
   +'<div class="secb'+(col?' hide':'')+'">'+(sel?'<div class="secact">'+sel+'</div>':'')};
// 👥 zwijana sekcja „Twoje grupy” (KROK 71) — jedna grupa na zaproszenie; wygląd jak „Twoje listy”, ikona i kolor grupy jak w ⚙️ → Grupy
function whoGrHtml(){
  if(ws.mode!=="form")return "";
  const L=wGrList();if(!L.length)return "";
  const sel=ws.vis!=="all"&&ws.gr?L.find(x=>x.id===ws.gr):null,col=!ws.grOpen;
  return secBar(uiIcon("users"),"Twoje grupy",L.length,col,sel?esc(sel.name):"",'data-k="grt"',!!sel)
   +'<div class="secb'+(col?' hide':'')+'">'+(col?'':L.map(x=>{const on=!!sel&&sel.id===x.id,n=grMemIds(x.id).length+1;
     return '<button type="button" class="prow wgr'+(on?' on':'')+'" data-wgr="'+esc(x.id)+'"><span class="cbx">'+CHECK+'</span><span class="pnm">'+grIco(x)+(typeof grNmTag==="function"?grNmTag(x):'<span>'+esc(x.name)+'</span>')+'</span></button>'}).join(""))+'</div>';
}
function whoListHtml(){
  if(ws.vis==="all")return '<div class="bsempty">🌍 Zaproszenie zobaczą wszyscy zalogowani, a wiadomość trafi na kanał Telegram.</div>';
  const q=ws.vis==="pick"?nickKey(ws.q.trim()):"",all=whoPeople().filter(id=>(!q||nickKey(nicks[id]).includes(q))&&(ws.vis!=="pick"||pfMatch("who",id)));
  if(ws.vis==="fav"){
    if(!favIds().length)return '<div class="bsempty">Nie masz jeszcze ulubionych. Dodasz ich, klikając czyjś nick → „☆ Dodaj do ulubionych”. Możesz też wybrać osoby ręcznie (👥 Wybieram).</div>';
    return '<div class="bsgrp">⭐ Ulubieni — zaproszeni wszyscy</div>'+all.filter(isFav).map(id=>whoRow(id,true)).join("");
  }
  if(!all.length)return '<div class="bsempty">'+(q?'Nie znaleziono takiego nicku.':pfOn("who")?'Nikt nie pasuje do filtra.':ws.mode==="add"?'Wszyscy są już zaproszeni.':whoEv()?'Nikt inny nie widzi jeszcze zakładki Imprezy (BETA — testerzy).':'Brak innych osób z nickiem.')+'</div>';
  const f=all.filter(isFav),o=all.filter(id=>!isFav(id));
  const two=!!(f.length&&o.length);   // jedna sekcja — bez zwijania
  const blk=(t,L,g)=>{if(!L.length)return '';const h=whoGrp(t,L,g,two),op=h.includes('class="secb');   // op = otwarty kontener sekcji do zamknięcia
    return h+(op&&whoColl(g)?'':L.map(id=>whoRow(id,ws.pick.has(id))).join(""))+(op?'</div>':'')};
  return blk('⭐ Ulubieni',f,'f')+blk(f.length?'Pozostali':'Osoby',o,'o');
}
const whoCount=()=>ws.vis==="all"?0:ws.vis==="fav"?favIds().length:ws.pick.size;
function renderWho(first){
  const p=$("whosheet");p.classList.remove("hide");
  if(first){
    const w=ws.mode==="add"?wants.find(x=>x.id===ws.want):null,ev=ws.mode==="ev"?evs.find(x=>x.id===ws.want):null;
    p.innerHTML='<div class="bsbox" role="dialog" aria-modal="true"><div class="bsgrab"></div><div class="bshead"><button type="button" class="lnk" data-k="cancel">Anuluj</button><b>'+(ws.mode==="grn"?"Kogo zaprosić do grupy?":ws.mode==="gr"?"Zaproś do grupy":ws.mode==="pl"?"Osoby na liście":ws.mode==="add"?"Zaproś kogoś jeszcze":whoEv()?"Zaproś na imprezę":"Kogo zapraszasz?")+'</b><span style="min-width:64px"></span></div>'
     +(ws.mode==="pl"&&plById(ws.want)?'<div class="note" id="wspln" style="margin-top:6px;text-align:center;font-size:14px"></div>':'')
     +(ws.mode==="gr"&&typeof grName==="function"?'<div class="note" style="margin-top:6px;text-align:center;font-size:14px">'+uiIcon("users")+' '+esc(grName(ws.want))+'</div>':'')
     +(ev?'<div class="note" style="margin-top:6px;text-align:center;font-size:14px">🏁 '+esc(ev.name)+' · '+esc(evDates(ev))+'</div>':'')
     +(ws.mode==="form"?'<div class="seg" id="wsseg">'+[["all","🌍 Wszyscy"],["fav","⭐ Ulubieni"],["pick","👥 Wybieram"]].map(([k,t])=>'<button type="button" data-v="'+k+'">'+t+'</button>').join("")+'</div>'
       :(w?'<div class="note" style="margin-top:6px;text-align:center;font-size:14px">Zaproszenie: '+esc(wfLabel(new Date(w.starts_at)))+(w.user_id!==uid&&nicks[w.user_id]?' · od '+esc(nicks[w.user_id]):'')+'</div>':''))
     +'<div class="wsqrow" id="wsqrow"><input class="bsq srch" id="wsq" type="search" placeholder="Szukaj nicku…" autocomplete="off"><button type="button" class="lnk hide" data-k="clr" id="wsclr"></button></div>'
     +'<div id="wspf"></div>'   // 🔎 filtry osób (KROK 68); 📋 listy — zwijana sekcja na górze listy osób
     +'<div class="bslist" id="wslist"></div><div id="wsplsave"></div>'
     +(whoEv()?'<textarea class="bsmsg" id="wsmsg" maxlength="120" rows="2" placeholder="Wiadomość (opcjonalnie), np. jedziemy razem 260?">'+esc(ws.msg||"")+'</textarea>':'')
     +'<div class="bshint" id="wshint"></div>'
     +'<button type="button" class="b big" id="wsok" data-k="ok"></button></div>';
  }
  const seg=$("wsseg");if(seg)[...seg.children].forEach(b=>b.classList.toggle("on",b.dataset.v===ws.vis));
  $("wsqrow").classList.toggle("hide",ws.vis!=="pick");
  const nUn=[...ws.pick].filter(id=>!whoLocked().has(id)).length,cb=$("wsclr");
  cb.textContent="Wyczyść ("+nUn+")";cb.classList.toggle("hide",ws.vis!=="pick"||!nUn);
  $("wslist").innerHTML=whoGrHtml()+whoPlHtml()+whoListHtml();
  const pn=$("wspln"),pl=ws.mode==="pl"&&plById(ws.want);if(pn&&pl)pn.innerHTML=plDot(pl)+esc(pl.name)+plEd(pl);   // nazwa listy (odświeża się po zmianie)
  $("wspf").innerHTML=ws.vis==="pick"&&whoPeople().length>8?pfChips("who"):"";
  const pm=ws.vis==="pick"&&ws.mode!=="pl"&&plOk&&ws.pick.size?plMatch([...ws.pick]):null;
  $("wsplsave").innerHTML=ws.vis==="pick"&&ws.mode!=="pl"&&plOk?(pm?'<div class="note wsplm">'+plDot(pm)+'To Twoja lista „'+esc(pm.name)+'”</div>'
    :ws.pick.size>=2&&plists.length<20?'<button type="button" class="lnk wsplm" data-k="plsave">📋 Zapisz wybór jako listę</button>':''):'';
  const jn=ws.mode==="form"&&wf.editId?(joins[wf.editId]||[]).filter(x=>x!==uid).length:0;
  const gSel=ws.mode==="form"&&ws.vis!=="all"&&ws.gr?grNm(ws.gr):"";
  $("wshint").textContent=gSel?"👥 Zobaczą wszyscy członkowie grupy „"+gSel+"” — także ci, którzy dołączą później"+(ws.vis==="fav"?" — i Twoi ulubieni":" — i osoby wybrane niżej")+". Nie trafi na publiczny kanał Telegram."+(jn?" Osoby, które już dołączyły ("+jn+"), zostaną zaproszone.":""):ws.mode==="grn"?(typeof grFree==="function"&&whoCount()>grFree()?"⚠️ Za dużo o "+(whoCount()-grFree())+" — wolnych miejsc w nowej grupie: "+grFree()+".":"👥 Zaproszenie dostaną po założeniu grupy. Wolnych miejsc: "+(typeof grFree==="function"?grFree():"")+"."):ws.mode==="gr"?"👥 Dostaną zaproszenie do grupy w aplikacji (⚙️ → Grupy). Członkiem zostanie ten, kto je przyjmie. Wyszarzeni już są w grupie albo mają zaproszenie.":ws.mode==="pl"?"📋 Tylko Ty widzisz tę listę. Osoby nie dostaną żadnego powiadomienia.":whoEv()?"Dostaną powiadomienie w aplikacji i od bota na Telegramie (jeśli go połączyli). Zaprosić można osoby, które widzą zakładkę Imprezy.":ws.vis==="all"?"":ws.mode==="add"?"Dostaną powiadomienie i zobaczą to zaproszenie.":"🔒 Zaproszenie zobaczą tylko wybrane osoby (i kogo one doproszą). Nie trafi na publiczny kanał Telegram."+(jn?" Osoby, które już dołączyły ("+jn+"), zostaną zaproszone.":"");
  const n=whoCount(),ok=$("wsok");
  ok.textContent=ws.mode==="grn"?"Gotowe · "+n+" "+plf(n,["osoba","osoby","osób"]):ws.mode==="gr"?(n?"Zaproś do grupy · "+n+" "+plf(n,["osobę","osoby","osób"]):"Wybierz osoby"):ws.mode==="pl"?"Zapisz · "+n+" "+plf(n,["osoba","osoby","osób"]):ws.mode==="ev"?(n?"Zaproś · "+n+" "+plf(n,["osobę","osoby","osób"]):"Wybierz osoby"):ws.mode==="evf"?(n?"Gotowe · "+n+" "+plf(n,["osoba","osoby","osób"]):"Gotowe · nikogo"):ws.mode==="add"?(n?"Zaproś · "+n+" "+plf(n,["osobę","osoby","osób"]):"Wybierz osoby"):ws.vis==="all"?"Gotowe · wszyscy":gSel?"Gotowe · 👥 "+gSel+(whoCount()?" + "+whoCount()+" "+plf(whoCount(),["osoba","osoby","osób"]):""):"Gotowe · "+n+" "+plf(n,["osoba","osoby","osób"]);
  ok.disabled=(ws.mode==="add"||ws.mode==="ev"||ws.mode==="gr")&&!n;
}
$("whosheet").addEventListener("click",async e=>{
  if(e.target===$("whosheet")){closeWho();return}
  const v=e.target.closest("button[data-v]");
  if(v){if(v.dataset.v==="pick"&&ws.vis==="fav"&&!ws.pick.size)ws.pick=new Set(favIds());ws.vis=v.dataset.v;if(ws.vis==="all")ws.gr="";renderWho();return}
  const gc=e.target.closest("[data-wgr]");   // 👥 grupa jednym kliknięciem (zaznacz / odznacz); z „Wszyscy” → wybrane osoby
  if(gc){const g=gc.dataset.wgr;ws.gr=ws.gr===g&&ws.vis!=="all"?"":g;if(ws.gr&&ws.vis==="all"){ws.vis="pick";ws.pick=new Set();whoLocked().forEach(id=>ws.pick.add(id))}renderWho();return}
  const lc=e.target.closest("[data-wpl]");   // 📋 lista jednym kliknięciem: zaznacz / odznacz wszystkich z listy
  if(lc){const A=whoPlAvail(lc.dataset.wpl),L=whoLocked();if(!A.length)return;
    if(ws.vis!=="pick"){ws.pick=new Set(ws.vis==="fav"?favIds():[]);whoLocked().forEach(id=>ws.pick.add(id));ws.vis="pick"}
    const all=A.every(id=>ws.pick.has(id));A.forEach(id=>{if(all){if(!L.has(id))ws.pick.delete(id)}else ws.pick.add(id)});
    renderWho();return}
  const r=e.target.closest(".prow");
  if(r){
    const id=r.dataset.p;
    if(whoLocked().has(id)){say((nicks[id]||"Ta osoba")+" już dołączył(a) — zostaje zaproszony(a).");return}
    if(whoDis().has(id)){say((nicks[id]||"Ta osoba")+" — "+whoDis().get(id)+".");return}
    if(ws.vis==="fav"){ws.vis="pick";ws.pick=new Set(favIds())}
    ws.pick.has(id)?ws.pick.delete(id):ws.pick.add(id);
    renderWho();return;
  }
  const k=e.target.closest("[data-k]");if(!k)return;
  if(k.dataset.k==="cancel"){closeWho();return}
  if(k.dataset.k==="plt"){ws.plOpen=!ws.plOpen;renderWho();return}
  if(k.dataset.k==="grt"){ws.grOpen=!ws.grOpen;renderWho();return}
  if(k.dataset.k==="gtog"){const g=k.dataset.g;ws.col[g]=!ws.col[g];renderWho();return}
  if(k.dataset.k==="plsave"){openPl("new",{ids:[...ws.pick].filter(id=>id!==uid)});return}
  if(ws.mode==="pl"){const l=plById(ws.want);if(!l){closeWho();return}
    const cur=new Set(plMem[l.id]||[]),add=[...ws.pick].filter(id=>!cur.has(id)),rm=plIds(l.id).filter(id=>!ws.pick.has(id));
    k.disabled=true;
    try{await plAdd(l.id,add);await plRemove(l.id,rm);closeWho();
      say(add.length||rm.length?"📋 Lista „"+l.name+"”: "+[add.length?"dodano "+add.length:"",rm.length?"usunięto "+rm.length:""].filter(Boolean).join(", "):"Bez zmian na liście „"+l.name+"”")}
    catch(err){k.disabled=false;say("Nie udało się: "+plErr(err))}
    plRefresh();return}
  if(k.dataset.k==="clr"){const L=whoLocked();ws.pick=new Set([...ws.pick].filter(id=>L.has(id)));renderWho();return}
  if(k.dataset.k==="grp"){const L=whoLocked(),q=nickKey(ws.q.trim()),
      D=whoDis(),ids=whoPeople().filter(id=>(!q||nickKey(nicks[id]).includes(q))&&pfMatch("who",id)&&(k.dataset.g==="f"?isFav(id):!isFav(id))&&!L.has(id)&&!D.has(id)),
      all=ids.every(id=>ws.pick.has(id));
    ids.forEach(id=>all?ws.pick.delete(id):ws.pick.add(id));renderWho();return}
  if(ws.mode==="gr"){const ids=[...ws.pick];if(!ids.length||typeof grInvite!=="function")return;k.disabled=true;   // 👥 KROK 70 (js/17)
    try{await grInvite(ws.want,ids);closeWho()}catch(err){k.disabled=false;say(grErr(err))}return}
  if(ws.mode==="grn"){const ids=[...ws.pick];closeWho();if(typeof grPicked==="function")grPicked(ids);return}
  if(ws.mode==="evf"){if(ef){ef.inv=[...ws.pick];ef.invMsg=String(ws.msg||"").trim().slice(0,120);const L=$("evsheet").querySelector(".bslist"),st=L?L.scrollTop:0;renderEvForm();const L2=$("evsheet").querySelector(".bslist");if(L2)L2.scrollTop=st}closeWho();return}
  if(ws.mode==="ev"){const ids=[...ws.pick];if(!ids.length)return;k.disabled=true;
    try{await evInvite(ws.want,ids,ws.msg);closeWho();renderEvents();say("🏁 Zaproszono: "+ids.map(id=>nicks[id]).join(", ")+" ✔ Dostaną powiadomienie.")}
    catch(err){k.disabled=false;say("Nie udało się zaprosić: "+(err&&err.message?err.message:"błąd"))}return}
  if(ws.mode==="form"){
    wf.vis=ws.vis;wf.pick=new Set(ws.vis==="pick"?ws.pick:[]);wf.gr=ws.vis==="all"?"":ws.gr||"";
    // 👥 członkowie wybranej grupy widzą zaproszenie przez grupę — bez osobnych wpisów (zostają tylko osoby, które już dołączyły)
    if(wf.gr&&typeof grMemIds==="function"){const M=new Set(grMemIds(wf.gr)),L=whoLocked();wf.pick=new Set([...wf.pick].filter(id=>!M.has(id)||L.has(id)))}
    if(wf.vis==="fav"&&wf.gr&&!favIds().length)wf.vis="pick";
    if(wf.vis==="pick"&&!wf.pick.size&&!wf.gr){wf.vis="all";say("Nikogo nie wybrano — zaproszenie zobaczą wszyscy.")}
    if(wf.vis==="fav"&&!favIds().length){wf.vis="all";say("Nie masz jeszcze ulubionych — zaproszenie zobaczą wszyscy.")}
    closeWho();renderWhoBtn();wfUpdate();try{wfRbSync()}catch(e){}return;
  }
  const ids=[...ws.pick];if(!ids.length)return;
  k.disabled=true;
  try{
    const res=await sb.from("want_invitees").insert(ids.map(u=>({want_id:ws.want,user_id:u,added_by:uid})));
    if(res.error)throw res.error;
    closeWho();await syncNow();
    say("Zaproszono: "+ids.map(id=>nicks[id]).join(", ")+" ✔ Dostaną powiadomienie.");
  }catch(err){k.disabled=false;say("Nie udało się zaprosić: "+(err&&err.message?err.message:"błąd"))}
});
$("whosheet").addEventListener("input",e=>{if(e.target.id==="wsmsg"){ws.msg=e.target.value;return}if(e.target.id==="wsq"){ws.q=e.target.value;$("wslist").innerHTML=whoGrHtml()+whoPlHtml()+whoListHtml()}});
/* ---------- zakres godzin, „Pasuje mi o…”, „Ustal godzinę” (KROK 15) ---------- */
let rangeOk=false,prefs={},decls={},autoAt=0;
const isOpen=w=>rangeOk&&!!w&&!!w.range_to&&!w.settled_at;
const fromRange=w=>rangeOk&&!!w&&!!w.range_to&&!!w.settled_at;
const wTime=w=>isOpen(w)?hhmm(new Date(w.range_from))+"–"+hhmm(new Date(w.range_to)):hhmm(new Date(w.starts_at));
const tkey=iso=>new Date(iso).getTime();
function wSlots(w){const a=[],t0=tkey(w.range_from),t1=tkey(w.range_to);for(let t=t0;t<=t1;t+=9e5)a.push(t);return a}
const inRange=(w,t)=>!w.range_to||(t>=tkey(w.range_from)&&t<=tkey(w.range_to));
// kto o której: [{t, ids}] — najwięcej osób pierwsze, przy remisie wcześniejsza godzina
function wTally(w){
  const m=new Map(),p=prefs[w.id]||{};
  (joins[w.id]||[]).forEach(u=>{if(u===w.user_id)return;const t=p[u]?tkey(p[u]):tkey(w.starts_at);if(!m.has(t))m.set(t,[]);m.get(t).push(u)});
  return [...m.entries()].map(([t,ids])=>({t,ids})).sort((a,b)=>b.ids.length-a.ids.length||a.t-b.t);
}
const wBest=w=>{const t=wTally(w);return t.length?t[0].t:tkey(w.range_from||w.starts_at)};
function declHtml(w){const d=(decls[w.id]||[]).filter(x=>x!==w.user_id);return d.length?'<div class="decl">Nie dam rady: '+favFirst(d).map(id=>nk(id)).join(" ")+'</div>':''}
// zestawienie odpowiedzi — zwinięte do jednego wiersza (wariant B)
function tallyHtml(w){
  const T=wTally(w),n=T.reduce((a,x)=>a+x.ids.length,0),k="tal"+w.id,max=T.length?T[0].ids.length:1;
  if(!n)return '<div class="meta">🕖 Na razie nikt nie wybrał godziny.</div>'+declHtml(w);
  const rows=T.slice().sort((a,b)=>a.t-b.t).map(x=>'<div><span class="tline'+(x.t===T[0].t?' best':'')+'"><span class="h">'+hhmm(new Date(x.t))+'</span>'
    +'<span class="bar" style="width:'+Math.max(10,Math.round(40*x.ids.length/max))+'px'+(inRange(w,x.t)?'':';background:var(--mut);opacity:.5')+'"></span>'
    +'<span class="ppl">'+favFirst(x.ids).map(id=>nk(id)).join("")+(inRange(w,x.t)?'':'<span class="note">poza zakresem</span>')+'</span></span></div>').join("");
  return '<details class="jlist" data-j="'+esc(k)+'"'+(joinOpen.has(k)?' open':'')+'><summary><span class="jf jfw">🕖 Odpowiedzi: '+n+' · najwięcej o '+hhmm(new Date(T[0].t))+'</span></summary><div class="jv">'+rows+'</div></details>'+declHtml(w);
}
async function setPref(w,t){
  const iso=new Date(t).toISOString(),joined=(joins[w.id]||[]).includes(uid);
  const r=joined?await sb.from("want_joins").update({pref_at:iso}).eq("want_id",w.id).eq("user_id",uid):await sb.from("want_joins").insert({want_id:w.id,pref_at:iso});
  if(r.error)throw r.error;
  if((decls[w.id]||[]).includes(uid))await sb.from("want_declines").delete().eq("want_id",w.id).eq("user_id",uid);
}
async function declineWant(w){
  // najpierw „Nie dam rady”, potem wypisanie — autor dostaje na Telegramie jedną wiadomość zamiast dwóch
  if(rangeOk&&!(decls[w.id]||[]).includes(uid)){const r=await sb.from("want_declines").insert({want_id:w.id});if(r.error&&r.error.code!=="23505")throw r.error}
  if((joins[w.id]||[]).includes(uid)){const r=await sb.from("want_joins").delete().eq("want_id",w.id).eq("user_id",uid);if(r.error)throw r.error}
}
async function settleWant(w,t){
  const r=await sb.from("wants").update({starts_at:new Date(t).toISOString(),settled_at:new Date().toISOString()}).eq("id",w.id).select("id");
  if(r.error||!r.data||!r.data.length)throw new Error(r.error?r.error.message:"brak uprawnień");
}
// przyciski godzin co 15 min (+ godziny spoza zakresu, które ktoś już wybrał) i „Inna godzina…”
function slotsHtml(w,sel,other){
  const C=new Map(wTally(w).map(x=>[x.t,x.ids.length])),ts=wSlots(w),extra=[...C.keys()].filter(t=>!ts.includes(t)).sort((a,b)=>a-b);
  return '<div class="slots">'+ts.concat(extra).map(t=>'<button type="button" class="slot'+(t===sel?' on':'')+'" data-t="'+t+'">'+hhmm(new Date(t))+(C.get(t)?'<span class="c">· '+C.get(t)+'</span>':'')+'</button>').join("")
   +'<button type="button" class="slot oth" data-t="oth">Inna godzina…</button></div>'
   +(other?'<div class="othin"><input type="time" id="othtime" step="900" value="'+hhmm(new Date(sel||tkey(w.range_to)))+'"><button type="button" class="b small" data-t="othok">OK</button></div>':'');
}
// godzina z pola „Inna godzina…” w dniu zaproszenia
function otherTime(w){
  const v=($("othtime")||{}).value||"";if(!/^\d\d:\d\d$/.test(v))return null;
  const d=new Date(w.range_from||w.starts_at),[h,m]=v.split(":").map(Number);d.setHours(h,m,0,0);
  if(w.range_to&&d<new Date(w.range_from)&&new Date(w.range_to).getDate()!==new Date(w.range_from).getDate())d.setDate(d.getDate()+1);   // godzina po północy zakresu (np. 01:00 przy 22:30–01:30)
  return d.getTime()<Date.now()-5*60000?null:d.getTime();
}
/* okienko wyboru godziny: „Kiedy możesz?” (zaproszony) albo „Ustal godzinę” (zapraszający) */
const pk={mode:"pref",want:null,sel:null,other:false};
function openPick(mode,id){
  const w=wants.find(x=>x.id===id);if(!w||!session)return;
  if(needProfile()){askNick();return}
  const my=(prefs[id]||{})[uid];
  pk.mode=mode;pk.want=id;pk.other=false;pk.sel=mode==="settle"?wBest(w):my?tkey(my):null;
  renderPick();
}
function closePick(){const p=$("picksheet");p.classList.add("hide");p.innerHTML=""}
function renderPick(){
  const w=wants.find(x=>x.id===pk.want),p=$("picksheet");if(!w||!isOpen(w)){closePick();return}
  const settle=pk.mode==="settle",d=new Date(w.range_from),wd=d.toLocaleDateString("pl-PL",{weekday:"long"});
  p.innerHTML='<div class="sheetbox popbox" role="dialog" aria-modal="true"><button class="sclose" data-k="close" aria-label="Zamknij">✕</button>'
   +'<span class="ptag">'+(settle?'✅ USTAL GODZINĘ':'🕖 KIEDY MOŻESZ?')+'</span>'
   +'<div class="ph">'+(settle?'Twoje zaproszenie':nk(w.user_id)+' zaprasza na rower')+'</div>'
   +wTitleHtml(w)+'<div class="pwhen">'+esc(relDay(d)+" "+wTime(w))+'<span>'+esc(wd)+'</span></div>'
   +(w.note?'<div class="pnote">💬 '+esc(w.note)+'</div>':'')
   +'<div class="pmeta">'+(settle?'Liczba = ilu osobom pasuje. Wybierz godzinę startu:':'Wybierz godzinę (liczba = ilu już ją wybrało):')+'</div>'
   +slotsHtml(w,pk.sel,pk.other)
   +'<button type="button" class="b big" data-k="ok"'+(pk.sel?'':' disabled')+'>'+(settle?'✅ Ustal: ':'Pasuje mi o ')+(pk.sel?hhmm(new Date(pk.sel)):'…')+'</button>'
   +(settle?'<div class="ptg">Zaproszeni i dołączeni dostaną powiadomienie. Kto wybrał inną godzinę, wypadnie z listy jadących i dostanie pytanie „Jadę?”.</div>'
     :'<div class="pbtns"><button type="button" class="b w" data-k="no">Nie dam rady</button></div>')
   +'</div>';
  p.classList.remove("hide");
}
$("picksheet").addEventListener("click",async e=>{
  const p=$("picksheet"),w=wants.find(x=>x.id===pk.want);
  if(e.target===p){closePick();return}
  const t=e.target.closest("[data-t]");
  if(t&&w){
    if(t.dataset.t==="oth"){pk.other=true;renderPick();const i=$("othtime");if(i)i.focus();return}
    if(t.dataset.t==="othok"){const v=otherTime(w);if(v==null){say("Podaj godzinę w dniu zaproszenia (nie w przeszłości).");return}pk.sel=v;pk.other=false;renderPick();return}
    pk.sel=+t.dataset.t;renderPick();return;
  }
  const k=e.target.closest("[data-k]");if(!k)return;
  if(k.dataset.k==="close"||!w){closePick();return}
  k.disabled=true;
  try{
    if(k.dataset.k==="ok"&&pk.sel){
      if(pk.mode==="settle"){await settleWant(w,pk.sel);say("✅ Ustalono "+wfLabel(new Date(pk.sel))+" — zaproszeni dostaną powiadomienie.")}
      else{await setPref(w,pk.sel);say("✔ Pasuje Ci "+hhmm(new Date(pk.sel))+" — "+nickOf(w.user_id)+" to zobaczy.")}
    }else if(k.dataset.k==="no"){await declineWant(w);say("OK — zapisano „Nie dam rady”.")}
    closePick();await syncNow();
  }catch(err){k.disabled=false;say("Nie udało się: "+(err&&err.message?err.message:"błąd"))}
});

