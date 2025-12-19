/**
 * GLOBAL LAYOUT
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rug Business Invoice System',
  description: 'Professional invoicing for rug business - Web, Android, Windows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
