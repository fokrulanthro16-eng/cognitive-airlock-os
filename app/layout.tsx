import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cognitive Airlock OS - Sovereign Operational Guardian',
  description: 'Enterprise-grade zero-cost operational guardian for solo founders and freelancers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-cyan-500 selection:text-slate-950 font-sans">
        {children}
      </body>
    </html>
  );
}
