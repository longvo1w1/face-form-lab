import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL(process.argv[2]||process.env.TEST_BASE_URL||'http://localhost:8080');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function get(file){const response=await fetch(new URL(file,base),{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,file+' status');return {response,bytes:Buffer.from(await response.arrayBuffer())}}
const {bytes:html}=await get('/');assert(html.toString().includes('id="consent"'));
const files=['app.js','boot.js','guided-capture.js','capture-analyzer.js','capture-worker.js','capture-quality.js','face-surface.js','capture-framing.js','reconstruction.js','cosmetics.js','cosmetics-panel.js'];
for(const file of files){const {response,bytes}=await get('/'+file);assert.match(response.headers.get('content-type')||'',/javascript/);assert.equal(hash(bytes),hash(await readFile(new URL('../dist/'+file,import.meta.url))),file+' deployed source');console.log('OK source/MIME '+file)}
const {bytes:config}=await get('/reconstruction-config.json');assert.equal(hash(config),hash(await readFile(new URL('../dist/reconstruction-config.json',import.meta.url))),'reconstruction config matches local deployment');
const assets=JSON.parse(await readFile(new URL('./assets.json',import.meta.url),'utf8'));
for(const asset of assets){const {response,bytes}=await get('/assets/'+asset.path);const expected=asset.path.endsWith('.wasm')?'application/wasm':asset.path.endsWith('.task')?'application/octet-stream':'javascript';assert((response.headers.get('content-type')||'').includes(expected),asset.path+' MIME');assert.equal(hash(bytes),asset.sha256,asset.path+' SHA-256');console.log('OK asset/MIME/SHA-256 '+asset.path)}
for(const path of ['/missing-module.js','/missing-worker.js','/assets/missing-model.task','/assets/wasm/missing.wasm','/missing-page']){const response=await fetch(new URL(path,base));assert.equal(response.status,404,path+' must not return index HTML fallback');console.log('OK 404 '+path)}
console.log('PASS deployed source, model/WASM bytes and MIME, missing-resource 404 at '+base.origin);
