import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {makePlan,createCase,runCase} from '../src/core.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const app=http.createServer((req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');if(req.url==='/account'){res.writeHead(401);return res.end('Synthetic account: login required');}if(req.url==='/degraded'){res.writeHead(503);return res.end('Synthetic unavailable dependency');}res.end('WhatIF local demo');});
await new Promise(r=>app.listen(0,'127.0.0.1',r));
try{const target=`http://127.0.0.1:${app.address().port}/`;const dir=path.join(root,'runs','demo-'+Date.now());await fs.mkdir(path.dirname(dir),{recursive:true});const p=makePlan({question:'Test this application with 1Million users, including security perspective',target,kind:'daily-active'});p.endpoints=[{method:'GET',path:'/',expectedStatuses:[200]},{method:'GET',path:'/account',expectedStatuses:[401]},{method:'GET',path:'/degraded',expectedStatuses:[200]}];await createCase(p,dir);const r=await runCase(dir,{ackTarget:target,source:path.join(root,'examples')});const verification=JSON.parse(execFileSync(process.execPath,[path.join(root,'src/cli.mjs'),'verify','--case',dir],{cwd:'/tmp',encoding:'utf8'}));console.log(JSON.stringify({caseDirectory:dir,summary:r,verification},null,2));if(r.errorRate<=0||r.smokeSloPassed||!verification.verified)throw Error('Demo failed to detect deliberately degraded endpoint');}finally{app.closeAllConnections();await new Promise(r=>app.close(r));}
