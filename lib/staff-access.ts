import { doc, getDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { onIdTokenChanged, User } from 'firebase/auth';
import { auth } from './auth';
import { db } from './firebase';
import { StaffAccess, StaffRole, OWNER_UID, OWNER_EMAIL } from './access-policy';

export function verifiedIdentity(user: User | null) {
 return !!user && !user.isAnonymous && user.emailVerified && !!user.email;
}
export async function acceptStaffInvitation(user: User) {
 if (!verifiedIdentity(user)) return;
 const email = user.email!.toLowerCase();
 const roleRef = doc(db, 'showroom_roles', user.uid);
 // Existing disabled accounts cannot reactivate themselves through an old invitation.
 if ((await getDoc(roleRef)).exists()) return;
 const inviteRef = doc(db, 'showroom_staff_invites', email);
 await runTransaction(db, async tx => {
  const [role, invite] = await Promise.all([tx.get(roleRef), tx.get(inviteRef)]);
  if (role.exists() || !invite.exists()) return;
  const data = invite.data();
  if (data.active !== true || data.acceptedUid || !data.expiresAt || data.expiresAt.toMillis() <= Date.now()) return;
  tx.set(roleRef, { email, name: data.name, role: data.role, permissions: data.permissions || {}, active: true });
  tx.update(inviteRef, { acceptedUid: user.uid, active: false });
 });
}
export function subscribeStaff(callback: (staff: StaffAccess | null, user: User | null, error?: string, loading?: boolean) => void) {
 let stopRole = () => {};
 let generation = 0;
 const stopAuth = onIdTokenChanged(auth, user => {
  const ticket = ++generation;
  stopRole();
  callback(null, user, undefined, true);
  if (!verifiedIdentity(user)) { callback(null, user); return; }
  stopRole = onSnapshot(doc(db, 'showroom_roles', user!.uid), snap => {
   if (ticket !== generation) return;
   const data = snap.data();
   const owner = user!.uid === OWNER_UID && user!.email?.toLowerCase() === OWNER_EMAIL;
   if (!data || data.email?.toLowerCase() !== user!.email?.toLowerCase() || (data.active !== true && !owner) || data.active === false || !['admin','general_manager','seller','custom'].includes(data.role) || (data.role === 'admin' && !owner)) {
    callback(null, user); return;
   }
   callback({ uid: user!.uid, email: user!.email!, name: data.name || user!.displayName || user!.email!,
    role: data.role as StaffRole, active: true, permissions: data.permissions || {} }, user);
  }, () => callback(null, user, 'Your access could not be verified. Please retry or contact the owner.'));
 });
 return () => { generation++; stopAuth(); stopRole(); };
}
