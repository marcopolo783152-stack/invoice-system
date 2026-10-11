export const MAX_ESTIMATE_RUGS=20;
const dimensions=r=>r.dimensions||((r.widthFeet||r.widthInches)&&(r.lengthFeet||r.lengthInches)?`${r.widthFeet||0}' ${r.widthInches||0}" × ${r.lengthFeet||0}' ${r.lengthInches||0}"`:'');
/** Old requests are displayed as one rug without rewriting any saved data. */
export function estimateRugs(estimate){
 return Array.isArray(estimate.rugs)&&estimate.rugs.length?estimate.rugs:[{id:'legacy',service:estimate.service,rugType:estimate.rugType,dimensions:estimate.dimensions,description:estimate.description,images:estimate.images||[]}];
}
function validateRugs(rugs){
 if(!Array.isArray(rugs)||rugs.length<1||rugs.length>MAX_ESTIMATE_RUGS)throw Error('Please add between one and 20 rugs.');
 const ids=new Set();
 rugs.forEach((r,index)=>{
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error('Each rug must have a unique reference.');ids.add(r.id);
  if(!['Rug Cleaning','Rug Repair','Pet Stain & Odor Removal','Fringe & Binding Repair','Appraisal','Other'].includes(r.service))throw Error(`Choose a service for rug ${index+1}.`);
  if(!['Persian / Oriental','Silk','Wool','Antique','Machine Made','Unsure'].includes(r.rugType))throw Error(`Choose a type for rug ${index+1}.`);
  for(const field of ['widthFeet','lengthFeet','widthInches','lengthInches']){const n=r[field]??0;if(!Number.isInteger(n)||n<0||n>(field.endsWith('Inches')?11:100))throw Error(`Check the size of rug ${index+1}. Use feet and 0–11 inches.`);}
  if(typeof r.description!=='string'||r.description.length>4000)throw Error(`Please shorten the description for rug ${index+1}.`);
  if(!Array.isArray(r.files)||r.files.length>5)throw Error(`Choose up to five photos for rug ${index+1}.`);
  if(r.files.some(f=>f?.size>10*1024*1024||typeof f?.type==='string'&&!f.type.startsWith('image/')))throw Error(`Use image files up to 10 MB for rug ${index+1}.`);
 });
}
/** Wait for every selected photo and one confirmed Firestore write. */
export async function submitServiceEstimate({formData,files=[],rugs=null,createReference,uploadImages,write,now=()=>new Date().toISOString()}) {
 if(rugs!==null)validateRugs(rugs);
 const reference=createReference();
 if(!reference?.id)throw new Error('Unable to create your request. Please try again.');
 async function photos(selected,label=''){
  if(!selected.length)return [];
  let images;try{images=await uploadImages(selected);}
  catch{throw new Error(`Your photos${label} could not be uploaded. Your details are still here. Please try again, or remove the photos and submit without them.`);}
  if(!Array.isArray(images)||images.length!==selected.length)throw new Error(`Some photos${label} could not be uploaded. Please try again, or remove the photos and submit without them.`);
  return images;
 }
 let data;
 if(rugs!==null){
  const saved=[];
  for(const [index,rug] of rugs.entries())saved.push({id:rug.id,service:rug.service,rugType:rug.rugType,widthFeet:rug.widthFeet||0,widthInches:rug.widthInches||0,lengthFeet:rug.lengthFeet||0,lengthInches:rug.lengthInches||0,dimensions:dimensions(rug),description:rug.description,images:await photos(rug.files,` for rug ${index+1}`)});
  // Keep summary fields for existing notifications and legacy consumers.
  data={...formData,service:saved[0].service,rugType:saved[0].rugType,dimensions:saved.length===1?saved[0].dimensions:`${saved.length} rugs — see individual rug details`,description:saved.length===1?saved[0].description:saved.map((r,i)=>`Rug ${i+1}: ${r.service}; ${r.dimensions||'size not provided'}; ${r.description}`).join('\n'),images:saved.flatMap(r=>r.images),rugCount:saved.length,rugs:saved};
 }else{data={...formData,dimensions:dimensions(formData),images:await photos(files)};}
 await write(reference,{...data,id:reference.id,status:'New',createdAt:now()});
 return reference.id;
}
