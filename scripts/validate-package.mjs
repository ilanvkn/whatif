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
console.log(JSON.stringify({validated:true,version:pkg.version,scope:'manifests, entrypoint frontmatter and linked references'}));
