// Prosty service worker: sieć najpierw, pamięć podręczna tylko awaryjnie (powłoka aplikacji).
const CACHE="przylesiego-v108";
// Pliki aplikacji: ?v= musi być takie samo jak w index.html (podbijać przy każdej zmianie css/js).
const SHELL=["./","index.html","manifest.json","favicon.ico","icon-b-32.png","icon-b-192.png","icon-b-512.png","apple-touch-icon-b.png","css/app.css?v=104","js/01-podstawy.js?v=104","js/02-ikony.js?v=104","js/03-stan.js?v=104","js/04-ustawienia.js?v=104","js/05-zgloszenia.js?v=104","js/06-pomoc-powitanie.js?v=104","js/07-pogoda-zaproszen.js?v=104","js/08-imprezy.js?v=104","js/09-trasy.js?v=104","js/10-zaproszenia.js?v=104","js/11-dzwonek.js?v=104","js/12-wieczorynki.js?v=104","js/13-online-statystyki.js?v=104","js/14-synchronizacja.js?v=104","js/15-wieczorynki-formularz.js?v=104","js/16-start.js?v=104","js/17-grupy.js?v=104","js/18-ekipa-demo.js?v=104","js/19-demo-gosc.js?v=104"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return;
  e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp)).catch(()=>{});return res}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));
});
