import http from 'node:http';
export async function startFixture(){
 let fixed=false;const counts={total:0,loads:0,payments:0,external:0};
 const server=http.createServer((req,res)=>{
 counts.total++;res.setHeader('Cache-Control','no-store');
 if(req.url==='/health'){counts.loads++;res.end('ok');return;}
 if(req.url==='/account/alice'){
 const token=req.headers.authorization;
 if(!token){res.writeHead(401);res.end();return;}
 if(token==='Bearer synthetic-alice'||(!fixed&&token==='Bearer synthetic-bob')){res.setHeader('Content-Type','application/json');res.end('{"owner":"WHATIF_ALICE_RECORD","balance":42}');return;}
 res.writeHead(403);res.end();return;
 }
 if(req.url==='/payment'&&req.method==='POST'){counts.payments++;res.setHeader('Content-Type','application/json');res.end('{"ok":true}');return;}
 if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(req.url==='/'){
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><title>WhatIF disposable checkout</title></head><body><h1>WhatIF Store</h1><label>Name <input id="name"></label><p id="cart">1 item</p><button id="buy">Pay</button><p id="status">Ready</p><script>
 document.querySelector('#buy').onclick=async()=>{try{const response=await fetch('/payment',{method:'POST',body:JSON.stringify({name:document.querySelector('#name').value})});${fixed?"if(!response.ok)throw Error('payment');":""}document.querySelector('#status').textContent='Order confirmed';}catch{document.querySelector('#status').textContent='Payment unavailable. Cart saved.';}};
 </script></body></html>`);return;
 }
 res.writeHead(404);res.end();
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {target:`http://127.0.0.1:${server.address().port}/`,counts,fix(){fixed=true;},close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};
}
export function fixtureCampaign(target){
 const journey={maxRequests:10,timeoutMs:3000,allowRequests:[{method:'GET',path:'/'},{method:'GET',path:'/favicon.ico'},{method:'POST',path:'/payment'}],steps:[{action:'goto',path:'/'},{action:'fill',selector:'#name',value:'Synthetic Buyer'},{action:'click',selector:'#buy'},{action:'text',selector:'#status',expected:'Order confirmed'}]};
 const failure=structuredClone(journey);failure.intervention={path:'/payment',type:'status',status:503};failure.steps.at(-1).expected='Payment unavailable. Cart saved.';failure.steps.push({action:'text',selector:'#cart',expected:'1 item'});
 return {schemaVersion:1,question:'What if payment fails, read traffic increases, or one account requests a different account record?',target,budget:{maxRequests:200,maxDurationMs:60000},branches:[
 {id:'checkout-baseline',engine:'browser',hypothesis:'A buyer can complete checkout.',config:journey},
 {id:'payment-unavailable',engine:'browser',hypothesis:'A failed payment preserves the cart and tells the buyer it failed.',config:failure},
 {id:'concurrent-load',engine:'k6',hypothesis:'The health endpoint handles 120 requests across 8 virtual users within the declared thresholds.',config:{maxRequests:120,timeoutMs:2000,vus:8,durationMs:10000,paceMs:20,p95Ms:500,maxErrorRate:.01,endpoints:[{path:'/health',expectedStatuses:[200]}]}},
 {id:'account-isolation',engine:'security',hypothesis:'Only Alice can read the synthetic Alice record; Bob and anonymous users are denied.',config:{maxRequests:3,timeoutMs:2000,checks:[{type:'object-isolation',path:'/account/alice',ownerTokenEnv:'WHATIF_OWNER_TOKEN',otherTokenEnv:'WHATIF_OTHER_TOKEN',ownerMarker:'WHATIF_ALICE_RECORD'}]}}
 ]};
}
