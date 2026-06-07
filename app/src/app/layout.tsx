import type { Metadata } from 'next';
import { Anton, Bebas_Neue } from 'next/font/google';
import './globals.css';

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap'
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas-neue',
  display: 'swap'
});

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
    <html lang="es" className={`${anton.variable} ${bebasNeue.variable}`}>
      <body>{children}</body>
    </html>
  );
}
