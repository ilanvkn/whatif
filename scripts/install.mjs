import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(Number(process.versions.node.split('.')[0])<22)throw Error('Node 22+ required');
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i+=2){if(!['--home','--codex'].includes(args[i])||!args[i+1])throw Error('Use --home CODEX_HOME or --codex CLI_PATH');opts[args[i].slice(2)]=args[i+1];}
const home=path.resolve(opts.home||process.env.CODEX_HOME||path.join(os.homedir(),'.codex'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'.codex-plugin/plugin.json'),'utf8'));
if(!/^\d+\.\d+\.\d+$/.test(manifest.version))throw Error('Invalid release version');
const market=path.join(home,'whatif','marketplace'),dest=path.join(market,'plugins','whatif-'+manifest.version);
try{await fs.access(dest);throw Error('WhatIF staged source exists; preserve it and use an intentional versioned upgrade.');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.mkdir(path.dirname(dest),{recursive:true});
const stage=dest+'.stage-'+process.pid;await fs.mkdir(stage);
for(const f of ['src','skills','commands','scripts','docs','examples','.codex-plugin','.claude-plugin','.mcp.json','package.json','README.md','LICENSE','CHANGELOG.md','SECURITY.md'])await fs.cp(path.join(root,f),path.join(stage,f),{recursive:true});
manifest.mcpServers='./.codex-plugin/mcp.json';await fs.writeFile(path.join(stage,'.codex-plugin/plugin.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(stage,'.codex-plugin/mcp.json'),JSON.stringify({mcpServers:{whatif:{command:process.execPath,args:[path.join(dest,'src/mcp.mjs')]}}},null,2));
await fs.rename(stage,dest);
await fs.mkdir(path.join(market,'.agents/plugins'),{recursive:true});
const marketFile=path.join(market,'.agents/plugins/marketplace.json');
try { await fs.copyFile(marketFile,marketFile+'.before-'+manifest.version,fs.constants.COPYFILE_EXCL); } catch(e) { if(e.code!=='ENOENT')throw e; }
await fs.writeFile(marketFile,JSON.stringify({name:'whatif-local',interface:{displayName:'WhatIF Local'},plugins:[{name:'whatif',source:{source:'local',path:'./plugins/whatif-'+manifest.version},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},category:'Developer Tools'}]},null,2));
const codex=opts.codex||'codex';function run(args){const r=spawnSync(codex,args,{encoding:'utf8',env:{...process.env,CODEX_HOME:home},maxBuffer:4*1024*1024});if(r.status!==0)throw Error(r.stderr||r.stdout||'Codex invocation failed');return JSON.parse(r.stdout);}
try{
 const marketplace=run(['plugin','marketplace','add',market,'--json']);const installed=run(['plugin','add','whatif@whatif-local','--json']);
 if(!installed.installedPath)throw Error('Installation did not return a cache path');
 const actual=JSON.parse(await fs.readFile(path.join(installed.installedPath,'.codex-plugin/plugin.json'),'utf8'));if(actual.version!==manifest.version)throw Error('Installed version mismatch');
 const receipt={version:manifest.version,node:process.execPath,stagedSource:dest,marketplace,installed,refreshRequired:true};await fs.writeFile(path.join(home,'whatif','install-receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
}catch(e){throw Error('Install incomplete; retained staged source at '+dest+'. Inspect Codex marketplace/plugin state before retrying. '+e.message);}
