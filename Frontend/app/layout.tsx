import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BETRIX // ADMIN TERMINAL',
  description: 'Institutional-grade Market Intelligence & Analysis Admin Terminal',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-accent selection:text-black">
        {children}
      </body>
    </html>
  );
}
