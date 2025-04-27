import type { Metadata } from "next";
import { Geist, Geist_Mono} from "next/font/google";
import { Fredoka } from 'next/font/google'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({ 
    weight: '400',
    subsets: ['latin'] 
})  

export const metadata: Metadata = {
  title: "Cows and Bulls",
  description: "Play the popular game Cows and Bulls online with your friends!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full h-full dark">
      <body
        className={`${geistSans.className} ${geistMono.className} ${fredoka.className} antialiased bg-background text-foreground w-full h-full`}
      >
        {children}
      </body>
    </html>
  );
}
