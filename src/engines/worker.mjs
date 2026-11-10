import fs from 'node:fs/promises';
import path from 'node:path';
import {browserJourney} from './browser.mjs';
import {securityChecks} from './security.mjs';
import {loadTest} from './k6.mjs';
const input=JSON.parse(await fs.readFile(process.argv[2]));
try{
 const dir=path.dirname(process.argv[2]);
 const result=input.branch.engine==='browser'?await browserJourney({target:input.target,config:input.branch.config},input.runtime,dir):input.branch.engine==='security'?await securityChecks({target:input.target,config:input.branch.config}):await loadTest({target:input.target,config:input.branch.config},input.runtime,dir);
 await fs.writeFile(path.join(dir,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
}catch{await fs.writeFile(path.join(path.dirname(process.argv[2]),'result.json'),JSON.stringify({engine:input.branch.engine,passed:false,status:'engine-failed',requests:null,reason:'Engine execution failed; sensitive error details intentionally omitted.'})+'\n',{flag:'wx'});process.exitCode=1;}
