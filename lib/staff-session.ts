import { StaffAccess } from './access-policy';
// Compatibility for legacy display/storage code only. Never an authorization source.
export function syncLegacyStaffSession(staff:StaffAccess|null) {
 if(typeof window==='undefined')return;
 for(const storage of [localStorage,sessionStorage]){
  storage.removeItem('mp-invoice-auth');storage.removeItem('mp-invoice-user');
  if(!staff){storage.removeItem('marcopolo_current_user');storage.removeItem('marcopolo_active_view');}
 }
 if(staff){
  sessionStorage.setItem('mp-invoice-auth','1');
  sessionStorage.setItem('mp-invoice-user',JSON.stringify({
   id:staff.uid,username:staff.email,email:staff.email,fullName:staff.name,name:staff.name,
   role:staff.role==='admin'||staff.role==='general_manager'?'admin':'employee',
   storeId:'',storeName:'Marco Polo Oriental Rugs'
  }));
 }
 window.dispatchEvent(new Event('storage'));
}
