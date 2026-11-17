/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import type {
  Product,
  CartItem,
  UserProfile,
  Address,
  Order,
  ProductCategory,
} from './types/index.ts';
import {
  consumePendingPasswordRecovery,
  ensureSupabaseClient,
} from './lib/supabase.ts';
import { authFetch } from './lib/apiClient.ts';

// Components
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { OrderSuccessModal } from './components/OrderSuccessModal.tsx';
import { WholesaleSection } from './components/WholesaleSection.tsx';
import { BathServiceSection } from './components/BathServiceSection.tsx';
import { AboutBrandSection } from './components/AboutBrandSection.tsx';
import { CustomerAuthModal } from './components/CustomerAuthModal.tsx';
import { CustomerDashboard } from './components/CustomerDashboard.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { AiAssistantModal } from './components/AiAssistantModal.tsx';
import { ProductPhotoManagerModal } from './components/ProductPhotoManagerModal.tsx';
import { FloatingWhatsApp } from './components/FloatingWhatsApp.tsx';
import { Footer } from './components/Footer.tsx';

// Icons
import {
  Sparkles,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  Package,
  ShieldCheck,
  Trash2,
  ImagePlus,
  Lock,
  X,
} from 'lucide-react';

const CATEGORIES: ('Todos' | ProductCategory)[] = [
  'Todos',
  'Brincos',
  'Colares',
  'Pulseiras',
  'Anéis',
  'Conjuntos',
  'Tornozeleiras',
  'Pingentes',
  'Outros',
];

export default function App() {
  // Global data
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // User & Navigation state (strictly hydrated from active Supabase Auth session)
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cartHydratedForUser, setCartHydratedForUser] = useState<string | null>(null);

  // Password recovery modal (triggered via Supabase resetPasswordForEmail link)
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // Strictly enforce: Only authenticated user with role: 'admin' can access Admin view or admin catalog modals
  useEffect(() => {
    if (!isAdmin) {
      if (isAdminView) setIsAdminView(false);
      setCatalogPhotoProduct(null);
      setCatalogDeleteProduct(null);
    }
  }, [isAdmin, isAdminView]);

  // Cart & Wishlist state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ourata_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ourata_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | ProductCategory>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiProductContext, setAiProductContext] = useState<{
    name?: string;
    category?: string;
  }>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Admin-only direct catalog photo & deletion modals
  const [catalogPhotoProduct, setCatalogPhotoProduct] = useState<Product | null>(null);
  const [catalogDeleteProduct, setCatalogDeleteProduct] = useState<Product | null>(null);
  const [isDeletingCatalogProduct, setIsDeletingCatalogProduct] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('ourata_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('ourata_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ourata_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ourata_user');
    }
  }, [currentUser]);

  // Restore & observe Supabase Auth session cleanly
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const hydrateSession = async (accessToken?: string) => {
      try {
        if (!accessToken) {
          if (isMounted) {
            setCurrentUser(null);
            setCartHydratedForUser(null);
          }
          return;
        }

        const headers = { Authorization: `Bearer ${accessToken}` };
        const meRes = await fetch('/api/auth/me', { headers });
        if (!meRes.ok) {
          if (isMounted) {
            setCurrentUser(null);
            setCartHydratedForUser(null);
          }
          return;
        }

        const meData = await meRes.json();
        let resolvedUser: UserProfile | null = meData.user || null;

        // Sync pending profile from email-confirmation signup if available
        const pendingRaw = localStorage.getItem('ourata_pending_profile');
        if (resolvedUser && pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw);
            const profRes = await fetch('/api/auth/profile', {
              method: 'PUT',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify(pending),
            });
            if (profRes.ok) {
              const profData = await profRes.json();
              if (profData.user) resolvedUser = profData.user;
            }
          } catch {
            // ignore
          } finally {
            localStorage.removeItem('ourata_pending_profile');
          }
        }

        if (!isMounted || !resolvedUser) return;
        setCurrentUser(resolvedUser);

        // Merge favorites
        if (Array.isArray(resolvedUser.favorites) && resolvedUser.favorites.length > 0) {
          setWishlist((prev) => Array.from(new Set([...resolvedUser!.favorites, ...prev])));
        }

        // Hydrate cart from Supabase if local cart empty, else keep local and sync
        const cartRes = await fetch('/api/cart', { headers });
        if (cartRes.ok && isMounted) {
          const cartData = await cartRes.json();
          const hydratedItems: CartItem[] = Array.isArray(cartData.items)
            ? cartData.items
                .filter((it: any) => it?.product && Number(it?.quantity) > 0)
                .map((it: any) => ({ product: it.product, quantity: Number(it.quantity) }))
            : [];
          if (hydratedItems.length > 0) {
            setCart((prev) => (prev.length > 0 ? prev : hydratedItems));
          }
        }
        if (isMounted) {
          setCartHydratedForUser(resolvedUser.id);
        }
      } catch (err) {
        console.warn('Error hydrating auth session:', err);
      }
    };

    const initAuth = async () => {
      // Surface auth redirect errors (e.g. expired magic link) if present in URL
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);
      const urlErrDesc =
        hashParams.get('error_description') || queryParams.get('error_description');
      if (urlErrDesc) {
        showToast(urlErrDesc);
      }

      const supabase = await ensureSupabaseClient();
      if (!isMounted) return;
      if (!supabase) {
        localStorage.removeItem('ourata_user');
        return;
      }

      if (consumePendingPasswordRecovery()) {
        setPasswordRecoveryOpen(true);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (isMounted) {
        await hydrateSession(sessionData.session?.access_token);
      }

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecoveryOpen(true);
        }
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setCurrentUser(null);
            setIsAdminView(false);
            setCartHydratedForUser(null);
          }
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          hydrateSession(session?.access_token);
        }
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    };

    initAuth();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Persist logged-in user cart changes to Supabase
  useEffect(() => {
    if (!currentUser || cartHydratedForUser !== currentUser.id) return;
    const timer = setTimeout(() => {
      authFetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((it) => ({ productId: it.product.id, quantity: it.quantity })),
        }),
      }).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [cart, currentUser, cartHydratedForUser]);

  // Fetch products from server
  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'Todos' && p.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchDesc && !matchCat) return false;
      }
      // Special toggles
      if (onlyOffers && !p.isOffer) return false;
      if (onlyNew && !p.isNewRelease) return false;
      if (onlyInStock && p.stock <= 0) return false;

      return true;
    });
  }, [products, selectedCategory, searchQuery, onlyOffers, onlyNew, onlyInStock]);

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1) => {
    const available = product.stock - (product.reservedStock || 0);
    if (available <= 0) {
      showToast('Este produto está esgotado no momento.');
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(available, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      } else {
        const initialQty = Math.min(available, quantity);
        return [...prev, { product, quantity: initialQty }];
      }
    });

    showToast(`${quantity}x ${product.name} adicionado ao carrinho!`);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removido do carrinho.');
  };

  // Wishlist toggle
  const handleToggleFavorite = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const next = exists
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      showToast(exists ? 'Removido dos favoritos.' : 'Adicionado aos favoritos!');

      if (currentUser) {
        setCurrentUser((u) => (u ? { ...u, favorites: next } : null));
        authFetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favorites: next }),
        }).catch(() => {});
      }

      return next;
    });
  };

  // Direct checkout via WhatsApp
  const handleCheckout = async (checkoutData: {
    customer: {
      name: string;
      email: string;
      phone: string;
      cpf: string;
      shippingAddress: Address;
    };
    discount: number;
    shippingFee: number;
    notes: string;
  }) => {
    setIsSubmittingOrder(true);
    try {
      // Map items with pricing
      const orderItems = cart.map((it) => {
        let unitPrice = it.product.price;
        let isWholesale = false;

        if (it.product.tieredPricing && it.product.tieredPricing.length > 0) {
          const sorted = [...it.product.tieredPricing].sort((a, b) => b.minQty - a.minQty);
          for (const tier of sorted) {
            if (it.quantity >= tier.minQty) {
              unitPrice = tier.unitPrice;
              isWholesale = tier.minQty > 1;
              break;
            }
          }
        } else if (it.quantity >= it.product.minWholesaleQty) {
          unitPrice = it.product.wholesalePrice;
          isWholesale = true;
        }

        return {
          productId: it.product.id,
          productName: it.product.name,
          sku: it.product.sku,
          image: it.product.images?.[0] || '',
          unitPrice,
          quantity: it.quantity,
          isWholesaleApplied: isWholesale,
          subtotal: unitPrice * it.quantity,
        };
      });

      const res = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: checkoutData.customer,
          items: orderItems,
          discount: checkoutData.discount,
          shippingFee: checkoutData.shippingFee,
          notes: checkoutData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar pedido.');

      // Clear cart, close drawer, open success modal
      setCart([]);
      setIsCartOpen(false);
      setLastOrder(data.order);
      loadProducts(); // Refresh products to update reserved stock!
    } catch (err: any) {
      alert(`Falha no checkout: ${err.message}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Direct WhatsApp single item negotiation
  const handleDirectWhatsAppOrder = (product: Product, quantity: number) => {
    const text = `Olá! Tenho interesse na semijoia "${product.name}" (SKU: ${product.sku}). Gostaria de verificar a disponibilidade de ${quantity} unidade(s) e combinar as opções de atacado e pagamento.`;
    const url = `https://wa.me/5519988064749?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Admin-only: Remove product directly from storefront catalog
  const handleConfirmCatalogDelete = async () => {
    if (!isAdmin || !catalogDeleteProduct) return;
    setIsDeletingCatalogProduct(true);
    try {
      const res = await authFetch(`/api/products/${catalogDeleteProduct.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao remover produto do catálogo.');
      }

      const removedName = catalogDeleteProduct.name;
      setProducts((prev) => prev.filter((p) => p.id !== catalogDeleteProduct.id));
      if (detailProduct?.id === catalogDeleteProduct.id) {
        setDetailProduct(null);
      }
      if (catalogPhotoProduct?.id === catalogDeleteProduct.id) {
        setCatalogPhotoProduct(null);
      }
      setCatalogDeleteProduct(null);
      showToast(`Produto "${removedName}" removido do catálogo.`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao remover produto.');
    } finally {
      setIsDeletingCatalogProduct(false);
    }
  };

  // Smooth Navigation
  const handleNavigate = (sectionId: string) => {
    setIsAdminView(false);
    if (sectionId === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F8] text-[#221C1E]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#221C1E] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 border border-stone-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        wishlistCount={wishlist.length}
        currentUser={currentUser}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => {
          if (currentUser) {
            setIsProfileOpen(true);
          } else {
            setIsAuthOpen(true);
          }
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onToggleAdmin={() => setIsAdminView(!isAdminView)}
        isAdminView={isAdminView}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content Area */}
      {isAdminView ? (
        /* OWNER / ADMIN DASHBOARD VIEW */
        <main className="flex-1">
          <AdminPanel
            currentUser={currentUser}
            onOpenAiAssistant={(pName, cat) => {
              setAiProductContext({ name: pName, category: cat });
              setIsAiOpen(true);
            }}
            onRefreshProducts={loadProducts}
            onUpdateCurrentUser={(updated) => {
              setCurrentUser(updated);
            }}
          />
        </main>
      ) : (
        /* CUSTOMER STOREFRONT VIEW */
        <main className="flex-1 space-y-0">
          {/* Hero Section */}
          <Hero
            onExploreCatalog={() => handleNavigate('catalogo')}
            onExploreWholesale={() => handleNavigate('atacado')}
            onExploreBath={() => handleNavigate('banho')}
          />

          {/* Wholesale Value Proposition */}
          <WholesaleSection
            onExploreCatalog={() => handleNavigate('catalogo')}
          />

          {/* Product Catalog Section */}
          <section id="catalogo" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Catalog Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-[#B47B8E] font-semibold">
                  Nossas Criações
                </span>
                <h2 className="font-serif text-3xl font-bold text-[#221C1E]">
                  Catálogo de Semijoias
                </h2>
                <p className="text-xs sm:text-sm text-stone-500">
                  Preços para varejo e atacado direto de fábrica. Peças em banho de ouro 18k e ródio.
                </p>
              </div>

              {/* Quick Filters (Offers, New, In Stock) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setOnlyOffers(!onlyOffers)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                    onlyOffers
                      ? 'bg-[#FAF3F5] text-[#B47B8E] border-[#B47B8E]'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  Ofertas
                </button>
                <button
                  onClick={() => setOnlyNew(!onlyNew)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                    onlyNew
                      ? 'bg-[#FAF3F5] text-[#B47B8E] border-[#B47B8E]'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  Lançamentos
                </button>
                <button
                  onClick={() => setOnlyInStock(!onlyInStock)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                    onlyInStock
                      ? 'bg-[#FAF3F5] text-[#B47B8E] border-[#B47B8E]'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  Apenas em Estoque
                </button>
              </div>
            </div>

            {/* Admin-only Catalog Management Banner */}
            {isAdmin && (
              <div className="bg-white border border-[#E8D9DF] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-[#221C1E]">
                  <ShieldCheck className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>
                    <strong>Modo Administradora no Catálogo:</strong> clique em{' '}
                    <strong>Fotos</strong> em qualquer peça para adicionar/remover imagens ou em{' '}
                    <strong>Remover</strong> para excluir o produto.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminView(true)}
                  className="inline-flex items-center gap-1.5 bg-[#221C1E] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-amber-300" />
                  <span>Abrir Painel Completo</span>
                </button>
              </div>
            )}

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#B47B8E] text-white shadow-xs'
                        : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Products Grid */}
            {loadingProducts ? (
              <div className="py-20 text-center text-xs text-stone-400">
                Carregando catálogo de semijoias...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-dashed border-stone-300 p-8">
                <Package className="w-12 h-12 mx-auto stroke-1 text-stone-300" />
                <h3 className="font-serif text-lg font-bold text-stone-700">
                  Nenhum produto encontrado
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Tente alterar os filtros de busca ou navegar por outras categorias do catálogo.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('Todos');
                    setSearchQuery('');
                    setOnlyOffers(false);
                    setOnlyNew(false);
                    setOnlyInStock(false);
                  }}
                  className="text-xs text-[#B47B8E] font-semibold underline cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    isFavorite={wishlist.includes(prod.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onSelectProduct={(p) => setDetailProduct(p)}
                    onQuickAdd={(p) => handleAddToCart(p, 1)}
                    isAdmin={isAdmin}
                    onAdminManagePhotos={(p) => setCatalogPhotoProduct(p)}
                    onAdminRemoveProduct={(p) => setCatalogDeleteProduct(p)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Serviços de Banho Section */}
          <BathServiceSection onSuccessToast={showToast} />

          {/* Institutional / About Brand Section */}
          <AboutBrandSection />
        </main>
      )}

      {/* Floating WhatsApp on All Pages */}
      <FloatingWhatsApp />

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAddToCart={handleAddToCart}
          isFavorite={wishlist.includes(detailProduct.id)}
          onToggleFavorite={handleToggleFavorite}
          onDirectWhatsAppOrder={handleDirectWhatsAppOrder}
          isAdmin={isAdmin}
          onAdminManagePhotos={(p) => setCatalogPhotoProduct(p)}
          onAdminRemoveProduct={(p) => setCatalogDeleteProduct(p)}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={() => setCart([])}
        currentUser={currentUser}
        onCheckout={handleCheckout}
        isSubmittingOrder={isSubmittingOrder}
      />

      {/* Order Success Modal */}
      {lastOrder && (
        <OrderSuccessModal
          order={lastOrder}
          onClose={() => setLastOrder(null)}
        />
      )}

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Bem-vinda de volta, ${user.name}!`);
        }}
      />

      {/* Customer Dashboard / Profile */}
      {isProfileOpen && currentUser && (
        <CustomerDashboard
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onLogout={async () => {
            try {
              const sb = await ensureSupabaseClient();
              await sb?.auth.signOut();
            } catch {
              // ignore
            }
            localStorage.removeItem('ourata_user');
            setCurrentUser(null);
            setIsAdminView(false);
            setIsProfileOpen(false);
            showToast('Você saiu da sua conta.');
          }}
          onUpdateProfile={async (updated) => {
            try {
              const res = await authFetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
              });
              if (res.ok) {
                const data = await res.json();
                if (data.user) {
                  setCurrentUser(data.user);
                } else {
                  setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
                }
              } else {
                setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
              }
              showToast('Dados atualizados com sucesso!');
            } catch {
              showToast('Erro ao salvar alterações no servidor.');
            }
          }}
          allProducts={products}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* AI Assistant Modal for Owner */}
      <AiAssistantModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        initialProductName={aiProductContext.name}
        initialCategory={aiProductContext.category}
        onApplyToProduct={(text, field) => {
          showToast(`Conteúdo copiado! Você pode colar em ${field === 'name' ? 'Nome' : 'Descrição'}.`);
        }}
      />

      {/* Admin-only Catalog Photo Manager Modal */}
      {isAdmin && catalogPhotoProduct && (
        <ProductPhotoManagerModal
          product={catalogPhotoProduct}
          onClose={() => setCatalogPhotoProduct(null)}
          onProductUpdated={(updated) => {
            setCatalogPhotoProduct(updated);
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            if (detailProduct?.id === updated.id) {
              setDetailProduct(updated);
            }
          }}
          onRequestRemoveProduct={(prod) => {
            setCatalogPhotoProduct(null);
            setCatalogDeleteProduct(prod);
          }}
        />
      )}

      {/* Supabase Password Recovery Modal */}
      {passwordRecoveryOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8D9DF] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D9DF]">
              <div className="flex items-center gap-2 text-[#221C1E]">
                <Lock className="w-5 h-5 text-[#B47B8E]" />
                <h3 className="font-serif text-lg font-bold">Definir Nova Senha</h3>
              </div>
              <button
                onClick={() => setPasswordRecoveryOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoveryError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                {recoveryError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setRecoveryError('');
                if (recoveryPassword.length < 6) {
                  setRecoveryError('A nova senha deve ter no mínimo 6 caracteres.');
                  return;
                }
                setRecoveryLoading(true);
                try {
                  const sb = await ensureSupabaseClient();
                  if (!sb) throw new Error('Supabase Auth indisponível.');
                  const { error } = await sb.auth.updateUser({
                    password: recoveryPassword,
                  });
                  if (error) throw error;
                  setPasswordRecoveryOpen(false);
                  setRecoveryPassword('');
                  showToast('Senha redefinida com sucesso!');
                } catch (err: any) {
                  setRecoveryError(err?.message || 'Erro ao atualizar senha.');
                } finally {
                  setRecoveryLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>
              <button
                type="submit"
                disabled={recoveryLoading}
                className="w-full bg-[#B47B8E] hover:bg-[#975F72] text-white py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {recoveryLoading ? 'Salvando...' : 'Confirmar Nova Senha'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin-only Catalog Product Delete Confirmation Modal */}
      {isAdmin && catalogDeleteProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#221C1E]">
                  Remover do Catálogo?
                </h3>
                <p className="text-xs text-stone-500">
                  Ação exclusiva da administradora · exclusão permanente
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-3">
              {catalogDeleteProduct.images?.[0] ? (
                <img
                  src={catalogDeleteProduct.images[0]}
                  alt={catalogDeleteProduct.name}
                  className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-stone-200 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-stone-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#221C1E] truncate">
                  {catalogDeleteProduct.name}
                </p>
                <p className="text-[10px] text-stone-500 font-mono">
                  SKU: {catalogDeleteProduct.sku} · Estoque: {catalogDeleteProduct.stock} un
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Tem certeza que deseja remover <strong>"{catalogDeleteProduct.name}"</strong> do catálogo?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingCatalogProduct}
                onClick={() => setCatalogDeleteProduct(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingCatalogProduct}
                onClick={handleConfirmCatalogDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingCatalogProduct ? 'Removendo...' : 'Sim, Remover'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
