import {createHash} from 'node:crypto';
import {validateTeam} from '../src/agents/contracts.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
for(const f of ['.codex-plugin/plugin.json','.claude-plugin/plugin.json']){const p=JSON.parse(fs.readFileSync(path.join(root,f)));assert.equal(p.name,'whatif');assert.equal(p.version,pkg.version);}
const mcp=JSON.parse(fs.readFileSync(path.join(root,'.mcp.json')));assert.ok(mcp.mcpServers.whatif.args[0].endsWith('/src/mcp.mjs'));
const skill=fs.readFileSync(path.join(root,'skills/whatif/SKILL.md'),'utf8');assert.match(skill,/^---\nname: whatif\ndescription: .+\n---/);assert.ok(!/TODO|\[INSERT|PLACEHOLDER/.test(skill));
for(const m of skill.matchAll(/\]\((references\/[^)]+)\)/g))assert.ok(fs.existsSync(path.join(root,'skills/whatif',m[1])));
for(const name of ['todomvc','markdown'])validateTeam(JSON.parse(fs.readFileSync(path.join(root,'examples/real-apps',name+'.json'),'utf8')));
for(const file of ['src/index.mjs','docs/V3-QUALIFICATION.md','examples/real-apps/patches/todomvc-durability.patch','examples/real-apps/patches/markdown-formatting.patch','examples/real-apps/patches/TODOMVC-LICENSE','examples/real-apps/patches/MARKDOWN-LICENSE'])assert.ok(fs.existsSync(path.join(root,file)),'Missing release artifact '+file);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const name of ['microblog','realworld']){
 const prefix=path.join(root,'examples/backends/recipes',name),recipe=JSON.parse(fs.readFileSync(path.join(prefix,'recipe.json'))),spec=JSON.parse(fs.readFileSync(path.join(root,'examples/backends',name+'.json')));
 validateTeam(spec);assert.equal(spec.runner,'python-sqlite');assert.equal(recipe.repository,spec.provenance.repository);assert.equal(recipe.commit,spec.provenance.commit);assert.equal(recipe.database,'SQLite');assert.match(recipe.commit,/^[a-f0-9]{40}$/);assert.deepEqual([...recipe.assets.map(a=>a.destination)].sort(),[...spec.app.assets].sort());assert.ok(recipe.assets.some(a=>a.origin==='upstream'&&/LICENSE/i.test(a.source)),'Upstream license must be retained');
 for(const [file,key]of [['requirements.lock','requirementsLockSha256'],['wheel-manifest.json','wheelManifestSha256']])assert.equal(hash(fs.readFileSync(path.join(prefix,file))),recipe[key],'Recipe hash mismatch: '+name+'/'+file);
 for(const asset of recipe.assets){assert.match(asset.sha256,/^[a-f0-9]{64}$/);if(asset.origin==='recipe'){assert.ok(!path.isAbsolute(asset.source)&&!asset.source.split('/').includes('..'));assert.equal(hash(fs.readFileSync(path.join(prefix,asset.source))),asset.sha256,'Bootstrap hash mismatch');}}
 const wheels=JSON.parse(fs.readFileSync(path.join(prefix,'wheel-manifest.json'))),lock=fs.readFileSync(path.join(prefix,'requirements.lock'),'utf8');assert.ok(wheels.length>0);for(const wheel of wheels){assert.match(wheel.sha256,/^[a-f0-9]{64}$/);assert.ok(wheel.wheel.endsWith('.whl'));assert.ok(lock.split('\n').includes(wheel.name+'=='+wheel.version+' --hash=sha256:'+wheel.sha256),'Dependency lock mismatch');}
 for(const suffix of ['.patch','-LICENSE.txt'])assert.ok(fs.statSync(path.join(root,'examples/backends/patches',name+suffix)).size>0,'Missing backend patch/license');
}
for(const file of ['examples/backends/README.md','scripts/prepare-backend.mjs','docs/BACKEND-RC-QUALIFICATION.md','docs/evidence/backend-rc-qualification.json','src/agents/backend.mjs','src/engines/api.mjs'])assert.ok(fs.statSync(path.join(root,file)).isFile(),'Missing backend release artifact '+file);
JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/backend-rc-qualification.json')));
console.log(JSON.stringify({validated:true,version:pkg.version,scope:'manifests, skills, static/backend recipes, pinned bootstrap/dependency hashes, patches, licenses and qualification artifacts'}));
