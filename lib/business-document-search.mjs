// Search only saved document fields, never payment or unrelated records.
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().trim();
export function documentMatches(doc,query,kind='all'){
 if(kind!=='all'&&doc.kind!==kind)return false;
 const words=normalize(query).split(/\s+/).filter(Boolean);if(!words.length)return true;
 const fields=[doc.id,doc.name,doc.address,doc.phone,doc.email,doc.reference,doc.notes,doc.date,doc.kind,doc.partyType,...(Array.isArray(doc.items)?doc.items.flatMap(i=>[i.sku,i.description,i.dimensions,i.packageType,i.weight,i.qty,i.unitPrice]):[])].map(normalize);
 const hay=fields.join(' ');
 return words.every(word=>hay.includes(word)||(/^\+?[\d().-]+$/.test(word)&&word.replace(/\D/g,'').length>=4&&fields.some(field=>field.replace(/\D/g,'').includes(word.replace(/\D/g,'')))));
}
