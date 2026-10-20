(function(){
 function report(message){var el=document.getElementById('status');if(el){el.textContent=message;el.style.color='#ad422a';el.style.fontWeight='bold'}}
 window.addEventListener('error',function(e){if(e.target&&e.target.tagName==='SCRIPT')report('Không tải được ứng dụng. Hãy tải lại trang; nếu đang mở trong ChatGPT, thử mở bằng Safari.');else if(e.message)report('Ứng dụng gặp lỗi: '+e.message+'. Hãy tải lại trang hoặc thử mở bằng Safari.')},true);
 window.addEventListener('unhandledrejection',function(e){report('Không hoàn tất thao tác: '+(e.reason&&e.reason.message||'Lỗi tải thành phần. Hãy thử lại bằng Safari.'))});
 setTimeout(function(){if(!window.faceFormReady)report('Ứng dụng chưa khởi động được. Hãy mở đường dẫn bằng Safari và tải lại trang.')},12000);
})();
