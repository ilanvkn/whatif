import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const installer=await fs.readFile(new URL('../scripts/install.mjs',import.meta.url));
async function setup(t,version='9.1.0'){
 if(process.platform==='win32'){t.skip('Injected executable fixture is qualified on POSIX');return null;}
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'whatif install '));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const source=path.join(base,'source'),home=path.join(base,'codex-home');await fs.mkdir(home,{recursive:true});
 for(const dir of ['src','skills','commands','scripts','docs','examples','test','.codex-plugin','.claude-plugin']){await fs.mkdir(path.join(source,dir),{recursive:true});await fs.writeFile(path.join(source,dir,'marker.txt'),dir);}
 await fs.writeFile(path.join(source,'scripts/install.mjs'),installer);
 for(const name of ['.codex-plugin/plugin.json','.claude-plugin/plugin.json'])await fs.writeFile(path.join(source,name),JSON.stringify({name:'whatif',version}));
 await fs.writeFile(path.join(source,'package.json'),JSON.stringify({name:'whatif-plugin',version,type:'module',scripts:{test:'node --test test/*.test.mjs'}}));
 for(const name of ['README.md','HANDOVER.md','LICENSE','CHANGELOG.md','SECURITY.md','.mcp.json'])await fs.writeFile(path.join(source,name),name);
 await fs.writeFile(path.join(source,'test/payload.test.mjs'),'import test from "node:test";test("packaged",()=>{});');
 const fake=path.join(base,'fake-codex');
 await fs.writeFile(fake,`#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');
const home=process.env.CODEX_HOME,args=process.argv.slice(2),control=JSON.parse(fs.readFileSync(path.join(home,'control.json')));
fs.appendFileSync(path.join(home,'calls.jsonl'),JSON.stringify(args)+'\\n');
if(args[1]==='marketplace'){if(control.failMarketplace){process.stderr.write('synthetic marketplace failure');process.exit(1);}console.log(JSON.stringify({marketplaceName:'whatif-local',alreadyAdded:false}));}
else if(args[1]==='add'){
 if(control.failAdd){process.stderr.write('synthetic plugin failure');process.exit(1);}
 const market=path.join(home,'whatif/marketplace'),descriptor=JSON.parse(fs.readFileSync(path.join(market,'.agents/plugins/marketplace.json'))),stage=path.resolve(market,descriptor.plugins[0].source.path),cache=path.join(home,'fake-cache');
 fs.cpSync(stage,cache,{recursive:true});
 if(control.wrongVersion){const f=path.join(cache,'.codex-plugin/plugin.json'),p=JSON.parse(fs.readFileSync(f));p.version='0.0.0';fs.writeFileSync(f,JSON.stringify(p));}
 console.log(JSON.stringify({pluginId:'whatif@whatif-local',installedPath:cache,version:JSON.parse(fs.readFileSync(path.join(cache,'.codex-plugin/plugin.json'))).version}));
}else process.exit(2);
`,{mode:0o755});
 const set=control=>fs.writeFile(path.join(home,'control.json'),JSON.stringify(control));await set({});
 const run=async(binary=fake)=>JSON.parse((await exec(process.execPath,[path.join(source,'scripts/install.mjs'),'--home',home,'--codex',binary])).stdout);
 return {base,source,home,fake,set,run,market:path.join(home,'whatif/marketplace'),descriptor:path.join(home,'whatif/marketplace/.agents/plugins/marketplace.json'),receipt:path.join(home,'whatif/install-receipt.json'),stage:path.join(home,'whatif/marketplace/plugins/whatif-'+version)};
}
async function prior(h){
 const old=path.join(h.market,'plugins/whatif-1.0.0');await fs.mkdir(old,{recursive:true});await fs.writeFile(path.join(old,'keep.txt'),'preserve old release');
 await fs.mkdir(path.dirname(h.descriptor),{recursive:true});const descriptor='{"name":"whatif-local","plugins":[{"name":"whatif","source":{"source":"local","path":"./plugins/whatif-1.0.0"}}]}\n';const receipt='{"version":"1.0.0","keep":"old receipt"}\n';
 await fs.writeFile(h.descriptor,descriptor);await fs.writeFile(h.receipt,receipt);return {old,descriptor,receipt};
}
test('installer ships its advertised tests and retries an identical release',async t=>{const h=await setup(t);if(!h)return;const first=await h.run();assert.equal(first.version,'9.1.0');assert.equal(first.reusedStage,false);assert.equal(await fs.readFile(path.join(first.installed.installedPath,'HANDOVER.md'),'utf8'),'HANDOVER.md');assert.equal(await fs.readFile(path.join(first.installed.installedPath,'test/marker.txt'),'utf8'),'test');const testEnv={...process.env};delete testEnv.NODE_TEST_CONTEXT;const testRun=await exec(process.execPath,['--test','--test-reporter=tap','test/payload.test.mjs'],{cwd:first.installed.installedPath,env:testEnv});assert.match(testRun.stdout,/# pass 1/);const again=await h.run();assert.equal(again.reusedStage,true);assert.equal(again.version,'9.1.0');});
test('missing Codex binary preserves retryable stage without a false receipt',async t=>{const h=await setup(t);if(!h)return;await assert.rejects(h.run(path.join(h.base,'missing-codex')),/ENOENT/);await fs.access(h.stage);await assert.rejects(fs.access(h.descriptor));await assert.rejects(fs.access(h.receipt));const result=await h.run();assert.equal(result.reusedStage,true);assert.equal(result.version,'9.1.0');});
test('transient add failure rolls back descriptor and preserves old receipt/release, then retries',async t=>{const h=await setup(t);if(!h)return;const old=await prior(h);await h.set({failAdd:true});await assert.rejects(h.run(),/synthetic plugin failure/);assert.equal(await fs.readFile(h.descriptor,'utf8'),old.descriptor);assert.equal(await fs.readFile(h.receipt,'utf8'),old.receipt);assert.equal(await fs.readFile(path.join(old.old,'keep.txt'),'utf8'),'preserve old release');assert.equal(await fs.readFile(h.descriptor+'.before-9.1.0','utf8'),old.descriptor);await h.set({});const result=await h.run();assert.equal(result.reusedStage,true);assert.equal(JSON.parse(await fs.readFile(h.receipt)).version,'9.1.0');assert.equal(await fs.readFile(path.join(old.old,'keep.txt'),'utf8'),'preserve old release');assert.equal(await fs.readFile(h.descriptor+'.before-9.1.0','utf8'),old.descriptor);});
test('marketplace registration failure also restores exact previous descriptor',async t=>{const h=await setup(t);if(!h)return;const old=await prior(h);await h.set({failMarketplace:true});await assert.rejects(h.run(),/synthetic marketplace failure/);assert.equal(await fs.readFile(h.descriptor,'utf8'),old.descriptor);assert.equal(await fs.readFile(h.receipt,'utf8'),old.receipt);await h.set({});assert.equal((await h.run()).reusedStage,true);});
test('installed-version mismatch cannot replace the previous successful receipt',async t=>{const h=await setup(t);if(!h)return;const old=await prior(h);await h.set({wrongVersion:true});await assert.rejects(h.run(),/Installed version mismatch/);assert.equal(await fs.readFile(h.descriptor,'utf8'),old.descriptor);assert.equal(await fs.readFile(h.receipt,'utf8'),old.receipt);await h.set({});assert.equal((await h.run()).version,'9.1.0');});
test('same-version modified staging is preserved and rejected before registration',async t=>{const h=await setup(t);if(!h)return;await h.run();const descriptor=await fs.readFile(h.descriptor,'utf8'),receipt=await fs.readFile(h.receipt,'utf8'),calls=await fs.readFile(path.join(h.home,'calls.jsonl'),'utf8');await fs.writeFile(path.join(h.stage,'src/marker.txt'),'local changed payload');await assert.rejects(h.run(),/Existing staged release differs/);assert.equal(await fs.readFile(h.descriptor,'utf8'),descriptor);assert.equal(await fs.readFile(h.receipt,'utf8'),receipt);assert.equal(await fs.readFile(path.join(h.home,'calls.jsonl'),'utf8'),calls);assert.equal(await fs.readFile(path.join(h.stage,'src/marker.txt'),'utf8'),'local changed payload');});
test('inconsistent release versions fail before selecting the new marketplace payload',async t=>{const h=await setup(t);if(!h)return;const old=await prior(h);const p=JSON.parse(await fs.readFile(path.join(h.source,'package.json')));p.version='9.2.0';await fs.writeFile(path.join(h.source,'package.json'),JSON.stringify(p));await assert.rejects(h.run(),/Release manifest version mismatch/);assert.equal(await fs.readFile(h.descriptor,'utf8'),old.descriptor);assert.equal(await fs.readFile(h.receipt,'utf8'),old.receipt);await assert.rejects(fs.access(path.join(h.home,'calls.jsonl')));});

test('release candidate installs and identical retry preserves older releases',async t=>{const h=await setup(t,'3.1.0-rc.1');if(!h)return;const old=await prior(h);const result=await h.run();assert.equal(result.version,'3.1.0-rc.1');assert.match(result.stagedSource,/whatif-3\.1\.0-rc\.1$/);assert.equal((await h.run()).reusedStage,true);assert.equal(await fs.readFile(path.join(old.old,'keep.txt'),'utf8'),'preserve old release');});
test('installer rejects unsafe or malformed release identifiers before registering',async t=>{for(const version of ['3.1.0-rc.01','03.1.0','3.1.0-rc.1/escape','3.1.0-rc.1+local','3.1.0-beta.1']){const h=await setup(t,version);if(!h)return;await assert.rejects(h.run(),/Invalid release version/);await assert.rejects(fs.access(path.join(h.home,'calls.jsonl')));}});
