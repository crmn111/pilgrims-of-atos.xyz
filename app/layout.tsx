import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pilgrim of Atos - A 16-bit Journey",
  description: "A retro pixel platform game about a pilgrimage to the Holy Mountain of Atos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
