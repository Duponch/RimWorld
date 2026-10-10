/** Original vector tools. These actions have no physical object model; every
 * silhouette is shared by menus, cursors and map markers. */
const ink='#262238',wood='#a9652c',metal='#8296b0';
const bodies:Readonly<Record<string,string>>={
  passion:'<path d="M34 5c9 17-5 19 5 27 6-4 7-11 7-11 24 25-1 43-17 40S4 40 14 29c3 12 11 7 10-1C24 18 34 17 34 5Z" fill="#ff6b5e"/><path d="M32 33c-9 14-10 18 0 25 11-6 10-14 0-25Z" fill="#ffc23c"/>',
  pointer:'<path d="M13 7v43l12-13 10 20 8-4-10-19h17z" fill="#fff7e9"/>',
  mine:`<path d="m17 54 7 4 29-38-7-6z" fill="${wood}"/><path d="M9 14Q31-2 58 23L48 27Q34 11 9 14Z" fill="${metal}"/>`,
  chop:`<path d="m14 55 7 4 29-41-7-5z" fill="${wood}"/><path d="m33 8 10 4C43 23 48 28 59 30L49 44C36 36 30 24 33 8Z" fill="${metal}"/><path d="M55 30 47 40" stroke="#dce5ed" stroke-width="3"/>`,
  harvest:`<path d="m15 54 9 3 12-26-8-4z" fill="${wood}"/><path d="M29 29C57 25 63 3 33 5 47 10 49 20 29 24Z" fill="${metal}"/>`,
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
const aliases:Readonly<Record<string,string>>={select:'pointer',work:'chop',schedule:'clock',assign:'people','remove-growing':'growing','remove-stockpile':'stockpile','remove-home':'home'};
export const PICTOGRAM_IDS=Object.freeze([...Object.keys(bodies),...Object.keys(aliases)]);
export function pictogramSvg(id:string):string {
  const target=aliases[id]??id,body=bodies[target];
  if(!body)throw new Error(`Missing pictogram: ${id}`);
  const removal=id.startsWith('remove-')&&!bodies[id]?'<path d="m39 6 16 16m0-16L39 22" stroke="#ff6b5e" stroke-width="5"/>':'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 64 64" data-pictogram="${id}"><g stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" fill="none">${body}${removal}</g></svg>`;
}
const urls=new Map<string,string>();
export function pictogramDataUrl(id:string):string {let url=urls.get(id);if(!url){url=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(pictogramSvg(id))}`;urls.set(id,url);}return url;}

export const UI_ATLAS_URL='/assets/ui/elsewhere/v304/ui.svg';
export function modelIconUrl(id:string):string {return `/assets/ui/elsewhere/v304/${encodeURIComponent(id)}.svg`;}
