// Deploy only the built public directory. Credentials never enter dist or logs.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),dist=join(root,'dist');
const production=process.argv.includes('--prod');
const cfg=process.env.NETLIFY_AUTH_TOKEN?{}:JSON.parse(await readFile(join(process.env.APPDATA,'netlify/Config/config.json'),'utf8'));
const token=process.env.NETLIFY_AUTH_TOKEN??cfg.users?.[cfg.userId]?.auth?.token;
if(!token)throw Error('Connexion Netlify requise : utiliser netlify login.');
async function api(path,method='GET',body,type='application/json'){
  const response=await fetch('https://api.netlify.com/api/v1'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':type},body:body===undefined?undefined:type==='application/json'?JSON.stringify(body):body,signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(`Netlify ${method} ${path}: HTTP ${response.status}`);
  const data=await response.text();return data?JSON.parse(data):undefined;
}
let state;
try{state=JSON.parse(await readFile(join(root,'.netlify/state.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
let site;
if(state?.siteId){
  site=await api(`/sites/${state.siteId}`);
  if(site.name!=='lisiere-duponch'||site.account_slug!=='duponch')throw Error('Site différent de Lisière : déploiement refusé.');
}else{
  if(!process.argv.includes('--create-site'))throw Error('Projet non lié ; --create-site requis pour sa première publication.');
  const sites=await api('/sites?per_page=100');
  if(sites.some(s=>s.name==='lisiere-duponch'))throw Error('Site existant non lié : vérifier son identité avant de le réutiliser.');
  site=await api('/duponch/sites','POST',{name:'lisiere-duponch',force_ssl:true});
  await mkdir(join(root,'.netlify'),{recursive:true});
  await writeFile(join(root,'.netlify/state.json'),JSON.stringify({siteId:site.id},null,2)+'\n');
}
const files={},contents=new Map();
async function scan(directory,prefix=''){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw Error('Lien symbolique interdit dans dist.');
    const key=prefix+'/'+entry.name,path=join(directory,entry.name);
    if(entry.isDirectory())await scan(path,key);
    else if(entry.isFile()){
      const bytes=await readFile(path),hash=createHash('sha1').update(bytes).digest('hex');files[key]=hash;contents.set(hash,{key,bytes});
    }
  }
}
await scan(dist);
if(!files['/index.html'])throw Error('Construire le jeu avant déploiement.');
let deploy=await api(`/sites/${site.id}/deploys`,'POST',{files,draft:!production,title:process.env.DEPLOY_TITLE??'Lisière — version validée'});
console.log(JSON.stringify({site:site.name,deploy:deploy.id,files:Object.keys(files).length,production}));
for(const hash of deploy.required??[]){
  const item=contents.get(hash);if(!item)throw Error('Empreinte inconnue demandée par Netlify.');
  await api(`/deploys/${deploy.id}/files${item.key.split('/').map(encodeURIComponent).join('/')}`,'PUT',item.bytes,'application/octet-stream');
}
const deadline=Date.now()+180000;
while(deploy.state!=='ready'){
  if(deploy.state==='error'||Date.now()>deadline)throw Error(`Déploiement ${deploy.id}: ${deploy.state}`);
  await new Promise(r=>setTimeout(r,2000));deploy=await api(`/deploys/${deploy.id}`);
}
const report={siteId:site.id,name:site.name,url:site.ssl_url??`https://${site.name}.netlify.app`,deployId:deploy.id,deployUrl:deploy.deploy_ssl_url,state:deploy.state,production,fileCount:Object.keys(files).length,indexSha1:files['/index.html'],createdAt:deploy.created_at};
await writeFile(join(root,'artifacts/netlify-latest.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
