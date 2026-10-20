// Geometry/model output and pixel heuristics are deliberately separate.
export const DEFAULTS = Object.freeze({yawTolerance:12,pitchTolerance:14,rollTolerance:10,
 minFace:.38,maxFace:.82,centerTolerance:.16,minBrightness:55,maxBrightness:225,
 minSharpness:75,stableMs:1200,countdownMs:1800,maxGapMs:900,
 motionAngle:4,motionCenter:.025,intervalMs:250});
export const STEPS = {front:{yaw:0,label:'Chính diện'},left:{yaw:45,label:'Trái 45° của khách'},
 right:{yaw:-45,label:'Phải 45° của khách'},profile:{yaw:null,label:'Ngang 90° · tùy chọn'}};
const deg=180/Math.PI;
export function poseFromMatrix(matrix){
 const m=matrix?.data;if(!m||m.length!==16||!Array.from(m).every(Number.isFinite))return null;
 // MediaPipe MatrixData is column-major. Euler order YXZ, removing scale.
 const scale=Math.hypot(m[8],m[9],m[10]);if(scale<1e-6)return null;
 return {yaw:Math.atan2(m[8],m[10])*deg,pitch:Math.asin(Math.max(-1,Math.min(1,-m[9]/scale)))*deg,
 roll:Math.atan2(m[1],m[5])*deg};
}
export function faceBounds(points){
 // Exclude iris and inner features; use the face contour extremes.
 const ids=[10,152,234,454,127,356,172,397,93,323];
 const xs=ids.map(i=>points[i]?.x),ys=ids.map(i=>points[i]?.y);
 if([...xs,...ys].some(x=>!Number.isFinite(x)))return null;
 const x=Math.min(...xs),y=Math.min(...ys),right=Math.max(...xs),bottom=Math.max(...ys);
 return {x,y,right,bottom,width:right-x,height:bottom-y,cx:(x+right)/2,cy:(y+bottom)/2};
}
export function pixelMetrics({data,width,height}){
 const gray=new Float32Array(width*height);let total=0;
 for(let i=0;i<gray.length;i++){gray[i]=.2126*data[i*4]+.7152*data[i*4+1]+.0722*data[i*4+2];total+=gray[i]}
 let sum=0,sq=0,n=0;
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
  const i=y*width+x,l=gray[i-1]+gray[i+1]+gray[i-width]+gray[i+width]-4*gray[i];sum+=l;sq+=l*l;n++;
 }
 return {brightness:total/gray.length,sharpness:n?sq/n-(sum/n)**2:0};
}
export function assess(result,pixels,step='front',config=DEFAULTS){
 const c={...DEFAULTS,...config},count=result.faceLandmarks?.length||0;
 const bounds=count===1?faceBounds(result.faceLandmarks[0]):null;
 const pose=count===1?poseFromMatrix(result.facialTransformationMatrixes?.[0]):null;
 const metrics={...pixels,count,bounds,pose};
 const fail=(code,message)=>({ok:false,code,message,...metrics});
 if(!count)return fail('no-face','Đưa khuôn mặt vào khung; nếu góc ngang mất điểm mốc, có thể lưu đối chiếu thủ công.');
 if(count>1)return fail('multiple','Chỉ để một người trong khung.');
 if(!bounds||bounds.x<0||bounds.y<0||bounds.right>1||bounds.bottom>1||Math.abs(bounds.cx-.5)>c.centerTolerance||Math.abs(bounds.cy-.5)>c.centerTolerance)return fail('position','Đưa khuôn mặt vào giữa khung oval.');
 if(bounds.height<c.minFace)return fail('near','Tiến gần camera hơn.');
 if(bounds.height>c.maxFace)return fail('far','Lùi xa camera một chút.');
 if(!pose)return fail('pose','Chưa ước lượng được góc đầu; hãy chụp lại hoặc lưu đối chiếu thủ công.');
 if(Math.abs(pose.pitch)>c.pitchTolerance||Math.abs(pose.roll)>c.rollTolerance)return fail('straight','Giữ đầu thẳng, không cúi/ngửa hoặc nghiêng đầu.');
 const target=STEPS[step]?.yaw;
 if(target===null)return fail('optional','Góc ngang chỉ là đối chiếu tùy chọn; chụp thủ công, không cần đủ điểm mốc.');
 if(Math.abs(pose.yaw-target)>c.yawTolerance)return fail('yaw',step==='front'?'Nhìn thẳng vào camera.':Math.sign(pose.yaw)===Math.sign(target)&&Math.abs(pose.yaw)>Math.abs(target)?'Quay bớt về chính diện, mục tiêu khoảng 45°.':`Quay nhẹ sang ${step==='left'?'trái':'phải'} của bạn, khoảng 45°. Hiện ước lượng ${Math.round(pose.yaw)}°.`);
 if(pixels.brightness<c.minBrightness)return fail('dark','Ánh sáng có thể chưa đủ; tăng ánh sáng đều phía trước.');
 if(pixels.brightness>c.maxBrightness)return fail('bright','Ảnh có thể quá sáng; giảm ánh sáng trực tiếp.');
 if(pixels.sharpness<c.minSharpness)return fail('blur','Ảnh có thể bị nhòe; lau ống kính, giữ yên và lấy nét lại.');
 return {ok:true,code:'ready',message:'Giữ yên để chụp.',...metrics};
}
export class CaptureGate {
 constructor(){this.reset()}
 reset(){this.since=null;this.previous=null;this.anchor=null;this.done=false}
 update(q,now,config=DEFAULTS){
  const c={...DEFAULTS,...config},p=this.previous;
  if(this.done)return {phase:'done',progress:1,capture:false};
  const changed=prior=>prior&&q.pose&&prior.pose&&(Math.max(...['yaw','pitch','roll'].map(k=>Math.abs(q.pose[k]-prior.pose[k])))>c.motionAngle||Math.hypot(q.bounds.cx-prior.bounds.cx,q.bounds.cy-prior.bounds.cy)>c.motionCenter||Math.abs(q.bounds.height-prior.bounds.height)>c.motionCenter);
  const moved=changed(p?.q)||changed(this.anchor);
  if(!q.ok||moved||(p&&now-p.time>c.maxGapMs)){this.since=null;this.anchor=null;this.previous=q.ok?{q,time:now}:null;return {phase:'waiting',progress:0,capture:false,message:moved?'Khách vừa di chuyển; giữ yên để bắt đầu lại.':q.message}}
  if(this.since===null){this.since=now;this.anchor=q}this.previous={q,time:now};
  const elapsed=now-this.since,total=c.stableMs+c.countdownMs;
  if(elapsed>=total){this.done=true;return {phase:'done',progress:1,capture:true}}
  return {phase:elapsed<c.stableMs?'holding':'countdown',progress:elapsed/total,capture:false,
   message:elapsed<c.stableMs?'Giữ yên để chụp.':`Giữ yên · chụp sau ${Math.ceil((total-elapsed)/1000)}…`};
 }
}
