import type { Metadata } from "next";
import { Montserrat, Open_Sans, Permanent_Marker } from "next/font/google";

import "../index.css";

import Providers from "@/components/providers";
import { getToken } from "@/lib/auth-server";

// Tipografías de la identidad de Cireneos: Montserrat para títulos, Open Sans
// para textos y una letra pincel solo para "Rancho Cero" (inicio y login).
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const permanentMarker = Permanent_Marker({
  variable: "--font-permanent-marker",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "relevAI · Plataforma de fundaciones",
  description:
    "relevAI conecta fundaciones con herramientas de relevamiento y priorización asistidas por IA.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getToken();
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${openSans.variable} ${permanentMarker.variable} antialiased`}
      >
        <Providers initialToken={token}>
          <div className="flex min-h-svh flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
