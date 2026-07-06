import { Metadata } from 'next';
import '../../public-styles.css';

import TopAdminBar from '@/components/TopAdminBar';

export const metadata: Metadata = {
  title: 'Marco Polo | Fine Hand-Knotted Rugs & Machine-Made Runners',
  description: 'Discover our premium collection of authentic hand-knotted Persian rugs, vintage runners, and luxurious machine-made carpets. Explore our curated oriental showroom.',
  keywords: 'rugs, runners, hand-knotted rugs, machine-made rugs, Persian rugs, oriental rugs, buy rugs online, carpet',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopAdminBar />
        {children}
      </body>
    </html>
  );
}
