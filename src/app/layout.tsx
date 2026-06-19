import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Pickonomics",
  description: "Pick winners in NFL, MLB, ACC, SEC, and Big Ten leagues",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="wrap">
          <Nav user={user} />
          {children}
        </div>
      </body>
    </html>
  );
}
