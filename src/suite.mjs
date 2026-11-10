import fs from 'node:fs/promises';
import path from 'node:path';
import {createCase,validatePlan,runCase,verifyCase,json,sha,targetURL} from './core.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
export function validateSuite(s){
 must(s?.schemaVersion===1,'Unsupported suite schema');
 must(Array.isArray(s.cases)&&s.cases.length>=1&&s.cases.length<=5,'Suite requires 1..5 cases');
 const names=new Set();let requests=0,duration=0;
 for(const c of s.cases){must(typeof c.name==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(c.name)&&!names.has(c.name),'Invalid or duplicate case name');names.add(c.name);validatePlan(c.scenario);requests+=c.scenario.budget.maxRequests;duration+=c.scenario.budget.maxDurationMs;}
 must(new Set(s.cases.map(c=>c.scenario.target)).size===1,'Suite cases must share one exact target');
 must(requests<=500,'Suite exceeds 500 requests');must(duration<=120000,'Suite exceeds 120 seconds of probe budgets');
 return {maxRequests:requests,maxProbeDurationMs:duration,cases:s.cases.length};
}
export async function createSuite(p,out){
 validatePlan(p);
 // These are different concurrency conditions, not synthetic service failures.
 const cases=[['baseline',1],['parallel',Math.min(5,p.budget.maxRequests)],['recovery',1]].map(([name,concurrency])=>{const scenario=structuredClone(p);scenario.budget.concurrency=concurrency;return {name,scenario};});
 const suite={schemaVersion:1,question:p.question,cases,stopOnFailure:true};
 const budget=validateSuite(suite);await fs.mkdir(out,{recursive:false});await fs.writeFile(path.join(out,'suite.json'),json(suite),{flag:'wx'});
 return {suiteDirectory:path.resolve(out),budget,execution:'not-started',note:'Review suite.json before execution. Recovery is a repeat measurement after parallel probes, not proof of fault recovery.'};
}
export async function runSuite(dir,{ackTarget}={}){
 const raw=await fs.readFile(path.join(dir,'suite.json')),s=JSON.parse(raw),budget=validateSuite(s);
 must(typeof s.stopOnFailure==='boolean','stopOnFailure must be boolean');
 const target=s.cases[0].scenario.target;targetURL(target,{local:true});must(ackTarget===target,'Explicit acknowledgement must match suite target exactly');
 const run=path.join(dir,'run');await fs.mkdir(run);const results=[];
 await fs.writeFile(path.join(run,'status.json'),json({status:'running',suiteSha256:sha(raw)}));
 try{
 for(const c of s.cases){
 must(sha(await fs.readFile(path.join(dir,'suite.json')))===sha(raw),'Suite changed during execution');
 const dest=path.join(run,c.name);await createCase(c.scenario,dest);const result=await runCase(dest,{ackTarget});await verifyCase(dest);
 results.push({name:c.name,requests:result.requests,smokeSloPassed:result.smokeSloPassed,evidenceSha256:sha(await fs.readFile(path.join(dest,'run/evidence.json')))});
 if(s.stopOnFailure&&!result.smokeSloPassed)break;
 }
 must(sha(await fs.readFile(path.join(dir,'suite.json')))===sha(raw),'Suite changed during execution');
 const summary={schemaVersion:1,status:'completed',suiteSha256:sha(raw),budget,requests:results.reduce((n,r)=>n+r.requests,0),results,skipped:s.cases.slice(results.length).map(c=>c.name),passed:results.length===s.cases.length&&results.every(r=>r.smokeSloPassed),capacityVerdict:'NOT_ESTABLISHED',securityVerdict:'NOT_ESTABLISHED'};
 await fs.writeFile(path.join(run,'summary.json'),json(summary));await fs.writeFile(path.join(run,'status.json'),json({status:'completed'}));
 await fs.writeFile(path.join(run,'evidence.json'),json({schemaVersion:1,suiteSha256:sha(raw),files:await Promise.all(['summary.json','status.json'].map(async file=>({file,sha256:sha(await fs.readFile(path.join(run,file)))})))}));return summary;
 }catch(e){await fs.writeFile(path.join(run,'status.json'),json({status:'failed',error:e.message}));throw e;}
}
export async function verifySuite(dir){
 const raw=await fs.readFile(path.join(dir,'suite.json')),s=JSON.parse(raw);validateSuite(s);
 const run=path.join(dir,'run'),index=JSON.parse(await fs.readFile(path.join(run,'evidence.json')));
 must(index.schemaVersion===1&&index.suiteSha256===sha(raw),'Suite integrity mismatch');
 must(Array.isArray(index.files)&&index.files.length===2,'Invalid suite evidence');
 const required=new Set(['summary.json','status.json']);for(const f of index.files){must(required.delete(f.file),'Invalid suite evidence path');must((await fs.lstat(path.join(run,f.file))).isFile(),'Evidence must be regular files');must(sha(await fs.readFile(path.join(run,f.file)))===f.sha256,'Suite evidence integrity mismatch');}
 const summary=JSON.parse(await fs.readFile(path.join(run,'summary.json')));
 must(summary.status==='completed'&&summary.suiteSha256===sha(raw),'Incomplete suite');
 must(Array.isArray(summary.results)&&summary.results.length>0&&summary.results.length<=s.cases.length,'Invalid suite results');
 for(const [i,r]of summary.results.entries()){must(r.name===s.cases[i].name,'Unexpected suite case');const dest=path.join(run,r.name);must(sha(await fs.readFile(path.join(dest,'run/evidence.json')))===r.evidenceSha256,'Case evidence index changed');await verifyCase(dest);}
 return {verified:true,cases:summary.results.length,skipped:summary.skipped,passed:summary.passed,note:'Hash identity, not signed attestation.'};
}
