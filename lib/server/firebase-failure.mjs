// Log only fixed diagnostic labels. Never log tokens, credentials or SDK messages.
export function classifyFirebaseFailure(error) {
 const code = error && typeof error.code === 'string' ? error.code : '';
 const message = error && typeof error.message === 'string' ? error.message : '';
 if (message === 'SIGN_IN_REQUIRED') return {status:401, diagnostic:'MISSING_BEARER_TOKEN'};
 const signIn = {
  'auth/id-token-expired':'TOKEN_EXPIRED',
  'auth/id-token-revoked':'TOKEN_REVOKED',
  'auth/invalid-id-token':'TOKEN_INVALID',
  'auth/argument-error':'TOKEN_ARGUMENT_INVALID',
  'auth/user-disabled':'USER_DISABLED',
  'auth/user-not-found':'USER_NOT_FOUND',
 };
 if (Object.hasOwn(signIn, code)) return {status:401, diagnostic:signIn[code]};
 const server = {
  'auth/invalid-credential':'SERVER_CREDENTIAL_INVALID',
  'app/invalid-credential':'SERVER_CREDENTIAL_INVALID',
  'auth/insufficient-permission':'SERVER_PERMISSION_DENIED',
  'auth/internal-error':'FIREBASE_AUTH_INTERNAL_ERROR',
  'app/invalid-app-options':'SERVER_CONFIG_INVALID',
 };
 if (Object.hasOwn(server, code)) return {status:503, diagnostic:server[code]};
 if (message === 'SERVER_NOT_CONFIGURED') return {status:503, diagnostic:'SERVER_CONFIG_MISSING'};
 if (message === 'FIREBASE_PROJECT_MISMATCH') return {status:503, diagnostic:'FIREBASE_PROJECT_MISMATCH'};
 if (error?.code === 7 || code === 'permission-denied') return {status:503, diagnostic:'DATABASE_PERMISSION_DENIED'};
 return {status:503, diagnostic:'SERVER_REQUEST_FAILED'};
}
