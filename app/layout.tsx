import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trakeo de invitados",
  description: "Confirma tu asistencia y lleva el control de tu boda",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
