import {spawn,execFileSync} from 'node:child_process';
// Dedicated process groups ensure cancellation also terminates child browsers/k6.
export function runProcess(command,args,{cwd,env,timeoutMs,ownGroup=true}){return new Promise((resolve,reject)=>{
 const child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe'],detached:ownGroup&&process.platform!=='win32'});let bytes=0,timedOut=false,cancelled=false,overflow=false,exitError=false;const output=[];
 const kill=signal=>{try{if(ownGroup&&process.platform!=='win32')process.kill(-child.pid,signal);else child.kill(signal);}catch{}};
 const descendants=new Set();
 const collect=()=>{if(process.platform==='win32')return;try{const rows=execFileSync('/bin/ps',['-axo','pid=,ppid='],{encoding:'utf8',maxBuffer:1048576}).trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number));const family=new Set([child.pid]);let changed=true;while(changed){changed=false;for(const [pid,ppid]of rows)if(family.has(ppid)&&!family.has(pid)){family.add(pid);descendants.add(pid);changed=true;}}}catch{}};
 const killDescendants=signal=>{for(const pid of descendants)try{process.kill(pid,signal);}catch{}};
 let hard;
 const stop=()=>{collect();kill('SIGTERM');killDescendants('SIGTERM');hard=setTimeout(()=>{kill('SIGKILL');killDescendants('SIGKILL');},500);};
 const onInterrupt=()=>{cancelled=true;stop();};
 process.once('SIGINT',onInterrupt);process.once('SIGTERM',onInterrupt);
 const cleanup=()=>{process.removeListener('SIGINT',onInterrupt);process.removeListener('SIGTERM',onInterrupt);};
 const timer=setTimeout(()=>{timedOut=true;stop();},timeoutMs);
 for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{bytes+=b.length;if(bytes<=262144)output.push(b);else if(!overflow){overflow=true;stop();}});
 child.on('error',()=>{exitError=true;cleanup();clearTimeout(timer);clearTimeout(hard);reject(Error('Engine process could not start'));});
 child.on('close',(code,signal)=>{cleanup();clearTimeout(timer);clearTimeout(hard);kill('SIGKILL');killDescendants('SIGKILL');if(!exitError)resolve({code,signal,timedOut,cancelled,overflow,output:Buffer.concat(output).toString('utf8')});});
 });}
export function cleanEnv(extra={}){return {PATH:process.env.PATH||'',HOME:process.env.HOME||'',TMPDIR:process.env.TMPDIR||'/tmp',...extra};}
