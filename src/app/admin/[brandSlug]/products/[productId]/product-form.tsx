"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { NavProgress } from "@/components/nav-progress";
import { saveProduct, deleteProduct, uploadImage } from "@/lib/admin/product-detail";
import { slugify } from "@/lib/utils";
import type { CategoryOption, ProductDetailData, FormImage, FormVariation } from "@/lib/types";

function centsToDollars(cents: number) { return (cents / 100).toFixed(2); }
function dollarsToCents(str: string) { const n = parseFloat(str); return isNaN(n) ? 0 : Math.round(n * 100); }
function formatPrice(val: string) { const n = parseFloat(val); return isNaN(n) ? val : n.toFixed(2); }

const ATTR_SUGGESTIONS = ["color", "power", "transition", "quantity", "size"];

const inputStyle: React.CSSProperties = {
  border: "1px solid #d4d4d4",
  padding: "8px 10px",
  fontFamily: "inherit",
  fontSize: 14,
  color: "#000",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#737373",
  marginBottom: 12,
};

function Tag({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-block",
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 500,
        border: `1px solid ${accent}`,
        background: active ? accent : "transparent",
        color: active ? "#fff" : accent,
        cursor: "pointer",
        userSelect: "none",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function ProductForm({
  brandSlug,
  accent,
  isNew,
  initialProductId,
  product,
  categories,
}: {
  brandSlug: string;
  accent: string;
  isNew: boolean;
  initialProductId?: string;
  product: ProductDetailData | null;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [productId] = useState(() => initialProductId ?? crypto.randomUUID());

  const slugMismatch = product ? product.slug !== slugify(product.name) : false;
  const existingVariations = product?.variations ?? [];

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [bullets, setBullets] = useState<string[]>(product?.summary ?? [""]);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [sale, setSale] = useState(product?.sale ?? false);
  const [regularPrice, setRegularPrice] = useState(
    product ? centsToDollars(product.minPriceCents) : ""
  );
  const [salePrice, setSalePrice] = useState(
    product?.salePriceCents ? centsToDollars(product.salePriceCents) : ""
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(product?.categoryIds ?? []);
  const [images, setImages] = useState<FormImage[]>(product?.images ?? []);
  const [descImages, setDescImages] = useState<{ src: string; name: string }[]>(product?.descriptionImages ?? []);
  const [variations, setVariations] = useState<FormVariation[]>(
    existingVariations.map((v) => ({
      id: v.id,
      sku: v.sku,
      regularPrice: centsToDollars(v.regularPriceCents),
      salePrice: v.salePriceCents ? centsToDollars(v.salePriceCents) : "",
      sale: v.sale,
      attrs: v.attribute,
      images: v.images,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [attrDropdown, setAttrDropdown] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; proceedLabel: string; proceedColor: string; onProceed: () => void } | null>(null);

  const productImgInput = useRef<HTMLInputElement>(null);
  const descImgInput = useRef<HTMLInputElement>(null);
  const varImgInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const isSimple = variations.length === 0;
  const slug = slugify(name);

  // ── Bullets ──
  function setBullet(i: number, val: string) {
    setBullets((p) => p.map((b, idx) => (idx === i ? val : b)));
  }
  function removeBullet(i: number) {
    setBullets((p) => p.filter((_, idx) => idx !== i));
  }

  // ── Categories ──
  function removeCategory(id: string) {
    setCategoryIds((p) => p.filter((c) => c !== id));
  }
  function addCategory(id: string) {
    if (id && !categoryIds.includes(id)) setCategoryIds((p) => [...p, id]);
  }

  // ── Variations ──
  function updateVariation(id: string, fn: (v: FormVariation) => FormVariation) {
    setVariations((p) => p.map((v) => (v.id === id ? fn(v) : v)));
  }

  function addVariation() {
    if (variations.length === 0) {
      setVariations([{
        id: `new-${crypto.randomUUID()}`,
        sku,
        regularPrice,
        salePrice,
        sale,
        attrs: [{ name: "", option: "" }],
        images: [],
      }]);
      setSku("");
      setSale(false);
      setSalePrice("");
      setRegularPrice("");
    } else {
      setVariations((p) => [...p, {
        id: `new-${crypto.randomUUID()}`,
        sku: "",
        regularPrice: "",
        salePrice: "",
        sale: false,
        attrs: [{ name: "", option: "" }],
        images: [],
      }]);
    }
  }

  function removeVariation(id: string) {
    setVariations((p) => {
      const remaining = p.filter((v) => v.id !== id);
      if (remaining.length === 0) {
        const last = p.find((v) => v.id === id)!;
        setSku(last.sku);
        setRegularPrice(last.regularPrice);
        setSalePrice(last.salePrice);
        setSale(last.sale);
      }
      return remaining;
    });
  }

  // ── Attributes ──
  function addAttr(varId: string) {
    updateVariation(varId, (v) => ({ ...v, attrs: [...v.attrs, { name: "", option: "" }] }));
  }
  function removeAttr(varId: string, i: number) {
    updateVariation(varId, (v) => ({ ...v, attrs: v.attrs.filter((_, idx) => idx !== i) }));
  }
  function setAttrField(varId: string, i: number, field: "name" | "option" | "value", val: string) {
    updateVariation(varId, (v) => ({
      ...v,
      attrs: v.attrs.map((a, idx) => {
        if (idx !== i) return a;
        const updated = { ...a, [field]: val };
        if (field === "name" && val === "color" && !updated.value) updated.value = "#000000";
        return updated;
      }),
    }));
  }

  // ── Image upload ──
  async function handleImageUpload(file: File, target: "product" | string) {
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${safeName}-${crypto.randomUUID()}`;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", path);
      fd.append("bucket", brandSlug);

      const url = await uploadImage(fd);
      const imgName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

      if (target === "product") {
        setImages((p) => [...p, { src: url, name: imgName, sortOrder: p.length + 1 }]);
      } else if (target === "description") {
        setDescImages((p) => [...p, { src: url, name: imgName }]);
      } else {
        updateVariation(target, (v) => ({
          ...v,
          images: [...v.images, { src: url, name: imgName, sortOrder: v.images.length + 1 }],
        }));
      }
    } catch {
      setError("Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(i: number) {
    setImages((p) => p.filter((_, idx) => idx !== i).map((img, idx) => ({ ...img, sortOrder: idx + 1 })));
  }

  function removeVarImage(varId: string, i: number) {
    updateVariation(varId, (v) => ({
      ...v,
      images: v.images.filter((_, idx) => idx !== i).map((img, idx) => ({ ...img, sortOrder: idx + 1 })),
    }));
  }

  // ── Save ──
  async function handleSave() {
    if (!name.trim()) { setError("Product name is required."); return; }
    if (images.length === 0) { setError("At least one product image is required."); return; }
    if (!isSimple && variations.length < 2) { setError("A variable product must have at least 2 variations."); return; }
    if (isSimple && !sku.trim()) { setError("SKU is required for simple products."); return; }
    if (isSimple && sale) {
      if (!salePrice || dollarsToCents(salePrice) <= 0) { setError("Sale price must be greater than zero."); return; }
      if (dollarsToCents(salePrice) >= dollarsToCents(regularPrice)) { setError("Sale price must be less than regular price."); return; }
    }
    for (let vi = 0; vi < variations.length; vi++) {
      const v = variations[vi];
      const label = `Variation ${vi + 1}`;
      if (!v.sku.trim()) { setError(`${label}: SKU is required.`); return; }
      if (!v.regularPrice || dollarsToCents(v.regularPrice) <= 0) { setError(`${label}: regular price must be greater than zero.`); return; }
      if (v.sale) {
        if (!v.salePrice || dollarsToCents(v.salePrice) <= 0) { setError(`${label}: sale price must be greater than zero.`); return; }
        if (dollarsToCents(v.salePrice) >= dollarsToCents(v.regularPrice)) { setError(`${label}: sale price must be less than regular price.`); return; }
      }
      const badAttr = v.attrs.find((a) => !a.name || !a.option.trim() || (a.name === "color" && !a.value));
      if (v.attrs.length === 0 || badAttr) { setError(`${label}: attribute row is incomplete.`); return; }
    }
    if (!isSimple) {
      const skus = variations.map((v) => v.sku.trim());
      const dupSku = skus.find((s, i) => skus.indexOf(s) !== i);
      if (dupSku) { setError(`Duplicate SKU "${dupSku}" across variations.`); return; }
    }
    setSaving(true);
    setError(null);
    try {
      await saveProduct({
        brandSlug,
        productId,
        isNew,
        name: name.trim(),
        sku: isSimple ? sku.trim() : null,
        description: description.trim(),
        summary: bullets.filter((b) => b.trim()),
        featured,
        sale: isSimple ? sale : false,
        regularPriceCents: isSimple ? dollarsToCents(regularPrice) : 0,
        salePriceCents: isSimple ? (dollarsToCents(salePrice) || null) : null,
        categoryIds,
        images,
        descriptionImages: descImages,
        variations: variations.map((v) => ({
          id: v.id,
          sku: v.sku,
          regularPriceCents: dollarsToCents(v.regularPrice),
          salePriceCents: dollarsToCents(v.salePrice) || null,
          sale: v.sale,
          attribute: v.attrs,
          images: v.images,
        })),
      });
      router.push(`/admin/${brandSlug}/products`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save product.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteProduct(brandSlug, productId);
      router.push(`/admin/${brandSlug}/products`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete product.");
      setSaving(false);
    }
  }

  const availableCategories = categories.filter((c) => !categoryIds.includes(c.id));

  return (
    <div>
      <NavProgress active={saving || uploading || navigating} accent={accent} />

      {/* Top nav row */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => { setNavigating(true); router.push(`/admin/${brandSlug}/products`); }}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#737373", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
        >
          <span>←</span>
          <span>Back to products</span>
        </button>
      </div>


      {/* Slug mismatch banner */}
      {slugMismatch && (
        <div style={{ marginBottom: 16, fontSize: 13, color: accent, padding: "10px 14px", border: `1px solid ${accent}`, background: `${accent}0d` }}>
          This product's slug is out of sync with the database. Save to resolve.
        </div>
      )}

      {/* Name + tags */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          style={{ ...inputStyle, flex: 1, fontSize: 30, fontWeight: 400, letterSpacing: "-0.01em", padding: "10px 14px", border: "1px solid #e5e5e5" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Tag active={featured} accent={accent} onClick={() => setFeatured((f) => !f)}>
            {featured ? "Featured" : "Not featured"}
          </Tag>
          {isSimple && (
            <Tag active={sale} accent={accent} onClick={() => setSale((s) => !s)}>
              {sale ? "On sale" : "Not on sale"}
            </Tag>
          )}
        </div>
      </div>

      {/* Slug + SKU */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #e5e5e5", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#737373", fontFamily: "monospace" }}>/{slug || "product-slug"}</span>
        {isSimple && (
          <>
            <span style={{ color: "#d4d4d4" }}>·</span>
            <label style={{ fontSize: 12, color: "#737373", display: "flex", alignItems: "center", gap: 8 }}>
              SKU
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-001"
                style={{ ...inputStyle, fontSize: 13, width: 240, padding: "6px 10px" }}
              />
            </label>
          </>
        )}
      </div>

      {/* Price (simple only) */}
      {isSimple && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: "#737373" }}>
            Regular price
            <input
              type="number"
              step="1"
              min="0"
              value={regularPrice}
              onChange={(e) => setRegularPrice(e.target.value)}
              onBlur={(e) => setRegularPrice(formatPrice(e.target.value))}
              placeholder="0.00"
              style={{ ...inputStyle, display: "block", marginTop: 6, width: 140 }}
            />
          </label>
          <label style={{ fontSize: 12, color: sale ? "#737373" : "#a3a3a3" }}>
            Sale price
            <input
              type="number"
              step="1"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              onBlur={(e) => setSalePrice(formatPrice(e.target.value))}
              placeholder="0.00"
              disabled={!sale}
              style={{ ...inputStyle, display: "block", marginTop: 6, width: 140, color: accent, opacity: sale ? 1 : 0.4 }}
            />
          </label>
        </div>
      )}

      {/* Description + Bullets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 40 }}>
        <div>
          <div style={sectionTitle}>Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
            style={{ ...inputStyle, width: "100%", resize: "none", lineHeight: 1.55 }}
          />
        </div>
        <div>
          <div style={sectionTitle}>Summary bullet points</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bullets.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  value={b}
                  onChange={(e) => setBullet(i, e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <span
                  onClick={() => removeBullet(i)}
                  style={{ cursor: "pointer", color: "#a3a3a3", fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}
                >
                  ×
                </span>
              </div>
            ))}
            <button
              onClick={() => setBullets((p) => [...p, ""])}
              style={{ fontSize: 13, color: "#737373", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0, textAlign: "left", fontFamily: "inherit", width: "fit-content" }}
            >
              + Add bullet
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div style={{ marginBottom: 40 }}>
        <div style={sectionTitle}>Categories</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {categoryIds.map((id) => {
            const cat = categories.find((c) => c.id === id);
            if (!cat) return null;
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #000", padding: "6px 10px", fontSize: 13 }}>
                <span>{cat.name}</span>
                <span onClick={() => removeCategory(id)} style={{ cursor: "pointer", color: "#a3a3a3" }}>×</span>
              </div>
            );
          })}
          {availableCategories.length > 0 && (
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setCatDropdownOpen((o) => !o)}
                style={{ height: 34, border: "1px solid #000000", padding: "0 10px", fontSize: 13, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", userSelect: "none", boxSizing: "border-box", color: "#737373", whiteSpace: "nowrap" }}
              >
                <span>+ Add category</span>
                <span style={{ fontSize: 10, transform: catDropdownOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>▾</span>
              </div>
              {catDropdownOpen && (
                <>
                  <div onClick={() => setCatDropdownOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                  <div style={{ position: "absolute", top: 36, left: 0, minWidth: "100%", background: "#ffffff", border: "1px solid #000000", zIndex: 10, boxSizing: "border-box", maxHeight: 320, overflowY: "auto" }}>
                    {availableCategories.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => { addCategory(c.id); setCatDropdownOpen(false); }}
                        style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer" }}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product images */}
      <div style={{ marginBottom: 48 }}>
        <div style={sectionTitle}>Product images</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          {images.map((img, i) => (
            <div key={i} style={{ width: 88 }}>
              <div style={{ width: 88, height: 110, background: "#f5f5f5", overflow: "hidden" }}>
                <img src={img.src} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <span onClick={() => removeImage(i)} style={{ cursor: "pointer", fontSize: 15, color: "#737373" }}>×</span>
                <span style={{ fontSize: 11, color: "#737373" }}>{img.sortOrder}</span>
              </div>
            </div>
          ))}
          <button
            onClick={() => productImgInput.current?.click()}
            disabled={uploading}
            style={{ width: 88, height: 110, border: "1px dashed #d4d4d4", background: "none", cursor: uploading ? "default" : "pointer", fontSize: 22, color: "#a3a3a3", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {uploading ? "…" : "+"}
          </button>
          <input
            ref={productImgInput}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "product"); e.target.value = ""; }}
          />
        </div>
      </div>

      {/* Description images */}
      <div style={{ marginBottom: 48 }}>
        <div style={sectionTitle}>Description images</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          {descImages.map((img, i) => (
            <div key={i} style={{ width: 88 }}>
              <div style={{ width: 88, height: 110, background: "#f5f5f5", overflow: "hidden" }}>
                <img src={img.src} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ marginTop: 4 }}>
                <span onClick={() => setDescImages((p) => p.filter((_, idx) => idx !== i))} style={{ cursor: "pointer", fontSize: 15, color: "#737373" }}>×</span>
              </div>
            </div>
          ))}
          <button
            onClick={() => descImgInput.current?.click()}
            disabled={uploading}
            style={{ width: 88, height: 110, border: "1px dashed #d4d4d4", background: "none", cursor: uploading ? "default" : "pointer", fontSize: 22, color: "#a3a3a3", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {uploading ? "…" : "+"}
          </button>
          <input
            ref={descImgInput}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "description"); e.target.value = ""; }}
          />
        </div>
      </div>

      {/* Variations */}
      <div style={{ paddingTop: 32, borderTop: "1px solid #000" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 400 }}>Variations · {variations.length}</div>
          <button
            onClick={addVariation}
            style={{ height: 38, padding: "0 16px", border: "1px solid #000", background: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            + Add variation
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {variations.map((v, vIdx) => (
            <div key={v.id} style={{ border: "1px solid #e5e5e5" }}>
              {/* Variation header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #e5e5e5", background: "#f9f9f9" }}>
                <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "#737373" }}>
                  Variation {vIdx + 1}
                </div>
                <button
                  onClick={() => removeVariation(v.id)}
                  style={{ fontSize: 13, color: "#737373", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, fontFamily: "inherit" }}
                >
                  Remove
                </button>
              </div>

              {/* Variation body */}
              <div style={{ padding: 20 }}>
                {/* SKU + sale toggle row */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "#737373", marginBottom: 6 }}>SKU</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      value={v.sku}
                      onChange={(e) => updateVariation(v.id, (vv) => ({ ...vv, sku: e.target.value }))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <Tag active={v.sale} accent={accent} onClick={() => updateVariation(v.id, (vv) => ({ ...vv, sale: !vv.sale }))}>
                      {v.sale ? "On sale" : "Not on sale"}
                    </Tag>
                  </div>
                </div>

                {/* Prices row */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12, color: "#737373" }}>
                    Regular price
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={v.regularPrice}
                      onChange={(e) => updateVariation(v.id, (vv) => ({ ...vv, regularPrice: e.target.value }))}
                      onBlur={(e) => updateVariation(v.id, (vv) => ({ ...vv, regularPrice: formatPrice(e.target.value) }))}
                      placeholder="0.00"
                      style={{ ...inputStyle, display: "block", marginTop: 6, width: 140 }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: v.sale ? "#737373" : "#a3a3a3" }}>
                    Sale price
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={v.salePrice}
                      onChange={(e) => updateVariation(v.id, (vv) => ({ ...vv, salePrice: e.target.value }))}
                      onBlur={(e) => updateVariation(v.id, (vv) => ({ ...vv, salePrice: formatPrice(e.target.value) }))}
                      placeholder="0.00"
                      disabled={!v.sale}
                      style={{ ...inputStyle, display: "block", marginTop: 6, width: 140, color: accent, opacity: v.sale ? 1 : 0.4 }}
                    />
                  </label>
                </div>

                {/* Attributes */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "#737373", marginBottom: 10 }}>Attributes</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {v.attrs.map((attr, ai) => (
                      <div key={ai} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ position: "relative" }}>
                          <div
                            onClick={() => setAttrDropdown(`${v.id}-${ai}`)}
                            style={{ width: 120, height: 34, border: "1px solid #000000", padding: "0 8px", fontSize: 13, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, cursor: "pointer", userSelect: "none", boxSizing: "border-box" }}
                          >
                            <span style={{ color: attr.name ? "#000000" : "#a3a3a3" }}>{attr.name ? attr.name.charAt(0).toUpperCase() + attr.name.slice(1) : "Name"}</span>
                            <span style={{ fontSize: 10, transform: attrDropdown === `${v.id}-${ai}` ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 120ms" }}>▾</span>
                          </div>
                          {attrDropdown === `${v.id}-${ai}` && (
                            <>
                              <div onClick={() => setAttrDropdown(null)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                              <div style={{ position: "absolute", top: 36, left: 0, minWidth: "100%", background: "#ffffff", border: "1px solid #000000", zIndex: 10, boxSizing: "border-box" }}>
                                {ATTR_SUGGESTIONS.map((s) => (
                                  <div
                                    key={s}
                                    onClick={() => { setAttrField(v.id, ai, "name", s); setAttrDropdown(null); }}
                                    style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", background: attr.name === s ? accent : "#ffffff", color: attr.name === s ? "#ffffff" : "#000000" }}
                                  >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        {attr.name.toLowerCase() === "color" ? (
                          <>
                            <input
                              value={attr.option}
                              onChange={(e) => setAttrField(v.id, ai, "option", e.target.value)}
                              placeholder="Value"
                              style={{ ...inputStyle, width: 200, fontSize: 13 }}
                            />
                            <input
                              type="color"
                              value={/^#[0-9a-fA-F]{6}$/.test(attr.value ?? "") ? attr.value! : "#000000"}
                              onChange={(e) => setAttrField(v.id, ai, "value", e.target.value)}
                              style={{ width: 36, height: 34, padding: 0, border: "none", cursor: "pointer" }}
                            />
                          </>
                        ) : (
                          <input
                            value={attr.option}
                            onChange={(e) => setAttrField(v.id, ai, "option", e.target.value)}
                            placeholder="Value"
                            style={{ ...inputStyle, width: 200, fontSize: 13 }}
                          />
                        )}
                        <span
                          onClick={() => removeAttr(v.id, ai)}
                          style={{ cursor: "pointer", color: "#a3a3a3", fontSize: 15, flexShrink: 0 }}
                        >
                          ×
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => addAttr(v.id)}
                      style={{ fontSize: 12, color: "#737373", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0, textAlign: "left", fontFamily: "inherit", width: "fit-content" }}
                    >
                      + Add attribute
                    </button>
                  </div>
                </div>

                {/* Variation images */}
                <div>
                  <div style={{ fontSize: 12, color: "#737373", marginBottom: 10 }}>Variation images</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                    {v.images.map((img, ii) => (
                      <div key={ii} style={{ width: 64 }}>
                        <div style={{ width: 64, height: 80, background: "#f5f5f5", overflow: "hidden" }}>
                          <img src={img.src} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                          <span onClick={() => removeVarImage(v.id, ii)} style={{ cursor: "pointer", fontSize: 14, color: "#737373" }}>×</span>
                          <span style={{ fontSize: 10, color: "#737373" }}>{img.sortOrder}</span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => varImgInputs.current[v.id]?.click()}
                      disabled={uploading}
                      style={{ width: 64, height: 80, border: "1px dashed #d4d4d4", background: "none", cursor: uploading ? "default" : "pointer", fontSize: 18, color: "#a3a3a3", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      {uploading ? "…" : "+"}
                    </button>
                    <input
                      ref={(el) => { varImgInputs.current[v.id] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, v.id); e.target.value = ""; }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Bottom action row */}
      <div style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid #e5e5e5" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {!isNew ? (
          <button
            onClick={() => setConfirm({
              title: "Delete product?",
              message: "This cannot be undone. The product and all its data will be permanently removed.",
              proceedLabel: "Delete",
              proceedColor: "#ef4444",
              onProceed: handleDelete,
            })}
            disabled={saving}
            style={{ height: 38, padding: "0 16px", border: "1px solid #e5e5e5", background: "#fff", fontSize: 13, cursor: saving ? "default" : "pointer", color: "#ef4444", fontFamily: "inherit" }}
          >
            Delete product
          </button>
        ) : <div />}
        <button
          onClick={() => setConfirm({
            title: "Save product?",
            message: "Review your changes before saving. This will update the product immediately.",
            proceedLabel: "Save",
            proceedColor: accent,
            onProceed: handleSave,
          })}
          disabled={saving || uploading}
          style={{
            height: 38,
            padding: "0 24px",
            background: saving || uploading ? "#d4d4d4" : accent,
            color: "#fff",
            border: "none",
            fontSize: 14,
            fontWeight: 500,
            cursor: saving || uploading ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        </div>
        {error && (
          <div style={{ marginTop: 16, fontSize: 13, color: "#c00", padding: "10px 14px", border: "1px solid #fca5a5", background: "#fef2f2" }}>
            {error}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <>
          <div onClick={() => setConfirm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", width: 380, maxWidth: "90vw", padding: 32, boxSizing: "border-box", zIndex: 101 }}>
            <div style={{ fontSize: 18, fontWeight: 400, marginBottom: 10 }}>{confirm.title}</div>
            <div style={{ fontSize: 14, color: "#737373", lineHeight: 1.55, marginBottom: 28 }}>{confirm.message}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setConfirm(null)}
                style={{ height: 38, padding: "0 16px", border: "1px solid #d4d4d4", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#000" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirm(null); confirm.onProceed(); }}
                style={{ height: 38, padding: "0 20px", border: "none", background: confirm.proceedColor, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                {confirm.proceedLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
