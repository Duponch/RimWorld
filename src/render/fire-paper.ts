/** Heights and sizes shared by the resident flame and smoke draws. */
export const PAPER_FIRE_HEIGHT=1.6;

export function groundFireVisualScale(size:number):number {
  return Math.max(.46,size*1.25);
}

export function groundFireSmokeProfile(size:number):{originY:number;rise:number;breadth:number} {
  const flameHeight=PAPER_FIRE_HEIGHT*groundFireVisualScale(size);
  return {
    originY:Math.max(.45,flameHeight*.84),
    rise:Math.max(1.12,flameHeight*1.18),
    breadth:Math.max(.53,groundFireVisualScale(size)*.62),
  };
}
