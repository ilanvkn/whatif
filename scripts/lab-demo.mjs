import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {startFixture,fixtureCampaign} from './integration-fixture.mjs';
import {planLab,inspectLab,runLab,replayLab,compareLabs} from '../src/lab/lab.mjs';
import {json} from '../src/core.mjs';
const f=await startFixture(),root=path.resolve('runs/lab-'+Date.now());process.env.WHATIF_OWNER_TOKEN='synthetic-alice';process.env.WHATIF_OTHER_TOKEN='synthetic-bob';await fs.mkdir(root,{recursive:true});
try{
 const campaign=path.join(root,'campaign');await fs.mkdir(campaign);await fs.writeFile(path.join(campaign,'campaign.json'),json(fixtureCampaign(f.target)));
 const before=path.join(root,'before');await planLab({campaignDirectory:campaign,out:before});const lab=JSON.parse(await fs.readFile(path.join(before,'lab.json')));lab.fixture={repeatSafe:true,appRevision:'synthetic-vulnerable',resetStrategy:'Owned in-memory app; fake payments and synthetic records, no external side effects.'};lab.limits={...lab.limits,maxEpochs:3,trialsPerEpoch:3,maxTrials:9,maxDurationMs:300000,trialDurationMs:60000};await fs.writeFile(path.join(before,'lab.json'),json(lab));
 const space=await inspectLab(before),initial=await runLab(before,{ackTarget:f.target});
 const after=path.join(root,'after');await replayLab({labDirectory:before,out:after});const replay=JSON.parse(await fs.readFile(path.join(after,'lab.json')));replay.fixture={...lab.fixture,appRevision:'synthetic-corrected'};await fs.writeFile(path.join(after,'lab.json'),json(replay));f.fix();const corrected=await runLab(after,{ackTarget:f.target});const comparison=await compareLabs(before,after);
 const verify=JSON.parse(execFileSync(process.execPath,['src/cli.mjs','lab-verify','--lab',after],{encoding:'utf8'}));const result={root,generatedCandidates:space.space.candidates.length,initial,corrected,comparison,verify,fixtureCounts:f.counts};await fs.writeFile(path.join(root,'qualification.json'),json(result));console.log(json(result));if(initial.reproducedFailures<2||corrected.observedFailures||comparison.recovered<2||!verify.verified)process.exitCode=1;
}finally{await f.close();}
