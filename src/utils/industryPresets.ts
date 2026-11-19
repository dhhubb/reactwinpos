import { BusinessProfile, IndustryType, Product } from '../types';

export interface IndustryPreset {
  id: IndustryType;
  name: string;
  description: string;
  icon: string;
  terminology: BusinessProfile['terminology'];
  defaultVatRate: number;
  invoicePrefix: string;
  receiptFooter: string;
  sampleProducts: Product[];
}

export const INDUSTRY_PRESETS: Record<IndustryType, IndustryPreset> = {
  electronics: {
    id: 'electronics',
    name: 'Electronics & Office IT',
    description: 'Computers, office furniture, peripherals, and technical hardware',
    icon: '💻',
    terminology: {
      productSingular: 'Product',
      productPlural: 'Products & Inventory',
      customerSingular: 'Customer',
      customerPlural: 'Customers',
      posTitle: 'Point of Sale',
    },
    defaultVatRate: 15,
    invoicePrefix: 'INV-',
    receiptFooter: 'Thank you for shopping with us! 12-Month Warranty on Electronics.',
    sampleProducts: [
      { id: 'p1', code: 'SKU-001', name: 'Office Chair Pro', description: 'Ergonomic office chair with lumbar support', category: 'Furniture', price: 3499.99, cost: 2100.00, stock: 25, taxRate: 15, barcode: '4901234567890' },
      { id: 'p2', code: 'SKU-002', name: 'Standing Desk', description: 'Electric height-adjustable standing desk', category: 'Furniture', price: 6999.99, cost: 4200.00, stock: 12, taxRate: 15, barcode: '4901234567891' },
      { id: 'p3', code: 'SKU-003', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with USB-C', category: 'Electronics', price: 599.99, cost: 290.00, stock: 100, taxRate: 15, barcode: '4901234567892' },
      { id: 'p4', code: 'SKU-004', name: 'Mechanical Keyboard', description: 'RGB mechanical keyboard with tactile switches', category: 'Electronics', price: 1499.99, cost: 780.00, stock: 45, taxRate: 15, barcode: '4901234567893' },
      { id: 'p5', code: 'SKU-005', name: '27" Monitor 4K', description: '27-inch 4K UHD IPS Monitor', category: 'Electronics', price: 5499.99, cost: 3400.00, stock: 18, taxRate: 15, barcode: '4901234567894' },
      { id: 'p6', code: 'SKU-006', name: 'Laptop Stand', description: 'Adjustable aluminum laptop stand', category: 'Accessories', price: 499.99, cost: 220.00, stock: 60, taxRate: 15, barcode: '4901234567895' },
    ],
  },
  retail: {
    id: 'retail',
    name: 'Retail & Supermarket',
    description: 'Groceries, fast-moving consumer goods, apparel, and general retail',
    icon: '🛒',
    terminology: {
      productSingular: 'Retail Item',
      productPlural: 'Stock & Merchandise',
      customerSingular: 'Shopper / Account',
      customerPlural: 'Shoppers & Accounts',
      posTitle: 'Till & Checkout POS',
    },
    defaultVatRate: 15,
    invoicePrefix: 'TIL-',
    receiptFooter: 'Thank you for shopping local! Keep till slip for returns within 7 days.',
    sampleProducts: [
      { id: 'r1', code: 'GRO-001', name: '2kg Tastic Parboiled Rice', description: 'Long grain parboiled white rice', category: 'Groceries', price: 44.99, cost: 31.00, stock: 140, taxRate: 15, barcode: '6001234560001' },
      { id: 'r2', code: 'GRO-002', name: '2L Sunfoil Cooking Oil', description: 'Pure sunflower cooking oil', category: 'Groceries', price: 69.99, cost: 52.00, stock: 85, taxRate: 15, barcode: '6001234560002' },
      { id: 'r3', code: 'GRO-003', name: '2.5kg Iwisa Maize Meal', description: 'Super maize meal', category: 'Staples', price: 36.99, cost: 26.00, stock: 200, taxRate: 0, barcode: '6001234560003' },
      { id: 'r4', code: 'BEV-001', name: '2L Coca-Cola Original', description: 'Carbonated soft drink', category: 'Beverages', price: 26.99, cost: 18.50, stock: 180, taxRate: 15, barcode: '6001234560004' },
      { id: 'r5', code: 'BAK-001', name: 'Albany Superior White Bread', description: '700g sliced white loaf', category: 'Bakery', price: 19.99, cost: 14.00, stock: 65, taxRate: 15, barcode: '6001234560005' },
      { id: 'r6', code: 'DAI-001', name: 'Clover Full Cream Milk 2L', description: 'Fresh pasteurised full cream milk', category: 'Dairy', price: 38.99, cost: 29.00, stock: 50, taxRate: 0, barcode: '6001234560006' },
    ],
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant, Cafe & Hospitality',
    description: 'Food & beverage orders, table service, takeaways, and bar POS',
    icon: '🍽️',
    terminology: {
      productSingular: 'Menu Item',
      productPlural: 'Menu & Kitchen Stock',
      customerSingular: 'Guest / Table',
      customerPlural: 'Guests & Accounts',
      posTitle: 'Restaurant Order POS',
    },
    defaultVatRate: 15,
    invoicePrefix: 'ORD-',
    receiptFooter: 'Thank you for dining with us! Gratuity not included unless specified.',
    sampleProducts: [
      { id: 'm1', code: 'MNU-001', name: 'Flame-Grilled T-Bone Steak 500g', description: 'Served with rustic chips and peppercorn sauce', category: 'Mains', price: 245.00, cost: 98.00, stock: 40, taxRate: 15, barcode: '7001001' },
      { id: 'm2', code: 'MNU-002', name: 'Peri-Peri Half Chicken', description: 'Chargrilled half chicken with spicy peri-peri basting', category: 'Mains', price: 149.00, cost: 58.00, stock: 55, taxRate: 15, barcode: '7001002' },
      { id: 'm3', code: 'MNU-003', name: 'Gourmet Wagyu Smash Burger', description: 'Double patty, aged cheddar, caramelized onions', category: 'Burgers', price: 135.00, cost: 49.00, stock: 70, taxRate: 15, barcode: '7001003' },
      { id: 'm4', code: 'MNU-004', name: 'Artisan Flat White Coffee', description: 'Double shot specialty Arabica espresso', category: 'Hot Drinks', price: 42.00, cost: 11.00, stock: 300, taxRate: 15, barcode: '7001004' },
      { id: 'm5', code: 'MNU-005', name: 'Malva Pudding & Custard', description: 'Traditional warm Cape malva pudding', category: 'Desserts', price: 68.00, cost: 21.00, stock: 35, taxRate: 15, barcode: '7001005' },
      { id: 'm6', code: 'MNU-006', name: 'Stellenbosch Pinotage (Bottle)', description: 'Estate red wine 750ml', category: 'Wine & Bar', price: 290.00, cost: 135.00, stock: 28, taxRate: 15, barcode: '7001006' },
    ],
  },
  hardware: {
    id: 'hardware',
    name: 'Hardware, Building & Construction',
    description: 'Building materials, power tools, plumbing, electrical, and trade accounts',
    icon: '🔨',
    terminology: {
      productSingular: 'Material / Tool',
      productPlural: 'Materials & Hardware',
      customerSingular: 'Contractor / Buyer',
      customerPlural: 'Contractors & Trade Accounts',
      posTitle: 'Trade Counter POS',
    },
    defaultVatRate: 15,
    invoicePrefix: 'TRD-',
    receiptFooter: 'Trade Counter Invoice · Cement & custom-cut timber non-refundable.',
    sampleProducts: [
      { id: 'h1', code: 'BLD-001', name: 'PPC Surebuild Cement 42.5N 50kg', description: 'High-strength all-purpose Portland cement', category: 'Building', price: 118.00, cost: 89.00, stock: 250, taxRate: 15, barcode: '8001001' },
      { id: 'h2', code: 'TOL-001', name: 'Bosch 18V Cordless Drill Driver', description: 'Brushless impact drill with 2x 2.0Ah batteries', category: 'Power Tools', price: 2499.00, cost: 1750.00, stock: 16, taxRate: 15, barcode: '8001002' },
      { id: 'h3', code: 'PNT-001', name: 'Plascon Wall & All 20L White', description: 'Premium washable exterior/interior sheen paint', category: 'Paint', price: 1899.00, cost: 1320.00, stock: 24, taxRate: 15, barcode: '8001003' },
      { id: 'h4', code: 'PLM-001', name: 'Copper Pipe Class 0 15mm x 5.5m', description: 'SABS approved plumbing copper tube', category: 'Plumbing', price: 345.00, cost: 240.00, stock: 80, taxRate: 15, barcode: '8001004' },
      { id: 'h5', code: 'ELC-001', name: 'Twin & Earth Cable 2.5mm 100m Roll', description: 'SABS flame-retardant house wire', category: 'Electrical', price: 1650.00, cost: 1190.00, stock: 19, taxRate: 15, barcode: '8001005' },
    ],
  },
  pharmacy: {
    id: 'pharmacy',
    name: 'Pharmacy, Clinic & Healthcare',
    description: 'Over-the-counter medicines, wellness, dispensary, and patient billing',
    icon: '⚕️',
    terminology: {
      productSingular: 'Medicine / Item',
      productPlural: 'Dispensary & Stock',
      customerSingular: 'Patient / Member',
      customerPlural: 'Patients & Medical Accounts',
      posTitle: 'Dispensary POS',
    },
    defaultVatRate: 15,
    invoicePrefix: 'RX-',
    receiptFooter: 'Stay healthy! Keep medicine out of reach of children.',
    sampleProducts: [
      { id: 'rx1', code: 'MED-001', name: 'Panado Paracetamol 500mg (24s)', description: 'Pain and fever relief tablets', category: 'Analgesics', price: 34.99, cost: 21.00, stock: 160, taxRate: 15, barcode: '9001001' },
      { id: 'rx2', code: 'MED-002', name: 'Corenza C Effervescent (10s)', description: 'Cold and flu immune support tablets', category: 'Cold & Flu', price: 89.99, cost: 59.00, stock: 95, taxRate: 15, barcode: '9001002' },
      { id: 'rx3', code: 'VIT-001', name: 'Solal Vitamin D3 1000IU (60s)', description: 'Daily immune and bone health supplement', category: 'Vitamins', price: 165.00, cost: 105.00, stock: 45, taxRate: 15, barcode: '9001003' },
      { id: 'rx4', code: 'CLN-001', name: 'Blood Pressure & Glucose Screening', description: 'In-clinic nurse wellness check', category: 'Clinic Service', price: 120.00, cost: 25.00, stock: 999, taxRate: 15, barcode: '9001004' },
    ],
  },
  salon: {
    id: 'salon',
    name: 'Salon, Barber & Beauty Spa',
    description: 'Treatments, styling bookings, beauty products, and client loyalty',
    icon: '✂️',
    terminology: {
      productSingular: 'Treatment / Product',
      productPlural: 'Treatments & Retail',
      customerSingular: 'Client',
      customerPlural: 'Salon Clients',
      posTitle: 'Front Desk Checkout',
    },
    defaultVatRate: 15,
    invoicePrefix: 'SPA-',
    receiptFooter: 'We loved pampering you! Book your next appointment online.',
    sampleProducts: [
      { id: 'sp1', code: 'SRV-001', name: 'Full Swedish Body Massage (60m)', description: 'Relaxing aromatherapy full body massage', category: 'Spa Treatments', price: 650.00, cost: 150.00, stock: 999, taxRate: 15, barcode: '5001001' },
      { id: 'sp2', code: 'SRV-002', name: 'Ladies Cut, Wash & Blowwave', description: 'Senior stylist wash, cut and professional blowdry', category: 'Hair Styling', price: 480.00, cost: 95.00, stock: 999, taxRate: 15, barcode: '5001002' },
      { id: 'sp3', code: 'SRV-003', name: 'Gel Manicure & Nail Art', description: 'Soak off, cuticle care and UV gel polish', category: 'Nails', price: 320.00, cost: 65.00, stock: 999, taxRate: 15, barcode: '5001003' },
      { id: 'sp4', code: 'RET-001', name: 'Moroccanoil Argan Hair Treatment 100ml', description: 'Professional salon retail hair oil', category: 'Retail Care', price: 590.00, cost: 360.00, stock: 22, taxRate: 15, barcode: '5001004' },
    ],
  },
  automotive: {
    id: 'automotive',
    name: 'Auto Workshop & Motor Spares',
    description: 'Vehicle servicing, motor spares, tyres, batteries, and fleet accounts',
    icon: '🔧',
    terminology: {
      productSingular: 'Part / Labour',
      productPlural: 'Spares & Job Cards',
      customerSingular: 'Vehicle Owner / Fleet',
      customerPlural: 'Customers & Fleets',
      posTitle: 'Parts & Service Counter',
    },
    defaultVatRate: 15,
    invoicePrefix: 'JOB-',
    receiptFooter: '6-Month / 10,000km Warranty on Workshop Labour & OEM Parts.',
    sampleProducts: [
      { id: 'au1', code: 'PRT-001', name: 'Willard 652 Maintenance-Free Battery', description: '12V 70Ah automotive battery with 24-month warranty', category: 'Batteries', price: 2150.00, cost: 1490.00, stock: 18, taxRate: 15, barcode: '3001001' },
      { id: 'au2', code: 'PRT-002', name: 'Castrol MAGNATEC 10W-40 5L', description: 'Synthetic technology engine oil', category: 'Lubricants', price: 549.00, cost: 375.00, stock: 42, taxRate: 15, barcode: '3001002' },
      { id: 'au3', code: 'PRT-003', name: 'Ferodo Front Brake Pad Set (Hilux/Ranger)', description: 'Heavy-duty ceramic front disc brake pads', category: 'Brakes', price: 890.00, cost: 540.00, stock: 26, taxRate: 15, barcode: '3001003' },
      { id: 'au4', code: 'LAB-001', name: 'Major Vehicle Service & Diagnostics', description: 'Full multipoint service + OBD2 computer scan', category: 'Workshop Labour', price: 1850.00, cost: 450.00, stock: 999, taxRate: 15, barcode: '3001004' },
    ],
  },
  general: {
    id: 'general',
    name: 'General Business & Consulting',
    description: 'Adaptable setup for agencies, wholesalers, logistics, and service firms',
    icon: '🏢',
    terminology: {
      productSingular: 'Item / Service',
      productPlural: 'Items & Services',
      customerSingular: 'Client',
      customerPlural: 'Clients',
      posTitle: 'Quick Billing & POS',
    },
    defaultVatRate: 15,
    invoicePrefix: 'INV-',
    receiptFooter: 'Thank you for your business! Payment due per agreed terms.',
    sampleProducts: [],
  },
};

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  companyName: 'Afritecx Badboy',
  tagline: 'Accounting & POS',
  industry: 'electronics',
  registrationNumber: '2025/104928/07',
  vatNumber: '4120987654',
  defaultVatRate: 15,
  currencyCode: 'ZAR',
  currencySymbol: 'R',
  address: '145 Sandton Drive, Sandton, Johannesburg, 2196, South Africa',
  phone: '+27 11 555 0199',
  email: 'finance@badboy.co.za',
  receiptFooter: 'Thank you for shopping at Afritecx Badboy! VAT Reg: 4120987654',
  invoicePrefix: 'INV-',
  accentColor: 'emerald',
  terminology: {
    productSingular: 'Product',
    productPlural: 'Products & Inventory',
    customerSingular: 'Customer',
    customerPlural: 'Customers',
    posTitle: 'Point of Sale',
  },
};
