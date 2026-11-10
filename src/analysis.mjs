import fs from 'node:fs/promises';
import path from 'node:path';
import {validatePlan,workload,verifyCase,sha} from './core.mjs';

// Quantiles describe this sample; they are not population confidence bounds.
export function metrics(rows){
 const durations=rows.map(r=>r.durationMs).sort((a,b)=>a-b);
 const q=p=>durations.length?durations[Math.ceil(p*durations.length)-1]:null;
 const failures=rows.filter(r=>!r.passed);
 return {requests:rows.length,failures:failures.length,errorRate:rows.length?failures.length/rows.length:null,p50Ms:q(.5),p95Ms:q(.95),p99Ms:q(.99),maxMs:durations.at(-1)??null,timeouts:rows.filter(r=>r.error==='timeout').length,connectionErrors:rows.filter(r=>r.error==='connection-error').length,statusCounts:rows.reduce((a,r)=>{const k=String(r.status??'no-response');a[k]=(a[k]||0)+1;return a;},{})};
}
export function routeMetrics(observations,plan){
 return plan.endpoints.map(e=>{const rows=observations.filter(r=>r.path===e.path);const m=metrics(rows);return {path:e.path,...m,passed:m.requests>0&&m.p95Ms<=plan.slo.p95Ms&&m.errorRate<=plan.slo.maxErrorRate,evidenceIds:rows.filter(r=>!r.passed).map(r=>r.id),sampleWarning:m.requests<100?'Small sample; tail latency and error estimates are unstable.':null};});
}
export function analyzePlan(plan){
 validatePlan(plan);
 const variants=['registered','daily-active','concurrent'].map(kind=>({kind,...workload({...plan,population:{...plan.population,kind}})}));
 const sensitivity=[.5,1,2].map(factor=>{const p=structuredClone(plan);p.assumptions.requestsPerSession*=factor;return {requestsPerSession:p.assumptions.requestsPerSession,...workload(p)};});
 return {classification:'derived-illustrative-workload',population:plan.population,selected:workload(plan),populationAlternatives:variants,sensitivity,questions:[...(plan.population.kind==='unspecified'?['Does the population mean registered, daily-active, or simultaneous users?']:[]),'Are the activity, session length, request count and peak assumptions confirmed?','Which journeys and endpoints dominate traffic, and what are their latency/error targets?','What server and generator telemetry will distinguish an app bottleneck from test-generator saturation?'],execution:{maxRequests:plan.budget.maxRequests,concurrency:plan.budget.concurrency,maxDurationMs:plan.budget.maxDurationMs},capacityVerdict:'NOT_ESTABLISHED'};
}
export async function compareCases(baseline,candidate){
 // Verify before consuming either result. A modified artifact is never a baseline.
 await verifyCase(baseline);await verifyCase(candidate);
 const read=async(d,f)=>JSON.parse(await fs.readFile(path.join(d,f),'utf8'));
 const [bp,cp,b,c]=await Promise.all([read(baseline,'scenario.json'),read(candidate,'scenario.json'),read(baseline,'run/summary.json'),read(candidate,'run/summary.json')]);
 const keys=['target','population','assumptions','budget','slo','endpoints'];
 const differences=keys.filter(k=>JSON.stringify(bp[k])!==JSON.stringify(cp[k]));
 if((b.version??'0.1.0')!==(c.version??'0.1.0'))differences.push('evaluatorVersion');
 const comparable=differences.length===0&&b.budgetComplete&&c.budgetComplete;
 const before=await read(baseline,'run/observations.json'),after=await read(candidate,'run/observations.json');
 const routes=bp.endpoints.map(e=>{const x=metrics(before.filter(r=>r.path===e.path)),y=metrics(after.filter(r=>r.path===e.path));return {path:e.path,baseline:x,candidate:y,p95DeltaMs:x.p95Ms===null||y.p95Ms===null?null:y.p95Ms-x.p95Ms,errorRateDelta:x.errorRate===null||y.errorRate===null?null:y.errorRate-x.errorRate};});
 return {schemaVersion:1,classification:'observed-sample-comparison',comparable,differences,baseline:{directory:path.resolve(baseline),summarySha256:sha(await fs.readFile(path.join(baseline,'run/summary.json')))},candidate:{directory:path.resolve(candidate),summarySha256:sha(await fs.readFile(path.join(candidate,'run/summary.json')))},routes,verdict:!comparable?'INCOMPARABLE':b.smokeSloPassed&&!c.smokeSloPassed?'SLO_REGRESSION':!b.smokeSloPassed&&c.smokeSloPassed?'SLO_RECOVERY':'NO_SLO_TRANSITION',limitations:['Single samples are not statistically established performance regressions.','Matching configuration does not establish identical hardware, application version or background load.','No requested-scale capacity or exploit-resistance conclusion.']};
}
