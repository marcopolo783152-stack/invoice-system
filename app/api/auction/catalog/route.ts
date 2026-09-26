import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
// Public catalogs stay closed even if older staff previews exist in the database.
export async function GET(){return NextResponse.json({lots:[],publicEnabled:false,biddingEnabled:false,status:'under_construction'},{headers:{'Cache-Control':'no-store'}});}
