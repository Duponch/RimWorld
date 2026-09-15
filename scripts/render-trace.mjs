import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

/** Opt-in trace for one short, already warmed render phase. Raw traces are
 * diagnostic evidence in ignored tmp/, not permanent multi-megabyte artifacts. */
export async function startRenderTrace(browser, label) {
  const cdp=await browser.newBrowserCDPSession();
  const {categories:available}=await cdp.send('Tracing.getCategories');
  const categories=available.filter(c=>/^(toplevel|devtools\.timeline|blink\.user_timing|gpu|viz|cc|renderer\.scheduler|v8|disabled-by-default-devtools\.timeline|disabled-by-default-devtools\.timeline\.frame|disabled-by-default-v8\.gc)$/.test(c));
  await cdp.send('Tracing.start',{categories:categories.join(','),transferMode:'ReturnAsStream',options:'record-until-full'});
  return async()=>{
    let timer;
    try {
      const complete=new Promise((resolve,reject)=>{cdp.once('Tracing.tracingComplete',resolve);timer=setTimeout(()=>reject(new Error('GPU trace finalization exceeded 30 seconds')),30000);});
      await cdp.send('Tracing.end');const {stream}=await complete;
      let data='',bytes=0;
      for(;;) {
        const chunk=await cdp.send('IO.read',{handle:stream,size:1024*1024});
        const value=chunk.base64Encoded?Buffer.from(chunk.data,'base64').toString('utf8'):chunk.data;
        bytes+=Buffer.byteLength(value);if(bytes>128*1024*1024)throw new Error('GPU trace exceeded 128 MiB diagnostic budget');
        data+=value;if(chunk.eof)break;
      }
      await cdp.send('IO.close',{handle:stream});
      await mkdir('tmp/render-traces',{recursive:true});const path=`tmp/render-traces/${label}.json`;
      await writeFile(path,data);
      return {path,bytes,categories,sha256:createHash('sha256').update(data).digest('hex')};
    } finally {clearTimeout(timer);await cdp.detach();}
  };
}
