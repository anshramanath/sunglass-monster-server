import { getRxOrders } from "@/lib/admin/rx-orders";
import { getBrandBySlug } from "@/lib/brand";
import RxOrdersTable from "./rx-orders-table";

export default async function RxOrdersPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  const brand = getBrandBySlug(brandSlug);
  const brandName = brand?.name ?? brandSlug;
  const accent = brand?.accent ?? "#000000";

  const orders = await getRxOrders(brandSlug);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "#737373", marginBottom: 6 }}>
          {brandName}
        </div>
        <div style={{ fontSize: 34, fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.01em" }}>
          Rx Orders
        </div>
      </div>

      <RxOrdersTable initialOrders={orders} accent={accent} />
    </div>
  );
}
