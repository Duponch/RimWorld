import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Read-only preflight for development work; never imports the game or deletes.
const gib=1024**3;
const roots=[['project',path.parse(process.cwd()).root],['scratch',path.parse(os.homedir()).root]];
const rows=roots.map(([role,root])=>{
  const stats=fs.statfsSync(root,{bigint:true});
  const freeBytes=Number(stats.bavail*stats.bsize),minimumBytes=2*gib;
  return {role,root,freeBytes,freeGiB:Number((freeBytes/gib).toFixed(3)),minimumBytes,ok:freeBytes>=minimumBytes};
});
const ok=rows.every(row=>row.ok);
console.log(JSON.stringify({ok,readOnly:true,action:ok?'storage-margin-available':'hold-new-heavy-work-and-reclaim-only-proven-obsolete-data',volumes:rows},null,2));
process.exitCode=ok?0:2;
