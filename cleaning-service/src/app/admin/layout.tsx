import type { Metadata } from "next";
import AdminLayoutClient from "./layout-client";

export const metadata: Metadata = {
  title: "Admin - Teman Cuci Sepatu",
  description: "Admin panel untuk mengelola pesanan",
  manifest: "/manifest-admin.json",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
