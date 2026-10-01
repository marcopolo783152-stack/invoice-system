import {createHash} from 'node:crypto';
export function tokenHash(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('INVALID_LINK');return createHash('sha256').update(token).digest('hex');}
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,o[k]]));
export function customerInvoice(data){
 if(!data||typeof data.invoiceNumber!=='string'||!Array.isArray(data.items)||!data.soldTo)throw Error('INVALID_INVOICE');
 const d=pick(data,['documentType','invoiceNumber','date','terms','mode','discountPercentage','discountValue','discountType','additionalCharges','notes','signature','signatureDate','returned','returnNote','servedBy','pickupDate','status','pickupSignature','downpayment','isLumpSum','lumpSumAmount']);
 d.mode=typeof d.mode==='string'?d.mode:data.documentType==='WASH'?'wash':data.documentType==='REPAIR'?'repair':'retail';d.terms=typeof d.terms==='string'?d.terms:'';
 d.soldTo=pick(data.soldTo,['name','companyName','address','city','state','zip','phone','email']);
 d.items=data.items.map(i=>pick(i,['id','sku','description','shape','widthFeet','widthInches','lengthFeet','lengthInches','pricePerSqFt','fixedPrice','pricingMethod','returned','returnNote','sold','soldDate','serviceType','conditions','origin','material','quality','design','colorBorder','colorBg']));
 d.payments=(data.payments||[]).map(p=>pick(p,['id','date','amount','method']));return d;
}
