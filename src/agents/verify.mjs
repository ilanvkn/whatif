import fs from 'node:fs/promises';
import path from 'node:path';
import {sha,json} from '../core.mjs';
import {verifyCampaign} from '../campaign.mjs';
import {validateTeam,roleSchemas,relativeFile} from './contracts.mjs';
import {validateRoleOutput} from './provider.mjs';
import {spaceFor} from './scenarios.mjs';
import {STATIC_HOST,staticHostSource,sourceIdentity} from './static-app.mjs';
const must=(ok,message)=>{if(!ok)throw Error(message);};
const same=(a,b)=>json(a)===json(b);
const hashes=s=>s.map(({path,sha256})=>({path,sha256}));
function snapshot(value,files){
 must(Array.isArray(value)&&value.length===files.length,'Invalid source snapshot');
 const seen=new Set();for(const f of value){relativeFile(f.path);must(files.includes(f.path)&&!seen.has(f.path),'Unexpected or duplicate snapshot file');seen.add(f.path);must(typeof f.content==='string'&&sha(f.content)===f.sha256,'Source snapshot content hash mismatch');}return value;
}
/** Reconstruct the immutable baselines plus exactly the reviewed red selections. */
export function verifyMeasuredCases(spec,red,campaign,target){
 const space=spaceFor(spec,target),selected=[...new Set(red.selections.map(s=>s.candidateId))];
 must(selected.length>0&&selected.length<=3&&selected.every(id=>space.candidates.some(c=>c.id===id)),'Red proposed an unreviewed candidate');
 const expected=space.candidates.filter(c=>c.baseline||selected.includes(c.id)).map(c=>({id:c.id,engine:c.engine,hypothesis:c.hypothesis,config:c.config}));
 must(expected.length<=10&&campaign.target===target&&campaign.question===spec.question&&same(campaign.branches,expected),'Measured campaign differs from immutable baselines and reviewed red selections');
 must(campaign.budget?.maxRequests===expected.reduce((n,c)=>n+c.config.maxRequests,0),'Measured campaign request reservation differs from selected cases');
 return expected;
}
export function verifyRestartOracle(reviewed,campaign,target){
 must(campaign.target===target&&campaign.schemaVersion===reviewed.schemaVersion&&campaign.question===reviewed.question&&same(campaign.branches,reviewed.branches)&&campaign.budget.maxRequests===reviewed.budget.maxRequests&&Number.isFinite(campaign.budget.maxDurationMs)&&campaign.budget.maxDurationMs>0&&campaign.budget.maxDurationMs<=reviewed.budget.maxDurationMs,'Restart campaign differs from immutable oracle');
 return campaign;
}
export function verifyDatabaseSnapshot(value){
 must(value&&Array.isArray(value.files)&&value.files.length>0&&value.files.length<=1000,'Invalid database snapshot');
 const seen=new Set();for(const f of value.files){relativeFile(f.path);must(!seen.has(f.path)&&Number.isSafeInteger(f.bytes)&&f.bytes>=0&&/^[a-f0-9]{64}$/.test(f.sha256),'Invalid database snapshot file');seen.add(f.path);}
 must(seen.has('database.sqlite')&&value.snapshotSha256===sha(json(value.files)),'Database snapshot hash mismatch');
 must(value.sqlite?.integrity==='ok'&&Array.isArray(value.sqlite.tables)&&value.sqlite.tables.length<=1000,'Database integrity receipt missing');
 const tables=new Set();for(const table of value.sqlite.tables){must(typeof table.name==='string'&&!tables.has(table.name)&&Number.isSafeInteger(table.count)&&table.count>=0,'Invalid database table count');tables.add(table.name);}
 return value;
}
export function verifyBackendState(state,{seed,sourceSha256,runtimeIdentitySha256}){
 must(state?.schemaVersion===1,'Unsupported backend state receipt');verifyDatabaseSnapshot(seed);
 for(const name of ['before','after','restarted'])verifyDatabaseSnapshot(state[name]);
 must(state.reset?.matched===true&&state.reset.seedSha256===seed.snapshotSha256&&state.reset.beforeSha256===state.before.snapshotSha256&&same(state.before,seed),'Database reset differs from pinned seed');
 must(state.sourceSha256===sourceSha256&&state.runtimeIdentitySha256===runtimeIdentitySha256,'Backend source or runtime binding mismatch');
 must(Number.isSafeInteger(state.requests)&&state.requests>=0&&typeof state.passed==='boolean','Invalid backend trial verdict');
 return state;
}
/** Checks internal evidence consistency; unsigned local hashes are not execution attestation. */
export async function verifyTeamEvidence(directory){
 const dir=await fs.realpath(directory),run=await fs.realpath(path.join(dir,'run'));
 const raw=await fs.readFile(path.join(dir,'team.json')),spec=validateTeam(JSON.parse(raw));
 const index=JSON.parse(await fs.readFile(path.join(run,'evidence.json')));
 must(index.schemaVersion===3&&index.specSha256===sha(raw),'Team manifest integrity mismatch');
 must(Array.isArray(index.files)&&index.files.length>5&&index.files.length<5000,'Invalid team evidence index');
 const listed=new Map();
 async function safeRead(relative){if(relative!=='app/.whatif-static.json')relativeFile(relative);const file=path.join(run,relative);must((await fs.lstat(file)).isFile(),'Regular team evidence required');must((await fs.realpath(file)).startsWith(run+path.sep),'Team evidence escaped run');return fs.readFile(file);}
 for(const f of index.files){relativeFile(f.file);must(!listed.has(f.file),'Duplicate evidence path');const bytes=await safeRead(f.file);must(sha(bytes)===f.sha256,'Team evidence integrity mismatch: '+f.file);listed.set(f.file,bytes);}
 const read=f=>{must(listed.has(f),'Missing indexed team evidence: '+f);return JSON.parse(listed.get(f));};
 for(const f of ['summary.json','epochs.json','calls.json','initial-source.json','final-source.json','report.md','status.json','engines.json'])must(listed.has(f),'Missing team evidence: '+f);
 const summary=read('summary.json'),epochs=read('epochs.json'),calls=read('calls.json');
 const isStatic=spec.runner==='static-web',isBackend=spec.runner==='python-sqlite',isPinned=isStatic||isBackend;
 if(isPinned){must(summary.runner===spec.runner&&same(summary.provenance,spec.provenance),'App provenance mismatch');must(same(read('assets.json'),spec.app.assetHashes),'Pinned asset inventory mismatch');must(Array.isArray(spec.app.assetHashes)&&spec.app.assetHashes.length===spec.app.assets.length&&spec.app.assetHashes.every((f,i)=>f.path===spec.app.assets[i]&&Number.isSafeInteger(f.bytes)&&f.bytes>=0&&/^[a-f0-9]{64}$/.test(f.sha256)),'Invalid pinned asset inventory');if(isStatic){must((await safeRead('app/'+STATIC_HOST)).toString()===staticHostSource,'Trusted static host changed');must((await safeRead('app/.whatif-static.json')).toString()===json({entry:spec.app.entry,files:spec.app.files,assets:spec.app.assets}),'Trusted static configuration changed');}}
 let backendSeed,runtimeHash;
 if(isBackend){const runtime=read('runtime.json');must(same(runtime,spec.backend.runtimeIdentity),'Backend runtime differs from pinned identity');runtimeHash=sha(json(runtime));backendSeed=verifyDatabaseSnapshot(read('database-seed.json'));const init=read('database-init/process.json');must(init.mode==='init'&&init.completed===true&&init.exitCode===0&&!init.timedOut&&!init.outputOverflow&&sha(listed.get('database-init/sandbox.sb')??'')===init.profileSha256,'Database initialization not qualified');const cleanup=read('database-cleanup.json');must(cleanup.removed===true&&Array.isArray(cleanup.directories)&&cleanup.directories.length===2&&new Set(cleanup.directories.map(d=>d.directory)).size===2&&cleanup.directories.every(d=>['database-seed','database-work'].includes(d.directory)&&Number.isSafeInteger(d.files)&&d.files>=1&&Number.isSafeInteger(d.bytes)&&d.bytes>=0),'Database cleanup receipt incomplete');for(const name of ['database-seed','database-work']){let exists=true;try{await fs.lstat(path.join(run,name));}catch(error){if(error.code==='ENOENT')exists=false;else throw error;}must(!exists,'Private database remains after cleanup');}}
 must(summary.status==='completed'&&read('status.json').status==='completed'&&summary.specSha256===sha(raw),'Team incomplete');
 must(summary.oracleSha256===sha(json(spec.campaign)),'Team oracle hash mismatch');
 must(same(summary.limits,spec.budget),'Team budget mismatch');
 must(Array.isArray(calls)&&calls.length===summary.roleAttempts&&calls.length<=spec.budget.maxCalls,'Call count mismatch');
 must(Array.isArray(epochs)&&epochs.length===summary.epochs&&epochs.length<=spec.budget.maxEpochs,'Epoch count mismatch');
 const sessions=new Set(),callDirs=new Set();let tokens=0,usageComplete=true;
 for(const c of calls){
 relativeFile(c.directory);must(!callDirs.has(c.directory)&&Object.hasOwn(roleSchemas,c.role),'Duplicate or invalid role call');callDirs.add(c.directory);
 must(['completed','failed'].includes(c.status),'Unfinished role call');
 if(c.receipt){
 const receipt=read(c.directory+'/receipt.json');must(same(receipt,c.receipt)&&receipt.role===c.role,'Role receipt mismatch');
 if(receipt.sessionId){must(typeof receipt.sessionId==='string'&&!sessions.has(receipt.sessionId),'Reused independent session');sessions.add(receipt.sessionId);}
 if(receipt.usage){const u=receipt.usage;must(['inputTokens','outputTokens'].every(k=>Number.isSafeInteger(u[k])&&u[k]>=0),'Invalid usage receipt');tokens+=u.inputTokens+u.outputTokens;}else usageComplete=false;
 if(c.status==='completed'){
 must(receipt.status==='completed'&&receipt.sessionId,'Incomplete role receipt');
 const schema=read(c.directory+'/schema.json');must(same(schema,roleSchemas[c.role])&&sha(JSON.stringify(schema))===receipt.schemaSha256,'Role schema mismatch');
 const outputBytes=listed.get(c.directory+'/model-output.json');must(outputBytes&&sha(outputBytes)===receipt.outputSha256,'Role output hash mismatch');const output=JSON.parse(outputBytes);validateRoleOutput(output,roleSchemas[c.role]);must(same(output,c.output),'Role output differs from call summary');
 }
 }else{must(c.status==='failed','Completed role lacks receipt');usageComplete=false;}
 if(c.status==='failed')usageComplete=false;
 }
 must(sessions.size===summary.modelCalls,'Model call count mismatch');must(same([...sessions],summary.independentSessions),'Session summary mismatch');must(tokens===summary.reportedTokens&&usageComplete===summary.usageComplete,'Usage summary mismatch');
 must(summary.tokenThresholdIsHardCap===false&&summary.dollarCapEnforced===false,'Unsupported budget enforcement claim');
 let current=snapshot(read('initial-source.json'),spec.app.files),observedRequests=0,reservedRequests=0,accepted=0,backendTrials=0,backendRestartsPassed=0;
 if(isPinned)for(const f of current)must(spec.app.assetHashes.find(a=>a.path===f.path)?.sha256===f.sha256,'Initial source differs from pinned assets');
 const completed=calls.filter(c=>c.status==='completed');const matched=new Set();
 function matchRole(epoch,role,output){const found=completed.find(c=>!matched.has(c.directory)&&c.directory.startsWith('epoch-'+epoch+'/')&&c.role===role&&same(c.output,output));must(found,'Debate output lacks matching completed role receipt');matched.add(found.directory);}
 async function launchAt(prefix,source){const receipt=read(prefix+'/launch.json'),stop=read(prefix+'/stop.json');must(receipt.ready===true&&receipt.listenerOwnershipVerified===true&&receipt.entry===(isStatic?STATIC_HOST:spec.app.entry),'App launch was not qualified');must(receipt.sourceSha256===(isPinned?sourceIdentity(source):source.find(f=>f.path==='domain.mjs')?.sha256),'App launch source hash mismatch');must(listed.has(prefix+'/sandbox.sb')&&sha(listed.get(prefix+'/sandbox.sb'))===receipt.profileSha256,'App sandbox profile hash mismatch');must(stop.stopped===true,'App stop receipt missing confirmation');if(isBackend)must(receipt.runtimeIdentitySha256===runtimeHash&&stop.runtimeIdentitySha256===runtimeHash&&!stop.timedOut&&!stop.outputOverflow,'Backend launch runtime or completion mismatch');return receipt;}
 const launch=(epoch,label,source)=>launchAt(`epoch-${epoch}/launch-${label}`,source);
 async function measurement(epoch,label,m,launchReceipt,red,source){
 must(m&&Array.isArray(m.records)&&m.records.length===2,'Two confirmation campaigns required');let first;
 for(let n=0;n<2;n++){
 const r=m.records[n],expected=`epoch-${epoch}/${label}-${n+1}`;must(r.directory===expected,'Unexpected campaign evidence path');
 const campaign=read(expected+'/campaign.json'),evidence=listed.get(expected+'/run/evidence.json');verifyMeasuredCases(spec,red,campaign,`http://127.0.0.1:${launchReceipt.port}/`);must(evidence&&sha(evidence)===r.evidenceSha256,'Nested campaign evidence mismatch');await verifyCampaign(path.join(run,expected));
 const nested=read(expected+'/run/summary.json');must(same(nested,r.summary),'Nested campaign summary mismatch');must(nested.results.length===campaign.branches.length,'Incomplete campaign branches');for(const result of nested.results){const branch=read(expected+'/run/'+result.id+'/result.json'),{id,hypothesis,execution,...actual}=result;must(execution?.exitCode===0&&!execution.timedOut&&!execution.cancelled&&!execution.outputOverflow,'Incomplete campaign execution');must(same(actual,branch),'Campaign result differs from branch receipt');}must(nested.passed===nested.results.every(r=>r.passed),'Campaign verdict mismatch');
 must(campaign.target===`http://127.0.0.1:${launchReceipt.port}/`,'Campaign target differs from owned listener');
 const identity={target:campaign.target,branches:campaign.branches};if(first)must(same(first,identity),'Confirmation cases changed');else first=identity;
 must(Number.isSafeInteger(nested.requests)&&nested.requests>=0,'Unknown measured requests');observedRequests+=nested.requests;
 if(isBackend){
 const backendPath=expected+'/backend',b=r.backend;must(b&&(b.directory===backendPath||path.resolve(b.directory)===path.join(run,backendPath)),'Unexpected backend receipt directory');const stateBytes=listed.get(backendPath+'/state.json');must(stateBytes&&sha(stateBytes)===b.stateSha256,'Backend state receipt hash mismatch');const state=verifyBackendState(JSON.parse(stateBytes),{seed:backendSeed,sourceSha256:sourceIdentity(source),runtimeIdentitySha256:runtimeHash});
 const resolveRecorded=p=>path.isAbsolute(p)?path.resolve(p):path.resolve(run,p);must(resolveRecorded(state.campaign.directory)===path.join(run,expected)&&state.campaign.evidenceSha256===r.evidenceSha256,'Backend main campaign binding mismatch');if(b.statePath)must(resolveRecorded(b.statePath)===path.join(run,backendPath,'state.json'),'Backend state path mismatch');
 const mainLaunch=await launchAt(backendPath+'/launch-before',source),restartLaunch=await launchAt(backendPath+'/launch-restart',source);must(campaign.target===`http://127.0.0.1:${mainLaunch.port}/`&&mainLaunch.pid!==restartLaunch.pid,'Backend did not perform a distinct owned process restart');
 const restartPath=backendPath+'/restart-check';must(resolveRecorded(state.restart.directory)===path.join(run,restartPath),'Unexpected restart campaign path');const restartCampaign=read(restartPath+'/campaign.json'),restartEvidence=listed.get(restartPath+'/run/evidence.json');must(restartEvidence&&sha(restartEvidence)===state.restart.evidenceSha256,'Restart campaign evidence hash mismatch');const target=`http://127.0.0.1:${restartLaunch.port}/`,reviewed=spec.backend.restartCampaign;verifyRestartOracle(reviewed,restartCampaign,target);await verifyCampaign(path.join(run,restartPath));
 const restarted=read(restartPath+'/run/summary.json');must(same(restarted,b.restartSummary)&&restarted.results.length===restartCampaign.branches.length,'Restart summary mismatch');for(const result of restarted.results){const branch=read(restartPath+'/run/'+result.id+'/result.json'),{id,hypothesis,execution,...actual}=result;must(execution?.exitCode===0&&!execution.timedOut&&!execution.cancelled&&!execution.outputOverflow&&same(actual,branch),'Restart execution incomplete or inconsistent');}must(restarted.passed===restarted.results.every(r=>r.passed)&&Number.isSafeInteger(restarted.requests)&&restarted.requests>=0,'Restart verdict mismatch');must(state.requests===nested.requests+restarted.requests&&b.requests===state.requests&&state.passed===(nested.passed&&restarted.passed)&&b.passed===state.passed,'Backend combined accounting mismatch');observedRequests+=restarted.requests;backendTrials++;if(restarted.passed)backendRestartsPassed++;
 }
 }
 const hidden=read(`epoch-${epoch}/${label}-holdout.json`);must(same(hidden,m.holdout),'Holdout evidence mismatch');if(isPinned){must(same(hidden,{passed:true,requests:0,results:[],status:'not-configured-use-immutable-campaign-regressions'}),'Static app must not claim fixture holdouts');}else{must(hidden.requests===12&&Array.isArray(hidden.results)&&hidden.results.length===12,'Holdout evidence mismatch');must(hidden.results.every((r,i)=>r.id==='holdout-'+i&&typeof r.passed==='boolean'),'Invalid holdout cases');must(hidden.passed===hidden.results.every(r=>r.passed),'Holdout verdict mismatch');}observedRequests+=hidden.requests;
 must(m.passed===(m.records.every(r=>r.summary.passed&&(!isBackend||r.backend.passed))&&hidden.passed),'Measurement verdict mismatch');
 reservedRequests+=first.branches.reduce((n,b)=>n+b.config.maxRequests,0)*2+(isPinned?0:12)+(isBackend?spec.backend.restartCampaign.budget.maxRequests*2:0);
 return first;
 }
 for(let i=0;i<epochs.length;i++){
 const e=epochs[i];must(e.epoch===i+1&&same(e.sourceBefore,hashes(current)),'Epoch source continuity mismatch');matchRole(e.epoch,'red',e.red);matchRole(e.epoch,'critic',e.criticBefore);
 const beforeLaunch=await launch(e.epoch,'before',current),beforeIdentity=await measurement(e.epoch,'before',e.baseline,beforeLaunch,e.red,current);
 const beforeIds=e.baseline.records.map(r=>r.directory);must(e.criticBefore.evidenceIds.length>0&&e.criticBefore.evidenceIds.every(id=>beforeIds.includes(id)),'Critic cited missing baseline evidence');
 if(e.blue){
 matchRole(e.epoch,'blue',e.blue);const patch=read(`epoch-${e.epoch}/patch.json`);must(same(patch.before,current)&&same(patch.blue,e.blue),'Patch record differs from source or debate');const after=snapshot(patch.after,spec.app.files);must(same(hashes(after),e.sourceAfter),'Patch after snapshot mismatch');
 const replacements=new Map();for(const p of e.blue.patches){must(spec.app.editable.includes(p.path)&&!replacements.has(p.path),'Patch outside editable allowlist');const prior=current.find(f=>f.path===p.path);must(prior&&prior.sha256===p.baseSha256&&sha(p.content)!==prior.sha256,'Patch base mismatch or no-op');replacements.set(p.path,p.content);}
 for(const f of after)must(f.content===(replacements.has(f.path)?replacements.get(f.path):current.find(x=>x.path===f.path).content),'Unrecorded source change');
 if(e.replay){const afterLaunch=await launch(e.epoch,'after',after),afterIdentity=await measurement(e.epoch,'after',e.replay,afterLaunch,e.red,after);must(same(beforeIdentity,afterIdentity),'Before/after test oracle or configuration changed');if(e.criticAfter){matchRole(e.epoch,'critic',e.criticAfter);const ids=[...beforeIds,...e.replay.records.map(r=>r.directory)];must(e.criticAfter.evidenceIds.length>0&&e.criticAfter.evidenceIds.every(id=>ids.includes(id)),'Critic cited missing replay evidence');}else must(summary.stopReason==='blocked-or-budget'&&e.rolledBack===true&&!e.accepted,'Replay lacks final critic without a stopped rollback');}
 must(e.accepted===(!!e.replay?.passed&&e.criticAfter?.verdict==='accept'),'Patch acceptance inconsistent');if(e.accepted){must(!e.rolledBack&&typeof e.commit==='string','Accepted patch lacks commit');current=after;accepted++;}else must(e.rolledBack===true,'Rejected patch lacks rollback');
 }else must(e.accepted===false&&!e.replay,'Accepted repair lacks blue patch');
 }
 must(accepted===summary.patchesAccepted,'Accepted patch count mismatch');must(observedRequests===summary.observedRequests&&reservedRequests===summary.reservedRequests,'Request summary mismatch');must(reservedRequests<=spec.budget.maxRequests,'Request reservation exceeded budget');
 const final=snapshot(read('final-source.json'),spec.app.files);must(same(current,final),'Final source does not follow accepted repairs');
 for(const f of final){const bytes=await safeRead('app/'+f.path);must(sha(bytes)===f.sha256,'Current isolated checkout differs from final snapshot');}
 if(isPinned)for(const asset of spec.app.assetHashes){const bytes=await safeRead('app/'+asset.path),expected=spec.app.editable.includes(asset.path)?final.find(f=>f.path===asset.path)?.sha256:asset.sha256;must(sha(bytes)===expected,'Static asset differs from pinned or accepted source: '+asset.path);if(!spec.app.editable.includes(asset.path))must(bytes.length===asset.bytes,'Immutable static asset size changed');}
 return {verified:true,evidenceComplete:true,...(isBackend?{backendVerified:true,backendTrials,backendRestartsPassed,databaseCleanupVerified:true}:{}),completion:summary.stopReason==='blocked-or-budget'?'stopped-with-recorded-evidence':'completed',stopReason:summary.stopReason??null,modelCalls:summary.modelCalls,independentSessions:sessions.size,patchesAccepted:accepted,realProvider:summary.realProvider,note:'Internal evidence hashes, session identities, replay consistency and current isolated source verified; not a signed execution attestation.'};
}
