export function ownerIdentity(user,identity){return !!user&&user.uid===identity.uid&&user.email_verified===true&&String(user.email||'').toLowerCase()===identity.email.toLowerCase();}
export function assertOwnerStepUp(user,identity,now=Math.floor(Date.now()/1000),maxAge=300){
 if(!ownerIdentity(user,identity))throw Error('OWNER_ONLY');
 if(user.firebase?.sign_in_provider!=='password'||user.firebase?.sign_in_second_factor!=='totp'||!Number.isFinite(user.auth_time)||user.auth_time>now+30||now-user.auth_time>maxAge)throw Error('OWNER_REAUTH_REQUIRED');
 return user.auth_time+maxAge;
}
