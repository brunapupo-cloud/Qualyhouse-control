const CACHE='qualyhouse-alpha-v45';
const ASSETS=['./','index.html','manifest.webmanifest','cloud.js','auth-ui.js','assets/villa-park-terreo.jpeg','assets/villa-park-superior.jpeg','assets/villa-leaf.svg','assets/oca-wordmark.svg','assets/residencial-girassol.svg','assets/locacoes-avulsas.svg'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  const req=e.request;
  const url=new URL(req.url);

  if(req.mode==='navigate' && url.origin===self.location.origin){
    e.respondWith((async()=>{
      try{
        const response=await fetch(req,{cache:'no-store'});
        const html=await response.text();
        const scripts=`
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth-ui.js"></script>
<script src="cloud.js"></script>
`;
        const injected=html.includes('cloud.js')?html:html.replace('</body>',scripts+'</body>');
        return new Response(injected,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8'}});
      }catch(err){
        const cached=await caches.match('index.html');
        if(cached){
          const html=await cached.text();
          const scripts=`
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth-ui.js"></script>
<script src="cloud.js"></script>
`;
          const injected=html.includes('cloud.js')?html:html.replace('</body>',scripts+'</body>');
          return new Response(injected,{headers:{'content-type':'text/html; charset=utf-8'}});
        }
        throw err;
      }
    })());
    return;
  }

  if(url.origin===self.location.origin && (url.pathname.endsWith('/cloud.js') || url.pathname.endsWith('/auth-ui.js'))){
    e.respondWith(fetch(req,{cache:'no-store'}).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(c=>c.put(req,copy));
      return response;
    }).catch(()=>caches.match(req)));
    return;
  }

  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});
