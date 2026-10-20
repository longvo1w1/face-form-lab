import assert from 'node:assert/strict';
import {DEFAULTS,STEPS,poseFromMatrix,assess,CaptureGate,pixelMetrics} from '../dist/capture-quality.js';
function matrix(yaw=0,pitch=0,roll=0){
 const y=yaw*Math.PI/180,p=pitch*Math.PI/180,r=roll*Math.PI/180;
 const cy=Math.cos(y),sy=Math.sin(y),cx=Math.cos(p),sx=Math.sin(p),cz=Math.cos(r),sz=Math.sin(r);
 return {data:[cy*cz+sy*sx*sz,cx*sz,-sy*cz+cy*sx*sz,0,-cy*sz+sy*sx*cz,cx*cz,sy*sz+cy*sx*cz,0,sy*cx,-sx,cy*cx,0,0,0,-40,1]};
}
const points=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
for(const i of [10,127,234,93,172])points[i]={x:.3,y:i===10?.2:.5};
for(const i of [152,356,454,323,397])points[i]={x:.7,y:i===152?.8:.5};
const result=(yaw=0,pitch=0,roll=0)=>({faceLandmarks:[points],facialTransformationMatrixes:[matrix(yaw,pitch,roll)]});
const pixels={brightness:120,sharpness:100};
for(const yaw of [-45,0,45])for(const pitch of [-10,0,10])for(const roll of [-8,0,8]){
 const pose=poseFromMatrix(matrix(yaw,pitch,roll));assert(Math.abs(pose.yaw-yaw)<1e-6);assert(Math.abs(pose.pitch-pitch)<1e-6);assert(Math.abs(pose.roll-roll)<1e-6);
}
assert.equal(poseFromMatrix({data:[]}),null);
assert.equal(assess({faceLandmarks:[]},pixels).code,'no-face');
assert.equal(assess({faceLandmarks:[points,points]},pixels).code,'multiple');
assert.equal(assess(result(),{...pixels,brightness:20}).code,'dark');
assert.equal(assess(result(),{...pixels,sharpness:1}).code,'blur');
assert.equal(assess(result(0,20),pixels).code,'straight');
assert.equal(assess(result(0,0,20),pixels).code,'straight');
assert.equal(assess(result(45),pixels,'front').code,'yaw');
assert(assess(result(45),pixels,'left').ok);assert(assess(result(-45),pixels,'right').ok);
// CSS mirror changes displayed x, never the raw matrix/subject-side target.
assert(STEPS.left.yaw>0);assert(1-.7<.5);assert(1-.3>.5);
for(const [transform,code] of [[p=>({...p,x:p.x+.4}),'position'],[p=>({...p,y:.5+(p.y-.5)*.4}),'near'],[p=>({...p,y:.5+(p.y-.5)*1.5}),'far']]){
 const r=result();r.faceLandmarks=[points.map(transform)];assert.equal(assess(r,pixels).code,code);
}
const gate=new CaptureGate(),q=assess(result(),pixels),c={...DEFAULTS,stableMs:500,countdownMs:500};
assert.equal(gate.update(q,0,c).phase,'holding');assert.equal(gate.update(q,500,c).phase,'countdown');
assert.equal(gate.update({...q,ok:false,message:'dark'},600,c).progress,0);
gate.update(q,700,c);assert.equal(gate.update({...q,pose:{...q.pose,yaw:6}},900,c).progress,0);
gate.reset();gate.update(q,0,c);gate.update(q,500,c);assert(gate.update(q,1000,c).capture);assert(!gate.update(q,1100,c).capture);
gate.reset();gate.update(q,0,c);assert.equal(gate.update(q,2000,c).progress,0);
const image={width:8,height:8,data:new Uint8ClampedArray(8*8*4).fill(100)};
assert.equal(pixelMetrics(image).sharpness,0);assert(Math.abs(pixelMetrics(image).brightness-100)<.001);
console.log('PASS quality priorities, matrix Euler/subject-side convention, dark/blur heuristics, framing, angle transition, motion/gap/quality countdown cancellation, exactly-once gate');
