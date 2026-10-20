import {CaptureAnalyzer} from './capture-analyzer.js';
import {DEFAULTS,STEPS,assess,CaptureGate} from './capture-quality.js';
const order=['front','left','right'];
const fields={yawTolerance:['Sai số yaw (°)',3,30],pitchTolerance:['Pitch tối đa (°)',3,35],rollTolerance:['Roll tối đa (°)',3,30],minFace:['Chiều cao mặt tối thiểu / ảnh',.1,.8],maxFace:['Chiều cao mặt tối đa / ảnh',.3,.98],centerTolerance:['Lệch tâm tối đa / ảnh',.02,.3],minBrightness:['Độ sáng tối thiểu (0–255)',1,200],maxBrightness:['Độ sáng tối đa (0–255)',100,254],minSharpness:['Phương sai Laplacian tối thiểu',0,5000],stableMs:['Giữ ổn định (ms)',400,10000],countdownMs:['Đếm ngược (ms)',500,10000],motionAngle:['Dao động góc tối đa / mẫu (°)',1,15],motionCenter:['Dao động tâm tối đa / mẫu',.005,.1],intervalMs:['Khoảng xử lý tối thiểu (ms)',150,1500],maxGapMs:['Khoảng mẫu gián đoạn tối đa (ms)',500,4000]};
export class GuidedCapture {
 constructor({onReview,onAutoCapture,onState}){
  this.onReview=onReview;this.onAutoCapture=onAutoCapture;this.onState=onState;
  this.config={...DEFAULTS};this.records=new Map();this.step='front';this.gate=new CaptureGate();this.analyzer=new CaptureAnalyzer();this.generation=0;this.sessionGeneration=0;this.live=false;this.processing=false;this.photoRequest=0;
  const panel=document.createElement('section');panel.id='guided';
  panel.innerHTML=`<h3>Hướng dẫn chụp ba góc</h3><p class="muted">Nhận diện vị trí/góc mặt, không nhận dạng danh tính. Trái/phải là của khách. Camera selfie chỉ lật phần xem trước; ảnh lưu không lật.</p><div id="guidedSteps" class="guided-steps"></div><p id="guideHint" role="status">Chọn chính diện để bắt đầu.</p><progress id="guideProgress" max="1" value="0" aria-label="Tiến trình giữ yên và đếm ngược"></progress><label class="consent"><input id="autoCapture" type="checkbox" checked> Tự chụp khi giữ ổn định</label><button id="retake" type="button" disabled>Chụp lại góc này</button><button id="nextCapture" type="button" disabled>Góc tiếp theo</button><p id="qualitySummary"></p><p class="muted">Ngưỡng thử nghiệm, chưa xác nhận trên iPhone/iPad. Độ sáng/nhòe là kiểm tra ảnh theo quy tắc, có thể sai. Thu đủ ảnh không đồng nghĩa quét 3D nhiều góc; hiện chỉ dựng từ chính diện.</p><details><summary>Hiệu chỉnh ngưỡng thử nghiệm</summary><form id="captureSettings"></form><button id="applyCaptureSettings" type="button">Áp dụng ngưỡng</button><p id="settingsError" role="status"></p></details>`;
  document.querySelector('#cameraBox').before(panel);this.panel=panel;
  // Keep the current instruction and shutter beside the preview on small screens.
  panel.querySelector('#guideHint').before(document.querySelector('#cameraBox'));
  panel.querySelector('#guideHint').after(document.querySelector('.capture-actions'));
  const buttons=panel.querySelector('#guidedSteps');
  for(const [key,step] of Object.entries(STEPS)){
   const b=document.createElement('button');b.type='button';b.dataset.step=key;b.innerHTML=`<span>${step.label}</span><img hidden alt="${step.label}"><small></small>`;b.onclick=()=>this.select(key);buttons.append(b);
  }
  const form=panel.querySelector('#captureSettings');
  for(const [key,[label,min,max]] of Object.entries(fields)){
   const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type='number';input.name=key;input.min=min;input.max=max;input.step=key.includes('Face')||key.includes('Tolerance')&&key==='centerTolerance'||key==='motionCenter'?'.005':'1';input.value=this.config[key];row.append(input);form.append(row);
  }
  form.onsubmit=e=>e.preventDefault();
  panel.querySelector('#applyCaptureSettings').onclick=()=>{
   const values=Object.fromEntries(new FormData(form));const next={...this.config};let error='';
   for(const [key,[,min,max]] of Object.entries(fields)){const value=Number(values[key]);if(!values[key]||!Number.isFinite(value)||value<min||value>max){error='Ngưỡng không hợp lệ: '+fields[key][0];break}next[key]=value}
   if(next.minFace>=next.maxFace||next.minBrightness>=next.maxBrightness||next.maxGapMs<next.intervalMs)error='Kiểm tra min < max và khoảng gián đoạn ≥ khoảng xử lý.';
   panel.querySelector('#settingsError').textContent=error||'Đã áp dụng. Ảnh đã chụp giữ nguyên thông số lúc chụp; chụp lại để đánh giá theo ngưỡng mới.';
   if(!error){this.config=next;this.gate.reset();this.progress(0)}
  };
  panel.querySelector('#autoCapture').onchange=()=>{this.gate.reset();this.progress(0);this.hint(panel.querySelector('#autoCapture').checked?'Đã bật tự chụp; giữ yên khi được hướng dẫn.':'Đã hủy tự chụp. Có thể chụp thủ công.')};
  panel.querySelector('#retake').onclick=()=>{this.records.delete(this.step);this.select(this.step);this.hint('Đã bỏ ảnh góc này. Chụp hoặc chọn ảnh mới.');};
  panel.querySelector('#nextCapture').onclick=()=>{const missing=order.find(k=>!this.records.has(k));if(missing)this.select(missing)};
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='captureOval';svg.setAttribute('aria-hidden','true');svg.innerHTML='<ellipse cx="320" cy="240" rx="125" ry="190"/>';document.querySelector('#cameraBox').append(svg);this.oval=svg;svg.setAttribute('hidden','');
  document.addEventListener('visibilitychange',()=>{this.gate.reset();this.progress(0)});
  this.render();
 }
 hint(message){this.panel.querySelector('#guideHint').textContent=message}
 progress(value){this.panel.querySelector('#guideProgress').value=value}
 select(step){if(!STEPS[step]||this.locked)return;this.step=step;this.photoRequest++;this.photoBusy=false;this.onState(false);this.gate.reset();this.progress(0);this.onReview(this.records.get(step)||null,step);this.render();const record=this.records.get(step);this.hint(record?(record.quality.ok?'Ảnh qua ngưỡng thử nghiệm; vẫn cần nhân viên xem lại.':`Cần xem lại/chụp lại: ${record.quality.message}`):`Chuẩn bị: ${STEPS[step].label}.`);if(this.live)this.start(this.video)}
 setLocked(locked){this.locked=locked;for(const b of this.panel.querySelectorAll('[data-step]'))b.disabled=locked;this.panel.querySelector('#retake').disabled=locked||!this.records.has(this.step);this.panel.querySelector('#nextCapture').disabled=locked||!this.records.has(this.step)||order.every(k=>this.records.has(k))}
 render(){
  for(const b of this.panel.querySelectorAll('[data-step]')){
   const r=this.records.get(b.dataset.step);b.setAttribute('aria-pressed',String(b.dataset.step===this.step));b.querySelector('small').textContent=r?(r.quality?.ok?'Đã lưu · ngưỡng thử nghiệm':'Đã lưu · cần xem lại'):'';
   const img=b.querySelector('img');img.hidden=!r;if(r)img.src=r.canvas.toDataURL('image/jpeg',.65);else img.removeAttribute('src');
  }
  this.panel.querySelector('#retake').disabled=!this.records.has(this.step);
  this.panel.querySelector('#nextCapture').disabled=!this.records.has(this.step)||order.every(k=>this.records.has(k));
  this.panel.querySelector('#qualitySummary').textContent=order.every(k=>this.records.has(k))?'Đã có ba ảnh. Xem và chụp lại từng góc nếu cần; chỉ ảnh chính diện dùng dựng 3D.':`${order.filter(k=>this.records.has(k)).length}/3 góc đã lưu.`;
 }
 async inspect(canvas,originalBlob,automatic=false){
  const step=this.step,request=++this.photoRequest,generation=this.sessionGeneration;
  this.gate.reset();this.progress(0);this.photoBusy=true;this.onState(true);this.hint('Đang kiểm tra ảnh vừa nhận…');
  let quality;
  try{
   const data=await this.analyzer.analyze(canvas,'IMAGE');quality=assess(data.result,data.pixels,step,this.config);
  }catch(e){quality={ok:false,code:'unverified',message:'Chưa kiểm tra được ảnh: '+e.message}}
  try{
   if(generation!==this.sessionGeneration||request!==this.photoRequest)return null;
   if(automatic&&(!quality.ok||!this.panel.querySelector('#autoCapture').checked)){this.hint('Đã hủy tự chụp: '+(!quality.ok?quality.message:'Tự chụp đã tắt.'));return null}
   const blob=originalBlob||await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(generation!==this.sessionGeneration||request!==this.photoRequest)return null;
   const record={canvas,originalBlob:blob,quality,config:{...this.config},step,capturedAt:Date.now()};
   this.records.set(step,record);this.render();this.hint(quality.ok?'Ảnh qua ngưỡng thử nghiệm; vẫn cần nhân viên xem lại.':`Cần xem lại/chụp lại: ${quality.message}`);
   return record;
  }finally{if(generation===this.sessionGeneration&&request===this.photoRequest){this.photoBusy=false;this.onState(false)}}
 }
 start(video){this.stop();this.video=video;this.lastVideoTime=-1;this.live=true;const generation=this.generation;this.oval.removeAttribute('hidden');this.hint('Đang chuẩn bị hướng dẫn realtime…');
  const loop=async()=>{
   if(!this.live||generation!==this.generation)return;
   let delay=this.config.intervalMs;
   if(!document.hidden&&!this.photoBusy&&!this.processing&&!this.records.has(this.step)&&video.readyState>=2&&!video.paused&&video.currentTime!==this.lastVideoTime){
    this.processing=true;
    this.lastVideoTime=video.currentTime;
    try{
     const step=this.step;
     const w=video.videoWidth,h=video.videoHeight;this.oval.setAttribute('viewBox',`0 0 ${w} ${h}`);const ellipse=this.oval.firstElementChild;ellipse.setAttribute('cx',w/2);ellipse.setAttribute('cy',h/2);ellipse.setAttribute('rx',w*.25);ellipse.setAttribute('ry',h*.4);
     const data=await this.analyzer.analyze(video,'VIDEO');delay=Math.max(delay,data.duration*2);
     if(!this.live||generation!==this.generation||step!==this.step)return;
     const quality=assess(data.result,data.pixels,step,this.config);
     const state=this.gate.update(quality,performance.now(),this.config);this.progress(state.progress);this.hint(state.message||quality.message);
     this.lastQuality=quality;
     if(state.capture&&this.panel.querySelector('#autoCapture').checked){this.processing=false;await this.onAutoCapture()}
     else if(!this.panel.querySelector('#autoCapture').checked){this.gate.reset();this.progress(0)}
    }catch(e){if(generation===this.generation){this.gate.reset();this.progress(0);this.hint('Không có hướng dẫn realtime: '+e.message+' Dùng chụp thủ công/chọn ảnh để kiểm tra sau.');delay=2000}}
    finally{if(generation===this.generation)this.processing=false}
   }else if(!this.records.has(this.step)){this.gate.reset();this.progress(0)}
   if(this.live&&generation===this.generation)this.timer=setTimeout(loop,delay);
  };this.timer=setTimeout(loop,0);
 }
 stop(){clearTimeout(this.timer);this.generation++;this.live=false;this.processing=false;this.gate.reset();this.progress(0);this.oval.setAttribute('hidden','');if(!this.photoBusy)this.onState(false)}
 clear(){this.sessionGeneration++;this.photoRequest++;this.photoBusy=false;this.stop();this.analyzer.dispose();this.records.clear();this.step='front';this.render();this.hint('Phiên đã xóa. Chọn chính diện để bắt đầu.');this.lastQuality=null}
}
