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
export function fadeOriginal(image,frame,strength){if(!strength)return;const {width:w,height:h,data}=image,source=data.slice(),xs=frame.src.map(p=>p.x),ys=frame.src.map(p=>p.y);const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),bh=Math.max(bottom-top,frame.naturalWidth*.09);const cx=(left+right)/2,cy=(top+bottom)/2,rx=(right-left)/2+bh*.2,ry=bh*.8;
 for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(h-1,Math.ceil(cy+ry));y++)for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(w-1,Math.ceil(cx+rx));x++){const r=((x-cx)/rx)**2+((y-cy)/ry)**2;if(r>=1)continue;const skin=[0,0,0];for(const dx of [-2,0,2]){const sx=Math.max(0,Math.min(w-1,x+dx)),sy=Math.max(0,Math.min(h-1,Math.floor(top-bh*.9)));const i=(sy*w+sx)*4;for(let k=0;k<3;k++)skin[k]+=source[i+k]/3}mix(data,(y*w+x)*4,skin,Math.min(.52,strength/100*.52)*Math.min(1,(1-r)*3.2))}}
export function applyBrowTemplates(image,points,brows){if(brows.opacity<=0)return image;const {width:w,height:h,data}=image,color=[1,3,5].map(i=>parseInt(brows.color.slice(i,i+2),16));
 for(const side of ['left','right']){const frame=browFrame(points,side,brows[side],w,h);if(frame.span<2)continue;if(brows.mode==='replace'&&!brows.outline)fadeOriginal(image,frame,brows.fade??75);const cos=Math.cos(frame.angle),sin=Math.sin(frame.angle),radius=frame.span*.85;
 for(let y=Math.max(0,Math.floor(frame.cy-radius));y<=Math.min(h-1,Math.ceil(frame.cy+radius));y++)for(let x=Math.max(0,Math.floor(frame.cx-radius));x<=Math.min(w-1,Math.ceil(frame.cx+radius));x++){const dx=x+.5-frame.cx,dy=y+.5-frame.cy,t=(dx*cos+dy*sin)/frame.span+.5;
 // Left runs rightward; right runs leftward. Keep 'up' above both eyes.
 const sign=side==='left'?1:-1,v=(-dx*sin+dy*cos)/frame.span*sign/frame.thickness;
 const clarity=brows.clarity==='natural'?.8:1.25;const pigment=templateAlpha(t,v,brows.preset,brows[side].arch,brows.style,brows.outline);const a=Math.min(.98,pigment*brows.opacity/100*clarity);
 if(a>0)mix(data,(y*w+x)*4,color.map(v=>Math.max(0,Math.round(v*(brows.clarity==='natural'?1:.78)))),a);
 }}return image}
export function previewPath(preset){const top=[],bottom=[];for(let i=0;i<=40;i++){const t=i/40,p=profile(t,preset);top.push(`${(8+t*144).toFixed(2)},${(34+(p.y-p.half)*100).toFixed(2)}`);bottom.unshift(`${(8+t*144).toFixed(2)},${(34+(p.y+p.half)*100).toFixed(2)}`)}return 'M'+top.join(' L')+' L'+bottom.join(' L')+' Z'}
