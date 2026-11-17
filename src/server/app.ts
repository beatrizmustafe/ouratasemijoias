import express from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  checkSupabaseStatus,
  getSupabasePublicServerClient,
  getSupabaseServiceAdmin,
  verifySupabaseJwt,
} from '../lib/supabaseServer.ts';
import {
  addProductImageInSupabase,
  createBathServiceInSupabase,
  createOrderWithRpc,
  createProductInSupabase,
  deleteProductInSupabase,
  fetchAdminDashboardFromSupabase,
  fetchBathServicesFromSupabase,
  fetchCategories,
  fetchCustomerCart,
  fetchOrderByIdFromSupabase,
  fetchOrdersFromSupabase,
  fetchProductById,
  fetchProducts,
  fetchRealAuditLogsFromSupabase,
  fetchStockMovementsFromSupabase,
  fetchUserProfileById,
  removeProductImageInSupabase,
  setPrimaryProductImageInSupabase,
  syncCustomerCart,
  updateBathServiceInSupabase,
  updateOrderStatusWithRpc,
  updateProductInSupabase,
  updateUserProfileData,
  uploadImageToStorage,
} from './supabaseRepository.ts';
import type { OrderStatus, UserProfile } from '../types/index.ts';

declare global {
  namespace Express {
    interface Request {
      authUser?: UserProfile | null;
      authToken?: string;
    }
  }
}

const isServerless = Boolean(
  process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
);

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

function extractBearerToken(req: express.Request): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function resolveOptionalUser(req: express.Request): Promise<UserProfile | null> {
  if (req.authUser !== undefined) {
    return req.authUser;
  }

  const token = extractBearerToken(req);
  if (!token) {
    req.authUser = null;
    return null;
  }

  const { user, error } = await verifySupabaseJwt(token);
  if (error || !user) {
    req.authUser = null;
    return null;
  }

  const supabase = getSupabaseServiceAdmin();
  if (!supabase) {
    req.authUser = null;
    return null;
  }

  const profile = await fetchUserProfileById(supabase, user.id);
  req.authUser = profile;
  req.authToken = token;
  return profile;
}

async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({
        error: 'Autenticação necessária. Faça login para continuar.',
      });
      return;
    }

    const { user, error } = await verifySupabaseJwt(token);
    if (error || !user) {
      res.status(401).json({
        error: 'Sessão inválida ou expirada. Faça login novamente.',
      });
      return;
    }

    const supabase = getSupabaseServiceAdmin();
    if (!supabase) {
      res.status(503).json({
        error: 'Serviço de banco de dados indisponível (SUPABASE_SECRET_KEY ausente).',
      });
      return;
    }

    const profile = await fetchUserProfileById(supabase, user.id);
    if (!profile) {
      res.status(401).json({
        error: 'Perfil de usuário não encontrado no banco de dados.',
      });
      return;
    }

    req.authUser = profile;
    req.authToken = token;
    next();
  } catch (err: any) {
    res.status(401).json({ error: err?.message || 'Falha na autenticação.' });
  }
}

async function requireAdminJwt(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  await requireAuth(req, res, () => {
    if (!req.authUser || req.authUser.role !== 'admin') {
      res.status(403).json({
        error:
          'Acesso negado. Apenas a proprietária/administradora autenticada da Ourata Semijoias possui permissão para esta ação.',
      });
      return;
    }
    next();
  });
}

function getSupabaseOrFail(res: express.Response) {
  const supabase = getSupabaseServiceAdmin();
  if (!supabase) {
    res.status(503).json({
      error: 'Configuração do servidor Supabase incompleta (SUPABASE_SECRET_KEY).',
    });
    return null;
  }
  return supabase;
}

function handleRouteError(res: express.Response, err: any, fallbackStatus = 400) {
  const msg = String(err?.message || 'Erro interno no servidor.');
  if (msg.startsWith('NOT_FOUND:')) {
    res.status(404).json({ error: msg.replace('NOT_FOUND:', '') });
    return;
  }
  res.status(fallbackStatus).json({ error: msg });
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Normalize Netlify Function path (/.netlify/functions/api/* -> /api/*)
  app.use((req, _res, next) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace(/^\/\.netlify\/functions\/api/, '/api') || '/api';
    }
    next();
  });

  // 1. Health & Supabase Status
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      store: 'Ourata Semijoias',
      whatsapp: '5519988064749',
      runtime: isServerless ? 'netlify-functions' : 'node-express',
      database: 'supabase-postgresql',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/supabase/status', async (_req, res) => {
    const status = await checkSupabaseStatus();
    res.status(status.isConnected ? 200 : 503).json(status);
  });

  // 1c. Authenticated Session Profile & Cart Sync
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.authUser });
  });

  app.put('/api/auth/profile', requireAuth, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase || !req.authUser) return;

    try {
      const { name, phone, cpf, address, favorites } = req.body || {};
      const updated = await updateUserProfileData(supabase, req.authUser.id, {
        name,
        phone,
        cpf,
        address,
        favorites,
      });
      res.json({ user: updated });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  app.get('/api/cart', requireAuth, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase || !req.authUser) return;

    try {
      const items = await fetchCustomerCart(supabase, req.authUser.id);
      res.json({ items });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.put('/api/cart', requireAuth, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase || !req.authUser) return;

    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const synced = await syncCustomerCart(supabase, req.authUser.id, items);
      res.json({ items: synced });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  // 2. Categories & Products Catalog
  app.get('/api/categories', async (_req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const categories = await fetchCategories(supabase);
      res.json({ categories });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.get('/api/products', async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const { category, search, offer } = req.query;
      const products = await fetchProducts(supabase, {
        category: category ? String(category) : undefined,
        search: search ? String(search) : undefined,
        offer: offer ? String(offer) : undefined,
      });
      res.json({ products });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const product = await fetchProductById(supabase, req.params.id);
      if (!product) {
        res.status(404).json({ error: 'Produto não encontrado.' });
        return;
      }
      res.json({ product });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.post('/api/products', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const product = await createProductInSupabase(supabase, req.body || {});
      res.status(201).json({ product });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/products/:id', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const product = await updateProductInSupabase(supabase, req.params.id, req.body || {});
      res.json({ product });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  app.delete('/api/products/:id', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const result = await deleteProductInSupabase(supabase, req.params.id);
      res.json({ success: true, removedId: result.removedId });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  // 2b. Supabase Storage Images (Admin JWT only)
  app.post('/api/admin/upload-image', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const { dataUrl, fileName } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string') {
        res.status(400).json({ error: 'Arquivo de imagem é obrigatório.' });
        return;
      }
      const url = await uploadImageToStorage(supabase, dataUrl, fileName);
      res.status(201).json({ url });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  app.post('/api/products/:id/images', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const { imageUrl, dataUrl, fileName, asPrimary } = req.body || {};
      let finalUrl =
        typeof imageUrl === 'string'
          ? imageUrl.trim().replace(/^\/src\/assets\/images\//, '/assets/images/')
          : '';

      if (dataUrl && typeof dataUrl === 'string') {
        finalUrl = await uploadImageToStorage(supabase, dataUrl, fileName);
      }

      if (!finalUrl) {
        res.status(400).json({
          error: 'Informe uma URL válida ou envie uma foto do dispositivo.',
        });
        return;
      }

      const product = await addProductImageInSupabase(
        supabase,
        req.params.id,
        finalUrl,
        Boolean(asPrimary)
      );
      res.json({ product, imageUrl: finalUrl });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/products/:id/images/primary', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const { imageUrl, index } = req.body || {};
      const product = await setPrimaryProductImageInSupabase(supabase, req.params.id, {
        imageUrl,
        index,
      });
      res.json({ product });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  app.delete('/api/products/:id/images', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const { imageUrl, index } = req.body || {};
      const result = await removeProductImageInSupabase(supabase, req.params.id, {
        imageUrl,
        index,
      });
      res.json(result);
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  // 3. Orders & Transactional Stock Reservation (RPCs)
  app.get('/api/orders', requireAuth, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase || !req.authUser) return;

    try {
      const { customerId, status } = req.query;
      const effectiveCustomerId =
        req.authUser.role === 'admin'
          ? customerId
            ? String(customerId)
            : undefined
          : req.authUser.id;

      const orders = await fetchOrdersFromSupabase(supabase, {
        customerId: effectiveCustomerId,
        status: status ? String(status) : undefined,
      });
      res.json({ orders });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.get('/api/orders/:id', requireAuth, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase || !req.authUser) return;

    try {
      const order = await fetchOrderByIdFromSupabase(supabase, req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      if (req.authUser.role !== 'admin' && order.customerId !== req.authUser.id) {
        res.status(403).json({ error: 'Acesso negado a este pedido.' });
        return;
      }
      res.json({ order });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.post('/api/orders', async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const authUser = await resolveOptionalUser(req);
      const { customer, items, shippingFee, discount, notes } = req.body || {};

      if (!customer || !customer.name || !customer.phone) {
        res.status(400).json({ error: 'Dados do cliente são obrigatórios.' });
        return;
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'O carrinho está vazio.' });
        return;
      }

      const result = await createOrderWithRpc(supabase, {
        authenticatedUser: authUser,
        customer,
        items: items.map((i: any) => ({
          productId: String(i.productId),
          quantity: Number(i.quantity),
        })),
        requestedDiscount: discount,
        requestedShippingFee: shippingFee,
        notes,
      });

      res.status(201).json(result);
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/orders/:id/status', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const { status, notes } = req.body || {};
      if (!status) {
        res.status(400).json({ error: 'Novo status do pedido é obrigatório.' });
        return;
      }
      const order = await updateOrderStatusWithRpc(
        supabase,
        req.params.id,
        status as OrderStatus,
        notes
      );
      res.json({ order });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  // 4. Bath Services (Serviços de Banho)
  app.get('/api/bath-services', async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const protocol = req.query.protocol ? String(req.query.protocol).trim() : '';

      // Protocol tracking lookup is available to customers tracking their protocol code
      if (protocol) {
        const bathServices = await fetchBathServicesFromSupabase(supabase, { protocol });
        res.json({ bathServices });
        return;
      }

      const authUser = await resolveOptionalUser(req);
      if (!authUser) {
        res.status(401).json({
          error: 'Informe um protocolo para consulta ou faça login para listar serviços.',
        });
        return;
      }

      if (authUser.role === 'admin') {
        const bathServices = await fetchBathServicesFromSupabase(supabase);
        res.json({ bathServices });
        return;
      }

      const bathServices = await fetchBathServicesFromSupabase(supabase, {
        profileId: authUser.id,
      });
      res.json({ bathServices });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.post('/api/bath-services', async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const authUser = await resolveOptionalUser(req);
      const bathService = await createBathServiceInSupabase(
        supabase,
        req.body || {},
        authUser?.id || null
      );
      res.status(201).json({ bathService });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/bath-services/:id', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const bathService = await updateBathServiceInSupabase(
        supabase,
        req.params.id,
        req.body || {}
      );
      res.json({ bathService });
    } catch (err: any) {
      handleRouteError(res, err);
    }
  });

  // 5. Stock Movements, Real Audit Events & Admin Dashboard (Admin JWT only)
  app.get('/api/stock/history', requireAdminJwt, async (_req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const movements = await fetchStockMovementsFromSupabase(supabase);
      res.json({ movements });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.get('/api/admin/audit-logs', requireAdminJwt, async (_req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const logs = await fetchRealAuditLogsFromSupabase(supabase);
      res.json({ logs });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  app.get('/api/admin/dashboard', requireAdminJwt, async (_req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase) return;

    try {
      const dashboard = await fetchAdminDashboardFromSupabase(supabase);
      res.json(dashboard);
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  // 6. Admin Credentials Management (Supabase Auth + Profiles, never plaintext)
  app.put('/api/admin/credentials', requireAdminJwt, async (req, res) => {
    const supabase = getSupabaseOrFail(res);
    if (!supabase || !req.authUser) return;

    try {
      const { name, email, phone, currentPassword, newPassword } = req.body || {};

      if (newPassword) {
        if (!currentPassword) {
          res.status(400).json({
            error: 'Digite a senha atual da administradora para alterá-la.',
          });
          return;
        }
        if (String(newPassword).trim().length < 6) {
          res.status(400).json({
            error: 'A nova senha deve ter no mínimo 6 caracteres.',
          });
          return;
        }

        const verifier = getSupabasePublicServerClient();
        if (!verifier) {
          res.status(503).json({ error: 'Cliente Auth não configurado.' });
          return;
        }

        const { error: checkErr } = await verifier.auth.signInWithPassword({
          email: req.authUser.email,
          password: String(currentPassword),
        });
        if (checkErr) {
          res.status(400).json({
            error: 'Senha atual incorreta. Verifique e tente novamente.',
          });
          return;
        }

        const { error: passUpdErr } = await supabase.auth.admin.updateUserById(
          req.authUser.id,
          { password: String(newPassword).trim() }
        );
        if (passUpdErr) {
          res.status(400).json({ error: passUpdErr.message });
          return;
        }
      }

      const cleanEmail = email ? String(email).trim().toLowerCase() : req.authUser.email;
      if (cleanEmail !== req.authUser.email) {
        const { error: emailAuthErr } = await supabase.auth.admin.updateUserById(
          req.authUser.id,
          { email: cleanEmail, email_confirm: true }
        );
        if (emailAuthErr) {
          res.status(400).json({ error: emailAuthErr.message });
          return;
        }
      }

      const profilePatch: Record<string, any> = {};
      if (name) profilePatch.name = String(name).trim();
      if (phone) profilePatch.phone = String(phone).trim();
      if (cleanEmail !== req.authUser.email) profilePatch.email = cleanEmail;

      if (Object.keys(profilePatch).length > 0) {
        const { error: profErr } = await supabase
          .from('profiles')
          .update(profilePatch)
          .eq('id', req.authUser.id);
        if (profErr) {
          res.status(400).json({ error: profErr.message });
          return;
        }
      }

      const updatedUser = await fetchUserProfileById(supabase, req.authUser.id);
      res.json({
        user: updatedUser,
        message: 'Dados e credenciais da administradora atualizados com segurança no Supabase Auth!',
      });
    } catch (err: any) {
      handleRouteError(res, err, 500);
    }
  });

  // 7. Gemini AI Copywriter & Marketing Assistant (Admin JWT only + GEMINI_API_KEY)
  app.post('/api/ai/generate', requireAdminJwt, async (req, res) => {
    try {
      const { mode, productName, category, details, prompt, existingText } = req.body || {};

      const brandSystemInstruction =
        'Você é a estrategista e redatora de luxo da OURATA SEMIJOIAS (Limeira - SP). A marca é referência em semijoias finas, com banho nobre de 10 milésimos de ouro 18k e ródio, dupla camada de verniz diamond hipoalergênico (100% níquel free), acabamento de alta joalheria, garantia de 1 ano, vendas no varejo e atacado para revendedoras com suporte direto pelo WhatsApp (+55 19 98806-4749). Seu tom é extremamente elegante, sofisticado, envolvente, poético e focado em encantar e converter sem soar genérico. Nunca invente marcas concorrentes. Responda em português impecável.';

      let userPrompt = '';
      const userNote = (prompt || details || '').trim();
      const targetProduct = (productName || 'Semijoia Ourata').trim();
      const targetCategory = (category || 'Semijoias').trim();

      switch (mode) {
        case 'description':
          userPrompt = `Crie uma descrição comercial profissional e encantadora para a seguinte peça da OURATA SEMIJOIAS:
Produto: ${targetProduct}
Categoria: ${targetCategory}
${userNote ? `Observações específicas da proprietária: ${userNote}` : ''}

Estruture a resposta de forma elegante com:
1. Título de destaque curto e envolvente
2. Parágrafo principal de apresentação sensorial e luxuosa
3. Lista técnica com diferenciais (Banho Ouro 18k 10 milésimos / Ródio, Verniz Diamond antialérgico, garantia de 1 ano)
4. Sugestão sutil de uso/ocasião.`;
          break;

        case 'title':
          userPrompt = `Crie 6 opções de títulos comerciais altamente sofisticados e desejáveis (de alta joalheria) para um produto ou coleção da OURATA SEMIJOIAS:
Referência atual: ${targetProduct}
Categoria: ${targetCategory}
${userNote ? `Direcionamento desejado: ${userNote}` : ''}

Apresente as 6 opções numeradas, sendo 3 com tom clássico/atemporal e 3 com tom contemporâneo/luxuoso.`;
          break;

        case 'instagram':
          userPrompt = `Crie uma legenda completa e envolvente para postagem no Instagram (Feed e Reels) da OURATA SEMIJOIAS:
Produto / Tema: ${targetProduct}
Categoria: ${targetCategory}
${userNote ? `Instruções adicionais: ${userNote}` : ''}

Inclua:
- Primeira linha magnética (gancho que prende a atenção)
- Corpo do texto poético sobre elegância, banho nobre e qualidade
- Chamada elegante para compras no varejo e atacado pelo WhatsApp +55 19 98806-4749
- 10 hashtags estratégicas para semijoias finas e Limeira.`;
          break;

        case 'promo':
          userPrompt = `Elabore um texto promocional altamente persuasivo para vendas da OURATA SEMIJOIAS (adequado para varejo ou revendedoras no atacado):
Peça / Oferta: ${targetProduct}
Categoria: ${targetCategory}
${userNote ? `Detalhes da promoção/condição: ${userNote}` : ''}

Crie 2 versões prontas para copiar:
1. Versão curta para WhatsApp (com destaque para lucro na revenda ou exclusividade no varejo)
2. Versão detalhada para campanha/banner de lançamento.`;
          break;

        case 'campaign':
          userPrompt = `Crie um planejamento completo de campanha de divulgação para a OURATA SEMIJOIAS:
Tema/Produto: ${targetProduct}
Categoria: ${targetCategory}
${userNote ? `Objetivo da campanha: ${userNote}` : ''}

Inclua:
1. Nome e Slogan da Campanha
2. Conceito central e público-alvo (consumidor final e revendedoras de semijoias)
3. Cronograma prático de 3 dias de divulgação (Stories, Reels e Feed)
4. Script pronto de abordagem VIP para Lista de Transmissão no WhatsApp.`;
          break;

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
        console.warn(
          'Primary model failed, trying fallback model gemini-3.5-flash-lite:',
          primaryErr?.message
        );
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

  return app;
}
