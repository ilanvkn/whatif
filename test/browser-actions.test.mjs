import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {validateCampaign} from '../src/engines/contracts.mjs';
import {runCampaign,verifyCampaign} from '../src/campaign.mjs';
const campaign=(steps,storage)=>({schemaVersion:1,question:'Synthetic editable journey',target:'http://127.0.0.1:8080/',budget:{maxRequests:20,maxDurationMs:30000},branches:[{id:'edit',engine:'browser',hypothesis:'Edits and storage satisfy exact invariants',config:{maxRequests:20,timeoutMs:1500,allowRequests:[{method:'GET',path:'/'},{method:'GET',path:'/favicon.ico'}],steps,...(storage===undefined?{}:{storage})}}]});
test('new browser actions validate with exact bounded assertions',()=>{
 const steps=[{action:'reload'},{action:'dblclick',selector:'#edit'},...['Enter','Escape','Tab','Backspace','ControlOrMeta+A','Control+i'].map(key=>({action:'press',selector:'#edit',key})),{action:'count',selector:'.item',expected:0},{action:'count',selector:'.item',expected:10000},{action:'value',selector:'#edit',expected:''},{action:'attribute',selector:'#edit',name:'data-state',expected:null}];
 assert.equal(validateCampaign(campaign(steps,{seed:'synthetic'})).branches[0].config.steps.length,steps.length);
 for(const step of [{action:'press',selector:'input',key:'Meta+Q'},{action:'count',selector:'li',expected:-1},{action:'count',selector:'li',expected:10001},{action:'count',selector:'li',expected:1.5},{action:'value',selector:'input',expected:null},{action:'attribute',selector:'a',name:'',expected:null},{action:'attribute',selector:'a',name:'href',expected:3},{action:'evaluate',selector:'body'}])assert.throws(()=>validateCampaign(campaign([step,{action:'visible',selector:'body'}])));
 assert.throws(()=>validateCampaign(campaign([{action:'press',key:'Enter'},{action:'visible',selector:'body'}])));
 assert.throws(()=>validateCampaign(campaign([{action:'reload'}])),/assertion/);
});
test('storage rejects unbounded or non-string payloads',()=>{
 const steps=[{action:'count',selector:'body',expected:1}];
 for(const storage of [null,[],42,{'': 'x'},{['x'.repeat(129)]:'x'},{x:'x'.repeat(4097)},{x:1},Object.fromEntries(Array.from({length:21},(_,i)=>[String(i),'x']))])assert.throws(()=>validateCampaign(campaign(steps,storage)));
 assert.doesNotThrow(()=>validateCampaign(campaign(steps,Object.fromEntries(Array.from({length:20},(_,i)=>[String(i),'x'.repeat(4096)])))));
});
test('real browser edits, polls exact assertions, reloads synthetic storage and redacts values',{skip:process.env.WHATIF_ENGINE_TESTS!=='1',timeout:60000},async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'whatif-actions-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const app=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><link rel="icon" href="data:,"><input id="edit"><button id="save">Save</button><ul id="list"></ul><a id="link">safe</a><script>
 const input=document.querySelector('#edit');input.value=localStorage.getItem('seed')||'';
 input.addEventListener('dblclick',()=>input.setAttribute('data-editing','yes'));
 input.addEventListener('keydown',e=>{if(e.key==='Escape')input.removeAttribute('data-editing');if(e.key==='Enter'){localStorage.setItem('seed',input.value);setTimeout(()=>{document.querySelector('#list').innerHTML='<li>saved</li>';document.querySelector('#link').setAttribute('href','#safe');},100);}});
 </script>`);});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 const p=campaign([{action:'goto',path:'/'},{action:'value',selector:'#edit',expected:'synthetic-private-seed'},{action:'attribute',selector:'#link',name:'href',expected:null},{action:'count',selector:'li',expected:0},{action:'dblclick',selector:'#edit'},{action:'attribute',selector:'#edit',name:'data-editing',expected:'yes'},{action:'press',selector:'#edit',key:'ControlOrMeta+A'},{action:'press',selector:'#edit',key:'Backspace'},{action:'value',selector:'#edit',expected:''},{action:'fill',selector:'#edit',value:'synthetic-private-edit'},{action:'press',selector:'#edit',key:'Escape'},{action:'attribute',selector:'#edit',name:'data-editing',expected:null},{action:'press',selector:'#edit',key:'Tab'},{action:'press',selector:'#edit',key:'Enter'},{action:'count',selector:'li',expected:1},{action:'attribute',selector:'#link',name:'href',expected:'#safe'},{action:'reload'},{action:'value',selector:'#edit',expected:'synthetic-private-edit'}],{seed:'synthetic-private-seed'});p.target=`http://127.0.0.1:${app.address().port}/`;
 await fs.writeFile(path.join(root,'campaign.json'),JSON.stringify(p));const result=await runCampaign(root,{ackTarget:p.target});assert.equal(result.passed,true,JSON.stringify(result));assert.ok(result.requests<=20);assert.doesNotMatch(JSON.stringify(result),/synthetic-private/);assert.equal((await verifyCampaign(root)).verified,true);
});
test('offline mirrors require unique exact HTTPS URLs and reviewed local GET paths',()=>{
 const make=mirrors=>{const p=campaign([{action:'visible',selector:'body'}]);p.branches[0].config.allowRequests.push({method:'GET',path:'/vendor.js'});p.branches[0].config.localMirrors=mirrors;return p;};
 assert.doesNotThrow(()=>validateCampaign(make([{url:'https://cdn.invalid/vendor.js',path:'/vendor.js'}])));
 for(const mirrors of [[{url:'http://cdn.invalid/vendor.js',path:'/vendor.js'}],[{url:'https://u:p@cdn.invalid/vendor.js',path:'/vendor.js'}],[{url:'https://cdn.invalid/vendor.js#hash',path:'/vendor.js'}],[{url:'https://cdn.invalid/vendor.js',path:'/unreviewed'}],[{url:'https://cdn.invalid/vendor.js',path:'//escape'}],[{url:'https://cdn.invalid/vendor.js',path:'/vendor.js'},{url:'https://cdn.invalid/vendor.js',path:'/vendor.js'}],Array.from({length:11},(_,i)=>({url:`https://cdn.invalid/${i}`,path:'/vendor.js'}))])assert.throws(()=>validateCampaign(make(mirrors)));
});
test('real offline mirror fetches exclusively the reviewed local copy and blocks unlisted CDN URLs',{skip:process.env.WHATIF_ENGINE_TESTS!=='1',timeout:60000},async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'whatif-mirrors-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));let localCopies=0;
 const app=http.createServer((req,res)=>{if(req.url==='/vendor.js'){localCopies++;res.setHeader('Content-Type','text/javascript');res.end('document.querySelector("#status").textContent="local-copy"');}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><link rel="icon" href="data:,"><p id="status">waiting</p><script src="https://whatif-offline.invalid/pinned.js"></script>');}});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 const p=campaign([{action:'goto',path:'/'},{action:'text',selector:'#status',expected:'local-copy'}]);p.target=`http://127.0.0.1:${app.address().port}/`;p.branches[0].config.allowRequests.push({method:'GET',path:'/vendor.js'});p.branches[0].config.localMirrors=[{url:'https://whatif-offline.invalid/pinned.js',path:'/vendor.js'}];
 for(const [name,mirrored]of [['mirrored',true],['unlisted',false]]){const dir=path.join(root,name);await fs.mkdir(dir);if(!mirrored)p.branches[0].config.localMirrors=[];await fs.writeFile(path.join(dir,'campaign.json'),JSON.stringify(p));const result=await runCampaign(dir,{ackTarget:p.target});assert.equal(result.passed,mirrored,JSON.stringify(result));assert.equal(result.results[0].network.mirrored,mirrored?1:0);assert.equal(result.results[0].network.issued,mirrored?2:1);assert.equal(result.results[0].network.blocked,mirrored?0:1);assert.equal((await verifyCampaign(dir)).verified,true);}
 assert.equal(localCopies,1);
});
test('only the declared synthetic quota storage fault is accepted',()=>{
 const p=campaign([{action:'visible',selector:'body'}]);p.branches[0].config.storageFault='quota-exceeded';assert.doesNotThrow(()=>validateCampaign(p));for(const value of ['other','',null,{},'throw code']){p.branches[0].config.storageFault=value;assert.throws(()=>validateCampaign(p));}
});
test('real quota fault throws on writes but preserves reads and records verified intervention',{skip:process.env.WHATIF_ENGINE_TESTS!=='1',timeout:60000},async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'whatif-quota-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const app=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><link rel="icon" href="data:,"><p id="read"></p><p id="write"></p><script>document.querySelector("#read").textContent=localStorage.getItem("seed");try{localStorage.setItem("seed","changed");document.querySelector("#write").textContent="written";}catch(e){document.querySelector("#write").textContent=e.name;}</script>');});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 for(const fault of [true,false]){const dir=path.join(root,String(fault));await fs.mkdir(dir);const p=campaign([{action:'goto',path:'/'},{action:'text',selector:'#read',expected:'synthetic-seed'},{action:'text',selector:'#write',expected:fault?'QuotaExceededError':'written'}],{seed:'synthetic-seed'});p.target=`http://127.0.0.1:${app.address().port}/`;if(fault)p.branches[0].config.storageFault='quota-exceeded';await fs.writeFile(path.join(dir,'campaign.json'),JSON.stringify(p));const result=await runCampaign(dir,{ackTarget:p.target});assert.equal(result.passed,true,JSON.stringify(result));assert.equal(result.results[0].storageFaultInjected,fault);assert.equal(result.results[0].scenarioFault,fault?'quota-exceeded':null);}
});
