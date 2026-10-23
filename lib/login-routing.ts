import {doc,getDoc} from 'firebase/firestore';
import {auth} from './auth';
import {db} from './firebase';
import {acceptStaffInvitation} from './staff-access';
import {OWNER_UID,OWNER_EMAIL} from './access-policy';
import {loginDestination} from './login-destination.mjs';
export async function signedInDestination(){
 const user=auth.currentUser;if(!user||user.isAnonymous)throw Error('Please sign in first.');
 await user.reload();await user.getIdToken(true);
 if(!user.emailVerified)return '/verify-email';
 await acceptStaffInvitation(user);
 const role=(await getDoc(doc(db,'showroom_roles',user.uid))).data();
 return loginDestination(user,role,new URLSearchParams(window.location.search).get('next')||'',OWNER_UID,OWNER_EMAIL);
}
