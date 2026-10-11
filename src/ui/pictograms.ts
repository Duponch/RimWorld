/** Authored paper illustrations for actions, dossiers and controls. Real object
 * portraits remain in modelIconUrl; these silhouettes never replace a model. */
const ink='#59645f',wood='#a9652c',metal='#8296b0';
const bodies:Readonly<Record<string,string>>={
  passion:'<path d="M34 5c9 17-5 19 5 27 6-4 7-11 7-11 24 25-1 43-17 40S4 40 14 29c3 12 11 7 10-1C24 18 34 17 34 5Z" fill="#ff6b5e"/><path d="M32 33c-9 14-10 18 0 25 11-6 10-14 0-25Z" fill="#ffc23c"/>',
  pointer:'<path d="M13 7v43l12-13 10 20 8-4-10-19h17z" fill="#fff7e9"/>',
  mine:`<path d="m17 54 7 4 29-38-7-6z" fill="${wood}"/><path d="M9 14Q31-2 58 23L48 27Q34 11 9 14Z" fill="${metal}"/>`,
  chop:`<path d="m14 55 7 4 29-41-7-5z" fill="${wood}"/><path d="m33 8 10 4C43 23 48 28 59 30L49 44C36 36 30 24 33 8Z" fill="${metal}"/><path d="M55 30 47 40" stroke="#dce5ed" stroke-width="3"/>`,
  harvest:`<path d="m15 54 9 3 12-26-8-4z" fill="${wood}"/><path d="M29 29C57 25 63 3 33 5 47 10 49 20 29 24Z" fill="${metal}"/>`,
  slaughter:`<path d="m9 53 8 5 15-20-8-6z" fill="${wood}"/><path d="M25 30 49 5l9 9-10 20-17 7z" fill="${metal}"/><path d="m49 8 6 7-11 17-13 6" stroke="#e1e7ed" stroke-width="3"/><circle cx="16" cy="49" r="2" fill="#efc05b"/>`,
  cut:`<circle cx="16" cy="48" r="9" fill="${wood}"/><circle cx="37" cy="51" r="8" fill="${wood}"/><path d="m22 41 29-31-9 31-17 7M29 43 16 9l-3 29 17 11" fill="${metal}"/><circle cx="27" cy="40" r="3" fill="#d8e2e6"/>`,
  'haul-chunks':'<path d="m8 21 39 4-5 19H16z" fill="#bc813a"/><path d="m47 25 5-12h8M7 22l6 3M18 44h24"/><circle cx="19" cy="49" r="6" fill="#62778c"/><circle cx="40" cy="49" r="6" fill="#62778c"/><path d="M10 12h23m-7-6 7 6-7 6" stroke="#2b9b78"/>',
  uninstall:'<path d="m24 30 16-8 17 8v23l-17 8-16-8z" fill="#bb8548"/><path d="m24 30 16 8 17-8M40 38v23M33 26l17 8"/><path d="M6 12h14v24m-7-7 7 7 7-7" stroke="#3e9bff" stroke-width="5"/>',
  deconstruct:`<path d="m13 53 7 4 29-32-7-7z" fill="${wood}"/><path d="m30 13 12-9 15 16-12 11z" fill="${metal}"/>`,
  cancel:'<path d="m16 9 16 16L48 9l8 8-16 16 16 16-8 8-16-16-16 16-8-8 16-16L8 17z" fill="#ff6b5e"/>',
  home:'<path d="m5 31 27-23 27 23-6 6-4-3v23H15V34l-4 3z" fill="#efc05b"/><path d="M27 57V41h12v16" fill="#fff7e9"/>',
  clock:'<circle cx="32" cy="32" r="25" fill="#fff7e9"/><path d="M32 15v18l14 8" stroke="#3e9bff" stroke-width="5"/>',
  people:'<circle cx="23" cy="20" r="9" fill="#e7b384"/><circle cx="46" cy="25" r="7" fill="#a77554"/><path d="M5 56V44c0-17 35-17 35 0v12z" fill="#3e9bff"/><path d="M40 56V40c8-10 21-2 21 6v10z" fill="#2fc98e"/>',
  research:'<path d="M15 8h34v49H15z" fill="#fff7e9"/><path d="M25 18h14M25 26h14M25 34h7"/><path d="m42 34 13 13-8 8-13-13z" fill="#ffc23c"/>',
  leaf:'<path d="M14 53C4 25 20 10 54 7c-1 30-12 47-35 40z" fill="#2fc98e"/><path d="m13 58 29-34M25 44l-3-15M33 36l14 1"/>',
  eye:'<path d="M5 32Q32 4 59 32 32 60 5 32Z" fill="#fff7e9"/><circle cx="32" cy="32" r="11" fill="#3e9bff"/><circle cx="32" cy="32" r="4" fill="#262238"/>',
  layers:'<path d="m6 23 26-15 26 15-26 15z" fill="#ffc23c"/><path d="m6 33 26 15 26-15M6 43l26 15 26-15" stroke="#3e9bff"/>',
  animals:'<path d="M10 21h32l8 14-5 15H13L8 35z" fill="#c59b68"/><path d="M13 50v9M39 50v9M13 23 6 10l18 13M37 23l13-13-8 22"/><circle cx="36" cy="34" r="2" fill="#262238"/>',
  wildlife:'<path d="m10 13 14 13h16l14-13-5 32-17 14-17-14z" fill="#c57a39"/><path d="m20 36 12 18 12-18" fill="#fff7e9"/><circle cx="23" cy="33" r="2"/><circle cx="41" cy="33" r="2"/>',
  world:'<circle cx="32" cy="32" r="25" fill="#78c7ec"/><path d="m17 13 16 3 1 13-9 7 6 14-8 8-12-17 4-11-8-5M46 17l10 14-11 7-9-8z" fill="#2fc98e"/>',
  quests:'<path d="M15 5h34v49H15z" fill="#fff7e9"/><path d="m22 20 5 5 12-12m-17 26 5 5 12-12" stroke="#2fc98e"/><path d="M24 54h24v6H24z" fill="#ffc23c"/>',
  history:'<path d="M13 9h38v48H13z" fill="#fff7e9"/><path d="M21 19h22M21 29h22M21 39h15M8 9v48"/><path d="m38 39 10 8-10 8" stroke="#3e9bff"/>',
  factions:'<path d="M13 59V8m0 3c17-14 23 11 41-2v31c-18 13-24-12-41 2" fill="#ff6b5e"/>',
  menu:'<path d="M10 15h44M10 32h44M10 49h44" stroke="#3e9bff" stroke-width="7"/>',
  'build-roof':'<path d="m5 32 27-22 27 22-6 7-21-17-21 17z" fill="#9d7155"/><path d="M32 38v21M22 49h20" stroke="#2fc98e" stroke-width="5"/>',
  'remove-roof':'<path d="m5 32 27-22 27 22-6 7-21-17-21 17z" fill="#9d7155"/><path d="m24 42 17 17m0-17L24 59" stroke="#ff6b5e" stroke-width="5"/>',
  'ignore-roof':'<path d="m5 32 27-22 27 22-6 7-21-17-21 17z" fill="#9d7155"/><path d="M17 53h30" stroke="#ffc23c" stroke-width="5"/>',
  growing:'<path d="m7 49 25-13 25 13-25 12z" fill="#ae7b4b"/><path d="M32 44V22c-14 1-17-8-17-13 11 0 17 3 17 13 0-13 8-17 19-17-1 12-7 18-19 17" fill="#2fc98e"/>',
  stockpile:'<path d="m8 29 24-12 24 12v22L32 63 8 51z" fill="#deb46d"/><path d="m8 29 24 12 24-12M32 41v22M19 23l25 12"/>',
  'remove-floor':'<path d="m6 39 26-16 26 16-26 16z" fill="#c4b6a6"/><path d="m22 8 19 19m0-19L22 27" stroke="#ff6b5e" stroke-width="5"/>',
};
const paperBodies:Readonly<Record<string,string>>={
  animals:'<path d="M15 46c0-9 8-8 11-16 3-8 9-8 13 0 3 8 11 7 11 16 0 12-12 4-17 4-6 0-18 8-18-4z" fill="#788b80" stroke="none"/><ellipse cx="13" cy="28" rx="6" ry="9" fill="#788b80" stroke="none" transform="rotate(-25 13 28)"/><ellipse cx="26" cy="15" rx="6" ry="9" fill="#788b80" stroke="none"/><ellipse cx="42" cy="16" rx="6" ry="9" fill="#788b80" stroke="none"/><ellipse cx="54" cy="29" rx="6" ry="9" fill="#788b80" stroke="none" transform="rotate(25 54 29)"/>',
  shooting:'<circle cx="34" cy="28" r="22" fill="#788b80" stroke="none"/><circle cx="34" cy="28" r="16" fill="#f3eee2" stroke="none"/><circle cx="34" cy="28" r="11" fill="#788b80" stroke="none"/><circle cx="34" cy="28" r="5" fill="#f3eee2" stroke="none"/><path d="m9 53 25-25m-13 9-10-1 1 10" stroke="#7e8fa1" stroke-width="4"/>',
  melee:'<path d="m11 51 29-29 11-13 5-2-2 8-12 11-28 29z" fill="#a3b0b7"/><path d="m8 42 14 14m-13-1 4 4" stroke="#a98f73" stroke-width="6"/><path d="m45 51-20-20-7-15 5-8 9 7 17 28z" fill="#b8c1c5"/><path d="m39 54 14-14" stroke="#a98f73" stroke-width="5"/>',
  construction:'<path d="m17 53 6 5 24-33-7-5z" fill="#b5a18a"/><path d="M21 19 34 7l8 2 14 14-10 10-13-14-8 5z" fill="#95a3a8"/><path d="m37 15 10 10" stroke="#d8dedb"/>',
  cooking:'<path d="M12 27h40v18c0 16-40 16-40 0z" fill="#788b80" stroke="none"/><path d="M9 26h46M5 32h7m40 0h7" stroke-width="3"/><path d="M23 19c-5-7 6-7 1-14m9 14c-5-7 6-7 1-14m9 14c-5-7 6-7 1-14" stroke="#a2b2aa" stroke-width="2.4"/><path d="M18 37h28" stroke="#dfe4dd"/>',
  crafting:'<path d="M7 13h50v8c0 8-12 12-19 12v10l11 9H18l10-9V33C17 33 5 27 3 20h4z" fill="#788b80" stroke="none"/><path d="M16 55h36" stroke="#788b80" stroke-width="3"/>',
  artistic:'<path d="M32 8C3 9 0 45 20 54c8 4 18 0 15-8-2-6 4-10 11-7 16 6 19-32-14-31Z" fill="#c8b89f"/><circle cx="19" cy="23" r="5" fill="#91a89b"/><circle cx="34" cy="17" r="4" fill="#99a7b5"/><circle cx="47" cy="25" r="4" fill="#b89b85"/><path d="m24 53 26-36 5 4-23 36z" fill="#a48a6e"/><path d="m49 18 5-9 6-3-1 8-5 8z" fill="#7e9388"/>',
  medicine:'<path d="M26 7h12v19h19v12H38v19H26V38H7V26h19z" fill="#788b80" stroke="none"/>',
  social:'<circle cx="22" cy="20" r="10" fill="#987f62" stroke="none"/><circle cx="46" cy="25" r="8" fill="#b09a7c" stroke="none"/><path d="M5 55V43c0-17 34-17 34 0v12z" fill="#987f62" stroke="none"/><path d="M42 55V40c8-8 20-3 20 7v8z" fill="#b09a7c" stroke="none"/>',
  intellectual:'<path d="M7 14c10-4 18-2 25 4 7-6 15-8 25-4v39c-10-4-18-2-25 4-7-6-15-8-25-4z" fill="#788b80" stroke="none"/><path d="M32 19v37M13 23l12 3m-12 7 12 3m14-10 12-3m-12 13 12-3" stroke="#e6e8db"/><path d="M19 6h26" stroke="#bfa67e"/>',
  journal:'<path d="M7 13c10-4 18-2 24 3v39c-6-5-14-7-24-3zM57 13c-10-4-18-2-24 3v39c6-5 14-7 24-3z" fill="#987f62" stroke="none"/><path d="M32 17v36" stroke="#e8e0ce"/>',
  gear:'<path d="M9 23h46v28c0 4-3 6-6 6H15c-3 0-6-2-6-6z" fill="#a38d6e" stroke="none"/><path d="M22 23v-7c0-12 20-12 20 0v7" stroke="#a38d6e" stroke-width="4"/><path d="M9 31c13 11 33 11 46 0" stroke="#eee7d8" stroke-width="2"/><rect x="28" y="32" width="8" height="9" rx="2" fill="#eee7d8" stroke="none"/>',
  bio:'<path d="M31 50C11 46 5 27 9 10c18 0 26 13 22 40ZM34 50C29 26 41 12 57 10c2 21-6 36-23 40Z" fill="#8b9f87" stroke="none"/><path d="M31 57V31M33 51l13-23M30 48 18 27" stroke="#73866e"/>',
  needs:'<path d="M31 20c-12-10-26-3-26 12 0 19 12 28 22 24 3-2 6-2 10 0 11 4 23-9 22-25-1-16-15-21-28-11Z" fill="#aa8c70" stroke="none"/><path d="M31 19 29 7" stroke="#89755e" stroke-width="3"/><path d="M34 14c1-9 9-12 16-10-2 8-8 12-16 10Z" fill="#8ca080" stroke="none"/>',
  health:'<path d="M25 7h14v18h18v14H39v18H25V39H7V25h18z" fill="#788b80" stroke="none"/>',
  prisoner:'<path d="M8 9h48v47H8z" fill="#d1d1c2"/><circle cx="32" cy="26" r="8" fill="#bca98f"/><path d="M19 53V45c0-18 26-18 26 0v8" fill="#a5b7b4"/><path d="M18 9v47M32 9v47M46 9v47M8 16h48m-48 33h48" stroke="#88979b" stroke-width="3"/>',
  roof:'<path d="m5 30 27-21 27 21-6 7-21-16-21 16z" fill="#ad9985"/><path d="M15 36v19h34V36" stroke="#a7b4b1" stroke-width="2.5"/>',
  wall:'<path d="M8 14h48v42H8z" fill="#b7b9ac"/><path d="M8 28h48M8 42h48M25 14v14m16 0v14M25 42v14" stroke="#eae9df" stroke-width="2.5"/>',
  temperature:'<path d="M25 12a7 7 0 0 1 14 0v25a13 13 0 1 1-14 0z" fill="#eee9dc"/><path d="M32 19v24" stroke="#bc9c87" stroke-width="5"/><circle cx="32" cy="48" r="7" fill="#bc9c87" stroke="none"/><path d="M43 16h6m-6 10h6m-6 10h6" stroke="#9facb1"/>',
  pause:'<rect x="19" y="10" width="9" height="44" rx="2" fill="#7f938c" stroke="none"/><rect x="36" y="10" width="9" height="44" rx="2" fill="#7f938c" stroke="none"/>',
  play:'<path d="M19 11c0-2 2-3 4-2l30 21c2 1 2 3 0 4L23 55c-2 1-4 0-4-2z" fill="#7f938c" stroke="none"/>',
  'speed-double':'<path d="m7 15 22 17L7 49zM35 15l22 17-22 17z" fill="#7f938c" stroke="none"/>',
  'speed-triple':'<path d="m4 18 16 14L4 46zM24 18l16 14-16 14zM44 18l16 14-16 14z" fill="#7f938c" stroke="none"/>',
  'cursor-link':'<path d="M24 49V20c0-8 10-8 10 0v15-28c0-7 10-7 10 0v28-13c0-7 10-7 10 0v18-8c0-7 10-7 10 0v18c0 18-35 24-44 5L8 40c-6-9 2-16 8-10l8 8z" fill="#f1eadb"/>',
  'cursor-wait':'<path d="M18 8h30M18 56h30M23 8c0 15 19 20 19 24S23 41 23 56M42 8c0 15-19 20-19 24s19 9 19 24"/><path d="m25 51 8-10 7 10z" fill="#b8aa8e"/>',
  'cursor-zoom':'<circle cx="26" cy="26" r="18" fill="#e9eee7"/><path d="m40 40 17 17" stroke="#a79884" stroke-width="6"/><path d="M17 26h18M26 17v18"/>',
  'cursor-text':'<path d="M21 6h22M32 6v52M21 58h22" stroke-width="3"/>',
  'cursor-grab':'<path d="M18 34V16c0-7 8-7 8 0v14-23c0-7 9-7 9 0v23-21c0-7 9-7 9 0v23-15c0-7 9-7 9 0v29c0 19-29 20-36 8L7 37c-5-8 4-13 10-6z" fill="#f1eadb"/>',
  'cursor-grabbing':'<path d="M14 31V20c0-8 10-8 10 0v5-12c0-7 10-7 10 0v11-8c0-7 10-7 10 0v10-5c0-7 10-7 10 0v25c0 17-32 16-37 6L7 36c-4-9 4-14 9-6z" fill="#e6ddc9"/>',
  'cursor-forbidden':'<circle cx="32" cy="32" r="25" fill="#eee8dd"/><path d="m15 15 34 34" stroke="#b2958d" stroke-width="6"/>',
  'cursor-resize':'<path d="m8 8 48 48M8 25V8h17M39 56h17V39" stroke-width="4"/>',
};
const cloud='<path d="M15 39a10 10 0 0 1 0-20c1-13 20-15 25-4 13-4 23 15 10 24z" fill="#ced7d4"/>';
const rain='<path d="m20 46-4 8m18-8-4 8m18-8-4 8" stroke="#94aeb8" stroke-width="3"/>';
const lightning='<path d="m34 30-13 16h10l-4 13 17-20H33l6-9z" fill="#baa989" stroke="none"/>';
const snow='<path d="M19 46v12m-5-9 10 6m0-6-10 6M43 46v12m-5-9 10 6m0-6-10 6" stroke="#a9bac0" stroke-width="2"/>';
const weatherBodies:Readonly<Record<string,string>>={
  'weather-clear':'<circle cx="32" cy="32" r="14" fill="#d0bb93" stroke="none"/><path d="M32 4v7m0 42v7M4 32h7m42 0h7M12 12l5 5m30 30 5 5M12 52l5-5m30-30 5-5" stroke="#c2b392" stroke-width="2.5"/>',
  'weather-fog':cloud+'<path d="M10 45h44M15 52h35" stroke="#aebdb8" stroke-width="3"/>',
  'weather-rain':cloud+rain,
  'weather-dry-thunderstorm':cloud+lightning,
  'weather-rainy-thunderstorm':cloud+rain+lightning,
  'weather-foggy-rain':cloud+'<path d="m20 42-3 6m24-6-3 6M10 54h44" stroke="#99acb4" stroke-width="3"/>',
  'weather-snow-gentle':cloud+snow,
  'weather-snow-hard':cloud+snow+'<circle cx="32" cy="45" r="2" fill="#a9bac0" stroke="none"/><circle cx="32" cy="57" r="2" fill="#a9bac0" stroke="none"/>',
  moon:'<path d="M44 9C18 5 6 27 17 46c10 18 34 16 43-2-23 7-40-14-16-35z" fill="#b6c2c4" stroke="none"/>',
  wind:'<path d="M6 22h35c17 0 15-21 2-15M4 33h48c12 0 9 18-3 15M10 44h21c10 0 10 14 1 14" stroke="#9badab" stroke-width="3"/>',
};
const aliases:Readonly<Record<string,string>>={select:'pointer',work:'chop',schedule:'clock',assign:'people',mining:'mine',plants:'growing','remove-growing':'growing','remove-stockpile':'stockpile','remove-home':'home'};
const registry:Readonly<Record<string,string>>={...bodies,...paperBodies,...weatherBodies};
/** Muted pigments and light rounded edges, without gradients or live filters. */
const pigments:Readonly<Record<string,string>>={
  '#262238':'#59645f','#a9652c':'#a28e76','#8296b0':'#7d8c84','#ff6b5e':'#b6968d',
  '#ffc23c':'#c8b48f','#fff7e9':'#f2ecdf','#bc813a':'#b5a184','#62778c':'#8999a0',
  '#2b9b78':'#8ca596','#bb8548':'#b4a084','#3e9bff':'#96aabb','#efc05b':'#c8b48f',
  '#e7b384':'#c6af96','#a77554':'#ad947e','#2fc98e':'#9eb6a5','#c59b68':'#baa78c',
  '#c57a39':'#b4a085','#78c7ec':'#b0c4c7','#9d7155':'#ab9783','#ae7b4b':'#ae9980',
  '#deb46d':'#c6b697','#c4b6a6':'#c6c4b5','#dce5ed':'#dfe5df','#e1e7ed':'#e1e5df','#d8e2e6':'#dce2dc',
};
function paperPigment(body:string):string {
  return body.replace(/#[\da-f]{6}/gi,color=>pigments[color.toLowerCase()]??color)
    .replace(/stroke-width="([\d.]+)"/g,(_attribute,width:string)=>`stroke-width="${Math.min(2.6,Number(width)*.64)}"`);
}
export const PICTOGRAM_IDS=Object.freeze([...Object.keys(registry),...Object.keys(aliases)]);
export const PAPER_PICTOGRAM_DIRECTORY='/assets/ui/elsewhere/v317';
export function paperPictogramUrl(id:string):string {
  if(!registry[aliases[id]??id])throw new Error(`Missing pictogram: ${id}`);
  return `${PAPER_PICTOGRAM_DIRECTORY}/${encodeURIComponent(id)}.svg`;
}
export function pictogramSvg(id:string):string {
  const target=aliases[id]??id,body=registry[target];
  if(!body)throw new Error(`Missing pictogram: ${id}`);
  const removal=id.startsWith('remove-')&&!registry[id]?'<path d="m39 6 16 16m0-16L39 22" stroke="#b6968d" stroke-width="3.5"/>':'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 64 64" data-pictogram="${id}" data-style="paper-v317"><g stroke="${ink}" stroke-width="1.2" stroke-opacity=".78" stroke-linejoin="round" stroke-linecap="round" fill="none">${paperPigment(body+removal)}</g></svg>`;
}
const urls=new Map<string,string>();
export function pictogramDataUrl(id:string):string {let url=urls.get(id);if(!url){url=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(pictogramSvg(id))}`;urls.set(id,url);}return url;}

export const UI_ATLAS_URL='/assets/ui/elsewhere/v317/ui.svg';
const FODDER_MODEL_ICONS:Readonly<Record<string,string>>=Object.freeze({
  'item-hay':'/assets/ui/elsewhere/v316/hay.svg',
  'item-kibble':'/assets/ui/elsewhere/v316/kibble.svg',
  'crop-haygrass':'/assets/ui/elsewhere/v316/haygrass.svg',
  'resource-haygrass':'/assets/ui/elsewhere/v316/haygrass.svg',
});
export function modelIconUrl(id:string):string {const fodder=FODDER_MODEL_ICONS[id];if(fodder)return fodder;const version=id==='spike-trap'?'v315':id==='electric-crematorium'?'v314':id==='double-bed'?'v313':id==='electric-smelter'?'v311':id==='animal-sleeping-spot'?'v310':id==='dresser'||id==='sandbags'||id==='mini-turret'?'v308':'v304';return `/assets/ui/elsewhere/${version}/${encodeURIComponent(id)}.svg`;}
