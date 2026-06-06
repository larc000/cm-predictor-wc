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
  title: 'Quiniela Mundialista 2026 - CM LATAM',
  description: 'Quiniela corporativa para registrar pronosticos y ranking.'
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
