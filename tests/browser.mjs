import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
await mkdir('artifacts', {recursive:true});
let portrait;try{portrait=await readFile('artifacts/portrait.jpg')}catch{const response=await fetch('https://storage.googleapis.com/mediapipe-assets/portrait.jpg');assert(response.ok);portrait=Buffer.from(await response.arrayBuffer());await writeFile('artifacts/portrait.jpg',portrait)}
assert.equal(createHash('sha256').update(portrait).digest('hex'),'a6f11efaa834706db23f275b6115058fa87fc7f14362681e6abe14e82749de3e');
const baseURL=(process.env.TEST_BASE_URL||'http://localhost:8080').replace(/\/$/,'');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--use-fake-device-for-media-stream','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
console.log('Chromium launched');
const page=await browser.newPage({viewport:{width:1024,height:1366}});
const errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
page.on('console',m=>{if(m.type()==='error')console.log('browser console:',m.text())});
try {
 // Reproduce the consent/preview defect on the exact handoff revision.
 const baseline=await browser.newPage();
 for(const file of ['index.html','app.js']){
   const body=execFileSync('git',['show',`0cf9315:dist/${file}`],{encoding:'utf8'});
   await baseline.route(file==='index.html'?baseURL+'/':'**/app.js?*',route=>route.fulfill({body,contentType:file.endsWith('.js')?'text/javascript':'text/html'}));
 }
 await baseline.goto(baseURL);await baseline.waitForFunction(()=>window.faceFormReady);
 await baseline.locator('#consent').check();await baseline.locator('#upload').setInputFiles('artifacts/portrait.jpg');
 await baseline.locator('#selectedPreview').waitFor({state:'visible'});await baseline.locator('#consent').uncheck();
 assert(await baseline.locator('#selectedPreview').isVisible());console.log('REPRO baseline: consent revoked but customer preview remains');
 await baseline.close();
 console.log('page created');
 await page.goto(baseURL);
 await page.waitForFunction(()=>window.faceFormReady);console.log('app ready');
 assert(await page.locator('#upload').isDisabled());
 await page.locator('#consent').check();
 // Controlled camera adapters exercise recovery; this is not physical-camera evidence.
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Test denial','NotAllowedError')}});
 await page.locator('#camera').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('từ chối'));
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=c.height=160;const stream=c.captureStream(10);setInterval(()=>c.getContext('2d').fillRect(0,0,160,160),100);return stream}});
 await page.locator('#camera').click();
 await page.locator('#snap').waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('#snap').disabled);
 await page.locator('#snap').click();
 await page.locator('#selectedPreview').waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('#build').disabled);await page.locator('#camera').click();assert(await page.locator('#snap').isDisabled());
 await page.locator('#upload').setInputFiles('artifacts/portrait.jpg');
 await page.locator('#selectedPreview').waitFor({state:'visible'});
 assert.equal(await page.locator('#stage canvas').count(),0);
 await page.locator('#build').click();
 await page.waitForFunction(()=>!document.querySelector('#build').disabled,{},{timeout:90000});
 console.log('build status:',await page.locator('#status').textContent());
 assert(await page.locator('#export').isEnabled());
 const canvas=page.locator('#stage canvas');
 const before=await canvas.screenshot();
 for(const id of ['bridge','tip','width','chin','length','upper','lower']){
   await page.locator('#'+id).fill('65');
   assert.equal(await page.locator('#out-'+id).textContent(),'+65');
 }
 assert.notDeepEqual(await canvas.screenshot(),before);
 await page.locator('#tip').focus();await page.keyboard.press('ArrowRight');
 await page.locator('#undo').click();assert.equal(await page.locator('#tip').inputValue(),'65');
 for(const angle of [0,45,90]){
   await page.locator(`[data-angle="${angle}"]`).click();
   await page.screenshot({path:`artifacts/view-${angle}.png`,fullPage:true});
 }
 await page.locator('#original').dispatchEvent('pointerdown',{pointerId:1});
 assert(await page.locator('#originalBadge').isVisible());
 await page.locator('#original').dispatchEvent('pointerup',{pointerId:1});
 assert(await page.locator('#originalBadge').isHidden());
 const download=page.waitForEvent('download');await page.locator('#export').click();
 await (await download).saveAs('artifacts/comparison.png');
 await page.locator('#reset').click();
 for(const id of ['bridge','tip','width','chin','length','upper','lower'])assert.equal(await page.locator('#'+id).inputValue(),'0');
 await page.locator('#clear').click();
 assert(await page.locator('#selectedPreview').isHidden());assert(await page.locator('#export').isDisabled());
 assert.equal(await page.locator('#stage canvas').count(),1);
 await page.locator('#consent').check();
 await page.locator('#upload').setInputFiles({name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('broken')});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('JPG/PNG'));
 const blank=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=100;return c.toDataURL().split(',')[1]});
 await page.locator('#upload').setInputFiles({name:'blank.png',mimeType:'image/png',buffer:Buffer.from(blank,'base64')});
 await page.locator('#build').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Không tìm được'));
 assert(await page.locator('#build').isEnabled());
 assert(await page.locator('#upload').isEnabled());
 await page.locator('#upload').dispatchEvent('cancel');
 assert(await page.locator('#selectedPreview').isVisible());
 await page.locator('#captureAngle').selectOption('profile');
 await page.locator('#upload').setInputFiles({name:'blank.png',mimeType:'image/png',buffer:Buffer.from(blank,'base64')});
 await page.locator('#build').click();
 await page.locator('[data-ref="profile"]').click();
 assert(await page.locator('#reference').isVisible());await page.locator('#closeRef').click();
 await page.locator('#consent').uncheck();
 assert(await page.locator('#selectedPreview').isHidden());assert(await page.locator('#build').isDisabled());
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/phone.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.reload();await page.waitForFunction(()=>window.faceFormReady);
 await page.locator('#consent').check();await page.locator('#upload').setInputFiles('artifacts/portrait.jpg');
 await page.waitForFunction(()=>!document.querySelector('#build').disabled);
 await page.route('**/face_landmarker.task',route=>route.abort());
 await page.locator('#build').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Chưa thể dựng'));
 assert(await page.locator('#selectedPreview').isVisible());assert(await page.locator('#build').isEnabled());
 await page.unroute('**/face_landmarker.task');
 await page.locator('#build').click();await page.waitForFunction(()=>!document.querySelector('#export').disabled,{},{timeout:90000});
 await page.reload();await page.waitForFunction(()=>window.faceFormReady);
 await page.route('**/face_landmarker.task',async route=>{await new Promise(r=>setTimeout(r,500));await route.continue()});
 await page.locator('#consent').check();await page.locator('#upload').setInputFiles('artifacts/portrait.jpg');
 await page.waitForFunction(()=>!document.querySelector('#build').disabled);
 const loading=page.waitForRequest('**/face_landmarker.task');await page.locator('#build').click();await loading;
 await page.locator('#clear').click();await page.unrouteAll({behavior:'wait'});
 await page.waitForFunction(()=>!document.querySelector('#status').textContent.includes('Đang'));
 assert(await page.locator('#selectedPreview').isHidden());assert(await page.locator('#export').isDisabled());
 // Wait for module creation to settle; no old build may recreate the surface.
 await page.waitForTimeout(1000);assert.equal(await page.locator('#stage canvas').count(),0);
 assert.deepEqual(errors,[]);
 const network=requests.filter(r=>/^https?:/.test(r.url));console.log('Local HTTP requests:',network.length);assert(network.every(r=>r.method==='GET'&&new URL(r.url).origin===new URL(baseURL).origin));
 for(const [path,type] of [['assets/vision.mjs','text/javascript'],['assets/wasm/vision_wasm_internal.wasm','application/wasm'],['assets/face_landmarker.task','application/octet-stream']]){const response=await page.request.head(baseURL+'/'+path);assert.equal(response.status(),200);assert(response.headers()['content-type'].startsWith(type))}
 console.log('PASS: real Chromium inference, rendering, edits, undo, 3 angles, original, reset, PNG export, clear, invalid/no-face/model-failure recovery, consent cancellation, MIME; local GET requests only. Camera tests use controlled adapters, not physical devices.');
}catch(e){console.log('errors',errors,'status',await page.locator('#status').textContent());await page.screenshot({path:'artifacts/failure.png',fullPage:true});throw e}finally{await browser.close()}
