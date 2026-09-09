import { CMSSectionType } from './WebsiteBuilderTypes';

export const SECTION_SCHEMAS: Record<CMSSectionType, {
  name: string;
  fields: { name: string; label: string; type: 'string' | 'text' | 'image' | 'color' | 'boolean' | 'number' | 'select' | 'product_filter'; options?: string[] }[];
}> = {
  hero: {
    name: 'Hero Banner',
    fields: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'subtitle', label: 'Subtitle', type: 'string' },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'buttonText', label: 'Button Text', type: 'string' },
      { name: 'buttonLink', label: 'Button Link', type: 'string' },
      { name: 'backgroundImage', label: 'Background Image', type: 'image' },
      { name: 'overlayOpacity', label: 'Overlay Opacity (0-1)', type: 'number' }
    ]
  },
  text: {
    name: 'Text Block',
    fields: [
      { name: 'heading', label: 'Heading', type: 'string' },
      { name: 'content', label: 'Content', type: 'text' },
      { name: 'alignment', label: 'Alignment', type: 'select', options: ['left', 'center', 'right'] },
      { name: 'backgroundColor', label: 'Background Color', type: 'color' },
      { name: 'textColor', label: 'Text Color', type: 'color' }
    ]
  },
  'image-banner': {
    name: 'Image Banner',
    fields: [
      { name: 'imageUrl', label: 'Image URL', type: 'image' },
      { name: 'altText', label: 'Alt Text', type: 'string' },
      { name: 'link', label: 'Link URL', type: 'string' }
    ]
  },
  'rug-carousel': {
    name: 'Product Carousel',
    fields: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'subtitle', label: 'Subtitle', type: 'string' },
      { name: 'filter', label: 'Product Filter', type: 'product_filter' },
      { name: 'maxItems', label: 'Max Items', type: 'number' }
    ]
  },
  'featured-rugs': {
    name: 'Featured Rugs Grid',
    fields: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'filter', label: 'Product Filter', type: 'product_filter' },
      { name: 'columns', label: 'Columns', type: 'select', options: ['2', '3', '4'] }
    ]
  },
  testimonials: {
    name: 'Testimonials',
    fields: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'showGoogleReviews', label: 'Show Google Reviews', type: 'boolean' }
    ]
  },
  services: {
    name: 'Services Overview',
    fields: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'description', label: 'Description', type: 'text' }
    ]
  },
  contact: {
    name: 'Contact Section',
    fields: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'showForm', label: 'Show Contact Form', type: 'boolean' },
      { name: 'showMap', label: 'Show Map', type: 'boolean' }
    ]
  },
  'custom-html': {
    name: 'Custom HTML',
    fields: [
      { name: 'html', label: 'HTML Content', type: 'text' }
    ]
  }
};
