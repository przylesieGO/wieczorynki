/* 🔧 Serwis rowerowy — etap 2 (dodatek dla testerów, flaga „serwis_rowerowy”; baza: KROK 88).
   ⚙️ → Edytuj profil → „Serwis rowerowy” (pod „Moje jazdy”): Moje rowery, dane roweru, przebieg (km z „Jak poszło?”),
   wymiany części z paskiem zużycia, paragony i gwarancje (prywatny bucket bike-docs), zaplanowany serwis, rower w serwisie.
   Dane w bazie (bikes / bike_parts / bike_files / bike_rides), widzi je tylko właściciel. Bez Realtime i bez sync_since:
   pobierane przy wejściu na ekran (najwyżej co minutę). Przypomnienia: Cron bike_remind → 🔔 bike_svc / bike_pick + Telegram.
   Lokalnie (localStorage „svBikes:<uid>”) zostają tylko: przykładowy rower, „Pytaj o rower” i znacznik przeniesienia z etapu 1.
   Plik wczytywany po js/18: przy wczytaniu tylko rejestruje obsługę zdarzeń; js/05, js/11 wołają svRow() / svHtml() / svBell*() przez typeof. */
const SV_TYPES=[["gravel","gravel","Gravel"],["mtb","mtb","MTB"],["road","road","Szosa"],["ebike","ebike","E-bike"],["city","bike","Miejski"],["other","bike","Inny"]];
// części eksploatacyjne: [klucz, nazwa, km do wymiany (0 = bez paska)]
const SV_PARTS=[["chain","Łańcuch",2000],["cass","Kaseta",6000],["pads","Klocki hamulcowe",3000],["tyre","Opona",5000],["tube","Dętka",0],["cable","Linki / pancerze",5000],["other","Inna część",0]];
const SV_BEFORE=[["1","1 dzień"],["3","3 dni"],["7","Tydzień"]];
const SV_FREQ=[["once","Jednorazowo"],["daily","Codziennie"]];
const SV_STATUS=[["me","U mnie"],["svc","W serwisie"],["ready","Do odbioru"]];
const SV_MAXF=1048576,SV_BUCKET="bike-docs";
let svD=null,svSel="",svPartOpen=false,svPf={k:"chain",brand:"",price:"",date:"",doc:"",file:null},svSaveT=0,svRT=0,svDirty=new Set(),svBusy=false;
const svOn=()=>!!session&&typeof feat==="function"&&feat("serwis_rowerowy");
const svKey=()=>"svBikes:"+uid;
const svToday=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const svNum=v=>{const n=parseFloat(String(v==null?"":v).replace(",",".").replace(/\s/g,""));return isFinite(n)?n:0};
const svKm=n=>Math.round(n).toLocaleString("pl-PL")+" km";
const svZl=n=>(Math.round(n*100)/100).toLocaleString("pl-PL",{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})+" zł";
const svDate=s=>{if(!s)return "";const [y,m,d]=s.split("-");return d&&m&&y?(+d)+"."+m+"."+y:esc(s)};
const svId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const svErr=e=>{const m=(e&&e.message)||String(e||"");return /bikes|bike_|schema cache|does not exist|PGRST20/.test(m)&&!/Limit|rower|plik|część/i.test(m)?"Serwis wymaga KROKU 88 w bazie.":m||"błąd"};

/* 💾 lokalnie: przykład, „Pytaj o rower”, znacznik przeniesienia */
function svLocal(){let d=null;try{d=JSON.parse(localStorage.getItem(svKey())||"null")}catch(e){}return d&&typeof d==="object"?d:{v:2,ask:false,bikes:[]}}
function svLocalSave(){if(!svD)return;const L=svLocal();L.v=2;L.ask=!!svD.ask;L.moved=true;L.bikes=svD.bikes.filter(b=>b.demo);delete L.hist;delete L.active;
  try{localStorage.setItem(svKey(),JSON.stringify(L))}catch(e){}}

/* ⬇️ baza → obiekty ekranu (te same pola co w etapie 1) */
const svFromRow=(r,P,F,K)=>({id:r.id,name:r.name,type:r.type,brand:r.brand||"",model:r.model||"",buy:r.buy_date||"",frame:r.frame||"",kmStart:r.km_start||"",
  app:r.app,active:r.active,status:r.status,pick:r.pick_date||"",pickNotify:r.pick_notify,appKm:K[r.id]||0,created:r.created_at,
  svc:{date:r.svc_date||"",notify:r.svc_notify,before:String(r.svc_before||1),freq:r.svc_freq,name:r.svc_name||"",tel:r.svc_tel||""},
  files:{receipt:F.find(f=>f.bike_id===r.id&&f.kind==="receipt")||null,warranty:F.find(f=>f.bike_id===r.id&&f.kind==="warranty")||null},
  nfiles:F.filter(f=>f.bike_id===r.id).length,
  parts:P.filter(p=>p.bike_id===r.id).map(p=>({id:p.id,k:p.k,name:p.name,brand:p.brand||"",price:p.price==null?"":+p.price,date:p.date||"",km:p.km==null?"":p.km,life:p.life,
    file:F.find(f=>f.part_id===p.id)||null}))});
// ⬆️ obiekt ekranu → wiersz bikes (puste pola = null, liczby przycięte do zakresu z bazy)
function svToRow(b){
  const t=v=>{v=String(v==null?"":v).trim();return v?v:null},s=b.svc||{},km=Math.round(svNum(b.kmStart));
  return {name:(t(b.name)||"Rower").slice(0,40),type:b.type,brand:t(b.brand),model:t(b.model),buy_date:t(b.buy),frame:t(b.frame),km_start:Math.max(0,Math.min(1e6,km)),
    app:!!b.app,status:b.status||"me",pick_date:t(b.pick),pick_notify:!!b.pickNotify,svc_date:t(s.date),svc_notify:!!s.notify,svc_before:+(s.before||1),
    svc_freq:s.freq==="daily"?"daily":"once",svc_name:t(s.name),svc_tel:t(s.tel)};
}

// przykład zapisany przez etap 1: pliki jako same nazwy (receipt / warranty / doc) → obiekty {name, demo}
function svDemoFix(b){
  const f=n=>n?{name:String(n).slice(0,60),demo:true}:null;
  if(!b.files){b.files={receipt:f(b.receipt),warranty:f(b.warranty)};delete b.receipt;delete b.warranty}
  delete b.kind;b.svc=b.svc||{};
  b.parts=(b.parts||[]).map(p=>{if(p.file===undefined){p.file=f(p.doc);delete p.doc}return p});
  return b;
}
/* 🔄 wczytanie (z jednorazowym przeniesieniem danych z etapu 1) */
function svLoad(){
  if(!svD||svD.for!==uid){const L=svLocal();svD={for:uid,ask:!!L.ask,bikes:(L.bikes||[]).filter(b=>b.demo).map(svDemoFix),loaded:false,at:0,err:""};svSel=""}
  return svD;
}
async function svFetch(force){
  const d=svLoad();if(!session||svBusy||(!force&&d.loaded&&Date.now()-d.at<6e4))return;
  svBusy=true;
  try{
    const L=svLocal();
    if(!L.moved&&(L.bikes||[]).some(b=>!b.demo)){   // 📦 etap 1 → baza (raz; przykład zostaje lokalny)
      const r=await sb.rpc("bikes_import",{p:L});if(r.error)throw r.error;
      try{localStorage.setItem("svBikesOld:"+uid,JSON.stringify(L))}catch(e){}
      L.moved=true;L.bikes=L.bikes.filter(b=>b.demo);try{localStorage.setItem(svKey(),JSON.stringify(L))}catch(e){}
      if(r.data&&r.data.ok&&r.data.bikes)say("🔧 Przeniesiono rowery do bazy: "+r.data.bikes+(r.data.rides?" · jazd: "+r.data.rides:"")+". Teraz widać je na każdym urządzeniu.");
    }
    const [B,P,F,K]=await Promise.all([sb.from("bikes").select("*").order("created_at").limit(20),sb.from("bike_parts").select("*").limit(2000),
      sb.from("bike_files").select("id,bike_id,part_id,kind,path,name,size,mime").limit(300),sb.rpc("bike_app_km")]);
    for(const x of [B,P,F,K])if(x.error)throw x.error;
    const km={};(K.data||[]).forEach(x=>{km[x.bike_id]=+x.km||0});
    const keepLocal=svDirty.size?new Map(d.bikes.filter(b=>svDirty.has(b.id)).map(b=>[b.id,b])):new Map();   // niezapisane zmiany nie giną
    d.bikes=(B.data||[]).map(r=>keepLocal.get(r.id)||svFromRow(r,P.data||[],F.data||[],km)).concat(d.bikes.filter(b=>b.demo));
    d.loaded=true;d.at=Date.now();d.err="";
  }catch(err){d.err=svErr(err);d.at=Date.now()}
  finally{svBusy=false}
  if(!d.bikes.some(b=>b.id===svSel))svSel=svActive()||(d.bikes[0]&&d.bikes[0].id)||"";
  if(gearOpen&&gearView==="serwis"&&!/^(INPUT|TEXTAREA)$/.test((document.activeElement||{}).tagName||""))renderGear();
  if(typeof renderBell==="function"&&svBellN())renderBell();
}
const svActive=()=>{const b=svLoad().bikes.find(x=>x.active&&!x.demo);return b?b.id:""};
const svBike=id=>svLoad().bikes.find(b=>b.id===id);
const svReal=()=>svLoad().bikes.filter(b=>!b.demo);

/* 💾 zapis pól roweru z opóźnieniem (kursor nie ginie); now = od razu */
function svSave(b,now){
  if(!b)return;
  if(b.demo){svLocalSave();return}
  svDirty.add(b.id);clearTimeout(svSaveT);
  if(now)return svFlush();svSaveT=setTimeout(svFlush,600);
}
async function svFlush(){
  clearTimeout(svSaveT);const ids=[...svDirty];svDirty.clear();
  for(const id of ids){const b=svBike(id);if(!b)continue;
    const r=await sb.from("bikes").update(svToRow(b)).eq("id",id);
    if(r.error){say("Nie zapisano roweru: "+svErr(r.error));svFetch(true)}}
}
const svAppKm=b=>b.demo||!b.app?0:(+b.appKm||0);
const svTotal=b=>svNum(b.kmStart)+svAppKm(b);
const svPartDef=k=>SV_PARTS.find(p=>p[0]===k)||SV_PARTS[SV_PARTS.length-1];
const svIcoT=t=>(SV_TYPES.find(x=>x[0]===t)||SV_TYPES[SV_TYPES.length-1])[1];
const svNameT=t=>(SV_TYPES.find(x=>x[0]===t)||SV_TYPES[SV_TYPES.length-1])[2];

/* 🧪 przykładowy rower (tylko w tej przeglądarce): pokazuje, co potrafi sekcja; można w nim wszystko zmieniać,
   ale nie bywa aktywny, nie dostaje km z aplikacji i nie wysyła plików; „Usuń przykład” bez pytania (da się przywrócić) */
const svExTag='<span class="sv-ex">PRZYKŁAD</span>';
function svDemoBike(){
  const dd=n=>{const x=new Date(Date.now()+n*864e5);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
  const f=n=>({name:n,demo:true});
  const P=(k,brand,price,days,km,doc)=>{const def=svPartDef(k);return {id:svId(),k,name:def[1],brand,price,date:dd(days),km,life:def[2],file:doc?f(doc):null}};
  return {id:"demo-"+svId(),demo:true,name:"Szary gravel",type:"gravel",brand:"Kross",model:"Esker 4.0",buy:dd(-540),frame:"WTU000X0001",
    files:{receipt:f("paragon_rower.jpg"),warranty:f("gwarancja.pdf")},app:false,kmStart:3420,
    parts:[P("chain","Shimano",129,-60,1900,"paragon_lancuch.jpg"),P("pads","Shimano",69,-150,600),P("tyre","Schwalbe",189,-40,2500),P("cass","Shimano",159,-200,600)],
    svc:{date:dd(40),notify:true,before:"3",freq:"once",name:"Serwis Pod Lasem",tel:"000 000 001"},status:"ready",pick:dd(1),pickNotify:true};
}

/* 📎 pliki: zdjęcie zmniejszane w przeglądarce (≤1600 px, JPEG), PDF do 1 MB; ścieżka <uid>/<rower>/<plik> */
function svShrink(file){
  return new Promise((ok,no)=>{
    const u=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{URL.revokeObjectURL(u);
      const go=(max,q)=>{const s=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement("canvas");
        c.width=Math.max(1,Math.round(im.naturalWidth*s));c.height=Math.max(1,Math.round(im.naturalHeight*s));
        const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
        c.toBlob(bl=>{if(!bl)return no(new Error("Nie udało się przygotować zdjęcia."));
          if(bl.size<=SV_MAXF)return ok(bl);if(max>900)return go(max-400,Math.max(.6,q-.1));no(new Error("Zdjęcie jest za duże nawet po zmniejszeniu."))},"image/jpeg",q)};
      go(1600,.8)};
    im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("Nie udało się odczytać zdjęcia (wybierz JPG, PNG albo PDF)."))};
    im.src=u;
  });
}
async function svUpload(b,kind,partId,file){
  if(!file)return null;
  if(b.nfiles>=20)throw new Error("Limit: najwyżej 20 plików na rower.");
  let blob=file,mime=file.type,ext="pdf";
  if(mime==="application/pdf"){if(file.size>SV_MAXF)throw new Error("PDF może mieć najwyżej 1 MB.")}
  else if(/^image\//.test(mime)||!mime){blob=await svShrink(file);mime="image/jpeg";ext="jpg"}
  else throw new Error("Dodaj zdjęcie albo PDF.");
  const path=uid+"/"+b.id+"/"+svId()+"."+ext,nm=(file.name||("plik."+ext)).replace(/[\u0000-\u001f]/g,"").slice(0,80)||"plik."+ext;
  const u=await sb.storage.from(SV_BUCKET).upload(path,blob,{contentType:mime,upsert:false});if(u.error)throw u.error;
  const r=await sb.from("bike_files").insert({bike_id:b.id,part_id:partId||null,kind,path,name:nm,size:blob.size,mime}).select("id,bike_id,part_id,kind,path,name,size,mime").single();
  if(r.error){sb.storage.from(SV_BUCKET).remove([path]).catch(()=>{});throw r.error}
  b.nfiles=(b.nfiles||0)+1;return r.data;
}
async function svFileRm(b,f){
  if(!f||f.demo)return;
  const s=await sb.storage.from(SV_BUCKET).remove([f.path]);if(s.error)throw s.error;
  const r=await sb.from("bike_files").delete().eq("id",f.id);if(r.error)throw r.error;
  b.nfiles=Math.max(0,(b.nfiles||1)-1);
}
async function svFileView(f){
  if(!f)return;if(f.demo){say("To przykładowy plik — w przykładzie pliki się nie wysyłają.");return}
  const w=window.open("","_blank");   // od razu (blokada wyskakujących okien), adres po podpisaniu
  const r=await sb.storage.from(SV_BUCKET).createSignedUrl(f.path,120);
  if(r.error||!r.data){if(w)w.close();say("Nie udało się otworzyć pliku: "+svErr(r.error));return}
  if(w)w.location.href=r.data.signedUrl;else location.href=r.data.signedUrl;
}
// 🗑 „Usuń moje konto” (js/05): najpierw pliki w storage (baza nie kasuje obiektów sama), potem kaskada w bazie
async function svWipeFiles(){
  if(!session)return;
  try{const top=await sb.storage.from(SV_BUCKET).list(uid,{limit:100});if(top.error)return;
    for(const d of top.data||[]){const l=await sb.storage.from(SV_BUCKET).list(uid+"/"+d.name,{limit:100});
      const ps=(l.data||[]).filter(x=>x.id).map(x=>uid+"/"+d.name+"/"+x.name);if(ps.length)await sb.storage.from(SV_BUCKET).remove(ps)}}
  catch(e){}
}

/* ⚙️ → Edytuj profil → wiersz „Serwis rowerowy” (pod „Moje jazdy”) */
function svRow(){
  if(!svOn())return "";
  const d=svLoad();if(!d.loaded)setTimeout(()=>svFetch(),0);
  const n=svReal().length;
  return gRow("#ff9500","wrench","Serwis rowerowy"+betaTag("serwis_rowerowy"),"Rowery, przebieg, wymiany, paragony",n?'<span class="ios-v">'+n+'</span>':'','data-sv="open"');
}

/* klocki ekranu */
const svIn=(f,v,ph,extra)=>'<input class="pe-in" id="sv-'+f+'" data-sf="'+f+'" value="'+esc(v==null?"":v)+'" placeholder="'+esc(ph)+'" aria-label="'+esc(ph)+'" autocomplete="off"'+(extra||' maxlength="40"')+'>';
const svLine=(col,ico,label,ctrl)=>'<label class="ios-it pe-row sv-ln"><span class="ios-ic" style="background:'+col+'">'+uiIcon(ico)+'</span><span class="sv-lb">'+label+'</span>'+ctrl+'</label>';
const svSeg=(f,opts,cur)=>'<div class="seg sv-seg'+(opts.length>3?' g3':'')+'">'+opts.map(([k,t])=>'<button type="button" data-sv="seg" data-f="'+f+'" data-v="'+k+'" class="'+(cur===k?"on":"")+'">'+t+'</button>').join("")+'</div>';
const svSw=(f,on,t,sub)=>'<div class="ios-it"><span class="ios-t">'+t+(sub?'<small>'+sub+'</small>':'')+'</span><button type="button" class="ios-sw'+(on?' on':'')+'" role="switch" aria-checked="'+!!on+'" aria-label="'+esc(t)+'" data-sv="sw" data-f="'+f+'"></button></div>';
const svAccept="image/*,application/pdf";
function svDoc(kind,f,label){
  if(f)return '<div class="ios-it pe-row sv-doc"><span class="ios-ic" style="background:#8e8e93">'+uiIcon("clip")+'</span><button type="button" class="ios-t sv-open" data-sv="fview" data-fk="'+kind+'">'+label+'<small>'+esc(f.name)+' · pokaż</small></button>'
    +'<button type="button" class="lnk sv-x" data-sv="docrm" data-fk="'+kind+'">Usuń</button></div>';
  return '<label class="ios-it pe-row sv-doc"><span class="ios-ic" style="background:#8e8e93">'+uiIcon("clip")+'</span><span class="ios-t">'+label+'<small>Zdjęcie albo PDF (opcja, do 1 MB)</small></span>'
    +'<span class="ios-v">Dodaj</span><input type="file" accept="'+svAccept+'" class="sv-file" data-sfile="'+kind+'"></label>';
}
function svWear(b,p){
  const life=+p.life||0;if(!life)return "";
  const used=Math.max(0,svTotal(b)-svNum(p.km)),pc=Math.min(100,Math.round(used/life*100)),cls=pc>=90?"bad":pc>=65?"mid":"ok";
  return '<div class="sv-wear '+cls+'" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pc+'" aria-label="Zużycie: '+pc+'%"><i style="width:'+Math.max(pc,3)+'%"></i></div><small class="sv-wt">'+pc+'% · wymiana co '+svKm(life)+'</small>';
}
function svPartRow(b,p){
  const ago=Math.max(0,Math.round(svTotal(b)-svNum(p.km)));
  return '<div class="ios-it sv-part"><span class="ios-ic" style="background:#ff9500">'+uiIcon("wrench")+'</span><span class="ios-t"><b>'+esc(p.name)+'</b>'+(p.brand?' · '+esc(p.brand):'')
    +'<small>'+[p.date?svDate(p.date):"",p.km!==""&&p.km!=null?svKm(ago)+" temu":"",p.price!==""&&p.price!=null?svZl(svNum(p.price)):""].filter(Boolean).join(" · ")+'</small>'+svWear(b,p)
    +(p.file?'<span class="sv-chip"><button type="button" class="sv-cv" data-sv="pview" data-pid="'+esc(p.id)+'">'+uiIcon("clip")+esc(p.file.name)+'</button><button type="button" class="sv-cx" data-sv="pfrm" data-pid="'+esc(p.id)+'" aria-label="Usuń plik: '+esc(p.file.name)+'" title="Usuń plik">×</button></span>'
      :'<label class="sv-chip add">'+uiIcon("plus")+'Dodaj paragon<input type="file" accept="'+svAccept+'" class="sv-file" data-sfile="part" data-pid="'+esc(p.id)+'"></label>')+'</span>'
    +'<button type="button" class="pledb sv-del" data-sv="prm" data-pid="'+esc(p.id)+'" aria-label="Usuń wymianę: '+esc(p.name)+'" title="Usuń">'+uiIcon("trash")+'</button></div>';
}
function svPartForm(b){
  const f=svPf,def=svPartDef(f.k);
  return '<div class="ios-it sv-form"><div class="sv-chips">'+SV_PARTS.map(([k,t])=>'<button type="button" class="fch'+(f.k===k?' on':'')+'" data-sv="pk" data-v="'+k+'">'+t+'</button>').join("")+'</div>'
    +(f.k==="other"?'<input class="sv-fin" id="sv-pname" data-sp="name" value="'+esc(f.name||"")+'" placeholder="Nazwa części" maxlength="40">':'')
    +'<div class="sv-two"><input class="sv-fin" id="sv-pbrand" data-sp="brand" value="'+esc(f.brand)+'" placeholder="Marka, np. Shimano" maxlength="40"><input class="sv-fin" id="sv-pprice" data-sp="price" value="'+esc(f.price)+'" placeholder="Cena, zł" inputmode="decimal" maxlength="10"></div>'
    +'<div class="sv-two"><input class="sv-fin" type="date" id="sv-pdate" data-sp="date" value="'+esc(f.date||svToday())+'" aria-label="Data wymiany"><input class="sv-fin" id="sv-pkm" data-sp="km" value="'+esc(f.km!=null?f.km:Math.round(svTotal(b)))+'" placeholder="Przebieg przy wymianie" aria-label="Przebieg przy wymianie, km" inputmode="numeric" maxlength="7"></div>'
    +'<label class="sv-chip add sv-fdoc">'+uiIcon("cam")+(f.doc?esc(f.doc):'Dodaj paragon / zdjęcie (opcja)')+'<input type="file" accept="'+svAccept+'" class="sv-file" data-sfile="form"></label>'
    +(def[2]?'<small class="note">Pasek zużycia: wymiana co '+svKm(def[2])+'.</small>':'')
    +'<div class="sv-two"><button type="button" class="b w" data-sv="pcancel">Anuluj</button><button type="button" class="b" data-sv="padd">Dodaj wymianę</button></div></div>';
}
function svDaysTo(s){if(!s)return null;const t=new Date(s+"T12:00:00").getTime(),n=new Date(svToday()+"T12:00:00").getTime();return Math.round((t-n)/864e5)}
const svWhen=n=>n==null?"":n===0?"dziś":n===1?"jutro":n===-1?"wczoraj":n>0?"za "+n+" "+plf(n,["dzień","dni","dni"]):Math.abs(n)+" "+plf(Math.abs(n),["dzień","dni","dni"])+" temu";

/* ⚙️ widok „serwis” — renderGear w js/05 */
function svHtml(){
  const d=svLoad();if(!d.loaded||Date.now()-d.at>6e4)setTimeout(()=>svFetch(),0);
  let h=backBtn()+'<div class="sname" style="margin-top:26px">Serwis rowerowy'+betaTag("serwis_rowerowy")+'</div><div class="smail">Rowery, przebieg, wymiany części i serwis.</div>';
  if(d.err)h+='<p class="note pe-note">'+uiIcon("alert")+' '+esc(d.err)+' <button type="button" class="lnk" data-sv="retry">Spróbuj ponownie</button></p>';
  if(!d.loaded&&!d.err)return h+'<p class="note pe-note">Wczytuję rowery…</p>';
  const act=svActive();
  // 1. Moje rowery
  h+=gGrp("Moje rowery · "+d.bikes.length,d.bikes.map(b=>'<button type="button" class="ios-it ios-row sv-bike'+(b.id===act?' act':'')+(b.id===svSel?' sel':'')+'" data-sv="sel" data-bid="'+esc(b.id)+'"><span class="ios-ic" style="background:#ff9500">'+uiIcon(svIcoT(b.type))+'</span><span class="ios-t">'+esc(b.name||"Rower")+(b.demo?svExTag:"")
      +'<small>'+[svNameT(b.type),b.id===act?"aktywny":"",b.status==="svc"?"w serwisie":b.status==="ready"?"do odbioru":""].filter(Boolean).join(" · ")+'</small></span><span class="ios-v">'+svKm(svTotal(b))+'</span><span class="ios-chev" aria-hidden="true">›</span></button>')
    .concat([svReal().length<10?gRow("#34c759","plus","Dodaj rower","Gravel, MTB, szosa…","",'data-sv="add"'):'<div class="ios-it"><span class="ios-t">Masz 10 rowerów<small>To limit na jedno konto</small></span></div>',
      d.bikes.length?"":gRow("#8e8e93","bike","Zobacz przykład","Rower z wymianami, paskami zużycia i serwisem","",'data-sv="ex"'),
      svReal().length>1?svSw("ask",d.ask,"Pytaj o rower przy jeździe","Na razie km idą na rower aktywny — pytanie przy „Jak poszło?” w kolejnej wersji"):""]));
  const b=svBike(svSel);
  if(!b)return h+'<p class="note pe-note">'+uiIcon("lock")+' Dodaj pierwszy rower — przebieg, wymiany części i terminy serwisu zapiszesz w jednym miejscu.</p>'+svNote();
  // 2. Rower
  const F=b.files||{};
  h+=gGrp("Rower: "+esc(b.name||"bez nazwy")+(b.demo?svExTag:""),[
    svLine("#ff9500","pencil","Nazwa",svIn("name",b.name,"Np. Szary gravel")),
    '<div class="ios-it sv-col"><span class="sv-lb">Typ</span>'+svSeg("type",SV_TYPES.map(x=>[x[0],x[2]]),b.type)+'</div>',
    svLine("#8e8e93","bike","Marka",svIn("brand",b.brand,"Np. Kross")),
    svLine("#8e8e93","tag","Model",svIn("model",b.model,"Np. Esker 4.0")),
    svLine("#0a84ff","cal","Data zakupu",'<input class="pe-in" type="date" id="sv-buy" data-sf="buy" value="'+esc(b.buy||"")+'" aria-label="Data zakupu">'),
    svLine("#636366","lock","Nr ramy",svIn("frame",b.frame,"Opcja")),
    svDoc("receipt",F.receipt,"Paragon zakupu"),
    svDoc("warranty",F.warranty,"Gwarancja"),
    b.demo?'<div class="ios-it"><span class="ios-t">Przykładowy rower<small>Możesz w nim wszystko zmieniać · km z aplikacji na niego nie trafiają</small></span></div>'
    :b.id===act?'<div class="ios-it"><span class="ios-t">Aktywny rower<small>Na niego trafiają km z „Jak poszło?”</small></span><span class="ios-v ok">'+uiIcon("check")+'Tak</span></div>'
      :'<button type="button" class="ios-it ios-row" data-sv="act"><span class="ios-t">Ustaw jako aktywny<small>Nowe jazdy z aplikacji będą liczone na ten rower</small></span><span class="ios-chev" aria-hidden="true">›</span></button>']);
  // 3. Przebieg
  h+='<div class="ios"><div class="ios-gh">Przebieg</div><div class="ios-grp"><div class="ios-it sv-sum"><span class="sv-big">'+svKm(svTotal(b))+'</span><small>'+(b.demo?'przykładowy przebieg':b.app?'w tym z aplikacji: '+svKm(svAppKm(b)):'km z aplikacji wyłączone')+'</small></div>'
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
    svSw("s.notify",s.notify,"Powiadom",b.demo?"W przykładzie bez przypomnień":"Rano pod 🔔 i na Telegramie (jeśli połączony)"),
    s.notify?'<div class="ios-it sv-col"><span class="sv-lb">Na ile przed</span>'+svSeg("s.before",SV_BEFORE,s.before||"1")+'</div>':"",
    s.notify?'<div class="ios-it sv-col"><span class="sv-lb">Jak często</span>'+svSeg("s.freq",SV_FREQ,s.freq||"once")+'</div>':"",
    svLine("#8e8e93","wrench","Serwis",'<input class="pe-in" id="sv-sname" data-ss="name" value="'+esc(s.name||"")+'" placeholder="Nazwa (opcja)" aria-label="Nazwa serwisu" maxlength="60" autocomplete="off">'),
    svLine("#30d158","phone","Telefon",'<input class="pe-in" id="sv-stel" data-ss="tel" value="'+esc(s.tel||"")+'" placeholder="+48 600 123 456" aria-label="Telefon do serwisu" inputmode="tel" maxlength="20" autocomplete="off">'
      +(s.tel&&/\d{3}/.test(s.tel)?'<a class="b small sv-call" href="tel:'+esc(s.tel.replace(/[^\d+]/g,""))+'" aria-label="Zadzwoń do serwisu" title="Zadzwoń">'+uiIcon("call")+'</a>':''))]);
  // 6. Rower w serwisie
  const st=b.status||"me";
  h+=gGrp("Rower w serwisie",['<div class="ios-it sv-col">'+svSeg("status",SV_STATUS,st)+'</div>',
    st!=="me"?svLine("#ff9500","cal","Odbiór"+(b.pick?'<small>'+svWhen(svDaysTo(b.pick))+'</small>':''),'<input class="pe-in" type="date" id="sv-pick" data-sf="pick" value="'+esc(b.pick||"")+'" aria-label="Data odbioru">'):"",
    st!=="me"?svSw("pickNotify",b.pickNotify,"Powiadom o odbiorze",b.demo?"W przykładzie bez przypomnień":"W dniu odbioru, rano"):""]);
  h+=b.demo?'<button class="sdanger" data-sv="exrm">Usuń przykład</button>':'<button class="sdanger" data-sv="del">Usuń rower „'+esc(b.name||"Rower")+'”…</button>';
  if(!b.demo&&!d.bikes.some(x=>x.demo))h+='<div class="sv-exl"><button type="button" class="lnk" data-sv="ex">Pokaż przykładowy rower</button></div>';
  return h+svNote();
}
const svNote=()=>'<p class="note pe-note">'+uiIcon("lock")+' Dane widzisz tylko Ty — także paragony i gwarancje. Zapisują się same i są na każdym Twoim urządzeniu. Zdjęcia zmniejszamy przed wysłaniem (do 1 MB).</p>';

/* 🔔 przypomnienia (KROK 88): bike_svc / bike_pick w notifs (js/14 pobiera je razem z resztą) */
const svBellList=()=>svOn()?notifs.filter(n=>!n.read_at&&(n.kind==="bike_svc"||n.kind==="bike_pick")):[];
const svBellN=()=>svBellList().length;
function svBellHtml(){
  const L=svBellList();if(!L.length)return "";
  const d=svLoad();if(!d.loaded)setTimeout(()=>svFetch(),0);
  return bsSec("svc","🔧 Serwis rowerowy",L.length,L.length,
    '<div class="bsmka"><button type="button" class="lnk" data-svb="all">'+uiIcon("check")+' Oznacz sekcję jako przeczytane</button></div>'
    +L.map(n=>{const b=svBike(n.bike_id),nm=b?b.name:"Twój rower",pick=n.kind==="bike_pick",dn=b?svDaysTo(pick?b.pick:b.svc&&b.svc.date):null;
      return '<div class="nit new" data-svb="go" data-nid="'+esc(n.id)+'" data-bid="'+esc(n.bike_id||"")+'" role="button" tabindex="0"><div class="ic gpic" style="background:#ff9500">'+uiIcon(pick?"bike":"wrench")+'</div><div class="tx"><b>'+esc(nm)+'</b>'
        +'<div class="w">'+(pick?'odbiór z serwisu'+(dn!=null?' '+svWhen(dn):''):'serwis'+(dn!=null?' '+svWhen(dn):''))+' · '+esc(agoTxt(n.created_at))+'</div></div>'
        +'<button type="button" class="nmk" data-svb="read" data-nid="'+esc(n.id)+'" aria-label="Oznacz jako przeczytane" title="Oznacz jako przeczytane">'+uiIcon("check")+'</button></div>'}).join(""));
}
const svBellRead=()=>svBellList().map(n=>n.id);
$("bellsheet").addEventListener("click",async e=>{
  const t=e.target.closest("[data-svb]");if(!t||!session)return;e.stopPropagation();
  const a=t.dataset.svb;
  if(a==="all"){await markRead(svBellRead());renderBell();return}
  if(a==="read"){await markRead([t.dataset.nid]);renderBell();return}
  if(a==="go"){await markRead([t.dataset.nid]);closeBell();if(t.dataset.bid)svSel=t.dataset.bid;
    gearOpen=true;gearFrom="nick";gearView="serwis";svPartOpen=false;renderGear();svFetch(true);renderBell()}
});

/* 🖱 zdarzenia w ⚙️ (atrybuty data-sv / data-sf / data-ss / data-sp — nie kolidują z data-c w js/05) */
function svSetPath(o,f,v){if(f.startsWith("s.")){o.svc=o.svc||{};o.svc[f.slice(2)]=v}else o[f]=v}
const svPick=()=>{const d=svLoad();svSel=svActive()||(d.bikes[0]&&d.bikes[0].id)||""};
$("gearpanel").addEventListener("click",async e=>{
  const t=e.target.closest("[data-sv]");if(!t||!session)return;
  const a=t.dataset.sv,d=svLoad(),b=svBike(svSel);
  if(a==="open"){if(!svOn())return;if(gearView==="nick")gearFrom="nick";gearView="serwis";svPartOpen=false;renderGear();svFetch(true);return}
  if(a==="retry"){svFetch(true);return}
  if(a==="ex"){if(d.bikes.some(x=>x.demo))return;const nb=svDemoBike();d.bikes.push(nb);svSel=nb.id;svPartOpen=false;svLocalSave();renderGear();
    say("🚲 Przykładowy rower — możesz w nim wszystko zmieniać. Usuniesz go jednym kliknięciem.");return}
  if(a==="add"){if(t.disabled)return;t.disabled=true;
    try{const n=svReal().length+1,r=await sb.from("bikes").insert({name:"Rower "+n,type:"gravel",app:true}).select("*").single();if(r.error)throw r.error;
      const nb=svFromRow(r.data,[],[],{});d.bikes.splice(svReal().length,0,nb);svSel=nb.id;
      if(!svActive()){const q=await sb.rpc("bike_set_active",{b:nb.id});if(!q.error)nb.active=true}
      renderGear();const i=$("sv-name");if(i){i.focus();i.select()}}
    catch(err){t.disabled=false;say("Nie udało się dodać roweru: "+svErr(err))}return}
  if(a==="sel"){await svFlush();svSel=t.dataset.bid;svPartOpen=false;renderGear();return}
  if(a==="sw"&&t.dataset.f==="ask"){d.ask=!d.ask;svLocalSave();renderGear();return}
  if(!b)return;
  if(a==="exrm"){if(!b.demo)return;d.bikes=d.bikes.filter(x=>x!==b);svPick();svPartOpen=false;svLocalSave();renderGear();
    say("Usunięto przykład. Przywrócisz go linkiem „Pokaż przykładowy rower”.");return}
  if(a==="act"){if(b.demo)return;const r=await sb.rpc("bike_set_active",{b:b.id});if(r.error){say("Nie udało się: "+svErr(r.error));return}
    svReal().forEach(x=>{x.active=x===b});renderGear();say("🚲 Aktywny rower: "+(b.name||"Rower"));return}
  if(a==="seg"){svSetPath(b,t.dataset.f,t.dataset.v);svSave(b,1);renderGear();return}
  if(a==="sw"){const f=t.dataset.f,cur=f.startsWith("s.")?(b.svc||{})[f.slice(2)]:b[f];svSetPath(b,f,!cur);svSave(b,1);renderGear();return}
  if(a==="fview"){svFileView((b.files||{})[t.dataset.fk]);return}
  if(a==="docrm"){e.preventDefault();const k=t.dataset.fk,f=(b.files||{})[k];if(!f)return;
    if(!b.demo&&!await askOk("Usunąć plik „"+f.name+"”?","Usuń",1))return;
    try{await svFileRm(b,f);b.files[k]=null;renderGear()}catch(err){say("Nie udało się usunąć pliku: "+svErr(err))}return}
  if(a==="pview"||a==="pfrm"){const p=(b.parts||[]).find(x=>x.id===t.dataset.pid);if(!p||!p.file)return;
    if(a==="pview"){svFileView(p.file);return}
    if(!b.demo&&!await askOk("Usunąć plik „"+p.file.name+"”?","Usuń",1))return;
    try{await svFileRm(b,p.file);p.file=null;if(b.demo)svLocalSave();renderGear()}catch(err){say("Nie udało się usunąć pliku: "+svErr(err))}return}
  if(a==="popen"){svPartOpen=true;svPf={k:"chain",brand:"",price:"",date:svToday(),doc:"",file:null,km:Math.round(svTotal(b))};renderGear();return}
  if(a==="pcancel"){svPartOpen=false;renderGear();return}
  if(a==="pk"){svPf.k=t.dataset.v;renderGear();return}
  if(a==="padd"){const def=svPartDef(svPf.k),name=(svPf.k==="other"?(svPf.name||"").trim():def[1]).slice(0,40);
    if(!name){say("Wpisz nazwę części.");return}
    if((b.parts||[]).length>=200){say("Limit: najwyżej 200 wymian na rower.");return}
    const pr=String(svPf.price==null?"":svPf.price).trim(),kmv=String(svPf.km==null?"":svPf.km).trim();
    const p={k:svPf.k,name,brand:(svPf.brand||"").trim().slice(0,40),price:pr===""?"":Math.max(0,svNum(pr)),date:svPf.date||svToday(),km:kmv===""?"":Math.max(0,Math.round(svNum(kmv))),life:def[2],file:null};
    if(b.demo){p.id=svId();if(svPf.doc)p.file={name:svPf.doc,demo:true};b.parts.push(p);svPartOpen=false;svLocalSave();renderGear();say("🔧 Dodano wymianę: "+name);return}
    t.disabled=true;
    try{const r=await sb.from("bike_parts").insert({bike_id:b.id,k:p.k,name,brand:p.brand||null,price:p.price===""?null:p.price,date:p.date,km:p.km===""?null:p.km,life:p.life}).select("id").single();
      if(r.error)throw r.error;p.id=r.data.id;b.parts=b.parts||[];b.parts.push(p);svPartOpen=false;renderGear();
      if(svPf.file){try{p.file=await svUpload(b,"part",p.id,svPf.file)}catch(err){say("Wymiana zapisana, ale plik nie: "+svErr(err))}renderGear()}
      say("🔧 Dodano wymianę: "+name)}
    catch(err){t.disabled=false;say("Nie udało się dodać wymiany: "+svErr(err))}return}
  if(a==="prm"){const p=(b.parts||[]).find(x=>x.id===t.dataset.pid);if(!p)return;
    if(!await askOk("Usunąć wymianę „"+p.name+"”"+(p.date?" z "+svDate(p.date):"")+(p.file?" razem z plikiem":"")+"?","Usuń",1))return;
    if(!b.demo)try{if(p.file)await svFileRm(b,p.file);const r=await sb.from("bike_parts").delete().eq("id",p.id);if(r.error)throw r.error}
      catch(err){say("Nie udało się usunąć: "+svErr(err));return}
    b.parts=b.parts.filter(x=>x!==p);if(b.demo)svLocalSave();renderGear();return}
  if(a==="del"){if(!await askOk("Usunąć rower „"+(b.name||"Rower")+"” razem z historią wymian i plikami? Tego nie da się cofnąć.","Usuń",1))return;
    try{const ps=[b.files&&b.files.receipt,b.files&&b.files.warranty].concat((b.parts||[]).map(p=>p.file)).filter(f=>f&&f.path).map(f=>f.path);
      if(ps.length){const s=await sb.storage.from(SV_BUCKET).remove(ps);if(s.error)throw s.error}
      svDirty.delete(b.id);const r=await sb.from("bikes").delete().eq("id",b.id);if(r.error)throw r.error;
      const wasAct=b.active;d.bikes=d.bikes.filter(x=>x!==b);
      if(wasAct){const nx=svReal()[0];if(nx){const q=await sb.rpc("bike_set_active",{b:nx.id});if(!q.error)nx.active=true}}
      svPick();renderGear();say("Usunięto rower.")}
    catch(err){say("Nie udało się usunąć roweru: "+svErr(err))}return}
});
// ✏️ pola: zapis z opóźnieniem (bez przerysowania — kursor zostaje), przerysowanie przy „change” (sumy, nagłówki)
$("gearpanel").addEventListener("input",e=>{
  const i=e.target;if(gearView!=="serwis"||!i.dataset)return;
  if(i.dataset.sp){svPf[i.dataset.sp]=i.value;return}
  const b=svBike(svSel);if(!b)return;
  if(i.dataset.sf){b[i.dataset.sf]=i.value;svSave(b)}
  else if(i.dataset.ss){b.svc=b.svc||{};b.svc[i.dataset.ss]=i.value;svSave(b)}
});
$("gearpanel").addEventListener("change",async e=>{
  const i=e.target;if(gearView!=="serwis"||!i.dataset)return;
  if(i.dataset.sfile){
    const f=i.files&&i.files[0],b=svBike(svSel),k=i.dataset.sfile;i.value="";if(!f||!b)return;
    if(k==="form"){svPf.file=f;svPf.doc=f.name.slice(0,60);renderGear();return}   // plik wysyłany po dodaniu wymiany
    const p=k==="part"?(b.parts||[]).find(x=>x.id===i.dataset.pid):null;if(k==="part"&&!p)return;
    if(b.demo){const fo={name:f.name.slice(0,60),demo:true};if(p)p.file=fo;else b.files[k]=fo;svLocalSave();renderGear();return}
    say("Wysyłam plik…");
    try{const fo=await svUpload(b,k,p&&p.id,f);if(p)p.file=fo;else b.files[k]=fo;renderGear();say("📎 Zapisano: "+fo.name)}
    catch(err){say("Nie udało się wysłać pliku: "+svErr(err))}
    return}
  if(i.dataset.sf||i.dataset.ss){const b=svBike(svSel);if(b)svSave(b,1);clearTimeout(svRT);svRT=setTimeout(()=>{if(gearOpen&&gearView==="serwis")renderGear()},300)}   // po chwili: klik w kolejny przycisk (blur → change) nie ginie
});
// przed zamknięciem karty — dopisz zaległe zmiany
addEventListener("pagehide",()=>{if(svDirty.size)svFlush()});
