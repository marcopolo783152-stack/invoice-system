import type {Metadata} from 'next';
import {PolicyHub} from '@/components/policies/StorePolicies';
export const metadata:Metadata={title:'Policies & Terms | Marco Polo Rugs',description:'Read Marco Polo Oriental Rugs policies for returns and exchanges, shipping and pickup, sales and services, and privacy.',alternates:{canonical:'https://www.marcopolorugs.com/policies'}};
export default function Page(){return <PolicyHub/>;}
