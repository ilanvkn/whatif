import {validateAPI} from './api.mjs';
import {targetURL} from '../core.mjs';
export const must=(v,m)=>{if(!v)throw Error(m);};
export function integer(v,min,max,name){must(Number.isInteger(v)&&v>=min&&v<=max,`${name} must be ${min}..${max}`);}
export function routePath(p){must(typeof p==='string'&&p.length<=2048&&/^\/(?!\/)/.test(p)&&!/[?#\\\r\n]/.test(p),'Origin-relative path required, without query or fragment');must(new URL(p,'http://127.0.0.1').pathname===p,'Route path must be normalized');return p;}
export function envName(v){must(typeof v==='string'&&/^WHATIF_[A-Z0-9_]{1,80}$/.test(v),'Secret references must be WHATIF_* environment names');return v;}
export function validateCampaign(p){
 must(p?.schemaVersion===1,'Unsupported campaign schema');const target=targetURL(p.target);must(target.protocol==='https:'||['127.0.0.1','[::1]'].includes(target.hostname),'Remote campaigns require HTTPS');must(typeof p.question==='string'&&p.question.length>0&&p.question.length<=10000,'Question required');
 integer(p.budget?.maxRequests,1,10000,'campaign request budget');integer(p.budget?.maxDurationMs,1000,300000,'campaign duration');
 must(Array.isArray(p.branches)&&p.branches.length>0&&p.branches.length<=10,'1..10 branches required');
 const ids=new Set();let total=0;
 for(const b of p.branches){
 must(/^[a-z][a-z0-9-]{0,39}$/.test(b.id)&&!ids.has(b.id),'Invalid or duplicate branch ID');if(b.parentId!==undefined)must(ids.has(b.parentId),'Parent must name an earlier branch');ids.add(b.id);
 must(typeof b.hypothesis==='string'&&b.hypothesis.length>0&&b.hypothesis.length<=2000,'Branch hypothesis required');
 must(['browser','k6','security','api'].includes(b.engine),'Unknown engine');const c=b.config;must(c&&typeof c==='object','Engine config required');
 integer(c.maxRequests,1,10000,'branch request budget');integer(c.timeoutMs,100,10000,'request/step timeout');total+=c.maxRequests;
 if(b.engine==='api'){validateAPI(c);
 }else if(b.engine==='browser'){
 if(c.storageFault!==undefined)must(c.storageFault==='quota-exceeded','Unsupported storage fault');
 if(c.storage!==undefined){must(c.storage!==null&&typeof c.storage==='object'&&!Array.isArray(c.storage)&&[Object.prototype,null].includes(Object.getPrototypeOf(c.storage)),'Storage must be a synthetic key/value object');must(Object.keys(c.storage).length<=20,'At most 20 storage entries');for(const [key,value]of Object.entries(c.storage)){must(key.length>0&&key.length<=128,'Storage key must be 1..128 characters');must(typeof value==='string'&&value.length<=4096,'Storage value must be a string of at most 4096 characters');}}
 if(c.viewport){integer(c.viewport.width,320,3840,'viewport width');integer(c.viewport.height,320,2160,'viewport height');}
 if(c.locale)must(typeof c.locale==='string'&&c.locale.length<=40,'Invalid locale');
 if(c.timezoneId)must(typeof c.timezoneId==='string'&&c.timezoneId.length<=80,'Invalid timezone');
 if(c.reducedMotion)must(['reduce','no-preference'].includes(c.reducedMotion),'Invalid motion preference');
 must(Array.isArray(c.allowRequests)&&c.allowRequests.length>0&&c.allowRequests.length<=100,'Browser request allowlist required');
 for(const r of c.allowRequests){routePath(r.path);must(['GET','POST','PUT','PATCH','DELETE'].includes(r.method),'Invalid browser method');}
 if(c.localMirrors!==undefined){must(Array.isArray(c.localMirrors)&&c.localMirrors.length<=10,'At most 10 local mirrors');const urls=new Set();for(const mirror of c.localMirrors){must(mirror&&typeof mirror==='object'&&typeof mirror.url==='string'&&mirror.url.length<=2048,'Mirror URL required');let url;try{url=new URL(mirror.url);}catch{throw Error('Invalid mirror URL');}must(url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&url.href===mirror.url,'Mirror requires exact normalized HTTPS URL without credentials or fragment');must(url.origin!==target.origin,'Mirror URL must be external');must(!urls.has(mirror.url),'Duplicate mirror URL');urls.add(mirror.url);routePath(mirror.path);must(c.allowRequests.some(r=>r.method==='GET'&&r.path===mirror.path),'Mirror must name a reviewed local GET path');}}
 must(Array.isArray(c.steps)&&c.steps.length>0&&c.steps.length<=100,'1..100 browser steps required');
 let assertions=0;
 for(const step of c.steps){must(['goto','click','dblclick','press','reload','fill','text','visible','count','value','attribute'].includes(step.action),'Unsupported browser step');
 if(step.action==='goto')routePath(step.path);else if(step.action!=='reload')must(typeof step.selector==='string'&&step.selector.length>0&&step.selector.length<=1000,'Selector required');
 if(step.action==='press')must(['Enter','Escape','Tab','Backspace','ControlOrMeta+A','Control+i'].includes(step.key),'Unsupported browser key');
 if(step.action==='count'){integer(step.expected,0,10000,'Expected element count');assertions++;}
 if(step.action==='value'){must(typeof step.expected==='string'&&step.expected.length<=4096,'Expected input value required');assertions++;}
 if(step.action==='attribute'){must(typeof step.name==='string'&&/^[A-Za-z_:][A-Za-z0-9_.:-]{0,127}$/.test(step.name),'Valid attribute name required');must(step.expected===null||typeof step.expected==='string'&&step.expected.length<=4096,'Expected attribute string or null required');assertions++;}
 if(step.action==='fill'){must((typeof step.value==='string')!==(typeof step.valueEnv==='string'),'Fill requires value OR valueEnv');if(step.valueEnv)envName(step.valueEnv);}
 if(step.action==='text'){must(typeof step.expected==='string'&&step.expected.length<=2000,'Expected text required');assertions++;}if(step.action==='visible')assertions++;
 }must(assertions>0,'Browser journey requires an assertion');
 if(c.intervention){const i=c.intervention;routePath(i.path);must(['abort','status','delay'].includes(i.type),'Invalid browser intervention');must(c.allowRequests.some(r=>r.path===i.path),'Intervention must match a reviewed path');if(i.type==='status')integer(i.status,400,599,'injected failure status');if(i.type==='delay')integer(i.delayMs,1,10000,'injected delay');}
 }else if(b.engine==='k6'){
 integer(c.vus,1,100,'virtual users');integer(c.durationMs,1000,120000,'load duration');integer(c.paceMs,0,10000,'per-VU pacing');
 must(c.vus<=c.maxRequests,'VUs exceed request budget');must(Array.isArray(c.endpoints)&&c.endpoints.length>0&&c.endpoints.length<=20,'Load endpoints required');
 must(c.maxRequests>=c.endpoints.length,'Budget must cover all load endpoints');for(const e of c.endpoints){routePath(e.path);statuses(e.expectedStatuses);}
 must(Number.isFinite(c.p95Ms)&&c.p95Ms>0,'Positive latency threshold required');must(Number.isFinite(c.maxErrorRate)&&c.maxErrorRate>=0&&c.maxErrorRate<=1,'Error threshold invalid');
 }else{
 must(Array.isArray(c.checks)&&c.checks.length>0&&c.checks.length<=30,'Security checks required');let requests=0;
 for(const check of c.checks){routePath(check.path);must(['anonymous-denial','object-isolation'].includes(check.type),'Unsupported security check');
 if(check.type==='object-isolation'){envName(check.ownerTokenEnv);envName(check.otherTokenEnv);must(check.ownerTokenEnv!==check.otherTokenEnv,'Two distinct identity references required');must(typeof check.ownerMarker==='string'&&check.ownerMarker.length>0&&check.ownerMarker.length<=200,'Synthetic owner marker required');requests+=3;}else requests++;}
 must(requests<=c.maxRequests,'Security checks exceed request budget');
 }
 }
 must(total<=p.budget.maxRequests,'Branches exceed campaign request budget');return p;
}
function statuses(v){must(Array.isArray(v)&&v.length>0&&v.every(n=>Number.isInteger(n)&&n>=100&&n<=599),'Expected statuses required');}
export function secretNames(p){return [...new Set(p.branches.flatMap(b=>b.engine==='browser'?b.config.steps.map(s=>s.valueEnv).filter(Boolean):b.engine==='security'?b.config.checks.flatMap(c=>[c.ownerTokenEnv,c.otherTokenEnv]).filter(Boolean):[]))];}
