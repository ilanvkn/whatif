import fs from 'node:fs/promises';
import path from 'node:path';
import {sha,json} from '../core.mjs';
import {validateTeam,relativeFile} from './contracts.mjs';
import {launchApp} from './sandbox.mjs';
import {must} from '../engines/contracts.mjs';
export const STATIC_HOST='whatif-static-host.mjs';
export const sourceIdentity=snapshot=>sha(json(snapshot.map(({path,sha256})=>({path,sha256}))));
export const staticHostSource=`import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const config=JSON.parse(fs.readFileSync(new URL('./.whatif-static.json',import.meta.url)));
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const identity=config.files.map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(root,p)))}));
const sourceSha256=hash(JSON.stringify(identity,null,2)+'\\n');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.aff':'text/plain','.dic':'text/plain'};
http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||config.entry;}catch{res.writeHead(400);res.end();return;}
 if(!config.assets.includes(name)){res.writeHead(404);res.end();return;}
 try{const body=fs.readFileSync(path.join(root,name));res.setHeader('Content-Type',types[path.extname(name)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}
}).listen(Number(process.env.WHATIF_PORT),'127.0.0.1',function(){console.log(JSON.stringify({whatifReady:true,pid:process.pid,port:this.address().port,sourceSha256}));});
`;
export async function assetInventory(root,assets){
 const canonical=await fs.realpath(root);const list=[];let total=0;
 for(const file of assets){relativeFile(file);must(file!==STATIC_HOST,'Reserved host path');const full=path.join(canonical,file),stat=await fs.lstat(full);must(stat.isFile()&&(await fs.realpath(full)).startsWith(canonical+path.sep),'Asset must be a regular file inside source');must(stat.size<=4194304,'Asset exceeds 4 MiB');total+=stat.size;must(total<=16777216,'Asset bundle exceeds 16 MiB');list.push({path:file,bytes:stat.size,sha256:sha(await fs.readFile(full))});}return list;
}
export async function planAppTeam({manifest,out}){
 const spec=JSON.parse(await fs.readFile(manifest));must(spec.runner==='static-web','App manifest requires static-web runner');spec.app.source=await fs.realpath(spec.app.source);validateTeam(spec);
 const inventory=await assetInventory(spec.app.source,spec.app.assets);const reviewed=inventory.filter(f=>spec.app.files.includes(f.path));must(reviewed.every(f=>f.bytes<=65536)&&reviewed.reduce((n,f)=>n+f.bytes,0)<=262144,'Reviewed source exceeds disclosure limits');spec.app.assetHashes=inventory;
 await fs.mkdir(out,{recursive:false});await fs.writeFile(path.join(out,'team.json'),json(spec),{flag:'wx'});
 return {teamDirectory:path.resolve(out),execution:'not-started',runner:spec.runner,assets:inventory.length,source:spec.app.source,next:'Review pinned assets, source disclosure, immutable campaign oracles and budgets. Run team-run with exact canonical source acknowledgement.'};
}
export async function prepareStatic(spec,app,run){
 const inventory=await assetInventory(spec.app.source,spec.app.assets);must(json(inventory)===json(spec.app.assetHashes),'Reviewed asset hashes changed; prepare a new plan');
 for(const file of spec.app.assets){const dest=path.join(app,file);await fs.mkdir(path.dirname(dest),{recursive:true});const bytes=await fs.readFile(path.join(spec.app.source,file));must(sha(bytes)===inventory.find(a=>a.path===file).sha256,'Source asset changed while copying');await fs.writeFile(dest,bytes);}
 await fs.writeFile(path.join(app,STATIC_HOST),staticHostSource,{flag:'wx'});
 await fs.writeFile(path.join(app,'.whatif-static.json'),json({entry:spec.app.entry,files:spec.app.files,assets:spec.app.assets}),{flag:'wx'});
 await fs.writeFile(path.join(run,'assets.json'),json(inventory));
}
export async function launchStatic(spec,options){
 must(sha(await fs.readFile(path.join(options.appDirectory,STATIC_HOST)))===sha(staticHostSource),'Trusted static host changed');
 return launchApp({...options,entry:STATIC_HOST});
}
