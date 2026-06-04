import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
