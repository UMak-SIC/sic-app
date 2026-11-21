import type { Metadata } from "next";
import { agrandir, montserrat } from "../lib/fonts";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "UMak Society of Innovative Computing",
    template: "%s | UMak SIC",
  },
  description:
    "The UMak Society of Innovative Computing: events, news and how to join, for CCIS students at the University of Makati.",
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
