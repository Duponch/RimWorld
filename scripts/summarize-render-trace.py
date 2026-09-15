"""Extract GPU task attribution from a bounded mining trace; keep raw JSON local."""
import json
import sys
from pathlib import Path

report=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
summaries=[]
for phase in report['phases']:
    if 'trace' not in phase:
        continue
    events=json.loads(Path(phase['trace']['path']).read_text(encoding='utf-8'))['traceEvents']
    names={(e['pid'],e['tid']):e['args']['name'] for e in events if e['name']=='thread_name'}
    marker=next(e for e in events if e['name']=='mining-measure-start')
    origin=marker['ts']-marker['args']['data']['startTime']*1000
    gpu=sorted((e for e in events if e['name']=='GPUTask' and e.get('ph')=='X'),key=lambda e:e.get('dur',0),reverse=True)[:10]
    summaries.append({'actors':phase['count'],'trace':phase['trace'],'eventCount':len(events),
      'longFrames':phase['longFrames'],'largestGpuTasks':[{'at':(e['ts']-origin)/1000,'duration':e['dur']/1000,'thread':names.get((e['pid'],e['tid'])),'data':e.get('args',{}),
      'commandBatches':[{'at':(c['ts']-origin)/1000,'duration':c['dur']/1000,'data':c.get('args',{})} for c in events if c['name']=='WebGPUDecoderImpl::HandleDawnCommands' and c.get('dur',0)>1000 and c['pid']==e['pid'] and e['ts']<=c['ts']<e['ts']+e['dur']]} for e in gpu]})
Path(sys.argv[2]).write_text(json.dumps({'source':sys.argv[1],'phases':summaries},indent=2)+'\n',encoding='utf-8')
