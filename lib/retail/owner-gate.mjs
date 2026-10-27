export function ownerIdentity(user,identity){return !!user&&user.uid===identity.uid&&user.email_verified===true&&String(user.email||'').toLowerCase()===identity.email.toLowerCase();}
export function assertOwnerStepUp(user,identity,now=Math.floor(Date.now()/1000),maxAge=300){
 if(!ownerIdentity(user,identity))throw Error('OWNER_ONLY');
 if(user.firebase?.sign_in_provider!=='password'||user.firebase?.sign_in_second_factor!=='totp'||!Number.isFinite(user.auth_time)||user.auth_time>now+30||now-user.auth_time>maxAge)throw Error('OWNER_REAUTH_REQUIRED');
 return user.auth_time+maxAge;
}

/** Enrollment bootstrap permits only enabling the provider; never private ledger access. */
export function assertOwnerEnrollment(user,identity,now=Math.floor(Date.now()/1000)){
 if(!ownerIdentity(user,identity))throw Error('OWNER_ONLY');
 if(user.firebase?.sign_in_provider!=='password'||!Number.isFinite(user.auth_time)||user.auth_time>now+30||now-user.auth_time>120)throw Error('OWNER_REAUTH_REQUIRED');
}
export function totpEnablePatch(config){
 const mfa=config.multiFactorConfig||{},providers=mfa.providerConfigs||[];
 if(providers.some(p=>p.totpProviderConfig&&p.state==='ENABLED'))return null;
 const existing=providers.find(p=>p.totpProviderConfig);
 return {multiFactorConfig:{...mfa,providerConfigs:[...providers.filter(p=>!p.totpProviderConfig),{...(existing||{}),state:'ENABLED',totpProviderConfig:{...(existing?.totpProviderConfig||{}),adjacentIntervals:existing?.totpProviderConfig?.adjacentIntervals??1}}]}};
}
