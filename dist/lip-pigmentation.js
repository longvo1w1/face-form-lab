// Illustration-only lip tone equalization. NOT a model of pigment removal,
// treatment efficacy, laser action, or clinical outcomes.
import {LIP_OUTER,LIP_INNER,inside} from './cosmetics.js';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
function edgeDistance(x,y,poly){let min=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1));min=Math.min(min,Math.hypot(x-a.x-t*dx,y-a.y-t*dy))}return min}
export const freshPigmentPreview=()=>({enabled:false,strength:52,evenness:60,neutralize:38,texture:90,softness:62,color:'#bb7880'});
export function applyPigmentPreview(image,points,s){
 if(!s?.enabled||s.strength<=0)return image;
 const outer=LIP_OUTER.map(i=>points[i]),inner=LIP_INNER.map(i=>points[i]);
 if([...outer,...inner].some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return image;
 const {width:w,height:h,data}=image;
 const rgb=[1,3,5].map(i=>parseInt(s.color.slice(i,i+2),16));if(rgb.some(n=>!Number.isFinite(n)))return image;
 const x0=Math.max(0,Math.floor(Math.min(...outer.map(p=>p.x))*w)),x1=Math.min(w-1,Math.ceil(Math.max(...outer.map(p=>p.x))*w));
 const y0=Math.max(0,Math.floor(Math.min(...outer.map(p=>p.y))*h)),y1=Math.min(h-1,Math.ceil(Math.max(...outer.map(p=>p.y))*h));
 const feather=Math.max(1/w,.002+(s.softness/100)*.014);
 const pixels=[];
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const nx=(x+.5)/w,ny=(y+.5)/h;
  if(!inside(nx,ny,outer)||inside(nx,ny,inner))continue;
  const i=(y*w+x)*4,lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
  pixels.push({i,nx,ny,lum});
 }
 if(!pixels.length)return image;
 const sorted=pixels.map(p=>p.lum).sort((a,b)=>a-b);
 const reference=sorted[Math.floor(sorted.length*.62)];
 for(const p of pixels){
  const edge=Math.min(edgeDistance(p.nx,p.ny,outer),edgeDistance(p.nx,p.ny,inner));
  const a=clamp(edge/feather)*(s.strength/100);
  const shadow=clamp((reference-p.lum)/Math.max(reference,30),0,.65);
  const correction=shadow*(s.evenness/100)*36;
  const warmth=s.neutralize/100*.25;
  for(let k=0;k<3;k++){
   const original=data[p.i+k];
   const target=original+correction*(k===2?.65:1)+((rgb[k]-original)*warmth);
   // Preserve native texture and bound luminance lift per pixel.
   const maxLift=(1-s.texture/100)*24+18;
   data[p.i+k]=Math.round(clamp(original+clamp((target-original)*a,-12,maxLift),0,255));
  }
 }
 return image;
}
