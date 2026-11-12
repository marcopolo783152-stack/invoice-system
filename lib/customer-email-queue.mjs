// Firestore rejects arrays directly containing arrays. Keep detail rows as maps.
export function queueEmailRecord(event){
 return {...event,details:(event.details||[]).map(row=>({label:String(Array.isArray(row)?row[0]:row.label),value:String((Array.isArray(row)?row[1]:row.value)??'')})),paragraphs:(event.paragraphs||[]).map(String)};
}
export function emailDetailRows(details=[]){return details.map(row=>Array.isArray(row)?row:[row.label,row.value]);}
