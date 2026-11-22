// Prosty service worker: sieć najpierw, pamięć podręczna tylko awaryjnie (powłoka aplikacji).
const CACHE="przylesiego-v114";
// Pliki aplikacji: ?v= musi być takie samo jak w index.html (podbijać przy każdej zmianie css/js).
const SHELL=["./","index.html","manifest.json","favicon.ico","icon-b-32.png","icon-b-192.png","icon-b-512.png","apple-touch-icon-b.png","css/app.css?v=110","js/01-podstawy.js?v=110","js/02-ikony.js?v=110","js/03-stan.js?v=110","js/04-ustawienia.js?v=110","js/05-zgloszenia.js?v=110","js/06-pomoc-powitanie.js?v=110","js/07-pogoda-zaproszen.js?v=110","js/08-imprezy.js?v=110","js/09-trasy.js?v=110","js/10-zaproszenia.js?v=110","js/11-dzwonek.js?v=110","js/12-wieczorynki.js?v=110","js/13-online-statystyki.js?v=110","js/14-synchronizacja.js?v=110","js/15-wieczorynki-formularz.js?v=110","js/16-start.js?v=110","js/17-grupy.js?v=110","js/18-ekipa-demo.js?v=110","js/19-demo-gosc.js?v=110"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return;
  e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp)).catch(()=>{});return res}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));
});
