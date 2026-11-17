import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceAdmin } from '../lib/supabaseServer.ts';

// Deterministic RFC 4122 UUID v5 namespace for Ourata legacy IDs
const OURATA_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function deterministicUuid(key: string): string {
  const nsHex = OURATA_NAMESPACE.replace(/-/g, '');
  const nsBytes = Buffer.from(nsHex, 'hex');
  const nameBytes = Buffer.from(`ourata:${key}`, 'utf8');
  const hash = crypto.createHash('sha1').update(nsBytes).update(nameBytes).digest();

  // Version 5 & RFC 4122 variant
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const ALL_TABLES = [
  'profiles',
  'categories',
  'products',
  'product_images',
  'addresses',
  'favorites',
  'carts',
  'cart_items',
  'orders',
  'order_items',
  'stock_movements',
  'plating_services',
] as const;

export type TableCounts = Record<(typeof ALL_TABLES)[number], number>;

export async function collectTableCounts(supabase: SupabaseClient): Promise<TableCounts> {
  const counts = {} as TableCounts;
  for (const table of ALL_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Erro ao contar tabela ${table}: ${error.message}`);
    }
    counts[table] = count ?? 0;
  }
  return counts;
}

export interface MigrationReport {
  success: boolean;
  executedAt: string;
  beforeCounts: TableCounts;
  afterCounts: TableCounts;
  storageUploaded: string[];
  storageSkippedExisting: string[];
  storageUrls: Record<string, string>;
  inserted: {
    authUsers: number;
    profilesUpdated: number;
    addresses: number;
    products: number;
    productImages: number;
    favorites: number;
    orders: number;
    orderItems: number;
    stockMovements: number;
    platingServices: number;
  };
  skippedExisting: {
    authUsers: number;
    addresses: number;
    products: number;
    productImages: number;
    favorites: number;
    orders: number;
    orderItems: number;
    stockMovements: number;
    platingServices: number;
  };
  divergences: string[];
  adminCheck: {
    adminCount: number;
    adminEmail: string | null;
  };
}

function generateSecureRandomPassword(): string {
  return `Ourata!${crypto.randomBytes(20).toString('base64url')}9z`;
}

export async function runDbJsonMigrationToSupabase(
  projectRoot: string = process.cwd()
): Promise<MigrationReport> {
  const supabase = getSupabaseServiceAdmin();
  if (!supabase) {
    throw new Error(
      'SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. A migração requer privilégio service_role.'
    );
  }

  const dbPath = path.join(projectRoot, 'data', 'db.json');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Arquivo de origem data/db.json não encontrado em ${dbPath}.`);
  }

  const rawDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  // 1. Collect pre-migration snapshot & counts
  const beforeCounts = await collectTableCounts(supabase);
  try {
    const backupDir = path.join(projectRoot, '.backup-etapa2');
    if (fs.existsSync(backupDir)) {
      const preSnapshot: Record<string, any> = {
        capturedAt: new Date().toISOString(),
        beforeCounts,
        tables: {},
      };
      for (const table of ALL_TABLES) {
        const { data } = await supabase.from(table).select('*').limit(1000);
        preSnapshot.tables[table] = data || [];
      }
      fs.writeFileSync(
        path.join(backupDir, 'supabase-pre-migration-snapshot.json'),
        JSON.stringify(preSnapshot, null, 2),
        'utf-8'
      );
    }
  } catch (err) {
    console.warn('Aviso ao gravar snapshot pré-migração:', err);
  }

  const report: MigrationReport = {
    success: false,
    executedAt: new Date().toISOString(),
    beforeCounts,
    afterCounts: { ...beforeCounts },
    storageUploaded: [],
    storageSkippedExisting: [],
    storageUrls: {},
    inserted: {
      authUsers: 0,
      profilesUpdated: 0,
      addresses: 0,
      products: 0,
      productImages: 0,
      favorites: 0,
      orders: 0,
      orderItems: 0,
      stockMovements: 0,
      platingServices: 0,
    },
    skippedExisting: {
      authUsers: 0,
      addresses: 0,
      products: 0,
      productImages: 0,
      favorites: 0,
      orders: 0,
      orderItems: 0,
      stockMovements: 0,
      platingServices: 0,
    },
    divergences: [],
    adminCheck: {
      adminCount: 0,
      adminEmail: null,
    },
  };

  // 2. Upload the 5 original catalog images to Supabase Storage bucket `product-images`
  const imageDirs = [
    path.join(projectRoot, 'src', 'assets', 'images'),
    path.join(projectRoot, 'public', 'assets', 'images'),
  ];
  const sourceImagesDir = imageDirs.find((d) => fs.existsSync(d));
  const imageFileMap: Record<string, string> = {};

  if (sourceImagesDir) {
    const { data: existingFiles } = await supabase.storage
      .from('product-images')
      .list('catalog', { limit: 200 });
    const existingNames = new Set((existingFiles || []).map((f) => f.name));

    const files = fs
      .readdirSync(sourceImagesDir)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));

    for (const fileName of files) {
      const storagePath = `catalog/${fileName}`;
      if (!existingNames.has(fileName)) {
        const fileBuffer = fs.readFileSync(path.join(sourceImagesDir, fileName));
        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(storagePath, fileBuffer, {
            contentType: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
            upsert: false,
          });
        if (uploadErr) {
          throw new Error(`Falha ao enviar imagem "${fileName}" ao Storage: ${uploadErr.message}`);
        }
        report.storageUploaded.push(storagePath);
      } else {
        report.storageSkippedExisting.push(storagePath);
      }

      const { data: pubData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      if (pubData?.publicUrl) {
        imageFileMap[fileName] = pubData.publicUrl;
        report.storageUrls[`/assets/images/${fileName}`] = pubData.publicUrl;
      }
    }
  }

  const resolveMigratedImageUrl = (rawUrl?: string): string => {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();
    const base = path.basename(trimmed);
    if (
      (trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('/assets/images/')) &&
      imageFileMap[base]
    ) {
      return imageFileMap[base];
    }
    return trimmed.replace(/^\/src\/assets\/images\//, '/assets/images/');
  };

  // 3. Migrate Users -> Auth + Profiles + Addresses (NEVER reading plaintext password from db.json)
  const { data: authUsersData, error: listUsersErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listUsersErr) {
    throw new Error(`Erro ao listar usuários do Supabase Auth: ${listUsersErr.message}`);
  }

  const emailToAuthId = new Map<string, string>();
  for (const au of authUsersData?.users || []) {
    if (au.email) {
      emailToAuthId.set(au.email.toLowerCase(), au.id);
    }
  }

  const { data: existingProfilesBefore } = await supabase.from('profiles').select('*');
  let adminProfiles = (existingProfilesBefore || []).filter((p) => p.role === 'admin');

  for (const u of rawDb.users || []) {
    const cleanEmail = String(u.email || '').trim().toLowerCase();
    if (!cleanEmail) continue;

    let userId = emailToAuthId.get(cleanEmail);
    if (!userId) {
      const { data: createdAuth, error: createAuthErr } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        password: generateSecureRandomPassword(),
        user_metadata: {
          name: u.name,
          phone: u.phone || null,
        },
      });
      if (createAuthErr || !createdAuth?.user) {
        throw new Error(`Erro ao criar usuário Auth "${cleanEmail}": ${createAuthErr?.message}`);
      }
      userId = createdAuth.user.id;
      emailToAuthId.set(cleanEmail, userId);
      report.inserted.authUsers++;
    } else {
      report.skippedExisting.authUsers++;
    }

    // Ensure profile exists and enrich missing phone/cpf without overwriting existing data
    const { data: profRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profRow) {
      const { error: profInsErr } = await supabase.from('profiles').insert({
        id: userId,
        name: u.name,
        email: cleanEmail,
        phone: u.phone || null,
        cpf: u.cpf || null,
        role: 'customer',
        is_verified: Boolean(u.isVerified ?? true),
        created_at: u.createdAt || new Date().toISOString(),
      });
      if (profInsErr) {
        throw new Error(`Erro ao inserir profile "${cleanEmail}": ${profInsErr.message}`);
      }
      report.inserted.profilesUpdated++;
    } else {
      const patch: Record<string, any> = {};
      if (!profRow.phone && u.phone) patch.phone = u.phone;
      if (!profRow.cpf && u.cpf) patch.cpf = u.cpf;
      if (!profRow.name && u.name) patch.name = u.name;
      if (Object.keys(patch).length > 0) {
        const { error: profUpdErr } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', userId);
        if (profUpdErr) {
          throw new Error(`Erro ao complementar profile "${cleanEmail}": ${profUpdErr.message}`);
        }
        report.inserted.profilesUpdated++;
      }
    }

    // Promote ONLY the official single admin via promote_initial_admin if no admin exists yet
    if (u.role === 'admin' && cleanEmail === 'ouratasemijoias@gmail.com') {
      const { data: currentAdmins } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'admin');

      if (!currentAdmins || currentAdmins.length === 0) {
        const { error: promErr } = await supabase.rpc('promote_initial_admin', {
          p_admin_email: cleanEmail,
        });
        if (promErr) {
          throw new Error(`Falha ao promover administradora "${cleanEmail}": ${promErr.message}`);
        }
      } else if (!currentAdmins.some((a) => a.email.toLowerCase() === cleanEmail)) {
        report.divergences.push(
          `Admin divergente encontrado no banco (${currentAdmins.map((a) => a.email).join(', ')}); mantido sem sobrescrever.`
        );
      }
    }

    // Address migration (idempotent by profile_id + cep + street + number)
    if (u.address && u.address.street && u.address.cep) {
      const { data: existingAddrs } = await supabase
        .from('addresses')
        .select('*')
        .eq('profile_id', userId);

      const dupAddr = (existingAddrs || []).find(
        (a) =>
          a.cep === u.address.cep &&
          a.street === u.address.street &&
          a.number === u.address.number
      );

      if (!dupAddr) {
        const { error: addrErr } = await supabase.from('addresses').insert({
          id: deterministicUuid(`address:${u.id}`),
          profile_id: userId,
          cep: u.address.cep,
          street: u.address.street,
          number: u.address.number,
          complement: u.address.complement || null,
          neighborhood: u.address.neighborhood || 'Centro',
          city: u.address.city || 'Limeira',
          state: u.address.state || 'SP',
          is_default: (existingAddrs || []).length === 0,
        });
        if (addrErr) {
          throw new Error(`Erro ao inserir endereço para "${cleanEmail}": ${addrErr.message}`);
        }
        report.inserted.addresses++;
      } else {
        report.skippedExisting.addresses++;
      }
    }
  }

  const { data: finalAdmins } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('role', 'admin');
  adminProfiles = finalAdmins || [];
  report.adminCheck = {
    adminCount: adminProfiles.length,
    adminEmail: adminProfiles[0]?.email || null,
  };

  // 4. Read Categories map (name -> id)
  const { data: categoriesRows, error: catErr } = await supabase
    .from('categories')
    .select('id, name');
  if (catErr) {
    throw new Error(`Erro ao consultar categorias: ${catErr.message}`);
  }
  const categoryNameToId = new Map<string, string>();
  for (const cat of categoriesRows || []) {
    categoryNameToId.set(cat.name, cat.id);
  }

  // 5. Migrate Products (7) & Product Images (7)
  const legacyToProductUuid = new Map<string, string>();
  const skuToProductUuid = new Map<string, string>();

  const { data: existingProducts } = await supabase.from('products').select('*');
  const existingBySku = new Map<string, any>();
  for (const ep of existingProducts || []) {
    existingBySku.set(ep.sku, ep);
  }

  for (const p of rawDb.products || []) {
    const existing = existingBySku.get(p.sku);
    let productUuid = existing?.id || deterministicUuid(`product:${p.id}`);

    if (!existing) {
      const { error: prodErr } = await supabase.from('products').insert({
        id: productUuid,
        sku: p.sku,
        name: p.name,
        description: p.description || '',
        category: p.category || 'Outros',
        category_id: categoryNameToId.get(p.category) || null,
        price: Number(p.price),
        wholesale_price: Number(p.wholesalePrice),
        min_wholesale_qty: Number(p.minWholesaleQty || 5),
        tiered_pricing: Array.isArray(p.tieredPricing) ? p.tieredPricing : [],
        stock: Number(p.stock ?? 0),
        reserved_stock: Number(p.reservedStock ?? 0),
        low_stock_alert: Number(p.lowStockAlert ?? 5),
        is_featured: Boolean(p.isFeatured),
        is_new_release: Boolean(p.isNewRelease),
        is_offer: Boolean(p.isOffer),
        plating_type: p.platingType || 'Banho Ouro 18k (10 milésimos)',
        warranty: p.warranty || '1 ano de garantia',
        min_purchase_qty: Number(p.minPurchaseQty || 1),
        created_at: p.createdAt || new Date().toISOString(),
        updated_at: p.updatedAt || p.createdAt || new Date().toISOString(),
      });
      if (prodErr) {
        throw new Error(`Erro ao inserir produto ${p.sku}: ${prodErr.message}`);
      }
      report.inserted.products++;
    } else {
      report.skippedExisting.products++;
      if (
        Number(existing.price) !== Number(p.price) ||
        Number(existing.stock) !== Number(p.stock) ||
        existing.name !== p.name
      ) {
        report.divergences.push(
          `Produto ${p.sku} já existe no Supabase com valores diferentes (mantido registro atual do Supabase sem sobrescrever).`
        );
      }
    }

    legacyToProductUuid.set(p.id, productUuid);
    skuToProductUuid.set(p.sku, productUuid);

    // Product Images
    const { data: existingImgs } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productUuid);

    const existingUrlSet = new Set((existingImgs || []).map((im) => im.image_url));
    const sourceImages: string[] = Array.isArray(p.images) ? p.images : [];

    for (let idx = 0; idx < sourceImages.length; idx++) {
      const targetUrl = resolveMigratedImageUrl(sourceImages[idx]);
      if (!targetUrl) continue;

      if (!existingUrlSet.has(targetUrl)) {
        const hasAnyImageAlready = (existingImgs || []).length > 0 || idx > 0;
        const { error: imgErr } = await supabase.from('product_images').insert({
          id: deterministicUuid(`product_image:${p.id}:${idx}:${path.basename(targetUrl)}`),
          product_id: productUuid,
          image_url: targetUrl,
          display_order: idx,
          is_primary: idx === 0 && !hasAnyImageAlready,
        });
        if (imgErr) {
          throw new Error(`Erro ao inserir imagem do produto ${p.sku}: ${imgErr.message}`);
        }
        existingUrlSet.add(targetUrl);
        report.inserted.productImages++;
      } else {
        report.skippedExisting.productImages++;
      }
    }
  }

  // 6. Migrate Favorites (2)
  for (const u of rawDb.users || []) {
    const cleanEmail = String(u.email || '').trim().toLowerCase();
    const profileId = emailToAuthId.get(cleanEmail);
    if (!profileId || !Array.isArray(u.favorites) || u.favorites.length === 0) continue;

    const { data: existingFavs } = await supabase
      .from('favorites')
      .select('product_id')
      .eq('profile_id', profileId);
    const favSet = new Set((existingFavs || []).map((f) => f.product_id));

    for (const legacyProdId of u.favorites) {
      const prodUuid = legacyToProductUuid.get(legacyProdId);
      if (!prodUuid) continue;
      if (!favSet.has(prodUuid)) {
        const { error: favErr } = await supabase.from('favorites').insert({
          id: deterministicUuid(`favorite:${cleanEmail}:${legacyProdId}`),
          profile_id: profileId,
          product_id: prodUuid,
        });
        if (favErr) {
          throw new Error(`Erro ao inserir favorito ${legacyProdId}: ${favErr.message}`);
        }
        favSet.add(prodUuid);
        report.inserted.favorites++;
      } else {
        report.skippedExisting.favorites++;
      }
    }
  }

  // 7. Migrate Orders (2) & Order Items (2) directly without altering stock/reservations
  for (const o of rawDb.orders || []) {
    const orderEmail = String(o.customerEmail || '').trim().toLowerCase();
    // OUR-2026-1046 has customerId: 'visitante' -> null; OUR-2026-1001 resolves to cliente@exemplo.com.br UUID
    const resolvedCustomerId =
      o.customerId === 'visitante' ? null : emailToAuthId.get(orderEmail) || null;

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', o.id)
      .maybeSingle();

    if (!existingOrder) {
      const reservationExpiresAt =
        o.status === 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO'
          ? o.reservationExpiresAt || null
          : null;

      const { error: ordErr } = await supabase.from('orders').insert({
        id: o.id,
        customer_id: resolvedCustomerId,
        customer_name: o.customerName,
        customer_email: orderEmail,
        customer_phone: o.customerPhone,
        customer_cpf: o.customerCpf || null,
        shipping_address: o.shippingAddress || {},
        subtotal: Number(o.subtotal),
        discount: Number(o.discount || 0),
        shipping_fee: Number(o.shippingFee || 0),
        total: Number(o.total),
        is_wholesale_order: Boolean(o.isWholesaleOrder),
        status: o.status,
        payment_method_notes:
          o.paymentMethodNotes || 'A combinar pelo WhatsApp (+55 19 98806-4749)',
        whatsapp_message: o.whatsappMessage || null,
        whatsapp_url: o.whatsappUrl || null,
        reservation_expires_at: reservationExpiresAt,
        notes: o.notes || null,
        created_at: o.createdAt || new Date().toISOString(),
        updated_at: o.updatedAt || o.createdAt || new Date().toISOString(),
      });
      if (ordErr) {
        throw new Error(`Erro ao inserir pedido ${o.id}: ${ordErr.message}`);
      }
      report.inserted.orders++;
    } else {
      report.skippedExisting.orders++;
      if (
        Number(existingOrder.total) !== Number(o.total) ||
        existingOrder.status !== o.status
      ) {
        report.divergences.push(
          `Pedido ${o.id} já existe no Supabase com valores/status diferentes (mantido registro atual sem sobrescrever).`
        );
      }
    }

    const { data: existingItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', o.id);
    const existingItemSkus = new Set((existingItems || []).map((it) => it.sku));

    for (const item of o.items || []) {
      if (!existingItemSkus.has(item.sku)) {
        const mappedProdId =
          legacyToProductUuid.get(item.productId) ||
          skuToProductUuid.get(item.sku) ||
          null;

        const { error: itemErr } = await supabase.from('order_items').insert({
          id: deterministicUuid(`order_item:${o.id}:${item.sku}`),
          order_id: o.id,
          product_id: mappedProdId,
          product_name: item.productName,
          sku: item.sku,
          image: resolveMigratedImageUrl(item.image) || null,
          unit_price: Number(item.unitPrice),
          quantity: Number(item.quantity),
          is_wholesale_applied: Boolean(item.isWholesaleApplied),
          subtotal: Number(item.subtotal),
          created_at: o.createdAt || new Date().toISOString(),
        });
        if (itemErr) {
          throw new Error(`Erro ao inserir item ${item.sku} do pedido ${o.id}: ${itemErr.message}`);
        }
        existingItemSkus.add(item.sku);
        report.inserted.orderItems++;
      } else {
        report.skippedExisting.orderItems++;
      }
    }
  }

  // 8. Migrate Stock Movements (5) - preserve deleted OUR-TEST-DEL with product_id = null
  const { data: existingMovs } = await supabase.from('stock_movements').select('id');
  const existingMovIds = new Set((existingMovs || []).map((m) => m.id));

  for (const m of rawDb.stockMovements || []) {
    const movUuid = deterministicUuid(`stock_movement:${m.id}`);
    if (existingMovIds.has(movUuid)) {
      report.skippedExisting.stockMovements++;
      continue;
    }

    const mappedProdId =
      legacyToProductUuid.get(m.productId) || skuToProductUuid.get(m.sku) || null;

    const { error: movErr } = await supabase.from('stock_movements').insert({
      id: movUuid,
      product_id: mappedProdId,
      product_name: m.productName,
      sku: m.sku,
      type: m.type,
      quantity: Number(m.quantity),
      previous_stock: Number(m.previousStock),
      new_stock: Number(m.newStock),
      order_id: m.orderId || null,
      reason: m.reason || 'Movimentação histórica migrada',
      created_at: m.timestamp || new Date().toISOString(),
    });
    if (movErr) {
      throw new Error(`Erro ao inserir movimentação "${m.id}": ${movErr.message}`);
    }
    existingMovIds.add(movUuid);
    report.inserted.stockMovements++;
  }

  // 9. Migrate Plating Services (1: SB-2026-0042)
  for (const s of rawDb.bathServices || []) {
    const { data: existingService } = await supabase
      .from('plating_services')
      .select('*')
      .eq('protocol', s.protocol)
      .maybeSingle();

    if (!existingService) {
      const cleanEmail = String(s.customerEmail || '').trim().toLowerCase();
      const profileId = cleanEmail ? emailToAuthId.get(cleanEmail) || null : null;

      const { error: svcErr } = await supabase.from('plating_services').insert({
        id: deterministicUuid(`plating:${s.id}`),
        protocol: s.protocol,
        profile_id: profileId,
        customer_name: s.customerName,
        customer_phone: s.customerPhone,
        customer_email: cleanEmail,
        piece_type: s.pieceType,
        quantity: Number(s.quantity || 1),
        bath_type: s.bathType,
        observations: s.observations || null,
        photo_url: resolveMigratedImageUrl(s.photoUrl) || null,
        status: s.status,
        estimated_days: Number(s.estimatedDays || 7),
        price_quote: s.priceQuote != null ? Number(s.priceQuote) : null,
        history: Array.isArray(s.history) ? s.history : [],
        created_at: s.createdAt || new Date().toISOString(),
        updated_at: s.updatedAt || s.createdAt || new Date().toISOString(),
      });
      if (svcErr) {
        throw new Error(`Erro ao inserir serviço de banho ${s.protocol}: ${svcErr.message}`);
      }
      report.inserted.platingServices++;
    } else {
      report.skippedExisting.platingServices++;
      if (existingService.status !== s.status) {
        report.divergences.push(
          `Serviço de banho ${s.protocol} já existe no Supabase com status diferente (${existingService.status} vs ${s.status}).`
        );
      }
    }
  }

  // 10. Collect post-migration counts
  report.afterCounts = await collectTableCounts(supabase);
  report.success = true;
  return report;
}
