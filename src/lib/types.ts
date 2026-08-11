export type RankedRow = {
  name: string;
  subtitle?: string;
  value: string;
  barPct: number;
};

export type OrderItem = {
  id: string;
  name: string;
  sku: string;
  imageSrc: string | null;
  priceCents: number;
  quantity: number;
  attribute: string | null;
};

export type Order = {
  id: string;
  status: string;
  totalCents: number;
  refundedCents: number;
  carrier: string | null;
  trackingNumber: string | null;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  paymentIntent: string;
  veeqoOrderId: string | null;
  veeqoError: string | null;
  createdAt: string;
  items: OrderItem[];
};

export type FlatCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  viewCount: number | null;
  productCount: number;
  depth: number;
  hasChildren: boolean;
  isLeaf: boolean;
  ancestorIds: string[];
};

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
};

export type LeafEntry = {
  id: string;
  name: string;
  path: string;
  breadcrumbs: string[];
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sale: boolean;
  featured: boolean;
  variable: boolean;
  minPriceCents: number;
  maxPriceCents: number;
  salePriceCents: number | null;
  categories: string[];
  image: string;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type ProductDetailAttribute = {
  name: string;
  option: string;
  value?: string;
};

export type ProductDetailVariation = {
  id: string;
  sku: string;
  regularPriceCents: number;
  salePriceCents: number | null;
  sale: boolean;
  attribute: ProductDetailAttribute[];
  images: { src: string; name: string; sortOrder: number }[];
};

export type ProductDetailData = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string;
  summary: string[];
  featured: boolean;
  sale: boolean;
  minPriceCents: number;
  salePriceCents: number | null;
  categoryIds: string[];
  images: { src: string; name: string; sortOrder: number }[];
  descriptionImages: { src: string; name: string }[];
  variations: ProductDetailVariation[];
};

export type FormImage = { src: string; name: string; sortOrder: number };
export type FormAttr = { name: string; option: string; value?: string };
export type FormVariation = {
  id: string;
  sku: string;
  regularPrice: string;
  salePrice: string;
  sale: boolean;
  attrs: FormAttr[];
  images: FormImage[];
};

export type TbybSubmission = {
  id: string;
  createdAt: string;
  status: string;
  refundedCents: number | null;
  paymentIntent: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  packageName: string;
  packagePriceCents: number;
  packagePairsMin: number;
  packagePairsMax: number;
  packageBrands: string[];
  odSphere: string;
  odCylinder: string;
  odAxis: string;
  osSphere: string;
  osCylinder: string;
  osAxis: string;
  lensType: string;
  helmetSize: string;
  hatSize: string;
  noseBridge: string;
  buyingPreference: string;
  frameType: string;
  specialRequests: string;
  prescriptionUrl: string;
  headshotUrl: string;
  shippingAddress: {
    name: string;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  carrier: string | null;
  tracking: string | null;
};
