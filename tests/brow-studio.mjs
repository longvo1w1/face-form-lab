import assert from 'node:assert/strict';
import {templateAlpha,profile} from '../dist/brow-templates.js';
import {mountBrowStudio} from '../dist/brow-studio.js';
assert.equal(typeof mountBrowStudio,'function');
const modes=['strokes','powder','ombre','hybrid'];
const values=modes.map(mode=>Array.from({length:9},(_,i)=>templateAlpha(.12+i*.09,profile(.12+i*.09,'soft').y,'soft',0,mode)));
assert(values.every(v=>v.every(Number.isFinite)),'effects must be finite');
assert(values.every(v=>v.some(n=>n>0)),'effects must render pigment');
assert.equal(new Set(values.map(v=>v.map(n=>n.toFixed(4)).join(','))).size,4,'effects must be visibly distinct at the alpha layer');
for(const mode of modes){assert.equal(templateAlpha(-.1,0,'soft',0,mode),0);assert.equal(templateAlpha(1.1,0,'soft',0,mode),0)}
console.log('PASS 4 distinct brow pigment patterns, finite and bounded external mask; DOM pointer QA requires browser');
