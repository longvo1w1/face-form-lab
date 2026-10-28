// One primary photo flow; reference angles remain optional and retain their data.
export function simplifyCapture(root){
 const $=s=>root.querySelector(s),node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};
 const guide=$('#guided'),camera=$('#cameraBox');
 guide.querySelector('h3').textContent='Chụp ảnh chính diện';
 guide.querySelector('p.muted').textContent='Đặt trọn mặt trong khung, đủ sáng và nhìn thẳng. Chỉ cần một ảnh để bắt đầu.';
 const sources=node('div');sources.className='photo-sources';
 const live=$('#camera');live.textContent='Mở camera';sources.append(live);
 for(const id of ['upload','nativeCamera'])sources.append($('#'+id).closest('label'));
 sources.querySelector('label:has(#upload)').childNodes[0].textContent='Chọn ảnh có sẵn';
 sources.querySelector('label:has(#nativeCamera)').childNodes[0].textContent='Camera điện thoại';
 camera.before(sources);
 const review=node('section');review.className='photo-review';review.setAttribute('aria-label','Kiểm tra ảnh đã chọn');
 const title=node('h3','Xem lại ảnh');review.append(title,$('#selectedPreview'),$('#build'));guide.after(review);
 const retake=node('button','Chọn / chụp lại');retake.type='button';review.append(retake);
 retake.onclick=()=>{$('#retake').click();sources.scrollIntoView({behavior:'smooth',block:'center'});$('#upload').focus()};
 const optional=node('details');optional.className='photo-optional';optional.append(node('summary','Ảnh góc nghiêng đối chiếu · tùy chọn'));
 const note=node('p','Ảnh nghiêng chỉ để đối chiếu; không bắt buộc và không dùng dựng hình. Trái/phải là của khách.');note.className='muted';optional.append(note);
 optional.append($('#captureAngle').closest('label'),root.querySelector('.thumbs'));review.after(optional);
 const advanced=node('details');advanced.className='photo-optional';advanced.append(node('summary','Thiết lập chụp nâng cao'));
 advanced.append($('#autoCapture').closest('label'),$('#retake'),guide.querySelector('details'));// GuidedCapture owns these controls and queries them within its panel.
 guide.append(advanced);
 // Remove duplicate angle navigation and progress totals from the primary task.
 for(const id of ['guidedSteps','nextCapture','qualitySummary'])$('#'+id).hidden=true;
 for(const p of [...guide.querySelectorAll(':scope > p.muted')].slice(1))p.hidden=true;
 for(const p of root.querySelectorAll(':scope > p.muted'))p.hidden=true;
 const summary=root.querySelector('.section-title h2');summary.textContent='Ảnh khách hàng';
 function sync(){const ready=!$('#selectedPreview').hidden;review.hidden=!ready;guide.classList.toggle('has-photo',ready);$('#captureHint').textContent=!$('#consent').checked?'Khách đồng ý sử dụng ảnh → mở camera hoặc chọn ảnh.':ready?'Kiểm tra ảnh bên dưới, sau đó bấm dựng mặt.':'Chọn một cách lấy ảnh bên dưới. Chỉ cần ảnh chính diện.';}
 new MutationObserver(sync).observe($('#selectedPreview'),{attributes:true,attributeFilter:['hidden','src']});$('#consent').addEventListener('change',sync);sync();
}
