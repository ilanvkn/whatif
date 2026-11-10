import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanupSteps} from '../src/agents/backend.mjs';

test('worker cleanup failure still stops remaining workers and HTTP, preserving first error',async()=>{
 const stopped=[],first=Error('first worker runtime verification failed');
 const workers=[async()=>{stopped.push('worker-1');throw first;},async()=>{stopped.push('worker-2');throw Error('second worker failed');}];
 await assert.rejects(cleanupSteps([()=>cleanupSteps(workers),async()=>{stopped.push('http');throw Error('HTTP receipt failed');}]),error=>error===first);
 assert.deepEqual(stopped,['worker-1','worker-2','http']);
});

test('team cleanup continues rollback and database removal after stop error and always releases handlers',async()=>{
 const attempted=[],first=Error('live stop runtime changed');let handlersRemoved=false;
 await assert.rejects((async()=>{try{await cleanupSteps([
  async()=>{attempted.push('live-stop');throw first;},
  async()=>{await cleanupSteps([async()=>{attempted.push('rollback-a');throw Error('write failed');},async()=>{attempted.push('rollback-b');}]);},
  async()=>{attempted.push('database-cleanup');}
 ]);}finally{handlersRemoved=true;}})(),error=>error===first);
 assert.deepEqual(attempted,['live-stop','rollback-a','rollback-b','database-cleanup']);assert.equal(handlersRemoved,true);
});
