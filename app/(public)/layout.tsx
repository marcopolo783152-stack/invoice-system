import '../../public-styles.css';

import TopAdminBar from '@/components/TopAdminBar';

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
