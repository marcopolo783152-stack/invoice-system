export const BUSINESS={
 name:'Marco Polo Oriental Rugs',address:'3260 Duke St, Alexandria, VA 22314',phone:'(703) 461-0207',
 hours:'Every day, 10am–6pm, with lunch from 1:30–2pm. Appointment times use Alexandria, Virginia time.',
 services:['rug cleaning','rug repair and restoration','rug appraisals','custom rug pads']
};
export function helpfulFallback(text:string){
 const t=text.trim().toLowerCase();
 if(/^(hi|hello|hey|good morning|good afternoon|good evening)[!.,\s]*$/.test(t))return {replyText:"Hello! Welcome to Marco Polo Oriental Rugs. I’m Cyrus, your AI showroom assistant. I’d be happy to help you find a rug, explore our care services or plan a visit. What can I help with?",requiresHandoff:false};
 if(/hours|open|close|lunch|sunday/.test(t))return {replyText:BUSINESS.hours+' You can book a visit at /services/book.',requiresHandoff:false};
 if(/address|location|where are|directions/.test(t))return {replyText:'You’ll find us at '+BUSINESS.address+'. You can reach our showroom at '+BUSINESS.phone+'. We’d love to welcome you.',requiresHandoff:false};
 if(/clean|wash|stain|odor/.test(t))return {replyText:'We can help with professional rug cleaning. The best treatment depends on your rug’s material and condition. Tell me about your rug, or request a service estimate at /services/estimate.',requiresHandoff:false};
 if(/repair|fringe|restore|restoration/.test(t))return {replyText:'Our team can assess rug repairs and restoration, including fringes and edges. Share a description and request an estimate at /services/estimate so the team can review your rug.',requiresHandoff:false};
 if(/appointment|book a visit/.test(t))return {replyText:'You can choose an available employee and time at /services/book. We’re open every day, 10am–6pm, and keep 1:30–2pm free for lunch.',requiresHandoff:false};
 return {replyText:'I’d like to get you an accurate answer from our showroom team. Please share your full name, email and phone number in the contact form. I’ll submit your request once you send it.',requiresHandoff:true};
}
export function validContact(value:any){
 return !!value&&typeof value.name==='string'&&value.name.trim().length>=2&&value.name.length<=100&&typeof value.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)&&value.email.length<=254&&typeof value.phone==='string'&&value.phone.length<=40&&value.phone.replace(/\D/g,'').length>=7;
}
