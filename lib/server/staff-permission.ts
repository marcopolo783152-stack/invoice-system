import 'server-only';
import {caller, serverDb} from './firebase-admin';
import {canAccess, OWNER_UID, OWNER_EMAIL, StaffAccess} from '@/lib/access-policy';
export async function requireStaff(request: Request, section: string, action = 'write') {
  const user = await caller(request);
  if (!user.email_verified) throw new Error('FORBIDDEN');
  const role = (await serverDb().doc('showroom_roles/' + user.uid).get()).data();
  const owner = user.uid === OWNER_UID && user.email?.toLowerCase() === OWNER_EMAIL;
  const valid = role && role.email?.toLowerCase() === user.email?.toLowerCase() &&
    (role.active === true || (owner && role.active !== false)) && (role.role !== 'admin' || owner);
  const staff = valid ? {...role, uid:user.uid, active:true} as StaffAccess : null;
  if (!canAccess(staff, section, action)) throw new Error('FORBIDDEN');
  return user;
}
