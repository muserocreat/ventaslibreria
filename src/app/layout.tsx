import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Libreria - Panel de Control",
  description: "Sistema de gestión moderno",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-950 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto h-screen relative border-l border-zinc-900 shadow-2xl print:border-none print:shadow-none">
          {children}
        </main>
      </body>
    </html>
  );
}
