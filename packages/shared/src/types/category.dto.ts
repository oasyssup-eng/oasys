/** Category for menu organization */
export interface CategoryDTO {
  id: string;
  unitId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}
