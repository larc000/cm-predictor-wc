import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quiniela CM LATAM - COPA MUNDIAL FIFA 2026',
  description: 'Quiniela de la empresa para registrar pronosticos y leaderboard.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
