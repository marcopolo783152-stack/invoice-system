/** Save a guest request with the document ID required by Firestore rules.
 * Never report success before the write completes, or silently lose selected photos.
 */
export async function submitServiceEstimate({formData,files,createReference,uploadImages,write,now=()=>new Date().toISOString()}) {
 const reference=createReference();
 if(!reference?.id)throw new Error('Unable to create your request. Please try again.');
 let images=[];
 if(files.length){
  try{images=await uploadImages();}
  catch{throw new Error('Your photos could not be uploaded. Your details are still here. Please try again, or remove the photos and submit without them.');}
  if(!Array.isArray(images)||images.length!==files.length)throw new Error('Some photos could not be uploaded. Please try again, or remove the photos and submit without them.');
 }
 const dimensions=formData.dimensions||((formData.widthFeet||formData.widthInches)&&(formData.lengthFeet||formData.lengthInches)
  ? `${formData.widthFeet||0}' ${formData.widthInches||0}" × ${formData.lengthFeet||0}' ${formData.lengthInches||0}"` : '');
 const data={...formData,dimensions,id:reference.id,status:'New',createdAt:now(),images};
 await write(reference,data);
 return reference.id;
}
