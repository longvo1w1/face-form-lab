// Classic worker: MediaPipe's WASM loader uses importScripts(). No UI or uploads.
let detector,mode,library;
async function getDetector(nextMode){
 library ||= await import('./assets/vision.mjs');
 if(!detector){
  const files=await library.FilesetResolver.forVisionTasks(new URL('./assets/wasm',self.location.href).href);
  detector=await library.FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./assets/face_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:nextMode,numFaces:2,outputFacialTransformationMatrixes:true,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5});
  mode=nextMode;
 }else if(mode!==nextMode){await detector.setOptions({runningMode:nextMode});mode=nextMode}
 return detector;
}
self.onmessage=async({data})=>{
 const {id,bitmap,mode:nextMode,timestamp}=data;
 try{
  const start=performance.now(),quality=await import('./capture-quality.js');
  const model=await getDetector(nextMode);
  const result=nextMode==='VIDEO'?model.detectForVideo(bitmap,timestamp):model.detect(bitmap);
  const bounds=result.faceLandmarks.length===1?quality.faceBounds(result.faceLandmarks[0]):null;
  const sample=new OffscreenCanvas(128,128),ctx=sample.getContext('2d',{willReadFrequently:true});
  const b=bounds||{x:0,y:0,width:1,height:1};
  const x=Math.max(0,b.x)*bitmap.width,y=Math.max(0,b.y)*bitmap.height;
  ctx.drawImage(bitmap,x,y,Math.max(1,Math.min(b.width*bitmap.width,bitmap.width-x)),Math.max(1,Math.min(b.height*bitmap.height,bitmap.height-y)),0,0,128,128);
  const pixels=quality.pixelMetrics(ctx.getImageData(0,0,128,128));
  self.postMessage({id,result,pixels,duration:performance.now()-start});
 }catch(error){self.postMessage({id,error:error.message||String(error)})}
 finally{bitmap?.close()}
};
