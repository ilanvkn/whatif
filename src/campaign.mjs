import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {json,sha,targetURL} from './core.mjs';
import {validateCampaign,secretNames,must} from './engines/contracts.mjs';
import {runProcess,cleanEnv} from './engines/process.mjs';
const worker=fileURLToPath(new URL('./engines/worker.mjs',import.meta.url));
export async function runtimeConfig(){try{return JSON.parse(await fs.readFile(path.join(os.homedir(),'.codex/whatif/engines.json')));}catch{return {};}}
export async function engineDoctor(){
 const config=await runtimeConfig(),result={};
 for(const [key,location]of Object.entries(config)){if(key==='browserChannel')continue;try{const stat=await fs.stat(location);result[key]={available:stat.isFile(),path:location,sha256:sha(await fs.readFile(location))};}catch{result[key]={available:false};}}
 const adapterIdentity=await Promise.all(['campaign.mjs','core.mjs','engines/api.mjs','engines/browser.mjs','engines/k6.mjs','engines/security.mjs','engines/process.mjs','engines/contracts.mjs','engines/worker.mjs','lab/space.mjs','lab/critic.mjs','lab/lab.mjs'].map(async file=>({file,sha256:sha(await fs.readFile(new URL(file,import.meta.url)))})));
 return {configuration:result,adapterIdentity,note:'Presence and file hash only; campaign execution records actual adapter results. Install optional engines explicitly.'};
}
export async function createCampaign({question,target,out}){
 const p={schemaVersion:1,question,target:targetURL(target).href,budget:{maxRequests:100,maxDurationMs:60000},branches:[{id:'baseline',engine:'browser',hypothesis:'The home page renders its main content.',config:{maxRequests:20,timeoutMs:3000,allowRequests:[{method:'GET',path:'/'}],steps:[{action:'goto',path:'/'},{action:'visible',selector:'body'}]}},{id:'load',engine:'k6',hypothesis:'Reviewed read routes meet latency and error targets under bounded concurrency.',config:{maxRequests:50,timeoutMs:2000,vus:5,durationMs:10000,paceMs:50,p95Ms:500,maxErrorRate:.01,endpoints:[{path:'/',expectedStatuses:[200]}]}}]};
 validateCampaign(p);await fs.mkdir(out,{recursive:false});await fs.writeFile(path.join(out,'campaign.json'),json(p),{flag:'wx'});
 return {campaignDirectory:path.resolve(out),execution:'not-started',next:'Review real browser actions, exact request allowlist, budgets and invariants; add synthetic security checks before execution.'};
}
export async function runCampaign(dir,{ackTarget,credentialEnv=process.env}={}){
 dir=path.resolve(dir);const raw=await fs.readFile(path.join(dir,'campaign.json')),p=validateCampaign(JSON.parse(raw));
 must(ackTarget===p.target,'Acknowledgement must match the exact campaign target');
 const runtime=await runtimeConfig();
 for(const b of p.branches){if(b.engine==='browser')must(runtime.playwrightModule&&path.isAbsolute(runtime.playwrightModule),'Configure an absolute Playwright module path');if(b.engine==='k6')must(runtime.k6Binary&&path.isAbsolute(runtime.k6Binary),'Configure an absolute k6 binary path');}
 for(const name of secretNames(p))must(credentialEnv[name],'Missing synthetic credential environment variable: '+name);
 for(const b of p.branches)if(b.engine==='security')for(const c of b.config.checks)if(c.type==='object-isolation')must(credentialEnv[c.ownerTokenEnv]!==credentialEnv[c.otherTokenEnv],'Distinct synthetic identities required');
 const run=path.join(dir,'run');await fs.mkdir(run);await fs.writeFile(path.join(run,'status.json'),json({status:'running',campaignSha256:sha(raw)}));
 const started=performance.now(),results=[],files=['engines.json'];
 try{
 await fs.writeFile(path.join(run,'engines.json'),json({node:process.version,...await engineDoctor()}));
 for(const b of p.branches){
 const remaining=p.budget.maxDurationMs-(performance.now()-started);if(remaining<=0)break;
 must(sha(await fs.readFile(path.join(dir,'campaign.json')))===sha(raw),'Campaign changed during execution');
 const dest=path.join(run,b.id);await fs.mkdir(dest);await fs.writeFile(path.join(dest,'input.json'),json({target:p.target,branch:b,runtime}),{flag:'wx'});
 const env=cleanEnv();for(const name of secretNames({branches:[b]}))env[name]=credentialEnv[name];
 const proc=await runProcess(process.execPath,[worker,path.join(dest,'input.json')],{cwd:dest,env,timeoutMs:Math.max(1,remaining)});
 // Playwright intentionally uses a separate browser process group. Clean up that
 // exact owned group after abnormal worker exit, not arbitrary browser processes.
 const browserProcess=path.join(dest,'browser-process.json');
 try{const owned=JSON.parse(await fs.readFile(browserProcess));if(!owned.closed&&Number.isInteger(owned.pid)&&owned.pid>1){try{process.kill(process.platform==='win32'?owned.pid:-owned.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}await fs.writeFile(browserProcess,json({...owned,cleanupRequested:true}));}}catch(e){if(e.code!=='ENOENT')throw e;}
 let result;try{result=JSON.parse(await fs.readFile(path.join(dest,'result.json')));}catch{result={engine:b.engine,passed:false,requests:null,status:'interrupted',reason:'Engine did not finalize. Traffic count unknown; do not replay automatically.'};await fs.writeFile(path.join(dest,'result.json'),json(result));}
 result={...result,execution:{exitCode:proc.code,timedOut:proc.timedOut,cancelled:proc.cancelled,outputOverflow:proc.overflow},passed:result.passed&&proc.code===0&&!proc.timedOut&&!proc.cancelled&&!proc.overflow};
 results.push({id:b.id,hypothesis:b.hypothesis,...result});
 for(const name of await fs.readdir(dest))files.push(b.id+'/'+name);
 if(proc.timedOut||proc.cancelled||proc.overflow||result.status==='interrupted'||result.status==='engine-failed')break;
 }
 must(sha(await fs.readFile(path.join(dir,'campaign.json')))===sha(raw),'Campaign changed during execution');
 const summary={schemaVersion:1,version:'3.1.0-rc.1',status:'completed',campaignSha256:sha(raw),elapsedMs:performance.now()-started,results,skipped:p.branches.slice(results.length).map(b=>b.id),requests:results.some(r=>r.requests===null)?null:results.reduce((n,r)=>n+r.requests,0),passed:results.length===p.branches.length&&results.every(r=>r.passed),capacityVerdict:'ONLY_MEASURED_WORKLOAD',securityVerdict:'ONLY_DECLARED_CHECKS'};
 await fs.writeFile(path.join(run,'summary.json'),json(summary));await fs.writeFile(path.join(run,'report.md'),campaignReport(summary));await fs.writeFile(path.join(run,'status.json'),json({status:'completed'}));files.push('summary.json','report.md','status.json');
 await fs.writeFile(path.join(run,'evidence.json'),json({schemaVersion:1,campaignSha256:sha(raw),files:await Promise.all(files.sort().map(async file=>({file,sha256:sha(await fs.readFile(path.join(run,file)))})))}));return summary;
 }catch(e){await fs.writeFile(path.join(run,'status.json'),json({status:'failed',error:e.message}));throw e;}
}
export function campaignReport(s){return '# WhatIF branching experiment\n\n'+s.results.map(r=>`## ${r.id}: ${r.passed?'PASS':'FAIL'}\n\nHypothesis: ${r.hypothesis}\n\nEngine: ${r.engine}. Measured requests: ${r.requests??'unknown'}.\n\nEvidence: [result](${r.id}/result.json)\n\n${(r.limitations||[]).map(l=>'- '+l).join('\n')}`).join('\n\n')+`\n\nSkipped: ${s.skipped.join(', ')||'none'}.\n\nThese are observations under declared conditions, not predictions about untested worlds. A browser-injected failure is not a server outage.\n`;}
export async function verifyCampaign(dir){
 const raw=await fs.readFile(path.join(dir,'campaign.json')),p=validateCampaign(JSON.parse(raw)),run=path.join(dir,'run');
 const index=JSON.parse(await fs.readFile(path.join(run,'evidence.json')));must(index.schemaVersion===1&&index.campaignSha256===sha(raw),'Campaign integrity mismatch');
 must(Array.isArray(index.files)&&index.files.length>=4&&index.files.length<=60,'Invalid campaign evidence');const seen=new Set();
 const allowed=new Set(['summary.json','status.json','report.md','engines.json',...p.branches.flatMap(b=>['input.json','result.json','load.js','k6-config.json','k6-summary.json','browser-process.json'].map(f=>b.id+'/'+f))]);
 for(const f of index.files){must(allowed.has(f.file)&&!seen.has(f.file),'Invalid evidence path');seen.add(f.file);const dest=path.join(run,f.file);if(f.file.includes('/'))must((await fs.lstat(path.dirname(dest))).isDirectory(),'Evidence directory must not be a symlink');must((await fs.lstat(dest)).isFile(),'Evidence must be regular files');must(sha(await fs.readFile(dest))===f.sha256,'Evidence integrity mismatch');}
 for(const f of ['summary.json','status.json','report.md','engines.json'])must(seen.has(f),'Missing campaign evidence');
 const s=JSON.parse(await fs.readFile(path.join(run,'summary.json')));must(s.status==='completed'&&s.campaignSha256===sha(raw),'Campaign incomplete');
 must(Array.isArray(s.results)&&s.results.length<=p.branches.length,'Invalid campaign results');
 for(const [i,r]of s.results.entries()){must(r.id===p.branches[i]?.id,'Unexpected branch result');for(const f of ['input.json','result.json'])must(seen.has(r.id+'/'+f),'Missing branch evidence');}
 return {verified:true,branches:s.results.length,passed:s.passed,files:index.files.length,note:'Hash verification, not signed attestation or universal correctness.'};
}
export async function compareCampaigns(baseline,candidate){
 await verifyCampaign(baseline);await verifyCampaign(candidate);
 const read=(dir,f)=>fs.readFile(path.join(dir,f),'utf8').then(JSON.parse);
 const [bp,cp,b,c,be,ce]=await Promise.all([read(baseline,'campaign.json'),read(candidate,'campaign.json'),read(baseline,'run/summary.json'),read(candidate,'run/summary.json'),read(baseline,'run/engines.json'),read(candidate,'run/engines.json')]);
 const comparable=JSON.stringify(bp)===JSON.stringify(cp)&&JSON.stringify(be)===JSON.stringify(ce)&&b.version===c.version&&b.skipped.length===0&&c.skipped.length===0;
 return {comparable,verdict:!comparable?'INCOMPARABLE':!b.passed&&c.passed?'RECOVERY':b.passed&&!c.passed?'REGRESSION':'NO_PASS_TRANSITION',branches:b.results.map(before=>{const after=c.results.find(x=>x.id===before.id);return {id:before.id,before:before.passed,after:after?.passed??null,transition:!after?'missing':before.passed===after.passed?'unchanged':after.passed?'recovered':'regressed'};}),limitations:['Only identical campaign/engine configurations are compared.','Application revision and fixture state must be tracked separately.','Single runs do not establish statistical performance improvement or general security.']};
}
