import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {must} from '../engines/contracts.mjs';
import {sha,json} from '../core.mjs';
export async function sandboxProfile(appDir,port){
 must(process.platform==='darwin','Automatic AI patch execution currently requires qualified macOS isolation');
 await fs.access('/usr/bin/sandbox-exec');const node=await fs.realpath(process.execPath),app=await fs.realpath(appDir);
 must(Number.isInteger(port)&&port>0&&port<=65535,'Invalid sandbox port');
 return {node,app,profile:`(version 1)\n(deny default)\n(allow sysctl-read)\n(allow file-read-metadata)\n(allow file-map-executable)\n(allow file-read* (literal "/") (literal "/dev/null") (subpath "/System") (subpath "/usr/lib") (subpath "/opt/homebrew/Cellar") (subpath "/opt/homebrew/opt") (subpath ${JSON.stringify(app)}))\n(allow process-exec (literal ${JSON.stringify(node)}))\n(allow network-bind (local ip "localhost:${port}"))\n(allow network-inbound (local ip "localhost:${port}"))\n`};
}
export async function allocatePort(){const s=net.createServer();await new Promise((r,j)=>{s.once('error',j);s.listen(0,'127.0.0.1',r);});const port=s.address().port;await new Promise(r=>s.close(r));return port;}
export async function launchApp({appDirectory,entry,port,directory,timeoutMs=60000}){
 const {node,app,profile}=await sandboxProfile(appDirectory,port);await fs.mkdir(directory,{recursive:false});const profileFile=path.join(directory,'sandbox.sb');await fs.writeFile(profileFile,profile);
 const env={PATH:'/usr/bin:/bin',HOME:app,TMPDIR:app,OPENSSL_CONF:'/dev/null',WHATIF_PORT:String(port),PORT:String(port)};
 const child=spawn('/usr/bin/sandbox-exec',['-f',profileFile,node,'--permission','--allow-fs-read='+app,path.join(app,entry)],{cwd:app,env,stdio:['ignore','pipe','pipe'],detached:true});let bytes=0,line='',ready=false,ended=false,exitCode=null;const started=performance.now();
 const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}};
 const deadline=setTimeout(kill,timeoutMs);
 const exit=new Promise(resolve=>{child.on('error',()=>{ended=true;resolve();});child.on('close',code=>{ended=true;exitCode=code;resolve();});});
 const start=await new Promise(resolve=>{
 const timer=setTimeout(()=>{kill();resolve(null);},Math.min(timeoutMs,10000));
 child.on('error',()=>{clearTimeout(timer);resolve(null);});child.on('exit',()=>{clearTimeout(timer);resolve(null);});
 child.stderr.on('data',b=>{bytes+=b.length;if(bytes>65536){kill();clearTimeout(timer);resolve(null);}});
 child.stdout.on('data',b=>{bytes+=b.length;if(bytes>65536){kill();clearTimeout(timer);resolve(null);return;}line+=b;let i;while((i=line.indexOf('\n'))>=0){const l=line.slice(0,i);line=line.slice(i+1);try{const v=JSON.parse(l);if(v.whatifReady&&v.pid===child.pid&&v.port===port){clearTimeout(timer);ready=true;resolve(v);}}catch{}}});
 });
 if(!start){kill();await exit;clearTimeout(deadline);throw Error('Isolated app did not start; no network test was launched');}
 // Bind the served port to this owned process before sending any application traffic.
 let owned=false;try{owned=execFileSync('/usr/sbin/lsof',['-nP','-a','-p',String(child.pid),'-iTCP:'+port,'-sTCP:LISTEN'],{encoding:'utf8',timeout:2000}).includes('LISTEN');}catch{}
 if(!owned){kill();await exit;clearTimeout(deadline);throw Error('App listener ownership could not be established');}
 const receipt={pid:child.pid,port,node,entry,profileSha256:sha(profile),ready,sourceSha256:start.sourceSha256??null,listenerOwnershipVerified:true};await fs.writeFile(path.join(directory,'launch.json'),json(receipt));
 return {target:`http://127.0.0.1:${port}/`,receipt,async stop(){kill();await exit;clearTimeout(deadline);await fs.writeFile(path.join(directory,'stop.json'),json({stopped:ended,exitCode,elapsedMs:performance.now()-started}));return ended;}};
}
export async function runIsolatedScript({appDirectory,entry,directory,timeoutMs=5000}){
 const {node,app,profile}=await sandboxProfile(appDirectory,65534);await fs.mkdir(directory,{recursive:false});const file=path.join(directory,'sandbox.sb'),effectiveProfile=profile.replace(/\(allow network[^\n]+\n/g,'');await fs.writeFile(file,effectiveProfile);
 const child=spawn('/usr/bin/sandbox-exec',['-f',file,node,'--permission','--allow-fs-read='+app,path.join(app,entry)],{cwd:app,env:{PATH:'/usr/bin:/bin',HOME:app,TMPDIR:app,OPENSSL_CONF:'/dev/null'},stdio:['ignore','pipe','pipe'],detached:true});let output='',bytes=0,timedOut=false;
 const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}};const timer=setTimeout(()=>{timedOut=true;kill();},timeoutMs);
 for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{bytes+=b.length;if(bytes>65536)kill();else output+=b;});
 const code=await new Promise(r=>{child.on('error',()=>r(null));child.on('close',r);});clearTimeout(timer);kill();
 return {code,timedOut,output:bytes<=65536?output:'',outputLimit:bytes>65536,profileSha256:sha(effectiveProfile)};
}
