import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://gongyou-zhilian.haozhen-2009.chatgpt.site'),
  title: '工友直连｜区域用工信息平台',
  description: '让附近真实有效的找人、找活信息及时相遇。',
  openGraph: {
    title: '工友直连｜附近有活，及时看见',
    description: '工地找人与工人找活的轻量信息平台，联系方式默认不公开。',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: '工友直连区域用工信息平台' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
