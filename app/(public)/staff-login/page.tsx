import {redirect} from 'next/navigation';
export default function Page({searchParams}:{searchParams:{email?:string;next?:string}}){
 const query=new URLSearchParams();if(searchParams.email)query.set('email',searchParams.email);if(searchParams.next)query.set('next',searchParams.next);
 redirect('/sign-in'+(query.size?'?'+query.toString():''));
}
