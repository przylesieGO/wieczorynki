/* ---------- 🎮 TRYB DEMO dla gościa (?demo=1) ----------
   Wczytywany tylko w trybie demo (dynamicznie z js/16-start.js). Zamiast prawdziwej bazy aplikacja dostaje
   udawanego klienta (demoClient) z danymi w pamięci telefonu: zmyślone osoby, zaproszenia, jazdy i imprezy,
   z datami liczonymi od „teraz”. Nic nie idzie do Supabase (zero zapytań, zero zapisu, zero wpływu na limity),
   a po zamknięciu karty / „Wyjdź z demo” wszystko znika. Sprzątanie kont i zaproszeń demo w Administracji
   nie ma wpływu na ten tryb — dane są tutaj, w kodzie. */
const DEMO_ME="00000000-0000-4000-8000-00000000d0e0";
const DEMO_SAY="To tylko demo — ta funkcja działa po założeniu konta.";
const dmId=n=>"00000000-0000-4000-8000-0000000000"+String(n).padStart(2,"0");
const dmUuid=()=>{try{return crypto.randomUUID()}catch(e){return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g,()=>(Math.random()*16|0).toString(16))}};

function demoSeed(){
  const now=Date.now(),iso=x=>new Date(x).toISOString();
  const at=(dd,h,m)=>{const d=new Date();d.setDate(d.getDate()+dd);d.setHours(h,m||0,0,0);return d.getTime()};
  const late=new Date().getHours()>=17,d0=late?1:0,H=36e5,D=864e5;
  const P=[["Marek z Bielan","M"],["Ania K","K"],["Kasia Gravel","K"],["Tomek R","M"],["Ola z Łomianek","K"],["Bartek MTB","M"],
    ["Gosia","K"],["Piotr Szosa","M"],["Ewa","K"],["Kuba","M"],["Magda","K"],["Rafał","M"]];
  const u=i=>dmId(i);   // u(1) = Marek … u(12) = Rafał
  const profiles=P.map(([nick,g],i)=>({user_id:u(i+1),nick,gender:g,joined_at:iso(now-(40+i*9)*D),created_at:iso(now-(40+i*9)*D),avatar:null,avatar_at:null,media:null,
    priv_arch:true,priv_stats:true,priv_cal:i%2===0,nick_changed_at:null}));
  profiles.push({user_id:DEMO_ME,nick:"Gość",gender:"M",joined_at:iso(now),created_at:iso(now),avatar:null,avatar_at:null,media:null,priv_arch:false,priv_stats:false,priv_cal:false,nick_changed_at:null});
  // 🗺️ trasa GPX (pętla przez Kampinos) — punkty liczone, żeby „Szczegóły” i „Pobierz GPX” działały
  const route=[];const c=[52.33,20.80];
  for(let i=0;i<=72;i++){const a=i/72*2*Math.PI;route.push([+(c[0]+0.075*Math.sin(a)+0.01*Math.sin(5*a)).toFixed(5),+(c[1]+0.17*Math.cos(a)-0.17+0.012*Math.cos(3*a)).toFixed(5),Math.round(80+12*Math.sin(3*a))])}
  let rkm=0;for(let i=1;i<route.length;i++)rkm+=dist({lat:route[i-1][0],lon:route[i-1][1]},{lat:route[i][0],lon:route[i][1]});
  const W=(o)=>Object.assign({id:dmUuid(),created_at:iso(now-2*D),visibility:"all",range_from:null,range_to:null,settled_at:null,is_test:false,route:null,route_km:null,
    pace:null,km:null,dur_min:null,place:null,place_lat:null,place_lon:null,bike:null,place_city:null,place_area:null,route_base_id:null,activity:"bike",title:null,title_auto:false,group_id:null,note:null},o);
  const w1=W({user_id:u(1),starts_at:iso(at(d0,18)),title:"Zachód słońca nad Wisłą",note:"Spokojnie, z postojem na kawę na Młocinach.",pace:"tour",bike:"gravel",km:40,
      place:"Las Bielański, parking przy Kamedułach",place_city:"Warszawa",place_lat:52.2945,place_lon:20.9585});
  const w2=W({user_id:u(2),starts_at:iso(at(d0+1,17)),range_from:iso(at(d0+1,17)),range_to:iso(at(d0+1,19)),title:"Kawa w Łomiankach",note:"Wybierz godzinę, która Ci pasuje — ustalę start wg większości.",
      pace:"senior",bike:"trekking",km:25,dur_min:120,place:"Rondo przy Hucie",place_city:"Warszawa",place_lat:52.2935,place_lon:20.9312});
  const w3=W({user_id:u(4),starts_at:iso(at(d0+2,9)),visibility:"private",title:"Kampinos dookoła",note:"Zapraszam tylko kilka osób — tempo równe, bez czekania.",pace:"speed",bike:"road",
      route:JSON.stringify(route),route_km:Math.round(rkm*10)/10,place:"Stacja PKP Łomianki",place_city:"Łomianki",place_lat:52.3335,place_lon:20.8862});
  const w4=W({user_id:u(6),starts_at:iso(at(d0+3,10)),title:"Single tracki w Kampinosie",note:"Kask obowiązkowy, będzie trochę piachu.",pace:"tour",bike:"mtb",km:35,
      place:"Truskaw, parking leśny",place_city:"Truskaw",place_lat:52.3075,place_lon:20.7735});
  const lv=Math.floor((now-25*60000)/(5*60000))*5*60000;
  const w5=W({user_id:u(5),starts_at:iso(lv),title:"Wieczorynka po Bielanach",note:"Jedziemy, dołącz na trasie!",pace:"senior",bike:"trekking",dur_min:120,km:22,
      place:"Plac Wilsona",place_city:"Warszawa",place_lat:52.2690,place_lon:20.9840});
  const w6=W({user_id:u(8),starts_at:iso(at(d0+5,7,30)),title:"Setka przed śniadaniem",note:"100 km, start punktualnie, powrót ok. 11:30.",pace:"speed",bike:"road",km:100,
      place:"Stacja Orlen, Marki",place_city:"Marki",place_lat:52.3260,place_lon:21.1050});
  const w7=W({user_id:u(1),starts_at:iso(at(-1,18)),created_at:iso(now-3*D),title:"Pętla przez Młociny",pace:"tour",bike:"gravel",km:30,
      place:"Las Bielański",place_city:"Warszawa",place_lat:52.2945,place_lon:20.9585});
  const wants=[w1,w2,w3,w4,w5,w6,w7];
  const J=(w,ids,pref)=>ids.map((x,i)=>({want_id:w.id,user_id:x,pref_at:pref?pref[i]:null}));
  const want_joins=[...J(w1,[u(2),u(3),u(10)]),...J(w2,[u(1),u(4),u(5),u(7)],[iso(at(d0+1,17,30)),iso(at(d0+1,18)),iso(at(d0+1,18)),iso(at(d0+1,17,30))]),
    ...J(w3,[u(8)]),...J(w4,[u(10),u(12)]),...J(w5,[u(7),u(11),u(9)]),...J(w6,[u(4)]),...J(w7,[DEMO_ME,u(2),u(3)])];
  const want_invitees=[{want_id:w3.id,user_id:DEMO_ME,added_by:u(4),created_at:iso(now-3*H)},{want_id:w3.id,user_id:u(3),added_by:u(4),created_at:iso(now-3*H)},
    {want_id:w3.id,user_id:u(8),added_by:u(4),created_at:iso(now-3*H)}];
  const want_declines=[{want_id:w4.id,user_id:u(9),created_at:iso(now-5*H)}];
  const notifications=[{id:dmUuid(),created_at:iso(now-3*H),user_id:DEMO_ME,kind:"invite",want_id:w3.id,actor:u(4),read_at:null,group_id:null}];
  // „Jak poszło?” — odbyte jazdy Gościa (statystyki w profilu)
  const ride_reports=[[6,42,24.1,"Kampinos"],[11,28,21.5,"Młociny"],[17,55,25.3,"Zalew Zegrzyński"],[24,35,22.8,"Las Kabacki"],[33,61,26.0,"Kampinos"]]
    .map(([d,km,v,pl])=>({want_id:dmUuid(),user_id:DEMO_ME,went:true,km,avg_kmh:v,rating:5,route_rating:4,tags:[],self:true,confirmed_by:null,ride_author:u(1),
      ride_at:iso(at(-d,18)),ride_place:pl,ride_city:"Warszawa",plan_km:km,route_km:null,created_at:iso(at(-d,21)),updated_at:iso(at(-d,21)),ride_test:false}));
  // historia jazd ekipy (karty osób, rekordy) — stała dla danej osoby, liczona od dziś
  const PL=["Kampinos","Młociny","Las Kabacki","Zalew Zegrzyński","Wisła","Las Bielański"];
  for(let i=1;i<=12;i++)for(let k=0;k<3+i%6;k++){const d=2+((i*7+k*11)%80),km=18+((i*13+k*17)%70);
    ride_reports.push({want_id:dmUuid(),user_id:u(i),went:true,km,avg_kmh:18+((i+k*3)%10),rating:5,route_rating:4,tags:[],self:true,confirmed_by:null,ride_author:u(i),
      ride_at:iso(at(-d,[7,10,17,18][(i+k)%4])),ride_place:PL[(i+k)%PL.length],ride_city:"Warszawa",plan_km:km,route_km:null,created_at:iso(at(-d,21)),updated_at:iso(at(-d,21)),ride_test:false})}
  const lid=dmUuid();
  const sig=localIso(new Date()).slice(0,10);
  const ev=dmUuid(),evd1=dmUuid(),evd2=dmUuid();
  return {
    profiles,wants,want_joins,want_invitees,want_declines,notifications,ride_reports,
    profile_private:[{user_id:DEMO_ME,phone:null,phone_vis:"off",city:"Warszawa",city_lat:52.2297,city_lon:21.0122,city_vis:false}],
    favorites:[{user_id:DEMO_ME,fav_id:u(2),created_at:iso(now)},{user_id:DEMO_ME,fav_id:u(4),created_at:iso(now)}],
    people_lists:[{id:lid,owner:DEMO_ME,name:"Poranna ekipa",color:"blue",pos:0,created_at:iso(now-D)}],
    people_list_members:[u(4),u(8),u(3)].map(x=>({list_id:lid,user_id:x,added_at:iso(now-D)})),
    ride_signals:[{user_id:u(3),day:sig,activity:"bike",is_test:false,created_at:iso(now-2*H),cancelled_at:null},{user_id:u(12),day:sig,activity:"run",is_test:false,created_at:iso(now-H),cancelled_at:null}],
    admins:[{user_id:u(1)}],
    feature_flags:[["tab_events","all"],["mam_ochote","all"],["grupy","off"],["telegram_dm","off"],["tab_rides","off"],["tab_advanced","off"]]
      .map(([key,state])=>({key,name:key,description:"",state,guests:false})),
    events:[{id:ev,created_by:u(8),name:"Kampinoski Gravel (przykład)",date_from:localIso(new Date(at(21,0))).slice(0,10),date_to:null,place:"Leszno",url:null,
      note:"Zmyślona impreza — tak wygląda impreza w aplikacji.",reg_until:null,reg_closed:false,delete_req_at:null,delete_req_by:null,lat:52.2575,lon:20.5850,
      created_at:iso(now-4*D),changed_at:null,changed_by:null,changed_what:null,price_info:"od 120 zł"}],
    event_distances:[{id:evd1,event_id:ev,bike:"gravel",km:60,name:"Mini",sort:1,elev:300,limit_min:null},{id:evd2,event_id:ev,bike:"gravel",km:120,name:"Maxi",sort:2,elev:650,limit_min:480}],
    event_participants:[{event_id:ev,user_id:u(3),distance_id:evd2,created_at:iso(now-2*D)},{event_id:ev,user_id:u(8),distance_id:evd2,created_at:iso(now-2*D)},{event_id:ev,user_id:u(2),distance_id:evd1,created_at:iso(now-D)}],
    event_likes:[{event_id:ev,user_id:u(1)},{event_id:ev,user_id:u(5)}],
  };
}

/* udawany klient Supabase: from() / rpc() / auth / channel — dane w pamięci (DEMO_DB) */
let DEMO_DB=null;
function demoClient(){
  const DB=DEMO_DB=demoSeed();
  const ONLINE=[dmId(1),dmId(3),dmId(5),dmId(6)];
  const KEYS={want_joins:["want_id","user_id"],want_declines:["want_id","user_id"],want_invitees:["want_id","user_id"],favorites:["user_id","fav_id"],
    people_list_members:["list_id","user_id"],ride_signals:["user_id","day"],profiles:["user_id"],profile_private:["user_id"],ride_reports:["want_id","user_id"],
    event_participants:["event_id","user_id"],event_likes:["event_id","user_id"]};
  const WITH_ID=new Set(["wants","notifications","people_lists","groups","group_posts","route_base","events","event_distances","feedback","rides","routes","places"]);
  const ME_COL={wants:"user_id",want_joins:"user_id",want_declines:"user_id",favorites:"user_id",profile_private:"user_id",ride_signals:"user_id",ride_reports:"user_id",
    event_participants:"user_id",event_likes:"user_id",want_invitees:"added_by",people_lists:"owner",groups:"owner",route_base:"created_by",events:"created_by"};
  const DEF={wants:{visibility:"all",is_test:false,title_auto:false,activity:"bike",settled_at:null,range_from:null,range_to:null,group_id:null},
    want_joins:{pref_at:null},ride_signals:{day:()=>localIso(new Date()).slice(0,10),activity:"bike",is_test:false,cancelled_at:null},
    people_lists:{color:"blue",pos:0},ride_reports:{tags:[],self:true,ride_test:false},profile_private:{phone_vis:"off",city_vis:false}};
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const ok=(data)=>Promise.resolve({data,error:null,count:null,status:200,statusText:"OK"});
  const bad=(message,code)=>Promise.resolve({data:null,error:{message:message||DEMO_SAY,code:code||"DEMO"},count:null,status:400});
  const cmpv=(a,b)=>{if(a==null||b==null)return NaN;if(typeof a==="number"||typeof b==="number")return +a-+b;
    const da=Date.parse(a),db=Date.parse(b);if(/^\d{4}-\d\d-\d\d/.test(a)&&/^\d{4}-\d\d-\d\d/.test(b)&&!isNaN(da)&&!isNaN(db))return da-db;return String(a).localeCompare(String(b))};
  const eqv=(a,b)=>a===b||(a!=null&&b!=null&&String(a)===String(b));
  const OPS={eq:(v,x)=>eqv(v,x),neq:(v,x)=>!eqv(v,x),gt:(v,x)=>cmpv(v,x)>0,gte:(v,x)=>cmpv(v,x)>=0,lt:(v,x)=>cmpv(v,x)<0,lte:(v,x)=>cmpv(v,x)<=0,
    in:(v,x)=>(Array.isArray(x)?x:String(x).replace(/^\(|\)$/g,"").split(",")).some(y=>eqv(v,y)),
    is:(v,x)=>x===null||x==="null"?v==null:x===true||x==="true"?v===true:x===false||x==="false"?v===false:eqv(v,x),
    like:(v,x)=>v!=null&&new RegExp("^"+String(x).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/%/g,".*")+"$").test(v),
    ilike:(v,x)=>v!=null&&new RegExp("^"+String(x).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/%/g,".*")+"$","i").test(v),
    contains:(v,x)=>Array.isArray(v)&&(Array.isArray(x)?x:[x]).every(y=>v.includes(y))};
  function applyDef(t,r){
    r=Object.assign({},r);
    if(WITH_ID.has(t)&&r.id==null)r.id=dmUuid();
    if(r.created_at==null)r.created_at=new Date().toISOString();
    if(ME_COL[t]&&r[ME_COL[t]]==null)r[ME_COL[t]]=DEMO_ME;
    Object.entries(DEF[t]||{}).forEach(([k,v])=>{if(!(k in r))r[k]=typeof v==="function"?v():clone(v)});
    return r;
  }
  const keyOf=(t,r)=>(KEYS[t]||["id"]).map(k=>String(r[k])).join("|");
  class Q{
    constructor(t){this.t=t;this.f=[];this.o=[];this.op="select";this.cols="*";this.lim=null;this.off=0;this.one=0;this.ret=false;this.val=null;this.opt={}}
    select(c){if(this.op!=="select")this.ret=true;this.cols=c||"*";return this}
    insert(v,o){this.op="insert";this.val=v;this.opt=o||{};return this}
    upsert(v,o){this.op="upsert";this.val=v;this.opt=o||{};return this}
    update(v){this.op="update";this.val=v;return this}
    delete(){this.op="delete";return this}
    _f(c,fn){if(String(c).includes("."))return this;this.f.push(r=>fn(r[c]));return this}
    eq(c,x){return this._f(c,v=>OPS.eq(v,x))}neq(c,x){return this._f(c,v=>OPS.neq(v,x))}
    gt(c,x){return this._f(c,v=>OPS.gt(v,x))}gte(c,x){return this._f(c,v=>OPS.gte(v,x))}
    lt(c,x){return this._f(c,v=>OPS.lt(v,x))}lte(c,x){return this._f(c,v=>OPS.lte(v,x))}
    in(c,x){return this._f(c,v=>OPS.in(v,x))}is(c,x){return this._f(c,v=>OPS.is(v,x))}
    like(c,x){return this._f(c,v=>OPS.like(v,x))}ilike(c,x){return this._f(c,v=>OPS.ilike(v,x))}
    contains(c,x){return this._f(c,v=>OPS.contains(v,x))}
    not(c,op,x){const fn=OPS[op]||(()=>true);return this._f(c,v=>!fn(v,x))}
    filter(c,op,x){const fn=OPS[op]||(()=>true);return this._f(c,v=>fn(v,x))}
    match(o){Object.entries(o||{}).forEach(([c,x])=>this.eq(c,x));return this}
    or(){return this}
    order(c,o){if(!String(c).includes("."))this.o.push([c,!(o&&o.ascending===false)]);return this}
    limit(n){this.lim=n;return this}
    range(a,b){this.off=a;this.lim=b-a+1;return this}
    single(){this.one=1;return this}maybeSingle(){this.one=2;return this}
    abortSignal(){return this}returns(){return this}
    _proj(rows){
      const cs=String(this.cols||"*").split(",").map(s=>s.trim()).filter(s=>s&&!s.includes("(")&&!s.includes(")"));
      if(!cs.length||cs.includes("*"))return rows.map(clone);
      return rows.map(r=>{const o={};cs.forEach(c=>{const k=c.split(":").pop();o[k]=r[k]===undefined?null:clone(r[k])});return o});
    }
    _run(){
      const t=this.t,T=DB[t]||(DB[t]=[]),hit=r=>this.f.every(fn=>fn(r));
      let out=null;
      if(this.op==="select"){
        out=T.filter(hit);
        if(this.o.length)out.sort((a,b)=>{for(const [c,asc] of this.o){const d=cmpv(a[c],b[c]);if(d)return asc?d:-d}return 0});
        if(this.off)out=out.slice(this.off);if(this.lim!=null)out=out.slice(0,this.lim);
      }else if(this.op==="insert"||this.op==="upsert"){
        const rows=(Array.isArray(this.val)?this.val:[this.val]).map(r=>applyDef(t,r));out=[];
        for(const r of rows){
          const k=keyOf(t,r),i=T.findIndex(x=>keyOf(t,x)===k);
          if(i>=0){if(this.op==="insert")return bad("duplicate key value violates unique constraint","23505");T[i]=Object.assign(T[i],r);out.push(T[i])}
          else{T.push(r);out.push(r)}
        }
        if(t==="wants")out.forEach(w=>{if(w.user_id===DEMO_ME)demoReact(w.id)});
      }else if(this.op==="update"){
        out=T.filter(hit);out.forEach(r=>Object.assign(r,clone(this.val)));
      }else if(this.op==="delete"){
        out=T.filter(hit);DB[t]=T.filter(r=>!hit(r));
      }
      if(this.op!=="select"&&!this.ret&&!this.one)return ok(null);
      out=this._proj(out);
      if(this.one){if(out.length===1)return ok(out[0]);if(!out.length&&this.one===2)return ok(null);
        return bad(out.length?"JSON object requested, multiple (or no) rows returned":"JSON object requested, multiple (or no) rows returned","PGRST116")}
      return ok(out);
    }
    then(a,b){return this._run().then(a,b)}
    catch(b){return this._run().catch(b)}
    finally(f){return this._run().finally(f)}
  }
  // 🤝 „żywe” demo: po założeniu zaproszenia przez Gościa ktoś z ekipy dołącza (powiadomienie pod 🔔)
  function demoReact(wid){
    const pick=[...Array(12).keys()].map(i=>dmId(i+1)).sort(()=>Math.random()-.5);
    [9000,24000].forEach((ms,i)=>setTimeout(()=>{
      const w=(DB.wants||[]).find(x=>x.id===wid);if(!w)return;
      const inv=(DB.want_invitees||[]).filter(x=>x.want_id===wid).map(x=>x.user_id).filter(x=>x!==DEMO_ME);
      const pool=w.visibility==="private"?inv:pick,who=pool.find(x=>!(DB.want_joins||[]).some(j=>j.want_id===wid&&j.user_id===x));if(!who)return;
      const open=!!w.range_to&&!w.settled_at;
      DB.want_joins.push({want_id:wid,user_id:who,pref_at:open?w.range_from:null});
      DB.notifications.push({id:dmUuid(),created_at:new Date().toISOString(),user_id:DEMO_ME,kind:"join",want_id:wid,actor:who,read_at:null,group_id:null});
      try{syncNow().catch(()=>{})}catch(e){}
    },ms+i*1000));
  }
  const RPC={
    sync_since:()=>bad("demo"),                         // bez dziennika zmian → każde odświeżenie czyta całość z pamięci
    ride_watch_counts:()=>ok([]),route_base_stats:()=>ok([]),fb_done_counts:()=>ok([]),touch_seen:()=>ok(null),
    want_autosettle:()=>ok(false),ev_import_left:()=>ok(null),user_extra:()=>ok({}),
    user_pub_stats:a=>ok({created:(DB.wants||[]).filter(w=>w.user_id===a.u&&!w.is_test).length,joined:(DB.want_joins||[]).filter(j=>j.user_id===a.u).length}),
    user_rides:a=>ok(demoUserRides(a.u)),
  };
  // 🚴 „Moje jazdy” / karta osoby: to samo co funkcja user_rides() w bazie, liczone z danych demo
  function demoUserRides(id){
    const day=864e5,ds=t=>localIso(new Date(t)).slice(0,10),now=Date.now(),R=(DB.ride_reports||[]).filter(r=>r.user_id===id&&r.went&&!r.ride_test);
    const y=new Date().getMonth()>=10?new Date().getFullYear():new Date().getFullYear()-1,season=y+"-11-01",s0=new Date(season+"T00:00").getTime();
    const km=r=>+r.km||0,tm=r=>new Date(r.ride_at).getTime(),best=(arr,f)=>arr.reduce((a,b)=>!a||f(b)>f(a)?b:a,null);
    const days={},wk={},mo={},dow=[0,0,0,0,0,0,0],part={rano:0,popoludnie:0,wieczor:0};
    R.forEach(r=>{const d=new Date(r.ride_at),k=ds(d);(days[k]=days[k]||{d:k,n:0,km:0,t:0,tt:[]}).n++;days[k].km+=km(r);
      const m=startOfDay(d).getTime()-((d.getDay()+6)%7)*day;wk[m]=(wk[m]||0)+km(r);const mk=k.slice(0,7)+"-01";mo[mk]=(mo[mk]||0)+km(r);
      dow[(d.getDay()+6)%7]++;const h=d.getHours();part[h<12?"rano":h<17?"popoludnie":"wieczor"]++});
    const weeks=Object.keys(wk).map(Number).sort((a,b)=>a-b),thisW=startOfDay(new Date()).getTime()-((new Date().getDay()+6)%7)*day;
    let streak=0;for(let w=wk[thisW]?thisW:thisW-7*day;wk[w];w-=7*day)streak++;
    let sb=0,run=0,prev=null;weeks.forEach(w=>{run=prev!=null&&w-prev<=7*day+36e5?run+1:1;sb=Math.max(sb,run);prev=w});
    const rk=best(R,km),rv=best(R.filter(r=>r.avg_kmh!=null),r=>+r.avg_kmh),bw=weeks.reduce((a,w)=>!a||wk[w]>wk[a]?w:a,0),bm=Object.keys(mo).reduce((a,m)=>!a||mo[m]>mo[a]?m:a,"");
    const r30=R.filter(r=>tm(r)>now-30*day),v=R.filter(r=>r.avg_kmh!=null).map(r=>+r.avg_kmh);
    const plan=(DB.wants||[]).filter(w=>new Date(w.starts_at).getTime()>=now-7*day&&(w.user_id===id||(DB.want_joins||[]).some(j=>j.want_id===w.id&&j.user_id===id)))
      .map(w=>({at:w.starts_at,title:w.title,test:!!w.is_test}));
    const events=(DB.events||[]).filter(e=>(DB.event_participants||[]).some(p=>p.event_id===e.id&&p.user_id===id)).map(e=>({from:e.date_from,to:e.date_to||e.date_from,name:e.name}));
    return {n:R.length,km:R.reduce((a,r)=>a+km(r),0),test_n:0,d30_n:r30.length,d30_km:r30.reduce((a,r)=>a+km(r),0),avg_kmh:v.length?v.reduce((a,b)=>a+b,0)/v.length:null,
      streak,streak_best:Math.max(sb,streak),dow,part,season,
      rec_km:rk?{km:km(rk),d:ds(tm(rk))}:null,rec_kmh:rv?{kmh:+rv.avg_kmh,d:ds(tm(rv))}:null,
      rec_week:bw?{km:wk[bw],d:ds(bw)}:null,rec_month:bm?{km:mo[bm],d:bm}:null,
      days:Object.values(days).filter(x=>new Date(x.d+"T00:00").getTime()>=s0),plan,events};
  }
  const sub={unsubscribe(){}};
  const session={access_token:"demo",token_type:"bearer",expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,refresh_token:"demo",
    user:{id:DEMO_ME,email:"gosc@demo.przylesiego",aud:"authenticated",role:"authenticated",created_at:new Date().toISOString()}};
  const exit=()=>{location.href=location.pathname};
  return {
    from:t=>new Q(t),
    rpc:(n,a)=>RPC[n]?RPC[n](a||{}):bad(),
    auth:{
      getSession:()=>ok({session}),getUser:()=>ok({user:session.user}),
      onAuthStateChange:()=>({data:{subscription:sub}}),
      signOut:()=>{setTimeout(exit,50);return ok(null)},
      signInWithPassword:()=>bad("To jest demo — wyjdź z demo (pasek u góry), żeby się zalogować."),
      signUp:()=>bad("To jest demo — wyjdź z demo (pasek u góry), żeby założyć konto."),
      resetPasswordForEmail:()=>bad(),updateUser:()=>bad()
    },
    functions:{invoke:()=>bad()},
    channel:()=>{const hs=[];const ch={state:"joined",on(ev,o,cb){hs.push(cb);return ch},
      subscribe(cb){setTimeout(()=>{cb&&cb("SUBSCRIBED");hs.forEach(h=>{try{h()}catch(e){}})},300);return ch},
      track:()=>ok(null),untrack:()=>ok(null),presenceState:()=>Object.fromEntries(ONLINE.map(id=>[id,[{t:Date.now()}]]))};return ch},
    removeChannel:()=>ok("ok"),removeAllChannels:()=>ok([])
  };
}
