/** Lightweight product representation for menus and lists */
export interface ProductDTO {
  id: string;
  unitId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  imageUrl: string | null;
  preparationTime: number | null;
  station: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Full product details including tags and category info */
export interface ProductDetailsDTO extends ProductDTO {
  tags: string | null;
  categoryName: string;
  ingredients: ProductIngredientDTO[];
  priceSchedules: ProductPriceScheduleDTO[];
}

/** Ingredient linked to a product (ficha tecnica) */
interface ProductIngredientDTO {
  stockItemId: string;
  stockItemName: string;
  quantity: number;
  unitType: string;
}

/** Price schedule entry for a product */
interface ProductPriceScheduleDTO {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  price: number;
  label: string | null;
  isActive: boolean;
}
