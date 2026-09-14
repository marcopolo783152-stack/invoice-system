import ts from 'typescript';
import {readFileSync} from 'node:fs';
const files=["app/(admin)/layout.tsx","app/(public)/account/page.tsx","app/(public)/admin/page.tsx","app/(public)/admin/users/page.tsx","app/(public)/forgot-password/page.tsx","app/(public)/page.tsx","app/(public)/sign-in/page.tsx","app/(public)/staff-account/page.tsx","app/(public)/staff-login/page.tsx","app/(public)/verify-email/page.tsx","app/api/chat/route.ts","components/AccountAccess.tsx","components/AdminOverview.tsx","components/ChatText.tsx","components/GlobalNotificationProvider.tsx","components/Login.tsx","components/LoginForm.tsx","components/NotificationModal.tsx","components/PublicAdminWrapper.tsx","components/Sidebar.tsx","components/StaffGate.tsx","components/StaffUsers.tsx","components/TopAdminBar.tsx","components/UserManagement.tsx","components/public/AdminChatBox.tsx","components/public/AdminDashboard.tsx","components/public/AuthModal.tsx","components/public/ChatWidget.tsx","components/public/Navbar.tsx","context/StoreContext.tsx","hooks/useStaffAccess.ts","lib/access-policy.ts","lib/auth.ts","lib/chat-client.ts","lib/chat-policy.ts","lib/firebase.ts","lib/server/firebase-admin.ts","lib/showroom-firebase.ts","lib/staff-access.ts","lib/staff-session.ts","types.ts"];
let failures=0;
for(const file of files){
 const source=ts.createSourceFile(file,readFileSync('../../'+file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 for(const error of source.parseDiagnostics){console.error(file+': '+ts.flattenDiagnosticMessageText(error.messageText,' '));failures++;}
}
if(failures)process.exit(1);
console.log('Parsed '+files.length+' TypeScript / TSX files.');
