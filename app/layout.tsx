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
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          html, body {
            margin: 0;
            padding: 0;
            background: #1a1a2e;
            overflow: hidden;
          }
          #gameContainer, #gameCanvas {
            opacity: 0;
            transition: opacity 0.3s ease-in;
          }
          #gameContainer.loaded, #gameCanvas.loaded {
            opacity: 1;
          }
        `}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
