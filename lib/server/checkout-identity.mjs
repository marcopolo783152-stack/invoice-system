export function checkoutIdentity(user,guestRequested){
 if(user?.firebase?.sign_in_provider==='anonymous')return guestRequested===true?{...user,guest:true}:null;
 return user?.email_verified===true&&user.email?user:null;
}
