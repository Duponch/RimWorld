// Offline only. Reads one audit report and writes separate summaries beside it.
// node scripts/ui3d-cost-summary.mjs --report=tmp/ui3d-cost-audit/RUN/report.json [--drift-percent=10]
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';

const args=process.argv.slice(2);
for(const arg of args)if(!/^--(report|drift-percent)=/.test(arg))throw Error(`Unknown argument: ${arg}`);
const option=name=>args.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3);
if(!option('report'))throw Error('Supply --report=PATH/report.json');
const reportPath=resolve(option('report')),driftThresholdPercent=Number(option('drift-percent')??10);
if(!Number.isFinite(driftThresholdPercent)||driftThresholdPercent<0)throw Error('drift-percent must be finite and nonnegative.');
const source=await readFile(reportPath),report=JSON.parse(source.toString('utf8'));
if(report.protocol!=='ui3d-cost-audit-v477-wcw-1')throw Error(`Unsupported protocol: ${report.protocol}`);
if(JSON.stringify(report.order)!==JSON.stringify(['legacy','native','legacy']))throw Error('Expected legacy/native/legacy order.');
const finite=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const divide=(a,b)=>finite(a)!==null&&finite(b)!==null&&b>0?a/b:null;
const multiply=(a,b)=>finite(a)!==null&&finite(b)!==null?a*b:null;
const delta=(a,b)=>finite(a)!==null&&finite(b)!==null?a-b:null;
const groupOf=type=>{const t=String(type).toLowerCase();return t.includes('gpu')?'GPU':t.includes('renderer')?'renderer':t==='browser'?'browser':t.includes('utility')?'utility':'other';};
const midpointIntervalSeconds=bracket=>divide(delta((bracket?.after?.requested+bracket?.after?.received)/2,(bracket?.before?.requested+bracket?.before?.received)/2),1000);

function summarize(context,blockId){
 const block=context?.blocks?.find(item=>item.id===blockId),s=block?.summary;
 if(!s||block.status!=='acquired')return {context:context?.id??null,mode:context?.mode??null,status:block?.status??'missing',metrics:{},unavailable:'Block was not acquired.'};
 const elapsedSeconds=divide(s.elapsedMs,1000),metrics={};
 const frameCount=finite(block.boundary?.frames)??(finite(s.raf?.n)===null?null:s.raf.n+1);
 const simulatedSeconds=divide(s.deliveredTicks,report.ticksPerSecond);
 const put=(key,value,unit)=>{metrics[key]={value:finite(value),unit};};
 for(const clock of ['raf','wall']){
  for(const p of ['p50','p95','p99','max'])put(`${clock}.${p}`,s[clock]?.[p],'ms');
  for(const threshold of [16.7,33.4,50]){
   const count=s[`${clock}Cuts`]?.find(cut=>cut.thresholdMs===threshold)?.count;
   put(`${clock}.over${threshold}.per10s`,multiply(divide(count,elapsedSeconds),10),'intervals/10s');
  }
 }
 put('mainTask',multiply(divide(s.taskDurationSeconds,elapsedSeconds),1000),'ms/s active window');
 put('callbackFps',divide(frameCount,elapsedSeconds),'frame callbacks/s active window');
 put('mainTask.perFrame',multiply(divide(s.taskDurationSeconds,frameCount),1000),'ms/frame callback');
 put('mainTask.perSimulatedSecond',multiply(divide(s.taskDurationSeconds,simulatedSeconds),1000),'ms/s simulated');
 put('cdpThreadTime',multiply(s.threadTimeSeconds,1000),'ms CDP ThreadTime, unavailable when absent');
 put('cdpThreadTime.perFrame',multiply(divide(s.threadTimeSeconds,frameCount),1000),'ms/frame callback');
 put('cdpThreadTime.perSimulatedSecond',multiply(divide(s.threadTimeSeconds,simulatedSeconds),1000),'ms/s simulated');
 put('frameWall.mean',s.synchronousFrameWallMs?.mean,'ms');
 put('frameWall.p95',s.synchronousFrameWallMs?.p95,'ms');
 put('deliveredTicks',divide(s.deliveredTicks,elapsedSeconds),'ticks/s');
 put('shownTicks',divide(s.shownTicks,elapsedSeconds),'ticks/s');
 put('actualSpeed',s.actualSpeed,'x');
 put('targetFraction',s.targetFraction,'fraction');
 const cpu=block.processCpu?.summary,cpuSeconds=midpointIntervalSeconds(block.processCpu),incomplete=cpu?.incomplete!==false;
 put('privateProcessCpu',incomplete?null:multiply(cpu?.observedCpuSeconds,1000),'ms');
 put('privateProcessCpu.rate',incomplete?null:multiply(divide(cpu?.observedCpuSeconds,cpuSeconds),1000),'ms/s process bracket');
 put('privateProcessCpu.perFrame',incomplete?null:multiply(divide(cpu?.observedCpuSeconds,frameCount),1000),'ms/frame callback');
 put('privateProcessCpu.perSimulatedSecond',incomplete?null:multiply(divide(cpu?.observedCpuSeconds,simulatedSeconds),1000),'ms/s simulated');
 const groupDetails={};
 for(const name of ['browser','renderer','GPU','utility','other']){
  const group=cpu?.groups?.[name],affected=(cpu?.missing??[]).some(row=>groupOf(row.type)===name)||(cpu?.invalid??[]).some(row=>groupOf(row.type)===name);
  // An absent group is unavailable rather than an invented zero.
  const complete=!!group&&!affected&&cpu?.incomplete!==undefined;
  put(`processCpu.${name}`,complete?multiply(group.observedCpuSeconds,1000):null,'ms');
  put(`processCpu.${name}.rate`,complete?multiply(divide(group.observedCpuSeconds,cpuSeconds),1000):null,'ms/s process bracket');
  groupDetails[name]={complete,observedCpuSeconds:finite(group?.observedCpuSeconds),stablePidCpuSeconds:finite(group?.stablePidCpuSeconds),newPidLifetimeCpuSeconds:finite(group?.newPidLifetimeCpuSeconds),pids:group?.pids??[]};
 }
 const counter=block.nativeCounterBracket;
 put('cache.captures',divide(counter?.['cache.cacheRenders'],elapsedSeconds),'captures/s active window denominator');
 put('cache.composites',divide(counter?.['cache.composites'],elapsedSeconds),'composites/s active window denominator');
 put('cache.captureCPUms.lastSample',block.after?.page?.ui?.cache?.captureCPUms,'ms synchronous submission wall, last outside sample');
 put('cache.totalSubmissionWall',counter?.['cache.totalRenderCPUms'],'ms');
 for(const method of ['NativeHud.update','NativeStage.showPage','NativeStage.hit']){
  const record=s.nativeSynchronousMethods?.[method],native=context.mode==='native';
  // No recorded invocation during an acquired native window means zero calls.
  // Legacy has no wrapper and is kept unavailable for this comparison.
  put(`${method}.count`,native?(record?.count??0):null,'calls');
  put(`${method}.total`,native?(record?.synchronousWallMs??0):null,'ms synchronous wall');
  put(`${method}.max`,native?(record?.maxSynchronousWallMs??0):null,'ms synchronous wall');
 }
 put('heap.before',divide(s.heapBefore,1e6),'MB retained level');
 put('heap.after',divide(s.heapAfter,1e6),'MB retained level');
 for(const moment of ['before','after']){
  const snap=block[moment];
  put(`dom.${moment}.nodes`,snap?.dom?.nodes,'nodes retained level');
  put(`dom.${moment}.documents`,snap?.dom?.documents,'documents retained level');
  put(`dom.${moment}.listeners`,snap?.dom?.jsEventListeners,'listeners retained level');
  put(`dom.${moment}.connectedElements`,snap?.page?.domElements,'connected elements retained level');
 }
 return {context:context.id,mode:context.mode,status:block.status,elapsedSeconds,frameCount,simulatedSeconds,processCpuBracketSeconds:cpuSeconds,
  processCpu:{complete:!incomplete,observedCpuSeconds:finite(cpu?.observedCpuSeconds),stablePidCpuSeconds:finite(cpu?.stablePidCpuSeconds),newPidLifetimeCpuSeconds:finite(cpu?.newPidLifetimeCpuSeconds),groups:groupDetails,missing:cpu?.missing??[],invalid:cpu?.invalid??[]},
  initialWorld:block.initialWorld,raw:block.raw,metrics};
}

function compare(w1,candidate,w2){
 if([w1,candidate,w2].some(value=>finite(value)===null))return {available:false};
 const witnessMidpoint=(w1+w2)/2,witnessMin=Math.min(w1,w2),witnessMax=Math.max(w1,w2);
 const driftPercent=witnessMidpoint===0?(w1===w2?0:null):Math.abs(w2-w1)/Math.abs(witnessMidpoint)*100;
 return {available:true,witnessMin,witnessMax,witnessMidpoint,candidate,
  candidatePosition:candidate<witnessMin?'below witness range':candidate>witnessMax?'above witness range':'within witness range',
  candidateMinusWitnessMidpoint:candidate-witnessMidpoint,
  candidateDeltaPercent:witnessMidpoint===0?null:(candidate-witnessMidpoint)/Math.abs(witnessMidpoint)*100,
  witnessDriftPercent:driftPercent,witnessDriftFlag:driftPercent===null?null:driftPercent>=driftThresholdPercent};
}

const blocks=(report.blocks??[]).map(block=>{
 const [w1,candidate,w2]=[0,1,2].map(index=>summarize(report.contexts?.[index],block.id));
 const comparisons=Object.fromEntries([...new Set([...Object.keys(w1.metrics),...Object.keys(candidate.metrics),...Object.keys(w2.metrics)])].map(key=>[key,compare(w1.metrics[key]?.value,candidate.metrics[key]?.value,w2.metrics[key]?.value)]));
 return {id:block.id,speed:block.speed,requestedSeconds:block.seconds,witness1:w1,candidate,witness2:w2,comparisons};
});
const diagnostics=(report.contexts??[]).flatMap(context=>(context.blocks??[]).filter(block=>block.diagnosticOnly).map(block=>({id:block.id,diagnosticOnly:true,comparisonExcluded:true,speed:block.speed,requestedSeconds:block.seconds,...summarize(context,block.id)})));
const limitations=[
 'Descriptive single W1/C/W2 bracket only: range and drift flags are not confidence intervals, statistical significance, or automatic acceptance/rejection.',
 `Witness drift = abs(W2-W1)/abs((W1+W2)/2)*100; flag at >= ${driftThresholdPercent}%. A zero witness midpoint yields no candidate percent delta.`,
 'Cadence values describe callback intervals, not completed GPU work or physical display. Interval thresholds are strict greater-than and normalized to 10 seconds of actual measured active duration.',
 'Private OS process CPU uses the midpoint-to-midpoint process sample bracket duration. This bracket includes protocol gaps and differs slightly from the active frame window. CPU time sums process CPU seconds; ms/s may exceed 1000 across cores.',
 'CPU totals marked incomplete are excluded from numeric comparison. Individually unaffected groups remain comparable; absent groups are unavailable. Newly observed PID lifetime CPU is included in observed CPU and identified separately, as in the driver; it is not an exact window delta.',
 'MainTask ms/s uses active duration as denominator but CDP TaskDuration includes the small outside-window metric protocol bracket. Native methods are nested synchronous wall timings and must not be summed with frame or MainTask timings.',
 'Per-frame denominators use the real recorded callback count (boundary.frames, falling back to RAF interval count + 1). Observed FPS is callbacks/active duration. Per-simulated-second metrics are unavailable when no ticks were delivered. Process CPU numerators still span the outside process bracket; ThreadTime is the provided CDP counter, never GPU time.',
 'Native-only diagnostic blocks, when present, are displayed separately and excluded from W1/C/W2 comparisons; their starting World and elapsed state need not match the comparison blocks.',
 'Cache counts are outside-window sample deltas divided by active duration; tiny protocol gaps remain. captureCPUms is only the last outside sample, may be zero on a stable final frame, and is not aggregate capture time. Cache totalSubmissionWall is the existing totalRenderCPUms delta, not OS CPU or GPU accounting.',
 'Heap and DOM counters are retained levels without forced GC. Decimal MB = bytes/1,000,000. DOM nodes/listeners have no valid MB conversion. These levels are neither allocation volumes nor evidence of a leak or ownership.',
 'Legacy has no native wrappers/cache: those cells are unavailable rather than zero. No texture-upload volume, GPU elapsed time, or VRAM total can be inferred.',
 ...(report.limits??[]),
];
const output={protocol:'ui3d-cost-summary-v1',created:new Date().toISOString(),source:{path:reportPath,sha256:createHash('sha256').update(source).digest('hex'),protocol:report.protocol,status:report.status??null,errors:report.errors??[]},driftThresholdPercent,blocks,diagnostics,limitations};
const format=value=>finite(value)===null?'—':Math.abs(value)>=10000?value.toFixed(0):Math.abs(value)>=100?value.toFixed(1):value.toFixed(3);
const escape=value=>String(value).replaceAll('|','\\|').replaceAll('\n',' ');
const lines=['# UI cost: descriptive W1 / C / W2 summary','',`Source: ${reportPath}`,`Source status: ${report.status??'unfinished'} · drift flag threshold: ${driftThresholdPercent}% · no automatic acceptance`,''];
for(const block of blocks){
 lines.push(`## ${block.id} (requested ${block.requestedSeconds}s, speed ×${block.speed})`,'',`Durations W1/C/W2: ${[block.witness1,block.candidate,block.witness2].map(row=>format(row.elapsedSeconds)).join(' / ')} s. Private CPU complete: ${[block.witness1,block.candidate,block.witness2].map(row=>row.processCpu?String(row.processCpu.complete):'unavailable').join(' / ')}.`,'',
  '| Metric | W1 | C | W2 | C vs witness midpoint | C relative to witness range | Witness drift |',
  '|---|---:|---:|---:|---:|---|---|');
 for(const [key,comparison]of Object.entries(block.comparisons)){
  const data=[block.witness1,block.candidate,block.witness2].map(row=>row.metrics[key]);
  const difference=comparison.available?`${format(comparison.candidateMinusWitnessMidpoint)} (${comparison.candidateDeltaPercent===null?'% undefined':format(comparison.candidateDeltaPercent)+'%'})`:'—';
  const drift=comparison.available?(comparison.witnessDriftPercent===null?'undefined':`${format(comparison.witnessDriftPercent)}%${comparison.witnessDriftFlag?' FLAG':''}`):'—';
  lines.push(`| ${escape(key)} [${escape(data.find(Boolean)?.unit??'')}] | ${data.map(row=>format(row?.value)).join(' | ')} | ${difference} | ${comparison.candidatePosition??'—'} | ${drift} |`);
 }
 lines.push('');
}
for(const diagnostic of diagnostics){
 lines.push(`## Separate diagnostic: ${diagnostic.id}`,'',`Context ${diagnostic.context}; ${format(diagnostic.elapsedSeconds)} s. Excluded from W1/C/W2 comparisons. Initial World tick: ${diagnostic.initialWorld?.tick??'unavailable'}.`,'','| Metric | Native diagnostic |','|---|---:|');
 for(const [key,metric]of Object.entries(diagnostic.metrics))lines.push(`| ${escape(key)} [${escape(metric.unit)}] | ${format(metric.value)} |`);
 lines.push('');
}
lines.push('## Scope and limitations','',...limitations.map(text=>`- ${text}`),'');
const folder=dirname(reportPath),jsonPath=resolve(folder,'cost-summary.json'),markdownPath=resolve(folder,'cost-summary.md');
if([jsonPath,markdownPath].includes(reportPath))throw Error('Summary output must not replace the source report.');
await writeFile(jsonPath,JSON.stringify(output,null,2)+'\n');
await writeFile(markdownPath,lines.join('\n'));
console.log(JSON.stringify({source:reportPath,status:report.status??null,summaryJson:jsonPath,summaryMarkdown:markdownPath,blocks:blocks.length}));
