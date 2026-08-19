"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { updateRxStatus, saveRxFulfillment, undoRxFulfillment } from "@/lib/admin/rx-orders";
import type { RxOrder } from "@/lib/types";

const STATUSES = ["Processing", "Emailed", "Shipped"] as const;
const CARRIERS = ["UPS", "FedEx", "USPS", "Canada Post", "DHL"] as const;

const STATUS_DESCRIPTIONS: Record<string, string> = {
  Processing: "Order received, being processed",
  Emailed: "Customer has been contacted",
  Shipped: "Lenses are on the way",
};

const GRID = "1.2fr 1.4fr 1.4fr 0.9fr 1.1fr 32px";

function displayId(id: string) {
  return "#" + id.slice(-8).toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function statusColor(status: string, accent: string) {
  if (status === "Shipped" || status === "Refunded") return "#000000";
  return accent;
}

function pdDisplay(order: RxOrder) {
  if (order.pdMode === "Dual") return `L ${order.pdLeft} / R ${order.pdRight}`;
  return order.pd;
}

export default function RxOrdersTable({
  initialOrders,
  accent,
}: {
  initialOrders: RxOrder[];
  accent: string;
}) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [carrierDropdown, setCarrierDropdown] = useState<string | null>(null);
  const [orders, setOrders] = useState<RxOrder[]>(initialOrders);
  const [draft, setDraft] = useState<Record<string, { status: string; carrier: string; trackingNumber: string }>>(() =>
    Object.fromEntries(initialOrders.map((o) => [o.id, {
      status: o.status,
      carrier: o.carrier ?? "",
      trackingNumber: o.trackingNumber ?? "",
    }]))
  );
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [savingShipping, setSavingShipping] = useState<string | null>(null);

  function setDraftField(id: string, field: "status" | "carrier" | "trackingNumber", value: string) {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleStatusSave(id: string) {
    const { status } = draft[id];
    setSavingStatus(id);
    await updateRxStatus(id, status);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    const order = orders.find((o) => o.id === id);
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], carrier: order?.carrier ?? "", trackingNumber: order?.trackingNumber ?? "" },
    }));
    setSavingStatus(null);
  }

  async function handleFulfillmentSave(id: string) {
    const { carrier, trackingNumber } = draft[id];
    setSavingShipping(id);
    await saveRxFulfillment(id, carrier, trackingNumber);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, carrier, trackingNumber } : o));
    setSavingShipping(null);
  }

  async function handleFulfillmentUndo(id: string) {
    setSavingShipping(id);
    await undoRxFulfillment(id);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, carrier: null, trackingNumber: null } : o));
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], carrier: "", trackingNumber: "" } }));
    setSavingShipping(null);
  }

  const visible = orders.filter((o) => o.status !== "Unpaid");

  const filterDefs = [
    { value: "all", label: `All (${visible.length})` },
    ...[...STATUSES, "Refunded"].map((s) => ({
      value: s,
      label: `${s} (${visible.filter((o) => o.status === s).length})`,
    })),
    {
      value: "partial",
      label: `Partially Refunded (${visible.filter((o) => o.refundedCents !== null && o.status !== "Refunded").length})`,
    },
  ];

  const filtered = visible.filter((o) => {
    if (filter === "all") return true;
    if (filter === "partial") return o.refundedCents !== null && o.status !== "Refunded";
    return o.status === filter;
  });

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
                padding: "11px 18px", fontSize: 14, fontWeight: 500, letterSpacing: "0.02em",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
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
        <div>Total</div>
        <div>Status</div>
        <div />
      </div>

      {filtered.map((order) => {
        const isExpanded = expanded === order.id;
        const isStatusDropdownOpen = statusDropdown === order.id;
        const isCarrierDropdownOpen = carrierDropdown === order.id;
        const sc = statusColor(order.status, accent);
        const d = draft[order.id];
        const statusLocked = order.status === "Refunded";
        const isShipped = !!(order.carrier && order.trackingNumber);
        const shippingLocked = order.status !== "Shipped" || isShipped;
        const saveStatusDisabled = d.status === order.status || savingStatus !== null || savingShipping !== null;
        const saveFulfillmentDisabled = order.status !== "Shipped" || !d.carrier || !d.trackingNumber || savingShipping !== null || savingStatus !== null;
        const undoFulfillmentDisabled = savingShipping !== null || savingStatus !== null;

        return (
          <div key={order.id} style={{ borderBottom: "1px solid #e5e5e5" }}>
            <div
              onClick={() => setExpanded(isExpanded ? null : order.id)}
              style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, alignItems: "center", padding: "16px 0", cursor: "pointer" }}
            >
              <div style={{ fontSize: 14 }}>{displayId(order.id)}</div>
              <div style={{ fontSize: 14, color: "#737373" }}>{formatDate(order.createdAt)}</div>
              <div style={{ fontSize: 14 }}>{order.contactName}</div>
              <div style={{ fontSize: 14 }}>{formatPrice(order.totalPriceCents)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: sc }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc, flexShrink: 0 }} />
                {order.status}
              </div>
              <div style={{ fontSize: 16, color: "#737373", textAlign: "center", transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>
                ⌄
              </div>
            </div>

            {isExpanded && (
              <div style={{ background: "#fafafa", padding: "24px 24px 28px", marginBottom: 8 }}>
                {/* Contact · Frame · Status + Fulfillment */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, marginBottom: 28 }}>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Contact</div>
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                        <div>{order.contactName}</div>
                        <div style={{ color: "#737373" }}>{order.contactEmail}</div>
                        <div style={{ color: "#737373" }}>{order.contactPhone === "None" ? "None" : order.contactPhone}</div>
                      </div>
                    </div>
                    {order.stripePaymentIntent && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginTop: 18, marginBottom: 10 }}>Payment</div>
                        <div style={{ fontSize: 14, color: "#737373", fontFamily: "monospace" }}>{order.stripePaymentIntent}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Frame</div>
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                        <div>{order.frameName}</div>
                        <div style={{ color: "#737373" }}>{order.frameColor}</div>
                        <div style={{ color: "#737373" }}>
                          Total {formatPrice(order.totalPriceCents)} · Paid {formatPrice(order.stripeChargeCents)}
                        </div>
                        <div style={{ color: "#737373" }}>
                          {order.depositUsedCents !== null ? `Deposit ${formatPrice(order.depositUsedCents)}` : "None"}
                        </div>
                      </div>
                    </div>
                    {order.refundedCents !== null && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: accent, marginTop: 18, marginBottom: 10 }}>Refunded</div>
                        <div style={{ fontSize: 14, color: accent }}>{formatPrice(order.refundedCents)}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Status</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <div
                          onClick={() => !statusLocked && setStatusDropdown(isStatusDropdownOpen ? null : order.id)}
                          style={{ height: 38, border: `1px solid ${statusLocked ? "#e5e5e5" : "#000000"}`, padding: "0 12px", fontSize: 13, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: statusLocked ? "default" : "pointer", userSelect: "none", boxSizing: "border-box", color: statusLocked ? "#737373" : "#000000" }}
                        >
                          <span>{d.status}</span>
                          <span style={{ fontSize: 10, transform: isStatusDropdownOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>▾</span>
                        </div>
                        {isStatusDropdownOpen && (
                          <>
                            <div onClick={() => setStatusDropdown(null)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                            <div style={{ position: "absolute", top: 40, left: 0, width: "100%", background: "#ffffff", border: "1px solid #000000", zIndex: 10, boxSizing: "border-box" }}>
                              {STATUSES.map((st) => {
                                const isActive = d.status === st;
                                return (
                                  <div
                                    key={st}
                                    onClick={() => { setDraftField(order.id, "status", st); setStatusDropdown(null); }}
                                    style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", background: isActive ? accent : "#ffffff", color: isActive ? "#ffffff" : "#000000" }}
                                  >
                                    <div>{st}</div>
                                    <div style={{ fontSize: 11, color: isActive ? "#ffffff" : "#737373", marginTop: 2 }}>{STATUS_DESCRIPTIONS[st]}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handleStatusSave(order.id)}
                        disabled={saveStatusDisabled}
                        style={{ height: 38, padding: "0 14px", background: accent, color: "#ffffff", border: "none", fontSize: 13, fontWeight: 500, cursor: saveStatusDisabled ? "default" : "pointer", opacity: saveStatusDisabled ? 0.4 : 1, flexShrink: 0 }}
                      >
                        {savingStatus === order.id ? "Saving…" : "Save"}
                      </button>
                    </div>

                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e5e5e5", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ position: "relative" }}>
                        <div
                          onClick={() => !shippingLocked && setCarrierDropdown(isCarrierDropdownOpen ? null : order.id)}
                          style={{ height: 38, border: `1px solid ${shippingLocked ? "#e5e5e5" : "#000000"}`, padding: "0 12px", fontSize: 13, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: shippingLocked ? "default" : "pointer", userSelect: "none", boxSizing: "border-box", opacity: shippingLocked ? 0.5 : 1 }}
                        >
                          <span style={{ color: d.carrier ? "#000000" : "#737373" }}>{d.carrier || "Select carrier"}</span>
                          <span style={{ fontSize: 10, transform: isCarrierDropdownOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>▾</span>
                        </div>
                        {isCarrierDropdownOpen && (
                          <>
                            <div onClick={() => setCarrierDropdown(null)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                            <div style={{ position: "absolute", top: 40, left: 0, width: "100%", background: "#ffffff", border: "1px solid #000000", zIndex: 10, boxSizing: "border-box" }}>
                              {CARRIERS.map((c) => {
                                const isActive = d.carrier === c;
                                return (
                                  <div
                                    key={c}
                                    onClick={() => { setDraftField(order.id, "carrier", c); setCarrierDropdown(null); }}
                                    style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", background: isActive ? accent : "#ffffff", color: isActive ? "#ffffff" : "#000000" }}
                                  >
                                    {c}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          value={d.trackingNumber}
                          onChange={(e) => setDraftField(order.id, "trackingNumber", e.target.value)}
                          disabled={shippingLocked}
                          placeholder="Tracking number"
                          style={{ flex: 1, height: 38, boxSizing: "border-box", fontSize: 13, border: "1px solid #e5e5e5", padding: "0 12px", fontFamily: "inherit", color: "#000000", outline: "none", minWidth: 0, opacity: shippingLocked ? 0.5 : 1 }}
                        />
                        {isShipped ? (
                          <button
                            onClick={() => handleFulfillmentUndo(order.id)}
                            disabled={undoFulfillmentDisabled}
                            style={{ height: 38, padding: "0 14px", background: "#ffffff", color: "#000000", border: "1px solid #000000", fontSize: 13, fontWeight: 500, cursor: undoFulfillmentDisabled ? "default" : "pointer", opacity: undoFulfillmentDisabled ? 0.4 : 1, flexShrink: 0 }}
                          >
                            {savingShipping === order.id ? "Undoing…" : "Undo"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFulfillmentSave(order.id)}
                            disabled={saveFulfillmentDisabled}
                            style={{ height: 38, padding: "0 14px", background: accent, color: "#ffffff", border: "none", fontSize: 13, fontWeight: 500, cursor: saveFulfillmentDisabled ? "default" : "pointer", opacity: saveFulfillmentDisabled ? 0.4 : 1, flexShrink: 0 }}
                          >
                            {savingShipping === order.id ? "Saving…" : "Save"}
                          </button>
                        )}
                      </div>
                      {d.carrier && d.trackingNumber && (
                        <div style={{ fontSize: 12, color: "#737373" }}>{d.carrier} · {d.trackingNumber}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prescription · Vision type + Comments */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 28, paddingTop: 24, borderTop: "1px solid #e5e5e5" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Prescription</div>
                    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr", gap: "10px 16px", fontSize: 13 }}>
                      <div />
                      <div style={{ color: "#737373" }}>Sphere</div>
                      <div style={{ color: "#737373" }}>Cylinder</div>
                      <div style={{ color: "#737373" }}>Axis</div>
                      <div style={{ color: "#737373" }}>OD</div>
                      <div>{order.odSphere}</div>
                      <div>{order.odCylinder}</div>
                      <div>{order.odAxis}</div>
                      <div style={{ color: "#737373" }}>OS</div>
                      <div>{order.osSphere}</div>
                      <div>{order.osCylinder}</div>
                      <div>{order.osAxis}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Vision type</div>
                    <div style={{ fontSize: 14, marginBottom: 18 }}>{order.visionType}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Comments</div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, color: order.comments === "None" ? "#737373" : "#000000" }}>{order.comments}</div>
                  </div>
                </div>

                {/* Specifications */}
                <div style={{ paddingTop: 24, borderTop: "1px solid #e5e5e5", marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Specifications</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 16px", fontSize: 14 }}>
                    <div style={{ color: "#737373" }}>PD</div><div>{pdDisplay(order)}</div>
                    <div style={{ color: "#737373" }}>AR coating</div><div>{order.arCoating}</div>
                    <div style={{ color: "#737373" }}>Lens material</div><div>{order.lensMaterial}</div>
                    <div style={{ color: "#737373" }}>Scratch coating</div><div>{order.scratchCoating}</div>
                    <div style={{ color: "#737373" }}>Lens color</div><div>{order.lensColorCategory} · {order.lensColor}</div>
                    <div style={{ color: "#737373" }}>Mirror coating</div><div>{order.mirrorCoating}</div>
                  </div>
                </div>

                {/* Shipping address · Prescription upload · Headshot */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, paddingTop: 24, borderTop: "1px solid #e5e5e5" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Shipping address</div>
                    {order.shippingAddress ? (
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                        <div>{order.shippingAddress.name}</div>
                        <div>{order.shippingAddress.line1}</div>
                        {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                        <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</div>
                        <div>{order.shippingAddress.country}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, color: "#737373" }}>None</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Prescription upload</div>
                    {order.prescriptionUrl !== "None" ? (
                      <a href={order.prescriptionUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#000000", textDecoration: "underline", textUnderlineOffset: 3 }}>
                        View prescription ↗
                      </a>
                    ) : (
                      <div style={{ fontSize: 14, color: "#737373" }}>None</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Headshot photo</div>
                    {order.headshotUrl !== "None" ? (
                      <a href={order.headshotUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#000000", textDecoration: "underline", textUnderlineOffset: 3 }}>
                        View headshot ↗
                      </a>
                    ) : (
                      <div style={{ fontSize: 14, color: "#737373" }}>None</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
