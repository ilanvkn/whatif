// Immutable test-app host. AI patches may edit domain.mjs, not this file.
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {canReadRecord,paymentMessage} from './domain.mjs';
const source=fs.readFileSync(new URL('./domain.mjs',import.meta.url));
const sourceSha256=crypto.createHash('sha256').update(source).digest('hex');
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.url==='/__whatif_probe'&&req.method==='POST'){let body='';req.on('data',b=>{body+=b;if(body.length>4096)req.destroy();});req.on('end',()=>{try{const x=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({canRead:canReadRecord(x.actor,x.owner),message:paymentMessage(x.status)}));}catch{res.writeHead(500);res.end();}});return;}
 if(req.url==='/domain.mjs'){res.setHeader('Content-Type','text/javascript');res.end(source);return;}
 if(req.url==='/health'){res.end('ok');return;}
 if(req.url==='/account/alice'){
  const actor=req.headers.authorization==='Bearer synthetic-alice'?'alice':req.headers.authorization==='Bearer synthetic-bob'?'bob':null;
  if(!actor){res.writeHead(401);res.end();return;}
  if(!canReadRecord(actor,'alice')){res.writeHead(403);res.end();return;}
  res.setHeader('Content-Type','application/json');res.end('{"owner":"WHATIF_ALICE_RECORD","balance":42}');return;
 }
 if(req.url==='/payment'&&req.method==='POST'){res.setHeader('Content-Type','application/json');res.end('{"ok":true}');return;}
 if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(req.url==='/'){
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><title>WhatIF AI repair fixture</title></head><body><h1>Checkout</h1><input id="name"><p id="cart">1 item</p><button id="buy">Pay</button><p id="status">Ready</p><script type="module">import {paymentMessage} from '/domain.mjs';document.querySelector('#buy').onclick=async()=>{try{const r=await fetch('/payment',{method:'POST',body:'synthetic'});document.querySelector('#status').textContent=paymentMessage(r.status);}catch{document.querySelector('#status').textContent='Payment unavailable. Cart saved.';}};</script></body></html>`);return;
 }
 res.writeHead(404);res.end();
});
server.listen(Number(process.env.WHATIF_PORT),'127.0.0.1',()=>console.log(JSON.stringify({whatifReady:true,pid:process.pid,port:server.address().port,sourceSha256})));
