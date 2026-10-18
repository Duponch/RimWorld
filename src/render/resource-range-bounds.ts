/** CPU-only bounds for the immutable vertex ranges of one resident mesh.
 * Each range keeps its current AABB and its radius about that AABB's centre.
 * Updating one range never reads another range's vertices. */
type Range = { vertexStart:number; vertexCount:number };
type Sphere = { center:{set(x:number,y:number,z:number):unknown}; radius:number };
export class ResourceRangeBounds {
  private readonly values:Float64Array;
  private constructor(private readonly ranges:readonly Range[]) {this.values=new Float64Array(ranges.length*7);}
  get byteLength():number {return this.values.byteLength;}
  static capture(positions:ArrayLike<number>,ranges:readonly Range[]):ResourceRangeBounds|undefined {
    let end=0;
    for(const range of ranges){
      if(range.vertexStart!==end||!Number.isSafeInteger(range.vertexCount)||range.vertexCount<=0)return;
      end+=range.vertexCount;
    }
    if(!ranges.length||end*3!==positions.length)return;
    const bounds=new ResourceRangeBounds(ranges);
    for(let i=0;i<ranges.length;i++)if(!bounds.update(i,positions))return;
    return bounds;
  }
  update(index:number,positions:ArrayLike<number>):boolean {
    const range=this.ranges[index]!,start=range.vertexStart*3,end=start+range.vertexCount*3;
    let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    for(let i=start;i<end;i+=3){
      const x=positions[i]!,y=positions[i+1]!,z=positions[i+2]!;
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))return false;
      minX=Math.min(minX,x);minY=Math.min(minY,y);minZ=Math.min(minZ,z);
      maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxZ=Math.max(maxZ,z);
    }
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2,cz=(minZ+maxZ)/2;
    let radiusSq=0;
    for(let i=start;i<end;i+=3){const dx=positions[i]!-cx,dy=positions[i+1]!-cy,dz=positions[i+2]!-cz;radiusSq=Math.max(radiusSq,dx*dx+dy*dy+dz*dz);}
    this.values.set([minX,minY,minZ,maxX,maxY,maxZ,Math.sqrt(radiusSq)],index*7);
    return true;
  }
  writeSphere(sphere:Sphere,padding=0):void {
    const v=this.values;
    let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    for(let i=0;i<v.length;i+=7){minX=Math.min(minX,v[i]!);minY=Math.min(minY,v[i+1]!);minZ=Math.min(minZ,v[i+2]!);maxX=Math.max(maxX,v[i+3]!);maxY=Math.max(maxY,v[i+4]!);maxZ=Math.max(maxZ,v[i+5]!);}
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2,cz=(minZ+maxZ)/2;
    let radius=0;
    for(let i=0;i<v.length;i+=7){const dx=(v[i]!+v[i+3]!)/2-cx,dy=(v[i+1]!+v[i+4]!)/2-cy,dz=(v[i+2]!+v[i+5]!)/2-cz;radius=Math.max(radius,Math.sqrt(dx*dx+dy*dy+dz*dz)+v[i+6]!);}
    // A few ulps cover the additions/square roots of the triangle inequality.
    // Recompute from finite range data: padding never accumulates across reads.
    const roundoff=Number.EPSILON*32*Math.max(1,Math.abs(cx),Math.abs(cy),Math.abs(cz),radius);
    sphere.center.set(cx,cy,cz);sphere.radius=radius+roundoff+padding;
  }
}
