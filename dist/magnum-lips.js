// MagnumLips-inspired illustrative pigment overlay; not a prediction of a branded technique.
import {LIP_OUTER,LIP_INNER,inside} from './cosmetics.js';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
function edgeDistance(x,y,poly){let best=Infinity;for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length];const dx=b.x-a.x,dy=b.y-a.y;const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1));best=Math.min(best,Math.hypot(x-a.x-t*dx,y-a.y-t*dy))}return best}
export const freshMagnum=()=>({enabled:false,color:'#bb6875',coverage:70,gradient:45,softness:55,texture:80,uniformity:70});
export function applyMagnumLips(image,landmarks,settings){
 if(!settings?.enabled||settings.coverage<=0)return image;
 const {width:w,height:h,data}=image;
 const outer=LIP_OUTER.map(i=>landmarks[i]),inner=LIP_INNER.map(i=>landmarks[i]);
 if([...outer,...inner].some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return image;
 const x0=Math.max(0,Math.floor(Math.min(...outer.map(p=>p.x))*w)),x1=Math.min(w-1,Math.ceil(Math.max(...outer.map(p=>p.x))*w));
 const y0=Math.max(0,Math.floor(Math.min(...outer.map(p=>p.y))*h)),y1=Math.min(h-1,Math.ceil(Math.max(...outer.map(p=>p.y))*h));
 const pigment=[1,3,5].map(i=>parseInt(settings.color.slice(i,i+2),16));
 const fade=Math.max(1/w,.0025+(settings.softness/100)*.02);
 const lipCenterY=(landmarks[0].y+landmarks[17].y)/2;
 const lipHeight=Math.max(.001,Math.abs(landmarks[17].y-landmarks[0].y));
 const targetLuma=.2126*pigment[0]+.7152*pigment[1]+.0722*pigment[2];
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const nx=(x+.5)/w,ny=(y+.5)/h;
  if(!inside(nx,ny,outer)||inside(nx,ny,inner))continue;
  const edge=Math.min(edgeDistance(nx,ny,outer),edgeDistance(nx,ny,inner));
  const feather=clamp(edge/fade);
  const radial=clamp(Math.abs(ny-lipCenterY)/(lipHeight*.8));
  const gradient=1-(settings.gradient/100)*radial*.65;
  const i=(y*w+x)*4,old=[data[i],data[i+1],data[i+2]];
  const lum=.2126*old[0]+.7152*old[1]+.0722*old[2];
  const retention=settings.texture/100;
  const lightShift=(lum-targetLuma)*.33*retention;
  const uneven=Math.sin(x*.121+y*.061)*Math.cos(y*.093-x*.047);
  const evenFactor=1+uneven*(1-settings.uniformity/100)*.16;
  const opacity=clamp(settings.coverage/100*gradient*feather*evenFactor);
  for(let j=0;j<3;j++){
   const target=clamp(pigment[j]+lightShift,0,255);
   data[i+j]=Math.round(old[j]*(1-opacity)+target*opacity);
  }
 }
 return image;
}
