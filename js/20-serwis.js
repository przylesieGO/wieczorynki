/* 🔧 Serwis rowerowy — etap 1 (dodatek dla testerów, flaga „serwis_rowerowy”).
   ⚙️ → Edytuj profil → „Serwis rowerowy” (pod „Moje jazdy”): Moje rowery, dane roweru, przebieg (km z „Jak poszło?”),
   wymiany części z paskiem zużycia, zaplanowany serwis, rower w serwisie.
   Etap 1: dane TYLKO w tej przeglądarce (localStorage, osobno dla każdego konta), bez bazy i bez powiadomień w tle —
   przełączniki „Powiadom” zapisują samo ustawienie. Etap 2 (osobny KROK SQL): tabele bikes / bike_parts / bike_services, storage na paragony.
   Plik wczytywany po js/18: przy wczytaniu tylko rejestruje obsługę zdarzeń; js/05 woła svRow() / svHtml() przez typeof. */
const SV_TYPES=[["gravel","gravel","Gravel"],["mtb","mtb","MTB"],["road","road","Szosa"],["trek","bike","Trekking"],["ebike","ebike","E-bike"],["city","bike","Miejski"],["other","bike","Inny"]];
const SV_KINDS=[["std","Klasyczny"],["e","Ze wspomaganiem"]];
// części eksploatacyjne: [klucz, nazwa, km do wymiany (0 = bez paska)]
const SV_PARTS=[["chain","Łańcuch",2000],["cass","Kaseta",6000],["pads","Klocki hamulcowe",3000],["tyre","Opona",5000],["tube","Dętka",0],["cable","Linki / pancerze",5000],["other","Inna część",0]];
const SV_BEFORE=[["1","1 dzień"],["3","3 dni"],["7","Tydzień"]];
const SV_FREQ=[["once","Jednorazowo"],["daily","Codziennie"]];
const SV_STATUS=[["me","U mnie"],["svc","W serwisie"],["ready","Do odbioru"]];
let svD=null,svDFor="",svSel="",svRides=null,svRidesAt=0,svPartOpen=false,svPf={k:"chain",brand:"",price:"",date:"",doc:""},svSaveT=0,svRT=0;
const svOn=()=>!!session&&typeof feat==="function"&&feat("serwis_rowerowy");
const svKey=()=>"svBikes:"+uid;
const svToday=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const svNum=v=>{const n=parseFloat(String(v==null?"":v).replace(",",".").replace(/\s/g,""));return isFinite(n)?n:0};
const svKm=n=>Math.round(n).toLocaleString("pl-PL")+" km";
const svZl=n=>(Math.round(n*100)/100).toLocaleString("pl-PL",{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})+" zł";
const svDate=s=>{if(!s)return "";const [y,m,d]=s.split("-");return d&&m&&y?(+d)+"."+m+"."+y:esc(s)};
const svId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function svLoad(){
  if(svD&&svDFor===uid)return svD;
  let d=null;try{d=JSON.parse(localStorage.getItem(svKey())||"null")}catch(e){}
  svD=d&&Array.isArray(d.bikes)?d:{v:1,ask:false,active:"",hist:[],bikes:[]};svDFor=uid;
  if(!svD.bikes.some(b=>b.id===svSel))svSel=svD.active||(svD.bikes[0]&&svD.bikes[0].id)||"";
  return svD;
}
function svSave(now){
  clearTimeout(svSaveT);
  const w=()=>{try{localStorage.setItem(svKey(),JSON.stringify(svD))}catch(e){say("Nie udało się zapisać — pamięć przeglądarki jest pełna albo zablokowana.")}};
  if(now)w();else svSaveT=setTimeout(w,300);
}
const svBike=id=>svLoad().bikes.find(b=>b.id===id);
// 🚴 km z „Jak poszło?”: jazda trafia na rower aktywny w chwili jazdy (historia przełączeń), jeśli ma włączone „Dodawaj km z aplikacji”
function svRidesLoad(force){
  if(!session||(!force&&svRides&&Date.now()-svRidesAt<5*6e4))return;
  svRidesAt=Date.now();
  sb.from("ride_reports").select("want_id,km,ride_at").eq("user_id",uid).eq("went",true).not("km","is",null).limit(5000)
    .then(r=>{if(r.error)throw r.error;svRides=r.data||[];if(gearOpen&&gearView==="serwis")renderGear()})
    .catch(()=>{svRides=svRides||[]});
}
function svBikeOfRide(t){const h=svLoad().hist;let b="";for(const x of h){if(x.t<=t)b=x.b;else break}return b}
function svAppKm(b){
  if(b.demo||!b.app||!svRides)return 0;
  return svRides.reduce((a,r)=>a+(r.ride_at&&svBikeOfRide(r.ride_at)===b.id?(+r.km||0):0),0);
}
const svTotal=b=>svNum(b.kmStart)+svAppKm(b);
function svSetActive(id){
  const d=svLoad();if(d.active===id)return;
  d.active=id;d.hist.push({b:id,t:d.hist.length?new Date().toISOString():"1970-01-01T00:00:00Z"});   // pierwszy rower: wszystkie dotychczasowe jazdy
}
const svPartDef=k=>SV_PARTS.find(p=>p[0]===k)||SV_PARTS[SV_PARTS.length-1];
const svIcoT=t=>(SV_TYPES.find(x=>x[0]===t)||SV_TYPES[SV_TYPES.length-1])[1];
const svNameT=t=>(SV_TYPES.find(x=>x[0]===t)||SV_TYPES[SV_TYPES.length-1])[2];
// 🧪 przykładowy rower (tylko w tej przeglądarce): pokazuje, co potrafi sekcja; można w nim wszystko zmieniać,
// ale nie bywa aktywny i nie dostaje km z aplikacji; „Usuń przykład” bez pytania (da się przywrócić)
const svReal=()=>svLoad().bikes.filter(b=>!b.demo);
const svExTag='<span class="sv-ex">PRZYKŁAD</span>';
function svDemoBike(){
  const dd=n=>{const x=new Date(Date.now()+n*864e5);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
  const P=(k,brand,price,days,km,doc)=>{const def=svPartDef(k);return {id:svId(),k,name:def[1],brand,price,date:dd(days),km,life:def[2],doc:doc||""}};
  return {id:svId(),demo:true,name:"Szary gravel",type:"gravel",kind:"std",brand:"Kross",model:"Esker 4.0",buy:dd(-540),frame:"WTU000X0001",
    receipt:"paragon_rower.jpg",warranty:"gwarancja.pdf",app:false,kmStart:3420,
    parts:[P("chain","Shimano",129,-60,1900,"paragon_lancuch.jpg"),P("pads","Shimano",69,-150,600),P("tyre","Schwalbe",189,-40,2500),P("cass","Shimano",159,-200,600)],
    svc:{date:dd(40),notify:true,before:"3",freq:"once",name:"Serwis Pod Lasem",tel:"000 000 001"},status:"ready",pick:dd(1),pickNotify:true};
}

/* ⚙️ → Edytuj profil → wiersz „Serwis rowerowy” (pod „Moje jazdy”) */
function svRow(){
  if(!svOn())return "";
  const n=svReal().length;
  return gRow("#ff9500","wrench","Serwis rowerowy"+betaTag("serwis_rowerowy"),"Rowery, przebieg, wymiany, paragony",n?'<span class="ios-v">'+n+'</span>':'','data-sv="open"');
}

/* klocki ekranu */
const svIn=(f,v,ph,extra)=>'<input class="pe-in" id="sv-'+f+'" data-sf="'+f+'" value="'+esc(v==null?"":v)+'" placeholder="'+esc(ph)+'" aria-label="'+esc(ph)+'" autocomplete="off"'+(extra||' maxlength="60"')+'>';
const svLine=(col,ico,label,ctrl)=>'<label class="ios-it pe-row sv-ln"><span class="ios-ic" style="background:'+col+'">'+uiIcon(ico)+'</span><span class="sv-lb">'+label+'</span>'+ctrl+'</label>';
const svSeg=(f,opts,cur)=>'<div class="seg sv-seg'+(opts.length>3?' g3':'')+'">'+opts.map(([k,t])=>'<button type="button" data-sv="seg" data-f="'+f+'" data-v="'+k+'" class="'+(cur===k?"on":"")+'">'+t+'</button>').join("")+'</div>';
const svSw=(f,on,t,sub)=>'<div class="ios-it"><span class="ios-t">'+t+(sub?'<small>'+sub+'</small>':'')+'</span><button type="button" class="ios-sw'+(on?' on':'')+'" role="switch" aria-checked="'+!!on+'" aria-label="'+esc(t)+'" data-sv="sw" data-f="'+f+'"></button></div>';
const svDoc=(f,name,label)=>'<label class="ios-it pe-row sv-doc"><span class="ios-ic" style="background:#8e8e93">'+uiIcon("clip")+'</span><span class="ios-t">'+label+(name?'<small>'+esc(name)+'</small>':'<small>Zdjęcie albo PDF (opcja)</small>')+'</span>'
  +(name?'<button type="button" class="lnk sv-x" data-sv="docrm" data-f="'+f+'">Usuń</button>':'<span class="ios-v">Dodaj</span>')+'<input type="file" accept="image/*,application/pdf" class="sv-file" data-sfile="'+f+'"'+(name?' disabled':'')+'></label>';
function svWear(b,p){
  const life=+p.life||0;if(!life)return "";
  const used=Math.max(0,svTotal(b)-svNum(p.km)),pc=Math.min(100,Math.round(used/life*100)),cls=pc>=90?"bad":pc>=65?"mid":"ok";
  return '<div class="sv-wear '+cls+'" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pc+'" aria-label="Zużycie: '+pc+'%"><i style="width:'+Math.max(pc,3)+'%"></i></div><small class="sv-wt">'+pc+'% · wymiana co '+svKm(life)+'</small>';
}
function svPartRow(b,p){
  const ago=Math.max(0,Math.round(svTotal(b)-svNum(p.km)));
  return '<div class="ios-it sv-part"><span class="ios-ic" style="background:#ff9500">'+uiIcon("wrench")+'</span><span class="ios-t"><b>'+esc(p.name)+'</b>'+(p.brand?' · '+esc(p.brand):'')
    +'<small>'+[p.date?svDate(p.date):"",svKm(ago)+" temu",p.price!==""&&p.price!=null?svZl(svNum(p.price)):""].filter(Boolean).join(" · ")+'</small>'+svWear(b,p)
    +(p.doc?'<span class="sv-chip">'+uiIcon("clip")+esc(p.doc)+'</span>':'<label class="sv-chip add">'+uiIcon("plus")+'Dodaj paragon<input type="file" accept="image/*,application/pdf" class="sv-file" data-sfile="part" data-pid="'+esc(p.id)+'"></label>')+'</span>'
    +'<button type="button" class="pledb sv-del" data-sv="prm" data-pid="'+esc(p.id)+'" aria-label="Usuń wymianę: '+esc(p.name)+'" title="Usuń">'+uiIcon("trash")+'</button></div>';
}
function svPartForm(b){
  const f=svPf,def=svPartDef(f.k);
  return '<div class="ios-it sv-form"><div class="sv-chips">'+SV_PARTS.map(([k,t])=>'<button type="button" class="fch'+(f.k===k?' on':'')+'" data-sv="pk" data-v="'+k+'">'+t+'</button>').join("")+'</div>'
    +(f.k==="other"?'<input class="sv-fin" id="sv-pname" data-sp="name" value="'+esc(f.name||"")+'" placeholder="Nazwa części" maxlength="40">':'')
    +'<div class="sv-two"><input class="sv-fin" id="sv-pbrand" data-sp="brand" value="'+esc(f.brand)+'" placeholder="Marka, np. Shimano" maxlength="40"><input class="sv-fin" id="sv-pprice" data-sp="price" value="'+esc(f.price)+'" placeholder="Cena, zł" inputmode="decimal" maxlength="10"></div>'
    +'<div class="sv-two"><input class="sv-fin" type="date" id="sv-pdate" data-sp="date" value="'+esc(f.date||svToday())+'" aria-label="Data wymiany"><input class="sv-fin" id="sv-pkm" data-sp="km" value="'+esc(f.km!=null?f.km:Math.round(svTotal(b)))+'" placeholder="Przebieg przy wymianie" aria-label="Przebieg przy wymianie, km" inputmode="numeric" maxlength="7"></div>'
    +'<label class="sv-chip add sv-fdoc">'+uiIcon("cam")+(f.doc?esc(f.doc):'Dodaj paragon / zdjęcie (opcja)')+'<input type="file" accept="image/*,application/pdf" class="sv-file" data-sfile="form"></label>'
    +(def[2]?'<small class="note">Pasek zużycia: wymiana co '+svKm(def[2])+'.</small>':'')
    +'<div class="sv-two"><button type="button" class="b w" data-sv="pcancel">Anuluj</button><button type="button" class="b" data-sv="padd">Dodaj wymianę</button></div></div>';
}
function svDaysTo(s){if(!s)return null;const t=new Date(s+"T12:00:00").getTime(),n=new Date(svToday()+"T12:00:00").getTime();return Math.round((t-n)/864e5)}
const svWhen=n=>n==null?"":n===0?"dziś":n===1?"jutro":n===-1?"wczoraj":n>0?"za "+n+" "+plf(n,["dzień","dni","dni"]):Math.abs(n)+" "+plf(Math.abs(n),["dzień","dni","dni"])+" temu";

/* ⚙️ widok „serwis” — renderGear w js/05 */
function svHtml(){
  const d=svLoad();svRidesLoad();
  let h=backBtn()+'<div class="sname" style="margin-top:26px">Serwis rowerowy'+betaTag("serwis_rowerowy")+'</div><div class="smail">Rowery, przebieg, wymiany części i serwis.</div>';
  // 1. Moje rowery
  h+=gGrp("Moje rowery · "+d.bikes.length,d.bikes.map(b=>'<button type="button" class="ios-it ios-row sv-bike'+(b.id===d.active?' act':'')+(b.id===svSel?' sel':'')+'" data-sv="sel" data-bid="'+esc(b.id)+'"><span class="ios-ic" style="background:#ff9500">'+uiIcon(svIcoT(b.type))+'</span><span class="ios-t">'+esc(b.name||"Rower")+(b.demo?svExTag:"")
      +'<small>'+[svNameT(b.type),b.id===d.active?"aktywny":"",b.status==="svc"?"w serwisie":b.status==="ready"?"do odbioru":""].filter(Boolean).join(" · ")+'</small></span><span class="ios-v">'+svKm(svTotal(b))+'</span><span class="ios-chev" aria-hidden="true">›</span></button>')
    .concat([gRow("#34c759","plus","Dodaj rower","Gravel, MTB, szosa…","",'data-sv="add"'),
      d.bikes.length?"":gRow("#8e8e93","bike","Zobacz przykład","Rower z wymianami, paskami zużycia i serwisem","",'data-sv="ex"'),
      svReal().length>1?svSw("ask",d.ask,"Pytaj o rower przy jeździe","Na razie km idą na rower aktywny — pytanie przy „Jak poszło?” w kolejnej wersji"):""]));
  const b=svBike(svSel);
  if(!b)return h+'<p class="note pe-note">'+uiIcon("lock")+' Dodaj pierwszy rower — przebieg, wymiany części i terminy serwisu zapiszesz w jednym miejscu.</p>'+svNote();
  // 2. Rower
  h+=gGrp("Rower: "+esc(b.name||"bez nazwy")+(b.demo?svExTag:""),[
    svLine("#ff9500","pencil","Nazwa",svIn("name",b.name,"Np. Szary gravel")),
    '<div class="ios-it sv-col"><span class="sv-lb">Typ</span>'+svSeg("type",SV_TYPES.map(x=>[x[0],x[2]]),b.type)+'</div>',
    '<div class="ios-it sv-col"><span class="sv-lb">Rodzaj</span>'+svSeg("kind",SV_KINDS,b.kind||"std")+'</div>',
    svLine("#8e8e93","bike","Marka",svIn("brand",b.brand,"Np. Kross")),
    svLine("#8e8e93","tag","Model",svIn("model",b.model,"Np. Esker 4.0")),
    svLine("#0a84ff","cal","Data zakupu",'<input class="pe-in" type="date" id="sv-buy" data-sf="buy" value="'+esc(b.buy||"")+'" aria-label="Data zakupu">'),
    svLine("#636366","lock","Nr ramy",svIn("frame",b.frame,"Opcja")),
    svDoc("receipt",b.receipt,"Paragon zakupu"),
    svDoc("warranty",b.warranty,"Gwarancja"),
    b.demo?'<div class="ios-it"><span class="ios-t">Przykładowy rower<small>Możesz w nim wszystko zmieniać · km z aplikacji na niego nie trafiają</small></span></div>'
    :b.id===d.active?'<div class="ios-it"><span class="ios-t">Aktywny rower<small>Na niego trafiają km z „Jak poszło?”</small></span><span class="ios-v ok">'+uiIcon("check")+'Tak</span></div>'
      :'<button type="button" class="ios-it ios-row" data-sv="act"><span class="ios-t">Ustaw jako aktywny<small>Nowe jazdy z aplikacji będą liczone na ten rower</small></span><span class="ios-chev" aria-hidden="true">›</span></button>']);
  // 3. Przebieg
  const app=svAppKm(b);
  h+='<div class="ios"><div class="ios-gh">Przebieg</div><div class="ios-grp"><div class="ios-it sv-sum"><span class="sv-big">'+svKm(svTotal(b))+'</span><small>'+(b.demo?'przykładowy przebieg':b.app?'w tym z aplikacji: '+(svRides?svKm(app):"…"):'km z aplikacji wyłączone')+'</small></div>'
    +(b.demo?"":svSw("app",b.app,"Dodawaj km z aplikacji","Z „Jak poszło?”, gdy ten rower jest aktywny · „Km na start” = przebieg sprzed aplikacji"))
    +svLine("#8e8e93","road","Km na start",svIn("kmStart",b.kmStart,"0",' inputmode="numeric" maxlength="7"'))+'</div></div>';
  // 4. Wymiany części
  const parts=(b.parts||[]).slice().sort((x,y)=>(y.date||"").localeCompare(x.date||""));
  const cost=parts.reduce((a,p)=>a+svNum(p.price),0);
  h+='<div class="ios"><div class="ios-gh">Wymiany części'+(cost?' · '+svZl(cost):'')+'</div><div class="ios-grp">'+parts.map(p=>svPartRow(b,p)).join("")
    +(svPartOpen?svPartForm(b):gRow("#34c759","plus","Dodaj wymianę","Część, marka, cena, data","",'data-sv="popen"'))+'</div></div>';
  // 5. Zaplanowany serwis
  const s=b.svc||{},dn=svDaysTo(s.date);
  h+=gGrp("Zaplanowany serwis",[
    svLine("#0a84ff","cal","Termin"+(s.date?'<small'+(dn!=null&&dn<0?' class="sv-late"':'')+'>'+svWhen(dn)+'</small>':''),'<input class="pe-in" type="date" id="sv-sdate" data-ss="date" value="'+esc(s.date||"")+'" aria-label="Termin serwisu">'),
    svSw("s.notify",s.notify,"Powiadom","Wersja testowa: zapisujemy ustawienie, przypomnienia ruszą w kolejnej wersji"),
    s.notify?'<div class="ios-it sv-col"><span class="sv-lb">Na ile przed</span>'+svSeg("s.before",SV_BEFORE,s.before||"1")+'</div>':"",
    s.notify?'<div class="ios-it sv-col"><span class="sv-lb">Jak często</span>'+svSeg("s.freq",SV_FREQ,s.freq||"once")+'</div>':"",
    svLine("#8e8e93","wrench","Serwis",'<input class="pe-in" id="sv-sname" data-ss="name" value="'+esc(s.name||"")+'" placeholder="Nazwa (opcja)" aria-label="Nazwa serwisu" maxlength="60" autocomplete="off">'),
    svLine("#30d158","phone","Telefon",'<input class="pe-in" id="sv-stel" data-ss="tel" value="'+esc(s.tel||"")+'" placeholder="+48 600 123 456" aria-label="Telefon do serwisu" inputmode="tel" maxlength="20" autocomplete="off">'
      +(s.tel&&/\d{3}/.test(s.tel)?'<a class="b small sv-call" href="tel:'+esc(s.tel.replace(/[^\d+]/g,""))+'" aria-label="Zadzwoń do serwisu" title="Zadzwoń">'+uiIcon("call")+'</a>':''))]);
  // 6. Rower w serwisie
  const st=b.status||"me";
  h+=gGrp("Rower w serwisie",['<div class="ios-it sv-col">'+svSeg("status",SV_STATUS,st)+'</div>',
    st!=="me"?svLine("#ff9500","cal","Odbiór"+(b.pick?'<small>'+svWhen(svDaysTo(b.pick))+'</small>':''),'<input class="pe-in" type="date" id="sv-pick" data-sf="pick" value="'+esc(b.pick||"")+'" aria-label="Data odbioru">'):"",
    st!=="me"?svSw("pickNotify",b.pickNotify,"Powiadom o odbiorze","Wersja testowa: samo ustawienie"):""]);
  h+=b.demo?'<button class="sdanger" data-sv="exrm">Usuń przykład</button>':'<button class="sdanger" data-sv="del">Usuń rower „'+esc(b.name||"Rower")+'”…</button>';
  if(!b.demo&&!d.bikes.some(x=>x.demo))h+='<div class="sv-exl"><button type="button" class="lnk" data-sv="ex">Pokaż przykładowy rower</button></div>';
  return h+svNote();
}
const svNote=()=>'<p class="note pe-note">'+uiIcon("lock")+' Dane widzisz tylko Ty. Wersja testowa: zapisane tylko w tej przeglądarce — na innym telefonie ich nie będzie. Pliki paragonów nie są jeszcze wysyłane (zapisujemy samą nazwę).</p>';

/* 🖱 zdarzenia w ⚙️ (atrybuty data-sv / data-sf / data-ss / data-sp — nie kolidują z data-c w js/05) */
function svSetPath(o,f,v){if(f.startsWith("s.")){o.svc=o.svc||{};o.svc[f.slice(2)]=v}else o[f]=v}
$("gearpanel").addEventListener("click",async e=>{
  const t=e.target.closest("[data-sv]");if(!t||!session)return;
  const a=t.dataset.sv,d=svLoad(),b=svBike(svSel);
  if(a==="open"){if(!svOn())return;if(gearView==="nick")gearFrom="nick";gearView="serwis";svPartOpen=false;svRidesLoad(true);renderGear();return}
  if(a==="ex"){if(d.bikes.some(x=>x.demo))return;const nb=svDemoBike();d.bikes.push(nb);svSel=nb.id;svPartOpen=false;svSave(1);renderGear();
    say("🚲 Przykładowy rower — możesz w nim wszystko zmieniać. Usuniesz go jednym kliknięciem.");return}
  if(a==="add"){const n=svReal().length+1,nb={id:svId(),name:"Rower "+n,type:"gravel",kind:"std",app:true,kmStart:"",parts:[],svc:{},status:"me"};
    d.bikes.push(nb);svSel=nb.id;if(!d.active)svSetActive(nb.id);svSave(1);renderGear();
    const i=$("sv-name");if(i){i.focus();i.select()}return}
  if(a==="sel"){svSel=t.dataset.bid;svPartOpen=false;renderGear();return}
  if(a==="sw"&&t.dataset.f==="ask"){d.ask=!d.ask;svSave(1);renderGear();return}
  if(!b)return;
  if(a==="exrm"){if(!b.demo)return;d.bikes=d.bikes.filter(x=>x!==b);svSel=d.active||(d.bikes[0]&&d.bikes[0].id)||"";svPartOpen=false;svSave(1);renderGear();
    say("Usunięto przykład. Przywrócisz go linkiem „Pokaż przykładowy rower”.");return}
  if(a==="act"){if(b.demo)return;svSetActive(b.id);svSave(1);renderGear();say("🚲 Aktywny rower: "+(b.name||"Rower"));return}
  if(a==="seg"){svSetPath(b,t.dataset.f,t.dataset.v);svSave(1);renderGear();return}
  if(a==="sw"){const f=t.dataset.f,cur=f.startsWith("s.")?(b.svc||{})[f.slice(2)]:b[f];svSetPath(b,f,!cur);svSave(1);renderGear();return}
  if(a==="docrm"){e.preventDefault();b[t.dataset.f]="";svSave(1);renderGear();return}
  if(a==="popen"){svPartOpen=true;svPf={k:"chain",brand:"",price:"",date:svToday(),doc:"",km:Math.round(svTotal(b))};renderGear();return}
  if(a==="pcancel"){svPartOpen=false;renderGear();return}
  if(a==="pk"){svPf.k=t.dataset.v;renderGear();return}
  if(a==="padd"){const def=svPartDef(svPf.k),name=svPf.k==="other"?(svPf.name||"").trim():def[1];
    if(!name){say("Wpisz nazwę części.");return}
    b.parts=b.parts||[];b.parts.push({id:svId(),k:svPf.k,name,brand:(svPf.brand||"").trim(),price:svPf.price===""?"":svNum(svPf.price),date:svPf.date||svToday(),km:svNum(svPf.km),life:def[2],doc:svPf.doc||""});
    svPartOpen=false;svSave(1);renderGear();say("🔧 Dodano wymianę: "+name);return}
  if(a==="prm"){const p=(b.parts||[]).find(x=>x.id===t.dataset.pid);if(!p)return;
    if(!await askOk("Usunąć wymianę „"+p.name+"”"+(p.date?" z "+svDate(p.date):"")+"?","Usuń",1))return;
    b.parts=b.parts.filter(x=>x!==p);svSave(1);renderGear();return}
  if(a==="del"){if(!await askOk("Usunąć rower „"+(b.name||"Rower")+"” razem z historią wymian? Tego nie da się cofnąć.","Usuń",1))return;
    d.bikes=d.bikes.filter(x=>x!==b);if(d.active===b.id){d.active="";const nx=d.bikes.find(x=>!x.demo);if(nx)svSetActive(nx.id)}
    svSel=d.active||(d.bikes[0]&&d.bikes[0].id)||"";svSave(1);renderGear();say("Usunięto rower.");return}
});
// ✏️ pola: zapis na bieżąco (bez przerysowania — kursor zostaje), przerysowanie przy „change” (sumy, nagłówki)
$("gearpanel").addEventListener("input",e=>{
  const i=e.target;if(gearView!=="serwis"||!i.dataset)return;
  if(i.dataset.sp){svPf[i.dataset.sp]=i.value;return}
  const b=svBike(svSel);if(!b)return;
  if(i.dataset.sf){b[i.dataset.sf]=i.value;svSave()}
  else if(i.dataset.ss){b.svc=b.svc||{};b.svc[i.dataset.ss]=i.value;svSave()}
});
$("gearpanel").addEventListener("change",e=>{
  const i=e.target;if(gearView!=="serwis"||!i.dataset)return;
  if(i.dataset.sfile){   // etap 1: sama nazwa pliku (bez wysyłania)
    const f=i.files&&i.files[0];if(!f)return;const nm=f.name.slice(0,60),b=svBike(svSel);
    if(i.dataset.sfile==="form")svPf.doc=nm;
    else if(b&&i.dataset.sfile==="part"){const p=(b.parts||[]).find(x=>x.id===i.dataset.pid);if(p)p.doc=nm}
    else if(b)b[i.dataset.sfile]=nm;
    svSave(1);renderGear();return}
  if(i.dataset.sf||i.dataset.ss){svSave(1);clearTimeout(svRT);svRT=setTimeout(()=>{if(gearOpen&&gearView==="serwis")renderGear()},300)}   // po chwili: klik w kolejny przycisk (blur → change) nie ginie
});
