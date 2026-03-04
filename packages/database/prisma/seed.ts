import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a number to a Prisma-compatible Decimal */
function dec(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Safe lookup from a record — throws if key is missing (catches data bugs early) */
function lookup<T>(record: Record<string, T>, key: string, label: string): T {
  const value = record[key];
  if (value === undefined) {
    throw new Error(`Seed error: "${key}" not found in ${label} map`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding OASYS database with Brazilian test data...\n');

  // =========================================================================
  // 1. Organization
  // =========================================================================

  const org = await prisma.organization.upsert({
    where: { slug: 'boteco-do-ze' },
    update: { name: 'Boteco do Ze Ltda' },
    create: {
      name: 'Boteco do Ze Ltda',
      slug: 'boteco-do-ze',
    },
  });
  console.log(`Organization: ${org.name} (${org.id})`);

  // =========================================================================
  // 2. Unit (Pinheiros)
  // =========================================================================

  const unit = await prisma.unit.upsert({
    where: {
      organizationId_slug: {
        organizationId: org.id,
        slug: 'pinheiros',
      },
    },
    update: {
      name: 'Boteco do Ze -- Pinheiros',
      cnpj: '12345678000199',
      stateRegistration: '123456789012',
      legalName: 'Boteco do Ze Comercio de Bebidas Ltda',
      streetAddress: 'Rua dos Pinheiros, 1234',
      addressNumber: '1234',
      neighborhood: 'Pinheiros',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '05422012',
      ibgeCode: '3550308',
      orderPolicy: 'POST_PAYMENT',
      serviceFeeRate: dec(0.1),
      tipSuggestions: '[10, 12, 15]',
      operatingHoursStart: '17:00',
      operatingHoursEnd: '02:00',
    },
    create: {
      organizationId: org.id,
      name: 'Boteco do Ze -- Pinheiros',
      slug: 'pinheiros',
      cnpj: '12345678000199',
      stateRegistration: '123456789012',
      legalName: 'Boteco do Ze Comercio de Bebidas Ltda',
      streetAddress: 'Rua dos Pinheiros, 1234',
      addressNumber: '1234',
      neighborhood: 'Pinheiros',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '05422012',
      ibgeCode: '3550308',
      orderPolicy: 'POST_PAYMENT',
      serviceFeeRate: dec(0.1),
      tipSuggestions: '[10, 12, 15]',
      operatingHoursStart: '17:00',
      operatingHoursEnd: '02:00',
    },
  });
  console.log(`Unit: ${unit.name} (${unit.id})`);

  // =========================================================================
  // 3. Employees (6)
  // =========================================================================

  const employeeData = [
    { name: 'Carlos Silva', role: 'OWNER' as const, pin: '1234', cpf: '11122233344' },
    { name: 'Maria Oliveira', role: 'MANAGER' as const, pin: '5678', cpf: '22233344455' },
    { name: 'Joao Santos', role: 'WAITER' as const, pin: '1111', cpf: '33344455566' },
    { name: 'Ana Costa', role: 'WAITER' as const, pin: '2222', cpf: '44455566677' },
    { name: 'Pedro Lima', role: 'BARTENDER' as const, pin: '3333', cpf: '55566677788' },
    { name: 'Lucia Ferreira', role: 'CASHIER' as const, pin: '4444', cpf: '66677788899' },
  ] as const;

  const employees: Record<string, Awaited<ReturnType<typeof prisma.employee.upsert>>> = {};

  for (const emp of employeeData) {
    const employee = await prisma.employee.upsert({
      where: {
        unitId_pin: {
          unitId: unit.id,
          pin: emp.pin,
        },
      },
      update: {
        name: emp.name,
        role: emp.role,
        cpf: emp.cpf,
        isActive: true,
      },
      create: {
        unitId: unit.id,
        name: emp.name,
        role: emp.role,
        pin: emp.pin,
        cpf: emp.cpf,
        isActive: true,
      },
    });
    employees[emp.name] = employee;
  }
  console.log(`Employees: ${Object.keys(employees).length} seeded`);

  // =========================================================================
  // 4. Categories (4)
  // =========================================================================

  // Categories do not have a natural unique constraint beyond (unitId + name).
  // We use a transaction to delete + recreate for idempotency.
  const categoryNames = [
    { name: 'Cervejas', sortOrder: 1 },
    { name: 'Drinks', sortOrder: 2 },
    { name: 'Petiscos', sortOrder: 3 },
    { name: 'Sem Alcool', sortOrder: 4 },
  ];

  // Delete existing categories (cascading) and recreate
  await prisma.$transaction(async (tx) => {
    // Delete product ingredients and products first (FK constraints)
    await tx.productIngredient.deleteMany({
      where: { product: { unitId: unit.id } },
    });
    await tx.product.deleteMany({ where: { unitId: unit.id } });
    await tx.category.deleteMany({ where: { unitId: unit.id } });
  });

  const categories: Record<string, Awaited<ReturnType<typeof prisma.category.create>>> = {};

  for (const cat of categoryNames) {
    const category = await prisma.category.create({
      data: {
        unitId: unit.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    categories[cat.name] = category;
  }
  console.log(`Categories: ${Object.keys(categories).length} seeded`);

  // =========================================================================
  // 5. Products (20)
  // =========================================================================

  interface ProductSeed {
    name: string;
    category: string;
    price: number;
    station: string;
    preparationTime: number;
    sortOrder: number;
  }

  const productData: ProductSeed[] = [
    // Cervejas
    { name: 'Chopp Pilsen 300ml', category: 'Cervejas', price: 12.9, station: 'BAR', preparationTime: 1, sortOrder: 1 },
    { name: 'Chopp Pilsen 500ml', category: 'Cervejas', price: 18.9, station: 'BAR', preparationTime: 1, sortOrder: 2 },
    { name: 'IPA Artesanal 300ml', category: 'Cervejas', price: 16.9, station: 'BAR', preparationTime: 1, sortOrder: 3 },
    { name: 'Heineken Long Neck', category: 'Cervejas', price: 14.9, station: 'BAR', preparationTime: 1, sortOrder: 4 },
    { name: 'Brahma Lata', category: 'Cervejas', price: 8.9, station: 'BAR', preparationTime: 1, sortOrder: 5 },
    // Drinks
    { name: 'Caipirinha Limao', category: 'Drinks', price: 22.9, station: 'BAR', preparationTime: 3, sortOrder: 1 },
    { name: 'Caipirinha Maracuja', category: 'Drinks', price: 24.9, station: 'BAR', preparationTime: 3, sortOrder: 2 },
    { name: 'Gin Tonica', category: 'Drinks', price: 28.9, station: 'BAR', preparationTime: 2, sortOrder: 3 },
    { name: 'Moscow Mule', category: 'Drinks', price: 32.9, station: 'BAR', preparationTime: 3, sortOrder: 4 },
    { name: 'Aperol Spritz', category: 'Drinks', price: 29.9, station: 'BAR', preparationTime: 2, sortOrder: 5 },
    // Petiscos
    { name: 'Porcao de Fritas', category: 'Petiscos', price: 28.9, station: 'KITCHEN', preparationTime: 12, sortOrder: 1 },
    { name: 'Bolinho de Bacalhau (6)', category: 'Petiscos', price: 34.9, station: 'KITCHEN', preparationTime: 15, sortOrder: 2 },
    { name: 'Linguica Acebolada', category: 'Petiscos', price: 38.9, station: 'KITCHEN', preparationTime: 10, sortOrder: 3 },
    { name: 'Torresmo', category: 'Petiscos', price: 32.9, station: 'KITCHEN', preparationTime: 8, sortOrder: 4 },
    { name: 'Bruschetta (4)', category: 'Petiscos', price: 26.9, station: 'KITCHEN', preparationTime: 8, sortOrder: 5 },
    // Sem Alcool
    { name: 'Agua Mineral 500ml', category: 'Sem Alcool', price: 5.9, station: 'BAR', preparationTime: 0, sortOrder: 1 },
    { name: 'Refrigerante Lata', category: 'Sem Alcool', price: 7.9, station: 'BAR', preparationTime: 0, sortOrder: 2 },
    { name: 'Suco Natural Laranja', category: 'Sem Alcool', price: 12.9, station: 'BAR', preparationTime: 3, sortOrder: 3 },
    { name: 'Agua Tonica', category: 'Sem Alcool', price: 8.9, station: 'BAR', preparationTime: 0, sortOrder: 4 },
    { name: 'Red Bull', category: 'Sem Alcool', price: 18.9, station: 'BAR', preparationTime: 0, sortOrder: 5 },
  ];

  const products: Record<string, Awaited<ReturnType<typeof prisma.product.create>>> = {};

  for (const prod of productData) {
    const product = await prisma.product.create({
      data: {
        unitId: unit.id,
        categoryId: lookup(categories, prod.category, 'categories').id,
        name: prod.name,
        price: dec(prod.price),
        station: prod.station,
        preparationTime: prod.preparationTime,
        sortOrder: prod.sortOrder,
        isAvailable: true,
      },
    });
    products[prod.name] = product;
  }
  console.log(`Products: ${Object.keys(products).length} seeded`);

  // =========================================================================
  // 6. Zones (2)
  // =========================================================================

  // Clean existing zones and tables, then recreate
  await prisma.$transaction(async (tx) => {
    await tx.table.deleteMany({ where: { unitId: unit.id } });
    await tx.zone.deleteMany({ where: { unitId: unit.id } });
  });

  const zoneSalao = await prisma.zone.create({
    data: {
      unitId: unit.id,
      name: 'Salao Principal',
      floor: 0,
      sortOrder: 1,
    },
  });

  const zoneVaranda = await prisma.zone.create({
    data: {
      unitId: unit.id,
      name: 'Varanda',
      floor: 0,
      sortOrder: 2,
    },
  });
  console.log(`Zones: 2 seeded (${zoneSalao.name}, ${zoneVaranda.name})`);

  // =========================================================================
  // 7. Tables (16) - 8 per zone, numbered 1-16, 4 seats each
  // =========================================================================

  const tableCreates: Prisma.TableCreateManyInput[] = [];

  // Tables 1-8 in Salao Principal
  for (let i = 1; i <= 8; i++) {
    tableCreates.push({
      unitId: unit.id,
      zoneId: zoneSalao.id,
      number: i,
      seats: 4,
      status: 'AVAILABLE',
    });
  }

  // Tables 9-16 in Varanda
  for (let i = 9; i <= 16; i++) {
    tableCreates.push({
      unitId: unit.id,
      zoneId: zoneVaranda.id,
      number: i,
      seats: 4,
      status: 'AVAILABLE',
    });
  }

  await prisma.table.createMany({ data: tableCreates });
  console.log('Tables: 16 seeded (8 per zone)');

  // =========================================================================
  // 8. StockItems (15)
  // =========================================================================

  // Clean existing stock items (and their movements/ingredients already deleted above)
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({
      where: { stockItem: { unitId: unit.id } },
    });
    await tx.stockItem.deleteMany({ where: { unitId: unit.id } });
  });

  interface StockSeed {
    name: string;
    unitType: string;
    quantity: number;
    minQuantity: number;
    costPrice: number;
  }

  const stockData: StockSeed[] = [
    { name: 'Chopp Pilsen (barril 50L)', unitType: 'L', quantity: 100.0, minQuantity: 20.0, costPrice: 4.5 },
    { name: 'IPA Artesanal (barril 30L)', unitType: 'L', quantity: 30.0, minQuantity: 10.0, costPrice: 8.0 },
    { name: 'Heineken Long Neck', unitType: 'UN', quantity: 120, minQuantity: 24, costPrice: 5.5 },
    { name: 'Brahma Lata', unitType: 'UN', quantity: 200, minQuantity: 48, costPrice: 2.8 },
    { name: 'Cachaca 51 (1L)', unitType: 'ML', quantity: 5000, minQuantity: 1000, costPrice: 0.015 },
    { name: 'Limao Taiti', unitType: 'UN', quantity: 100, minQuantity: 20, costPrice: 0.5 },
    { name: 'Maracuja', unitType: 'UN', quantity: 40, minQuantity: 10, costPrice: 1.2 },
    { name: 'Gin Gordons (1L)', unitType: 'ML', quantity: 3000, minQuantity: 500, costPrice: 0.06 },
    { name: 'Tonica Schweppes (350ml)', unitType: 'UN', quantity: 80, minQuantity: 24, costPrice: 3.5 },
    { name: 'Batata Congelada', unitType: 'KG', quantity: 20.0, minQuantity: 5.0, costPrice: 12.0 },
    { name: 'Bacalhau Desfiado', unitType: 'KG', quantity: 5.0, minQuantity: 2.0, costPrice: 85.0 },
    { name: 'Linguica Calabresa', unitType: 'KG', quantity: 8.0, minQuantity: 3.0, costPrice: 22.0 },
    { name: 'Agua Mineral 500ml', unitType: 'UN', quantity: 150, minQuantity: 48, costPrice: 1.2 },
    { name: 'Refrigerante Lata', unitType: 'UN', quantity: 120, minQuantity: 36, costPrice: 2.5 },
    { name: 'Suco Laranja (L)', unitType: 'L', quantity: 15.0, minQuantity: 5.0, costPrice: 6.0 },
  ];

  const stockItems: Record<string, Awaited<ReturnType<typeof prisma.stockItem.create>>> = {};

  for (const item of stockData) {
    const stockItem = await prisma.stockItem.create({
      data: {
        unitId: unit.id,
        name: item.name,
        unitType: item.unitType,
        quantity: dec(item.quantity),
        minQuantity: dec(item.minQuantity),
        costPrice: dec(item.costPrice),
        isActive: true,
      },
    });
    stockItems[item.name] = stockItem;
  }
  console.log(`StockItems: ${Object.keys(stockItems).length} seeded`);

  // =========================================================================
  // 9. ProductIngredients (recipe links)
  // =========================================================================

  interface IngredientLink {
    productName: string;
    stockItemName: string;
    quantity: number;
  }

  const ingredientLinks: IngredientLink[] = [
    // Cervejas
    { productName: 'Chopp Pilsen 300ml', stockItemName: 'Chopp Pilsen (barril 50L)', quantity: 0.35 },
    { productName: 'Chopp Pilsen 500ml', stockItemName: 'Chopp Pilsen (barril 50L)', quantity: 0.57 },
    { productName: 'IPA Artesanal 300ml', stockItemName: 'IPA Artesanal (barril 30L)', quantity: 0.35 },
    { productName: 'Heineken Long Neck', stockItemName: 'Heineken Long Neck', quantity: 1 },
    { productName: 'Brahma Lata', stockItemName: 'Brahma Lata', quantity: 1 },
    // Drinks
    { productName: 'Caipirinha Limao', stockItemName: 'Cachaca 51 (1L)', quantity: 60 },
    { productName: 'Caipirinha Limao', stockItemName: 'Limao Taiti', quantity: 2 },
    { productName: 'Gin Tonica', stockItemName: 'Gin Gordons (1L)', quantity: 60 },
    { productName: 'Gin Tonica', stockItemName: 'Tonica Schweppes (350ml)', quantity: 1 },
    // Petiscos
    { productName: 'Porcao de Fritas', stockItemName: 'Batata Congelada', quantity: 0.4 },
    // Sem Alcool
    { productName: 'Agua Mineral 500ml', stockItemName: 'Agua Mineral 500ml', quantity: 1 },
    { productName: 'Refrigerante Lata', stockItemName: 'Refrigerante Lata', quantity: 1 },
    { productName: 'Suco Natural Laranja', stockItemName: 'Suco Laranja (L)', quantity: 0.4 },
  ];

  const ingredientCreates: Prisma.ProductIngredientCreateManyInput[] = ingredientLinks.map(
    (link) => ({
      productId: lookup(products, link.productName, 'products').id,
      stockItemId: lookup(stockItems, link.stockItemName, 'stockItems').id,
      quantity: dec(link.quantity),
    }),
  );

  await prisma.productIngredient.createMany({ data: ingredientCreates });
  console.log(`ProductIngredients: ${ingredientCreates.length} seeded`);

  // =========================================================================
  // 10. CashRegisters (2)
  // =========================================================================

  // Clean existing cash registers for this unit
  await prisma.$transaction(async (tx) => {
    await tx.cashRegisterOperation.deleteMany({
      where: { cashRegister: { unitId: unit.id } },
    });
    // Unlink payments from cash registers before deleting them
    await tx.payment.updateMany({
      where: { cashRegister: { unitId: unit.id } },
      data: { cashRegisterId: null },
    });
    await tx.cashRegister.deleteMany({ where: { unitId: unit.id } });
  });

  const digitalRegister = await prisma.cashRegister.create({
    data: {
      unitId: unit.id,
      employeeId: null,
      type: 'DIGITAL',
      status: 'OPEN',
      openingBalance: dec(0),
    },
  });

  const operatorRegister = await prisma.cashRegister.create({
    data: {
      unitId: unit.id,
      employeeId: lookup(employees, 'Lucia Ferreira', 'employees').id,
      type: 'OPERATOR',
      status: 'OPEN',
      openingBalance: dec(500),
    },
  });

  console.log(`CashRegisters: 2 seeded (DIGITAL: ${digitalRegister.id}, OPERATOR: ${operatorRegister.id})`);

  // =========================================================================
  // Done
  // =========================================================================

  console.log('\nSeed completed successfully.');
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
