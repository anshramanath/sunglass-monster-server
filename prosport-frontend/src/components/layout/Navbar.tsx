import Link from "next/link";
import { BRAND_SLUG, getCategories } from "@/lib/api";
import NavMenu from "./NavMenu";

export default async function Navbar() {
  const categories = await getCategories(BRAND_SLUG).catch(() => []);

  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          proSPORT
        </Link>
        <NavMenu categories={categories} />
      </div>
    </header>
  );
}
