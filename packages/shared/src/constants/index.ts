export const KDS_STATIONS = ['BAR', 'KITCHEN', 'GRILL', 'DESSERT'] as const;
export type KDSStation = (typeof KDS_STATIONS)[number];

export const COURSE_TYPES = ['STARTER', 'MAIN', 'DESSERT', 'DRINK'] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

export const ORDER_SOURCES = ['WEB_MENU', 'WHATSAPP', 'WAITER', 'POS'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const STOCK_UNIT_TYPES = ['UN', 'KG', 'L', 'ML', 'G', 'DOSE'] as const;
export type StockUnitType = (typeof STOCK_UNIT_TYPES)[number];

export const CASH_REGISTER_TYPES = ['OPERATOR', 'DIGITAL'] as const;
export type CashRegisterType = (typeof CASH_REGISTER_TYPES)[number];

export const CASH_REGISTER_OPERATION_TYPES = ['WITHDRAWAL', 'SUPPLY', 'ADJUSTMENT'] as const;
export type CashRegisterOperationType = (typeof CASH_REGISTER_OPERATION_TYPES)[number];

export const FISCAL_NOTE_TYPES = ['NFCE', 'NFE'] as const;
export type FiscalNoteType = (typeof FISCAL_NOTE_TYPES)[number];
