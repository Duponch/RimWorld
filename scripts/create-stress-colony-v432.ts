/** Explicitly authored performance reference. No overwrite or automatic publication.
 * node --experimental-transform-types scripts/create-stress-colony-v432.ts --source PATH --output NEW_DIRECTORY --ticks 120
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {prepareStressLayout432} from './stress-colony-layout-v432.ts';
import {stressSummary432,createStressObservation432,observeStress432,type StressObservation432} from './stress-colony-observation-v432.ts';
const args=process.argv.slice(2),option=(name:string)=>{const at=args.indexOf(name);return at<0?undefined:args[at+1];};
const source=option('--source'),output=option('--output'),ticks=Number(option('--ticks')??120);
assert.ok(source&&output,'--source and fresh --output are required');assert.ok(Number.isSafeInteger(ticks)&&ticks>=0&&ticks<=1200);
const out=resolve(output);assert.ok(!existsSync(out),'Preserve every previous attempt');mkdirSync(out,{recursive:true});
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),input=readFileSync(source,'utf8'),inputHash=hash(input);
assert.equal(inputHash,'748409f4b5ceba787fd59db233c2580433895cd530a077ac3fa9a1d885392df0','Use the preserved original final-generator creation35, not an existing played save');
const start=performance.now();let lastTick=35;
try{
 let w=deserializeWorld(input);const receipt=prepareStressLayout432(w);
 const errors=validateWorld(w);writeFileSync(join(out,'validation.json'),JSON.stringify(errors,null,2));assert.deepEqual(errors,[]);
 const prepared=serializeWorld(w);assert.equal(serializeWorld(deserializeWorld(prepared)),prepared);writeFileSync(join(out,'prepared.json'),prepared);writeFileSync(join(out,'preparation-receipt.json'),JSON.stringify(receipt,null,2));
 const initial=stressSummary432(w);let observation=createStressObservation432();
 const resume=option('--resume'),observed=option('--observation'),priorPrepared=option('--prepared');
 if(resume){assert.ok(observed&&priorPrepared,'Resume requires the acquired observation and prepared RAW');assert.equal(readFileSync(priorPrepared,'utf8'),prepared,'The same deterministic authored heritage must be retained');w=deserializeWorld(readFileSync(resume,'utf8'));observation=JSON.parse(readFileSync(observed,'utf8')) as StressObservation432;assert.equal(observation.lastTick,w.tick);}
 else observeStress432(w,observation);
 const startTick=w.tick,stepTimes:number[]=[];
 for(let i=0;i<ticks;i++){const at=performance.now();stepWorld(w);stepTimes.push(performance.now()-at);lastTick=w.tick;observeStress432(w,observation);if((i+1)%30===0){console.log(JSON.stringify({tick:w.tick,ticksDone:i+1,wallMS:performance.now()-start}));assert.deepEqual(validateWorld(w),[]);writeFileSync(join(out,'checkpoint.json'),serializeWorld(w));writeFileSync(join(out,'observation.json'),JSON.stringify(observation,null,2));}}
 assert.deepEqual(validateWorld(w),[]);const raw=serializeWorld(w);assert.equal(serializeWorld(deserializeWorld(raw)),raw);writeFileSync(join(out,'les-forges-crash-test.json'),raw);
 const final=stressSummary432(w),b=deserializeWorld(raw);stepWorld(w,12);stepWorld(b,12);assert.deepEqual(validateWorld(w),[]);assert.deepEqual(validateWorld(b),[]);assert.equal(serializeWorld(w),serializeWorld(b));
 assert.equal(hash(readFileSync(source,'utf8')),inputHash);
 const report={status:'PASS',input:{path:resolve(source),sha256:inputHash},resume:resume?{path:resolve(resume),sha256:hash(readFileSync(resume,'utf8')),startTick}:null,receipt,initial,final,ticks,observation,stepTimes,output:{path:join(out,'les-forges-crash-test.json'),sha256:hash(raw),bytes:Buffer.byteLength(raw)},roundTripExact:true,continuation12Exact:true,wallMS:performance.now()-start};
 writeFileSync(join(out,'generation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,output:report.output,summary:report.final,wallMS:report.wallMS}));
}catch(error){writeFileSync(join(out,'failure.json'),JSON.stringify({status:'FAILED',lastTick,error:String(error),stack:error instanceof Error?error.stack:null,wallMS:performance.now()-start},null,2));throw error;}
