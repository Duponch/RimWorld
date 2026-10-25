import {afterEach,describe,expect,it,vi} from 'vitest';
import {toolDefinitions} from '../src/ui3d/native-catalog';
import {researchProjects} from '../src/ui/research-projects';
import {drawHandPaintedIcon,MANAGEMENT_BUTTONS} from '../src/ui3d/prototype-art';
import {drawNativeActionIcon,nativeActionIconKind} from '../src/ui3d/native-action-icons';

/** An ink recorder only. It cannot allocate bitmaps/meshes, access a DOM, load
 * an image or impersonate a graphical pixel comparison. ROOT owns GPU checks. */
function ink(){
  const commands:unknown[][]=[],state=new Map<PropertyKey,unknown>(),stack:Array<Map<PropertyKey,unknown>>=[];
  state.set('fillStyle','#old-fill');state.set('strokeStyle','#old-stroke');state.set('lineWidth',19);state.set('lineCap','square');
  const methods=new Set(['save','restore','beginPath','moveTo','lineTo','closePath','fill','stroke','arc']);
  const ctx=new Proxy({}, {
    get(_target,key){
      if(typeof key==='string'&&methods.has(key))return(...args:unknown[])=>{
        commands.push([key,...args]);
        if(key==='save')stack.push(new Map(state));
        if(key==='restore'){state.clear();for(const[name,value]of stack.pop()??[])state.set(name,value);}
      };
      return state.get(key);
    },
    set(_target,key,value:unknown){state.set(key,value);commands.push(['set',key,value]);return true;}
  }) as CanvasRenderingContext2D;
  return {ctx,commands,state,stack};
}
const stream=(id:string)=>{const paint=ink();drawNativeActionIcon(paint.ctx,id,48,37,24);return paint;};
const drawCount=(commands:unknown[][])=>commands.filter(command=>command[0]==='fill'||command[0]==='stroke').length;
const commandSignature=(id:string)=>JSON.stringify(stream(id).commands);
afterEach(()=>vi.restoreAllMocks());

describe('native cardboard action pictograms · V479',()=>{
  it('has visible named artwork for every delivered tool, floor, category and research project',()=>{
    const categories=['structure','floors','furniture','temperature','recreation','production','power','ship','orders','zones'];
    const ids=new Set([...toolDefinitions.map(tool=>tool.id),...researchProjects.map(project=>project.id),...categories]);
    for(const id of ids){
      expect(nativeActionIconKind(id),id).not.toBe('fallback');
      const paint=stream(id);
      expect(drawCount(paint.commands),id).toBeGreaterThan(0);
      expect(paint.stack,id).toHaveLength(0);
      for(const command of paint.commands)for(const value of command)if(typeof value==='number')expect(Number.isFinite(value),id).toBe(true);
    }
  });

  it('reuses the literal lower-bar pictograms without changing their ink stream',()=>{
    for(const id of [...MANAGEMENT_BUTTONS.map(button=>button.id),'ordres','zones']){
      const original=ink(),native=ink();
      drawHandPaintedIcon(original.ctx,id,48,37,24,'#412817','#f4e9c7');
      drawNativeActionIcon(native.ctx,id,48,37,24,'#412817','#f4e9c7');
      expect(native.commands,id).toEqual(original.commands);
    }
  });

  it('recognizes native control IDs while preserving a project/tool whose own ID starts with research',()=>{
    for(const id of ['mine','wall','research-bench','ship-engine'])expect(nativeActionIconKind('tool-'+id+'-select')).toBe(nativeActionIconKind(id));
    expect(nativeActionIconKind('research-bench')).toBe('recherches');
    expect(nativeActionIconKind('category-temperature')).toBe('thermometer');
    expect(nativeActionIconKind('research-node-complex-furniture')).toBe('chair');
    expect(nativeActionIconKind('research-medicine-production-select')).toBe('cross');
    expect(nativeActionIconKind('research-start')).toBe('play');
    expect(nativeActionIconKind('map-dock:orders')).toBe('ordres');
    expect(nativeActionIconKind('tab:research')).toBe('recherches');
  });

  it('distinguishes the main map orders and marks removal separately from designation',()=>{
    const commands=['mine','chop','harvest','cut','haul-chunks','uninstall','deconstruct','cancel'];
    expect(new Set(commands.map(commandSignature)).size).toBe(commands.length);
    for(const[add,remove]of [['growing','remove-growing'],['stockpile','remove-stockpile'],['home','remove-home'],['build-roof','remove-roof'],['snow-clear','remove-snow-clear'],['build-bridge','remove-bridge']]){
      expect(commandSignature(add!)).not.toBe(commandSignature(remove!));
      expect(drawCount(stream(remove!).commands)).toBeGreaterThan(drawCount(stream(add!).commands));
    }
    expect(commandSignature('ignore-roof')).not.toBe(commandSignature('remove-roof'));
  });

  it('provides deterministic visible fallback and preserves the caller’s paint state',()=>{
    vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('Unseeded icon paint');});
    for(const id of ['future-delivered-action','mine','temperature','snow-clear','ship-reactor','medicine-production']){
      const first=stream(id),second=stream(id);
      expect(first.commands).toEqual(second.commands);expect(drawCount(first.commands)).toBeGreaterThan(0);
      expect(first.state.get('fillStyle')).toBe('#old-fill');expect(first.state.get('strokeStyle')).toBe('#old-stroke');
      expect(first.state.get('lineWidth')).toBe(19);expect(first.state.get('lineCap')).toBe('square');
    }
    for(const id of ['future-delivered-action','constructor','toString','__proto__']){
      expect(nativeActionIconKind(id)).toBe('fallback');expect(drawCount(stream(id).commands)).toBeGreaterThan(0);
    }
  });

  it('ignores invalid geometric input without painting or leaking canvas state',()=>{
    const paint=ink();
    for(const[x,y,r]of [[0,0,0],[0,0,-1],[Number.NaN,0,20],[0,Infinity,20],[0,0,Infinity]])drawNativeActionIcon(paint.ctx,'mine',x!,y!,r!);
    expect(paint.commands).toHaveLength(0);expect(paint.stack).toHaveLength(0);
  });
});
