import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {startFixture,fixtureCampaign} from './integration-fixture.mjs';
import {runCampaign,verifyCampaign,compareCampaigns} from '../src/campaign.mjs';
import {json} from '../src/core.mjs';
const app=await startFixture();process.env.WHATIF_OWNER_TOKEN='synthetic-alice';process.env.WHATIF_OTHER_TOKEN='synthetic-bob';
const root=path.resolve('runs/integrations-'+Date.now());await fs.mkdir(root,{recursive:true});
try{
 const evidence=[];
 for(const phase of ['before','after']){if(phase==='after')app.fix();const dir=path.join(root,phase);await fs.mkdir(dir);await fs.writeFile(path.join(dir,'campaign.json'),json(fixtureCampaign(app.target)));const summary=await runCampaign(dir,{ackTarget:app.target});const verification=await verifyCampaign(dir);evidence.push({phase,directory:dir,passed:summary.passed,results:summary.results,verification});}
 const before=evidence[0],after=evidence[1];
 const detected=before.results.find(r=>r.id==='payment-unavailable')?.passed===false&&before.results.find(r=>r.id==='account-isolation')?.passed===false;
 const fresh=JSON.parse(execFileSync(process.execPath,['src/cli.mjs','campaign-verify','--campaign',path.join(root,'after')],{encoding:'utf8'}));
 const comparison=await compareCampaigns(path.join(root,'before'),path.join(root,'after'));
 const result={comparison,root,evidence,fixtureCounts:app.counts,detectedKnownBugs:detected,correctionsPass:after.passed,freshVerification:fresh};await fs.writeFile(path.join(root,'qualification.json'),json(result));console.log(json(result));if(!detected||!after.passed)process.exitCode=1;
}finally{await app.close();}
