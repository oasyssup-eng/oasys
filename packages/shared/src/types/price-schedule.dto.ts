/** Price schedule (Happy Hour / time-based pricing) representation */
export interface PriceScheduleDTO {
  id: string;
  productId: string;
  unitId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  price: number;
  label: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a price schedule */
export interface CreatePriceScheduleInput {
  productId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  price: number;
  label?: string;
  isActive?: boolean;
}
