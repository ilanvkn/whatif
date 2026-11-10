import fs from 'node:fs/promises';
import path from 'node:path';
import {runProcess,cleanEnv} from './process.mjs';
export function loadScript(target,c){
 const config={...c,target,endpoints:c.endpoints.map(e=>({...e,url:new URL(e.path,target).href}))};
 const thresholds={};for(let i=0;i<c.endpoints.length;i++){thresholds['route_errors_'+i]=['rate<='+c.maxErrorRate];thresholds['route_latency_'+i]=['p(95)<='+c.p95Ms];}
 return `import http from 'k6/http';
import {sleep} from 'k6';
import exec from 'k6/execution';
import {Rate,Trend} from 'k6/metrics';
const c=${JSON.stringify(config)};
const errors=c.endpoints.map((_,i)=>new Rate('route_errors_'+i));
const latency=c.endpoints.map((_,i)=>new Trend('route_latency_'+i));
export const options=${JSON.stringify({discardResponseBodies:true,noConnectionReuse:false,insecureSkipTLSVerify:false,scenarios:{load:{executor:'shared-iterations',vus:c.vus,iterations:c.maxRequests,maxDuration:c.durationMs+'ms',gracefulStop:'0s'}},thresholds,systemTags:[]})};
export default function(){const i=exec.scenario.iterationInTest%c.endpoints.length,e=c.endpoints[i];const r=http.get(e.url,{redirects:0,timeout:c.timeoutMs+'ms'});errors[i].add(!e.expectedStatuses.includes(r.status));latency[i].add(r.timings.duration);if(c.paceMs)sleep(c.paceMs/1000);}
export function handleSummary(data){return {'k6-summary.json':JSON.stringify(data)};}
`;
}
export async function loadTest({target,config:c},runtime,dir){
 const script=loadScript(target,c);await fs.writeFile(path.join(dir,'load.js'),script,{flag:'wx'});await fs.writeFile(path.join(dir,'k6-config.json'),'{}',{flag:'wx'});
 const proc=await runProcess(runtime.k6Binary,['run','--quiet','--no-usage-report','--address','','--config',path.join(dir,'k6-config.json'),path.join(dir,'load.js')],{cwd:dir,env:cleanEnv(),timeoutMs:c.durationMs+5000,ownGroup:false});
 let raw;try{raw=JSON.parse(await fs.readFile(path.join(dir,'k6-summary.json')));}catch{return {engine:'k6',passed:false,requests:null,status:'engine-failed',exitCode:proc.code,timedOut:proc.timedOut,reason:'No completed k6 summary; request count unknown. Never replay automatically.'};}
 const metrics=raw.metrics||{};const count=metrics.http_reqs?.values?.count??null;
 const routes=c.endpoints.map((e,i)=>({path:e.path,errorRate:metrics['route_errors_'+i]?.values?.rate??null,p95Ms:metrics['route_latency_'+i]?.values?.['p(95)']??null}));
 const complete=count===c.maxRequests;
 return {engine:'k6',passed:proc.code===0&&!proc.timedOut&&complete&&routes.every(r=>r.errorRate!==null&&r.p95Ms!==null&&r.errorRate<=c.maxErrorRate&&r.p95Ms<=c.p95Ms),exitCode:proc.code,timedOut:proc.timedOut,requests:count,budgetComplete:complete,routes,metrics:{iterations:metrics.iterations?.values?.count??null,requestRate:metrics.http_reqs?.values?.rate??null,failedRequests:metrics.http_req_failed?.values?.rate??null},limitations:['Closed workload with fixed total requests, bounded VUs and optional pacing; not an open arrival-rate or distributed test.','No server telemetry collected; this measures the combined generator/network/application path.','Bodies discarded; no remote/cloud output configured. Capacity at unexecuted scales remains unknown.']};
}
