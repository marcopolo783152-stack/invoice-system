/** Booking success is separate from email delivery; never invite a duplicate booking. */
export function appointmentEmailFeedback(status){
 if(status==='accepted')return {sent:true,message:'Please check your email inbox and your spam or junk folder for your appointment request details.'};
 if(status==='pending')return {sent:false,message:'Your appointment request is saved and its email is pending. Please check your inbox and spam or junk folder. If no email arrives, call (703) 461-0207; do not book again.'};
 return {sent:false,message:'Your appointment request is saved, but we could not confirm that its email was sent. Please check your inbox and spam or junk folder. If no email arrives, call (703) 461-0207; do not book again.'};
}
