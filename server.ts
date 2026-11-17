import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { checkSupabaseStatus, getSupabaseAdmin } from './src/lib/supabaseServer.ts';
import type {
  Product,
  Order,
  BathService,
  UserProfile,
  StockMovement,
  AuditLog,
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Persistent uploads directory for catalog photos
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Server-side Google GenAI initialization helper (strictly uses process.env.GEMINI_API_KEY)
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();

  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 25000,
    },
  });
}

// Database file persistence path
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  products: Product[];
  orders: Order[];
  bathServices: BathService[];
  users: UserProfile[];
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];
}

function initializeDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed: DatabaseSchema = JSON.parse(content);
      const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const envAdminPassword = process.env.ADMIN_PASSWORD?.trim();

      // Enforce: strictly ONE admin account exists in the platform
      let admin = parsed.users.find((u) => u.role === 'admin');
      if (!admin) {
        admin = {
          id: 'admin-01',
          name: 'Diana — Dona da Loja',
          email: envAdminEmail || '',
          password: envAdminPassword || undefined,
          phone: '(19) 98806-4749',
          cpf: '000.000.000-00',
          role: 'admin',
          address: {
            cep: '13480-000',
            street: 'Rua das Joias',
            number: '100',
            neighborhood: 'Centro',
            city: 'Limeira',
            state: 'SP',
          },
          isVerified: true,
          favorites: [],
          createdAt: new Date().toISOString(),
        };
        parsed.users.unshift(admin);
      } else {
        // Sync admin identity from environment variables only when explicitly provided; otherwise preserve db.json
        admin.name = admin.name || 'Diana — Dona da Loja';
        if (envAdminEmail) {
          admin.email = envAdminEmail;
        }
        if (envAdminPassword) {
          admin.password = envAdminPassword;
        }
        if (admin.address) {
          admin.address.city = 'Limeira';
        } else {
          admin.address = {
            cep: '13480-000',
            street: 'Rua das Joias',
            number: '100',
            neighborhood: 'Centro',
            city: 'Limeira',
            state: 'SP',
          };
        }
        // Strictly ensure no other user can have role: 'admin'
        parsed.users.forEach((u) => {
          if (u.id !== admin!.id && u.role === 'admin') {
            u.role = 'customer';
          }
        });
      }
      return parsed;
    } catch (e) {
      console.error('Error reading db.json, generating default seed:', e);
    }
  }

  const initialProducts: Product[] = [
    {
      id: 'prod-01',
      sku: 'OUR-BR-010',
      name: 'Brinco Gota Zircônias Cravejadas Ouro 18k',
      description:
        'Par de brincos modelo gota alongada, minuciosamente cravejado com micro-zircônias cristal lapidação brilhante. Elegância atemporal com acabamento de alta joalheria e toque sofisticado.',
      category: 'Brincos',
      images: ['/src/assets/images/earrings_gold_zirconia_1794270256870.jpg'],
      price: 89.9,
      wholesalePrice: 49.9,
      minWholesaleQty: 5,
      tieredPricing: [
        { minQty: 1, unitPrice: 89.9 },
        { minQty: 5, unitPrice: 49.9 },
        { minQty: 10, unitPrice: 42.9 },
        { minQty: 30, unitPrice: 36.9 },
      ],
      stock: 45,
      reservedStock: 0,
      lowStockAlert: 8,
      isFeatured: true,
      isNewRelease: true,
      platingType: 'Banho Ouro 18k (10 milésimos) + Verniz Diamond Italiano',
      warranty: '1 ano de garantia contra defeitos no banho',
      minPurchaseQty: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-02',
      sku: 'OUR-CL-022',
      name: 'Colar Medalha Martela com Ponto de Luz Ouro 18k',
      description:
        'Corrente veneziana fina com medalha orgânica de acabamento martelado e ponto de luz em zircônia central. Toque contemporâneo para composições em camadas e elegância diária.',
      category: 'Colares',
      images: ['/src/assets/images/necklace_gold_choker_1794270256905.jpg'],
      price: 119.0,
      wholesalePrice: 64.9,
      minWholesaleQty: 5,
      tieredPricing: [
        { minQty: 1, unitPrice: 119.0 },
        { minQty: 5, unitPrice: 64.9 },
        { minQty: 10, unitPrice: 54.9 },
        { minQty: 30, unitPrice: 48.0 },
      ],
      stock: 32,
      reservedStock: 0,
      lowStockAlert: 6,
      isFeatured: true,
      isNewRelease: true,
      platingType: 'Banho Ouro 18k Premium (10 milésimos) Hipoalergênico',
      warranty: '1 ano de garantia contra defeitos no banho',
      minPurchaseQty: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-03',
      sku: 'OUR-PL-035',
      name: 'Pulseira Riviera Luxo Zircônias Cravação Inglesa',
      description:
        'Clássica pulseira Riviera com pedras de zircônia 3mm rigorosamente selecionadas, brilho contínuo de diamante e fecho duplo pega-ladrão de alta joalheria.',
      category: 'Pulseiras',
      images: ['/src/assets/images/bracelet_riviera_gold_1794270257631.jpg'],
      price: 149.9,
      wholesalePrice: 79.9,
      minWholesaleQty: 5,
      tieredPricing: [
        { minQty: 1, unitPrice: 149.9 },
        { minQty: 5, unitPrice: 79.9 },
        { minQty: 10, unitPrice: 68.0 },
        { minQty: 30, unitPrice: 59.9 },
      ],
      stock: 28,
      reservedStock: 0,
      lowStockAlert: 5,
      isFeatured: true,
      isOffer: false,
      platingType: 'Banho Ouro 18k (10 milésimos) + Verniz Antialérgico',
      warranty: '1 ano de garantia contra defeitos no banho',
      minPurchaseQty: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-04',
      sku: 'OUR-AN-048',
      name: 'Conjunto de Anéis Solitário & Aliança Trabalhada Entalhada',
      description:
        'Duo sofisticado de anéis combinando aro arabesco trabalhado em filigrana e anel solitário com zircônia lapidação brilhante 6 garras.',
      category: 'Anéis',
      images: ['/src/assets/images/rings_solitaire_set_1794270259061.jpg'],
      price: 98.0,
      wholesalePrice: 52.0,
      minWholesaleQty: 5,
      tieredPricing: [
        { minQty: 1, unitPrice: 98.0 },
        { minQty: 5, unitPrice: 52.0 },
        { minQty: 10, unitPrice: 44.0 },
        { minQty: 30, unitPrice: 38.0 },
      ],
      stock: 18,
      reservedStock: 0,
      lowStockAlert: 5,
      isFeatured: true,
      isOffer: true,
      platingType: 'Banho Ouro 18k (10 milésimos)',
      warranty: '1 ano de garantia',
      minPurchaseQty: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-05',
      sku: 'OUR-CJ-055',
      name: 'Conjunto Gotas Radiantes Brincos e Choker Ouro 18k',
      description:
        'Conjunto completo e harmonioso formado por par de brincos gotas e gargantilha fina. Destaque para revenda rápida no atacado.',
      category: 'Conjuntos',
      images: ['/src/assets/images/earrings_gold_zirconia_1794270256870.jpg'],
      price: 189.0,
      wholesalePrice: 99.0,
      minWholesaleQty: 3,
      tieredPricing: [
        { minQty: 1, unitPrice: 189.0 },
        { minQty: 3, unitPrice: 99.0 },
        { minQty: 10, unitPrice: 85.0 },
        { minQty: 25, unitPrice: 75.0 },
      ],
      stock: 14,
      reservedStock: 0,
      lowStockAlert: 4,
      isFeatured: false,
      isOffer: true,
      platingType: 'Banho Ouro 18k (10 milésimos)',
      warranty: '1 ano de garantia',
      minPurchaseQty: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-06',
      sku: 'OUR-TN-062',
      name: 'Tornozeleira Bolinhas & Elo Cartier Ouro 18k',
      description:
        'Tornozeleira delicada com micro-esferas polidas espaçadas e extensor de ajuste de 5cm. Confortável, antialérgica e feminina.',
      category: 'Tornozeleiras',
      images: ['/src/assets/images/bracelet_riviera_gold_1794270257631.jpg'],
      price: 69.9,
      wholesalePrice: 38.0,
      minWholesaleQty: 5,
      tieredPricing: [
        { minQty: 1, unitPrice: 69.9 },
        { minQty: 5, unitPrice: 38.0 },
        { minQty: 15, unitPrice: 32.0 },
      ],
      stock: 3, // Low stock test!
      reservedStock: 0,
      lowStockAlert: 5,
      isFeatured: false,
      platingType: 'Banho Ouro 18k (10 milésimos)',
      warranty: '1 ano de garantia',
      minPurchaseQty: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-07',
      sku: 'OUR-PG-071',
      name: 'Pingente Flor de Lótus Sagrada Ouro 18k',
      description:
        'Pingente de alta definição em corte a laser representando a flor de lótus, símbolo de renovação, pureza e beleza.',
      category: 'Pingentes',
      images: ['/src/assets/images/necklace_gold_choker_1794270256905.jpg'],
      price: 49.9,
      wholesalePrice: 26.0,
      minWholesaleQty: 5,
      tieredPricing: [
        { minQty: 1, unitPrice: 49.9 },
        { minQty: 5, unitPrice: 26.0 },
        { minQty: 15, unitPrice: 21.0 },
      ],
      stock: 0, // Esgotado test!
      reservedStock: 0,
      lowStockAlert: 5,
      isFeatured: false,
      platingType: 'Banho Ouro 18k',
      warranty: '1 ano de garantia',
      minPurchaseQty: 1,
      createdAt: new Date().toISOString(),
    },
  ];

  const initialUsers: UserProfile[] = [
    {
      id: 'admin-01',
      name: 'Diana — Dona da Loja',
      email: process.env.ADMIN_EMAIL?.trim().toLowerCase() || '',
      password: process.env.ADMIN_PASSWORD?.trim() || undefined,
      phone: '(19) 98806-4749',
      cpf: '000.000.000-00',
      role: 'admin',
      address: {
        cep: '13480-000',
        street: 'Avenida Limeira',
        number: '100',
        neighborhood: 'Centro',
        city: 'Limeira',
        state: 'SP',
      },
      isVerified: true,
      favorites: [],
      createdAt: new Date().toISOString(),
    },
  ];

  const initialOrders: Order[] = [
    {
      id: 'OUR-2026-1001',
      customerId: 'user-01',
      customerName: 'Camila Ferreira da Silva',
      customerEmail: 'cliente@exemplo.com.br',
      customerPhone: '(19) 99123-4567',
      customerCpf: '123.456.789-00',
      shippingAddress: {
        cep: '13480-120',
        street: 'Rua das Flores',
        number: '420',
        neighborhood: 'Jardim Boa Vista',
        city: 'Limeira',
        state: 'SP',
      },
      items: [
        {
          productId: 'prod-01',
          productName: 'Brinco Gota Zircônias Cravejadas Ouro 18k',
          sku: 'OUR-BR-010',
          image: '/src/assets/images/earrings_gold_zirconia_1794270256870.jpg',
          unitPrice: 42.9,
          quantity: 10,
          isWholesaleApplied: true,
          subtotal: 429.0,
        },
      ],
      subtotal: 429.0,
      discount: 0,
      shippingFee: 0,
      total: 429.0,
      isWholesaleOrder: true,
      status: 'PAGAMENTO CONFIRMADO',
      paymentMethodNotes: 'A combinar pelo WhatsApp (+55 19 98806-4749)',
      whatsappMessage: 'Pedido inicial confirmado para atacado.',
      whatsappUrl: 'https://wa.me/5519988064749',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ];

  const initialBathServices: BathService[] = [
    {
      id: 'sb-01',
      protocol: 'SB-2026-0042',
      customerName: 'Mariana Duarte',
      customerPhone: '(19) 98765-4321',
      customerEmail: 'mariana.duarte@email.com',
      pieceType: 'Conjunto de 3 correntes venezianas antigas e 2 pingentes',
      quantity: 5,
      bathType: 'Ouro 18k (10 Milésimos)',
      observations:
        'Peças possuem alto valor sentimental. Solicito polimento prévio para remoção de micro-oxidação e aplicação de verniz diamond.',
      photoUrl: '/src/assets/images/necklace_gold_choker_1794270256905.jpg',
      status: 'Em processo de banho',
      estimatedDays: 7,
      priceQuote: 180.0,
      history: [
        {
          status: 'Solicitação recebida',
          date: new Date(Date.now() - 86400000 * 4).toISOString(),
          notes: 'Protocolo registrado pelo site.',
        },
        {
          status: 'Peças recebidas',
          date: new Date(Date.now() - 86400000 * 3).toISOString(),
          notes: 'Peças entregues no ateliê Ourata.',
        },
        {
          status: 'Em análise',
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          notes: 'Avaliação técnica de peso e liga metálica concluída.',
        },
        {
          status: 'Em processo de banho',
          date: new Date(Date.now() - 86400000 * 1).toISOString(),
          notes: 'Aplicação de banho de ouro 18k em 10 milésimos.',
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const initialMovements: StockMovement[] = [
    {
      id: 'mov-01',
      productId: 'prod-01',
      productName: 'Brinco Gota Zircônias Cravejadas Ouro 18k',
      sku: 'OUR-BR-010',
      type: 'ENTRADA',
      quantity: 55,
      previousStock: 0,
      newStock: 55,
      reason: 'Lote inaugural de produção atelier Ourata',
      timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'mov-02',
      productId: 'prod-01',
      productName: 'Brinco Gota Zircônias Cravejadas Ouro 18k',
      sku: 'OUR-BR-010',
      type: 'SAIDA_CONFIRMADA',
      quantity: 10,
      previousStock: 55,
      newStock: 45,
      orderId: 'OUR-2026-1001',
      reason: 'Saída confirmada de estoque para pedido de atacado OUR-2026-1001',
      timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ];

  const initialLogs: AuditLog[] = [
    {
      id: 'log-01',
      action: 'SISTEMA_INICIALIZADO',
      user: 'Proprietária Ourata',
      details: 'Plataforma Ourata Semijoias inicializada com dados protegidos.',
      timestamp: new Date().toISOString(),
    },
  ];

  const db: DatabaseSchema = {
    products: initialProducts,
    orders: initialOrders,
    bathServices: initialBathServices,
    users: initialUsers,
    stockMovements: initialMovements,
    auditLogs: initialLogs,
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  return db;
}

let db = initializeDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save db.json:', err);
  }
}

// Middleware to ensure ONLY the single authorized administrator can perform admin operations
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminId = (req.headers['x-admin-id'] as string) || '';
  const adminUser = db.users.find(
    (u) =>
      u.role === 'admin' &&
      (u.id === adminId || req.headers['authorization'] === `Bearer ${u.id}`)
  );
  if (!adminUser) {
    res.status(403).json({
      error:
        'Acesso negado. Apenas a única proprietária/administradora da Ourata Semijoias possui permissão para esta ação.',
    });
    return;
  }
  next();
}

// ======================== API ROUTES ========================

// 1. Health check & Info
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    store: 'Ourata Semijoias',
    whatsapp: '5519988064749',
    timestamp: new Date().toISOString(),
  });
});

// 1b. Real Supabase connection & database test endpoint (no simulated data)
app.get('/api/supabase/status', async (_req, res) => {
  const status = await checkSupabaseStatus();
  res.status(status.isConnected ? 200 : 503).json(status);
});

// 2. Products Catalog & Management
app.get('/api/products', (req, res) => {
  const { category, search, offer, wholesale } = req.query;
  let results = [...db.products];

  if (category && category !== 'Todos') {
    results = results.filter((p) => p.category === category);
  }

  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  if (offer === 'true') {
    results = results.filter((p) => p.isOffer);
  }

  res.json({ products: results });
});

app.get('/api/products/:id', (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Produto não encontrado.' });
    return;
  }
  res.json({ product });
});

// Admin Product Create (Restricted to single Admin)
app.post('/api/products', requireAdmin, (req, res) => {
  const body = req.body;
  if (!body.name || !body.sku || body.price == null) {
    res.status(400).json({ error: 'Nome, SKU e Preço são obrigatórios.' });
    return;
  }

  const existingSku = db.products.find((p) => p.sku === body.sku);
  if (existingSku) {
    res.status(400).json({ error: `Já existe um produto com o SKU ${body.sku}` });
    return;
  }

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    sku: body.sku.trim().toUpperCase(),
    name: body.name.trim(),
    description: body.description || '',
    category: body.category || 'Outros',
    images:
      Array.isArray(body.images) && body.images.length > 0
        ? body.images
        : ['/src/assets/images/earrings_gold_zirconia_1794270256870.jpg'],
    price: Number(body.price),
    wholesalePrice: Number(body.wholesalePrice || body.price * 0.6),
    minWholesaleQty: Number(body.minWholesaleQty || 5),
    tieredPricing: body.tieredPricing || [
      { minQty: 1, unitPrice: Number(body.price) },
      { minQty: 5, unitPrice: Number(body.wholesalePrice || body.price * 0.6) },
    ],
    stock: Number(body.stock || 0),
    reservedStock: 0,
    lowStockAlert: Number(body.lowStockAlert || 5),
    isFeatured: Boolean(body.isFeatured),
    isNewRelease: Boolean(body.isNewRelease),
    isOffer: Boolean(body.isOffer),
    platingType: body.platingType || 'Banho Ouro 18k (10 milésimos)',
    warranty: body.warranty || '1 ano de garantia',
    createdAt: new Date().toISOString(),
  };

  db.products.unshift(newProduct);

  // Register Stock Movement
  if (newProduct.stock > 0) {
    db.stockMovements.unshift({
      id: `mov-${Date.now()}`,
      productId: newProduct.id,
      productName: newProduct.name,
      sku: newProduct.sku,
      type: 'ENTRADA',
      quantity: newProduct.stock,
      previousStock: 0,
      newStock: newProduct.stock,
      reason: 'Cadastro inicial de produto',
      timestamp: new Date().toISOString(),
    });
  }

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'CRIAR_PRODUTO',
    user: 'Proprietária Ourata',
    details: `Criou produto ${newProduct.name} (${newProduct.sku}) com estoque inicial ${newProduct.stock}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.status(201).json({ product: newProduct });
});

// Admin Product Update (Restricted to single Admin)
app.put('/api/products/:id', requireAdmin, (req, res) => {
  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Produto não encontrado.' });
    return;
  }

  const existing = db.products[index];
  const body = req.body;

  const previousStock = existing.stock;
  const newStock = body.stock != null ? Number(body.stock) : existing.stock;

  if (newStock !== previousStock) {
    const delta = newStock - previousStock;
    db.stockMovements.unshift({
      id: `mov-${Date.now()}`,
      productId: existing.id,
      productName: body.name || existing.name,
      sku: existing.sku,
      type: delta > 0 ? 'ENTRADA' : 'AJUSTE_MANUAL',
      quantity: Math.abs(delta),
      previousStock,
      newStock,
      reason: body.stockChangeReason || 'Ajuste manual de estoque no painel',
      timestamp: new Date().toISOString(),
    });
  }

  const updatedProduct: Product = {
    ...existing,
    ...body,
    id: existing.id,
    images: Array.isArray(body.images) ? body.images : existing.images,
    sku: body.sku ? body.sku.trim().toUpperCase() : existing.sku,
    stock: newStock,
    updatedAt: new Date().toISOString(),
  };

  db.products[index] = updatedProduct;

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'EDITAR_PRODUTO',
    user: 'Proprietária Ourata',
    details: `Editou produto ${updatedProduct.name} (${updatedProduct.sku})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ product: updatedProduct });
});

// Admin Product Delete (Restricted to single Admin)
app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Produto não encontrado.' });
    return;
  }

  const removed = db.products.splice(index, 1)[0];

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'EXCLUIR_PRODUTO',
    user: 'Proprietária Ourata',
    details: `Excluiu produto ${removed.name} (${removed.sku})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ success: true, removedId: req.params.id });
});

// Helper: Upload image buffer either to Supabase Storage (product-images) or persistent local /uploads
async function storeCatalogImage(dataUrl: string, fileName?: string): Promise<string> {
  const matches = dataUrl.match(/^data:(image\/(jpeg|jpg|png|webp|avif));base64,([A-Za-z0-9+/=]+)$/i);
  if (!matches) {
    throw new Error('Formato de imagem inválido. Envie arquivos JPG, PNG, WEBP ou AVIF.');
  }

  const mimeType = matches[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : matches[1].toLowerCase();
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
  const buffer = Buffer.from(matches[3], 'base64');

  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error('A imagem ultrapassa o limite máximo de 5 MB.');
  }

  const safeBase = (fileName || 'semijoia')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .slice(0, 40) || 'semijoia';

  const uniqueName = `${safeBase}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  // Try Supabase Storage first if configured & bucket exists
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const storagePath = `catalog/${uniqueName}`;
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (!uploadErr) {
        const { data: publicData } = supabase.storage
          .from('product-images')
          .getPublicUrl(storagePath);
        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      }
    } catch {
      // Fallback transparently to local disk storage if Supabase bucket is not initialized yet
    }
  }

  const destPath = path.join(UPLOADS_DIR, uniqueName);
  fs.writeFileSync(destPath, buffer);
  return `/uploads/${uniqueName}`;
}

// Admin: Upload image file to catalog storage (Restricted to single Admin)
app.post('/api/admin/upload-image', requireAdmin, async (req, res) => {
  try {
    const { dataUrl, fileName } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Arquivo de imagem é obrigatório.' });
      return;
    }

    const url = await storeCatalogImage(dataUrl, fileName);

    db.auditLogs.unshift({
      id: `log-${Date.now()}`,
      action: 'UPLOAD_FOTO_CATALOGO',
      user: 'Proprietária Ourata',
      details: `Enviou nova foto para o catálogo (${url})`,
      timestamp: new Date().toISOString(),
    });
    saveDatabase();

    res.status(201).json({ url });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Erro ao salvar imagem.' });
  }
});

// Admin: Add photo (upload or URL) directly to a catalog product (Restricted to single Admin)
app.post('/api/products/:id/images', requireAdmin, async (req, res) => {
  try {
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Produto não encontrado.' });
      return;
    }

    const { imageUrl, dataUrl, fileName, asPrimary } = req.body;
    let finalUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';

    if (dataUrl && typeof dataUrl === 'string') {
      finalUrl = await storeCatalogImage(dataUrl, fileName);
    }

    if (!finalUrl) {
      res.status(400).json({ error: 'Informe uma URL válida ou envie uma foto do dispositivo.' });
      return;
    }

    const currentImages = Array.isArray(product.images) ? [...product.images] : [];
    const filtered = currentImages.filter((img) => img !== finalUrl);

    if (asPrimary) {
      filtered.unshift(finalUrl);
    } else {
      filtered.push(finalUrl);
    }

    product.images = filtered;
    product.updatedAt = new Date().toISOString();

    db.auditLogs.unshift({
      id: `log-${Date.now()}`,
      action: 'ADICIONAR_FOTO_PRODUTO',
      user: 'Proprietária Ourata',
      details: `Adicionou foto ao produto ${product.name} (${product.sku})`,
      timestamp: new Date().toISOString(),
    });

    saveDatabase();
    res.json({ product, imageUrl: finalUrl });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Erro ao adicionar foto ao produto.' });
  }
});

// Admin: Set primary photo for a catalog product (Restricted to single Admin)
app.put('/api/products/:id/images/primary', requireAdmin, (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Produto não encontrado.' });
    return;
  }

  const { imageUrl, index } = req.body;
  const currentImages = Array.isArray(product.images) ? [...product.images] : [];

  let targetIdx = typeof index === 'number' ? index : currentImages.indexOf(imageUrl);
  if (targetIdx < 0 || targetIdx >= currentImages.length) {
    res.status(400).json({ error: 'Foto não encontrada neste produto.' });
    return;
  }

  const [selected] = currentImages.splice(targetIdx, 1);
  currentImages.unshift(selected);
  product.images = currentImages;
  product.updatedAt = new Date().toISOString();

  saveDatabase();
  res.json({ product });
});

// Admin: Remove a photo from a catalog product (Restricted to single Admin)
app.delete('/api/products/:id/images', requireAdmin, async (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Produto não encontrado.' });
    return;
  }

  const { imageUrl, index } = req.body || {};
  const currentImages = Array.isArray(product.images) ? [...product.images] : [];

  let removedUrl = '';
  if (typeof index === 'number' && index >= 0 && index < currentImages.length) {
    removedUrl = currentImages.splice(index, 1)[0];
  } else if (typeof imageUrl === 'string' && imageUrl.trim()) {
    const idx = currentImages.indexOf(imageUrl.trim());
    if (idx !== -1) {
      removedUrl = currentImages.splice(idx, 1)[0];
    }
  }

  if (!removedUrl) {
    res.status(404).json({ error: 'Foto não encontrada para remoção.' });
    return;
  }

  product.images = currentImages;
  product.updatedAt = new Date().toISOString();

  const stillUsed = db.products.some(
    (p) => Array.isArray(p.images) && p.images.includes(removedUrl)
  );

  // Remove orphaned file from local /uploads or Supabase Storage bucket
  if (!stillUsed) {
    if (removedUrl.startsWith('/uploads/')) {
      const localFile = path.join(UPLOADS_DIR, path.basename(removedUrl));
      if (fs.existsSync(localFile)) {
        try {
          fs.unlinkSync(localFile);
        } catch {
          // ignore unlink error
        }
      }
    } else if (removedUrl.includes('/storage/v1/object/public/product-images/')) {
      const marker = '/storage/v1/object/public/product-images/';
      const storagePath = removedUrl.split(marker)[1];
      const supabase = getSupabaseAdmin();
      if (supabase && storagePath) {
        try {
          await supabase.storage.from('product-images').remove([decodeURIComponent(storagePath)]);
        } catch {
          // ignore storage cleanup error
        }
      }
    }
  }

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'REMOVER_FOTO_PRODUTO',
    user: 'Proprietária Ourata',
    details: `Removeu uma foto do produto ${product.name} (${product.sku})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ product, removedUrl });
});

// 3. Orders & Stock Reservation Engine
app.get('/api/orders', (req, res) => {
  const { customerId, status } = req.query;
  let orders = [...db.orders];

  if (customerId) {
    orders = orders.filter((o) => o.customerId === customerId);
  }

  if (status) {
    orders = orders.filter((o) => o.status === status);
  }

  res.json({ orders });
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido não encontrado.' });
    return;
  }
  res.json({ order });
});

// Create Order (Checkout via WhatsApp)
app.post('/api/orders', (req, res) => {
  const { customer, items, shippingFee = 0, discount = 0, notes = '' } = req.body;

  if (!customer || !customer.name || !customer.phone) {
    res.status(400).json({ error: 'Dados do cliente são obrigatórios.' });
    return;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'O carrinho está vazio.' });
    return;
  }

  // Stock verification & temporary reservation
  for (const item of items) {
    const prod = db.products.find((p) => p.id === item.productId);
    if (!prod) {
      res.status(400).json({ error: `Produto ${item.productName} não encontrado.` });
      return;
    }
    const available = prod.stock - (prod.reservedStock || 0);
    if (available < item.quantity) {
      res.status(400).json({
        error: `Quantidade indisponível para "${prod.name}". Disponível em estoque: ${Math.max(0, available)} un.`,
      });
      return;
    }
  }

  // Apply reservations
  for (const item of items) {
    const prod = db.products.find((p) => p.id === item.productId)!;
    prod.reservedStock = (prod.reservedStock || 0) + item.quantity;

    db.stockMovements.unshift({
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      type: 'RESERVA',
      quantity: item.quantity,
      previousStock: prod.stock,
      newStock: prod.stock, // Physical stock remains, reservation recorded
      reason: `Reserva temporária para novo pedido aguardando confirmação`,
      timestamp: new Date().toISOString(),
    });
  }

  // Generate unique Order Number
  const orderSeq = (db.orders.length + 1045).toString();
  const orderId = `OUR-2026-${orderSeq}`;

  const subtotal = items.reduce(
    (acc: number, curr: any) => acc + curr.unitPrice * curr.quantity,
    0
  );
  const total = Math.max(0, subtotal - discount + shippingFee);
  const isWholesale = items.some((i: any) => i.isWholesaleApplied);

  const formattedAddress = customer.shippingAddress
    ? `${customer.shippingAddress.street}, ${customer.shippingAddress.number}${
        customer.shippingAddress.complement ? ` - ${customer.shippingAddress.complement}` : ''
      }, ${customer.shippingAddress.neighborhood}, ${customer.shippingAddress.city}/${
        customer.shippingAddress.state
      } - CEP: ${customer.shippingAddress.cep}`
    : 'Retirada no ateliê / A combinar';

  // Build items list string for WhatsApp
  const itemsText = items
    .map(
      (it: any) =>
        `• ${it.quantity}x ${it.productName} (SKU: ${it.sku}) - R$ ${(
          it.unitPrice * it.quantity
        ).toFixed(2).replace('.', ',')}`
    )
    .join('\n');

  // Exact WhatsApp standard message template required by specification
  const whatsappMessage = `Olá! Tudo bem? Sou cliente da Ourata Semijoias e acabei de realizar um pedido pelo site.

Número do pedido: ${orderId}

Nome: ${customer.name}

Produtos:
${itemsText}

Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}

Desconto: R$ ${Number(discount).toFixed(2).replace('.', ',')}

Frete: ${shippingFee === 0 ? 'Grátis' : `R$ ${Number(shippingFee).toFixed(2).replace('.', ',')}`}

Total do pedido: R$ ${total.toFixed(2).replace('.', ',')}

Endereço de entrega: ${formattedAddress}

Gostaria de combinar a forma de pagamento e confirmar minha compra.

Aguardo seu retorno! Obrigada.`;

  const officialWhatsappNumber = '5519988064749';
  const whatsappUrl = `https://wa.me/${officialWhatsappNumber}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  const newOrder: Order = {
    id: orderId,
    customerId: customer.id || 'visitante',
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerCpf: customer.cpf || '',
    shippingAddress: customer.shippingAddress,
    items,
    subtotal,
    discount,
    shippingFee,
    total,
    isWholesaleOrder: isWholesale,
    status: 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO',
    paymentMethodNotes: 'A combinar pelo WhatsApp (+55 19 98806-4749)',
    whatsappMessage,
    whatsappUrl,
    reservationExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), // 48 hours reservation
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.orders.unshift(newOrder);

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'CRIAR_PEDIDO',
    user: customer.name,
    details: `Pedido ${orderId} registrado pelo site no valor de R$ ${total.toFixed(2)}. Status: AGUARDANDO CONFIRMAÇÃO.`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  res.status(201).json({ order: newOrder, whatsappUrl });
});

// Update Order Status (Admin controls with stock confirmation/release)
app.put('/api/orders/:id/status', requireAdmin, (req, res) => {
  const { status, notes } = req.body;
  const order = db.orders.find((o) => o.id === req.params.id);

  if (!order) {
    res.status(404).json({ error: 'Pedido não encontrado.' });
    return;
  }

  const previousStatus = order.status;
  if (previousStatus === status) {
    res.json({ order });
    return;
  }

  // Stock transition logic
  if (status === 'PAGAMENTO CONFIRMADO' && previousStatus === 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO') {
    // Confirm stock exit: decrement physical stock and free reserved stock
    for (const item of order.items) {
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) {
        const prevStock = prod.stock;
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.reservedStock = Math.max(0, (prod.reservedStock || 0) - item.quantity);

        db.stockMovements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: 'SAIDA_CONFIRMADA',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: prod.stock,
          orderId: order.id,
          reason: `Saída definitiva de estoque confirmada para o pedido ${order.id}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } else if (status === 'PEDIDO CANCELADO') {
    // If order was waiting confirmation, release reserved stock
    if (previousStatus === 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO') {
      for (const item of order.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.reservedStock = Math.max(0, (prod.reservedStock || 0) - item.quantity);

          db.stockMovements.unshift({
            id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'LIBERACAO_CANCELAMENTO',
            quantity: item.quantity,
            previousStock: prod.stock,
            newStock: prod.stock,
            orderId: order.id,
            reason: `Liberação de reserva devido a cancelamento do pedido ${order.id}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else if (previousStatus === 'PAGAMENTO CONFIRMADO' || previousStatus === 'PEDIDO EM SEPARAÇÃO') {
      // Re-enter items into physical stock if canceled after confirmation
      for (const item of order.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          const prevStock = prod.stock;
          prod.stock += item.quantity;

          db.stockMovements.unshift({
            id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'ENTRADA',
            quantity: item.quantity,
            previousStock: prevStock,
            newStock: prod.stock,
            orderId: order.id,
            reason: `Devolução ao estoque por cancelamento do pedido ${order.id}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (notes) order.notes = notes;

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'STATUS_PEDIDO_ALTERADO',
    user: 'Proprietária Ourata',
    details: `Alterou status do pedido ${order.id} de "${previousStatus}" para "${status}".`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ order });
});

// 4. Bath Services (Serviços de Banho de Semijoias)
app.get('/api/bath-services', (req, res) => {
  const { protocol, email } = req.query;
  let services = [...db.bathServices];

  if (protocol) {
    const q = String(protocol).trim().toUpperCase();
    services = services.filter((s) => s.protocol.toUpperCase().includes(q));
  }

  if (email) {
    services = services.filter(
      (s) => s.customerEmail.toLowerCase() === String(email).toLowerCase()
    );
  }

  res.json({ bathServices: services });
});

app.post('/api/bath-services', (req, res) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    pieceType,
    quantity,
    bathType,
    observations,
    photoUrl,
  } = req.body;

  if (!customerName || !customerPhone || !pieceType || !bathType) {
    res.status(400).json({
      error: 'Nome, telefone, tipo de peça e banho desejado são obrigatórios.',
    });
    return;
  }

  const seq = (db.bathServices.length + 43).toString().padStart(4, '0');
  const protocol = `SB-2026-${seq}`;

  const newService: BathService = {
    id: `sb-${Date.now()}`,
    protocol,
    customerName,
    customerPhone,
    customerEmail: customerEmail || '',
    pieceType,
    quantity: Number(quantity || 1),
    bathType,
    observations: observations || '',
    photoUrl: photoUrl || '',
    status: 'Solicitação recebida',
    estimatedDays: 7,
    priceQuote: undefined,
    history: [
      {
        status: 'Solicitação recebida',
        date: new Date().toISOString(),
        notes: 'Protocolo gerado online pelo cliente.',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.bathServices.unshift(newService);

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'NOVO_SERVICO_BANHO',
    user: customerName,
    details: `Solicitou serviço de banho ${protocol} para ${newService.quantity} un de ${newService.pieceType} (${newService.bathType})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.status(201).json({ bathService: newService });
});

app.put('/api/bath-services/:id', requireAdmin, (req, res) => {
  const service = db.bathServices.find((s) => s.id === req.params.id);
  if (!service) {
    res.status(404).json({ error: 'Serviço de banho não encontrado.' });
    return;
  }

  const { status, notes, priceQuote, estimatedDays } = req.body;

  if (status && status !== service.status) {
    service.status = status;
    service.history.push({
      status,
      date: new Date().toISOString(),
      notes: notes || undefined,
    });
  }

  if (priceQuote !== undefined) service.priceQuote = Number(priceQuote);
  if (estimatedDays !== undefined) service.estimatedDays = Number(estimatedDays);
  if (notes) service.observations = notes;
  service.updatedAt = new Date().toISOString();

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'SERVICO_BANHO_ATUALIZADO',
    user: 'Proprietária Ourata',
    details: `Atualizou protocolo de banho ${service.protocol} para status: ${service.status}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ bathService: service });
});

// 5. Stock Movements & Audit Logs
app.get('/api/stock/history', (_req, res) => {
  res.json({ movements: db.stockMovements });
});

app.get('/api/admin/audit-logs', requireAdmin, (_req, res) => {
  res.json({ logs: db.auditLogs });
});

// Admin Dashboard KPIs
app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const totalSales = db.orders.length;
  const confirmedOrders = db.orders.filter(
    (o) =>
      o.status === 'PAGAMENTO CONFIRMADO' ||
      o.status === 'PEDIDO EM SEPARAÇÃO' ||
      o.status === 'PEDIDO ENVIADO' ||
      o.status === 'PEDIDO ENTREGUE'
  );
  const totalConfirmedRevenue = confirmedOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = db.orders.filter(
    (o) => o.status === 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO'
  );
  const pendingRevenue = pendingOrders.reduce((sum, o) => sum + o.total, 0);

  const lowStockProducts = db.products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockAlert
  );
  const outOfStockProducts = db.products.filter((p) => p.stock <= 0);

  // Best sellers based on completed orders
  const itemCounts: Record<string, { product: Product; totalQuantity: number }> = {};
  for (const o of confirmedOrders) {
    for (const it of o.items) {
      if (!itemCounts[it.productId]) {
        const prod = db.products.find((p) => p.id === it.productId);
        if (prod) {
          itemCounts[it.productId] = { product: prod, totalQuantity: 0 };
        }
      }
      if (itemCounts[it.productId]) {
        itemCounts[it.productId].totalQuantity += it.quantity;
      }
    }
  }

  const bestSellers = Object.values(itemCounts)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 5);

  res.json({
    kpis: {
      totalSales,
      totalConfirmedRevenue,
      pendingOrdersCount: pendingOrders.length,
      pendingRevenue,
      totalProducts: db.products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      totalCustomers: db.users.filter((u) => u.role === 'customer').length,
      activeBathServices: db.bathServices.filter((s) => s.status !== 'Devolvido').length,
    },
    lowStockProducts,
    outOfStockProducts,
    bestSellers,
    recentOrders: db.orders.slice(0, 8),
    recentMovements: db.stockMovements.slice(0, 8),
  });
});

// 6. User Auth & Profiles
app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, cpf, password, address } = req.body;

  if (!name || !email || !phone) {
    res.status(400).json({ error: 'Nome, e-mail e telefone são obrigatórios.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  // Protect administrator account: nobody can register with admin email or role
  const existing = db.users.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    res.status(400).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
    return;
  }

  const verificationToken = `VERIFY_${Math.random().toString(36).substr(2, 9)}`;
  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    password: password ? String(password).trim() : undefined,
    phone: phone.trim(),
    cpf: cpf ? cpf.trim() : '',
    role: 'customer', // STRICT: All new accounts are strictly customers
    address: address || undefined,
    isVerified: true,
    verificationToken,
    favorites: [],
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase();

  const safeUser = { ...newUser };
  delete safeUser.password;

  res.status(201).json({
    user: safeUser,
    message: 'Cadastro de cliente realizado com sucesso! Acesso liberado.',
    verificationLink: `/verificar-email?token=${verificationToken}`,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, isAdminLogin } = req.body;
  if (!email) {
    res.status(400).json({ error: 'E-mail é obrigatório.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    res.status(404).json({ error: 'Nenhuma conta encontrada com este e-mail.' });
    return;
  }

  // If logging in as admin or user has admin role
  if (user.role === 'admin' || isAdminLogin) {
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Este e-mail não possui autorização de administradora.' });
      return;
    }
    const adminPass = user.password || process.env.ADMIN_PASSWORD?.trim() || '';
    if (!adminPass || !password || password !== adminPass) {
      res.status(401).json({ error: 'Senha incorreta para a conta da Administradora.' });
      return;
    }
  } else {
    // Customer login: verify password if customer set one and submitted one
    if (user.password && password && user.password !== password) {
      res.status(401).json({ error: 'Senha incorreta.' });
      return;
    }
  }

  const safeUser = { ...user };
  delete safeUser.password;
  res.json({ user: safeUser });
});

// Admin credentials management endpoint (restricted strictly to the single administrator)
app.put('/api/admin/credentials', requireAdmin, (req, res) => {
  const admin = db.users.find((u) => u.role === 'admin');
  if (!admin) {
    res.status(404).json({ error: 'Administradora não encontrada.' });
    return;
  }

  const { name, email, phone, currentPassword, newPassword } = req.body;

  if (newPassword) {
    const currentStoredPass = admin.password || process.env.ADMIN_PASSWORD?.trim() || '';
    if (!currentStoredPass || !currentPassword || currentPassword !== currentStoredPass) {
      res.status(400).json({ error: 'Senha atual incorreta. Digite a senha atual da administradora para alterá-la.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    admin.password = newPassword.trim();
  }

  if (name) admin.name = name.trim();
  if (email) admin.email = email.trim().toLowerCase();
  if (phone) admin.phone = phone.trim();

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'CREDENCIAIS_ADMIN_ATUALIZADAS',
    user: admin.name,
    details: 'Atualizou dados cadastrais e/ou senha de acesso da Administradora.',
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const safeAdmin = { ...admin };
  delete safeAdmin.password;
  res.json({ user: safeAdmin, message: 'Dados e credenciais da administradora atualizados com sucesso!' });
});

app.post('/api/auth/magic-link', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Informe seu e-mail.' });
    return;
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    res.status(404).json({ error: 'Nenhuma conta encontrada com este e-mail.' });
    return;
  }

  const magicToken = `MAGIC_${Math.random().toString(36).substr(2, 9)}`;
  user.magicLinkToken = magicToken;
  saveDatabase();

  res.json({
    success: true,
    message: 'Link mágico enviado para seu e-mail! (Simulado para testes rápidos)',
    magicLink: `/acesso-magico?token=${magicToken}`,
    token: magicToken,
  });
});

app.post('/api/auth/verify-magic-link', (req, res) => {
  const { token } = req.body;
  const user = db.users.find((u) => u.magicLinkToken === token);
  if (!user) {
    res.status(400).json({ error: 'Link mágico inválido ou expirado.' });
    return;
  }

  user.magicLinkToken = undefined;
  saveDatabase();

  res.json({ user });
});

// Update profile / address
app.put('/api/auth/profile/:id', (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const { name, phone, cpf, address, favorites } = req.body;
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (cpf) user.cpf = cpf;
  if (address) user.address = address;
  if (favorites) user.favorites = favorites;

  saveDatabase();
  res.json({ user });
});

// 7. Gemini AI Copywriter & Marketing Assistant for the Owner
app.post('/api/ai/generate', requireAdmin, async (req, res) => {
  try {
    const { mode, productName, category, details, prompt, existingText } = req.body;

    const brandSystemInstruction =
      'Você é a estrategista e redatora de luxo da OURATA SEMIJOIAS (Limeira - SP). A marca é referência em semijoias finas, com banho nobre de 10 milésimos de ouro 18k e ródio, dupla camada de verniz diamond hipoalergênico (100% níquel free), acabamento de alta joalheria, garantia de 1 ano, vendas no varejo e atacado para revendedoras com suporte direto pelo WhatsApp (+55 19 98806-4749). Seu tom é extremamente elegante, sofisticado, envolvente, poético e focado em encantar e converter sem soar genérico. Nunca invente marcas concorrentes. Responda em português impecável.';

    let userPrompt = '';
    const userNote = (prompt || details || '').trim();
    const targetProduct = (productName || 'Semijoia Ourata').trim();
    const targetCategory = (category || 'Semijoias').trim();

    switch (mode) {
      // 1. Criar descrições profissionais para semijoias
      case 'description':
        userPrompt = `Crie uma descrição completa, profissional e sedutora para a seguinte semijoia:
Produto: "${targetProduct}"
Categoria: "${targetCategory}"
${userNote ? `Solicitação específica / Detalhes adicionais: "${userNote}"` : ''}

Estruture a resposta com:
1. Título poético e marcante para a peça.
2. Descrição envolvente sobre design, brilho e sensação de usar.
3. Especificações Técnicas de Qualidade Ourata (Banho nobre 10 milésimos Ouro 18k/Ródio, Verniz Diamond antialérgico, 1 ano de garantia).
4. Sugestão de ocasiões e composições (mix de peças).`;
        break;

      // 2. Gerar títulos para produtos
      case 'title':
        userPrompt = `Gere opções de títulos comerciais refinados e nomes de coleções exclusivas para o seguinte produto:
Produto / Referência: "${targetProduct}"
Categoria: "${targetCategory}"
${userNote ? `Solicitação específica / Detalhes: "${userNote}"` : ''}

Forneça:
- 7 opções de Títulos Comerciais de Alto Padrão (sonoros, elegantes e memoráveis para e-commerce).
- 4 opções de Nomes de Coleções de Luxo onde essa peça seria protagonista.`;
        break;

      // 3. Criar legendas para Instagram
      case 'instagram':
        userPrompt = `Crie uma legenda magnética para o Instagram (Feed e Reels) da OURATA SEMIJOIAS apresentando:
Produto: "${targetProduct}"
Categoria: "${targetCategory}"
${userNote ? `Solicitação específica / Ângulo da postagem: "${userNote}"` : ''}

A legenda deve conter:
- Gancho de abertura irresistível nos primeiros segundos.
- Narrativa sofisticada valorizando a elegância, o banho de 10 milésimos e o brilho impecável.
- Chamada para ação (CTA) convidando para chamar no WhatsApp oficial (+55 19 98806-4749) ou reservar pelo site.
- 10 hashtags estratégicas de semijoias finas, atacado e moda.`;
        break;

      // 4. Elaborar textos promocionais
      case 'promo':
      case 'ad':
      case 'wholesale_pitch':
        userPrompt = `Elabore textos promocionais altamente persuasivos para divulgação da OURATA SEMIJOIAS:
Foco / Produto: "${targetProduct}" (${targetCategory})
${userNote ? `Solicitação específica / Condições promocionais: "${userNote}"` : ''}

Crie:
1. Texto Promocional para Varejo (destaque de presente inesquecível, garantia e beleza duradoura).
2. Texto Promocional para Atacado / Revendedoras (oportunidade de lucro de até 100%, peças prontas para entrega, banho duradouro com garantia de 1 ano).
3. Chamada rápida e direta para WhatsApp (+55 19 98806-4749).`;
        break;

      // 5. Sugerir campanhas de divulgação
      case 'campaign':
        userPrompt = `Desenvolva uma proposta completa de campanha de divulgação e marketing para a OURATA SEMIJOIAS:
Tema / Foco da Campanha: "${targetProduct || targetCategory}"
${userNote ? `Solicitação específica / Objetivos: "${userNote}"` : ''}

Apresente um planejamento prático e estruturado:
1. Nome / Slogan da Campanha.
2. Conceito Criativo e Apelo Emocional.
3. Cronograma sugerido de conteúdo (Stories diários, Reels de desejo, fotos de catálogo).
4. Mensagem modelo para Lista de Transmissão VIP de clientes e revendedoras no WhatsApp (+55 19 98806-4749).
5. Ação de conversão para acelerar o fechamento de pedidos.`;
        break;

      // 6. Melhorar textos já existentes
      case 'improve':
        userPrompt = `Melhore e eleve o seguinte texto tornando-o muito mais elegante, sofisticado e atraente para o público de semijoias finas da OURATA SEMIJOIAS:

Texto Original:
"${existingText || userNote}"

${userNote && userNote !== existingText ? `Solicitação específica de melhoria: "${userNote}"` : ''}

Forneça:
- Versão Aprimorada Principal (fluida, refinada e altamente vendedora).
- Versão Concisa (ideal para legendas curtas ou fichas de produto).`;
        break;

      default:
        userPrompt = `Solicitação para o marketing da OURATA SEMIJOIAS:
"${userNote || targetProduct}"`;
    }

    const geminiAi = getGeminiClient();
    if (!geminiAi) {
      res.status(500).json({
        error:
          'Chave da API do Gemini não configurada no servidor. Configure a variável GEMINI_API_KEY.',
      });
      return;
    }

    let response;
    try {
      response = await geminiAi.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: userPrompt,
        config: {
          systemInstruction: brandSystemInstruction,
        },
      });
    } catch (primaryErr: any) {
      console.warn('Primary model failed, trying fallback model gemini-3.5-flash-lite:', primaryErr?.message);
      response = await geminiAi.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: userPrompt,
        config: {
          systemInstruction: brandSystemInstruction,
        },
      });
    }

    const generatedText = response.text?.trim();

    if (!generatedText) {
      res.status(502).json({
        error:
          'A API do Gemini retornou uma resposta sem conteúdo textual. Tente novamente refinando sua solicitação.',
      });
      return;
    }

    res.json({ result: generatedText });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(502).json({
      error: `Erro ao comunicar com a API do Gemini: ${error?.message || 'Falha na requisição'}`,
      details: error?.status || error?.code || undefined,
    });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Ourata Semijoias server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
