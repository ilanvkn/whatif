import fs from 'node:fs/promises';
import path from 'node:path';
import {cleanEnv} from './process.mjs';
import {pathToFileURL} from 'node:url';
export async function browserJourney({target,config:c},runtime,dir){
 const {chromium}=await import(pathToFileURL(runtime.playwrightModule).href);
 const server=await chromium.launchServer({headless:true,env:cleanEnv(),channel:runtime.browserChannel||undefined,args:['--disable-background-networking','--disable-quic']});
 const processFile=path.join(dir,'browser-process.json');
 await fs.writeFile(processFile,JSON.stringify({pid:server.process().pid,closed:false}));
 let browser;
 try{browser=await chromium.connect(server.wsEndpoint());}catch(e){await server.close();throw e;}
 const origin=new URL(target).origin,steps=[],network={mirrored:0,issued:0,blocked:0,intercepted:0,attempted:0,limitHits:0,attemptedByRoute:{}},failures=[];
 try{
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false,viewport:c.viewport,locale:c.locale,timezoneId:c.timezoneId,reducedMotion:c.reducedMotion,storageState:c.storage===undefined?undefined:{cookies:[],origins:[{origin,localStorage:Object.entries(c.storage).map(([name,value])=>({name,value}))}]}});
 // Fixed controller-owned fault, never source supplied by a manifest or model.
 if(c.storageFault==='quota-exceeded')await context.addInitScript(origin=>{if(location.origin===origin)Object.defineProperty(Storage.prototype,'setItem',{value(){throw new DOMException('WhatIF synthetic quota','QuotaExceededError');},configurable:true});},origin);
 await context.routeWebSocket('**/*',ws=>{network.blocked++;ws.close();});
 await context.route('**/*',async route=>{
 const req=route.request();let u;try{u=new URL(req.url());}catch{network.blocked++;return route.abort();}
 network.attempted++;
 const mirror=req.method()==='GET'?(c.localMirrors||[]).find(m=>m.url===req.url()):undefined;
 const fetchURL=mirror?new URL(mirror.path,target).href:undefined;if(mirror)u=new URL(fetchURL);
 const reviewed=c.allowRequests.some(a=>a.method===req.method()&&a.path===u.pathname);
 if(reviewed&&u.origin===origin){const key=req.method()+' '+u.pathname;network.attemptedByRoute[key]=(network.attemptedByRoute[key]||0)+1;}
 if(network.attempted>c.maxRequests){network.blocked++;network.limitHits++;return route.abort();}
 if(u.origin!==origin||!c.allowRequests.some(a=>a.method===req.method()&&a.path===u.pathname)||network.issued>=c.maxRequests){network.blocked++;return route.abort();}
 const i=c.intervention;
 if(i&&u.pathname===i.path){network.intercepted++;if(i.type==='abort')return route.abort('failed');if(i.type==='status')return route.fulfill({status:i.status,contentType:'application/json',body:'{"error":"WhatIF synthetic dependency failure"}'});await new Promise(r=>setTimeout(r,i.delayMs));}
 // Reserve before awaiting to keep the cap exact under parallel requests.
 if(network.issued>=c.maxRequests){network.blocked++;return route.abort();}network.issued++;
 try{
 if(mirror)network.mirrored++;
 const response=await route.fetch({...((mirror)?{url:fetchURL}:{}),maxRedirects:0,maxRetries:0,timeout:c.timeoutMs});
 try{if(response.status()>=300&&response.status()<400){network.blocked++;return await route.abort();}await route.fulfill({response});}finally{await response.dispose();}
 }catch{failures.push({classification:'observed-network-failure',reason:'Reviewed request failed; sensitive response omitted.'});await route.abort().catch(()=>{});}
 });
 const page=await context.newPage();page.setDefaultTimeout(c.timeoutMs);page.setDefaultNavigationTimeout(c.timeoutMs);
 page.on('dialog',d=>d.dismiss().catch(()=>{}));
 for(const [index,s]of c.steps.entries()){
 const started=performance.now();let passed=true;
 try{
 if(s.action==='goto')await page.goto(new URL(s.path,target).href,{waitUntil:'domcontentloaded'});
 if(s.action==='reload')await page.reload({waitUntil:'domcontentloaded'});
 if(s.action==='dblclick')await page.locator(s.selector).dblclick();
 if(s.action==='press')await page.locator(s.selector).press(s.key);
 if(s.action==='click')await page.locator(s.selector).click();
 if(s.action==='fill'){const value=s.valueEnv?process.env[s.valueEnv]:s.value;if(value===undefined)throw Error('Missing fixture value');await page.locator(s.selector).fill(value);}
 if(s.action==='visible')await page.locator(s.selector).waitFor({state:'visible'});
 if(['text','count','value','attribute'].includes(s.action)){
 const limit=performance.now()+c.timeoutMs;let matched=false;
 while(performance.now()<limit){const locator=page.locator(s.selector),options={timeout:Math.max(1,limit-performance.now())};const actual=s.action==='count'?await locator.count():s.action==='value'?await locator.inputValue(options):s.action==='attribute'?await locator.getAttribute(s.name,options):await locator.textContent(options);if(actual===s.expected){matched=true;break;}await new Promise(r=>setTimeout(r,25));}
 if(!matched)throw Error('Journey invariant failed');
 }
 }catch{passed=false;failures.push({step:index+1,classification:'observed-journey-failure',reason:'Action or assertion failed; DOM and values omitted.'});}
 steps.push({step:index+1,action:s.action,passed,durationMs:performance.now()-started});if(!passed)break;
 }
 let storageFaultInjected=false;
 if(c.storageFault==='quota-exceeded'){
 // Inspect the installed descriptor without writing storage. This fixed probe also
 // checks the actual exception; a declared fault alone is not proof it ran.
 try{storageFaultInjected=await page.evaluate(origin=>{if(location.origin!==origin)return false;const descriptor=Object.getOwnPropertyDescriptor(Storage.prototype,'setItem');if(!descriptor||!descriptor.value?.toString().includes('WhatIF synthetic quota'))return false;try{descriptor.value.call(localStorage,'__whatif_quota_probe__','');return false;}catch(e){return e.name==='QuotaExceededError'&&e.message==='WhatIF synthetic quota';}},origin);}catch{}
 }
 const interventionExercised=!c.intervention||network.intercepted>0;
 return {engine:'browser',version:browser.version(),passed:steps.length===c.steps.length&&steps.every(s=>s.passed)&&failures.length===0&&network.blocked===0&&interventionExercised&&(!c.storageFault||storageFaultInjected),steps,network,failures,interventionExercised,scenarioFault:c.storageFault??null,storageFaultInjected,requests:network.issued,limitations:['Fresh isolated browser; no production session reused.','Screenshots, DOM, response bodies, form values and tokens are not retained.','Only reviewed same-origin requests allowed; redirects, service workers and WebSockets blocked. Responses are buffered; streaming is not qualified.','Quota fault injection overrides same-origin Storage.setItem in the disposable browser; it does not exhaust actual disk capacity.', 'Local mirrors are reviewed offline deployment substitutions; live CDN behavior is not tested.', 'Injected failures are browser-local and do not prove server recovery.']};
 }finally{await browser.close();await server.close();await fs.writeFile(processFile,JSON.stringify({pid:server.process().pid,closed:true}));}
}
