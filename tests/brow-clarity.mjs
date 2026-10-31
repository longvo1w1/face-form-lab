import assert from 'node:assert/strict';
import {freshCosmetics} from '../dist/cosmetics.js';
import {templateAlpha,profile,fadeOriginal} from '../dist/brow-templates.js';
const state=freshCosmetics().brows;
assert.equal(state.clarity,'defined');
assert.equal(state.guide,true);
assert(state.opacity>=90);
assert(state.fade<=40);
const bright=templateAlpha(.35,profile(.35,'soft').y,'soft',0,'strokes');
assert(bright>.2,'fibers must be visible without overwhelming smoothing');
const width=100,height=50;
const data=new Uint8ClampedArray(width*height*4);
for(let i=0;i<data.length;i+=4){data[i]=35;data[i+1]=35;data[i+2]=35;data[i+3]=255}
for(let y=0;y<15;y++)for(let x=0;x<width;x++){let k=(y*width+x)*4;data[k]=205;data[k+1]=165;data[k+2]=140}
const image={width,height,data};const frame={src:[{x:20,y:20},{x:30,y:20},{x:40,y:20},{x:50,y:20},{x:60,y:20}],naturalWidth:40};
fadeOriginal(image,frame,100);
assert(data.some(v=>v===35),'replacement must retain original pixels');
assert(image.data[(20*width+40)*4]<205,'concealment must not overwrite brow with flat skin at full strength');
console.log('PASS defaults, visible strand coverage and bounded brow concealment');
