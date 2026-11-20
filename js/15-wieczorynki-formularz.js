/* ---------- WIECZORYNKI: akcje na karcie ---------- */
$("ridecard").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-act]");if(!b)return;
  const id=b.dataset.id,r=sorted.find(x=>x.id===id);if(!r)return;
  try{
    const act=b.dataset.act;
    if(act==="join")await toggleRsvp(id);
    else if(act==="share"){
      if(navigator.share){
        try{await navigator.share({title:r.title,text:shareText(r),url:shareUrl(r)});return}
        catch(err){if(err&&err.name==="AbortError")return}
      }
      shareFor=shareFor===id?null:id;renderCard();
    }else if(act==="copy"){
      try{await navigator.clipboard.writeText(shareUrl(r));say("Link skopiowany.")}catch(err){say("Nie udało się skopiować: "+shareUrl(r))}
    }else if(act==="gpx"){
      const pts=await getRoute(id);
      if(!pts){say("Ta wieczorynka nie ma trasy.");return}
      say(saveFile(makeGpx(pts,r.title),slug(r.title)+".gpx","application/gpx+xml")?"Pobrano: "+slug(r.title)+".gpx":"Nie udało się pobrać pliku.");
    }else if(act==="edit")startEdit(id);
    else if(act==="del"){
      askDelete("ride",id);
    }
  }catch(err){say("Operacja nie powiodła się"+(err&&err.message?": "+err.message:"."))}
});
$("list").addEventListener("click",e=>{
  const it=e.target.closest(".item");if(!it)return;
  showRide(+it.dataset.i);
  $("view").scrollIntoView({behavior:"smooth",block:"start"});
});
$("prev").onclick=()=>{if(cur>0)showRide(cur-1)};
$("next").onclick=()=>{if(cur<sorted.length-1)showRide(cur+1)};
$("nearest").onclick=()=>showRide(pickDefault());

/* ---------- formularz: nowa / edycja ---------- */
function defaultWhen(){const d=new Date();d.setDate(d.getDate()+1);d.setHours(19,0,0,0);return localIso(d)}
function resetForm(){
  editId=null;formRoute=undefined;
  $("rt").value="";$("ro").value="";$("rp").value="";$("rw").value=defaultWhen();
  $("rf").value="";$("rlib").value="";$("rnt").value="";$("rnd").value="";$("rchg").value="";
  $("rnew").classList.add("hide");$("chgwrap").classList.add("hide");$("editnote").classList.add("hide");$("canceledit").classList.add("hide");
  $("rrinfo").textContent="";$("rinfo").textContent="";
  $("formsum").textContent="➕ Nowa wieczorynka";$("add").textContent="Opublikuj wieczorynkę";
}
function startEdit(id){
  const r=sorted.find(x=>x.id===id);if(!r)return;
  resetForm();
  editId=id;
  $("rt").value=r.title;$("rw").value=localIso(new Date(r.when));$("rp").value=r.place||"";$("ro").value=r.note||"";
  if([...$("rk").options].some(o=>o.value===r.pace))$("rk").value=r.pace;
  $("chgwrap").classList.remove("hide");$("canceledit").classList.remove("hide");
  const en=$("editnote");en.textContent="Edytujesz: „"+r.title+"”. Po zapisaniu wydarzenie dostanie widoczny komunikat o zmianie.";en.classList.remove("hide");
  $("rrinfo").textContent="Obecna trasa zostaje, dopóki nie wgrasz nowej albo nie wybierzesz innej z biblioteki.";
  $("formsum").textContent="✏️ Edycja wieczorynki";$("add").textContent="Zapisz zmiany";
  $("newbox").open=true;$("newbox").scrollIntoView({behavior:"smooth",block:"start"});
}
$("canceledit").onclick=()=>{resetForm();$("newbox").open=false};
$("rf").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  const p=parseGpx(await f.text());
  if(p.length<2){formRoute=undefined;$("rnew").classList.add("hide");$("rrinfo").textContent="Nie znaleziono punktów trasy w pliku GPX.";return}
  formRoute={pts:thin(p,500)};$("rlib").value="";$("rnew").classList.remove("hide");
  $("rrinfo").textContent="Wczytano trasę z pliku: "+routeKm(p).toFixed(1)+" km. Nowa trasa trafi do biblioteki — podaj jej nazwę i opis (obowiązkowe).";
};
$("rlib").onchange=async e=>{
  const id=e.target.value;
  if(!id){formRoute=undefined;$("rrinfo").textContent="";return}
  const l=lib.find(x=>x.id===id);
  try{
    const pts=await getLibRoute(id);
    if(!pts){formRoute=undefined;$("rrinfo").textContent="Nie udało się wczytać tej trasy.";return}
    formRoute={pts,libId:id,title:l.title,desc:l.description};
    $("rf").value="";$("rnew").classList.add("hide");
    $("rrinfo").textContent="Trasa z biblioteki: "+l.title+" ("+routeKm(pts).toFixed(1)+" km). "+l.description;
  }catch(err){$("rrinfo").textContent="Nie udało się wczytać trasy."}
};
$("add").onclick=async()=>{
  const info=$("rinfo");info.textContent="";
  if(!session){info.textContent="Zaloguj się, aby dodać wieczorynkę.";return}
  if(needProfile()){askNick();return}
  const t=$("rt").value.trim(),w=$("rw").value;
  if(!t||!w){info.textContent="Podaj nazwę i termin.";return}
  try{
    let rJson=null,rTitle=null,rDesc=null;
    if(formRoute){
      rJson=routeJson(formRoute.pts);
      if(formRoute.libId){rTitle=formRoute.title;rDesc=formRoute.desc}
      else{
        const nt=$("rnt").value.trim(),nd=$("rnd").value.trim();
        if(nt.length<3||nd.length<10){info.textContent="Podaj nazwę trasy (min. 3 znaki) i opis (min. 10 znaków) — bez opisu trasy nie można jej dodać.";return}
        const lr=await sb.from("routes").insert({title:nt,description:nd,km:+routeKm(formRoute.pts).toFixed(1),route:rJson});
        if(lr.error)throw lr.error;
        rTitle=nt;rDesc=nd;
      }
    }
    const base={title:t,starts_at:new Date(w).toISOString(),place:$("rp").value.trim()||null,pace:$("rk").value,note:$("ro").value.trim()||null};
    if(editId){
      const old=sorted.find(x=>x.id===editId);
      const ch=[];
      if(t!==old.title)ch.push("nazwa");
      if(new Date(old.when).getTime()!==new Date(w).getTime())ch.push("termin");
      if((base.place||"")!==(old.place||""))ch.push("miejsce");
      if(base.pace!==old.pace)ch.push("tempo");
      if((base.note||"")!==(old.note||""))ch.push("opis");
      if(formRoute)ch.push("trasa");
      if(!ch.length){info.textContent="Nic nie zmieniono.";return}
      const cm=$("rchg").value.trim();
      const upd=Object.assign({},base,{change_note:("Zmieniono: "+ch.join(", ")+(cm?" — "+cm:"")).slice(0,300)});
      if(formRoute){upd.route=rJson;upd.route_title=rTitle;upd.route_desc=rDesc}
      const res=await sb.from("rides").update(upd).eq("id",editId).select("id");
      if(res.error)throw res.error;
      if(!res.data||!res.data.length)throw new Error("brak uprawnień do edycji tej wieczorynki");
      const id=editId;delete routeCache[id];
      resetForm();$("newbox").open=false;
      await loadRemote(id);say("Zapisano zmiany ✔ — wydarzenie ma komunikat o zmianie.");
    }else{
      const row=Object.assign({},base,{owner_name:me.nick,route:rJson,route_title:rTitle,route_desc:rDesc});
      const ins=await sb.from("rides").insert(row).select("id").single();
      if(ins.error)throw ins.error;
      await sb.from("rsvps").insert({ride_id:ins.data.id});
      resetForm();$("newbox").open=false;
      await loadRemote(ins.data.id);say("Opublikowano ✔");
      $("view").scrollIntoView({behavior:"smooth",block:"start"});
    }
  }catch(e){info.textContent="Nie udało się zapisać"+(e&&e.message?": "+e.message:".")}
};

/* ---------- Zaawansowane: analiza GPX ---------- */
let advBase=[],advPts=[],advRev=false;
function advRender(fit){
  const wrap=$("mapwrap2"),wf=+$("wd").value;
  $("wdv").textContent=windLabel(wf);
  if(advPts.length<2){wrap.classList.add("hide");$("empty2").classList.remove("hide");$("stats2").innerHTML="";$("tip2").classList.add("hide");return}
  $("empty2").classList.add("hide");wrap.classList.remove("hide");
  if(!map2&&!window.L){needL().then(ok=>{if(ok)advRender(fit);else{$("empty2").textContent="Nie udało się załadować mapy (sprawdź połączenie z internetem).";$("empty2").classList.remove("hide");wrap.classList.add("hide")}});return}
  if(!map2)map2=makeMap("map2");
  if(!map2){$("empty2").textContent="Nie udało się załadować mapy (sprawdź połączenie z internetem).";$("empty2").classList.remove("hide");wrap.classList.add("hide");return}
  const ws=Math.max(0,+$("ws").value||0),bs=Math.max(8,+$("bs").value||24);
  const an=analyze(advPts,wf,ws,bs,true);
  map2.m.invalidateSize();
  drawRoute(map2,advPts,ws>0?an.segs:null,fit);setArrow("warrow2",wf,ws);
  $("stats2").innerHTML=statsHtml(an);
  $("tip2").textContent=an.tip;$("tip2").classList.remove("hide");
}
$("file").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  const p=parseGpx(await f.text());
  if(p.length<2){$("awi").textContent="Nie znaleziono punktów trasy w pliku GPX.";return}
  advBase=thin(p,500);advRev=false;advPts=advBase.slice();$("awi").textContent="";$("placesbox2").classList.add("hide");if(map2)map2.p.clearLayers();advRender(true);
};
$("places2").onclick=async()=>{
  if(advPts.length<2){$("awi").textContent="Najpierw wgraj trasę.";return}
  $("awi").textContent="Szukam miejscowości…";
  try{
    const l=await placesAlong(advPts,"a"+advRev+":"+advPts.length+":"+advPts[0].lat+":"+advPts[advPts.length>>1].lon);
    renderPlaces("placesbox2",map2,l);
    $("awi").textContent=l.length?"":"Nie znaleziono miejscowości przy tej trasie.";
  }catch(e){$("awi").textContent="";renderPlaces("placesbox2",map2,[],true)}
};
$("rev").onclick=()=>{advRev=!advRev;$("placesbox2").classList.add("hide");if(map2)map2.p.clearLayers();advPts=advRev?advBase.slice().reverse():advBase.slice();advRender(false)};
$("gpx").onclick=()=>{
  if(advPts.length<2){$("awi").textContent="Najpierw wgraj trasę.";return}
  const n="trasa"+(advRev?"-odwrocona":"")+".gpx";
  $("awi").textContent=saveFile(makeGpx(advPts,advRev?"Trasa (odwrócona)":"Trasa"),n,"application/gpx+xml")?"Pobrano: "+n:"Nie udało się pobrać pliku.";
};
$("aw").onclick=async()=>{
  const st=$("awi");
  if(advPts.length<2){st.textContent="Najpierw wgraj trasę.";return}
  st.textContent="Pobieram prognozę…";
  try{
    const when=$("wt").value?new Date($("wt").value):new Date();
    const w=await getWind(advPts[0].lat,advPts[0].lon,when);
    $("wd").value=Math.round(w.dir)%360;$("ws").value=Math.round(w.speed);
    advRender(false);
    st.textContent="Wiatr o "+w.time+": "+windLabel(w.dir)+", "+Math.round(w.speed)+" km/h, porywy do "+Math.round(w.gust)+" km/h (Open-Meteo).";
  }catch(e){st.textContent=e.code==="range"?e.message:"Nie udało się pobrać prognozy (brak internetu?). Ustaw wiatr ręcznie."}
};
["wd","ws","bs"].forEach(i=>$(i).oninput=()=>advRender(false));

