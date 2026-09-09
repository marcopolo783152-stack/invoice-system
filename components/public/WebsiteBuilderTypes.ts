export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  seo: {
    title: string;
    description: string;
    socialImage: string;
  };
  sections: CMSSection[];
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
}

export type CMSSectionType = 'hero' | 'text' | 'image-banner' | 'rug-carousel' | 'featured-rugs' | 'testimonials' | 'services' | 'contact' | 'custom-html';

export interface CMSSection {
  id: string;
  type: CMSSectionType;
  order: number;
  enabled: boolean;
  settings: Record<string, any>;
  content: Record<string, any>;
}

export interface CMSSettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headingStyle: string;
  buttonStyle: string;
  borderRadius: string;
  contentWidth: string;
  logo: string;
  favicon: string;
  defaultSocialImage: string;
}

export interface CMSMedia {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  size: number;
  createdAt: number;
}
