import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(process.argv[2]||'../mirofish-lab/repos');
fs.mkdirSync(root,{recursive:true});
const repos=['docling-project/docling','D4Vinci/Scrapling','unclecode/crawl4ai','LearningCircuit/local-deep-research','mesa/mesa','py-why/dowhy','Nixtla/neuralforecast','Metaculus/forecasting-tools','getzep/graphiti','langfuse/langfuse','temporalio/temporal','linroger/DeepAgentForecast','thedotmack/claude-mem','pingdotgg/t3code','pbakaus/impeccable','shiyu-coder/Kronos','grafana/k6','locustio/locust','zaproxy/zaproxy','semgrep/semgrep'];
let failures=0;
for(const repo of repos){const dir=path.join(root,repo.replace('/','--'));if(fs.existsSync(dir)){console.log(JSON.stringify({repo,status:'exists-review-before-update'}));continue;}const r=spawnSync('git',['clone','--depth','1','--filter=blob:none','https://github.com/'+repo+'.git',dir],{encoding:'utf8',timeout:240000});if(r.status!==0)failures++;console.log(JSON.stringify({repo,status:r.status===0?'cloned':'failed',error:r.status===0?null:(r.error?.message||r.stderr)}));}
process.exitCode=failures?1:0;
