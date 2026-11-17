import { Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";

// Centre pages are the Bongo AI product: their own palette (.bongo in
// globals.css) and Instrument Sans for Latin text.
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export default function CentreLayout({ children }: { children: ReactNode }) {
  return <div className={`bongo ${instrument.variable}`}>{children}</div>;
}
