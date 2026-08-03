import { requireAdmin } from "@/lib/auth";
import Sidebar from "@/components/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-white font-[family-name:var(--font-hanken)]">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0 px-12 py-10 pb-16">{children}</main>
    </div>
  );
}
