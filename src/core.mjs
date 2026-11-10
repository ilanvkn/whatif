import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export const json=v=>JSON.stringify(v,null,2)+'\n';
const must=(v,msg)=>{if(!v)throw Error(msg);};
export function targetURL(value,{local=false}={}){
 const u=new URL(value);must(['http:','https:'].includes(u.protocol),'HTTP(S) target required');
 must(!u.username&&!u.password&&!u.search&&!u.hash,'Target must not contain credentials, query or fragment');
 if(local)must(['127.0.0.1','[::1]'].includes(u.hostname),'Built-in runner supports literal loopback addresses only; external environments require a separately reviewed adapter');
 return u;
}
function integer(v,min,max,name){must(Number.isInteger(v)&&v>=min&&v<=max,`${name} must be an integer ${min}..${max}`);}
export function validatePlan(p){
 must(p?.schemaVersion===1,'Unsupported scenario schema');must(typeof p.question==='string'&&p.question.trim().length>0&&p.question.length<=10000,'Question required (max 10000 characters)');targetURL(p.target);
 integer(p.population.users,1,1e9,'users');must(['unspecified','registered','daily-active','concurrent'].includes(p.population.kind),'Invalid population kind');
 for(const k of ['activeFraction','sessionsPerActiveUser','requestsPerSession','peakFactor','sessionSeconds'])must(Number.isFinite(p.assumptions[k])&&p.assumptions[k]>0,`Positive ${k} required`);
 must(p.assumptions.activeFraction<=1,'activeFraction must not exceed 1');
 integer(p.budget.maxRequests,1,200,'maxRequests');integer(p.budget.concurrency,1,10,'concurrency');integer(p.budget.timeoutMs,100,10000,'timeoutMs');integer(p.budget.maxDurationMs,100,60000,'maxDurationMs');
 must(p.budget.concurrency<=p.budget.maxRequests,'concurrency exceeds request budget');
 must(Number.isFinite(p.slo.p95Ms)&&p.slo.p95Ms>0,'Positive p95 SLO required');must(Number.isFinite(p.slo.maxErrorRate)&&p.slo.maxErrorRate>=0&&p.slo.maxErrorRate<=1,'Invalid error rate SLO');
 must(Array.isArray(p.endpoints)&&p.endpoints.length>0&&p.endpoints.length<=20,'1..20 endpoints required');
 for(const e of p.endpoints){must(typeof e.path==='string'&&/^\/(?!\/)/.test(e.path)&&!/[?#\\\r\n]/.test(e.path),'Endpoint must be an origin-relative path without query or fragment');must(e.method==='GET','Built-in runner only supports reviewed GET routes');must(Array.isArray(e.expectedStatuses)&&e.expectedStatuses.length>0&&e.expectedStatuses.every(n=>Number.isInteger(n)&&n>=100&&n<=599),'Expected statuses required');must(new URL(e.path,p.target).origin===new URL(p.target).origin,'Endpoint escaped origin');}
 return p;
}
export function makePlan({question,target,kind='unspecified',users}){
 const m=question.match(/(\d+(?:\.\d+)?)\s*(million|m|k|thousand)?\s*users/i);
 const count=users??(m?Number(m[1])*({million:1e6,m:1e6,k:1e3,thousand:1e3}[m[2]?.toLowerCase()]||1):1000000);
 return validatePlan({schemaVersion:1,question,target:targetURL(target).href,population:{users:count,kind},assumptions:{activeFraction:0.1,sessionsPerActiveUser:2,requestsPerSession:20,peakFactor:5,sessionSeconds:300},assumptionStatus:'illustrative-unconfirmed',budget:{maxRequests:20,concurrency:2,timeoutMs:2000,maxDurationMs:15000},slo:{p95Ms:500,maxErrorRate:0.01},endpoints:[{method:'GET',path:'/',expectedStatuses:[200]}],securityScope:{mode:'passive-and-source-review',activeExploitation:false},limitations:['Population semantics and workload assumptions require confirmation before capacity claims.','GET routes must be checked for application-specific side effects.','Built-in probes are bounded loopback checks, not a million-user load test.']});
}
export function workload(p){
 validatePlan(p);const a=p.assumptions,n=p.population.users,k=p.population.kind;
 if(k==='unspecified')return {status:'needs-population-definition',targetRps:null,concurrentSessions:null};
 if(k==='concurrent')return {status:'illustrative-model',targetRps:n*a.requestsPerSession/a.sessionSeconds,concurrentSessions:n,formula:'concurrent users × requests/session ÷ seconds/session'};
 const dau=k==='registered'?n*a.activeFraction:n;
 const peakSessionRate=dau*a.sessionsPerActiveUser/86400*a.peakFactor;
 return {status:'illustrative-model',targetRps:peakSessionRate*a.requestsPerSession,concurrentSessions:peakSessionRate*a.sessionSeconds,formula:'daily active users × sessions/day × requests/session ÷ 86400 × peak factor'};
}
export function securityPlan(){return [
 {id:'AUTHZ',question:'Can account A access or change account B’s records?',method:'Two synthetic users, isolated records, explicit expected denial; compare authorized and cross-account requests.',execution:'manual-review-required'},
 {id:'AUTHN',question:'Are protected routes blocked without a valid session?',method:'Known protected routes with absent, expired and revoked synthetic sessions.',execution:'manual-review-required'},
 {id:'INJECTION',question:'Do input paths reach SQL, shell, template or browser sinks?',method:'Trace source-to-sink; then reproduce with non-destructive markers in the authorized test environment.',execution:'manual-review-required'},
 {id:'ABUSE',question:'Can retries, races or duplicate submissions bypass limits?',method:'Isolated idempotency and rate-limit tests with bounded concurrency and cleanup.',execution:'manual-review-required'},
 {id:'SSRF',question:'Can user-controlled URLs access unintended services?',method:'Review URL validation and egress; use a controlled callback fixture, never real metadata/third-party services.',execution:'manual-review-required'},
 {id:'DATA',question:'Can secrets or personal data leak through errors, logs or exports?',method:'Synthetic canaries, minimal redacted evidence and explicit retention.',execution:'manual-review-required'}];}
export async function createCase(p,out){
 validatePlan(p);await fs.mkdir(out,{recursive:false});
 await fs.writeFile(path.join(out,'scenario.json'),json(p),{flag:'wx'});
 await fs.writeFile(path.join(out,'plan.json'),json({workload:workload(p),security:securityPlan(),next:['Confirm workload semantics and endpoints.','Run bounded loopback checks with explicit scope acknowledgement.','Review generated k6 smoke script; qualify distributed load separately.']}),{flag:'wx'});
 await fs.writeFile(path.join(out,'k6-smoke.js'),k6Script(p),{flag:'wx'});
 return {caseDirectory:path.resolve(out),scenario:path.join(out,'scenario.json'),workload:workload(p)};
}
export function k6Script(p){
 validatePlan(p);
 return `// WhatIF generated SMOKE test. Not a capacity or million-user test.\n// Review target and GET routes before execution. No redirects or cloud upload configured.\nimport http from 'k6/http';\nimport { check } from 'k6';\nconst plan = ${JSON.stringify({target:p.target,endpoints:p.endpoints.map(e=>({...e,url:new URL(e.path,p.target).href}))})};\nif (__ENV.WHATIF_ACK_TARGET !== plan.target) throw new Error('Set WHATIF_ACK_TARGET to the exact reviewed target');\nexport const options = { scenarios: { smoke: { executor: 'shared-iterations', vus: 1, iterations: ${p.budget.maxRequests}, maxDuration: '30s', gracefulStop: '0s' } }, thresholds: { http_req_duration: ['p(95)<${p.slo.p95Ms}'], checks: ['rate>=${1-p.slo.maxErrorRate}'] } };\nexport default function () {\n const e = plan.endpoints[__ITER % plan.endpoints.length];\n const r = http.get(e.url, { redirects: 0, timeout: '2s' });\n check(r, { 'expected status': r => e.expectedStatuses.includes(r.status) });\n}\n`;
}
function probe(url,timeoutMs){return new Promise(resolve=>{
 const started=performance.now();let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve({...v,durationMs:performance.now()-started});};
 const client=url.protocol==='https:'?https:http;
 const req=client.request(url,{method:'GET',agent:false,headers:{'user-agent':'WhatIF/0.1 bounded-loopback-probe'}},res=>{
 const headerNames=Object.keys(res.headers);res.destroy();finish({status:res.statusCode,headerNames,error:null});
 });
 const timer=setTimeout(()=>{req.destroy();finish({status:null,headerNames:[],error:'timeout'});},timeoutMs);
 req.on('error',()=>finish({status:null,headerNames:[],error:'connection-error'}));req.end();
});}
export async function runCase(dir,{ackTarget,source}={}){
 const raw=await fs.readFile(path.join(dir,'scenario.json'));const p=validatePlan(JSON.parse(raw));const target=targetURL(p.target,{local:true});
 must(ackTarget===p.target,'Explicit acknowledgement must match scenario.target exactly');
 const runDir=path.join(dir,'run');await fs.mkdir(runDir); // exclusive: interrupted runs are never silently replayed
 await fs.writeFile(path.join(runDir,'status.json'),json({status:'running',startedAt:new Date().toISOString(),planSha256:sha(raw)}));
 await fs.writeFile(path.join(runDir,'events.jsonl'),'');
 const start=performance.now(),deadline=start+p.budget.maxDurationMs;let issued=0;const observations=[];
 try{
 await Promise.all(Array.from({length:p.budget.concurrency},async()=>{
 while(issued<p.budget.maxRequests&&performance.now()<deadline){
  const i=issued++,e=p.endpoints[i%p.endpoints.length],u=new URL(e.path,target);
  const result=await probe(u,Math.min(p.budget.timeoutMs,Math.max(1,deadline-performance.now())));
  const observation={id:`http-${i+1}`,path:e.path,expectedStatuses:e.expectedStatuses,...result,passed:!result.error&&e.expectedStatuses.includes(result.status)};
  observations.push(observation);
  await fs.appendFile(path.join(runDir,'events.jsonl'),JSON.stringify(observation)+'\n');
 }
 }));
 observations.sort((a,b)=>Number(a.id.split('-')[1])-Number(b.id.split('-')[1]));
 const findings=source?await scanSource(source):{files:[],findings:[],limitations:['Source review not requested.']};
 const now=await fs.readFile(path.join(dir,'scenario.json'));must(sha(now)===sha(raw),'Scenario changed during execution; result invalid');
 const durations=observations.map(x=>x.durationMs).sort((a,b)=>a-b),errors=observations.filter(x=>!x.passed).length;
 const p95=durations.length?durations[Math.ceil(.95*durations.length)-1]:null;
 const summary={schemaVersion:1,status:'completed',proofLevel:'bounded-loopback-integration',planSha256:sha(raw),requestedPopulation:p.population,workload:workload(p),requests:observations.length,requestBudget:p.budget.maxRequests,budgetComplete:observations.length===p.budget.maxRequests,elapsedMs:performance.now()-start,p95Ms:p95,errorRate:observations.length?errors/observations.length:null,smokeSloPassed:observations.length===p.budget.maxRequests&&p95<=p.slo.p95Ms&&errors/observations.length<=p.slo.maxErrorRate,capacityVerdict:'NOT_ESTABLISHED',securityVerdict:'NOT_ESTABLISHED',limitations:['Latency ends at response headers; body correctness and browser behavior are not tested.','No redirects followed; no authentication, active exploits or distributed load executed.','Small-sample SLO result does not establish capacity at requested population.','Header observations and source heuristics are review leads, not confirmed exploitable vulnerabilities.']};
 const headerReview=observations.filter(x=>x.status!==null).map(x=>({evidenceId:x.id,path:x.path,missing:['content-security-policy','x-content-type-options'].filter(h=>!x.headerNames.includes(h)),classification:'observed-header-absence-context-dependent'}));
 for(const [name,v]of [['observations.json',observations],['source-review.json',findings],['headers.json',headerReview],['summary.json',summary]])await fs.writeFile(path.join(runDir,name),json(v));
 await fs.writeFile(path.join(runDir,'report.md'),report(summary,findings));
 await fs.writeFile(path.join(runDir,'status.json'),json({status:'completed',endedAt:new Date().toISOString()}));
 const evidence=[];for(const name of ['status.json','observations.json','source-review.json','headers.json','summary.json','report.md','events.jsonl'])evidence.push({file:name,sha256:sha(await fs.readFile(path.join(runDir,name)))});
 await fs.writeFile(path.join(runDir,'evidence.json'),json({schemaVersion:1,planSha256:sha(raw),files:evidence}));
 return summary;
 }catch(e){await fs.writeFile(path.join(runDir,'status.json'),json({status:'failed',error:e.message}));throw e;}
}
export function report(s,f){return `# WhatIF evidence report\n\nProof: ${s.proofLevel}\n\n- Requested population: ${s.requestedPopulation.users} (${s.requestedPopulation.kind}).\n- Measured requests: ${s.requests}/${s.requestBudget}.\n- Response-header p95: ${s.p95Ms?.toFixed(2)??'unknown'} ms.\n- Error rate: ${s.errorRate===null?'unknown':(s.errorRate*100).toFixed(2)+'%'}.\n- Smoke SLO: ${s.smokeSloPassed?'passed':'not passed'}.\n- Requested-scale capacity: **${s.capacityVerdict}**.\n- Exploit resistance: **${s.securityVerdict}**.\n- Source review leads: ${f.findings.length}.\n\n## Limits\n${s.limitations.map(x=>'- '+x).join('\n')}\n\n## Next evidence needed\nConfirm population semantics, user journeys and workload distribution; run progressively scaled authorized tests with generator and server telemetry. Use synthetic identities to verify access boundaries and reproduce source-review leads. Retain actual failures; never promote a heuristic or projection into a demonstrated exploit or capacity result.\n`;}
export async function verifyCase(dir){
 const base=path.join(dir,'run'),index=JSON.parse(await fs.readFile(path.join(base,'evidence.json'),'utf8'));
 must(index.schemaVersion===1&&Array.isArray(index.files)&&index.files.length===7,'Invalid evidence index');
 const required=new Set(['status.json','observations.json','source-review.json','headers.json','summary.json','report.md','events.jsonl']);
 must(sha(await fs.readFile(path.join(dir,'scenario.json')))===index.planSha256,'Scenario integrity mismatch');
 for(const f of index.files){must(required.delete(f.file),'Unexpected or duplicate evidence path');must((await fs.lstat(path.join(base,f.file))).isFile(),'Evidence must be regular files');must(sha(await fs.readFile(path.join(base,f.file)))===f.sha256,'Evidence integrity mismatch: '+f.file);}
 must(required.size===0,'Missing evidence');
 const summary=JSON.parse(await fs.readFile(path.join(base,'summary.json'),'utf8'));must(summary.status==='completed'&&summary.planSha256===index.planSha256,'Run is not completed or plan mismatch');
 return {verified:true,files:index.files.length,proofLevel:summary.proofLevel,capacityVerdict:summary.capacityVerdict,securityVerdict:summary.securityVerdict,note:'Hash identity check, not signed attestation or proof of application correctness.'};
}
export async function scanSource(root){
 const files=[],findings=[],limitations=['Heuristic source scan only; not a parser, complete SAST audit or exploit confirmation.','Only selected source extensions; skipped symlinks, hidden directories, dependencies and files over 512 KiB; max 500 files.'];
 const rules=[['DYNAMIC_EVAL',/\beval\s*\(/,'Review untrusted input reaching dynamic evaluation.'],['SHELL_EXEC',/\b(exec|execSync|os\.system)\s*\(/,'Review command construction and input flow.'],['HTML_SINK',/\.innerHTML\s*=/,'Review untrusted HTML and sanitization.'],['TLS_VERIFY_DISABLED',/rejectUnauthorized\s*:\s*false/,'Review disabled TLS verification.']];
 async function walk(d){for(const ent of await fs.readdir(d,{withFileTypes:true})){if(files.length>=500)return;if(ent.isSymbolicLink()||ent.name.startsWith('.')||['node_modules','vendor','dist','build','runs'].includes(ent.name))continue;const f=path.join(d,ent.name);if(ent.isDirectory())await walk(f);else if(ent.isFile()&&/\.(m?[jt]sx?|py|go|java|rb|php)$/.test(ent.name)){
 const stat=await fs.stat(f);if(stat.size>524288)continue;const bytes=await fs.readFile(f),rel=path.relative(root,f);files.push({path:rel,sha256:sha(bytes)});
 bytes.toString('utf8').split('\n').forEach((line,i)=>{for(const[id,re,note]of rules)if(re.test(line))findings.push({rule:id,path:rel,line:i+1,classification:'unverified-review-lead',note});});
 }}}
 await walk(root);return {files,findings,limitations};
}
