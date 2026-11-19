// Copy the saved invoice into an editable packing-list draft; never change the invoice.
export function packingFromInvoice(invoice, date) {
 const data=invoice?.data;if(!data||!Array.isArray(data.items))throw Error('The invoice has no rug details.');
 const sourceItems=data.returned === true ? [] : data.items.filter(item=>!item.returned);
 if(!sourceItems.length)throw Error('This invoice has no active rugs to pack.');
 if(sourceItems.length>100)throw Error('This invoice has more than 100 rugs. Please prepare separate packing lists.');
 const clean=(value)=>value==null?'':String(value).trim();
 const size=item=>{const dimension=(f,i)=>{const feet=Number(f)||0,inches=Number(i)||0;return feet||inches?`${feet} ft ${inches} in`:'';};const width=dimension(item.widthFeet,item.widthInches),length=dimension(item.lengthFeet,item.lengthInches);if(item.shape==='round')return width?`${width} diameter`:'';return width&&length?`${width} × ${length}`:'';};
 const party=data.soldTo||{};
 return {kind:'packing',partyType:party.companyName?'business':'customer',date,name:[clean(party.name),clean(party.companyName)].filter(Boolean).join(' · '),address:[clean(party.address),[clean(party.city),clean(party.state),clean(party.zip)].filter(Boolean).join(' ')].filter(Boolean).join('\n'),phone:clean(party.phone),email:clean(party.email),reference:clean(data.invoiceNumber),notes:'',items:sourceItems.map(item=>({description:clean(item.description)||'Rug',sku:clean(item.sku),dimensions:size(item),packageType:'Roll',qty:1,weight:'',unitPrice:0}))};
}
