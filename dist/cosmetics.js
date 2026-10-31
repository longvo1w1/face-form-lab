import {applyBrowTemplates} from './brow-templates.js';
import {applyMagnumLips,freshMagnum} from './magnum-lips.js';
// Original implementation. All coordinates live in source-photo UV space.
export const LIP_OUTER=[61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
export const LIP_INNER=[78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95];
export const PALETTE=[['Hồng đào','#c7767f'],['Hồng đất','#a55c69'],['Cam đào','#cf836a'],['Cam đỏ','#bb554c'],['Đỏ hồng','#b64b69'],['Đỏ đất','#965451']];
export const freshCosmetics=()=>({magnum:freshMagnum(),lips:{enabled:false,color:'#c7767f',opacity:45,upper:100,lower:100,feather:25},brows:{enabled:false,color:'#594236',opacity:95,clarity:'defined',guide:true,mode:'overlay',fade:35,style:'strokes',preset:'soft',linked:true,outline:false,left:{thickness:100,length:100,arch:0,x:0,y:0,rotation:0},right:{thickness:100,length:100,arch:0,x:0,y:0,rotation:0}}});
export const clone=value=>JSON.parse(JSON.stringify(value));
export function inside(x,y,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)yes=!yes}return yes}
function distance(x,y,poly){let d=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));d=Math.min(d,Math.hypot(x-a.x-t*dx,y-a.y-t*dy))}return d}
export function lipAlpha(x,y,outer,inner,feather){if(!inside(x,y,outer)||inside(x,y,inner))return 0;return Math.min(1,distance(x,y,outer)/feather,distance(x,y,inner)/feather)}
export function browPolygon(points,side,settings,preset='soft'){
 const ids=side==='left'?[336,296,334,293,300,276,283,282,295,285]:[107,66,105,63,70,46,53,52,65,55];
 const src=ids.map(i=>points[i]);const cx=src.reduce((a,p)=>a+p.x,0)/10,cy=src.reduce((a,p)=>a+p.y,0)/10;
 const width=Math.max(...src.map(p=>p.x))-Math.min(...src.map(p=>p.x));
 const rotation=settings.rotation*Math.PI/180,dir=side==='left'?1:-1;
 return src.map(p=>{let x=(p.x-cx)*settings.length/100,y=(p.y-cy)*settings.thickness/100;
 const t=Math.max(0,Math.min(1,.5+dir*x/(width||1)));
 const lift=(settings.arch/100+(preset==='arch'?.13:preset==='straight'?-.08:0))*width*Math.sin(Math.PI*t);
 y-=lift;return {x:cx+x*Math.cos(rotation)-y*Math.sin(rotation)+settings.x*width/100,y:cy+x*Math.sin(rotation)+y*Math.cos(rotation)+settings.y*width/100}});
}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
export function tintPixel(data,i,color,alpha){const lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2],targetLum=.2126*color[0]+.7152*color[1]+.0722*color[2];const shade=Math.max(.35,Math.min(1.8,lum/(targetLum||1)));for(let k=0;k<3;k++)data[i+k]=Math.round(data[i+k]*(1-alpha)+Math.min(255,color[k]*shade)*alpha)}
function paint(image,poly,color,opacity,weight){const {width:w,height:h,data}=image;const minX=Math.max(0,Math.floor(Math.min(...poly.map(p=>p.x))*w)),maxX=Math.min(w-1,Math.ceil(Math.max(...poly.map(p=>p.x))*w)),minY=Math.max(0,Math.floor(Math.min(...poly.map(p=>p.y))*h)),maxY=Math.min(h-1,Math.ceil(Math.max(...poly.map(p=>p.y))*h));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const nx=(x+.5)/w,ny=(y+.5)/h;if(!inside(nx,ny,poly))continue;const a=opacity*weight(nx,ny,x,y);if(a>0)tintPixel(data,(y*w+x)*4,color,a)}}
export function applyCosmetics(image,points,state){
 if(state.lips.enabled){const outer=LIP_OUTER.map(i=>points[i]),inner=LIP_INNER.map(i=>points[i]);const width=Math.abs(points[291].x-points[61].x),f=Math.max(1/image.width,width*(.005+state.lips.feather/100*.1));
 paint(image,outer,rgb(state.lips.color),state.lips.opacity/100,(x,y)=>{const a=points[61],b=points[291],line=a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x||1);return lipAlpha(x,y,outer,inner,f)*(y<line?state.lips.upper:state.lips.lower)/100});}
 if(state.magnum?.enabled)applyMagnumLips(image,points,state.magnum);
 if(state.brows.enabled)applyBrowTemplates(image,points,state.brows);
 return image;
}
export class CosmeticTexture{
 constructor(source,points){this.source=source;this.points=points;this.canvas=document.createElement('canvas');this.canvas.width=source.width;this.canvas.height=source.height;this.context=this.canvas.getContext('2d',{willReadFrequently:true});}
 update(state){this.context.drawImage(this.source,0,0);const image=this.context.getImageData(0,0,this.canvas.width,this.canvas.height);applyCosmetics(image,this.points,state);this.context.putImageData(image,0,0);return this.canvas;}
 clear(){this.source=null;this.points=null;this.canvas.width=this.canvas.height=1;}
}
