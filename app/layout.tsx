import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { ToastProvider } from "@/components/ui/toast";
import { sansFont } from "./font-sans.generated";
import "./globals.css";

export const metadata: Metadata = {
  title: "DoItTimer",
  description: "Stay focused with tasks and sessions that keep you on track.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("theme")?.value;
  const theme = cookieTheme === "dark" ? "dark" : "light";

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body
        className={[
          "bg-background font-sans antialiased text-foreground",
          sansFont.variable,
        ].join(" ")}
      >
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
