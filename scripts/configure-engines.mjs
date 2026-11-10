import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--playwright-module','--k6-binary','--browser-channel'].includes(args[i])||!args[i+1])throw Error('Use --playwright-module ABSOLUTE_INDEX_MJS --k6-binary ABSOLUTE_BINARY [--browser-channel chrome]');options[args[i]]=args[i+1];}
const file=path.join(os.homedir(),'.codex/whatif/engines.json');let config={};try{config=JSON.parse(await fs.readFile(file));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const [arg,key]of [['--playwright-module','playwrightModule'],['--k6-binary','k6Binary']])if(options[arg]){const p=options[arg];if(!path.isAbsolute(p)||(await fs.stat(p)).isFile()===false)throw Error('Existing absolute engine file required');config[key]=p;}
if(options['--browser-channel']){if(!['chrome','chromium'].includes(options['--browser-channel']))throw Error('Use chrome or chromium');config.browserChannel=options['--browser-channel']==='chromium'?undefined:'chrome';}
await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.copyFile(file,file+'.backup-'+Date.now(),fs.constants.COPYFILE_EXCL);}catch(e){if(e.code!=='ENOENT')throw e;}await fs.writeFile(file,JSON.stringify(config,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({configured:true,file,note:'Local engine paths only; no downloads or engine execution performed.'}));
