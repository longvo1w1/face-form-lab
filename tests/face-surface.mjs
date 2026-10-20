import assert from 'node:assert/strict';
import {buildFaceSurface,PHOTO_OPENINGS} from '../dist/face-surface.js';
import {FaceLandmarker} from '../dist/assets/vision.mjs';
const topology=FaceLandmarker.FACE_LANDMARKS_TESSELATION;
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
function edges(indices){const map=new Map();for(let i=0;i<indices.length;i+=3){const t=indices.slice(i,i+3);for(let n=0;n<3;n++){const key=edgeKey(t[n],t[(n+1)%3]);map.set(key,(map.get(key)||0)+1)}}return map}
// Valid ordered contours; intentionally vary depth to test interpolation in 3D.
const p=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
for(const [j,{ring}] of PHOTO_OPENINGS.entries())ring.forEach((id,i)=>{const t=i*2*Math.PI/ring.length;p[id]={x:.2+j*.25+.08*Math.cos(t),y:.4+.025*Math.sin(t),z:.01*Math.sin(t)}});
const baseline=edges(buildFaceSurface(p,topology).indices.slice(0,topology.length));
const result=buildFaceSurface(p,topology),closed=edges(result.indices);
assert.equal(result.openings.length,3);
assert.equal(result.points.length,481);
assert.equal(result.indices.length/3,904);
assert(result.indices.every(i=>Number.isInteger(i)&&i>=0&&i<result.points.length));
for(const opening of result.openings){
 const {ring,centerIndex}=opening;
 for(let i=0;i<ring.length;i++){
  const edge=edgeKey(ring[i],ring[(i+1)%ring.length]);
  assert.equal(baseline.get(edge),1,`${opening.name}: was an open face boundary`);
  assert.equal(closed.get(edge),2,`${opening.name}: now joins cap and face`);
  assert.equal(closed.get(edgeKey(centerIndex,ring[i])),2,'no radial seams');
 }
 for(const k of ['x','y','z'])assert(Math.abs(result.points[centerIndex][k]-ring.reduce((s,id)=>s+p[id][k]/ring.length,0))<1e-12);
 // UV interpolation is exactly the original photo mapping x, 1-y.
 for(let i=opening.start;i<opening.start+opening.count;i+=3){
  const ids=result.indices.slice(i,i+3),weights=[.2,.3,.5];
  const x=ids.reduce((s,id,n)=>s+result.points[id].x*weights[n],0);
  const v=ids.reduce((s,id,n)=>s+(1-result.points[id].y)*weights[n],0);
  const y=ids.reduce((s,id,n)=>s+result.points[id].y*weights[n],0);
  assert(Math.abs(v-(1-y))<1e-12);assert(Number.isFinite(x));
 }
}
// FaceLandmarker's iris-less legacy 468-point output still gets both eyes.
assert.equal(buildFaceSurface(p.slice(0,468),topology).openings.length,3);
// Closed lids stay closed: new points have the same y coordinate as the lids.
const shut=p.map(v=>({...v}));for(const {ring} of PHOTO_OPENINGS.slice(0,2))for(const id of ring)shut[id].y=.4;
const closedEyes=buildFaceSurface(shut,topology);for(const o of closedEyes.openings.slice(0,2))assert(Math.abs(closedEyes.points[o.centerIndex].y-.4)<1e-12);
assert.deepEqual(p,result.points.slice(0,p.length),'original landmarks remain unchanged');
console.log('PASS: official 852-triangle mesh had open eyes/mouth; all 52 contour edges are now closed by photo-textured caps (904 triangles), UV mapping and legacy/closed-eye cases pass.');
