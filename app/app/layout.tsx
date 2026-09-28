import type { Metadata } from "next";
import { agrandir, montserrat } from "../lib/fonts";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "UMak SIC — Event & Operations Management",
  description: "Official event and attendance operations system for UMak SIC.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", agrandir.variable, montserrat.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
