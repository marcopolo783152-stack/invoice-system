import {NextResponse} from 'next/server';
export function auctionFailure(error:unknown){
 const message=error instanceof Error?error.message:'';
 if(message==='SERVER_NOT_CONFIGURED'||/auth\/invalid-credential|app\/invalid-credential|PEM|private key/i.test(message))return NextResponse.json({error:'The auction server is not configured for this deployment. In Vercel, enable FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY for this deployment’s environment, then redeploy. Do not paste their values into chat.',code:'AUCTION_SERVER_CONFIG'},{status:503});
 if(message==='FIREBASE_PROJECT_MISMATCH')return NextResponse.json({error:'The server and website Firebase project IDs do not match. Correct the Vercel configuration before using auction management.',code:'AUCTION_PROJECT_MISMATCH'},{status:503});
 if(/SIGN_IN_REQUIRED|auth\/(id-token|argument|invalid|user-disabled|session)/.test(message))return NextResponse.json({error:'Please sign in again.',code:'SIGN_IN_REQUIRED'},{status:401});
 if(message==='FORBIDDEN')return NextResponse.json({error:'Your account needs auction management access (settings permission).',code:'FORBIDDEN'},{status:403});
 const code=String((error as any)?.code||'UNKNOWN');
 console.error('Auction request failed',{code,name:error instanceof Error?error.name:'unknown'});
 return NextResponse.json({error:'Auction data could not be loaded. Your records have not been replaced with empty data. Retry, or check the deployment’s server logs.',code:'AUCTION_SERVER_UNAVAILABLE'},{status:503});
}
