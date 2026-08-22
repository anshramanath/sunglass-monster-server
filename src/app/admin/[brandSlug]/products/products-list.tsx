"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { AdminProduct, CategoryOption } from "@/lib/types";
import { NavProgress } from "@/components/nav-progress";
import { getProducts } from "@/lib/admin/products";

const GRID = "56px 2fr 80px 1.2fr 1fr 90px 90px";

export default function ProductsList({
  accent,
  initialProducts,
  initialHasMore,
  categories,
  initialSearch,
  categoryId,
}: {
  accent: string;
  initialProducts: AdminProduct[];
  initialHasMore: boolean;
  categories: CategoryOption[];
  initialSearch: string;
  categoryId: string;
}) {
  const router = useRouter();
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const [navigating, setNavigating] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setNavigating(false); }, [initialSearch, categoryId]);

  function applySearch() {
    setNavigating(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (categoryId) params.set("category", categoryId);
    router.push(`?${params.toString()}`);
  }

  function applyCategory(id: string) {
    setDropdownOpen(false);
    setNavigating(true);
    const params = new URLSearchParams();
    if (initialSearch) params.set("search", initialSearch);
    if (id) params.set("category", id);
    router.push(`?${params.toString()}`);
  }

  async function handleLoadMore() {
    setLoading(true);
    setNavigating(true);
    const result = await getProducts(brandSlug, { search: initialSearch || undefined, categoryId: categoryId || undefined, offset: products.length });
    setProducts((prev) => [...prev, ...result.products]);
    setHasMore(result.hasMore);
    setLoading(false);
    setNavigating(false);
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div>
      <NavProgress active={navigating} accent={accent} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: 400, height: 44, flexShrink: 0 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search.trim() !== initialSearch && applySearch()}
            placeholder="Search by name or SKU"
            style={{ flex: 1, height: 44, border: "1px solid #000000", padding: "0 14px", fontSize: 14, fontFamily: "inherit", outline: "none", minWidth: 0, boxSizing: "border-box" }}
          />
          <button
            onClick={applySearch}
            disabled={search.trim() === initialSearch}
            style={{ height: 44, padding: "0 18px", background: accent, color: "#ffffff", border: "none", fontSize: 14, fontWeight: 500, cursor: search.trim() === initialSearch ? "default" : "pointer", opacity: search.trim() === initialSearch ? 0.4 : 1, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Search
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => { setNavigating(true); router.push(`/admin/${brandSlug}/products/new`); }}
          style={{ height: 44, padding: "0 18px", background: accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
        >
          + New product
        </button>
        <div style={{ position: "relative", width: 220, flexShrink: 0 }}>
          <div
            onClick={() => setDropdownOpen((o) => !o)}
            style={{ height: 44, border: "1px solid #000000", padding: "0 18px", fontSize: 14, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", userSelect: "none", boxSizing: "border-box" }}
          >
            <span style={{ color: accent }}>{selectedCategory?.name ?? "All categories"}</span>
            <span style={{ fontSize: 11, transform: dropdownOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>▾</span>
          </div>
          {dropdownOpen && (
            <>
              <div onClick={() => setDropdownOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
              <div style={{ position: "absolute", top: 46, right: 0, width: "100%", background: "#ffffff", border: "1px solid #000000", zIndex: 10, boxSizing: "border-box", maxHeight: 320, overflowY: "auto" }}>
              <div
                onClick={() => categoryId && applyCategory("")}
                style={{ padding: "10px 18px", fontSize: 14, cursor: !categoryId ? "default" : "pointer", background: !categoryId ? accent : "#ffffff", color: !categoryId ? "#ffffff" : "#000000" }}
              >
                All categories
              </div>
              {categories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => c.id !== categoryId && applyCategory(c.id)}
                  style={{ padding: "10px 18px", fontSize: 14, cursor: c.id === categoryId ? "default" : "pointer", background: c.id === categoryId ? accent : "#ffffff", color: c.id === categoryId ? "#ffffff" : "#000000" }}
                >
                  {c.name}
                </div>
              ))}
            </div>
            </>
          )}
        </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, padding: "0 0 10px", borderBottom: "1px solid #000000", fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373" }}>
        <div />
        <div>Name</div>
        <div>Type</div>
        <div>Categories</div>
        <div>Price</div>
        <div>Sale</div>
        <div>Featured</div>
      </div>

      <>
        {products.map((p) => (
            <div key={p.id} onClick={() => { setNavigating(true); router.push(`/admin/${brandSlug}/products/${p.id}`); }} style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #e5e5e5", cursor: "pointer" }}>
              <img src={p.image} alt={p.name} loading="lazy" style={{ width: 44, height: 56, objectFit: "cover", background: "#f5f5f5" }} />
              <div style={{ fontSize: 15 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: "#737373" }}>
                {p.variable ? "Variable" : "Simple"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.categories.map((cat) => (
                  <span key={cat} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", border: "1px solid #e5e5e5", padding: "3px 9px", color: "#525252", whiteSpace: "nowrap" }}>
                    {cat}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 14 }}>
                {!p.variable && p.sale ? (
                  <>
                    <span style={{ textDecoration: "line-through", color: "#737373", marginRight: 6 }}>{formatPrice(p.minPriceCents)}</span>
                    <span style={{ color: accent }}>{formatPrice(p.salePriceCents!)}</span>
                  </>
                ) : (
                  <span>
                    {p.minPriceCents === p.maxPriceCents
                      ? formatPrice(p.minPriceCents)
                      : `${formatPrice(p.minPriceCents)} – ${formatPrice(p.maxPriceCents)}`}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: p.sale ? accent : "#737373" }}>
                {p.sale ? "On sale" : "—"}
              </div>
              <div style={{ fontSize: 13, color: p.featured ? accent : "#737373" }}>
                {p.featured ? "Featured" : "—"}
              </div>
            </div>
          ))}

          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
              <button
                onClick={handleLoadMore}
                disabled={loading}
                style={{ height: 38, padding: "0 20px", border: "1px solid #000000", background: "#ffffff", fontSize: 14, fontWeight: 500, cursor: loading ? "default" : "pointer", color: loading ? "#737373" : "#000000" }}
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
      </>
    </div>
  );
}
