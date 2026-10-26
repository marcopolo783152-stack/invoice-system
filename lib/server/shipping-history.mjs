export function labelMatches(label,search=''){
 const q=String(search).trim().toLowerCase();if(!q)return true;
 const fields=[label.receiver?.name,label.receiver?.company,label.receiver?.email,label.receiver?.phone,label.sender?.name,label.sender?.phone,label.sender?.email,label.result?.trackingNumber];
 if(fields.some(v=>String(v||'').toLowerCase().includes(q)))return true;
 const digits=q.replace(/\D/g,'');return digits.length>=3&&/^[\d\s()+.-]+$/.test(q)&&fields.some(v=>String(v||'').replace(/\D/g,'').includes(digits));
}
export function labelInHistory(label,mode='purchased'){return mode==='review'?['purchasing','needs_review'].includes(label.phase):label.phase==='complete';}
