import {auth} from './auth';
export async function chatRequest(body:Record<string,unknown>){
 await auth.authStateReady();
 const user=auth.currentUser;
 if(!user)throw Error('Chat could not connect. Please try again or call (703) 461-0207.');
 const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Your message was not sent. Please try again.');
 return data;
}
