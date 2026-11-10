#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {makePlan,createCase,runCase,verifyCase,json} from './core.mjs';
const [command,...args]=process.argv.slice(2);
const allowed={plan:['question','target','kind','users','out'],run:['case','ack-target','source'],verify:['case'],doctor:[]};
try{
 if(!command||command==='help'||command==='--help'){console.log('WhatIF 0.1\nplan --question TEXT --target URL --out NEW_DIRECTORY [--kind registered|daily-active|concurrent] [--users N]\nrun --case DIRECTORY --ack-target EXACT_SCENARIO_TARGET [--source PATH]\nverify --case DIRECTORY\ndoctor\nBuilt-in execution: bounded HTTP(S) literal loopback GET probes. Generated k6 script: smoke only.');}
 else{
 if(!allowed[command])throw Error('Unknown command');const o={};
 for(let i=0;i<args.length;i+=2){const key=args[i]?.replace(/^--/,'');if(!args[i]?.startsWith('--')||!allowed[command].includes(key)||!args[i+1]||Object.hasOwn(o,key))throw Error('Invalid, missing or duplicate option: '+args[i]);o[key]=args[i+1];}
 const requireKeys=keys=>{for(const k of keys)if(!o[k])throw Error('--'+k+' required');};
 let result;
 if(command==='plan'){requireKeys(['question','target','out']);result=await createCase(makePlan({question:o.question,target:o.target,kind:o.kind,users:o.users===undefined?undefined:Number(o.users)}),path.resolve(o.out));}
 if(command==='run'){requireKeys(['case','ack-target']);result=await runCase(path.resolve(o.case),{ackTarget:o['ack-target'],source:o.source&&path.resolve(o.source)});}
 if(command==='verify'){requireKeys(['case']);result=await verifyCase(path.resolve(o.case));}
 if(command==='doctor')result={version:'0.1.0',node:process.version,supported:Number(process.versions.node.split('.')[0])>=22,builtin:['scenario-model','loopback-http-probe','source-review-leads','evidence-verification','k6-smoke-generation'],externalEngines:'Not bundled or automatically installed. See docs/INTEGRATIONS.md.'};
 console.log(json(result));if(command==='run'&&!result.smokeSloPassed)process.exitCode=2;
 }
}catch(e){console.error(json({error:e.message}));process.exitCode=1;}
