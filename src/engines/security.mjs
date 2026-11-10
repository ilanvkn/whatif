import http from 'node:http';
import https from 'node:https';
function request(url,token,timeoutMs){return new Promise(resolve=>{
 let done=false;const finish=r=>{if(done)return;done=true;clearTimeout(timer);resolve(r);};
 const req=(url.protocol==='https:'?https:http).request(url,{method:'GET',agent:false,headers:token?{authorization:'Bearer '+token}:{}},res=>{
 const chunks=[];let size=0;res.on('data',b=>{size+=b.length;if(size>65536){res.destroy();finish({status:res.statusCode,error:'body-limit',body:''});}else chunks.push(b);});res.on('end',()=>finish({status:res.statusCode,error:null,body:Buffer.concat(chunks).toString('utf8')}));res.on('error',()=>finish({status:res.statusCode,error:'response-error',body:''}));
 });
 const timer=setTimeout(()=>{req.destroy();finish({status:null,error:'timeout',body:''});},timeoutMs);req.on('error',()=>finish({status:null,error:'connection-error',body:''}));req.end();
});}
export async function securityChecks({target,config:c}){
 const results=[];let requests=0;
 for(const [index,check]of c.checks.entries()){
 const url=new URL(check.path,target);
 const anon=await request(url,null,c.timeoutMs);requests++;
 const anonymousDenied=!anon.error&&[401,403,404].includes(anon.status)&&(!check.ownerMarker||!anon.body.includes(check.ownerMarker));
 if(check.type==='anonymous-denial'){results.push({check:index+1,type:check.type,path:check.path,passed:anonymousDenied,status:anon.status,classification:anonymousDenied?'observed-anonymous-denial':'observed-security-contract-failure'});continue;}
 const ownerToken=process.env[check.ownerTokenEnv],otherToken=process.env[check.otherTokenEnv];
 if(!ownerToken||!otherToken||ownerToken===otherToken)throw Error('Distinct synthetic identity tokens required');
 const owner=await request(url,ownerToken,c.timeoutMs),other=await request(url,otherToken,c.timeoutMs);requests+=2;
 const positiveControl=!owner.error&&owner.status===200&&owner.body.includes(check.ownerMarker);
 const crossDenied=!other.error&&[401,403,404].includes(other.status)&&!other.body.includes(check.ownerMarker);
 results.push({check:index+1,type:check.type,path:check.path,passed:positiveControl&&crossDenied&&anonymousDenied,positiveControl,anonymousDenied,crossDenied,ownerStatus:owner.status,otherStatus:other.status,classification:!positiveControl?'inconclusive-positive-control-failed':crossDenied&&anonymousDenied?'observed-object-isolation':'reproduced-security-contract-failure'});
 }
 return {engine:'security',version:'1.1.0',requests,passed:results.every(r=>r.passed),results,limitations:['GET-only synthetic identity checks; no injection fuzzing or state mutation.','No tokens or response bodies stored. A denial alone is not complete authorization proof.','Expected ownership and synthetic marker must be established by the fixture owner.']};
}
