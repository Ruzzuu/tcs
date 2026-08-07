import type { Metadata } from "next";
import AdminLayoutClient from "./layout-client";
import { ACTIVE_TENANT } from "@/config/tenant";

export const metadata: Metadata = {
  title: `Admin - ${ACTIVE_TENANT.name}`,
  description: "Admin panel untuk mengelola pesanan",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
