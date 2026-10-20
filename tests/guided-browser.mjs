import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1024,height:1366}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/qa-portrait.jpg',async route=>route.fulfill({body:await readFile('artifacts/portrait.jpg'),contentType:'image/jpeg'}));
 await page.goto('http://localhost:8080');await page.waitForFunction(()=>window.faceFormReady);
 await page.locator('#consent').check();
 const report=await page.evaluate(async()=>{
  const {CaptureAnalyzer}=await import('./capture-analyzer.js');const {assess}=await import('./capture-quality.js');
  const analyzer=new CaptureAnalyzer(),im=new Image();
  // This URL is fulfilled locally by the test runner, never fetched by the application.
  im.src='/qa-portrait.jpg';await im.decode();
  const original=document.createElement('canvas');original.width=im.width;original.height=im.height;original.getContext('2d').drawImage(im,0,0);
  const originalResult=await analyzer.analyze(original);const bounds=assess(originalResult.result,originalResult.pixels).bounds;
  const crop=document.createElement('canvas');crop.width=crop.height=640;const side=bounds.height*im.height/.65;
  crop.getContext('2d').drawImage(im,bounds.cx*im.width-side/2,bounds.cy*im.height-side/2,side,side,0,0,640,640);
  const variants={crop};
  for(const name of ['mirror','dark','blur','multiple','empty','offcenter']){
   const c=document.createElement('canvas');c.width=c.height=640;const x=c.getContext('2d');
   if(name==='mirror'){x.translate(640,0);x.scale(-1,1)}
   if(name==='blur')x.filter='blur(9px)';
   if(name==='multiple'){x.drawImage(crop,0,160,320,320);x.drawImage(crop,320,160,320,320)}
   else if(name==='offcenter')x.drawImage(crop,210,0);
   else if(name!=='empty')x.drawImage(crop,0,0);
   if(name==='dark'){x.fillStyle='rgba(0,0,0,.85)';x.fillRect(0,0,640,640)}
   variants[name]=c;
  }
  const report={};for(const [name,c] of Object.entries(variants)){const data=await analyzer.analyze(c);const q=assess(data.result,data.pixels);report[name]={...q,duration:data.duration};}
  // Real VIDEO mode inference on an actual photograph sequence, not physical video evidence.
  const video=[];for(let i=0;i<4;i++){const data=await analyzer.analyze(crop,'VIDEO');video.push(assess(data.result,data.pixels))}
  report.video=video;report.cropData=crop.toDataURL();report.original=assess(originalResult.result,originalResult.pixels);analyzer.dispose();return report;
 });
 assert.equal(report.crop.count,1);assert(report.crop.pose);assert(report.crop.ok,JSON.stringify(report.crop));
 assert.equal(report.empty.code,'no-face');assert.equal(report.multiple.code,'multiple');
 assert(report.dark.brightness<report.crop.brightness/2);assert(report.blur.sharpness<report.crop.sharpness/2);
 assert(['dark','no-face'].includes(report.dark.code));assert(['blur','no-face'].includes(report.blur.code));
 assert.equal(report.offcenter.code,'position');
 assert(Math.abs(report.crop.pose.yaw+report.mirror.pose.yaw)<5);
 assert(Math.abs(report.crop.pose.roll+report.mirror.pose.roll)<5);
 assert(report.video.every(q=>q.count===1&&q.pose));
 const buffer=Buffer.from(report.cropData.split(',')[1],'base64');delete report.cropData;
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/guided-metrics.json',JSON.stringify(report,null,2));
 await writeFile('artifacts/guided-crop.png',buffer);
 await page.locator('#upload').setInputFiles({name:'frontal.png',mimeType:'image/png',buffer});
 await page.waitForFunction(()=>!document.querySelector('#build').disabled,{},{timeout:90000});
 assert.match(await page.locator('#guideHint').textContent(),/ngưỡng thử nghiệm/);
 await page.locator('#nextCapture').click();assert.equal(await page.locator('#captureAngle').inputValue(),'left');
 assert(await page.locator('#selectedPreview').isHidden());
 await page.locator('#nativeCamera').setInputFiles({name:'wrong-angle.png',mimeType:'image/png',buffer});
 await page.waitForFunction(()=>!document.querySelector('#build').disabled);
 assert.match(await page.locator('#guideHint').textContent(),/trái/);
 await page.locator('#retake').click();assert(await page.locator('#selectedPreview').isHidden());
 // Wrong-angle photos can be retained manually, but must stay flagged for review.
 await page.locator('#upload').setInputFiles({name:'left-needs-retake.png',mimeType:'image/png',buffer});
 await page.waitForFunction(()=>!document.querySelector('#build').disabled);
 await page.locator('#nextCapture').click();assert.equal(await page.locator('#captureAngle').inputValue(),'right');
 await page.locator('#upload').setInputFiles({name:'right-needs-retake.png',mimeType:'image/png',buffer});
 await page.waitForFunction(()=>!document.querySelector('#build').disabled);
 assert.match(await page.locator('#guideHint').textContent(),/phải/);
 assert.match(await page.locator('#qualitySummary').textContent(),/ba ảnh/);
 assert.equal(await page.locator('#guidedSteps img:not([hidden])').count(),3);
 await page.locator('[data-step="front"]').click();assert(await page.locator('#selectedPreview').isVisible());
 await page.locator('#build').click();await page.waitForFunction(()=>!document.querySelector('#export').disabled,{},{timeout:90000});
 await page.screenshot({path:'artifacts/guided-review.png',fullPage:true});
 await page.locator('#consent').uncheck();assert(await page.locator('#selectedPreview').isHidden());
 assert.equal(await page.locator('#guidedSteps img:not([hidden])').count(),0);
 // Controlled video stream containing the real photo; actual VIDEO inference drives the UI.
 await page.locator('#consent').check();
 await page.locator('#captureSettings').evaluate(form=>form.closest('details').open=true);
 for(const [key,value] of [['stableMs','500'],['countdownMs','1500'],['intervalMs','150']])await page.locator(`[name="${key}"]`).fill(value);
 await page.locator('#captureSettings').evaluate(form=>form.closest('details').open=true);
 await page.locator('#applyCaptureSettings').click();
 await page.evaluate(async data=>{
  const im=new Image();im.src=data;await im.decode();const c=document.createElement('canvas');c.width=c.height=640;const ctx=c.getContext('2d');
  window.qaFrame={dark:false,shift:0};const draw=()=>{ctx.fillStyle='black';ctx.fillRect(0,0,640,640);ctx.drawImage(im,window.qaFrame.shift,0);if(window.qaFrame.dark){ctx.fillStyle='black';ctx.fillRect(0,0,640,640)}};draw();
  navigator.mediaDevices.getUserMedia=async()=>{const stream=c.captureStream(12);const timer=setInterval(draw,80);stream.getTracks()[0].addEventListener('ended',()=>clearInterval(timer));return stream};
 },'data:image/png;base64,'+buffer.toString('base64'));
 await page.locator('#captureSettings').evaluate(form=>form.closest('details').open=false);
 await page.locator('#camera').click();
 await page.waitForFunction(()=>document.querySelector('#guideHint').textContent.includes('chụp sau'),{},{timeout:45000});
 await page.evaluate(()=>window.qaFrame.shift=180);
 await page.waitForFunction(()=>document.querySelector('#guideProgress').value===0);
 assert.equal(await page.locator('#guidedSteps img:not([hidden])').count(),0);
 await page.evaluate(()=>window.qaFrame.shift=0);
 await page.waitForFunction(()=>document.querySelector('#guideHint').textContent.includes('chụp sau'),{},{timeout:15000});
 await page.evaluate(()=>window.qaFrame.dark=true);
 await page.waitForFunction(()=>document.querySelector('#guideProgress').value===0);
 assert.equal(await page.locator('#guidedSteps img:not([hidden])').count(),0);
 await page.evaluate(()=>window.qaFrame.dark=false);
 await page.waitForFunction(()=>document.querySelector('[data-step="front"] img').hidden===false,{},{timeout:45000});
 const first=await page.locator('[data-step="front"] img').getAttribute('src');
 await page.waitForTimeout(1200);assert.equal(await page.locator('[data-step="front"] img').getAttribute('src'),first);
 await page.locator('#nextCapture').click();
 await page.waitForFunction(()=>document.querySelector('#guideHint').textContent.includes('trái'),{},{timeout:10000});
 assert.equal(await page.locator('[data-step="left"] img').isHidden(),true);
 await page.locator('[data-step="front"]').click();await page.locator('#retake').click();
 await page.waitForFunction(()=>document.querySelector('[data-step="front"] img').hidden===false,{},{timeout:15000});
 await page.screenshot({path:'artifacts/guided-live.png',fullPage:true});
 await page.locator('#consent').uncheck();assert(await page.locator('#captureOval').isHidden());
 assert.equal(await page.locator('#guidedSteps img:not([hidden])').count(),0);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/guided-phone.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log('PASS guided worker IMAGE/VIDEO actual inference, matrices, mirror symmetry, real portrait/degraded/no-face/multiple/offcenter fixtures; native/library post-check, step switch/retake/review/front build/clear');
 console.log('Measured:',JSON.stringify(Object.fromEntries(Object.entries(report).filter(([k])=>k!=='video').map(([k,v])=>[k,{code:v.code,brightness:v.brightness,sharpness:v.sharpness,pose:v.pose}]))));
}finally{await browser.close()}
