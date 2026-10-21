export function validateDenseMesh(data){
 if(data?.engine!=='3ddfa-v2'||data.coordinateSystem!=='normalized-image-mediapipe-z')throw Error('Bộ dựng trả sai định dạng hình học.');
 const {vertices,triangles}=data;
 if(!Array.isArray(vertices)||vertices.length<468||vertices.length>100000||!Array.isArray(triangles)||triangles.length<3||triangles.length>600000||triangles.length%3)throw Error('Kích thước lưới nâng cao không hợp lệ.');
 for(const p of vertices)if(!p||!['x','y','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<10))throw Error('Lưới có tọa độ không hợp lệ.');
 for(const i of triangles)if(!Number.isInteger(i)||i<0||i>=vertices.length)throw Error('Lưới có chỉ số đỉnh không hợp lệ.');
 return {points:vertices,indices:triangles};
}
export class ReconstructionChoice{
 constructor(){this.mode='local';this.endpoint=null;this.controller=null;this.generation=0}
 async mount(container){
  try{
   const response=await fetch(new URL('./reconstruction-config.json',import.meta.url),{cache:'no-store'});
   if(!response.ok)return;const config=await response.json();if(config.enabled!==true)return;
   const endpoint=new URL(config.endpoint,location.href);
   if(endpoint.protocol!=='https:'&&!(endpoint.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)))throw Error('Máy chủ dựng nâng cao cần HTTPS.');
   this.endpoint=endpoint.href.replace(/\/$/,'');
   const panel=document.createElement('section');panel.className='note';
   const label=document.createElement('label');label.textContent='Bộ dựng khuôn mặt';
   const select=document.createElement('select');select.innerHTML='<option value="local">Trên thiết bị</option><option value="dense">Nâng cao · thử nghiệm</option>';label.append(select);
   const consent=document.createElement('label');consent.className='consent';consent.hidden=true;
   const checkbox=document.createElement('input');checkbox.type='checkbox';
   const explanation=document.createElement('span');explanation.textContent='Khách đồng ý gửi ảnh chính diện tới '+endpoint.origin+' để dựng nâng cao. Ảnh được xử lý trong bộ nhớ máy chủ.';
   consent.append(checkbox,explanation);panel.append(label,consent);container.append(panel);
   this.checkbox=checkbox;this.select=select;
   select.onchange=()=>{this.cancel();this.mode=select.value;checkbox.checked=false;consent.hidden=this.mode!=='dense'};
  }catch(e){console.warn('Advanced reconstruction disabled:',e.message)}
 }
 async reconstruct(canvas,landmarks){
  if(this.mode!=='dense')return null;
  if(!this.checkbox?.checked)throw Error('Cần xác nhận riêng việc gửi ảnh đến máy chủ dựng nâng cao, hoặc chọn dựng trên thiết bị.');
  this.cancel();const generation=this.generation;const controller=new AbortController();this.controller=controller;
  const timer=setTimeout(()=>controller.abort(),60000);
  const xs=landmarks.map(p=>p.x),ys=landmarks.map(p=>p.y);
  const payload={image:canvas.toDataURL('image/jpeg',.9).split(',')[1],bounds:[Math.max(0,Math.min(...xs)),Math.max(0,Math.min(...ys)),Math.min(1,Math.max(...xs)),Math.min(1,Math.max(...ys))]};
  try{
   const response=await fetch(this.endpoint+'/reconstruct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
   if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error||'Máy chủ dựng nâng cao chưa sẵn sàng ('+response.status+').')}
   const length=Number(response.headers.get('content-length'));if(length>16000000)throw Error('Lưới trả về quá lớn.');
   const data=await response.json();if(generation!==this.generation)throw Error('Đã hủy dựng nâng cao.');
   return validateDenseMesh(data);
  }finally{clearTimeout(timer);if(this.controller===controller)this.controller=null}
 }
 cancel(){this.generation++;this.controller?.abort();this.controller=null}
 clear(){this.cancel();this.mode='local';if(this.select)this.select.value='local';if(this.checkbox){this.checkbox.checked=false;this.checkbox.parentElement.hidden=true}}
}
