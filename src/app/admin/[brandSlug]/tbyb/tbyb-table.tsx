"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { updateTbybStatus } from "@/lib/admin/tbyb";
import type { TbybSubmission } from "@/lib/types";

const STATUSES = ["Curating", "Emailed", "Shipped", "Received"] as const;

const STATUS_DESCRIPTIONS: Record<string, string> = {
  Curating: "We're selecting your glasses",
  Emailed: "We've reached out to you",
  Shipped: "Your package is on the way",
  Received: "We got everything back",
};

const GRID = "1.2fr 1.4fr 1.1fr 1.6fr 1.2fr 32px";

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
  if (status === "Unpaid") return "#737373";
  if (status === "Shipped" || status === "Received" || status === "Refunded") return "#000000";
  return accent;
}

export default function TbybTable({
  initialSubmissions,
  accent,
}: {
  initialSubmissions: TbybSubmission[];
  accent: string;
}) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<TbybSubmission[]>(initialSubmissions);
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialSubmissions.map((s) => [s.id, s.status]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function handleStatusSave(id: string) {
    const status = draftStatus[id];
    setSaving(id);
    await updateTbybStatus(id, status);
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    setSaving(null);
  }

  const filterDefs = [
    { value: "all", label: `All (${submissions.length})` },
    ...["Unpaid", ...STATUSES, "Refunded"].map((s) => ({
      value: s,
      label: `${s} (${submissions.filter((sub) => sub.status === s).length})`,
    })),
  ];

  const filtered = submissions.filter((s) => filter === "all" || s.status === filter);

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
        <div>Submission</div>
        <div>Placed</div>
        <div>Customer</div>
        <div>Package</div>
        <div>Status</div>
        <div />
      </div>

      {filtered.map((sub) => {
        const isExpanded = expanded === sub.id;
        const isDropdownOpen = statusDropdown === sub.id;
        const sc = statusColor(sub.status, accent);
        const pairsDisplay =
          sub.packagePairsMin === sub.packagePairsMax
            ? String(sub.packagePairsMin)
            : `${sub.packagePairsMin}–${sub.packagePairsMax}`;
        const statusLocked = sub.status === "Unpaid" || sub.status === "Refunded";
        const saveDisabled = draftStatus[sub.id] === sub.status || saving !== null;

        return (
          <div key={sub.id} style={{ borderBottom: "1px solid #e5e5e5" }}>
            <div
              onClick={() => setExpanded(isExpanded ? null : sub.id)}
              style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, alignItems: "center", padding: "16px 0", cursor: "pointer" }}
            >
              <div style={{ fontSize: 14 }}>{displayId(sub.id)}</div>
              <div style={{ fontSize: 14, color: "#737373" }}>{formatDate(sub.createdAt)}</div>
              <div style={{ fontSize: 14 }}>{sub.contactName}</div>
              <div style={{ fontSize: 14 }}>{sub.packageName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: sc }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc, flexShrink: 0 }} />
                {sub.status}
              </div>
              <div style={{ fontSize: 16, color: "#737373", textAlign: "center", transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>
                ⌄
              </div>
            </div>

            {isExpanded && (
              <div style={{ background: "#fafafa", padding: "24px 24px 28px", marginBottom: 8 }}>
                {/* Contact · Package · Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, marginBottom: 28 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Contact</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                      <div style={{ color: "#737373" }}>{sub.contactName}</div>
                      <div>{sub.contactEmail}</div>
                      {sub.contactPhone !== "None" && <div style={{ color: "#737373" }}>{sub.contactPhone}</div>}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Package</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                      <div>{sub.packageName} · {formatPrice(sub.packagePriceCents)}</div>
                      <div style={{ color: "#737373" }}>{pairsDisplay} Pairs</div>
                      <div style={{ color: "#737373" }}>{sub.packageBrands.join(", ")}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Status</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <div
                          onClick={() => !statusLocked && setStatusDropdown(isDropdownOpen ? null : sub.id)}
                          style={{ height: 38, border: `1px solid ${statusLocked ? "#e5e5e5" : "#000000"}`, padding: "0 12px", fontSize: 13, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: statusLocked ? "default" : "pointer", userSelect: "none", boxSizing: "border-box", color: statusLocked ? "#737373" : "#000000" }}
                        >
                          <span>{draftStatus[sub.id]}</span>
                          <span style={{ fontSize: 10, opacity: statusLocked ? 0.3 : 1, transform: isDropdownOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>▾</span>
                        </div>
                        {isDropdownOpen && (
                          <>
                            <div onClick={() => setStatusDropdown(null)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                            <div style={{ position: "absolute", top: 40, left: 0, width: "100%", background: "#ffffff", border: "1px solid #000000", zIndex: 10, boxSizing: "border-box" }}>
                              {STATUSES.map((st) => {
                                const isActive = draftStatus[sub.id] === st;
                                return (
                                  <div
                                    key={st}
                                    onClick={() => { setDraftStatus((prev) => ({ ...prev, [sub.id]: st })); setStatusDropdown(null); }}
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
                        onClick={() => handleStatusSave(sub.id)}
                        disabled={saveDisabled}
                        style={{ height: 38, padding: "0 14px", background: accent, color: "#ffffff", border: "none", fontSize: 13, fontWeight: 500, cursor: saveDisabled ? "default" : "pointer", opacity: saveDisabled ? 0.4 : 1, flexShrink: 0 }}
                      >
                        {saving === sub.id ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {sub.refundedCents !== null && (
                      <div style={{ marginTop: 10, fontSize: 13, color: accent }}>
                        Refunded {formatPrice(sub.refundedCents)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Prescription grid · Special requests */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 28, paddingTop: 24, borderTop: "1px solid #e5e5e5" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>
                      Prescription · <span style={{ color: "#000000" }}>{sub.lensType}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr", gap: "10px 16px", fontSize: 13 }}>
                      <div />
                      <div style={{ color: "#737373" }}>Sphere</div>
                      <div style={{ color: "#737373" }}>Cylinder</div>
                      <div style={{ color: "#737373" }}>Axis</div>
                      <div style={{ color: "#737373" }}>OD</div>
                      <div>{sub.odSphere}</div>
                      <div>{sub.odCylinder}</div>
                      <div>{sub.odAxis}</div>
                      <div style={{ color: "#737373" }}>OS</div>
                      <div>{sub.osSphere}</div>
                      <div>{sub.osCylinder}</div>
                      <div>{sub.osAxis}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Special requests</div>
                    <div style={{ fontSize: 14, lineHeight: 1.55 }}>{sub.specialRequests}</div>
                  </div>
                </div>

                {/* Specifications */}
                <div style={{ paddingTop: 24, borderTop: "1px solid #e5e5e5", marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Specifications</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 14 }}>
                      <div style={{ color: "#737373" }}>Lens type</div><div>{sub.lensType}</div>
                      <div style={{ color: "#737373" }}>Helmet size</div><div>{sub.helmetSize}</div>
                      <div style={{ color: "#737373" }}>Hat size</div><div>{sub.hatSize}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 14 }}>
                      <div style={{ color: "#737373" }}>Nose bridge</div><div>{sub.noseBridge}</div>
                      <div style={{ color: "#737373" }}>Buying preference</div><div>{sub.buyingPreference}</div>
                      <div style={{ color: "#737373" }}>Frame type</div><div>{sub.frameType}</div>
                    </div>
                  </div>
                </div>

                {/* Shipping address · Prescription upload · Headshot */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, paddingTop: 24, borderTop: "1px solid #e5e5e5" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Shipping address</div>
                    {sub.shippingAddress ? (
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                        <div>{sub.shippingAddress.name}</div>
                        <div style={{ color: "#737373" }}>{sub.shippingAddress.line1}</div>
                        {sub.shippingAddress.line2 && <div style={{ color: "#737373" }}>{sub.shippingAddress.line2}</div>}
                        <div style={{ color: "#737373" }}>{sub.shippingAddress.city}, {sub.shippingAddress.state} {sub.shippingAddress.postalCode}</div>
                        <div style={{ color: "#737373" }}>{sub.shippingAddress.country}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 14 }}>None</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Prescription upload</div>
                    {sub.prescriptionUrl !== "None" ? (
                      <a href={sub.prescriptionUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#000000", textDecoration: "underline", textUnderlineOffset: 3 }}>
                        View prescription ↗
                      </a>
                    ) : (
                      <div style={{ fontSize: 14 }}>None</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#737373", marginBottom: 10 }}>Headshot photo</div>
                    {sub.headshotUrl !== "None" ? (
                      <a href={sub.headshotUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#000000", textDecoration: "underline", textUnderlineOffset: 3 }}>
                        View headshot ↗
                      </a>
                    ) : (
                      <div style={{ fontSize: 14 }}>None</div>
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
