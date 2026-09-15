export const OWNER_UID = 'msQJKLOsWceWK5A75V6ZBLQRvsl2';
export const OWNER_EMAIL = 'marcopolo783152@gmail.com';
export const ACCESS_SECTIONS = ['inventory','invoices','orders','appointments','messages','services','customers','reviews','content','promotions','reports','employees','settings','users'] as const;
export type AccessSection = typeof ACCESS_SECTIONS[number];
export type StaffRole = 'admin' | 'general_manager' | 'seller' | 'custom';
export type StaffAccess = { uid: string; email: string; name: string; role: StaffRole; active: boolean; permissions: Record<string, boolean> };
export const SELLER_PERMISSIONS: Record<string, boolean> = {
 'inventory.read': true, 'invoices.read': true, 'invoices.write': true,
 'orders.read': true, 'orders.write': true, 'customers.read': true, 'customers.write': true
};
export function canAccess(staff: StaffAccess | null, section: string, action = 'read') {
 if (!staff?.active || !ACCESS_SECTIONS.includes(section as AccessSection) || !['read','write','delete'].includes(action)) return false;
 if (staff.role === 'admin' || staff.role === 'general_manager') return true;
 if (section === 'users') return false;
 const permissions = staff.role === 'seller' ? SELLER_PERMISSIONS : staff.role === 'custom' ? staff.permissions : {};
 return permissions[section + '.' + action] === true;
}
export function sectionForTab(tab: string): AccessSection | null {
 const tabs: Record<string, AccessSection> = {
  analytics:'reports', inventory:'inventory', bulk_import:'inventory', orders:'orders', transactions:'reports',
  cleaning:'services', estimates:'services', appointments:'appointments', appraisals:'invoices', employees:'employees',
  clock:'employees', reviews:'reviews', messages:'messages', blogs:'content', promotions:'promotions', settings:'settings',
  builder:'content', crm:'customers', users:'users'
 };
 return tabs[tab] || null;
}
export function invoiceSection(path: string): AccessSection {
 if (/employees|clock/.test(path)) return 'employees';
 if (/settings/.test(path)) return 'settings';
 if (/inventory/.test(path)) return 'inventory';
 if (/service-tracking|service-vendors/.test(path)) return 'services';
 if (/reports|outstanding|audit-log/.test(path) || path === '/admin/invoices') return 'reports';
 return 'invoices';
}
