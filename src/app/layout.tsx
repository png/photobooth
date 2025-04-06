import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photobooth App",
  description: "Wedding photobooth app by Jason",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Layout UI */}
        {/* Place children where you want to render a page or nested layout */}
        <main>{children}</main>
      </body>
    </html>
  );
}
