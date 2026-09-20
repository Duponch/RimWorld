import { expect,test,vi } from 'vitest';
import { GameSession,SAVE_KEY,PREVIOUS_KEY } from '../src/ui/game-session';

function fixture(active=false) {
  const data=new Map<string,string>([[SAVE_KEY,'manual'],[PREVIOUS_KEY,'older']]);
  const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
  const client={init:vi.fn(async()=>{}),load:vi.fn(async(_data:string)=>{}),save:vi.fn(async()=> 'active')};
  const prepare=vi.fn(async()=>{}),session=new GameSession(client,()=>storage,prepare);session.hasWorld=active;
  return {data,storage,client,prepare,session};
}
test('cold load uses the chosen data without initializing a temporary world; recovery remains distinct',async()=>{
  const f=fixture();await f.session.load(SAVE_KEY);
  expect(f.client.init).not.toHaveBeenCalled();expect(f.client.save).not.toHaveBeenCalled();
  expect(f.client.load).toHaveBeenCalledWith('manual');expect(f.prepare).toHaveBeenCalledOnce();
  expect(f.session.hasWorld).toBe(true);expect(f.data.get(PREVIOUS_KEY)).toBe('older');
  await f.session.load(PREVIOUS_KEY);
  expect(f.client.load).toHaveBeenLastCalledWith('older');expect(f.data.get(PREVIOUS_KEY)).toBe('active');expect(f.data.get(SAVE_KEY)).toBe('manual');
});
test('refused replacement restores prior recovery and active world; accepted world survives graphics failure',async()=>{
  const f=fixture(true);f.client.init.mockRejectedValueOnce(new Error('invalid world'));
  await expect(f.session.create(42,32,'sentry')).rejects.toThrow('invalid world');
  expect(f.data.get(PREVIOUS_KEY)).toBe('older');expect(f.data.get(SAVE_KEY)).toBe('manual');expect(f.prepare).not.toHaveBeenCalled();expect(f.session.busy).toBe(false);
  f.prepare.mockRejectedValueOnce(new Error('GPU unavailable'));
  await expect(f.session.create(42,250,'crashlanded')).rejects.toThrow('GPU unavailable');
  expect(f.client.init).toHaveBeenLastCalledWith(42,250,'crashlanded',true,undefined);
  expect(f.session.hasWorld).toBe(true);expect(f.data.get(PREVIOUS_KEY)).toBe('active');expect(f.data.get(SAVE_KEY)).toBe('manual');
});
test('unavailable storage prevents destructive replacement; concurrent operations are rejected until preparation ends',async()=>{
  const f=fixture(true);f.storage.setItem=()=>{throw Error('Quota exceeded');};
  await expect(f.session.create(42,250,'crashlanded')).rejects.toThrow('Quota');expect(f.client.init).not.toHaveBeenCalled();
  expect(f.data.get(PREVIOUS_KEY)).toBe('older');
  const g=fixture();let release!:()=>void;
  g.prepare.mockImplementationOnce(()=>new Promise<void>(r=>{release=r;}));
  const first=g.session.load(SAVE_KEY);await vi.waitFor(()=>expect(g.prepare).toHaveBeenCalled());
  await expect(g.session.create(42,250,'crashlanded')).rejects.toThrow('en cours');await expect(g.session.save()).rejects.toThrow('en cours');
  expect(g.client.init).not.toHaveBeenCalled();release();await first;expect(g.session.busy).toBe(false);
});
test('metadata uses civil date and corrupt slots remain visible without trusting their contents',()=>{
  const f=fixture();f.data.set(SAVE_KEY,JSON.stringify({tick:4500,width:250,height:250,schemaVersion:82,gameProfile:{revision:1},scenario:{id:'crashlanded'}}));
  const saves=f.session.saves();expect(saves[0]!.detail).toContain('jour 2');expect(saves[0]!.detail).toContain('format 82');expect(saves[1]!.detail).toContain('illisibles');
  expect(f.client.load).not.toHaveBeenCalled();
});
