// Interactive brow studio: local, visual controls over existing cosmetic state.
import {browFrame} from './brow-templates.js';

export function mountBrowStudio(viewer,{getSource,getPoints,getState,getPreview,before,change}){
  const host=document.createElement('section');
  host.className='brow-studio';
  host.innerHTML=`<div class="brow-studio-head"><strong>Thiết kế chân mày</strong><small>Kéo điểm trên vùng phóng to</small></div>
    <div class="brow-studio-bar" role="group" aria-label="Chọn bên mày">
      <button type="button" data-side="left" aria-pressed="true">Mày trái</button>
      <button type="button" data-side="right" aria-pressed="false">Mày phải</button>
    </div>
    <div class="brow-studio-frame"><canvas aria-label="Ảnh phóng to để căn dáng chân mày"></canvas>
      <div class="brow-studio-empty">Dựng mặt 3D để chỉnh chân mày</div></div>
    <p class="brow-studio-help">Kéo <b>1 Đầu</b> để dịch chuyển, <b>2 Đỉnh</b> để nâng/hạ, <b>3 Đuôi</b> để đổi chiều dài và hướng đuôi. Đây là mô phỏng minh họa.</p>
    <div class="brow-studio-styles" role="group" aria-label="Hiệu ứng mày">
      <button type="button" data-style="strokes">Sợi</button>
      <button type="button" data-style="powder">Bột</button>
      <button type="button" data-style="ombre">Ombre</button>
      <button type="button" data-style="hybrid">Đầu sợi / Đuôi bột</button>
    </div>`;
  const panel=viewer.querySelector('#cosmetics');
  if(!panel)throw Error('Missing cosmetic panel');
  panel.querySelector('.cosmetic-services')?.after(host);
  const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d');
  const empty=host.querySelector('.brow-studio-empty');
  let side='left',drag=null,geometry=null;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const settings=()=>getState().brows[side];
  function render(){
    const source=getSource(),points=getPoints(),state=getState();
    const enabled=!!(source&&points&&state);
    empty.hidden=enabled;canvas.hidden=!enabled;
    host.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(state?.brows.style===b.dataset.style)));
    if(!enabled){geometry=null;return}
    const w=720,h=300;canvas.width=w;canvas.height=h;
    const frame=browFrame(points,side,settings(),source.width,source.height);
    const cx=frame.cx,cy=frame.cy,span=Math.max(24,frame.naturalWidth);
    const cropW=span*2.1,cropH=span*.87;
    geometry={x:cx-cropW/2,y:cy-cropH*.48,w:cropW,h:cropH,frame};
    const fromImage=(x,y)=>[(x-geometry.x)*w/cropW,(y-geometry.y)*h/cropH];
    ctx.fillStyle='#ecece7';ctx.fillRect(0,0,w,h);
    const preview=getPreview()||source;
    ctx.drawImage(preview,geometry.x,geometry.y,geometry.w,geometry.h,0,0,w,h);
    const {angle,span:len,cx:mx,cy:my}=frame;
    const sin=Math.sin(angle),cos=Math.cos(angle),dir=side==='left'?1:-1;
    const point=(t,yOffset=0)=>[mx+(t-.5)*len*cos-yOffset*len*sin*dir,
      my+(t-.5)*len*sin+yOffset*len*cos*dir];
    const arch=settings().arch/100;
    const a=point(.04),b=point(.62,-.14-arch),c=point(.98);
    const path=[a,b,c].map(([x,y])=>fromImage(x,y));
    ctx.lineWidth=2;ctx.strokeStyle='#e9c77b';ctx.setLineDash([7,5]);ctx.beginPath();
    ctx.moveTo(...path[0]);ctx.quadraticCurveTo(...path[1],...path[2]);ctx.stroke();ctx.setLineDash([]);
    const labels=['1 Đầu','2 Đỉnh','3 Đuôi'];
    path.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#1b5646';ctx.stroke();
      ctx.fillStyle='#173d32';ctx.font='bold 16px sans-serif';ctx.fillText(labels[i],x+16,y-12)});
    geometry.handles=path;
  }
  function position(event){
    const rect=canvas.getBoundingClientRect();
    return [(event.clientX-rect.left)*canvas.width/Math.max(1,rect.width),
      (event.clientY-rect.top)*canvas.height/Math.max(1,rect.height)];
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!geometry||!getState()?.brows||!getPoints())return;
    const [x,y]=position(event);
    const idx=geometry.handles.findIndex(([a,b])=>Math.hypot(x-a,y-b)<34);
    if(idx<0)return;
    before();
    drag={id:event.pointerId,idx,x,y,initial:{...settings()},frame:{...geometry.frame}};
    getState().brows.enabled=true;
    canvas.setPointerCapture(event.pointerId);event.preventDefault();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id||!geometry)return;
    const [x,y]=position(event),dx=(x-drag.x)*geometry.w/canvas.width,dy=(y-drag.y)*geometry.h/canvas.height;
    const s=settings(),span=Math.max(1,drag.frame.naturalWidth);
    if(drag.idx===0){
      s.x=clamp(drag.initial.x+dx/span*100,-20,20);
      s.y=clamp(drag.initial.y+dy/span*100,-20,20);
    }else if(drag.idx===1){
      s.arch=clamp(drag.initial.arch-dy/span*100,-20,30);
    }else{
      s.length=clamp(drag.initial.length+dx/span*100*(side==='left'?1:-1),70,130);
      s.rotation=clamp(drag.initial.rotation+Math.atan2(dy,Math.max(20,span))*180/Math.PI*(side==='left'?1:-1),-15,15);
    }
    // Preserve linked controls, including mirrored horizontal position/rotation.
    const brows=getState().brows;
    if(brows.linked){const other=brows[side==='left'?'right':'left'];for(const k of ['x','y','arch','length','rotation'])other[k]=s[k]*(k==='x'||k==='rotation'?-1:1)}
    change();render();
  });
  function finish(event){if(drag&&(!event||event.pointerId===drag.id)){drag=null;render()}}
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
  host.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{side=b.dataset.side;
    host.querySelectorAll('[data-side]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.side===side)));render()});
  host.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{
    if(!getSource()||!getPoints())return;
    before();getState().brows.style=b.dataset.style;getState().brows.enabled=true;change();render()
  });
  return {render,clear(){drag=null;geometry=null;side='left';host.querySelectorAll('[data-side]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.side===side)));render()}};
}
