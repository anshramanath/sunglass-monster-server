import { getCatalogueStats, getOrderStats, getRecentProducts } from "@/lib/admin/overview";
import { formatPrice } from "@/lib/utils";
import { getBrandBySlug } from "@/lib/brand";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  const brand = getBrandBySlug(brandSlug);
  const brandName = brand?.name ?? brandSlug;
  const accent = brand?.accent ?? "#000000";

  const [catalogueStats, orderStats, recentProducts] = await Promise.all([
    getCatalogueStats(brandSlug),
    getOrderStats(brandSlug),
    getRecentProducts(brandSlug),
  ]);

  const catalogueRows = [
    { label: "Products", value: String(catalogueStats.products) },
    { label: "On sale", value: String(catalogueStats.onSale) },
    { label: "Featured", value: String(catalogueStats.featured) },
    { label: "Categories", value: String(catalogueStats.categories) },
  ];

  const orderRows = [
    { label: "Active orders", value: String(orderStats.active) },
    { label: "Completed orders", value: String(orderStats.completed) },
    { label: "Revenue", value: formatPrice(orderStats.revenue) },
    { label: "Refunded", value: String(orderStats.refunded) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "#737373", marginBottom: 6 }}>
          {brandName}
        </div>
        <div style={{ fontSize: 34, fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.01em" }}>
          Overview
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#737373", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          Catalogue
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#e5e5e5" }}>
          {catalogueRows.map((stat) => (
            <div key={stat.label} style={{ background: "#ffffff", padding: "22px 20px" }}>
              <div style={{ fontSize: 32, fontWeight: 400, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: "#737373", marginTop: 8 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#737373", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          Orders
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#e5e5e5" }}>
          {orderRows.map((stat) => (
            <div key={stat.label} style={{ background: "#ffffff", padding: "22px 20px" }}>
              <div style={{ fontSize: 32, fontWeight: 400, lineHeight: 1, color: stat.label === "Revenue" ? accent : undefined }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: "#737373", marginTop: 8 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#737373", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          Recently added products
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "56px 2fr 80px 1.4fr 120px 100px 100px", gap: 16, padding: "0 0 10px", borderBottom: "1px solid #000000", fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373" }}>
          <div />
          <div>Name</div>
          <div>Type</div>
          <div>Categories</div>
          <div>Price</div>
          <div>Sale</div>
          <div>Featured</div>
        </div>
        {recentProducts.length === 0 ? (
          <div style={{ padding: "40px 0", color: "#737373", fontSize: 15, borderTop: "1px solid #e5e5e5" }}>
            No products in this catalogue yet.
          </div>
        ) : (
          recentProducts.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "56px 2fr 80px 1.4fr 120px 100px 100px", gap: 16, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #e5e5e5" }}>
              {p.image ? (
                <div style={{ width: 44, height: 56, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={p.image} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
              </div>
              ) : (
                <div style={{ width: 44, height: 56, background: "#f5f5f5" }} />
              )}
              <div style={{ fontSize: 15 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: "#737373" }}>
                {p.sku ? "Simple" : "Variable"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.categories.map((cat) => (
                  <span key={cat} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", border: "1px solid #e5e5e5", padding: "3px 9px", color: "#525252", whiteSpace: "nowrap" }}>
                    {cat}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 14 }}>
                {p.sku && p.sale ? (
                  <>
                    <span style={{ textDecoration: "line-through", color: "#737373", marginRight: 6 }}>
                      {formatPrice(p.minPriceCents)}
                    </span>
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
          ))
        )}
      </div>
    </div>
  );
}
