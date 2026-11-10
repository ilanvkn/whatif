import {must,integer} from '../engines/contracts.mjs';
const string={type:'string',maxLength:4000};
export const roleSchemas={
 red:{type:'object',additionalProperties:false,required:['summary','selections'],properties:{summary:string,selections:{type:'array',minItems:1,maxItems:3,items:{type:'object',additionalProperties:false,required:['candidateId','reason'],properties:{candidateId:{type:'string',pattern:'^c-[a-f0-9]{16}$'},reason:string}}}}},
 critic:{type:'object',additionalProperties:false,required:['verdict','reasoning','evidenceIds'],properties:{verdict:{type:'string',enum:['accept','reject','inconclusive']},reasoning:string,evidenceIds:{type:'array',maxItems:20,items:{type:'string',maxLength:200}}}},
 blue:{type:'object',additionalProperties:false,required:['summary','patches'],properties:{summary:string,patches:{type:'array',minItems:1,maxItems:5,items:{type:'object',additionalProperties:false,required:['path','baseSha256','content'],properties:{path:{type:'string',maxLength:200},baseSha256:{type:'string',pattern:'^[a-f0-9]{64}$'},content:{type:'string',minLength:1,maxLength:16384}}}}}}
};
export function relativeFile(p){must(typeof p==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,199}$/.test(p)&&!p.split('/').some(s=>s==='..'||s==='.'||s==='')&&!p.startsWith('.'),'Invalid reviewed relative file');return p;}
export function validateTeam(spec){
 must(spec?.schemaVersion===3,'Unsupported team schema');must(typeof spec.question==='string'&&spec.question.length>0,'Question required');must(spec.app&&typeof spec.app.source==='string','App source required');
 must(Array.isArray(spec.app.files)&&spec.app.files.length>0&&spec.app.files.length<=20,'1..20 reviewed files required');must(Array.isArray(spec.app.editable)&&spec.app.editable.length>0&&spec.app.editable.length<=5,'Editable allowlist required');
 for(const f of spec.app.files)relativeFile(f);must(new Set(spec.app.files).size===spec.app.files.length,'Duplicate source file');relativeFile(spec.app.entry);must(spec.app.files.includes(spec.app.entry),'Entry must be reviewed');for(const f of spec.app.editable)must(spec.app.files.includes(f)&&f!==spec.app.entry,'Editable file must be reviewed and cannot be app host');
 must(spec.app.repeatSafe===true,'Disposable repeat-safe app required');must(spec.runner==='macos-node','Only qualified macos-node automatic patch runner is supported');
 const b=spec.budget;must(b,'Team budgets required');for(const [k,min,max]of [['maxEpochs',1,5],['maxCalls',1,20],['maxDurationMs',1000,1200000],['callTimeoutMs',1000,180000],['maxInputChars',1000,100000],['maxOutputBytes',4096,262144],['maxRequests',1,10000],['maxReportedTokens',1,1000000]])integer(b[k],min,max,k);return spec;
}
