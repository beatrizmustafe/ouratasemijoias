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

  // User & Navigation state
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ourata_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

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
      if (exists) {
        showToast('Removido dos favoritos.');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Adicionado aos favoritos!');
        return [...prev, productId];
      }
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

      const res = await fetch('/api/orders', {
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

      // If user is not logged in, auto-save customer profile
      if (!currentUser) {
        setCurrentUser({
          id: data.order.customerId,
          name: checkoutData.customer.name,
          email: checkoutData.customer.email,
          phone: checkoutData.customer.phone,
          cpf: checkoutData.customer.cpf,
          role: 'customer',
          address: checkoutData.customer.shippingAddress,
          isVerified: true,
          favorites: wishlist,
          createdAt: new Date().toISOString(),
        });
      }
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
      const res = await fetch(`/api/products/${catalogDeleteProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': currentUser!.id,
        },
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
          onLogout={() => {
            setCurrentUser(null);
            setIsProfileOpen(false);
            showToast('Você saiu da sua conta.');
          }}
          onUpdateProfile={(updated) => {
            setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
            showToast('Dados atualizados com sucesso!');
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
        adminId={currentUser?.id || 'admin-01'}
        onApplyToProduct={(text, field) => {
          showToast(`Conteúdo copiado! Você pode colar em ${field === 'name' ? 'Nome' : 'Descrição'}.`);
        }}
      />

      {/* Admin-only Catalog Photo Manager Modal */}
      {isAdmin && catalogPhotoProduct && (
        <ProductPhotoManagerModal
          product={catalogPhotoProduct}
          adminId={currentUser!.id}
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
