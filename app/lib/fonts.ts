import localFont from "next/font/local";
import { Montserrat } from "next/font/google";

export const agrandir = localFont({
  src: [
    {
      path: "../fonts/Agrandir-GrandLight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/Agrandir-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Agrandir-TextBold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/Agrandir-GrandHeavy.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/Agrandir-ThinItalic.otf",
      weight: "100",
      style: "italic",
    },
    {
      path: "../fonts/Agrandir-WideBlackItalic.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-agrandir",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});
