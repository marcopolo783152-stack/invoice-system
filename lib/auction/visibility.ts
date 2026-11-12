import {serverDb} from '@/lib/server/firebase-admin';
export const VISIBILITY_PATH='auction_visibility/current';
export const PAGE_MODES=['under_construction','coming_soon','open'] as const;
export async function auctionVisibility(){
 try{const d=(await serverDb().doc(VISIBILITY_PATH).get()).data();return {mode:PAGE_MODES.includes(d?.mode)?d!.mode:'under_construction',version:d?.version||0};}
 catch{return {mode:'under_construction',version:0};}
}
