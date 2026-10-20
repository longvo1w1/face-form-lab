export class CaptureAnalyzer {
 constructor(){this.sequence=0;this.generation=0;this.queue=Promise.resolve();this.pending=null;this.duration=0;this.worker=null}
 analyze(source,mode='IMAGE'){
  const generation=this.generation;
  const task=this.queue.catch(()=>{}).then(()=>this.run(source,mode,generation));
  this.queue=task;this.pending=task;
  task.then(()=>{if(this.pending===task)this.pending=null},()=>{if(this.pending===task)this.pending=null});
  return task;
 }
 async run(source,mode,generation){
  if(generation!==this.generation)throw Error('Đã hủy kiểm tra ảnh.');
  if(!this.worker){
   this.worker=new Worker(new URL('./capture-worker.js',import.meta.url));
   this.worker.onmessage=({data})=>{if(data.id!==this.active)return;clearTimeout(this.timeout);this.duration=data.duration||0;data.error?this.reject(Error(data.error)):this.resolve(data)};
   this.worker.onerror=()=>{clearTimeout(this.timeout);this.reject?.(Error('Không chạy được bộ kiểm tra ảnh trên trình duyệt này. Có thể mở bằng Safari mới hơn; vẫn có thể thử dựng thủ công.'));this.worker?.terminate();this.worker=null};
  }
  const w=source.videoWidth||source.width,h=source.videoHeight||source.height;
  if(!w||!h)throw Error('Chưa có khung hình camera.');
  const ratio=Math.min(1,640/Math.max(w,h));
  const bitmap=await createImageBitmap(source,{resizeWidth:Math.round(w*ratio),resizeHeight:Math.round(h*ratio)});
  if(generation!==this.generation){bitmap.close();throw Error('Đã hủy kiểm tra ảnh.')}
  this.active=++this.sequence;
  return await new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;this.timeout=setTimeout(()=>{this.worker?.terminate();this.worker=null;reject(Error('Kiểm tra ảnh quá lâu. Hãy thử lại hoặc dùng ảnh nhỏ hơn.'))},45000);this.worker.postMessage({id:this.active,bitmap,mode,timestamp:performance.now()},[bitmap])});
 }
 dispose(){this.generation++;clearTimeout(this.timeout);this.worker?.terminate();this.worker=null;this.reject?.(Error('Đã hủy kiểm tra ảnh.'));this.pending=null;this.sequence++}
}
