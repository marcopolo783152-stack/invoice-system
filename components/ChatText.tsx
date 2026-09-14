import React from 'react';
export default function ChatText({text}:{text:string}){
 return <>{text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part,i)=>{
 const m=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
 if(m&&m[2].startsWith('/')&&!m[2].startsWith('//')&&!m[2].includes('\\'))return <a key={i} href={m[2]} style={{textDecoration:'underline',fontWeight:600}}>{m[1]}</a>;
 return <React.Fragment key={i}>{part}</React.Fragment>;
 })}</>;
}
