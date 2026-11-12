export function loginDestination(user,role,next='',ownerUid='',ownerEmail=''){
 if(!user?.emailVerified)return '/verify-email';
 const owner=user.uid===ownerUid&&user.email?.toLowerCase()===ownerEmail.toLowerCase();
 const staff=role&&role.email?.toLowerCase()===user.email?.toLowerCase()&&role.active!==false&&(role.active===true||owner)&&['admin','general_manager','seller','custom'].includes(role.role)&&(role.role!=='admin'||owner);
 if(!staff)return '/account';
 const safe=typeof next==='string'&&!next.startsWith('//')&&!/[\\\r\n]/.test(next)&&(next==='/admin'||next.startsWith('/admin/')||['/staff-account','/payment-setup','/payment-test'].includes(next.split('?')[0]));
 return safe?next:'/admin';
}
