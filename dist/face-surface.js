// MediaPipe contour indices are ordered around the actual eye/lip openings.
// These caps retain photo texture; they are not reconstructed eyeballs or teeth.
export const PHOTO_OPENINGS = Object.freeze([
  {name:'right-eye', ring:[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246]},
  {name:'left-eye', ring:[263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466]},
  {name:'inner-mouth', ring:[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191]},
]);

export function buildFaceSurface(landmarks, connections) {
  const points = landmarks.map(p=>({...p}));
  const indices = [];
  for(let i=0;i+2<connections.length;i+=3){
    const ids=[...new Set(connections.slice(i,i+3).flatMap(e=>[e.start,e.end]))];
    if(ids.length===3)indices.push(...ids);
  }
  if(!indices.length)throw Error('Không tạo được lưới hình học.');
  const openings=[];
  for(const {name,ring} of PHOTO_OPENINGS){
    if(ring.some(i=>!points[i]||!['x','y','z'].every(k=>Number.isFinite(points[i][k]))))continue;
    // A fan shares the exact eyelid/lip boundary vertices with the face surface.
    // Its centroid gets matching image UVs and estimated depth, never a stock eye.
    const center={x:0,y:0,z:0};
    for(const i of ring)for(const k of ['x','y','z'])center[k]+=points[i][k]/ring.length;
    const centerIndex=points.length;
    points.push(center);
    const start=indices.length;
    for(let i=0;i<ring.length;i++)indices.push(centerIndex,ring[i],ring[(i+1)%ring.length]);
    openings.push({name,ring:[...ring],centerIndex,start,count:indices.length-start});
  }
  return {points,indices,openings};
}
