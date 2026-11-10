import {validateCampaign,integer,must} from '../engines/contracts.mjs';
import {sha,json} from '../core.mjs';
export const canonical=v=>JSON.stringify(v,(_,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);
export const defaultOperators=()=>({statuses:[400,401,403,404,409,429,500,502,503,504],delaysMs:[250,1000,3000],abort:true,viewports:[{width:390,height:844},{width:768,height:1024},{width:1440,height:900}],locales:['en-US','en-GB','ja-JP'],timezones:['UTC','Asia/Kuala_Lumpur','America/New_York'],reducedMotion:['reduce','no-preference'],vus:[1,5,20,50],paceMs:[0,50,200],repeatClicks:[2,3],interactionDepth:2});
export function validateLab(lab){
 must(Buffer.byteLength(JSON.stringify(lab))<=524288,'Lab contract exceeds 512 KiB');
 must(lab?.schemaVersion===2,'Unsupported lab schema');validateCampaign(lab.seedCampaign);
 const l=lab.limits;must(l,'Lab limits required');for(const [k,min,max]of [['maxEpochs',1,20],['trialsPerEpoch',1,10],['maxTrials',1,100],['maxRequests',1,50000],['maxDurationMs',1000,900000],['trialDurationMs',1000,300000],['confirmations',2,5],['stagnationEpochs',1,10],['maxCandidates',1,1000]])integer(l[k],min,max,k);
 must(l.maxCandidates>=lab.seedCampaign.branches.length,'Candidate cap must admit declared baselines');
 must(typeof lab.seed==='string'&&lab.seed.length>0&&lab.seed.length<=100,'Deterministic seed required');
 must(lab.fixture&&typeof lab.fixture.repeatSafe==='boolean'&&typeof lab.fixture.appRevision==='string'&&typeof lab.fixture.resetStrategy==='string','Fixture repeat-safety, revision and reset strategy required');
 const o=lab.operators;must(o&&typeof o.abort==='boolean','Mutation operators required');
 for(const name of ['statuses','delaysMs','viewports','locales','timezones','reducedMotion','vus','paceMs','repeatClicks'])must(Array.isArray(o[name])&&o[name].length<=20,'Invalid operator list '+name);
 integer(o.interactionDepth,1,2,'interactionDepth');for(const n of o.paceMs)integer(n,0,10000,'paceMs');for(const n of o.repeatClicks)integer(n,2,5,'repeatClicks');
 for(const n of o.statuses)integer(n,400,599,'status');for(const n of o.delaysMs)integer(n,1,10000,'delay');for(const n of o.vus)integer(n,1,100,'VU');
 for(const v of o.viewports){integer(v.width,320,3840,'width');integer(v.height,320,2160,'height');}
 for(const name of ['locales','timezones'])for(const v of o[name])must(typeof v==='string'&&v.length>0&&v.length<=80,'Invalid context value');
 for(const v of o.reducedMotion)must(['reduce','no-preference'].includes(v),'Invalid motion preference');return lab;
}
export function compileSpace(lab){
 validateLab(lab);const candidates=[],ids=new Set();let duplicates=0,omitted=0,compiledBytes=0;
 const add=(seed,config,change,role)=>{
 const branch={id:'trial',engine:seed.engine,hypothesis:seed.hypothesis,config};
 validateCampaign({schemaVersion:1,target:lab.seedCampaign.target,question:lab.seedCampaign.question,budget:{maxRequests:config.maxRequests,maxDurationMs:lab.limits.trialDurationMs},branches:[branch]});
 const id='c-'+sha(canonical({engine:seed.engine,config})).slice(0,16);
 if(ids.has(id)){duplicates++;return;}ids.add(id);if(candidates.length>=lab.limits.maxCandidates){omitted++;return;}
 const candidate={id,seedId:seed.id,engine:seed.engine,hypothesis:seed.hypothesis,config,change,role,baseline:change==='baseline'};const bytes=Buffer.byteLength(JSON.stringify(candidate));if(compiledBytes+bytes>8388608){omitted++;return;}compiledBytes+=bytes;candidates.push(candidate);
 };
 // Admit all declared baselines before mutation families consume the candidate cap.
 for(const s of lab.seedCampaign.branches)add(s,structuredClone(s.config),'baseline','user');
 for(const s of lab.seedCampaign.branches){const base=s.config,o=lab.operators;
 if(s.engine==='browser'){
 if(base.intervention){for(const status of o.statuses){const c=structuredClone(base);c.intervention={path:base.intervention.path,type:'status',status};add(s,c,'dependency-status-'+status,'red');}
 for(const delayMs of o.delaysMs){const c=structuredClone(base);c.intervention={path:base.intervention.path,type:'delay',delayMs};add(s,c,'dependency-delay-'+delayMs,'red');}
 if(o.abort){const c=structuredClone(base);c.intervention={path:base.intervention.path,type:'abort'};add(s,c,'dependency-abort','red');}}
 for(const [key,values]of [['viewport',o.viewports],['locale',o.locales],['timezoneId',o.timezones],['reducedMotion',o.reducedMotion]])for(const value of values){const c=structuredClone(base);c[key]=value;add(s,c,key+'-'+JSON.stringify(value),'user');}
 for(const repeats of o.repeatClicks){for(const [i,step]of base.steps.entries()){if(step.action!=='click'||base.steps.length+repeats-1>100)continue;const c=structuredClone(base);c.steps.splice(i,1,...Array.from({length:repeats},()=>structuredClone(step)));add(s,c,'repeat-click-'+i+'-x'+repeats,'user');}}
 if(o.interactionDepth===2&&base.intervention){for(const status of o.statuses)for(const viewport of o.viewports){const c=structuredClone(base);c.intervention={path:base.intervention.path,type:'status',status};c.viewport=viewport;add(s,c,'status-'+status+'-viewport-'+viewport.width+'x'+viewport.height,'red');}}
 }else if(s.engine==='k6'){for(const vus of o.vus){if(vus>base.maxRequests)continue;const c=structuredClone(base);c.vus=vus;add(s,c,'concurrency-'+vus,'red');}
 for(const paceMs of o.paceMs){const c=structuredClone(base);c.paceMs=paceMs;add(s,c,'pace-'+paceMs,'red');}
 if(o.interactionDepth===2)for(const vus of o.vus)for(const paceMs of o.paceMs){if(vus>base.maxRequests)continue;const c=structuredClone(base);c.vus=vus;c.paceMs=paceMs;add(s,c,'vus-'+vus+'-pace-'+paceMs,'red');}} 
 }
 return {schemaVersion:2,candidates,compiledBytes,duplicates,omitted,truncated:omitted>0,scope:'Only declared seed paths, methods, identities and assertions; no inferred endpoints or new exploit payloads.'};
}
export function chooseCandidate(space,history,epochSeen,seed){
 const state=id=>history[id]||{attempts:0,passes:0,failures:0,inconclusive:0};
 const failedSeeds=new Set(space.candidates.filter(c=>state(c.id).failures>0).map(c=>c.seedId));
 const blockedSeeds=new Set(space.candidates.filter(c=>c.baseline&&state(c.id).inconclusive>0).map(c=>c.seedId));
 const available=space.candidates.filter(c=>!blockedSeeds.has(c.seedId)&&!epochSeen.has(c.id)&&state(c.id).attempts<space.confirmations&&state(c.id).inconclusive===0);
 const score=c=>{const s=state(c.id);if(s.attempts===0&&c.baseline)return 100;if(s.failures>0&&s.attempts<space.confirmations)return 90;if(s.attempts===0&&failedSeeds.has(c.seedId))return 80;if(s.attempts===0)return 70;return 10;};
 available.sort((a,b)=>score(b)-score(a)||sha(seed+a.id).localeCompare(sha(seed+b.id)));
 const c=available[0];return c?{candidate:c,reason:score(c)===100?'Establish declared baseline':score(c)===90?'Reproduce an observed failure in another trial':score(c)===80?'Explore a neighboring condition of a failing journey':score(c)===70?'Cover an untested condition':'Check repeatability of an observed pass'}:null;
}
