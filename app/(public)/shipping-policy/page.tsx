import {StorePolicyPage,policyMetadata} from '@/components/policies/StorePolicies';
export const metadata=policyMetadata('shipping-policy');
export default function Page(){return <StorePolicyPage slug="shipping-policy"/>;}
