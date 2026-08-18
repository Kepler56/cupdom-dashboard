import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portail client — CUPDOM',
  description: 'Vos campagnes, vos scans, vos contacts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
