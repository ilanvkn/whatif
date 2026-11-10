import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {makePlan,createCase,sha,json} from '../src/core.mjs';
const binary=process.argv[2];if(!binary||!path.isAbsolute(binary))throw Error('Supply an absolute reviewed k6 executable path');
const root=path.resolve(new URL('..',import.meta.url).pathname),out=path.join(root,'runs','k6-'+Date.now());await fs.mkdir(path.dirname(out),{recursive:true});
let hits=0;const app=http.createServer((req,res)=>{hits++;res.end('Synthetic WhatIF k6 fixture');});await new Promise(r=>app.listen(0,'127.0.0.1',r));
const target=`http://127.0.0.1:${app.address().port}/`;
try{
 const p=makePlan({question:'Qualify generated k6 smoke script',target});p.budget.maxRequests=5;await createCase(p,out);
 const script=path.join(out,'k6-smoke.js'),summary=path.join(out,'k6-summary.json');
 const result=await new Promise((resolve,reject)=>{const child=spawn(binary,['run','--quiet','--no-usage-report','--summary-export',summary,script],{env:{PATH:process.env.PATH,HOME:process.env.HOME,WHATIF_ACK_TARGET:target},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timer=setTimeout(()=>child.kill('SIGKILL'),45000);child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);child.on('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal,stdout,stderr});});});
 await fs.writeFile(path.join(out,'execution.json'),json(result));
 if(result.code!==0||hits!==5)throw Error('k6 qualification failed: '+JSON.stringify({code:result.code,hits,stderr:result.stderr}));
 const receipt={version:'0.1.0',binarySha256:sha(await fs.readFile(binary)),scriptSha256:sha(await fs.readFile(script)),summarySha256:sha(await fs.readFile(summary)),requestsObserved:hits,proofLevel:'generated-k6-smoke-integration',capacityVerdict:'NOT_ESTABLISHED',caseDirectory:out};await fs.writeFile(path.join(out,'qualification.json'),json(receipt));console.log(json(receipt));
}finally{app.closeAllConnections();await new Promise(r=>app.close(r));}
