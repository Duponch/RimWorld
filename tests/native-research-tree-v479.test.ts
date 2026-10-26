import {afterEach,describe,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {applyCommand,createWorld} from '../src/sim/index';
import {RESEARCH_SCALE} from '../src/sim/research';
import {researchProjects} from '../src/ui/research-projects';
import {researchGraphLinks,researchLinks,researchLinkSvgPath,researchNodePosition,researchPrerequisiteLabels,RESEARCH_GRAPH_WIDTH,RESEARCH_GRAPH_HEIGHT,RESEARCH_NODE_WIDTH,RESEARCH_NODE_HEIGHT} from '../src/ui/research-tree';
import {buildNativeResearch,resetNativeResearch} from '../src/ui3d/native-research';
import type {NativeControl,NativePage,NativeUiActions,NativeUiState} from '../src/ui3d/native-contract';

let seed=479200;
function fixture(){
  const world=createWorld(++seed,16,16);
  // A prepared UI fixture needs an explicit research owner; createWorld may
  // legitimately leave the optional dossier absent until the first command.
  world.research??={project:null,points:0};
  const state:NativeUiState={world,epoch:seed,panel:'research',category:'structure',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],constructionMaterial:'wood',creationStorage:{priority:3,filters:{wood:true,food:true}},speed:0,hasGame:true,busy:false,saves:[]};
  const noop=()=>{};
  const actions:NativeUiActions={command:vi.fn(async command=>applyCommand(world,command)),panel:vi.fn(),category:vi.fn(),tool:noop,selectPawn:noop,speed:noop,rotate:noop,material:noop,creationStorage:noop,front:noop,save:noop,exportSave:noop,showPage:noop,refresh:vi.fn(),readState:()=>state};
  let page:NativePage;
  const rebuild=()=>page=buildNativeResearch(world,actions);
  const control=(id:string):NativeControl=>{const result=page.rows.flatMap(row=>row.controls??[]).find(control=>control.id===id);if(!result)throw Error('Contrôle absent : '+id);return result;};
  rebuild();return {world,state,actions,rebuild,control,get page(){return page;}};
}
afterEach(()=>resetNativeResearch());

describe('shared delivered research hierarchy',()=>{
  it('keeps the exact thirty legacy SVG routes and all forty-two project coordinates',()=>{
    expect(researchProjects).toHaveLength(42);expect(researchLinks).toHaveLength(30);
    // Golden was extracted from 47652d6c's original DOM routing, before sharing
    // its data. It guards every legacy endpoint, bend and numeric expression.
    const paths=researchLinks.map(([from,to])=>[from,to,researchLinkSvgPath(from,to)]);
    expect(createHash('sha256').update(JSON.stringify(paths)).digest('hex')).toBe('09c5f2eca5e6fad26f4de2370cc673aa1e2a434a871cd78d6d1acab343d863f9');
    expect([RESEARCH_NODE_WIDTH,RESEARCH_NODE_HEIGHT,RESEARCH_GRAPH_WIDTH,RESEARCH_GRAPH_HEIGHT]).toEqual([142,66,850,815]);
    const positions=researchProjects.map(researchNodePosition);
    // The delivered DOM coordinates contain this pre-existing overlap. Native
    // presentation repairs it separately without rewriting the legacy oracle.
    expect(new Set(positions.map(position=>`${position.x}:${position.y}`)).size).toBe(41);
    expect(researchNodePosition(researchProjects.find(project=>project.id==='prosthetics')!)).toEqual(researchNodePosition(researchProjects.find(project=>project.id==='recon-armor')!));
    for(const position of positions){expect(position.x).toBeGreaterThanOrEqual(0);expect(position.y).toBeGreaterThanOrEqual(0);expect(position.x+142).toBeLessThanOrEqual(850);expect(position.y+66).toBeLessThanOrEqual(815);}
  });
  it('has no dangling native links and samples curves with the same SVG endpoints',()=>{
    const projects=new Set(researchProjects.map(project=>project.id));
    expect(researchGraphLinks.map(link=>[link.from,link.to])).toEqual(researchLinks);
    for(const link of researchGraphLinks){
      expect(projects.has(link.from)).toBe(true);expect(projects.has(link.to)).toBe(true);expect(link.path.length).toBeGreaterThanOrEqual(2);
      for(const point of link.path){expect(Number.isFinite(point.x)&&Number.isFinite(point.y)).toBe(true);expect(point.x).toBeGreaterThanOrEqual(0);expect(point.x).toBeLessThanOrEqual(850);expect(point.y).toBeGreaterThanOrEqual(0);expect(point.y).toBeLessThanOrEqual(815);}
      const numbers=researchLinkSvgPath(link.from,link.to).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)!.map(Number);
      expect(link.path[0]).toEqual({x:numbers[0],y:numbers[1]});
      expect(link.path.at(-1)!.x).toBeCloseTo(numbers.at(-2)!,12);expect(link.path.at(-1)!.y).toBeCloseTo(numbers.at(-1)!,12);
    }
    expect(researchPrerequisiteLabels.get('vitals-monitor')).toEqual(['Lit d’hôpital','Multi-analyseur']);
  });
});

describe('native research keeps the former tree, dossier and direct actions',()=>{
  it('exposes the Principal tab, every fixed-size node and its distinct select/start controls without changing the World',()=>{
    const f=fixture(),before=JSON.stringify(f.world);f.rebuild();
    expect(f.page.id).toBe('research');expect(f.page.layout).toBe('research');expect([f.page.width,f.page.height]).toEqual([1420,780]);
    expect(f.page.rows.filter(row=>row.region==='navigation').flatMap(row=>row.controls??[]).map(control=>[control.id,control.label])).toEqual([['research-tab-main','Principal']]);
    const nodes=f.page.rows.filter(row=>row.graphNode);
    expect(nodes).toHaveLength(42);expect(f.page.research!.links).toHaveLength(30);
    for(const project of researchProjects){const node=nodes.find(row=>row.id==='research-node-'+project.id)!;const base=project.id==='prosthetics'?{x:184,y:726.88}:researchNodePosition(project);expect(node.graphNode).toMatchObject({x:base.x*1.25,y:base.y*1.25,width:142,height:66,cost:project.cost});expect(node.controls!.map(control=>control.id)).toEqual([`research-${project.id}-select`,`research-${project.id}-start`]);expect(node.controls![0]!.hint).toContain(project.detail);}
    expect(f.page.rows.some(row=>row.region==='details'&&row.id==='research-active-heading')).toBe(true);
    expect(JSON.stringify(f.world)).toBe(before);expect(f.actions.command).not.toHaveBeenCalled();
  });
  it('spaces all native cards without overlap, preserves every link port and retains the empty Prothèses corridor',()=>{
    const legacyBefore=JSON.stringify({positions:researchProjects.map(researchNodePosition),links:researchGraphLinks});
    const f=fixture(),worldBefore=JSON.stringify(f.world),nodes=f.page.rows.filter(row=>row.graphNode);
    expect(new Set(nodes.map(row=>`${row.graphNode!.x}:${row.graphNode!.y}`)).size).toBe(42);
    expect(new Set(nodes.map(row=>row.id))).toEqual(new Set(researchProjects.map(project=>'research-node-'+project.id)));
    expect(f.page.research!.links).toHaveLength(30);expect([f.page.research!.width,f.page.research!.height]).toEqual([1063,1019]);
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i]!.graphNode!,b=nodes[j]!.graphNode!;
      expect(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y,`${nodes[i]!.label} and ${nodes[j]!.label} must not overlap`).toBe(false);
    }
    const basePosition=(id:string)=>id==='prosthetics'?{x:184,y:726.88}:researchNodePosition(researchProjects.find(project=>project.id===id)!);
    const onBoundary=(box:NonNullable<(typeof nodes)[number]['graphNode']>,point:{x:number;y:number})=>{
      const epsilon=1e-7,inside=point.x>=box.x-epsilon&&point.x<=box.x+box.width+epsilon&&point.y>=box.y-epsilon&&point.y<=box.y+box.height+epsilon;
      const edge=Math.abs(point.x-box.x)<epsilon||Math.abs(point.x-box.x-box.width)<epsilon||Math.abs(point.y-box.y)<epsilon||Math.abs(point.y-box.y-box.height)<epsilon;
      expect(inside&&edge,'route endpoint lies on its actual card port').toBe(true);
    };
    const crossesInterior=(a:{x:number;y:number},b:{x:number;y:number},box:NonNullable<(typeof nodes)[number]['graphNode']>)=>{
      let enter=0,exit=1;
      for(const [start,delta,min,max]of[[a.x,b.x-a.x,box.x+1e-7,box.x+box.width-1e-7],[a.y,b.y-a.y,box.y+1e-7,box.y+box.height-1e-7]]){
        if(Math.abs(delta!)<1e-10){if(start!<=min!||start!>=max!)return false;continue;}
        const first=(min!-start!)/delta!,last=(max!-start!)/delta!;enter=Math.max(enter,Math.min(first,last));exit=Math.min(exit,Math.max(first,last));if(enter>=exit)return false;
      }
      return enter<exit;
    };
    for(const link of f.page.research!.links){
      const legacy=researchGraphLinks.find(previous=>previous.from===link.from&&previous.to===link.to)!;
      const source=nodes.find(row=>row.id==='research-node-'+link.from)!.graphNode!,target=nodes.find(row=>row.id==='research-node-'+link.to)!.graphNode!;
      onBoundary(source,link.path[0]!);onBoundary(target,link.path.at(-1)!);
      for(const point of link.path){expect(Number.isFinite(point.x)&&Number.isFinite(point.y)).toBe(true);expect(point.x).toBeGreaterThanOrEqual(0);expect(point.y).toBeGreaterThanOrEqual(0);expect(point.x).toBeLessThanOrEqual(1063);expect(point.y).toBeLessThanOrEqual(1019);}
      if(link.to!=='prosthetics'){
        const from=basePosition(link.from),to=basePosition(link.to),first=legacy.path[0]!,last=legacy.path.at(-1)!;
        expect(link.path).toHaveLength(legacy.path.length);
        expect(link.path[0]!.x-source.x).toBeCloseTo(first.x-from.x,10);expect(link.path[0]!.y-source.y).toBeCloseTo(first.y-from.y,10);
        expect(link.path.at(-1)!.x-target.x).toBeCloseTo(last.x-to.x,10);expect(link.path.at(-1)!.y-target.y).toBeCloseTo(last.y-to.y,10);
        for(let index=1;index<link.path.length-1;index++){expect(link.path[index]!.x).toBeCloseTo(legacy.path[index]!.x*1.25,10);expect(link.path[index]!.y).toBeCloseTo(legacy.path[index]!.y*1.25,10);}
        continue;
      }
      expect(link.from).toBe('machining');expect(link.path).not.toEqual(legacy.path);
      expect(link.path[0]!.x).toBeCloseTo(source.x+source.width/2,10);expect(link.path[0]!.y).toBeCloseTo(source.y+source.height,10);
      expect(link.path.at(-1)!.x).toBeCloseTo(target.x+target.width/2,10);expect(link.path.at(-1)!.y).toBeCloseTo(target.y,10);
      for(const row of nodes){
        if(row.id==='research-node-machining'||row.id==='research-node-prosthetics')continue;
        const box=row.graphNode!;
        for(let i=1;i<link.path.length;i++){
          const a=link.path[i-1]!,b=link.path[i]!,crosses=crossesInterior(a,b,box);
          expect(crosses,`Usinage → Prothèses must not cross ${row.label}`).toBe(false);
        }
      }
    }
    expect(JSON.stringify({positions:researchProjects.map(researchNodePosition),links:researchGraphLinks})).toBe(legacyBefore);
    expect(JSON.stringify(f.world)).toBe(worldBefore);expect(f.actions.command).not.toHaveBeenCalled();
  });
  it('keeps selection separate from launch, preserves the page identity and retains an explicit player choice across fresh World snapshots',async()=>{
    const f=fixture(),before=JSON.stringify(f.world),active=f.world.research?.project;
    await f.control('research-tree-sowing-select').onActivate();f.rebuild();
    expect(f.page.research!.selected).toBe('tree-sowing');expect(f.page.id).toBe('research');expect(f.actions.command).not.toHaveBeenCalled();expect(f.world.research?.project).toBe(active);expect(JSON.stringify(f.world)).toBe(before);
    f.world.tick++;f.rebuild();expect(f.page.research!.selected).toBe('tree-sowing');
    expect(f.control('research-start').disabled).toBe(false);await f.control('research-start').onActivate();f.rebuild();
    expect(f.actions.command).toHaveBeenCalledExactlyOnceWith({type:'research-project',project:'tree-sowing'});expect(f.world.research?.project).toBe('tree-sowing');
    expect(f.control('research-start').disabled).toBe(true);expect(f.control('research-start').label).toBe('Recherche en cours');
  });
  it('lets an ordinary project be chosen before its workstation exists, but explains its wait and still blocks missing prerequisites',async()=>{
    const f=fixture();f.world.structures.length=0;f.world.research!.smithing={points:0};
    f.rebuild();const tree=f.control('research-tree-sowing-start');expect(tree.disabled).toBe(false);expect(tree.hint).toContain('Le projet peut être choisi maintenant');
    await tree.onActivate();expect(f.world.research?.project).toBe('tree-sowing');
    f.rebuild();expect(f.control('research-machining-start').disabled).toBe(true);expect(f.control('research-machining-start').hint).toContain('Nécessite');
    const machining=f.page.rows.find(row=>row.id==='research-node-machining')!;expect(machining.graphNode!.state).toBe('locked');
  });
  it('keeps the installation admission specific to the vitals monitor after its research prerequisites are prepared',()=>{
    const f=fixture();f.world.structures.length=0;
    f.world.research!.hospitalBed={points:2000*RESEARCH_SCALE,completedAt:1};f.world.research!.multiAnalyzer={points:4000*RESEARCH_SCALE,completedAt:1};
    f.rebuild();expect(f.control('research-vitals-monitor-start').disabled).toBe(true);expect(f.control('research-vitals-monitor-start').hint).toContain('Un bureau avancé et un multi-analyseur alimentés');
  });
  it('retains active-project navigation, exact progress, pause and both context links',async()=>{
    const f=fixture();f.world.research!.project='smithing';f.world.research!.smithing={points:125.5*RESEARCH_SCALE};f.rebuild();
    await f.control('research-tree-sowing-select').onActivate();f.rebuild();await f.control('research-active-project').onActivate();f.rebuild();
    expect(f.page.research!.selected).toBe('smithing');expect(f.page.rows.find(row=>row.id==='research-active-progress')!.meter).toMatchObject({value:125.5,max:700});
    await f.control('research-pause').onActivate();f.rebuild();expect(f.world.research!.project).toBeNull();expect(f.world.research!.smithing.points).toBe(125.5*RESEARCH_SCALE);expect(f.control('research-pause').disabled).toBe(true);
    await f.control('research-open-work').onActivate();expect(f.actions.panel).toHaveBeenLastCalledWith('work');
    await f.control('research-open-production').onActivate();expect(f.actions.category).toHaveBeenLastCalledWith('production');expect(f.actions.panel).toHaveBeenLastCalledWith('architect');
  });
  it('shows completion and missing researcher facts while keeping help explicitly collapsible',async()=>{
    const f=fixture();for(const pawn of f.world.pawns){delete pawn.background;pawn.priorities.research=0;}
    f.world.research!.stonecutting={points:300*RESEARCH_SCALE,completedAt:0};f.rebuild();
    expect(f.control('research-stonecutting-start').disabled).toBe(true);expect(f.page.rows.find(row=>row.id==='research-node-stonecutting')!.graphNode!.state).toBe('done');
    expect(f.page.rows.find(row=>row.id==='research-readiness')!.label).toContain('Recherche désactivée');
    expect(f.page.rows.some(row=>row.id==='research-help-body')).toBe(false);await f.control('research-help').onActivate();f.rebuild();expect(f.page.rows.find(row=>row.id==='research-help-body')!.label).toContain('Architecte → Production');
    await f.control('research-help').onActivate();f.rebuild();expect(f.page.rows.some(row=>row.id==='research-help-body')).toBe(false);
  });
  it('keeps historical schema gates, omits dangling links and resets drafts on a real owner epoch or a tick rollback',async()=>{
    const f=fixture();await f.control('research-tree-sowing-select').onActivate();await f.control('research-help').onActivate();f.rebuild();
    f.state.epoch!++;f.rebuild();expect(f.page.research!.selected).toBe(f.world.research?.project??'complex-clothing');expect(f.page.rows.some(row=>row.id==='research-help-body')).toBe(false);
    await f.control('research-stonecutting-select').onActivate();f.world.tick+=10;f.rebuild();f.world.tick-=5;f.rebuild();expect(f.page.research!.selected).toBe(f.world.research?.project??'complex-clothing');
    f.world.schemaVersion=289 as typeof f.world.schemaVersion;f.rebuild();const graphIds=new Set(f.page.rows.filter(row=>row.graphNode).map(row=>row.id.slice('research-node-'.length)));
    expect(graphIds.has('tree-sowing')).toBe(false);expect(graphIds.has('firefoam')).toBe(false);
    for(const link of f.page.research!.links){expect(graphIds.has(link.from)).toBe(true);expect(graphIds.has(link.to)).toBe(true);}
  });
});
