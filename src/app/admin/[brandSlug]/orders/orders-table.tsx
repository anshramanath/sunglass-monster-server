"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { saveFulfillment, undoFulfillment } from "@/lib/admin/orders";
import type { Order } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  processing: "Processing",
  shipped: "Shipped",
  refunded: "Refunded",
};

const GRID = "1.2fr 1.4fr 1.1fr 0.7fr 1fr 1.2fr 32px";
const CARRIERS = ["UPS", "FedEx", "USPS", "Canada Post", "DHL"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function displayId(id: string) {
  return "#" + id.slice(-8).toUpperCase();
}

export default function OrdersTable({
  initialOrders,
  accent,
}: {
  initialOrders: Order[];
  accent: string;
}) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, Order & { acting: boolean }>>(() =>
    Object.fromEntries(initialOrders.map((o) => [o.id, { ...o, acting: false }]))
  );
  const [carrierOpen, setCarrierOpen] = useState(false);

  function statusColor(status: string) {
    if (status === "refunded") return accent;
    if (status === "processing") return "#737373";
    return "#000000";
  }

  function setCarrier(orderId: string, carrier: string) {
    setOrders((prev) => ({ ...prev, [orderId]: { ...prev[orderId], carrier } }));
    setCarrierOpen(false);
  }

  function setTracking(orderId: string, trackingNumber: string) {
    setOrders((prev) => ({ ...prev, [orderId]: { ...prev[orderId], trackingNumber } }));
  }

  async function handleSave(orderId: string) {
    const { carrier, trackingNumber } = orders[orderId];
    setOrders((prev) => ({ ...prev, [orderId]: { ...prev[orderId], acting: true } }));
    await saveFulfillment(orderId, carrier!, trackingNumber!);
    setOrders((prev) => ({ ...prev, [orderId]: { ...prev[orderId], status: "shipped", acting: false } }));
  }

  async function handleUndo(orderId: string) {
    setOrders((prev) => ({ ...prev, [orderId]: { ...prev[orderId], acting: true } }));
    await undoFulfillment(orderId);
    setOrders((prev) => ({ ...prev, [orderId]: { ...prev[orderId], carrier: null, trackingNumber: null, status: "processing", acting: false } }));
  }

  const orderList = Object.values(orders);

  const isPartialRefund = (o: typeof orderList[0]) => o.status !== "refunded" && o.refundedCents > 0;
  const isVeeqoErrored = (o: typeof orderList[0]) => o.veeqoOrderId === null && o.veeqoError !== null;

  const filterDefs = [
    { value: "all", label: `All (${orderList.length})` },
    ...Object.entries(STATUS_LABEL).map(([value, label]) => ({
      value,
      label: `${label} (${orderList.filter((o) => o.status === value).length})`,
    })),
    { value: "partial_refund", label: `Partially Refunded (${orderList.filter(isPartialRefund).length})` },
    { value: "veeqo_error", label: `Veeqo Error (${orderList.filter(isVeeqoErrored).length})` },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {filterDefs.map((f) => {
          const active = filter === f.value;
          return (
            <div
              key={f.value}
              onClick={() => { setFilter(f.value); setExpanded(null); }}
              style={{
                padding: "11px 18px",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "0.02em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                border: `1px solid ${active ? accent : "#000000"}`,
                background: active ? accent : "#ffffff",
                color: active ? "#ffffff" : "#000000",
              }}
            >
              {f.label}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, padding: "0 0 10px", borderBottom: "1px solid #000000", fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373" }}>
        <div>Order</div>
        <div>Placed</div>
        <div>Customer</div>
        <div>Items</div>
        <div>Total</div>
        <div>Status</div>
        <div />
      </div>

      {orderList.filter((o) => filter === "all" || (filter === "partial_refund" ? isPartialRefund(o) : filter === "veeqo_error" ? isVeeqoErrored(o) : o.status === filter)).map((o) => {
        const isExpanded = expanded === o.id;
        const sc = statusColor(o.status);
        const hasRefund = o.refundedCents > 0;
        const isShipped = o.status === "shipped";
        const isRefunded = o.status === "refunded";

        return (
          <div key={o.id} style={{ borderBottom: "1px solid #e5e5e5" }}>
            <div
              onClick={() => { setExpanded(isExpanded ? null : o.id) }}
              style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, alignItems: "center", padding: "16px 0", cursor: "pointer" }}
            >
              <div style={{ fontSize: 14 }}>{displayId(o.id)}</div>
              <div style={{ fontSize: 14, color: "#737373" }}>{formatDate(o.createdAt)}</div>
              <div style={{ fontSize: 14 }}>{o.shippingAddress.name}</div>
              <div style={{ fontSize: 14 }}>{o.items.length}</div>
              <div style={{ fontSize: 14 }}>{formatPrice(o.totalCents)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: sc }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc, flexShrink: 0 }} />
                {STATUS_LABEL[o.status]}
              </div>
              <div style={{ fontSize: 16, color: "#737373", textAlign: "center", transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>
                ⌄
              </div>
            </div>

            {isExpanded && (
              <div style={{ background: "#fafafa", padding: "24px 24px 28px", marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Shipping address</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                      <div>{o.shippingAddress.name}</div>
                      <div>{o.shippingAddress.line1}</div>
                      {o.shippingAddress.line2 && <div>{o.shippingAddress.line2}</div>}
                      <div>{o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.postal_code}</div>
                      <div>{o.shippingAddress.country}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Payment</div>
                    <div style={{ fontSize: 14, color: "#737373", fontFamily: "monospace" }}>{o.paymentIntent}</div>
                    {o.veeqoOrderId === null && o.veeqoError && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 18, marginBottom: 10 }}>Veeqo Error</div>
                        <div style={{ fontSize: 14 }}>{o.veeqoError}</div>
                      </>
                    )}
                    {hasRefund && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: accent, marginTop: 18, marginBottom: 10 }}>{isRefunded ? "Refunded" : "Partially Refunded"}</div>
                        <div style={{ fontSize: 14, color: accent }}>{formatPrice(o.refundedCents)}</div>
                      </>
                    )}
                  </div>

                  {!isRefunded && <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Fulfillment</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ position: "relative" }}>
                        <div
                          onClick={() => !isShipped && setCarrierOpen(!carrierOpen)}
                          style={{ height: 38, border: "1px solid #000000", padding: "0 12px", fontSize: 13, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: isShipped ? "default" : "pointer", userSelect: "none", boxSizing: "border-box", opacity: isShipped ? 0.5 : 1 }}
                        >
                          <span>{o.carrier || "Select carrier"}</span>
                          <span style={{ fontSize: 10, transform: carrierOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>▾</span>
                        </div>
                        {carrierOpen && (
                          <>
                            <div onClick={() => setCarrierOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                            <div style={{ position: "absolute", top: 40, left: 0, width: "100%", background: "#ffffff", border: "1px solid #000000", zIndex: 10, boxSizing: "border-box" }}>
                              {CARRIERS.map((c) => (
                                <div
                                  key={c}
                                  onClick={() => setCarrier(o.id, c)}
                                  style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", background: o.carrier === c ? accent : "#ffffff", color: o.carrier === c ? "#ffffff" : "#000000" }}
                                >
                                  {c}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          value={o.trackingNumber ?? ""}
                          onChange={(e) => setTracking(o.id, e.target.value)}
                          placeholder="Tracking number"
                          disabled={isShipped}
                          style={{ flex: 1, height: 38, border: "1px solid #e5e5e5", padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minWidth: 0, background: "#ffffff", opacity: isShipped ? 0.5 : 1 }}
                        />
                        {isShipped ? (
                          <button
                            onClick={() => handleUndo(o.id)}
                            disabled={o.acting}
                            style={{ height: 38, padding: "0 14px", background: "#ffffff", color: "#000000", border: "1px solid #000000", fontSize: 13, fontWeight: 500, cursor: o.acting ? "default" : "pointer", opacity: o.acting ? 0.4 : 1, flexShrink: 0 }}
                          >
                            {o.acting ? "Undoing…" : "Undo"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSave(o.id)}
                            disabled={o.acting || !o.carrier || !o.trackingNumber}
                            style={{ height: 38, padding: "0 14px", background: accent, color: "#ffffff", border: "none", fontSize: 13, fontWeight: 500, cursor: (o.acting || !o.carrier || !o.trackingNumber) ? "default" : "pointer", opacity: (o.acting || !o.carrier || !o.trackingNumber) ? 0.4 : 1, flexShrink: 0 }}
                          >
                            {o.acting ? "Saving…" : "Save"}
                          </button>
                        )}
                      </div>

                      {o.carrier && o.trackingNumber && (
                        <div style={{ fontSize: 12, color: "#737373" }}>{o.carrier} · {o.trackingNumber}</div>
                      )}
                    </div>
                  </div>}
                </div>

                <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Items</div>
                {o.items.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{ display: "grid", gridTemplateColumns: "44px 1.25fr 1fr 1fr 0.6fr 1fr", gap: 16, alignItems: "center", padding: "10px 0", borderTop: idx === 0 ? "none" : "1px solid #e5e5e5" }}
                  >
                    {item.imageSrc ? (
                      <div style={{ width: 36, height: 46, background: "#f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={item.imageSrc} alt={item.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
                      </div>
                    ) : (
                      <div style={{ width: 36, height: 46, background: "#f0f0f0", flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ fontSize: 14 }}>{item.name}</div>
                      {item.attribute && <div style={{ fontSize: 12, color: "#737373" }}>{item.attribute}</div>}
                    </div>
                    <div style={{ fontSize: 13, color: "#737373" }}>{item.sku}</div>
                    <div style={{ fontSize: 14 }}>{formatPrice(item.priceCents)}</div>
                    <div style={{ fontSize: 14, color: "#737373" }}>×{item.quantity}</div>
                    <div style={{ fontSize: 14 }}>{formatPrice(item.priceCents * item.quantity)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
