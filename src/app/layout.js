import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';


import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Book Writer Pro",
  description: "AI-based book writing assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>

      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-LN+7fdVzj6u52u30Kp6M/trliBMCMKTyK833zpbD+pXdCLuTusPj697FH4R/5mcr" crossOrigin="anonymous"></link>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js" integrity="sha384-ndDqU0Gzau9qJ1lfW4pNLlhNTkCfHzAVBReH9diLvGRem5+R9g2FzA8ZGN954O5Q" crossOrigin="anonymous" strategy="lazyOnload"></Script>
      </body>
    </html>
  );
}
