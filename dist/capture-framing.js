// Coordinates here are unmirrored image coordinates, normalized to the visible
// camera viewport after centered object-fit: cover. No model claim of occlusion.
export function visibleFrame(sw,sh,vw,vh){
 if(![sw,sh,vw,vh].every(n=>Number.isFinite(n)&&n>0))return {x:0,y:0,width:1,height:1};
 const scale=Math.max(vw/sw,vh/sh),width=vw/(sw*scale),height=vh/(sh*scale);
 return {x:(1-width)/2,y:(1-height)/2,width,height};
}
export function mapBounds(b,frame={x:0,y:0,width:1,height:1}){
 const x=(b.x-frame.x)/frame.width,y=(b.y-frame.y)/frame.height;
 const width=b.width/frame.width,height=b.height/frame.height;
 return {x,y,width,height,right:x+width,bottom:y+height,cx:x+width/2,cy:y+height/2};
}
export function checkFraming(b,{mirrored=false,margin=.04}={}){
 const top=b.y-b.height*.08,bottom=b.bottom+b.height*.04;
 const left=b.x-b.width*.04,right=b.right+b.width*.04;
 const fail=(code,message)=>({ok:false,code,message});
 if((top<margin&&bottom>1-margin)||(left<margin&&right>1-margin))return fail('frame-close','Lùi xa một chút để lấy đủ trán, hai bên mặt và cằm.');
 // Directions describe the customer's movement on their mirror preview.
 if(top<margin)return fail('frame-top','Đưa mặt xuống một chút để lấy đủ vùng trán.');
 if(bottom>1-margin)return fail('frame-chin','Đưa mặt lên một chút để lấy đủ cằm.');
 if(left<margin)return fail('frame-side',mirrored?'Dịch mặt sang trái của bạn để vào giữa khung.':'Dịch mặt sang phải trong hình để vào giữa khung.');
 if(right>1-margin)return fail('frame-side',mirrored?'Dịch mặt sang phải của bạn để vào giữa khung.':'Dịch mặt sang trái trong hình để vào giữa khung.');
 return {ok:true,code:'frame-ready',message:'Khung mặt phù hợp theo điểm mốc ước lượng.'};
}
export class HintFilter{
 constructor(delay=550){this.delay=delay;this.reset()}
 reset(){this.current=null;this.next=null;this.since=0}
 update(q,now){
  if(!this.current){this.current=q;return q}
  if(q.code===this.current.code){this.current=q;this.next=null;return q}
  if(!this.next||this.next.code!==q.code){this.next=q;this.since=now}
  if(now-this.since>=this.delay){this.current=q;this.next=null}
  return this.current;
 }
}
