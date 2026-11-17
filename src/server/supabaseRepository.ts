import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Address,
  AuditLog,
  BathService,
  BathServiceHistoryEntry,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductCategory,
  StockMovement,
  TierPricing,
  UserProfile,
} from '../types/index.ts';

function normalizeAssetUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/^\/src\/assets\/images\//, '/assets/images/');
}

function mapProductRow(row: any): Product {
  const rawImages = Array.isArray(row.product_images) ? [...row.product_images] : [];
  rawImages.sort((a, b) => {
    if (Boolean(b.is_primary) !== Boolean(a.is_primary)) {
      return b.is_primary ? 1 : -1;
    }
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  const images = rawImages
    .map((im) => normalizeAssetUrl(im.image_url))
    .filter(Boolean);

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description || '',
    category: (row.category || 'Outros') as ProductCategory,
    images,
    price: Number(row.price),
    wholesalePrice: Number(row.wholesale_price),
    minWholesaleQty: Number(row.min_wholesale_qty ?? 5),
    tieredPricing: Array.isArray(row.tiered_pricing) ? (row.tiered_pricing as TierPricing[]) : [],
    stock: Number(row.stock ?? 0),
    reservedStock: Number(row.reserved_stock ?? 0),
    lowStockAlert: Number(row.low_stock_alert ?? 5),
    isFeatured: Boolean(row.is_featured),
    isNewRelease: Boolean(row.is_new_release),
    isOffer: Boolean(row.is_offer),
    platingType: row.plating_type || 'Banho Ouro 18k (10 milésimos)',
    warranty: row.warranty || '1 ano de garantia',
    minPurchaseQty: Number(row.min_purchase_qty ?? 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}

function mapOrderRow(row: any): Order {
  const rawItems = Array.isArray(row.order_items) ? row.order_items : [];
  const items: OrderItem[] = rawItems.map((it: any) => ({
    productId: it.product_id || '',
    productName: it.product_name,
    sku: it.sku,
    image: normalizeAssetUrl(it.image || ''),
    unitPrice: Number(it.unit_price),
    quantity: Number(it.quantity),
    isWholesaleApplied: Boolean(it.is_wholesale_applied),
    subtotal: Number(it.subtotal),
  }));

  return {
    id: row.id,
    customerId: row.customer_id || 'visitante',
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    customerCpf: row.customer_cpf || '',
    shippingAddress: (row.shipping_address || {}) as Address,
    items,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount ?? 0),
    shippingFee: Number(row.shipping_fee ?? 0),
    total: Number(row.total),
    isWholesaleOrder: Boolean(row.is_wholesale_order),
    status: row.status as OrderStatus,
    paymentMethodNotes:
      row.payment_method_notes || 'A combinar pelo WhatsApp (+55 19 98806-4749)',
    whatsappMessage: row.whatsapp_message || '',
    whatsappUrl: row.whatsapp_url || '',
    reservationExpiresAt: row.reservation_expires_at || undefined,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBathServiceRow(row: any): BathService {
  return {
    id: row.id,
    protocol: row.protocol,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || '',
    pieceType: row.piece_type,
    quantity: Number(row.quantity ?? 1),
    bathType: row.bath_type,
    observations: row.observations || '',
    photoUrl: normalizeAssetUrl(row.photo_url || ''),
    status: row.status,
    estimatedDays: Number(row.estimated_days ?? 7),
    priceQuote: row.price_quote != null ? Number(row.price_quote) : undefined,
    history: Array.isArray(row.history)
      ? (row.history as BathServiceHistoryEntry[])
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStockMovementRow(row: any): StockMovement {
  return {
    id: row.id,
    productId: row.product_id || '',
    productName: row.product_name,
    sku: row.sku,
    type: row.type,
    quantity: Number(row.quantity),
    previousStock: Number(row.previous_stock),
    newStock: Number(row.new_stock),
    orderId: row.order_id || undefined,
    reason: row.reason,
    timestamp: row.created_at,
  };
}

export async function fetchUserProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data: prof, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !prof) return null;

  const [{ data: addrs }, { data: favs }] = await Promise.all([
    supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('favorites').select('product_id').eq('profile_id', userId),
  ]);

  const primaryAddr = addrs?.[0];

  return {
    id: prof.id,
    name: prof.name,
    email: prof.email,
    phone: prof.phone || '',
    cpf: prof.cpf || '',
    role: prof.role === 'admin' ? 'admin' : 'customer',
    address: primaryAddr
      ? {
          cep: primaryAddr.cep,
          street: primaryAddr.street,
          number: primaryAddr.number,
          complement: primaryAddr.complement || undefined,
          neighborhood: primaryAddr.neighborhood,
          city: primaryAddr.city,
          state: primaryAddr.state,
        }
      : undefined,
    isVerified: Boolean(prof.is_verified),
    favorites: (favs || []).map((f) => f.product_id),
    createdAt: prof.created_at,
  };
}

export async function updateUserProfileData(
  supabase: SupabaseClient,
  userId: string,
  body: {
    name?: string;
    phone?: string;
    cpf?: string;
    address?: Address;
    favorites?: string[];
  }
): Promise<UserProfile> {
  const profilePatch: Record<string, any> = {};
  if (typeof body.name === 'string' && body.name.trim()) {
    profilePatch.name = body.name.trim();
  }
  if (typeof body.phone === 'string') {
    profilePatch.phone = body.phone.trim();
  }
  if (typeof body.cpf === 'string') {
    profilePatch.cpf = body.cpf.trim();
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabase
      .from('profiles')
      .update(profilePatch)
      .eq('id', userId);
    if (error) {
      throw new Error(`Erro ao atualizar perfil: ${error.message}`);
    }
  }

  if (body.address && body.address.street && body.address.number) {
    const { data: existingAddrs } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', userId)
      .order('is_default', { ascending: false })
      .limit(1);

    const addrPayload = {
      cep: (body.address.cep || '13480-000').trim(),
      street: body.address.street.trim(),
      number: body.address.number.trim(),
      complement: body.address.complement?.trim() || null,
      neighborhood: (body.address.neighborhood || 'Centro').trim(),
      city: (body.address.city || 'Limeira').trim(),
      state: (body.address.state || 'SP').trim(),
      is_default: true,
    };

    if (existingAddrs && existingAddrs.length > 0) {
      const { error: addrErr } = await supabase
        .from('addresses')
        .update(addrPayload)
        .eq('id', existingAddrs[0].id);
      if (addrErr) throw new Error(`Erro ao atualizar endereço: ${addrErr.message}`);
    } else {
      const { error: addrErr } = await supabase.from('addresses').insert({
        profile_id: userId,
        ...addrPayload,
      });
      if (addrErr) throw new Error(`Erro ao cadastrar endereço: ${addrErr.message}`);
    }
  }

  if (Array.isArray(body.favorites)) {
    const cleanFavIds = Array.from(
      new Set(body.favorites.filter((f) => typeof f === 'string' && f.trim()))
    );
    const { error: delFavErr } = await supabase
      .from('favorites')
      .delete()
      .eq('profile_id', userId);
    if (delFavErr) {
      throw new Error(`Erro ao sincronizar favoritos: ${delFavErr.message}`);
    }
    if (cleanFavIds.length > 0) {
      const { error: insFavErr } = await supabase.from('favorites').insert(
        cleanFavIds.map((pid) => ({
          profile_id: userId,
          product_id: pid,
        }))
      );
      if (insFavErr) {
        throw new Error(`Erro ao salvar favoritos: ${insFavErr.message}`);
      }
    }
  }

  const updated = await fetchUserProfileById(supabase, userId);
  if (!updated) {
    throw new Error('Perfil não encontrado após atualização.');
  }
  return updated;
}

export async function fetchCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchProducts(
  supabase: SupabaseClient,
  filters?: { category?: string; search?: string; offer?: string }
): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*, product_images(id, image_url, display_order, is_primary)')
    .order('created_at', { ascending: false });

  if (filters?.category && filters.category !== 'Todos') {
    query = query.eq('category', filters.category);
  }
  if (filters?.offer === 'true') {
    query = query.eq('is_offer', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let results = (data || []).map(mapProductRow);

  if (filters?.search) {
    const q = String(filters.search).toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  return results;
}

export async function fetchProductById(
  supabase: SupabaseClient,
  id: string
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(id, image_url, display_order, is_primary)')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProductRow(data);
}

export async function isStorageImageReferenced(
  supabase: SupabaseClient,
  url: string
): Promise<boolean> {
  const [{ count: prodImgCount }, { count: orderImgCount }, { count: bathImgCount }] =
    await Promise.all([
      supabase
        .from('product_images')
        .select('id', { count: 'exact', head: true })
        .eq('image_url', url),
      supabase
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('image', url),
      supabase
        .from('plating_services')
        .select('id', { count: 'exact', head: true })
        .eq('photo_url', url),
    ]);

  return (prodImgCount ?? 0) + (orderImgCount ?? 0) + (bathImgCount ?? 0) > 0;
}

export async function deleteOrphanStorageImageIfUnused(
  supabase: SupabaseClient,
  imageUrl: string
) {
  const marker = '/storage/v1/object/public/product-images/';
  if (!imageUrl || !imageUrl.includes(marker)) return;

  const stillUsed = await isStorageImageReferenced(supabase, imageUrl);
  if (stillUsed) return;

  const storagePath = decodeURIComponent(imageUrl.split(marker)[1] || '');
  if (!storagePath) return;

  // Never delete shared original seed images under catalog/<original>.jpg unless guaranteed unreferenced
  await supabase.storage.from('product-images').remove([storagePath]);
}

export async function uploadImageToStorage(
  supabase: SupabaseClient,
  dataUrl: string,
  fileName?: string
): Promise<string> {
  const matches = dataUrl.match(
    /^data:(image\/(jpeg|jpg|png|webp|avif));base64,([A-Za-z0-9+/=]+)$/i
  );
  if (!matches) {
    throw new Error('Formato de imagem inválido. Envie arquivos JPG, PNG, WEBP ou AVIF.');
  }

  const mimeType =
    matches[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : matches[1].toLowerCase();
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
  const buffer = Buffer.from(matches[3], 'base64');

  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error('A imagem ultrapassa o limite máximo de 5 MB.');
  }

  const safeBase =
    (fileName || 'semijoia')
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .slice(0, 40) || 'semijoia';

  const uniqueName = `${safeBase}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const storagePath = `catalog/${uniqueName}`;

  const { error: uploadErr } = await supabase.storage
    .from('product-images')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Falha no upload para Supabase Storage: ${uploadErr.message}`);
  }

  const { data: pubData } = supabase.storage
    .from('product-images')
    .getPublicUrl(storagePath);

  if (!pubData?.publicUrl) {
    throw new Error('Não foi possível obter a URL pública da imagem no Storage.');
  }

  return pubData.publicUrl;
}

export async function createProductInSupabase(
  supabase: SupabaseClient,
  body: any
): Promise<Product> {
  const sku = String(body.sku || '').trim().toUpperCase();
  const name = String(body.name || '').trim();
  const price = Number(body.price);

  if (!name || !sku || Number.isNaN(price) || price < 0) {
    throw new Error('Nome, SKU e Preço válido são obrigatórios.');
  }

  const { data: existingSku } = await supabase
    .from('products')
    .select('id')
    .eq('sku', sku)
    .maybeSingle();

  if (existingSku) {
    throw new Error(`Já existe um produto com o SKU ${sku}`);
  }

  const categoryName = String(body.category || 'Outros');
  const { data: catRow } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .maybeSingle();

  const wholesalePrice = Number(body.wholesalePrice ?? price * 0.6);
  const initialStock = Math.max(0, Math.floor(Number(body.stock ?? 0)));
  const productId = crypto.randomUUID();

  const { error: insertErr } = await supabase.from('products').insert({
    id: productId,
    sku,
    name,
    description: String(body.description || ''),
    category: categoryName,
    category_id: catRow?.id || null,
    price,
    wholesale_price: wholesalePrice,
    min_wholesale_qty: Math.max(1, Number(body.minWholesaleQty || 5)),
    tiered_pricing: Array.isArray(body.tieredPricing)
      ? body.tieredPricing
      : [
          { minQty: 1, unitPrice: price },
          { minQty: 5, unitPrice: wholesalePrice },
        ],
    stock: initialStock,
    reserved_stock: 0,
    low_stock_alert: Math.max(0, Number(body.lowStockAlert ?? 5)),
    is_featured: Boolean(body.isFeatured),
    is_new_release: Boolean(body.isNewRelease),
    is_offer: Boolean(body.isOffer),
    plating_type: body.platingType || 'Banho Ouro 18k (10 milésimos)',
    warranty: body.warranty || '1 ano de garantia',
    min_purchase_qty: Math.max(1, Number(body.minPurchaseQty || 1)),
  });

  if (insertErr) {
    throw new Error(`Erro ao criar produto: ${insertErr.message}`);
  }

  const rawImages: string[] =
    Array.isArray(body.images) && body.images.length > 0
      ? body.images.map(normalizeAssetUrl).filter(Boolean)
      : ['/assets/images/earrings_gold_zirconia_1794270256870.jpg'];

  if (rawImages.length > 0) {
    const { error: imgErr } = await supabase.from('product_images').insert(
      rawImages.map((url, idx) => ({
        product_id: productId,
        image_url: url,
        display_order: idx,
        is_primary: idx === 0,
      }))
    );
    if (imgErr) {
      throw new Error(`Produto criado, mas falhou ao registrar fotos: ${imgErr.message}`);
    }
  }

  if (initialStock > 0) {
    await supabase.from('stock_movements').insert({
      product_id: productId,
      product_name: name,
      sku,
      type: 'ENTRADA',
      quantity: initialStock,
      previous_stock: 0,
      new_stock: initialStock,
      reason: 'Cadastro inicial de produto',
    });
  }

  const created = await fetchProductById(supabase, productId);
  if (!created) throw new Error('Falha ao carregar produto recém-criado.');
  return created;
}

export async function updateProductInSupabase(
  supabase: SupabaseClient,
  id: string,
  body: any
): Promise<Product> {
  const existing = await fetchProductById(supabase, id);
  if (!existing) {
    throw new Error('NOT_FOUND:Produto não encontrado.');
  }

  if (body.stock != null && Number(body.stock) !== existing.stock) {
    const newStockVal = Math.floor(Number(body.stock));
    const { error: rpcErr } = await supabase.rpc('adjust_product_stock', {
      p_product_id: id,
      p_new_stock: newStockVal,
      p_reason: body.stockChangeReason || 'Ajuste manual de estoque no painel',
    });
    if (rpcErr) {
      throw new Error(rpcErr.message);
    }
  }

  const patch: Record<string, any> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.description !== undefined) patch.description = String(body.description);
  if (body.sku !== undefined) patch.sku = String(body.sku).trim().toUpperCase();
  if (body.category !== undefined) {
    patch.category = String(body.category);
    const { data: catRow } = await supabase
      .from('categories')
      .select('id')
      .eq('name', patch.category)
      .maybeSingle();
    if (catRow?.id) patch.category_id = catRow.id;
  }
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.wholesalePrice !== undefined) patch.wholesale_price = Number(body.wholesalePrice);
  if (body.minWholesaleQty !== undefined) patch.min_wholesale_qty = Number(body.minWholesaleQty);
  if (body.tieredPricing !== undefined) patch.tiered_pricing = body.tieredPricing;
  if (body.lowStockAlert !== undefined) patch.low_stock_alert = Number(body.lowStockAlert);
  if (body.isFeatured !== undefined) patch.is_featured = Boolean(body.isFeatured);
  if (body.isNewRelease !== undefined) patch.is_new_release = Boolean(body.isNewRelease);
  if (body.isOffer !== undefined) patch.is_offer = Boolean(body.isOffer);
  if (body.platingType !== undefined) patch.plating_type = String(body.platingType);
  if (body.warranty !== undefined) patch.warranty = String(body.warranty);
  if (body.minPurchaseQty !== undefined) patch.min_purchase_qty = Number(body.minPurchaseQty);

  if (Object.keys(patch).length > 0) {
    const { error: updErr } = await supabase.from('products').update(patch).eq('id', id);
    if (updErr) {
      throw new Error(`Erro ao atualizar produto: ${updErr.message}`);
    }
  }

  if (Array.isArray(body.images)) {
    const nextImages = Array.from(
      new Set(body.images.map(normalizeAssetUrl).filter(Boolean))
    ) as string[];

    const { data: oldImgs } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', id);

    const { error: delImgErr } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id);
    if (delImgErr) throw new Error(delImgErr.message);

    if (nextImages.length > 0) {
      const { error: insImgErr } = await supabase.from('product_images').insert(
        nextImages.map((url, idx) => ({
          product_id: id,
          image_url: url,
          display_order: idx,
          is_primary: idx === 0,
        }))
      );
      if (insImgErr) throw new Error(insImgErr.message);
    }

    for (const old of oldImgs || []) {
      if (!nextImages.includes(old.image_url)) {
        await deleteOrphanStorageImageIfUnused(supabase, old.image_url);
      }
    }
  }

  const updated = await fetchProductById(supabase, id);
  if (!updated) throw new Error('Produto não encontrado após atualização.');
  return updated;
}

export async function deleteProductInSupabase(
  supabase: SupabaseClient,
  id: string
): Promise<{ removedId: string; name: string; sku: string }> {
  const existing = await fetchProductById(supabase, id);
  if (!existing) {
    throw new Error('NOT_FOUND:Produto não encontrado.');
  }

  const { data: rawImgs } = await supabase
    .from('product_images')
    .select('image_url')
    .eq('product_id', id);

  const { error: delErr } = await supabase.from('products').delete().eq('id', id);
  if (delErr) {
    throw new Error(`Erro ao remover produto: ${delErr.message}`);
  }

  for (const img of rawImgs || []) {
    await deleteOrphanStorageImageIfUnused(supabase, img.image_url);
  }

  return { removedId: id, name: existing.name, sku: existing.sku };
}

export async function addProductImageInSupabase(
  supabase: SupabaseClient,
  productId: string,
  imageUrl: string,
  asPrimary: boolean
): Promise<Product> {
  const existing = await fetchProductById(supabase, productId);
  if (!existing) {
    throw new Error('NOT_FOUND:Produto não encontrado.');
  }

  const { data: rows } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('display_order', { ascending: true });

  const currentList = (rows || []).map((r) => r.image_url).filter((u) => u !== imageUrl);
  if (asPrimary) {
    currentList.unshift(imageUrl);
  } else {
    currentList.push(imageUrl);
  }

  await supabase.from('product_images').delete().eq('product_id', productId);
  const { error: insErr } = await supabase.from('product_images').insert(
    currentList.map((url, idx) => ({
      product_id: productId,
      image_url: url,
      display_order: idx,
      is_primary: idx === 0,
    }))
  );
  if (insErr) throw new Error(insErr.message);

  await supabase
    .from('products')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', productId);

  const updated = await fetchProductById(supabase, productId);
  if (!updated) throw new Error('Produto não encontrado após adicionar foto.');
  return updated;
}

export async function setPrimaryProductImageInSupabase(
  supabase: SupabaseClient,
  productId: string,
  params: { imageUrl?: string; index?: number }
): Promise<Product> {
  const existing = await fetchProductById(supabase, productId);
  if (!existing) {
    throw new Error('NOT_FOUND:Produto não encontrado.');
  }

  const currentImages = [...existing.images];
  const targetIdx =
    typeof params.index === 'number'
      ? params.index
      : currentImages.indexOf(params.imageUrl || '');

  if (targetIdx < 0 || targetIdx >= currentImages.length) {
    throw new Error('Foto não encontrada neste produto.');
  }

  const [selected] = currentImages.splice(targetIdx, 1);
  currentImages.unshift(selected);

  await supabase.from('product_images').delete().eq('product_id', productId);
  const { error: insErr } = await supabase.from('product_images').insert(
    currentImages.map((url, idx) => ({
      product_id: productId,
      image_url: url,
      display_order: idx,
      is_primary: idx === 0,
    }))
  );
  if (insErr) throw new Error(insErr.message);

  await supabase
    .from('products')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', productId);

  const updated = await fetchProductById(supabase, productId);
  if (!updated) throw new Error('Produto não encontrado.');
  return updated;
}

export async function removeProductImageInSupabase(
  supabase: SupabaseClient,
  productId: string,
  params: { imageUrl?: string; index?: number }
): Promise<{ product: Product; removedUrl: string }> {
  const existing = await fetchProductById(supabase, productId);
  if (!existing) {
    throw new Error('NOT_FOUND:Produto não encontrado.');
  }

  const currentImages = [...existing.images];
  let removedUrl = '';

  if (typeof params.index === 'number' && params.index >= 0 && params.index < currentImages.length) {
    removedUrl = currentImages.splice(params.index, 1)[0];
  } else if (typeof params.imageUrl === 'string' && params.imageUrl.trim()) {
    const idx = currentImages.indexOf(params.imageUrl.trim());
    if (idx !== -1) {
      removedUrl = currentImages.splice(idx, 1)[0];
    }
  }

  if (!removedUrl) {
    throw new Error('NOT_FOUND:Foto não encontrada para remoção.');
  }

  await supabase.from('product_images').delete().eq('product_id', productId);
  if (currentImages.length > 0) {
    const { error: insErr } = await supabase.from('product_images').insert(
      currentImages.map((url, idx) => ({
        product_id: productId,
        image_url: url,
        display_order: idx,
        is_primary: idx === 0,
      }))
    );
    if (insErr) throw new Error(insErr.message);
  }

  await supabase
    .from('products')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', productId);

  await deleteOrphanStorageImageIfUnused(supabase, removedUrl);

  const updated = await fetchProductById(supabase, productId);
  if (!updated) throw new Error('Produto não encontrado.');
  return { product: updated, removedUrl };
}

export async function fetchOrdersFromSupabase(
  supabase: SupabaseClient,
  filters?: { customerId?: string; status?: string }
): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(mapOrderRow);
}

export async function fetchOrderByIdFromSupabase(
  supabase: SupabaseClient,
  orderId: string
): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) return null;
  return mapOrderRow(data);
}

export async function createOrderWithRpc(
  supabase: SupabaseClient,
  params: {
    authenticatedUser: UserProfile | null;
    customer: {
      name: string;
      email: string;
      phone: string;
      cpf?: string;
      shippingAddress: Address;
    };
    items: Array<{ productId: string; quantity: number }>;
    requestedDiscount?: number;
    requestedShippingFee?: number;
    notes?: string;
  }
): Promise<{ order: Order; whatsappUrl: string }> {
  const { authenticatedUser, customer, items, notes } = params;

  // Fetch authoritative catalog rows to build official WhatsApp message & compute shipping threshold
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const { data: prodRows, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds);

  if (prodErr) throw new Error(prodErr.message);
  const prodMap = new Map((prodRows || []).map((p) => [p.id, p]));

  let authoritativeSubtotal = 0;
  const lineSummaries: string[] = [];

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity));
    const prod = prodMap.get(item.productId);
    if (!prod || qty <= 0) {
      throw new Error('Produto inválido ou quantidade menor que 1.');
    }

    let unitPrice = Number(prod.price);
    if (qty >= Number(prod.min_wholesale_qty ?? 5)) {
      unitPrice = Number(prod.wholesale_price);
    }
    if (Array.isArray(prod.tiered_pricing) && prod.tiered_pricing.length > 0) {
      const sorted = [...prod.tiered_pricing].sort((a: any, b: any) => b.minQty - a.minQty);
      for (const tier of sorted) {
        if (qty >= Number(tier.minQty)) {
          unitPrice = Number(tier.unitPrice);
          break;
        }
      }
    }

    const lineSubtotal = Math.round(unitPrice * qty * 100) / 100;
    authoritativeSubtotal += lineSubtotal;
    lineSummaries.push(
      `• ${qty}x ${prod.name} (SKU: ${prod.sku}) - R$ ${lineSubtotal.toFixed(2).replace('.', ',')}`
    );
  }

  // Server-authoritative discount and shipping fee calculation
  const isAdmin = authenticatedUser?.role === 'admin';
  const effectiveDiscount = isAdmin ? Math.max(0, Number(params.requestedDiscount || 0)) : 0;
  const effectiveShippingFee = isAdmin && params.requestedShippingFee != null
    ? Math.max(0, Number(params.requestedShippingFee))
    : authoritativeSubtotal >= 300 || authoritativeSubtotal === 0
    ? 0
    : 20.0;

  const expectedTotal = Math.max(
    0,
    Math.round((authoritativeSubtotal - effectiveDiscount + effectiveShippingFee) * 100) / 100
  );

  // Generate sequential unique order code OUR-YYYY-XXXX
  const year = new Date().getFullYear();
  const { data: existingIds } = await supabase
    .from('orders')
    .select('id')
    .like('id', `OUR-${year}-%`);

  let maxSeq = 1046;
  for (const row of existingIds || []) {
    const numPart = Number(String(row.id).split('-').pop());
    if (!Number.isNaN(numPart) && numPart > maxSeq) {
      maxSeq = numPart;
    }
  }
  const orderId = `OUR-${year}-${maxSeq + 1}`;

  const addr = customer.shippingAddress;
  const formattedAddress = addr
    ? `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}, ${
        addr.neighborhood || 'Centro'
      }, ${addr.city}/${addr.state} - CEP: ${addr.cep}`
    : 'Retirada no ateliê / A combinar';

  const whatsappMessage = `Olá! Tudo bem? Sou cliente da Ourata Semijoias e acabei de realizar um pedido pelo site.

Número do pedido: ${orderId}

Nome: ${customer.name}

Produtos:
${lineSummaries.join('\n')}

Subtotal: R$ ${authoritativeSubtotal.toFixed(2).replace('.', ',')}

Desconto: R$ ${effectiveDiscount.toFixed(2).replace('.', ',')}

Frete: ${effectiveShippingFee === 0 ? 'Grátis' : `R$ ${effectiveShippingFee.toFixed(2).replace('.', ',')}`}

Total do pedido: R$ ${expectedTotal.toFixed(2).replace('.', ',')}

Endereço de entrega: ${formattedAddress}

Gostaria de combinar a forma de pagamento e confirmar minha compra.

Aguardo seu retorno! Obrigada.`;

  const whatsappUrl = `https://wa.me/5519988064749?text=${encodeURIComponent(whatsappMessage)}`;

  const { error: rpcErr } = await supabase.rpc('create_order_secure', {
    p_order_id: orderId,
    p_customer_id: authenticatedUser?.id || null,
    p_customer_name: customer.name.trim(),
    p_customer_email: (customer.email || '').trim().toLowerCase(),
    p_customer_phone: customer.phone.trim(),
    p_customer_cpf: customer.cpf?.trim() || null,
    p_shipping_address: addr || {},
    p_items: items.map((it) => ({
      product_id: it.productId,
      quantity: Math.floor(Number(it.quantity)),
    })),
    p_discount: effectiveDiscount,
    p_shipping_fee: effectiveShippingFee,
    p_notes: notes || null,
    p_whatsapp_message: whatsappMessage,
    p_whatsapp_url: whatsappUrl,
  });

  if (rpcErr) {
    throw new Error(rpcErr.message);
  }

  const createdOrder = await fetchOrderByIdFromSupabase(supabase, orderId);
  if (!createdOrder) {
    throw new Error('Pedido registrado, mas não foi possível carregá-lo.');
  }

  return { order: createdOrder, whatsappUrl };
}

export async function updateOrderStatusWithRpc(
  supabase: SupabaseClient,
  orderId: string,
  status: OrderStatus,
  notes?: string
): Promise<Order> {
  const existing = await fetchOrderByIdFromSupabase(supabase, orderId);
  if (!existing) {
    throw new Error('NOT_FOUND:Pedido não encontrado.');
  }

  if (existing.status === status) {
    return existing;
  }

  if (status === 'PEDIDO CANCELADO') {
    const { error } = await supabase.rpc('cancel_order_and_release_stock', {
      p_order_id: orderId,
      p_reason: notes || `Cancelamento do pedido ${orderId} pela administradora`,
    });
    if (error) throw new Error(error.message);
  } else if (
    existing.status === 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO' &&
    (status === 'PAGAMENTO CONFIRMADO' ||
      status === 'PEDIDO EM SEPARAÇÃO' ||
      status === 'PEDIDO ENVIADO' ||
      status === 'PEDIDO ENTREGUE')
  ) {
    const { error } = await supabase.rpc('confirm_order_payment_and_stock', {
      p_order_id: orderId,
      p_notes: notes || null,
    });
    if (error) throw new Error(error.message);

    if (status !== 'PAGAMENTO CONFIRMADO') {
      const { error: updErr } = await supabase
        .from('orders')
        .update({ status, notes: notes ?? existing.notes })
        .eq('id', orderId);
      if (updErr) throw new Error(updErr.message);
    }
  } else {
    const patch: Record<string, any> = { status };
    if (notes !== undefined) patch.notes = notes;
    const { error: updErr } = await supabase.from('orders').update(patch).eq('id', orderId);
    if (updErr) throw new Error(updErr.message);
  }

  const updated = await fetchOrderByIdFromSupabase(supabase, orderId);
  if (!updated) throw new Error('Pedido não encontrado após atualização.');
  return updated;
}

export async function fetchBathServicesFromSupabase(
  supabase: SupabaseClient,
  filters?: { protocol?: string; email?: string; profileId?: string }
): Promise<BathService[]> {
  let query = supabase
    .from('plating_services')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.protocol) {
    query = query.ilike('protocol', `%${filters.protocol.trim()}%`);
  }
  if (filters?.email) {
    query = query.ilike('customer_email', filters.email.trim());
  }
  if (filters?.profileId) {
    query = query.eq('profile_id', filters.profileId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(mapBathServiceRow);
}

export async function createBathServiceInSupabase(
  supabase: SupabaseClient,
  body: any,
  authenticatedUserId?: string | null
): Promise<BathService> {
  const customerName = String(body.customerName || '').trim();
  const customerPhone = String(body.customerPhone || '').trim();
  const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
  const pieceType = String(body.pieceType || '').trim();
  const bathType = String(body.bathType || '').trim();

  if (!customerName || !customerPhone || !pieceType || !bathType) {
    throw new Error('Nome, telefone, tipo de peça e banho desejado são obrigatórios.');
  }

  const year = new Date().getFullYear();
  const { data: existingProtocols } = await supabase
    .from('plating_services')
    .select('protocol')
    .like('protocol', `SB-${year}-%`);

  let maxSeq = 42;
  for (const row of existingProtocols || []) {
    const seq = Number(String(row.protocol).split('-').pop());
    if (!Number.isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }
  const protocol = `SB-${year}-${String(maxSeq + 1).padStart(4, '0')}`;

  const initialHistory: BathServiceHistoryEntry[] = [
    {
      status: 'Solicitação recebida',
      date: new Date().toISOString(),
      notes: 'Protocolo gerado online pelo cliente.',
    },
  ];

  const { data, error } = await supabase
    .from('plating_services')
    .insert({
      protocol,
      profile_id: authenticatedUserId || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      piece_type: pieceType,
      quantity: Math.max(1, Number(body.quantity || 1)),
      bath_type: bathType,
      observations: body.observations || '',
      photo_url: normalizeAssetUrl(body.photoUrl || '') || null,
      status: 'Solicitação recebida',
      estimated_days: 7,
      price_quote: null,
      history: initialHistory,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar protocolo de banho: ${error?.message}`);
  }

  return mapBathServiceRow(data);
}

export async function updateBathServiceInSupabase(
  supabase: SupabaseClient,
  id: string,
  body: any
): Promise<BathService> {
  const { data: existing, error: fetchErr } = await supabase
    .from('plating_services')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error('NOT_FOUND:Serviço de banho não encontrado.');
  }

  const nextHistory: BathServiceHistoryEntry[] = Array.isArray(existing.history)
    ? [...existing.history]
    : [];

  const nextStatus = body.status || existing.status;
  if (body.status && body.status !== existing.status) {
    nextHistory.push({
      status: body.status,
      date: new Date().toISOString(),
      notes: body.notes || undefined,
    });
  }

  const patch: Record<string, any> = {
    status: nextStatus,
    history: nextHistory,
  };
  if (body.priceQuote !== undefined) patch.price_quote = Number(body.priceQuote);
  if (body.estimatedDays !== undefined) patch.estimated_days = Number(body.estimatedDays);
  if (body.notes !== undefined && body.notes !== '') patch.observations = String(body.notes);

  const { data: updated, error: updErr } = await supabase
    .from('plating_services')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (updErr || !updated) {
    throw new Error(`Erro ao atualizar serviço de banho: ${updErr?.message}`);
  }

  return mapBathServiceRow(updated);
}

export async function fetchStockMovementsFromSupabase(
  supabase: SupabaseClient
): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data || []).map(mapStockMovementRow);
}

export async function fetchRealAuditLogsFromSupabase(
  supabase: SupabaseClient
): Promise<AuditLog[]> {
  const [movementsRes, ordersRes, bathRes] = await Promise.all([
    supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('orders')
      .select('id, customer_name, total, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('plating_services')
      .select('id, protocol, customer_name, piece_type, quantity, bath_type, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const events: AuditLog[] = [];

  for (const m of movementsRes.data || []) {
    events.push({
      id: `mov-${m.id}`,
      action: `ESTOQUE_${m.type}`,
      user: m.type === 'RESERVA' ? 'Sistema / Pedido' : 'Administração / Estoque',
      details: `${m.product_name} (${m.sku}): ${m.quantity} un. (${m.previous_stock} → ${m.new_stock}) — ${m.reason}`,
      timestamp: m.created_at,
    });
  }

  for (const o of ordersRes.data || []) {
    events.push({
      id: `ord-${o.id}`,
      action: `PEDIDO_${o.status.replace(/\s+/g, '_')}`,
      user: o.customer_name,
      details: `Pedido ${o.id} — R$ ${Number(o.total).toFixed(2)} (${o.status})`,
      timestamp: o.updated_at || o.created_at,
    });
  }

  for (const s of bathRes.data || []) {
    events.push({
      id: `bath-${s.id}`,
      action: 'SERVICO_BANHO',
      user: s.customer_name,
      details: `Protocolo ${s.protocol} — ${s.quantity} un. de ${s.piece_type} (${s.bath_type}) • Status: ${s.status}`,
      timestamp: s.updated_at || s.created_at,
    });
  }

  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return events.slice(0, 60);
}

export async function fetchAdminDashboardFromSupabase(supabase: SupabaseClient) {
  // Best-effort release of expired payment reservations
  try {
    await supabase.rpc('release_expired_order_reservations');
  } catch {
    // Non-fatal if no expired orders
  }

  const [products, orders, bathServices, movements, customersRes] = await Promise.all([
    fetchProducts(supabase),
    fetchOrdersFromSupabase(supabase),
    fetchBathServicesFromSupabase(supabase),
    fetchStockMovementsFromSupabase(supabase),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'customer'),
  ]);

  const confirmedOrders = orders.filter(
    (o) =>
      o.status === 'PAGAMENTO CONFIRMADO' ||
      o.status === 'PEDIDO EM SEPARAÇÃO' ||
      o.status === 'PEDIDO ENVIADO' ||
      o.status === 'PEDIDO ENTREGUE'
  );
  const totalConfirmedRevenue = confirmedOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(
    (o) => o.status === 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO'
  );
  const pendingRevenue = pendingOrders.reduce((sum, o) => sum + o.total, 0);

  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAlert);
  const outOfStockProducts = products.filter((p) => p.stock <= 0);

  const itemCounts: Record<string, { product: Product; totalQuantity: number }> = {};
  for (const o of confirmedOrders) {
    for (const it of o.items) {
      if (!itemCounts[it.productId]) {
        const prod = products.find((p) => p.id === it.productId);
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

  return {
    kpis: {
      totalSales: orders.length,
      totalConfirmedRevenue,
      pendingOrdersCount: pendingOrders.length,
      pendingRevenue,
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      totalCustomers: customersRes.count ?? 0,
      activeBathServices: bathServices.filter((s) => s.status !== 'Devolvido').length,
    },
    lowStockProducts,
    outOfStockProducts,
    bestSellers,
    recentOrders: orders.slice(0, 8),
    recentMovements: movements.slice(0, 8),
  };
}

export async function fetchCustomerCart(
  supabase: SupabaseClient,
  profileId: string
): Promise<Array<{ productId: string; quantity: number; product?: Product }>> {
  const { data: cartRow } = await supabase
    .from('carts')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!cartRow) return [];

  const { data: items } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('cart_id', cartRow.id);

  if (!items || items.length === 0) return [];

  const allProducts = await fetchProducts(supabase);
  const byId = new Map(allProducts.map((p) => [p.id, p]));

  return items
    .map((it) => ({
      productId: it.product_id,
      quantity: Number(it.quantity),
      product: byId.get(it.product_id),
    }))
    .filter((it) => Boolean(it.product));
}

export async function syncCustomerCart(
  supabase: SupabaseClient,
  profileId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<Array<{ productId: string; quantity: number; product?: Product }>> {
  let { data: cartRow } = await supabase
    .from('carts')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!cartRow) {
    const { data: createdCart, error: cartErr } = await supabase
      .from('carts')
      .insert({ profile_id: profileId })
      .select('id')
      .single();
    if (cartErr || !createdCart) {
      throw new Error(`Erro ao criar carrinho do cliente: ${cartErr?.message}`);
    }
    cartRow = createdCart;
  }

  await supabase.from('cart_items').delete().eq('cart_id', cartRow.id);

  const validItems = items
    .filter((i) => i.productId && Number(i.quantity) >= 1)
    .map((i) => ({
      cart_id: cartRow!.id,
      product_id: i.productId,
      quantity: Math.floor(Number(i.quantity)),
    }));

  if (validItems.length > 0) {
    const { error: insErr } = await supabase.from('cart_items').insert(validItems);
    if (insErr) {
      throw new Error(`Erro ao atualizar itens do carrinho: ${insErr.message}`);
    }
  }

  return fetchCustomerCart(supabase, profileId);
}
