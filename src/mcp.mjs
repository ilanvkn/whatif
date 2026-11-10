#!/usr/bin/env node
import {qualifyTeams} from './agents/qualification.mjs';
import {planBackendTeam} from './agents/backend.mjs';
import {planAppTeam} from './agents/static-app.mjs';
import {planTeam,runTeam,verifyTeam} from './agents/team.mjs';
import {planLab,inspectLab,runLab,verifyLab,replayLab,compareLabs} from './lab/lab.mjs';
import {explore} from './explore.mjs';
import {createCampaign,runCampaign,verifyCampaign,compareCampaigns,engineDoctor} from './campaign.mjs';
import fs from 'node:fs/promises';
import {analyzePlan,compareCases} from './analysis.mjs';
import {createSuite,runSuite,verifySuite} from './suite.mjs';
import readline from 'node:readline';
import path from 'node:path';
import {makePlan,createCase,runCase,verifyCase,scanSource} from './core.mjs';
const schemas={
 whatif_qualify:{description:'Verify 2..20 recorded team runs and prepare a cross-application qualification report. No model calls or target traffic; observed evidence does not establish general performance or superiority.',properties:{teamDirectories:{type:'array',items:{type:'string'},minItems:2,maxItems:20,uniqueItems:true},out:{type:'string'}},required:['teamDirectories','out']},
 whatif_app_plan:{description:'Plan a reviewed static-web or python-sqlite application team from a pinned local manifest, hash assets and preserve application-specific oracles. No model calls or test traffic; execution requires macOS isolation.',properties:{manifest:{type:'string'},out:{type:'string'}},required:['manifest','out']},
 whatif_team_plan:{description:'Prepare an independent AI red/blue/critic team for the disposable macOS Node fixture. No model calls or test traffic. Review source disclosure and budgets.',properties:{source:{type:'string'},out:{type:'string'}},required:['source','out']},
 whatif_team_run:{description:'Run fresh Codex role sessions, measured tests, isolated allowlisted repairs and replay epochs. Supports reviewed static-web and pinned python-sqlite manifests and the legacy examples/agent-app fixture using macOS isolation. Uses existing Codex authentication; call/time/request limits are not hard token or dollar caps.',properties:{teamDirectory:{type:'string'},ackSource:{type:'string'}},required:['teamDirectory','ackSource']},
 whatif_team_verify:{description:'Verify recorded static-web, python-sqlite or legacy fixture AI team evidence hashes without model calls or traffic. Integrity is not proof of general correctness or a signed attestation.',properties:{teamDirectory:{type:'string'}},required:['teamDirectory']},
 whatif_lab_plan:{description:'Prepare a V2 adaptive trial lab from a reviewed campaign; generates mutations without traffic. Repeat safety and revision must be recorded before running.',properties:{campaignDirectory:{type:'string'},out:{type:'string'}},required:['campaignDirectory','out']},
 whatif_lab_inspect:{description:'Compile bounded scenario space and inspect readiness without executing. Counts generated candidates separately from covered trials.',properties:{labDirectory:{type:'string'}},required:['labDirectory']},
 whatif_lab_run:{description:'Run bounded adaptive epochs, replay failures, classify evidence and produce regression packs. Requires repeat-safe fixtures, exact target acknowledgement and explicit budgets. Roles are deterministic policies, not independent LLMs.',properties:{labDirectory:{type:'string'},ackTarget:{type:'string'}},required:['labDirectory','ackTarget']},
 whatif_lab_verify:{description:'Verify the lab manifest, role ledger and every nested executed campaign.',properties:{labDirectory:{type:'string'}},required:['labDirectory']},
 whatif_lab_replay:{description:'Prepare exact reproduced failures for a new corrected-revision lab without traffic. Preserves oracles and requires renewed fixture readiness.',properties:{labDirectory:{type:'string'},out:{type:'string'}},required:['labDirectory','out']},
 whatif_lab_compare:{description:'Compare verified labs by exact concrete candidate identity; unexecuted cases never count as fixed.',properties:{baseline:{type:'string'},candidate:{type:'string'}},required:['baseline','candidate']},
 whatif_campaign_compare:{description:'Verify and compare complete branching campaigns with identical configuration and engine identity; report per-branch pass transitions.',properties:{baseline:{type:'string'},candidate:{type:'string'}},required:['baseline','candidate']},
 whatif_explore:{description:'Explore branching what-if experiments with explicit invariants and executable versus planning-only capability labels.',properties:{},required:[]},
 whatif_campaign_plan:{description:'Prepare a branching browser/load campaign without traffic. Review real selectors, request allowlists and security fixtures before running.',properties:{question:{type:'string'},target:{type:'string'},out:{type:'string'}},required:['question','target','out']},
 whatif_campaign_run:{description:'Execute reviewed browser, k6 and synthetic-account security branches with exact target acknowledgement, request caps, process deadlines and evidence. Requires separately configured engines.',properties:{campaignDirectory:{type:'string'},ackTarget:{type:'string'}},required:['campaignDirectory','ackTarget']},
 whatif_campaign_verify:{description:'Verify campaign configuration and all recorded engine artifacts. Sends no traffic.',properties:{campaignDirectory:{type:'string'}},required:['campaignDirectory']},
 whatif_engine_doctor:{description:'Inspect configured optional engine paths and hashes without installing or running them.',properties:{},required:[]},
 whatif_analyze:{description:'Analyze workload semantics and sensitivity without sending traffic. Projections never establish capacity.',properties:{caseDirectory:{type:'string'}},required:['caseDirectory']},
 whatif_compare:{description:'Verify and compare two completed cases. Rejects corrupted evidence; mismatched configurations are labeled incomparable.',properties:{baseline:{type:'string'},candidate:{type:'string'}},required:['baseline','candidate']},
 whatif_suite_plan:{description:'Prepare baseline, parallel and recovery loopback cases. No traffic; review suite.json before execution.',properties:{question:{type:'string'},target:{type:'string'},out:{type:'string'},kind:{type:'string',enum:['unspecified','registered','daily-active','concurrent']},users:{type:'integer',minimum:1,maximum:1000000000}},required:['question','target','out']},
 whatif_suite_run:{description:'Run reviewed sequential loopback cases with at most 500 total requests and 120 seconds of probe budgets. Stops on failure by default; never injects service faults.',properties:{suiteDirectory:{type:'string'},ackTarget:{type:'string'}},required:['suiteDirectory','ackTarget']},
 whatif_suite_verify:{description:'Verify suite configuration, summary and all executed child evidence without sending traffic.',properties:{suiteDirectory:{type:'string'}},required:['suiteDirectory']},
 whatif_plan:{description:'Create a new scenario case and bounded k6 smoke script. Makes no network requests. Clarifies million-user workload semantics; never claims capacity.',properties:{question:{type:'string'},target:{type:'string'},out:{type:'string'},kind:{type:'string',enum:['unspecified','registered','daily-active','concurrent']},users:{type:'integer',minimum:1,maximum:1000000000}},required:['question','target','out']},
 whatif_run:{description:'Execute at most 200 GET probes against an explicitly acknowledged literal loopback target. No redirects, active exploitation, cloud calls or capacity claims.',properties:{caseDirectory:{type:'string'},ackTarget:{type:'string'},source:{type:'string'}},required:['caseDirectory','ackTarget']},
 whatif_verify:{description:'Verify a completed case and its evidence hashes. Does not re-execute requests or attest application correctness.',properties:{caseDirectory:{type:'string'}},required:['caseDirectory']},
 whatif_source_review:{description:'Bounded local source heuristics. Returns file hashes and review leads without source contents. Not a vulnerability verdict.',properties:{source:{type:'string'}},required:['source']}
};
const send=x=>process.stdout.write(JSON.stringify(x)+'\n');
async function handle(m){
 if(m.method==='notifications/initialized'||m.id===undefined)return;
 const reply=result=>send({jsonrpc:'2.0',id:m.id,result});
 if(m.method==='initialize')return reply({protocolVersion:'2024-11-05',capabilities:{tools:{listChanged:false}},serverInfo:{name:'whatif',version:'3.1.0-rc.1'}});
 if(m.method==='ping')return reply({});
 if(m.method==='tools/list')return reply({tools:Object.entries(schemas).map(([name,s])=>({name,description:s.description,inputSchema:{type:'object',properties:s.properties,required:s.required,additionalProperties:false}}))});
 if(m.method!=='tools/call')return send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Method not found'}});
 try{
 const name=m.params?.name,args=m.params?.arguments??{},s=schemas[name];if(!s)throw Error('Unknown tool');
 if(typeof args!=='object'||Array.isArray(args)||args===null)throw Error('Arguments must be an object');
 for(const k of s.required)if(args[k]===undefined)throw Error('Missing '+k);
 for(const [k,v]of Object.entries(args)){if(!s.properties[k])throw Error('Unknown argument '+k);const t=s.properties[k].type;if(t==='string'&&(typeof v!=='string'||!v.trim()))throw Error('Invalid '+k);if(t==='integer'&&!Number.isInteger(v))throw Error('Invalid '+k);if(t==='array'){const p=s.properties[k];if(!Array.isArray(v)||v.length<p.minItems||v.length>p.maxItems||v.some(item=>typeof item!=='string'||!item.trim())||p.uniqueItems&&new Set(v).size!==v.length)throw Error('Invalid '+k);}}
 let result;
 if(name==='whatif_qualify')result=await qualifyTeams({directories:args.teamDirectories.map(d=>path.resolve(d)),out:path.resolve(args.out)});
 if(name==='whatif_app_plan'){const manifest=path.resolve(args.manifest),spec=JSON.parse(await fs.readFile(manifest));result=await (spec.runner==='python-sqlite'?planBackendTeam:planAppTeam)({manifest,out:path.resolve(args.out)});}
 if(name==='whatif_team_plan')result=await planTeam({source:path.resolve(args.source),out:path.resolve(args.out)});
 if(name==='whatif_team_run')result=await runTeam(path.resolve(args.teamDirectory),{ackSource:args.ackSource});
 if(name==='whatif_team_verify')result=await verifyTeam(path.resolve(args.teamDirectory));
 if(name==='whatif_lab_plan')result=await planLab({campaignDirectory:path.resolve(args.campaignDirectory),out:path.resolve(args.out)});
 if(name==='whatif_lab_inspect')result=await inspectLab(path.resolve(args.labDirectory));
 if(name==='whatif_lab_run')result=await runLab(path.resolve(args.labDirectory),{ackTarget:args.ackTarget});
 if(name==='whatif_lab_verify')result=await verifyLab(path.resolve(args.labDirectory));
 if(name==='whatif_lab_replay')result=await replayLab({labDirectory:path.resolve(args.labDirectory),out:path.resolve(args.out)});
 if(name==='whatif_lab_compare')result=await compareLabs(path.resolve(args.baseline),path.resolve(args.candidate));
 if(name==='whatif_campaign_compare')result=await compareCampaigns(path.resolve(args.baseline),path.resolve(args.candidate));
 if(name==='whatif_explore')result=explore();
 if(name==='whatif_campaign_plan')result=await createCampaign({...args,out:path.resolve(args.out)});
 if(name==='whatif_campaign_run')result=await runCampaign(path.resolve(args.campaignDirectory),{ackTarget:args.ackTarget});
 if(name==='whatif_campaign_verify')result=await verifyCampaign(path.resolve(args.campaignDirectory));
 if(name==='whatif_engine_doctor')result=await engineDoctor();
 if(name==='whatif_analyze')result=analyzePlan(JSON.parse(await fs.readFile(path.join(args.caseDirectory,'scenario.json'))));
 if(name==='whatif_compare')result=await compareCases(path.resolve(args.baseline),path.resolve(args.candidate));
 if(name==='whatif_suite_plan')result=await createSuite(makePlan(args),path.resolve(args.out));
 if(name==='whatif_suite_run')result=await runSuite(path.resolve(args.suiteDirectory),{ackTarget:args.ackTarget});
 if(name==='whatif_suite_verify')result=await verifySuite(path.resolve(args.suiteDirectory));
 if(name==='whatif_plan')result=await createCase(makePlan(args),path.resolve(args.out));
 if(name==='whatif_run')result=await runCase(path.resolve(args.caseDirectory),{ackTarget:args.ackTarget,source:args.source&&path.resolve(args.source)});
 if(name==='whatif_verify')result=await verifyCase(path.resolve(args.caseDirectory));
 if(name==='whatif_source_review')result=await scanSource(path.resolve(args.source));
 reply({content:[{type:'text',text:JSON.stringify(result)}],isError:false});
 }catch(e){reply({content:[{type:'text',text:JSON.stringify({error:e.message})}],isError:true});}
}
// Serialize calls so two commands cannot race case finalization in this server.
let chain=Promise.resolve();const lines=readline.createInterface({input:process.stdin});
lines.on('line',line=>{chain=chain.then(async()=>{let m;try{m=JSON.parse(line);}catch{return send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}await handle(m);}).catch(e=>process.stderr.write(e.message+'\n'));});
