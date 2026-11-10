#!/usr/bin/env node
import {qualifyTeams} from './agents/qualification.mjs';
import {planBackendTeam} from './agents/backend.mjs';
import {planAppTeam} from './agents/static-app.mjs';
import {planTeam,runTeam,verifyTeam} from './agents/team.mjs';
import {planLab,inspectLab,runLab,verifyLab,replayLab,compareLabs} from './lab/lab.mjs';
import {explore} from './explore.mjs';
import {createCampaign,runCampaign,verifyCampaign,compareCampaigns,engineDoctor} from './campaign.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {makePlan,createCase,runCase,verifyCase,scanSource,json} from './core.mjs';
import {analyzePlan,compareCases} from './analysis.mjs';
import {createSuite,runSuite,verifySuite} from './suite.mjs';
const [command,...args]=process.argv.slice(2);
const planOptions=['question','target','kind','users','out'];
const allowed={qualify:['teams','out'],'app-plan':['manifest','out'],'team-plan':['source','out'],'team-run':['team','ack-source'],'team-verify':['team'],'lab-plan':['campaign','out'],'lab-inspect':['lab'],'lab-run':['lab','ack-target'],'lab-verify':['lab'],'lab-replay':['lab','out'],'lab-compare':['baseline','candidate'],'campaign-compare':['baseline','candidate'],explore:[],'campaign-plan':['question','target','out'],'campaign-run':['campaign','ack-target'],'campaign-verify':['campaign'],'engine-doctor':[],plan:planOptions,'suite-plan':planOptions,run:['case','ack-target','source'],'suite-run':['suite','ack-target'],verify:['case'],'suite-verify':['suite'],analyze:['case'],compare:['baseline','candidate'],'source-review':['source'],doctor:[]};
try{
 if(!command||command==='help'||command==='--help'){console.log('WhatIF 3.1.0\nqualify --teams ABSOLUTE_DIR,ABSOLUTE_DIR --out DIRECTORY\napp-plan --manifest FILE --out DIRECTORY\nteam-plan --source DIRECTORY --out DIRECTORY\nteam-run --team DIRECTORY --ack-source EXACT_SOURCE\nteam-verify --team DIRECTORY\nplan | suite-plan --question TEXT --target URL --out NEW_DIRECTORY [--kind registered|daily-active|concurrent] [--users N]\nrun --case DIRECTORY --ack-target EXACT_TARGET [--source PATH]\nsuite-run --suite DIRECTORY --ack-target EXACT_TARGET\nverify | analyze --case DIRECTORY\nsuite-verify --suite DIRECTORY\ncompare --baseline CASE --candidate CASE\nsource-review --source DIRECTORY\ncampaign-plan --question TEXT --target URL --out DIRECTORY\ncampaign-run --campaign DIRECTORY --ack-target EXACT_TARGET\ncampaign-verify --campaign DIRECTORY\ncampaign-compare --baseline DIRECTORY --candidate DIRECTORY\nlab-plan --campaign DIRECTORY --out DIRECTORY\nlab-inspect | lab-verify --lab DIRECTORY\nlab-run --lab DIRECTORY --ack-target EXACT_TARGET\nlab-replay --lab DIRECTORY --out DIRECTORY\nlab-compare --baseline DIRECTORY --candidate DIRECTORY\nengine-doctor | explore | doctor\nBuilt-in execution: bounded HTTP(S) literal loopback GET probes. Suites: <=500 requests total.');}
 else{
 if(!allowed[command])throw Error('Unknown command');const o={};
 for(let i=0;i<args.length;i+=2){const key=args[i]?.replace(/^--/,'');if(!args[i]?.startsWith('--')||!allowed[command].includes(key)||!args[i+1]||Object.hasOwn(o,key))throw Error('Invalid, missing or duplicate option: '+args[i]);o[key]=args[i+1];}
 const requireKeys=keys=>{for(const k of keys)if(!o[k])throw Error('--'+k+' required');};
 let result;
 if(command==='qualify'){requireKeys(['teams','out']);const directories=o.teams.split(',');if(directories.length<2||directories.length>20||directories.some(d=>!path.isAbsolute(d)||!d.trim())||new Set(directories).size!==directories.length)throw Error('--teams requires 2..20 distinct comma-separated absolute directories');result=await qualifyTeams({directories,out:path.resolve(o.out)});}
 if(command==='app-plan'){requireKeys(['manifest','out']);const manifest=path.resolve(o.manifest),spec=JSON.parse(await fs.readFile(manifest));result=await (['python-sqlite','python-postgres'].includes(spec.runner)?planBackendTeam:planAppTeam)({manifest,out:path.resolve(o.out)});}
 if(command==='team-plan'){requireKeys(['source','out']);result=await planTeam({source:path.resolve(o.source),out:path.resolve(o.out)});}
 if(command==='team-run'){requireKeys(['team','ack-source']);result=await runTeam(path.resolve(o.team),{ackSource:o['ack-source']});}
 if(command==='team-verify'){requireKeys(['team']);result=await verifyTeam(path.resolve(o.team));}
 if(command==='lab-plan'){requireKeys(['campaign','out']);result=await planLab({campaignDirectory:path.resolve(o.campaign),out:path.resolve(o.out)});}
 if(command==='lab-inspect'){requireKeys(['lab']);result=await inspectLab(path.resolve(o.lab));}
 if(command==='lab-run'){requireKeys(['lab','ack-target']);result=await runLab(path.resolve(o.lab),{ackTarget:o['ack-target']});}
 if(command==='lab-verify'){requireKeys(['lab']);result=await verifyLab(path.resolve(o.lab));}
 if(command==='lab-replay'){requireKeys(['lab','out']);result=await replayLab({labDirectory:path.resolve(o.lab),out:path.resolve(o.out)});}
 if(command==='lab-compare'){requireKeys(['baseline','candidate']);result=await compareLabs(path.resolve(o.baseline),path.resolve(o.candidate));}
 if(command==='campaign-compare'){requireKeys(['baseline','candidate']);result=await compareCampaigns(path.resolve(o.baseline),path.resolve(o.candidate));}
 if(command==='explore')result=explore();
 if(command==='campaign-plan'){requireKeys(['question','target','out']);result=await createCampaign({question:o.question,target:o.target,out:path.resolve(o.out)});}
 if(command==='campaign-run'){requireKeys(['campaign','ack-target']);result=await runCampaign(path.resolve(o.campaign),{ackTarget:o['ack-target']});}
 if(command==='campaign-verify'){requireKeys(['campaign']);result=await verifyCampaign(path.resolve(o.campaign));}
 if(command==='engine-doctor')result=await engineDoctor();
 if(['plan','suite-plan'].includes(command)){requireKeys(['question','target','out']);const p=makePlan({question:o.question,target:o.target,kind:o.kind,users:o.users===undefined?undefined:Number(o.users)});result=await (command==='plan'?createCase:createSuite)(p,path.resolve(o.out));}
 if(command==='run'){requireKeys(['case','ack-target']);result=await runCase(path.resolve(o.case),{ackTarget:o['ack-target'],source:o.source&&path.resolve(o.source)});}
 if(command==='verify'){requireKeys(['case']);result=await verifyCase(path.resolve(o.case));}
 if(command==='analyze'){requireKeys(['case']);result=analyzePlan(JSON.parse(await fs.readFile(path.join(o.case,'scenario.json'))));}
 if(command==='compare'){requireKeys(['baseline','candidate']);result=await compareCases(path.resolve(o.baseline),path.resolve(o.candidate));}
 if(command==='source-review'){requireKeys(['source']);result=await scanSource(path.resolve(o.source));}
 if(command==='suite-run'){requireKeys(['suite','ack-target']);result=await runSuite(path.resolve(o.suite),{ackTarget:o['ack-target']});}
 if(command==='suite-verify'){requireKeys(['suite']);result=await verifySuite(path.resolve(o.suite));}
 if(command==='doctor')result={version:'3.1.0',node:process.version,supported:Number(process.versions.node.split('.')[0])>=22,builtin:['independent-ai-team-fixture','reviewed-static-app-teams','reviewed-python-sqlite-teams','isolated-postgres-worker-teams','bounded-concurrent-api-users','stateful-api-journeys','scenario-model','workload-sensitivity','loopback-http-probe','per-route-diagnostics','bounded-suites','verified-comparison','source-review-leads','evidence-verification','k6-smoke-generation','branching-campaigns','synthetic-security-checks','campaign-comparison','scenario-exploration','adaptive-lab','role-ledger','regression-replay'],externalEngines:'Not bundled or automatically installed. See docs/INTEGRATIONS.md.'};
 console.log(json(result));if(command==='team-run'&&['blocked-or-budget','critic-did-not-confirm'].includes(result.stopReason)||command==='lab-run'&&result.outcome!=='NO_FAILURE_IN_EXECUTED_TRIALS'||command==='campaign-compare'&&result.verdict==='REGRESSION'||command==='campaign-run'&&!result.passed||command==='run'&&!result.smokeSloPassed||command==='suite-run'&&!result.passed||command==='compare'&&result.verdict==='SLO_REGRESSION')process.exitCode=2;
 }
}catch(e){console.error(json({error:e.message}));process.exitCode=1;}
