import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Startup Simulator — Guitar Pedal Route",
  description: "A choose-your-own-adventure founder game. Build OnlyPedal from idea to exit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
