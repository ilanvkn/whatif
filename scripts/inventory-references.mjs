import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
const digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const repos=[];
for(const name of fs.readdirSync(root).sort()){
 const dir=path.join(root,name);if(!fs.existsSync(path.join(dir,'.git')))continue;
 const git=(...a)=>execFileSync('git',a,{cwd:dir,encoding:'utf8',maxBuffer:10*1024*1024}).trim();
 try{
 const commit=git('rev-parse','HEAD'),remote=git('remote','get-url','origin');
 const files=git('ls-files').split('\n').filter(Boolean),status=git('status','--porcelain');
 const licenses=files.filter(f=>/(^|\/)(LICENSE|LICENCE|COPYING)(\.[^/]*)?$/i.test(f)&&f.split('/').length<=3).map(f=>({file:f,sha256:fs.existsSync(path.join(dir,f))?digest(path.join(dir,f)):null}));
 const readme=files.find(f=>/^README\.md$/i.test(f));
 repos.push({directory:name,remote,commit,shallow:git('rev-parse','--is-shallow-repository')==='true',clean:status==='',trackedFiles:files.length,licenseFiles:licenses,readme:readme&&fs.existsSync(path.join(dir,readme))?{file:readme,sha256:digest(path.join(dir,readme))}:null,submodulesInitialized:false,integrationStatus:'reference-only-not-bundled'});
 }catch(e){repos.push({directory:name,error:'Incomplete checkout or metadata unavailable: '+e.message});}
}
fs.writeFileSync(out,JSON.stringify({schemaVersion:1,reviewDate:'2026-11-07 Asia/Kuala_Lumpur',scope:'Commit and checkout inventory; not exhaustive source analysis or license clearance',repositories:repos},null,2)+'\n');
console.log(JSON.stringify({repositories:repos.length,clean:repos.filter(x=>x.clean).length,incomplete:repos.filter(x=>!x.clean).map(x=>x.directory)},null,2));
