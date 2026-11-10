import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {sha} from '../src/core.mjs';
import {sourceSnapshot,validatePatch} from '../src/agents/team.mjs';
import {allocatePort,launchApp,runIsolatedScript} from '../src/agents/sandbox.mjs';

async function temporary(t){const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'whatif-team-test-')));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
const baseline='export const value = 1;\n';
const snapshot=[{path:'domain.mjs',content:baseline,sha256:sha(baseline)}];
const patch={path:'domain.mjs',baseSha256:sha(baseline),content:'export const value = 2;\n'};

test('patch validation rejects traversal, immutable host, stale and empty fixes',()=>{
 assert.deepEqual(validatePatch([patch],snapshot,['domain.mjs']),[patch]);
 for(const target of ['../domain.mjs','/tmp/domain.mjs','nested/../../domain.mjs','server.mjs'])assert.throws(()=>validatePatch([{...patch,path:target}],snapshot,['domain.mjs']));
 assert.throws(()=>validatePatch([{...patch,baseSha256:'0'.repeat(64)}],snapshot,['domain.mjs']),/Stale/);
 assert.throws(()=>validatePatch([{...patch,content:baseline}],snapshot,['domain.mjs']),/No-op/);
 assert.throws(()=>validatePatch([patch,patch],snapshot,['domain.mjs']),/duplicate/);
 assert.throws(()=>validatePatch([],snapshot,['domain.mjs']),/No patch/);
 assert.throws(()=>validatePatch([{...patch,content:'x'.repeat(16385)}],snapshot,['domain.mjs']),/Invalid/);
 assert.throws(()=>validatePatch([{...patch,content:'bad\0content'}],snapshot,['domain.mjs']),/Invalid/);
});

test('source snapshots reject direct symlinks and escaping parent symlinks',async t=>{
 const root=await temporary(t),app=path.join(root,'app');await fs.mkdir(app);
 await fs.writeFile(path.join(app,'domain.mjs'),baseline);
 assert.deepEqual(await sourceSnapshot(app,['domain.mjs']),snapshot);
 await fs.symlink(path.join(app,'domain.mjs'),path.join(app,'alias.mjs'));
 await assert.rejects(sourceSnapshot(app,['alias.mjs']),/regular files/);
 await fs.mkdir(path.join(root,'outside'));await fs.writeFile(path.join(root,'outside','secret.mjs'),'synthetic');
 await fs.symlink(path.join(root,'outside'),path.join(app,'escape'));
 await assert.rejects(sourceSnapshot(app,['escape/secret.mjs']),/escaped/);
 await assert.rejects(sourceSnapshot(app,['../outside/secret.mjs']));
});

test('macOS isolated scripts deny filesystem escape, spawn and outbound connections',{skip:process.platform!=='darwin',timeout:15000},async t=>{
 const root=await temporary(t),app=path.join(root,'app');await fs.mkdir(app);
 const sentinel=path.join(root,'sentinel.txt'),outsideWrite=path.join(root,'forbidden.txt');await fs.writeFile(sentinel,'synthetic-secret');
 let hits=0;const other=http.createServer((req,res)=>{hits++;res.end('unexpected');});
 await new Promise(r=>other.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>other.close(r)));
 const probe=`import fs from 'node:fs';import http from 'node:http';import {spawnSync} from 'node:child_process';
 const result={};
 for(const [name,action] of Object.entries({read:()=>fs.readFileSync(${JSON.stringify(sentinel)}),write:()=>fs.writeFileSync(${JSON.stringify(outsideWrite)},'bad'),spawn:()=>{const p=spawnSync('/bin/echo',['child']);if(p.error)throw p.error;return p.status;}})){try{action();result[name]='ALLOWED';}catch(e){result[name]=e.code;}}
 result.outbound=await new Promise(resolve=>{const req=http.get('http://127.0.0.1:${other.address().port}/',r=>{r.resume();resolve('ALLOWED');});req.on('error',e=>resolve(e.code));req.setTimeout(1000,()=>req.destroy(new Error('timeout')));});console.log(JSON.stringify(result));`;
 await fs.writeFile(path.join(app,'probe.mjs'),probe);
 const run=await runIsolatedScript({appDirectory:app,entry:'probe.mjs',directory:path.join(root,'receipt')});
 assert.equal(run.code,0,run.output);assert.equal(run.timedOut,false);assert.equal(run.outputLimit,false);
 const result=JSON.parse(run.output.trim());for(const key of ['read','write','spawn'])assert.equal(result[key],'ERR_ACCESS_DENIED');
 assert.equal(result.outbound,'EPERM');assert.equal(hits,0);assert.equal(await fs.readFile(sentinel,'utf8'),'synthetic-secret');
 assert.equal(run.profileSha256,sha(await fs.readFile(path.join(root,'receipt','sandbox.sb'),'utf8')),'receipt must bind the executed sandbox profile');
 await assert.rejects(fs.access(outsideWrite),{code:'ENOENT'});
});

test('macOS copied app serves owned loopback HTTP with launch and cleanup proof',{skip:process.platform!=='darwin',timeout:15000},async t=>{
 const root=await temporary(t),app=path.join(root,'app');
 await fs.cp(fileURLToPath(new URL('../examples/agent-app',import.meta.url)),app,{recursive:true});
 const domain=await fs.readFile(path.join(app,'domain.mjs'),'utf8');
 const live=await launchApp({appDirectory:app,entry:'server.mjs',port:await allocatePort(),directory:path.join(root,'launch'),timeoutMs:10000});
 let stopped=false;t.after(async()=>{if(!stopped)await live.stop();});
 const response=await fetch(new URL('health',live.target),{signal:AbortSignal.timeout(2000)});
 assert.equal(response.status,200);assert.equal(await response.text(),'ok');
 assert.equal(live.receipt.listenerOwnershipVerified,true);assert.equal(live.receipt.sourceSha256,sha(domain));
 assert.equal(await live.stop(),true);stopped=true;
 const stop=JSON.parse(await fs.readFile(path.join(root,'launch','stop.json'),'utf8'));assert.equal(stop.stopped,true);
 await assert.rejects(fetch(new URL('health',live.target),{signal:AbortSignal.timeout(1000)}));
});
