/**
 * BUSINESS CONFIGURATION
 * 
 * Customize your business information here
 * This file is imported by the main page
 */

export const businessConfig = {
  // Your Business Information
  name: 'ARIANA ORIENTAL RUGS INC',
  address: '3210 DUKE ST',
  city: 'ALEXANDRIA',
  state: 'VA',
  zip: '22314',
  phone: '+1 (703) 801 1640',
  fax: '703-461-0208',
  website: '',
  email: 'arianaorientalrugs@gmail.com',
  
  // Invoice Settings
  defaultTerms: 'Due on Receipt',
  salesTaxRate: 0.06, // 6%
  
  // Default Invoice Mode
  defaultMode: 'retail-per-rug' as const,
};

export type BusinessConfig = typeof businessConfig;
