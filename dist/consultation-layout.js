// Distinct lip/brow technology navigation; only existing supported editors are interactive.
export function prioritizeCosmetics(root=document){
 const panel=root.querySelector('#cosmetics'),viewer=root.querySelector('.viewer');
 viewer.querySelector('.angles').after(panel);
 panel.querySelector('h3').textContent='Thiết kế thẩm mỹ';
 const sections=[...panel.querySelector('fieldset').children].filter(el=>el.tagName==='DETAILS');
 const nav=document.createElement('nav');nav.className='cosmetic-services';nav.setAttribute('aria-label','Chọn vùng tư vấn');
 const labels=['Môi','Mày'];
 const catalog=[
  {name:'Công nghệ môi',items:[
   ['Xăm môi','Đang có công cụ thử màu môi, độ phủ và viền môi. Đây là mô phỏng tư vấn, không dự đoán màu sau lành.',true],
   ['Phun môi MagnumLips','Đã có mô phỏng lớp màu và chuyển sắc tham khảo. Không thể dự đoán kết quả công nghệ thực tế.',true],
   ['Phun môi Collagen','Có mô phỏng hiệu ứng màu, ánh sáng và độ bóng môi tham khảo; không dự đoán tăng collagen hoặc kết quả điều trị.',true],
   ['Khử thâm và xử lý sắc tố môi','Mô phỏng cân bằng sắc độ môi để tư vấn. Không dự đoán kết quả điều trị hoặc thay đổi sắc tố sinh học.',true],
   ['Phun môi hiệu ứng màu tự nhiên','Chưa có mô phỏng chuyên biệt; có thể tham khảo màu tại Xăm môi.'],
   ['Tư vấn màu môi theo sắc da','Chưa có công cụ phân tích màu da tự động; tham khảo màu tại Xăm môi.'],
   ['Chỉnh sửa màu môi phun xăm cũ','Chưa có mô phỏng chỉnh sửa sắc tố cũ.'],
   ['Xử lý môi không đều màu','Chưa có mô phỏng xử lý vùng không đều màu.']
  ]},
  {name:'Công nghệ mày',items:[
   ['Thiết kế và định hình dáng chân mày','Đang có công cụ thử dáng, sợi/bột, chỉnh hai bên và kéo các điểm mày.',true],
   ['Điêu khắc chân mày tạo sợi tự nhiên','Chưa có mô phỏng chuyên biệt kỹ thuật điêu khắc.'],
   ['Công nghệ sợi siêu thực Sleekbrows','Chưa có mô phỏng riêng công nghệ Sleekbrows.'],
   ['Công nghệ sợi tàng hình DouYin','Chưa có mô phỏng riêng công nghệ DouYin.'],
   ['Phun mày Nanobrows','Chưa có mô phỏng riêng công nghệ Nanobrows.'],
   ['Phun mày đầu sợi đuôi phun','Chưa có mô phỏng riêng kết quả kỹ thuật này.'],
   ['Phun mày hiệu ứng Ombre, rải hạt','Chưa có mô phỏng riêng hạt mực; hiệu ứng Ombre trong Thiết kế mày chỉ mang tính minh họa.'],
   ['Chỉnh sửa chân mày phun xăm cũ','Chưa có mô phỏng sửa sắc tố phun xăm cũ.'],
   ['Tái tạo chân mày hư, lệch dáng hoặc trổ màu','Chưa có mô phỏng phục hồi hoặc xử lý trổ màu.']
  ]}
 ];
 function notifyTechnology(detail){const event=new panel.ownerDocument.defaultView.Event('faceform:technology',{bubbles:true});event.detail=detail;panel.dispatchEvent(event)}
 function updateStudio(){
  const studio=panel.querySelector('.brow-studio');
  if(studio)studio.hidden=panel.dataset.activeService!=='brows'||panel.dataset.activeTechnology!=='0';
 }
 function select(index){
  sections.forEach((section,i)=>{section.hidden=i!==index;section.open=i===index;nav.children[i].setAttribute('aria-pressed',String(i===index))});
  panel.dataset.activeService=index===0?'lips':'brows';
  panel.dataset.activeTechnology=sections[index].querySelector('.service-subcategory select').value;
  updateStudio();
  const active=sections[index].querySelector('.service-subcategory select');
  if(active)notifyTechnology({area:index===0?'lips':'brows',technology:Number(active.value),supported:index===0?Number(active.value)<=3:Number(active.value)===0});
 }
 sections.forEach((section,index)=>{
  section.id='cosmetic-service-'+index;
  const button=document.createElement('button');button.type='button';button.textContent=labels[index];button.setAttribute('aria-controls',section.id);
  button.onclick=()=>select(index);nav.append(button);
  const summary=section.querySelector('summary');
  summary.textContent=index===0?'Công cụ môi':'Công cụ mày';
  const editor=document.createElement('div');editor.className='technology-editor';
  while(summary.nextSibling)editor.append(summary.nextSibling);
  const wrapper=document.createElement('div');wrapper.className='service-subcategory';
  const title=document.createElement('label');title.textContent=catalog[index].name;
  const selectInput=document.createElement('select');selectInput.setAttribute('aria-label',catalog[index].name);
  catalog[index].items.forEach(([name],i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=name;selectInput.append(option)});
  const hint=document.createElement('p');hint.className='muted';hint.setAttribute('role','status');
  const heading=document.createElement('h4');heading.className='technology-heading';
  const stateLabel=document.createElement('p');stateLabel.className='technology-status';
  title.append(selectInput);wrapper.append(title,heading,stateLabel,hint);
  summary.after(wrapper,editor);
  if(index===0){for(const klass of ['.magnum-controls','.collagen-controls','.pigmentation-controls']){const element=panel.querySelector(klass);if(element)section.append(element)}}
  function choose(){
   const item=catalog[index].items[Number(selectInput.value)]||catalog[index].items[0];
   editor.hidden=index===0?Number(selectInput.value)!==0:!item[2];
   const magnum=panel.querySelector('.magnum-controls');if(magnum&&index===0)magnum.hidden=Number(selectInput.value)!==1;
   const collagen=panel.querySelector('.collagen-controls');if(collagen&&index===0)collagen.hidden=Number(selectInput.value)!==2;
   const pigmentation=panel.querySelector('.pigmentation-controls');if(pigmentation&&index===0)pigmentation.hidden=Number(selectInput.value)!==3;
   hint.textContent=item[1];
   wrapper.dataset.selectedTechnology=item[0];
   wrapper.setAttribute('data-technology-index',selectInput.value);
   const heading=wrapper.querySelector('.technology-heading');if(heading)heading.textContent=item[0];
   const stateLabel=wrapper.querySelector('.technology-status');if(stateLabel)stateLabel.textContent=item[2]?'Có công cụ minh họa':'Chưa có mô phỏng riêng – chỉ hiển thị thông tin tư vấn';
   if(panel.dataset.activeService===(index===0?'lips':'brows'))panel.dataset.activeTechnology=selectInput.value;
   updateStudio();
   if(panel.dataset.activeService===(index===0?'lips':'brows'))notifyTechnology({area:index===0?'lips':'brows',technology:Number(selectInput.value),supported:!!item[2]});
  }
  selectInput.addEventListener('change',choose);
  choose();
 });
 panel.querySelector('h3').after(nav);
 select(0);
 const controls=root.querySelector('.controls');
 controls.querySelector('h2').textContent='Điều chỉnh bổ sung';
 controls.querySelector('p.muted').textContent='Chỉnh hình mũi, cằm hoặc độ đầy môi khi cần.';
 const secondary=document.createElement('details'),summary=document.createElement('summary');
 summary.textContent='Chỉnh hình mũi / cằm / môi';secondary.className='secondary-morphs';
 secondary.append(summary,root.querySelector('#sliders'));controls.querySelector('p.muted').after(secondary);
}
