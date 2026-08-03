"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";
import { getAllBrands } from "@/lib/brand";
import { NavProgress } from "@/components/nav-progress";

const BRANDS = getAllBrands();

const NAV = [
  { label: "Overview", path: "" },
  { label: "Orders", path: "/orders" },
  { label: "Products", path: "/products" },
  { label: "Categories", path: "/categories" },
  { label: "Analytics", path: "/analytics" },
];

export default function Sidebar({ user }: { user: User }) {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => { setNavigating(false); }, [pathname]);

  const currentBrand = BRANDS.find((b) => b.slug === brandSlug) ?? BRANDS[0];
  const name = (user.user_metadata?.name as string | undefined) ?? user.email ?? "";
  const initials = name[0].toUpperCase();

  function navigate(path: string) {
    setNavigating(true);
    router.push(path);
  }

  function isActive(path: string) {
    const base = `/admin/${brandSlug}`;
    return path === "" ? pathname === base : pathname.startsWith(base + path);
  }

  return (
    <aside className="w-[264px] flex-none sticky top-0 h-screen overflow-y-auto bg-white border-r border-[#e5e5e5] flex flex-col px-5 py-7 box-border">
      <NavProgress active={navigating} accent={currentBrand.accent} />
      <div className="h-10 mb-5 flex items-center pl-1">
        <Image
          src={currentBrand.logo}
          alt={currentBrand.name}
          width={160}
          height={40}
          className="max-h-10 w-auto object-contain object-left"
        />
      </div>

      <div className="mb-8">
        <div className="flex flex-col gap-2">
          {BRANDS.map((brand) => {
            const active = brand.slug === brandSlug;
            return (
              <div
                key={brand.slug}
                onClick={() => !active && navigate(`/admin/${brand.slug}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: `1px solid ${active ? brand.accent : "#e5e5e5"}`,
                  background: active ? brand.accent : "#ffffff",
                  color: active ? "#ffffff" : "#000000",
                  transition: "border-color 120ms",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: active ? "#ffffff" : brand.accent,
                    flexShrink: 0,
                  }}
                />
                <span>{brand.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col">
        {NAV.map(({ label, path }) => {
          const active = isActive(path);
          return (
            <div
              key={label}
              onClick={() => !active && navigate(`/admin/${brandSlug}${path}`)}
              style={{
                padding: "11px 12px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                background: active ? currentBrand.accent : "transparent",
                color: active ? "#ffffff" : "#525252",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {brandSlug === "bikershades" && (
        <div style={{ marginTop: 32 }}>
          <div
            onClick={() => !isActive("/tbyb") && navigate(`/admin/${brandSlug}/tbyb`)}
            style={{
              padding: "11px 12px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              background: isActive("/tbyb") ? currentBrand.accent : "transparent",
              color: isActive("/tbyb") ? "#ffffff" : "#525252",
            }}
          >
            TBYB
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="border-t border-[#e5e5e5] pt-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[12px] font-medium flex-none">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] truncate">{name}</div>
          <div className="text-[12px] text-[#737373] truncate">{user.email}</div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-[12px] text-[#737373] underline underline-offset-[3px] cursor-pointer flex-none"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
