// Collagen lip preview using the matte/glossy finish model described by OpenMakeupSDK.
// OpenMakeupSDK: https://github.com/ehsanwwe/OpenMakeupSDK (MIT).
// Independent texture-space adapter: upstream SDK requires its own camera/WebGL
// lifecycle and is NOT initialized here. No upstream code, assets or weights copied.
// Gloss simulates reflected light, NOT biological collagen or healing.
import {LIP_OUTER,LIP_INNER,inside} from './cosmetics.js';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
function boundary(x,y,poly){let best=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1));best=Math.min(best,Math.hypot(x-a.x-t*dx,y-a.y-t*dy))}return best}
export const freshCollagen=()=>({enabled:false,color:'#c87586',coverage:48,glow:36,texture:85,softness:72,finish:'glossy'});
export function applyCollagenLips(image,points,s){
 if(!s?.enabled||!s.coverage)return image;
 const outer=LIP_OUTER.map(i=>points[i]),inner=LIP_INNER.map(i=>points[i]);
 if([...outer,...inner].some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return image;
 const {width:w,height:h,data}=image;
 const rgb=[1,3,5].map(i=>parseInt(s.color.slice(i,i+2),16));
 if(rgb.some(v=>!Number.isFinite(v)))return image;
 const x0=Math.max(0,Math.floor(Math.min(...outer.map(p=>p.x))*w)),x1=Math.min(w-1,Math.ceil(Math.max(...outer.map(p=>p.x))*w));
 const y0=Math.max(0,Math.floor(Math.min(...outer.map(p=>p.y))*h)),y1=Math.min(h-1,Math.ceil(Math.max(...outer.map(p=>p.y))*h));
 const cx=(points[61].x+points[291].x)/2,cy=(points[0].y+points[17].y)/2;
 const rx=Math.max(.001,Math.abs(points[291].x-points[61].x)/2),ry=Math.max(.001,Math.abs(points[17].y-points[0].y)/2);
 const edgeWidth=Math.max(1/w,.0015+.014*(s.softness/100));
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const nx=(x+.5)/w,ny=(y+.5)/h;if(!inside(nx,ny,outer)||inside(nx,ny,inner))continue;
  const edge=Math.min(boundary(nx,ny,outer),boundary(nx,ny,inner));
  const alpha=clamp(edge/edgeWidth)*s.coverage/100;
  if(alpha<=0)continue;
  const i=(y*w+x)*4,orig=[data[i],data[i+1],data[i+2]];
  const lum=.2126*orig[0]+.7152*orig[1]+.0722*orig[2];
  const local=(lum-125)/125*(s.texture/100)*22;
  const glintX=(nx-cx)/rx,glintY=(ny-(cy-ry*.34))/ry;
  const shine=Math.exp(-((glintX+.18)**2/.23+(glintY+.05)**2/.055));
  const finishGain=s.finish==='matte'?0:s.finish==='satin'?.45:1;
  const highlight=shine*(s.glow/100)*finishGain*38;
  for(let k=0;k<3;k++){
   const blended=orig[k]*(1-alpha)+(rgb[k]+local)*alpha;
   data[i+k]=Math.round(clamp(blended+highlight*clamp(edge/edgeWidth),0,255));
  }
 }
 return image;
}
