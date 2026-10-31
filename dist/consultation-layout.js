// Move existing controls without duplicating state or changing component ownership.
export function prioritizeCosmetics(root=document){
 const panel=root.querySelector('#cosmetics'),viewer=root.querySelector('.viewer');
 viewer.querySelector('.angles').after(panel);
 panel.querySelector('h3').textContent='Thiết kế thẩm mỹ';
 const sections=[...panel.querySelector('fieldset').children].filter(el=>el.tagName==='DETAILS');
 const nav=document.createElement('nav');nav.className='cosmetic-services';nav.setAttribute('aria-label','Chọn dịch vụ mô phỏng');
 const labels=['Môi','Chân mày'];
 sections.forEach((section,i)=>{
  section.id='cosmetic-service-'+i;
  const button=document.createElement('button');button.type='button';button.textContent=labels[i];button.setAttribute('aria-controls',section.id);
  button.onclick=()=>select(i);nav.append(button);
 });
 function select(index){sections.forEach((section,i)=>{section.hidden=i!==index;section.open=i===index;nav.children[i].setAttribute('aria-pressed',String(i===index))});panel.dataset.activeService=index===0?'lips':'brows';const studio=panel.querySelector('.brow-studio');if(studio)studio.hidden=index!==1;}
 panel.querySelector('h3').after(nav);select(0);
 const controls=root.querySelector('.controls');controls.querySelector('h2').textContent='Điều chỉnh bổ sung';
 controls.querySelector('p.muted').textContent='Chỉnh hình mũi, cằm hoặc độ đầy môi khi cần.';
 const secondary=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Chỉnh hình mũi / cằm / môi';secondary.className='secondary-morphs';secondary.append(summary,root.querySelector('#sliders'));controls.querySelector('p.muted').after(secondary);
}
