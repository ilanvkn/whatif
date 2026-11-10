import fs from 'node:fs/promises';
import {createReadStream,constants} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
const int=(n,min,max,name)=>must(Number.isInteger(n)&&n>=min&&n<=max,`${name} must be ${min}..${max}`);
// Verified against the local CLI's `features list`; unknown/removed flags fail closed
// under --strict-config. No shell or user-supplied executable text is interpolated.
export const DISABLED_FEATURES=['shell_tool','unified_exec','code_mode_host','apps','plugins','remote_plugin','multi_agent','multi_agent_v2','hooks','browser_use','browser_use_external','browser_use_full_cdp_access','computer_use','in_app_browser','image_generation','view_image','skill_search','workspace_dependencies'];

export function validateRoleOutput(value,schema,location='$'){
 must(schema&&typeof schema==='object'&&!Array.isArray(schema),'Invalid role schema');
 if(schema.anyOf){must(schema.anyOf.some(s=>{try{validateRoleOutput(value,s,location);return true;}catch{return false;}}),`Role output fails anyOf at ${location}`);}
 if(schema.oneOf){must(schema.oneOf.filter(s=>{try{validateRoleOutput(value,s,location);return true;}catch{return false;}}).length===1,`Role output fails oneOf at ${location}`);}
 if(Object.hasOwn(schema,'const'))must(JSON.stringify(value)===JSON.stringify(schema.const),`Role output const mismatch at ${location}`);
 if(schema.enum)must(schema.enum.some(x=>JSON.stringify(x)===JSON.stringify(value)),`Role output enum mismatch at ${location}`);
 if(Array.isArray(schema.type)){must(schema.type.some(type=>{try{validateRoleOutput(value,{...schema,type},location);return true;}catch{return false;}}),`Role output type mismatch at ${location}`);return value;}
 const type=schema.type;
 if(type==='object'){
 must(value!==null&&typeof value==='object'&&!Array.isArray(value),`Role output must be an object at ${location}`);
 for(const key of schema.required||[])must(Object.hasOwn(value,key),`Role output missing required field at ${location}`);
 for(const [key,entry]of Object.entries(value)){const sub=schema.properties?.[key];if(sub)validateRoleOutput(entry,sub,location+'.'+key);else if(schema.additionalProperties===false)throw Error(`Unexpected role field at ${location}`);else if(schema.additionalProperties&&typeof schema.additionalProperties==='object')validateRoleOutput(entry,schema.additionalProperties,location+'.'+key);}
 }else if(type==='array'){
 must(Array.isArray(value),`Role output must be an array at ${location}`);if(schema.minItems!==undefined)must(value.length>=schema.minItems,`Too few role items at ${location}`);if(schema.maxItems!==undefined)must(value.length<=schema.maxItems,`Too many role items at ${location}`);if(schema.items)for(const [i,v]of value.entries())validateRoleOutput(v,schema.items,location+'['+i+']');
 }else if(type==='string'){
 must(typeof value==='string',`Role output must be a string at ${location}`);if(schema.minLength!==undefined)must(value.length>=schema.minLength,`Role string too short at ${location}`);if(schema.maxLength!==undefined)must(value.length<=schema.maxLength,`Role string too long at ${location}`);if(schema.pattern!==undefined)must(new RegExp(schema.pattern,'u').test(value),`Role string pattern mismatch at ${location}`);
 }else if(type==='number'||type==='integer'){
 must(typeof value==='number'&&Number.isFinite(value)&&(type!=='integer'||Number.isInteger(value)),`Role output must be ${type} at ${location}`);if(schema.minimum!==undefined)must(value>=schema.minimum,`Role number below bound at ${location}`);if(schema.maximum!==undefined)must(value<=schema.maximum,`Role number above bound at ${location}`);
 }else if(type==='boolean')must(typeof value==='boolean',`Role output must be boolean at ${location}`);
 else if(type==='null')must(value===null,`Role output must be null at ${location}`);
 else must(type===undefined&&(schema.const!==undefined||schema.enum!==undefined||schema.anyOf!==undefined||schema.oneOf!==undefined),`Unsupported role schema type at ${location}`);
 return value;
}
function validateSchema(schema,depth=0){
 must(depth<=20&&schema&&typeof schema==='object'&&!Array.isArray(schema),'Invalid or excessively deep role schema');
 const supported=new Set(['type','properties','required','additionalProperties','items','minItems','maxItems','minLength','maxLength','minimum','maximum','enum','const','anyOf','oneOf','pattern','description','title']);
 for(const key of Object.keys(schema))must(supported.has(key),'Unsupported role schema keyword: '+key);
 for(const child of Object.values(schema.properties||{}))validateSchema(child,depth+1);
 if(schema.items)validateSchema(schema.items,depth+1);if(schema.additionalProperties&&typeof schema.additionalProperties==='object')validateSchema(schema.additionalProperties,depth+1);
 for(const family of ['anyOf','oneOf'])if(schema[family]){must(Array.isArray(schema[family])&&schema[family].length>0&&schema[family].length<=20,'Invalid schema alternatives');for(const child of schema[family])validateSchema(child,depth+1);}
}
function providerEnvironment(){
 const env={};for(const key of ['HOME','PATH','TMPDIR','TEMP','TMP','LANG','LC_ALL','CODEX_HOME','OPENAI_API_KEY','CODEX_API_KEY','HTTPS_PROXY','HTTP_PROXY','ALL_PROXY','NO_PROXY','https_proxy','http_proxy','all_proxy','no_proxy'])if(process.env[key]!==undefined)env[key]=process.env[key];return env;
}
async function resolveBinary(binary){
 must(typeof binary==='string'&&binary.length>0&&!binary.includes('\0'),'Codex executable required');
 if(binary.includes(path.sep)){const resolved=await fs.realpath(path.resolve(binary));await fs.access(resolved,constants.X_OK);return resolved;}
 for(const dir of (process.env.PATH||'').split(path.delimiter)){if(!dir)continue;const candidate=path.join(dir,binary);try{await fs.access(candidate,constants.X_OK);return await fs.realpath(candidate);}catch{}}
 throw Error('Codex executable is unavailable');
}
async function binaryHash(binary){const h=crypto.createHash('sha256');for await(const chunk of createReadStream(binary))h.update(chunk);return h.digest('hex');}
function boundedProcess(binary,args,{cwd,env,stdin='',timeoutMs,maxBytes,signal,onEvent}){
 return new Promise(resolve=>{
 let child;try{child=spawn(binary,args,{cwd,env,shell:false,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});}catch{return resolve({code:null,status:'spawn-failed',bytes:0});}
 let bytes=0,status=null,line='',timer,killTimer,settled=false;const small=[];
 const kill=how=>{try{if(process.platform==='win32')child.kill(how);else process.kill(-child.pid,how);}catch{}};
 const stop=why=>{if(status)return;status=why;kill('SIGTERM');killTimer=setTimeout(()=>kill('SIGKILL'),250);};
 const abort=()=>stop('cancelled');
 const finish=(code,error=false)=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(killTimer);signal?.removeEventListener('abort',abort);kill('SIGKILL');if(line.trim()&&bytes<=maxBytes)try{onEvent?.(JSON.parse(line));}catch{}resolve({code,status:status||(error?'spawn-failed':code===0?'completed':'provider-failed'),bytes,text:small.join('')});};
 child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes){stop('output-limit');return;}if(!onEvent)small.push(chunk.toString('utf8'));else{line+=chunk.toString('utf8');let end;while((end=line.indexOf('\n'))!==-1){const next=line.slice(0,end);line=line.slice(end+1);try{if(onEvent(JSON.parse(next))===false)stop('unexpected-tool-use');}catch{}}}});
 child.stderr.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes)stop('output-limit');});
 child.on('error',()=>finish(null,true));child.on('close',code=>finish(code));child.stdin.on('error',()=>{});
 timer=setTimeout(()=>stop('timeout'),timeoutMs);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 child.stdin.end(stdin);
 });
}
function metadataCollector(){
 const data={sessionId:null,model:null,usage:null,turns:0,toolAttempts:0};
 return {data,event(e){
 if(e?.type==='thread.started'&&typeof e.thread_id==='string')data.sessionId=e.thread_id;
 if(e?.type==='session.started'&&typeof e.session_id==='string')data.sessionId=e.session_id;
 if(typeof e?.model==='string')data.model=e.model;
 if(typeof e?.session?.model==='string')data.model=e.session.model;
 if(e?.type==='turn.completed'){data.turns++;const u=e.usage;if(u&&['input_tokens','output_tokens'].every(k=>Number.isSafeInteger(u[k])&&u[k]>=0)){data.usage??={inputTokens:0,cachedInputTokens:0,outputTokens:0};data.usage.inputTokens+=u.input_tokens;data.usage.outputTokens+=u.output_tokens;if(Number.isSafeInteger(u.cached_input_tokens)&&u.cached_input_tokens>=0){if(data.usage.cachedInputTokens!==null)data.usage.cachedInputTokens+=u.cached_input_tokens;}else data.usage.cachedInputTokens=null;}}
 if(['command_execution','mcp_tool_call','web_search','file_change','collab_tool_call'].includes(e?.item?.type)&&['item.started','item.completed','item.updated'].includes(e.type)){data.toolAttempts++;return false;}
 }};
}

/** One fresh Codex session; independent context does not imply independent weights/provider. */
export async function callCodexRole({role,prompt,schema,directory,timeoutMs=120000,maxOutputBytes=262144,maxInputChars=120000,codexBinary='codex',signal}={}){
 must(typeof role==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(role),'Invalid role identifier');int(timeoutMs,100,600000,'timeoutMs');int(maxOutputBytes,128,4194304,'maxOutputBytes');int(maxInputChars,1,1048576,'maxInputChars');
 must(typeof prompt==='string'&&prompt.length>0&&prompt.length<=maxInputChars,'Role prompt exceeds input character limit or is empty');must(typeof directory==='string'&&path.isAbsolute(directory),'Absolute new role directory required');validateSchema(schema);must(Buffer.byteLength(JSON.stringify(schema))<=65536,'Role schema exceeds 64 KiB');
 const started=performance.now(),startedAt=new Date().toISOString();await fs.mkdir(directory,{recursive:false,mode:0o700});
 const schemaFile=path.join(directory,'schema.json'),outputFile=path.join(directory,'model-output.json'),receiptFile=path.join(directory,'receipt.json');await fs.writeFile(schemaFile,JSON.stringify(schema,null,2)+'\n',{flag:'wx',mode:0o600});
 const receipt={schemaVersion:1,role,provider:'codex-cli',status:'starting',startedAt,promptSha256:hash(prompt),schemaSha256:hash(JSON.stringify(schema)),outputSha256:null,sessionId:null,model:null,usage:null,limits:{timeoutMs,maxOutputBytes,maxInputChars,tokenLimitEnforced:false,dollarLimitEnforced:false},scope:{ephemeral:true,readOnly:true,userConfigIgnored:true,projectDocsDisabled:true,context:'fresh-temporary-directory',disabledFeatures:DISABLED_FEATURES,toolFreedom:'Tool channels disabled; unexpected observed tool use invalidates the result. Not an attestation of provider-side isolation.'}};
 let output,contextDirectory;
 try{
 if(signal?.aborted)throw Object.assign(Error('Agent call cancelled'),{providerStatus:'cancelled'});
 contextDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'whatif-role-'));
 const binary=await resolveBinary(codexBinary);receipt.binary={path:binary,sha256:await binaryHash(binary)};
 const env=providerEnvironment(),version=await boundedProcess(binary,['--version'],{cwd:contextDirectory,env,timeoutMs:Math.min(2000,timeoutMs),maxBytes:4096,signal});receipt.providerVersion=version.status==='completed'&&/^codex(?:-cli)? [\w.+-]+\s*$/.test(version.text||'')?version.text.trim():null;
 const remaining=timeoutMs-(performance.now()-started);if(remaining<=0)throw Object.assign(Error('Agent call deadline reached'),{providerStatus:'timeout'});
 const collector=metadataCollector();
 const args=['exec','--ignore-user-config','--strict-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--color','never','--json','--output-schema',schemaFile,'--output-last-message',outputFile,'-C',contextDirectory,'-c','approval_policy="never"','-c','project_doc_max_bytes=0','-c','web_search="disabled"','-c','mcp_servers={}','--enable','skip_host_skill_discovery',...DISABLED_FEATURES.flatMap(feature=>['--disable',feature]),'-'];
 const proc=await boundedProcess(binary,args,{cwd:contextDirectory,env,stdin:prompt,timeoutMs:remaining,maxBytes:maxOutputBytes,signal,onEvent:e=>collector.event(e)});
 Object.assign(receipt,collector.data,{status:proc.status,exitCode:proc.code,capturedBytes:proc.bytes});
 if(proc.status!=='completed')throw Object.assign(Error('Codex role process did not complete'),{providerStatus:proc.status});
 if(receipt.toolAttempts>0)throw Object.assign(Error('Unexpected role tool activity'),{providerStatus:'unexpected-tool-use'});
 if(!receipt.sessionId)throw Object.assign(Error('Provider did not identify an independent session'),{providerStatus:'missing-session-identity'});
 const stat=await fs.lstat(outputFile);must(stat.isFile(),'Provider output must be a regular file');if(stat.size>maxOutputBytes){await fs.unlink(outputFile);throw Object.assign(Error('Provider output exceeds limit'),{providerStatus:'output-limit'});}
 const raw=await fs.readFile(outputFile);receipt.outputSha256=hash(raw);output=JSON.parse(raw);validateRoleOutput(output,schema);receipt.status='completed';
 }catch(error){receipt.status=error.providerStatus||'invalid-provider-output';receipt.elapsedMs=performance.now()-started;receipt.endedAt=new Date().toISOString();await fs.writeFile(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});if(contextDirectory)await fs.rm(contextDirectory,{recursive:true,force:true});const failure=Error(`Codex role ${role} failed (${receipt.status}); inspect its sanitized receipt.`);failure.receipt=receipt;throw failure;}
 receipt.elapsedMs=performance.now()-started;receipt.endedAt=new Date().toISOString();await fs.writeFile(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});if(contextDirectory)await fs.rm(contextDirectory,{recursive:true,force:true});return {output,receipt};
}
