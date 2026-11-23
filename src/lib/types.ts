export type ProductImage = {
  url: string;
  alt: string;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  image: ProductImage | null;
  /** true somente para produtos de exemplo do modo de desenvolvimento */
  isDemo?: boolean;
};
