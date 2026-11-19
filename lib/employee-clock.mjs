export function validDescriptor(v){return (Array.isArray(v)||ArrayBuffer.isView(v))&&v.length===128&&Array.from(v).every(x=>typeof x==='number'&&Number.isFinite(x));}
export function matchFace(sample,employees){
 if(!validDescriptor(sample))return null;
 const ranked=employees.filter(e=>e.active!==false&&validDescriptor(e.faceDescriptor)).map(e=>({employee:e,distance:Math.sqrt(Array.from(sample).reduce((sum,x,i)=>sum+(x-e.faceDescriptor[i])**2,0))})).sort((a,b)=>a.distance-b.distance);
 if(!ranked.length||ranked[0].distance>0.43||ranked.length>1&&ranked[1].distance-ranked[0].distance<0.10)return null;
 return ranked[0];
}
export function exactEmployee(identifier,employees){const clean=String(identifier||'').trim().toLowerCase();if(!clean)return null;const matches=employees.filter(e=>e.active!==false&&[e.pin,e.empId].some(v=>v!=null&&String(v).trim().toLowerCase()===clean));return matches.length===1?matches[0]:null;}
export function checkLocation(v){
 if(!v||![v.lat,v.lng,v.accuracy].every(Number.isFinite)||Math.abs(v.lat)>90||Math.abs(v.lng)>180||v.accuracy<0||v.accuracy>100)throw Error('Location is not accurate enough. Allow precise location and try near the showroom entrance.');
 const rad=x=>x*Math.PI/180,dlat=rad(v.lat-38.808028),dlng=rad(v.lng+77.087056);
 const a=Math.sin(dlat/2)**2+Math.cos(rad(38.808028))*Math.cos(rad(v.lat))*Math.sin(dlng/2)**2;
 if(6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))>60.96)throw Error('You must be at the showroom to clock in or out.');
 return {lat:v.lat,lng:v.lng,accuracy:v.accuracy};
}
