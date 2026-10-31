// Service names supplied by Duyen Anh Academy; not a model of clinical outcomes.
export const ACADEMY_SERVICES=[
 {id:'brows',name:'Phun xăm chân mày',tab:1,items:[
 'Điêu khắc chân mày tạo sợi tự nhiên','Công nghệ sợi siêu thực Sleekbrows','Công nghệ sợi tàng hình DouYin','Phun mày Nanobrows','Phun mày đầu sợi đuôi phun','Phun mày hiệu ứng Ombre, rải hạt','Thiết kế và định hình dáng chân mày','Chỉnh sửa chân mày phun xăm cũ','Tái tạo chân mày hư, lệch dáng hoặc trổ màu'],note:'Chọn mẫu dáng, màu và hiệu ứng minh họa bên dưới. Mô phỏng chưa tái hiện kỹ thuật hay dự đoán kết quả riêng của Sleekbrows, DouYin, Nanobrows hoặc các công nghệ khác.'},
 {id:'lips',name:'Phun xăm môi',tab:0,items:[
 'Phun môi công nghệ MagnumLips','Phun môi Collagen','Khử thâm và xử lý sắc tố môi','Phun môi tạo hiệu ứng màu tự nhiên','Tư vấn lựa chọn màu môi theo sắc da','Chỉnh sửa màu môi phun xăm cũ','Xử lý môi không đều màu'],note:'Thử màu môi bằng các điều chỉnh bên dưới. Màu trên ảnh chỉ để đối chiếu; chưa mô phỏng riêng MagnumLips, Collagen, khử thâm hay màu sau lành.'},
 {id:'eyeliner',name:'Phun xăm mí mắt',items:[
 'Phun mí công nghệ Softliner','Phun viền mí tự nhiên','Tạo hiệu ứng hàng mi dày và sắc nét','Thiết kế đường mí phù hợp với dáng mắt'],note:'Danh mục tư vấn. Bản hiện tại chưa có công cụ vẽ đường mí hoặc mô phỏng Softliner.'},
 {id:'removal',name:'Xóa và sửa phun xăm',items:[
 'Xóa xăm bằng công nghệ Laser PicoPlus','Xử lý chân mày trổ xanh, trổ đỏ','Xóa và chỉnh sửa chân mày hư cũ','Xử lý sắc tố phun xăm không mong muốn','Tư vấn phục hồi và thực hiện lại phun xăm'],note:'Danh mục tư vấn. Chức năng làm mờ mày gốc chỉ giúp xem thử dáng mới; không mô phỏng hiệu quả Laser PicoPlus, xóa xăm hoặc phục hồi.'},
 {id:'skin',name:'Công nghệ thẩm mỹ da',items:[
 'Công nghệ Nano Plasma Fibroblast','Hỗ trợ cải thiện tình trạng lão hóa da','Hỗ trợ cải thiện độ săn chắc và bề mặt da'],note:'Danh mục tư vấn. Bản hiện tại chưa mô phỏng tác động của Nano Plasma Fibroblast hoặc kết quả cải thiện da.'}
];
export function mountAcademyServices(root){
 const section=document.createElement('section');section.className='academy-services';
 section.innerHTML='<p class="eyebrow">DUYÊN ANH ACADEMY</p><label>Nhóm dịch vụ<select id="academyGroup" aria-label="Nhóm dịch vụ"></select></label><label>Nội dung tư vấn<select id="academyService" aria-label="Nội dung tư vấn"></select></label><p id="academyServiceNote" role="status"></p>';
 const tabs=root.querySelector('.cosmetic-services'),fieldset=root.querySelector('fieldset');tabs.before(section);
 const groupSelect=section.querySelector('#academyGroup'),serviceSelect=section.querySelector('#academyService'),note=section.querySelector('#academyServiceNote');
 for(const group of ACADEMY_SERVICES){const option=document.createElement('option');option.value=group.id;option.textContent=group.name;groupSelect.append(option)}
 const selected=new Map();let active,changingTab=false;
 function render(id,selectTab=true){const group=ACADEMY_SERVICES.find(g=>g.id===id);if(!group)return;active=group.id;groupSelect.value=group.id;serviceSelect.replaceChildren();group.items.forEach((name,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=name;serviceSelect.append(option)});serviceSelect.value=String(selected.get(id)||0);note.textContent=group.note;fieldset.hidden=group.tab===undefined;
 if(selectTab&&group.tab!==undefined){changingTab=true;tabs.children[group.tab].click();changingTab=false;}
 }
 groupSelect.onchange=()=>render(groupSelect.value);serviceSelect.onchange=()=>selected.set(active,Number(serviceSelect.value));
 for(const group of ACADEMY_SERVICES.filter(g=>g.tab!==undefined))tabs.children[group.tab].addEventListener('click',()=>{if(!changingTab)render(group.id,false)});
 render('brows');
 return {clear(){selected.clear();render('brows')}};
}
