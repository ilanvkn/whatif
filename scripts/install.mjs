import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(Number(process.versions.node.split('.')[0])<22)throw Error('Node 22+ required');
const args=process.argv.slice(2),opts={};
for(let i=0;i<args.length;i+=2){
 if(!['--home','--codex'].includes(args[i])||!args[i+1]||Object.hasOwn(opts,args[i].slice(2)))throw Error('Use --home CODEX_HOME or --codex CLI_PATH, without duplicate options');
 opts[args[i].slice(2)]=args[i+1];
}
const home=path.resolve(opts.home||process.env.CODEX_HOME||path.join(os.homedir(),'.codex'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'.codex-plugin/plugin.json'),'utf8'));
if(!/^\d+\.\d+\.\d+$/.test(manifest.version))throw Error('Invalid release version');
const market=path.join(home,'whatif','marketplace'),dest=path.join(market,'plugins','whatif-'+manifest.version);
const marketFile=path.join(market,'.agents/plugins/marketplace.json');
const receiptFile=path.join(home,'whatif','install-receipt.json');
const nonce=process.pid+'-'+crypto.randomUUID(),stage=dest+'.stage-'+nonce;
const lock=path.join(market,'.whatif-install-lock');

async function bytesOrMissing(file){try{return await fs.readFile(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function atomicWrite(file,bytes){
 const temporary=file+'.tmp-'+nonce;
 try{await fs.writeFile(temporary,bytes,{flag:'wx'});await fs.rename(temporary,file);}
 finally{await fs.rm(temporary,{force:true});}
}
async function inventory(directory){
 const entries=[];
 async function walk(relative){
  for(const ent of (await fs.readdir(path.join(directory,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const file=path.join(relative,ent.name),absolute=path.join(directory,file);
   if(ent.isDirectory())await walk(file);
   else if(ent.isFile())entries.push([file,crypto.createHash('sha256').update(await fs.readFile(absolute)).digest('hex')]);
   else throw Error('Release payload must contain regular files and directories: '+file);
  }
 }
 await walk('');return JSON.stringify(entries);
}
function codexCall(commandArgs){
 const result=spawnSync(opts.codex||'codex',commandArgs,{encoding:'utf8',env:{...process.env,CODEX_HOME:home},maxBuffer:4*1024*1024});
 if(result.error)throw Error('Codex invocation failed: '+(result.error.code||result.error.message));
 if(result.status!==0)throw Error(result.stderr||result.stdout||'Codex invocation failed');
 return JSON.parse(result.stdout);
}

await fs.mkdir(market,{recursive:true});
try{await fs.mkdir(lock);}catch(e){if(e.code==='EEXIST')throw Error('Another WhatIF installation may be active. Inspect '+lock+' before retrying; it was not removed automatically.');throw e;}
let descriptorChanged=false,previousDescriptor=null,reusedStage=false;
try{
 await fs.mkdir(path.dirname(dest),{recursive:true});await fs.mkdir(stage);
 for(const file of ['src','skills','commands','scripts','docs','examples','test','.codex-plugin','.claude-plugin','.mcp.json','package.json','README.md','LICENSE','CHANGELOG.md','SECURITY.md'])await fs.cp(path.join(root,file),path.join(stage,file),{recursive:true});
 manifest.mcpServers='./.codex-plugin/mcp.json';
 await fs.writeFile(path.join(stage,'.codex-plugin/plugin.json'),JSON.stringify(manifest,null,2));
 await fs.writeFile(path.join(stage,'.codex-plugin/mcp.json'),JSON.stringify({mcpServers:{whatif:{command:process.execPath,args:[path.join(dest,'src/mcp.mjs')]}}},null,2));
 for(const file of ['package.json','.claude-plugin/plugin.json']){const staged=JSON.parse(await fs.readFile(path.join(stage,file),'utf8'));if(staged.version!==manifest.version)throw Error('Release manifest version mismatch: '+file);}
 let existing;
 try{existing=await fs.lstat(dest);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing){
  if(!existing.isDirectory()||await inventory(dest)!==await inventory(stage))throw Error('Existing staged release differs from this payload; preserved '+dest+'. Use a new version for changed release contents.');
  reusedStage=true;
 }else await fs.rename(stage,dest);
 await fs.mkdir(path.dirname(marketFile),{recursive:true});
 previousDescriptor=await bytesOrMissing(marketFile);
 if(previousDescriptor!==null){
  try{await fs.writeFile(marketFile+'.before-'+manifest.version,previousDescriptor,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
 }
 const descriptor={name:'whatif-local',interface:{displayName:'WhatIF Local'},plugins:[{name:'whatif',source:{source:'local',path:'./plugins/whatif-'+manifest.version},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},category:'Developer Tools'}]};
 await atomicWrite(marketFile,JSON.stringify(descriptor,null,2));descriptorChanged=true;
 const marketplace=codexCall(['plugin','marketplace','add',market,'--json']);
 const installed=codexCall(['plugin','add','whatif@whatif-local','--json']);
 if(!installed.installedPath)throw Error('Installation did not return a cache path');
 const actual=JSON.parse(await fs.readFile(path.join(installed.installedPath,'.codex-plugin/plugin.json'),'utf8'));
 if(actual.version!==manifest.version)throw Error('Installed version mismatch');
 const receipt={version:manifest.version,node:process.execPath,stagedSource:dest,reusedStage,marketplace,installed,refreshRequired:true};
 await atomicWrite(receiptFile,JSON.stringify(receipt,null,2));
 console.log(JSON.stringify(receipt,null,2));
}catch(error){
 let rollback='Marketplace descriptor was not changed.';
 if(descriptorChanged){
  try{if(previousDescriptor===null)await fs.rm(marketFile,{force:true});else await atomicWrite(marketFile,previousDescriptor);rollback='Previous marketplace descriptor restored.';}
  catch(restoreError){rollback='Marketplace descriptor rollback failed: '+restoreError.message;}
 }
 throw Error('Install incomplete. '+rollback+' Previous receipt and staged releases were preserved. An identical staged release can be retried. Inspect Codex registration/cache state if a command partially succeeded. '+error.message);
}finally{
 await fs.rm(stage,{recursive:true,force:true});await fs.rmdir(lock);
}
