// Original procedural templates; no third-party imagery, code or model weights.
export const BROW_TEMPLATES=[
 {id:'soft',name:'Cong mềm',lift:.13,tail:.06,thick:.145,peak:.58},
 {id:'straight',name:'Ngang Hàn',lift:.025,tail:.02,thick:.15,peak:.65},
 {id:'arch',name:'Cánh cung',lift:.25,tail:.09,thick:.13,peak:.65},
 {id:'lift',name:'Đuôi nâng',lift:.18,tail:-.10,thick:.135,peak:.70},
 {id:'full',name:'Sợi tự nhiên',lift:.09,tail:.035,thick:.205,peak:.53},
 {id:'slim',name:'Thanh mảnh',lift:.17,tail:.07,thick:.085,peak:.62}
];
export function profile(t,preset,arch=0){const p=BROW_TEMPLATES.find(p=>p.id===preset)||BROW_TEMPLATES[0];const curve=t<p.peak?Math.sin(t/p.peak*Math.PI/2):Math.cos((t-p.peak)/(1-p.peak)*Math.PI/2);return {y:-curve*(p.lift+arch/100)+p.tail*t,half:p.thick/2*Math.max(0,Math.sin(Math.PI*(.18+.82*t)))**.65*(1-.65*t)}}
export function templateAlpha(t,v,preset,arch=0,style='strokes',outline=false){if(t<=0||t>=1)return 0;const p=profile(t,preset,arch),d=Math.abs(v-p.y),edge=(p.half-d)/.012;if(outline)return Math.max(0,1-Math.abs(d-p.half)/.008);if(edge<=0)return 0;const border=Math.min(1,edge*2.2),head=Math.min(1,t/.055);if(style==='powder')return border*head*(.68+.15*Math.sin(t*211+v*137));const strand=Math.max(0,Math.sin(t*540+v*(t<.25?35:78)+Math.sin(t*71)*.8))**9;if(style==='ombre')return border*head*(.20+.75*Math.pow(t,.8))*(.8+.08*Math.sin(t*127+v*37));if(style==='hybrid')return border*head*(t<.46?(.36+.64*strand):(.36+.55*(t-.46)/.54));return border*head*(.42+.58*strand)}
export function browFrame(points,side,settings,width,height){const ids=side==='left'?[336,296,334,293,300,276,283,282,295,285]:[107,66,105,63,70,46,53,52,65,55];const src=ids.map(i=>({x:points[i].x*width,y:points[i].y*height}));const inner=src[0],tail=src[4],cx=(inner.x+tail.x)/2,cy=src.reduce((s,p)=>s+p.y,0)/10;const naturalWidth=Math.hypot(tail.x-inner.x,tail.y-inner.y);return {src,cx:cx+settings.x*naturalWidth/100,cy:cy+settings.y*naturalWidth/100,span:naturalWidth*settings.length/100,thickness:settings.thickness/100,angle:Math.atan2(tail.y-inner.y,tail.x-inner.x)+settings.rotation*Math.PI/180,side,naturalWidth}}
function mix(data,i,color,a){a=Math.max(0,Math.min(1,a));for(let k=0;k<3;k++)data[i+k]=Math.round(data[i+k]*(1-a)+color[k]*a)}
// Skin approximation above the original brow; deliberately opt-in, not medical prediction.
// Source brow suppression uses a narrow curved feathered band, not the previous
// large ellipse that wiped nearby forehead/temple texture.
export function fadeOriginal(image,frame,strength){
 if(!strength||frame.span<2)return;
 const {width:w,height:h,data}=image,source=data.slice();
 const cos=Math.cos(frame.angle),sin=Math.sin(frame.angle);
 const half=Math.max(2,frame.naturalWidth*.095),fade=Math.min(.34,strength/100*.34);
 const radius=frame.naturalWidth*.7;
 for(let y=Math.max(0,Math.floor(frame.cy-radius));y<=Math.min(h-1,Math.ceil(frame.cy+radius));y++)
 for(let x=Math.max(0,Math.floor(frame.cx-radius));x<=Math.min(w-1,Math.ceil(frame.cx+radius));x++){
  const dx=x+.5-frame.cx,dy=y+.5-frame.cy;
  const t=(dx*cos+dy*sin)/frame.naturalWidth+.5;
  const perp=-dx*sin+dy*cos;
  if(t<=.04||t>=.96||Math.abs(perp)>half)continue;
  const edge=Math.min(1,(t-.04)/.08,(.96-t)/.08,(half-Math.abs(perp))/(half*.45));
  if(edge<=0)continue;
  // Sample skin just above this brow at the same along-brow position.
  const sx=Math.max(0,Math.min(w-1,Math.round(x+sin*half*1.7)));
  const sy=Math.max(0,Math.min(h-1,Math.round(y-cos*half*1.7)));
  const i=(y*w+x)*4,j=(sy*w+sx)*4;
  const skin=[source[j],source[j+1],source[j+2]];
  const luminance=.2126*source[i]+.7152*source[i+1]+.0722*source[i+2];
  const sampleLum=.2126*skin[0]+.7152*skin[1]+.0722*skin[2];
  // Conceal dark hair preferentially; don't repaint already light skin.
  const dark=Math.max(0,Math.min(1,(sampleLum-luminance+8)/55));
  mix(data,i,skin,fade*edge*dark);
 }
}
export function applyBrowTemplates(image,points,brows){
 if(brows.opacity<=0)return image;
 const {width:w,height:h,data}=image,color=[1,3,5].map(i=>parseInt(brows.color.slice(i,i+2),16));
 for(const side of ['left','right']){
  const frame=browFrame(points,side,brows[side],w,h);
  if(frame.span<2||!Number.isFinite(frame.angle))continue;
  if(brows.mode==='replace'&&!brows.outline)fadeOriginal(image,frame,brows.fade??35);
  const cos=Math.cos(frame.angle),sin=Math.sin(frame.angle),radius=frame.span*.62;
  for(let y=Math.max(0,Math.floor(frame.cy-radius));y<=Math.min(h-1,Math.ceil(frame.cy+radius));y++)
  for(let x=Math.max(0,Math.floor(frame.cx-radius));x<=Math.min(w-1,Math.ceil(frame.cx+radius));x++){
   const dx=x+.5-frame.cx,dy=y+.5-frame.cy,t=(dx*cos+dy*sin)/frame.span+.5;
   if(t<=.055||t>=.945)continue;
   const sign=side==='left'?1:-1;
   const v=(-dx*sin+dy*cos)/frame.span*sign/frame.thickness;
   // Narrow the synthetic brow and keep its tail inside the natural crop.
   const preset=brows.preset,arc=Math.max(-12,Math.min(15,brows[side].arch));
   const normalizedV=v*1.28;
   const pigment=templateAlpha(t,normalizedV,preset,arc,brows.style,brows.outline);
   if(pigment<=0)continue;
   const tailSoft=Math.min(1,(.945-t)/.12,(t-.055)/.08);
   const originalLum=.2126*data[(y*w+x)*4]+.7152*data[(y*w+x)*4+1]+.0722*data[(y*w+x)*4+2];
   const darkProtect=brows.mode==='replace'?Math.max(.35,Math.min(1,(originalLum-30)/85)):.65;
   const clarity=brows.clarity==='natural'?.62:.85;
   const a=Math.min(.56,pigment*brows.opacity/100*clarity*tailSoft*darkProtect);
   if(a>0)mix(data,(y*w+x)*4,color,a);
  }
 }
 return image;
}
export function previewPath(preset){const top=[],bottom=[];for(let i=0;i<=40;i++){const t=i/40,p=profile(t,preset);top.push(`${(8+t*144).toFixed(2)},${(34+(p.y-p.half)*100).toFixed(2)}`);bottom.unshift(`${(8+t*144).toFixed(2)},${(34+(p.y+p.half)*100).toFixed(2)}`)}return 'M'+top.join(' L')+' L'+bottom.join(' L')+' Z'}
