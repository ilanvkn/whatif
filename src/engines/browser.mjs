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
 const origin=new URL(target).origin,steps=[],network={issued:0,blocked:0,intercepted:0},failures=[];
 try{
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false,viewport:c.viewport,locale:c.locale,timezoneId:c.timezoneId,reducedMotion:c.reducedMotion});
 await context.routeWebSocket('**/*',ws=>{network.blocked++;ws.close();});
 await context.route('**/*',async route=>{
 const req=route.request();let u;try{u=new URL(req.url());}catch{network.blocked++;return route.abort();}
 if(u.origin!==origin||!c.allowRequests.some(a=>a.method===req.method()&&a.path===u.pathname)||network.issued>=c.maxRequests){network.blocked++;return route.abort();}
 const i=c.intervention;
 if(i&&u.pathname===i.path){network.intercepted++;if(i.type==='abort')return route.abort('failed');if(i.type==='status')return route.fulfill({status:i.status,contentType:'application/json',body:'{"error":"WhatIF synthetic dependency failure"}'});await new Promise(r=>setTimeout(r,i.delayMs));}
 // Reserve before awaiting to keep the cap exact under parallel requests.
 if(network.issued>=c.maxRequests){network.blocked++;return route.abort();}network.issued++;
 try{
 const response=await route.fetch({maxRedirects:0,maxRetries:0,timeout:c.timeoutMs});
 try{if(response.status()>=300&&response.status()<400){network.blocked++;return await route.abort();}await route.fulfill({response});}finally{await response.dispose();}
 }catch{failures.push({classification:'observed-network-failure',reason:'Reviewed request failed; sensitive response omitted.'});await route.abort().catch(()=>{});}
 });
 const page=await context.newPage();page.setDefaultTimeout(c.timeoutMs);page.setDefaultNavigationTimeout(c.timeoutMs);
 page.on('dialog',d=>d.dismiss().catch(()=>{}));
 for(const [index,s]of c.steps.entries()){
 const started=performance.now();let passed=true;
 try{
 if(s.action==='goto')await page.goto(new URL(s.path,target).href,{waitUntil:'domcontentloaded'});
 if(s.action==='click')await page.locator(s.selector).click();
 if(s.action==='fill'){const value=s.valueEnv?process.env[s.valueEnv]:s.value;if(value===undefined)throw Error('Missing fixture value');await page.locator(s.selector).fill(value);}
 if(s.action==='visible')await page.locator(s.selector).waitFor({state:'visible'});
 if(s.action==='text'){
 const limit=performance.now()+c.timeoutMs;let matched=false;
 while(performance.now()<limit){const text=await page.locator(s.selector).textContent({timeout:Math.max(1,limit-performance.now())});if(text===s.expected){matched=true;break;}await new Promise(r=>setTimeout(r,25));}
 if(!matched)throw Error('Text invariant failed');
 }
 }catch{passed=false;failures.push({step:index+1,classification:'observed-journey-failure',reason:'Action or assertion failed; DOM and values omitted.'});}
 steps.push({step:index+1,action:s.action,passed,durationMs:performance.now()-started});if(!passed)break;
 }
 const interventionExercised=!c.intervention||network.intercepted>0;
 return {engine:'browser',version:browser.version(),passed:steps.length===c.steps.length&&steps.every(s=>s.passed)&&failures.length===0&&network.blocked===0&&interventionExercised,steps,network,failures,interventionExercised,requests:network.issued,limitations:['Fresh isolated browser; no production session reused.','Screenshots, DOM, response bodies, form values and tokens are not retained.','Only reviewed same-origin requests allowed; redirects, service workers and WebSockets blocked. Responses are buffered; streaming is not qualified.','Injected failures are browser-local and do not prove server recovery.']};
 }finally{await browser.close();await server.close();await fs.writeFile(processFile,JSON.stringify({pid:server.process().pid,closed:true}));}
}
