import fs from 'node:fs/promises';
import path from 'node:path';
import {json,sha} from '../core.mjs';
import {runCampaign,verifyCampaign,engineDoctor} from '../campaign.mjs';
import {must} from '../engines/contracts.mjs';
import {defaultOperators,validateLab,compileSpace,chooseCandidate} from './space.mjs';
import {critique,updateHistory,blueRecommendation,ledger} from './critic.mjs';
export async function planLab({campaignDirectory,out}){
 const seedCampaign=JSON.parse(await fs.readFile(path.join(campaignDirectory,'campaign.json')));
 const lab={schemaVersion:2,seed:'whatif-v2',seedCampaign,fixture:{repeatSafe:false,appRevision:'unrecorded',resetStrategy:''},operators:defaultOperators(),limits:{maxEpochs:5,trialsPerEpoch:3,maxTrials:15,maxRequests:2000,maxDurationMs:300000,trialDurationMs:60000,confirmations:2,stagnationEpochs:2,maxCandidates:300}};
 const space=compileSpace(lab);await fs.mkdir(out,{recursive:false});await fs.writeFile(path.join(out,'lab.json'),json(lab),{flag:'wx'});await fs.writeFile(path.join(out,'space-preview.json'),json(space),{flag:'wx'});
 return {labDirectory:path.resolve(out),candidateCount:space.candidates.length,truncated:space.truncated,execution:'not-started',next:'Review lab.json, operators, invariant oracles, repeat safety, revision and budgets. Preview is illustrative; run compiles and hashes the reviewed manifest.'};
}
export async function inspectLab(dir){const lab=validateLab(JSON.parse(await fs.readFile(path.join(dir,'lab.json')))),space=compileSpace(lab);return {lab,space,ready:lab.fixture.repeatSafe&&lab.fixture.appRevision!=='unrecorded'&&lab.fixture.resetStrategy.trim().length>0};}
export async function runLab(dir,{ackTarget}={}){
 dir=path.resolve(dir);const raw=await fs.readFile(path.join(dir,'lab.json')),lab=validateLab(JSON.parse(raw)),space=compileSpace(lab);
 must(ackTarget===lab.seedCampaign.target,'Acknowledgement must match the lab target');must(lab.fixture.repeatSafe&&lab.fixture.appRevision.trim()&&lab.fixture.appRevision!=='unrecorded'&&lab.fixture.resetStrategy.trim(),'Record repeat-safe fixture, app revision and reset strategy before repeated execution');
 const run=path.join(dir,'run');await fs.mkdir(run);const history={},trials=[],epochs=[],started=performance.now(),limits=lab.limits;let reserved=0,actual=0,unknown=false,stagnation=0,stopReason='epoch-limit';
 await fs.writeFile(path.join(run,'status.json'),json({status:'running',labSha256:sha(raw)}));await fs.writeFile(path.join(run,'events.jsonl'),'');
 try{
 await fs.writeFile(path.join(run,'space.json'),json(space));await fs.writeFile(path.join(run,'engines.json'),json(await engineDoctor()));
 const knownSymptoms=new Set();
 outer:for(let epoch=1;epoch<=limits.maxEpochs;epoch++){
 const epochSeen=new Set(),decisions=[];let novelty=0;
 for(let slot=0;slot<limits.trialsPerEpoch;slot++){
 if(trials.length>=limits.maxTrials){stopReason='trial-limit';break outer;}
 const remaining=limits.maxDurationMs-(performance.now()-started);if(remaining<1000){stopReason='time-limit';break outer;}
 must(sha(await fs.readFile(path.join(dir,'lab.json')))===sha(raw),'Lab changed during execution');
 const picked=chooseCandidate({...space,confirmations:limits.confirmations},history,epochSeen,lab.seed);
 if(!picked){if(slot===0){stopReason='space-exhausted';break outer;}break;}
 const c=picked.candidate;epochSeen.add(c.id);
 if(reserved+c.config.maxRequests>limits.maxRequests){stopReason='request-reservation-limit';break outer;}
 const trial=`epoch-${String(epoch).padStart(3,'0')}/trial-${String(trials.length+1).padStart(3,'0')}`,dest=path.join(run,trial);await fs.mkdir(dest,{recursive:true});
 const campaign={schemaVersion:1,target:lab.seedCampaign.target,question:lab.seedCampaign.question,budget:{maxRequests:c.config.maxRequests,maxDurationMs:Math.floor(Math.min(remaining,limits.trialDurationMs))},branches:[{id:'trial',engine:c.engine,hypothesis:c.hypothesis,config:c.config}]};
 await fs.writeFile(path.join(dest,'campaign.json'),json(campaign),{flag:'wx'});reserved+=c.config.maxRequests;
 const summary=await runCampaign(dest,{ackTarget});await verifyCampaign(dest);const result=summary.results[0];const review=critique(c,result);
 if(!history[c.id])novelty++;if(review.symptom&&!knownSymptoms.has(review.symptom)){novelty++;knownSymptoms.add(review.symptom);}
 updateHistory(history,c,review,trial);if(summary.requests===null)unknown=true;else actual+=summary.requests;
 const roles={epoch,trial,candidateId:c.id,red:{role:c.role,proposal:c.change,selectionReason:picked.reason},user:{goal:c.hypothesis,oracleSource:c.seedId,oracleChanged:false},tester:{engine:c.engine,evidence:trial+'/run/evidence.json',requests:summary.requests},critic:review,blue:blueRecommendation(c,review)};
 decisions.push(roles);await fs.appendFile(path.join(run,'events.jsonl'),JSON.stringify(roles)+'\n');
 trials.push({trial,candidateId:c.id,epoch,critic:review,evidenceSha256:sha(await fs.readFile(path.join(dest,'run/evidence.json')))});
 if(result?.execution?.cancelled||result?.execution?.timedOut||result?.execution?.outputOverflow||summary.requests===null||result?.status==='engine-failed'||result?.status==='interrupted'){stopReason='engine-interruption';break outer;}
 }
 epochs.push({epoch,trials:decisions.length,novelty});stagnation=novelty===0?stagnation+1:0;
 if(stagnation>=limits.stagnationEpochs){stopReason='stagnation';break;}
 }
 must(sha(await fs.readFile(path.join(dir,'lab.json')))===sha(raw),'Lab changed during execution');
 const findings=ledger(space,history,limits.confirmations),reproduced=findings.filter(f=>f.state==='reproduced-failure');
 const regressions={schemaVersion:2,target:lab.seedCampaign.target,sourceLabSha256:sha(raw),cases:reproduced.map(f=>({candidate:space.candidates.find(c=>c.id===f.candidateId),evidence:f.trials}))};
 const observedFailures=findings.filter(f=>f.failures>0).length;
 const summary={observedFailures,symptomClusters:knownSymptoms.size,outcome:observedFailures?'FAILURES_OBSERVED':findings.some(f=>f.inconclusive||f.attempts<limits.confirmations)||findings.length<space.candidates.length||space.truncated?'INCOMPLETE_OR_INCONCLUSIVE':'NO_FAILURE_IN_EXECUTED_TRIALS',schemaVersion:2,version:'3.1.0',status:'completed',labSha256:sha(raw),stopReason,fixture:lab.fixture,epochs:Math.max(0,...trials.map(t=>t.epoch)),trials:trials.length,reservedRequests:reserved,observedRequests:unknown?null:actual,candidates:space.candidates.length,covered:findings.length,unexecuted:space.candidates.length-findings.length,truncated:space.truncated,reproducedFailures:reproduced.length,flaky:findings.filter(f=>f.state==='flaky').length,inconclusive:findings.filter(f=>f.state==='inconclusive').length,elapsedMs:performance.now()-started,roles:'Deterministic policies and evidence artifacts; no independent LLMs or human-user simulation.'};
 for(const [file,value]of [['summary.json',summary],['findings.json',findings],['regressions.json',regressions],['trials.json',trials],['status.json',{status:'completed'}]])await fs.writeFile(path.join(run,file),json(value));
 await fs.writeFile(path.join(run,'report.md'),labReport(summary,findings));
 const names=['space.json','engines.json','events.jsonl','summary.json','findings.json','regressions.json','trials.json','status.json','report.md'];
 await fs.writeFile(path.join(run,'evidence.json'),json({schemaVersion:2,labSha256:sha(raw),files:await Promise.all(names.map(async file=>({file,sha256:sha(await fs.readFile(path.join(run,file)))})))}));return summary;
 }catch(e){await fs.writeFile(path.join(run,'status.json'),json({status:'failed',error:e.message}));throw e;}
}
export function labReport(s,findings){return `# WhatIF V2 trial laboratory\n\n${s.reproducedFailures} reproduced failures; ${s.flaky} flaky candidates; ${s.inconclusive} inconclusive.\n\n${s.trials} trials across ${s.epochs} epochs; ${s.covered}/${s.candidates} candidates covered. Stop: ${s.stopReason}.\n\nObserved requests: ${s.observedRequests??'unknown'}; conservative reservations: ${s.reservedRequests}.\n\n`+findings.map(f=>`- **${f.state}** ${f.candidateId}: ${f.change}; ${f.attempts} trials. [Evidence](${f.trials[0]}/run/report.md)`).join('\n')+`\n\nRole reasoning: [events](events.jsonl). Exact reproduced cases: [regression pack](regressions.json).\n\nRoles are deterministic policies, not independent AI models. Repetition is not statistical certainty. Untested candidates and unknown root causes remain unknown. No application patch was automatically applied.\n`;}
export async function verifyLab(dir){
 const raw=await fs.readFile(path.join(dir,'lab.json'));validateLab(JSON.parse(raw));const run=path.join(dir,'run'),index=JSON.parse(await fs.readFile(path.join(run,'evidence.json')));must(index.schemaVersion===2&&index.labSha256===sha(raw),'Lab integrity mismatch');
 const required=new Set(['space.json','engines.json','events.jsonl','summary.json','findings.json','regressions.json','trials.json','status.json','report.md']);must(Array.isArray(index.files)&&index.files.length===required.size,'Invalid lab evidence index');
 for(const f of index.files){must(required.delete(f.file),'Invalid lab evidence path');const dest=path.join(run,f.file);must((await fs.lstat(dest)).isFile(),'Regular lab evidence required');must(sha(await fs.readFile(dest))===f.sha256,'Lab evidence integrity mismatch');}
 const trials=JSON.parse(await fs.readFile(path.join(run,'trials.json')));must(Array.isArray(trials)&&trials.length<=100,'Invalid trials');const seen=new Set();
 for(const t of trials){must(/^epoch-\d{3}\/trial-\d{3}$/.test(t.trial)&&!seen.has(t.trial),'Invalid trial path');seen.add(t.trial);const dest=path.join(run,t.trial);must((await fs.lstat(path.dirname(dest))).isDirectory()&&(await fs.lstat(dest)).isDirectory(),'Regular trial directories required');must(sha(await fs.readFile(path.join(dest,'run/evidence.json')))===t.evidenceSha256,'Trial evidence index changed');await verifyCampaign(dest);}
 const summary=JSON.parse(await fs.readFile(path.join(run,'summary.json')));must(summary.status==='completed'&&summary.labSha256===sha(raw)&&summary.trials===trials.length,'Incomplete lab');return {verified:true,trials:trials.length,stopReason:summary.stopReason,reproducedFailures:summary.reproducedFailures,note:'Integrity verification; not a safety guarantee or signed attestation.'};
}
export async function replayLab({labDirectory,out}){
 await verifyLab(labDirectory);const old=JSON.parse(await fs.readFile(path.join(labDirectory,'lab.json'))),pack=JSON.parse(await fs.readFile(path.join(labDirectory,'run/regressions.json')));
 must(pack.cases.length>0,'No reproduced failures to replay');must(pack.cases.length<=10,'Replay at most 10 confirmed cases per lab; split the pack deliberately');
 const lab=structuredClone(old);lab.fixture={...lab.fixture,repeatSafe:false,appRevision:'unrecorded'};lab.seedCampaign.branches=pack.cases.map(({candidate:c},i)=>({id:'replay-'+i,engine:c.engine,hypothesis:c.hypothesis,config:c.config}));lab.seedCampaign.budget.maxRequests=lab.seedCampaign.branches.reduce((n,b)=>n+b.config.maxRequests,0);lab.operators={statuses:[],delaysMs:[],abort:false,viewports:[],locales:[],timezones:[],reducedMotion:[],vus:[],paceMs:[],repeatClicks:[],interactionDepth:1};const space=compileSpace(lab);await fs.mkdir(out,{recursive:false});await fs.writeFile(path.join(out,'lab.json'),json(lab),{flag:'wx'});return {labDirectory:path.resolve(out),candidates:space.candidates.length,next:'Record corrected app revision and repeat-safe fixture. Oracles and concrete candidate configurations are unchanged.'};
}
export async function compareLabs(baseline,candidate){
 await verifyLab(baseline);await verifyLab(candidate);
 const read=(d,f)=>fs.readFile(path.join(d,f),'utf8').then(JSON.parse);
 const [b,c,bl,cl,be,ce,bp,cp]=await Promise.all([read(baseline,'run/summary.json'),read(candidate,'run/summary.json'),read(baseline,'run/findings.json'),read(candidate,'run/findings.json'),read(baseline,'run/engines.json'),read(candidate,'run/engines.json'),read(baseline,'lab.json'),read(candidate,'lab.json')]);
 const compatible=bp.seedCampaign.target===cp.seedCampaign.target&&JSON.stringify(be)===JSON.stringify(ce)&&bp.limits.confirmations===cp.limits.confirmations;
 const transitions=bl.map(before=>{const after=cl.find(x=>x.candidateId===before.candidateId);return {candidateId:before.candidateId,before:before.state,after:after?.state??'unexecuted',transition:!compatible?'incomparable':!after?'untested':before.state==='reproduced-failure'&&after.state==='repeat-pass'?'recovered':before.state==='repeat-pass'&&after.state==='reproduced-failure'?'regressed':'unresolved-or-unchanged'};});
 return {compatible,baselineRevision:b.fixture.appRevision,candidateRevision:c.fixture.appRevision,transitions,recovered:transitions.filter(t=>t.transition==='recovered').length,regressed:transitions.filter(t=>t.transition==='regressed').length,limitations:['Matches only concrete candidate hashes with compatible target, engine identity and confirmation policy.','Fixture/app revision is an operator declaration, not independently attested deployment identity.','Unexecuted candidates and uncertain symptoms are never marked fixed.']};
}
