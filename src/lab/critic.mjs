import {sha,json} from '../core.mjs';
export function critique(candidate,result){
 let verdict='inconclusive',signals=[];
 if(result&&!result.execution?.cancelled&&!result.execution?.timedOut&&!result.execution?.outputOverflow&&result.requests!==null&&!['engine-failed','interrupted'].includes(result.status)){
 if(result.engine==='security'&&result.results?.some(r=>r.classification==='inconclusive-positive-control-failed'))signals=['positive-control-failed'];
 else if(result.engine==='browser'&&result.interventionExercised===false)signals=['intervention-not-exercised'];
 else if(result.engine==='browser'&&result.network?.blocked>0&&!result.network?.limitHits)signals=['scope-blocked-needs-review'];
 else if(result.engine==='browser'&&result.steps?.some(s=>!s.passed&&['goto','click','fill'].includes(s.action)))signals=['journey-action-unresolved'];
 else if(result.passed){verdict='pass';signals=['declared-invariants-held'];}
 else{
 verdict='failure';
 if(result.engine==='security')signals=(result.results||[]).filter(r=>!r.passed).map(r=>`${r.type}:${r.path}:${r.anonymousDenied===false?'anonymous-leak':''}:${r.crossDenied===false?'cross-account-access':''}`);
 if(result.engine==='browser'){signals=(result.steps||[]).filter(s=>!s.passed).map(s=>`step-${s.step}:${s.action}`);if(result.network?.limitHits)signals.push('request-budget-exhausted');if(result.network?.blocked)signals.push('blocked-requests');if(result.failures?.some(f=>f.classification==='observed-network-failure'))signals.push('network-failure');}
 if(result.engine==='k6')signals=(result.routes||[]).filter(r=>r.errorRate===null||r.p95Ms===null||r.errorRate>candidate.config.maxErrorRate||r.p95Ms>candidate.config.p95Ms).map(r=>'route:'+r.path);if(result.engine==='k6'&&!result.budgetComplete)signals.push('load-incomplete');
 if(!signals.length){verdict='inconclusive';signals=['failure-without-specific-evidence'];}
 }
 }else signals=['engine-or-interruption'];
 const symptom=verdict==='failure'?'f-'+sha(json({engine:candidate.engine,seedId:candidate.seedId,signals})).slice(0,16):null;
 return {role:'critic',policy:'deterministic-evidence-gates-v2',verdict,signals,symptom,warning:'Repeated symptoms are not proof of a shared root cause, exploitability, or statistically established performance.'};
}
export function updateHistory(history,candidate,critic,trial){
 const h=history[candidate.id]??={attempts:0,passes:0,failures:0,inconclusive:0,symptoms:{},trials:[]};h.attempts++;h[critic.verdict==='pass'?'passes':critic.verdict==='failure'?'failures':'inconclusive']++;
 if(critic.symptom)h.symptoms[critic.symptom]=(h.symptoms[critic.symptom]||0)+1;h.trials.push(trial);return h;
}
export function blueRecommendation(candidate,critic){
 const hints=[];
 if(critic.verdict==='inconclusive')hints.push('Repair the fixture, positive control or engine execution before attributing a product defect.');
 else if(candidate.engine==='security')hints.push('Trace authorization from authenticated identity to resource ownership; enforce the boundary on the server and check denial responses for sensitive content.');
 else if(candidate.engine==='browser'){hints.push('Trace the failing UI assertion to request completion, error handling and retained user state.');if(critic.signals.includes('request-budget-exhausted'))hints.push('Inspect retry termination, maximum attempts, backoff and cancellation; the budget breach is observed, an infinite loop is not established.');}
 else hints.push('Correlate route failures with generator saturation and server metrics before assigning a bottleneck.');
 return {role:'blue',status:'recommendation-not-applied',hints,retest:'Replay the exact candidate against a recorded corrected app revision; do not change its oracle to make it pass.'};
}
export function ledger(space,history,confirmations){return space.candidates.filter(c=>history[c.id]).map(c=>{const h=history[c.id],reproduced=Math.max(0,...Object.values(h.symptoms))>=confirmations;return {candidateId:c.id,seedId:c.seedId,change:c.change,engine:c.engine,...h,state:h.inconclusive?'inconclusive':h.passes&&h.failures?'flaky':reproduced?'reproduced-failure':h.failures?'failure-needs-replay':h.passes>=confirmations?'repeat-pass':'single-pass'};});}
