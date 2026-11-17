import React, { useState, useEffect } from 'react';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Users,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  FileText,
  MessageCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  History,
  X,
  ExternalLink,
  Instagram,
  Megaphone,
  Type,
  Wand2,
  ImagePlus,
  Upload,
  Star,
  Image as ImageIcon,
} from 'lucide-react';
import type {
  Product,
  Order,
  BathService,
  StockMovement,
  OrderStatus,
  BathServiceStatus,
  ProductCategory,
  UserProfile,
} from '../types/index.ts';
import { generateOrderPdf, generateBathServicePdf } from '../utils/pdfGenerator.ts';
import { ProductPhotoManagerModal } from './ProductPhotoManagerModal.tsx';

interface AdminPanelProps {
  currentUser?: UserProfile | null;
  onOpenAiAssistant: (productName?: string, category?: string) => void;
  onRefreshProducts: () => void;
  onUpdateCurrentUser?: (user: UserProfile) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onOpenAiAssistant,
  onRefreshProducts,
  onUpdateCurrentUser,
}) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'orders' | 'bath' | 'stock' | 'audit' | 'security' | 'ai'
  >('dashboard');

  // Admin security settings state
  const [adminName, setAdminName] = useState(currentUser?.name || 'Diana — Dona da Loja');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || '');
  const [adminPhone, setAdminPhone] = useState(currentUser?.phone || '(19) 98806-4749');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bathServices, setBathServices] = useState<BathService[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Request headers helper strictly authenticating single admin
  const adminHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'x-admin-id': currentUser?.id || 'admin-01',
  };

  // Filters & searches
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('todos');
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [photoModalProduct, setPhotoModalProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showActionToast = (message: string, type: 'success' | 'error' = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => setActionToast(null), 3500);
  };

  // Stock quick adjust modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);
  const [stockReason, setStockReason] = useState<string>('Recebimento de novo lote do ateliê');

  // Product Form state
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Brincos');
  const [formPrice, setFormPrice] = useState<number>(89.9);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(49.9);
  const [formStock, setFormStock] = useState<number>(20);
  const [formLowStockAlert, setFormLowStockAlert] = useState<number>(5);
  const [formPlating, setFormPlating] = useState('Banho Ouro 18k (10 milésimos) + Verniz Diamond');
  const [formImages, setFormImages] = useState<string[]>([
    '/src/assets/images/earrings_gold_zirconia_1794270256870.jpg',
  ]);
  const [formNewImageUrl, setFormNewImageUrl] = useState('');
  const [uploadingFormImage, setUploadingFormImage] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [dashRes, prodRes, ordRes, bathRes, movRes, logRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers: adminHeaders }).then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/orders').then((r) => r.json()),
        fetch('/api/bath-services').then((r) => r.json()),
        fetch('/api/stock/history').then((r) => r.json()),
        fetch('/api/admin/audit-logs', { headers: adminHeaders }).then((r) => r.json()),
      ]);

      setDashboardData(dashRes);
      setProducts(prodRes.products || []);
      setOrders(ordRes.orders || []);
      setBathServices(bathRes.bathServices || []);
      setStockMovements(movRes.movements || []);
      setAuditLogs(logRes.logs || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setFormSku(`OUR-NEW-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormDesc('');
    setFormCategory('Brincos');
    setFormPrice(89.9);
    setFormWholesalePrice(49.9);
    setFormStock(20);
    setFormLowStockAlert(5);
    setFormPlating('Banho Ouro 18k (10 milésimos) + Verniz Diamond');
    setFormImages(['/src/assets/images/earrings_gold_zirconia_1794270256870.jpg']);
    setFormNewImageUrl('');
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormSku(prod.sku);
    setFormName(prod.name);
    setFormDesc(prod.description);
    setFormCategory(prod.category);
    setFormPrice(prod.price);
    setFormWholesalePrice(prod.wholesalePrice);
    setFormStock(prod.stock);
    setFormLowStockAlert(prod.lowStockAlert);
    setFormPlating(prod.platingType || 'Banho Ouro 18k (10 milésimos)');
    setFormImages(Array.isArray(prod.images) ? [...prod.images] : []);
    setFormNewImageUrl('');
    setProductModalOpen(true);
  };

  const handleUploadFormImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadingFormImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(fileList)) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`O arquivo "${file.name}" não é uma imagem válida.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`A imagem "${file.name}" ultrapassa o limite de 5 MB.`);
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error(`Erro ao ler "${file.name}".`));
          reader.readAsDataURL(file);
        });
        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ dataUrl, fileName: file.name }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao enviar foto.');
        }
        uploadedUrls.push(data.url);
      }
      setFormImages((prev) => [...prev, ...uploadedUrls]);
      showActionToast(
        uploadedUrls.length === 1
          ? 'Foto carregada com sucesso!'
          : `${uploadedUrls.length} fotos carregadas com sucesso!`
      );
    } catch (err: any) {
      showActionToast(err?.message || 'Erro ao carregar foto.', 'error');
    } finally {
      setUploadingFormImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      sku: formSku,
      name: formName,
      description: formDesc,
      category: formCategory,
      price: Number(formPrice),
      wholesalePrice: Number(formWholesalePrice),
      minWholesaleQty: 5,
      tieredPricing: [
        { minQty: 1, unitPrice: Number(formPrice) },
        { minQty: 5, unitPrice: Number(formWholesalePrice) },
        { minQty: 10, unitPrice: Number(formWholesalePrice * 0.88) },
        { minQty: 30, unitPrice: Number(formWholesalePrice * 0.78) },
      ],
      stock: Number(formStock),
      lowStockAlert: Number(formLowStockAlert),
      platingType: formPlating,
      images: formImages,
    };

    try {
      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: adminHeaders,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Erro ao salvar modificações.');
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Erro ao cadastrar produto.');
        }
      }

      setProductModalOpen(false);
      showActionToast(editingProduct ? 'Produto atualizado!' : 'Semijoia cadastrada no catálogo!');
      fetchAllData();
      onRefreshProducts();
    } catch (err: any) {
      showActionToast(err.message, 'error');
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao remover produto do catálogo.');
      }

      // Optimistic update of local list
      const deletedName = productToDelete.name;
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setProductModalOpen(false);
      setProductToDelete(null);
      showActionToast(`Semijoia "${deletedName}" removida com sucesso.`);
      fetchAllData();
      onRefreshProducts();
    } catch (err: any) {
      showActionToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Stock adjustment
  const handleQuickStockSave = async () => {
    if (!adjustModalProduct) return;
    try {
      await fetch(`/api/products/${adjustModalProduct.id}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          stock: Number(newStockVal),
          stockChangeReason: stockReason,
        }),
      });
      setAdjustModalProduct(null);
      fetchAllData();
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Change order status with real transactional stock mechanics
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      fetchAllData();
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Change Bath Service status
  const handleUpdateBathStatus = async (
    id: string,
    status: BathServiceStatus,
    notes?: string
  ) => {
    try {
      await fetch(`/api/bath-services/${id}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ status, notes }),
      });
      fetchAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Admin Security & Credentials
  const handleSaveAdminSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSecurity(true);
    setSecurityError('');
    setSecuritySuccess('');

    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          name: adminName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim(),
          currentPassword: currentPassword ? currentPassword.trim() : undefined,
          newPassword: newPassword ? newPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar credenciais.');
      }

      setSecuritySuccess('Credenciais da Administradora atualizadas com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      if (data.user && onUpdateCurrentUser) {
        onUpdateCurrentUser(data.user);
      }
      fetchAllData();
    } catch (err: any) {
      setSecurityError(err.message);
    } finally {
      setSavingSecurity(false);
    }
  };

  // Filtered lists
  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const filteredOrders = orders.filter((o) => {
    const matchStatus =
      orderStatusFilter === 'todos' || o.status === orderStatusFilter;
    const q = orderSearch.toLowerCase();
    const matchSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F8] py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8D9DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B47B8E] mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Área Administrativa Restrita</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#221C1E]">
            Painel de Gestão da Proprietária
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Controle de produtos, estoque em tempo real, pedidos WhatsApp, serviços de banho e IA comercial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenAiAssistant()}
            className="inline-flex items-center gap-2 bg-[#B47B8E] hover:bg-[#975F72] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Assistente de IA Ourata</span>
          </button>

          <button
            onClick={handleOpenCreateProduct}
            className="inline-flex items-center gap-2 bg-[#221C1E] hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8D9DF]">
        {[
          { id: 'dashboard', label: 'Dashboard & Indicadores', icon: TrendingUp },
          { id: 'orders', label: `Pedidos WhatsApp (${orders.length})`, icon: ShoppingBag },
          { id: 'products', label: `Catálogo & Preços (${products.length})`, icon: Package },
          { id: 'bath', label: `Serviços de Banho (${bathServices.length})`, icon: Sparkles },
          { id: 'stock', label: 'Histórico de Estoque', icon: History },
          { id: 'audit', label: 'Logs de Auditoria', icon: Shield },
          { id: 'security', label: 'Segurança & Administradora', icon: ShieldCheck },
          { id: 'ai', label: 'Assistente de IA', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-[#B47B8E] shadow-sm border border-[#E8D9DF]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. DASHBOARD TAB */}
      {activeTab === 'dashboard' && dashboardData && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Faturamento Confirmado
              </span>
              <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                R$ {dashboardData.kpis.totalConfirmedRevenue.toFixed(2).replace('.', ',')}
              </div>
              <span className="text-[10px] text-stone-500">
                Pagamentos validados pela proprietária
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Aguardando Pagamento
              </span>
              <div className="text-2xl font-bold text-amber-700 tabular-nums">
                R$ {dashboardData.kpis.pendingRevenue.toFixed(2).replace('.', ',')}
              </div>
              <span className="text-[10px] text-stone-500">
                {dashboardData.kpis.pendingOrdersCount} pedidos em negociação
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Total de Pedidos
              </span>
              <div className="text-2xl font-bold text-[#221C1E] tabular-nums">
                {dashboardData.kpis.totalSales}
              </div>
              <span className="text-[10px] text-stone-500">
                Registrados no banco de dados
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Alertas de Estoque
              </span>
              <div className="text-2xl font-bold text-rose-700 tabular-nums">
                {dashboardData.kpis.lowStockCount + dashboardData.kpis.outOfStockCount}
              </div>
              <span className="text-[10px] text-stone-500">
                {dashboardData.kpis.outOfStockCount} esgotados • {dashboardData.kpis.lowStockCount} baixos
              </span>
            </div>
          </div>

          {/* 2-Column Split: Left Stock Alerts & Best Sellers, Right Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Alerts & Best Sellers */}
            <div className="lg:col-span-5 space-y-6">
              {/* Stock Alerts Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-[#221C1E] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Atenção ao Estoque</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="text-xs text-[#B47B8E] hover:underline font-semibold cursor-pointer"
                  >
                    Ver todos
                  </button>
                </div>

                {dashboardData.lowStockProducts.length === 0 &&
                dashboardData.outOfStockProducts.length === 0 ? (
                  <p className="text-xs text-stone-500">Todos os produtos com estoque saudável.</p>
                ) : (
                  <div className="divide-y divide-stone-100 text-xs">
                    {dashboardData.outOfStockProducts.map((p: Product) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <strong className="text-rose-700 block truncate max-w-[200px]">
                            {p.name}
                          </strong>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {p.sku}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Esgotado (0 un)
                        </span>
                      </div>
                    ))}
                    {dashboardData.lowStockProducts.map((p: Product) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <strong className="text-stone-800 block truncate max-w-[200px]">
                            {p.name}
                          </strong>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {p.sku}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {p.stock} un. restantes
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Best Sellers */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-3">
                <h3 className="font-serif text-base font-bold text-[#221C1E] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B47B8E]" />
                  <span>Produtos Mais Vendidos</span>
                </h3>
                {dashboardData.bestSellers && dashboardData.bestSellers.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {dashboardData.bestSellers.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                        <div className="truncate max-w-[220px]">
                          <span className="font-semibold text-stone-800">
                            {item.product.name}
                          </span>
                        </div>
                        <span className="font-bold text-[#B47B8E] tabular-nums">
                          {item.totalQuantity} un. vendidas
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">Nenhuma venda consolidada ainda.</p>
                )}
              </div>
            </div>

            {/* Right: Recent Orders Activity */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#221C1E] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#B47B8E]" />
                  <span>Últimos Pedidos Recebidos</span>
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-[#B47B8E] hover:underline font-semibold cursor-pointer"
                >
                  Gerenciar todos ({orders.length})
                </button>
              </div>

              <div className="divide-y divide-stone-100">
                {orders.slice(0, 6).map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#B47B8E]">{ord.id}</span>
                        <span className="font-semibold text-[#221C1E]">{ord.customerName}</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {ord.items.length} produto(s) • Total: <strong>R$ {ord.total.toFixed(2).replace('.', ',')}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        ord.status === 'PAGAMENTO CONFIRMADO'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : ord.status === 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {ord.status}
                      </span>
                      <button
                        onClick={() => generateOrderPdf(ord)}
                        className="p-1.5 text-stone-500 hover:text-[#B47B8E] rounded hover:bg-stone-100"
                        title="Baixar PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#221C1E]">
                Gerenciamento de Pedidos WhatsApp
              </h2>
              <p className="text-xs text-stone-500">
                Confirme pagamentos para efetivar saída de estoque ou altere status do envio.
              </p>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:border-[#B47B8E] cursor-pointer"
              >
                <option value="todos">Todos os Status</option>
                <option value="AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO">Aguardando Pagamento</option>
                <option value="PAGAMENTO CONFIRMADO">Pagamento Confirmado</option>
                <option value="PEDIDO EM SEPARAÇÃO">Em Separação</option>
                <option value="PEDIDO ENVIADO">Enviado</option>
                <option value="PEDIDO ENTREGUE">Entregue</option>
                <option value="PEDIDO CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F8] border-b border-[#E8D9DF] text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3">Pedido</th>
                  <th className="p-3">Cliente / Contato</th>
                  <th className="p-3">Itens</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status Atual</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#B47B8E] whitespace-nowrap">
                      {ord.id}
                      <span className="block text-[10px] text-stone-400 font-sans font-normal">
                        {new Date(ord.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-[#221C1E]">{ord.customerName}</div>
                      <div className="text-[11px] text-stone-500">{ord.customerPhone}</div>
                      <div className="text-[10px] text-stone-400">{ord.customerEmail}</div>
                    </td>

                    <td className="p-3">
                      <div className="max-w-xs space-y-0.5">
                        {ord.items.map((it, i) => (
                          <div key={i} className="text-[11px] text-stone-600 truncate">
                            {it.quantity}x {it.productName} ({it.sku})
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="p-3 font-bold text-[#221C1E] tabular-nums whitespace-nowrap">
                      R$ {ord.total.toFixed(2).replace('.', ',')}
                      {ord.isWholesaleOrder && (
                        <span className="block text-[9px] text-[#B47B8E] uppercase tracking-wider">
                          Atacado
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)
                        }
                        className={`text-[11px] font-semibold p-1.5 rounded-lg border focus:outline-none cursor-pointer ${
                          ord.status === 'PAGAMENTO CONFIRMADO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : ord.status === 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                            : ord.status === 'PEDIDO CANCELADO'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-stone-50 text-stone-700 border-stone-300'
                        }`}
                      >
                        <option value="AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO">
                          Aguardando Pagamento
                        </option>
                        <option value="PAGAMENTO CONFIRMADO">Pagamento Confirmado (Efetivar Saída)</option>
                        <option value="PEDIDO EM SEPARAÇÃO">Em Separação</option>
                        <option value="PEDIDO ENVIADO">Enviado</option>
                        <option value="PEDIDO ENTREGUE">Entregue</option>
                        <option value="PEDIDO CANCELADO">Cancelado (Liberar Reserva)</option>
                      </select>
                    </td>

                    <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => generateOrderPdf(ord)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#B47B8E] hover:text-[#975F72] bg-[#FAF7F8] hover:bg-[#F7EFF2] px-2.5 py-1.5 rounded-lg border border-[#E8D9DF] font-semibold cursor-pointer"
                        title="Baixar Comprovante PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      <a
                        href={ord.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#25D366] hover:text-[#20BD5A] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-semibold"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#221C1E]">
                Catálogo de Produtos & Controle de Estoque
              </h2>
              <p className="text-xs text-stone-500">
                Gerencie preços de varejo, tabelas de atacado, fotos e níveis de estoque.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Filtrar por nome ou SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E] w-52 sm:w-64"
              />

              <button
                onClick={handleOpenCreateProduct}
                className="bg-[#B47B8E] hover:bg-[#975F72] text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Novo Produto
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F8] border-b border-[#E8D9DF] text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3">Foto & SKU</th>
                  <th className="p-3">Nome / Categoria</th>
                  <th className="p-3">Varejo</th>
                  <th className="p-3">Atacado</th>
                  <th className="p-3">Estoque Físico / Reservado</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((p) => {
                  const available = p.stock - (p.reservedStock || 0);
                  const isLow = p.stock > 0 && p.stock <= p.lowStockAlert;
                  const isZero = p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-stone-100 shrink-0 border border-stone-200 flex items-center justify-center text-stone-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <span className="font-mono text-stone-500 font-semibold block">{p.sku}</span>
                          <span className="text-[10px] text-stone-400">
                            {p.images?.length || 0} {(p.images?.length || 0) === 1 ? 'foto' : 'fotos'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-[#221C1E] block font-serif">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-[#B47B8E] uppercase tracking-wider font-semibold">
                          {p.category}
                        </span>
                      </td>

                      <td className="p-3 font-semibold tabular-nums text-stone-900">
                        R$ {p.price.toFixed(2).replace('.', ',')}
                      </td>

                      <td className="p-3 font-bold tabular-nums text-[#B47B8E]">
                        R$ {p.wholesalePrice.toFixed(2).replace('.', ',')}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold tabular-nums ${
                              isZero
                                ? 'text-rose-700'
                                : isLow
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {p.stock} un.
                          </span>
                          {p.reservedStock > 0 && (
                            <span className="text-[10px] text-stone-400">
                              ({p.reservedStock} reservadas)
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setAdjustModalProduct(p);
                            setNewStockVal(p.stock);
                          }}
                          className="text-[10px] text-[#B47B8E] hover:underline font-semibold mt-0.5 block cursor-pointer"
                        >
                          Ajustar Estoque
                        </button>
                      </td>

                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setPhotoModalProduct(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#B47B8E] hover:text-[#975F72] bg-[#FAF3F5] hover:bg-[#EFE3E7] rounded-lg border border-[#E8D9DF] cursor-pointer transition-colors"
                          title="Adicionar ou remover fotos deste produto"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>Fotos ({p.images?.length || 0})</span>
                        </button>

                        <button
                          onClick={() => onOpenAiAssistant(p.name, p.category)}
                          className="p-1.5 text-stone-400 hover:text-amber-600 rounded hover:bg-stone-100 cursor-pointer"
                          title="Gerar textos com IA para este produto"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 text-stone-500 hover:text-[#B47B8E] rounded hover:bg-stone-100 cursor-pointer"
                          title="Editar Produto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setProductToDelete(p)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-stone-100 cursor-pointer transition-colors"
                          title="Excluir Produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BATH SERVICES TAB */}
      {activeTab === 'bath' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#221C1E]">
                Gestão dos Serviços de Banho
              </h2>
              <p className="text-xs text-stone-500">
                Acompanhe o processo de galvanoplastia, atualize etapas e emita comprovantes em PDF.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F8] border-b border-[#E8D9DF] text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3">Protocolo</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Peça / Qtd</th>
                  <th className="p-3">Tipo de Banho</th>
                  <th className="p-3">Status do Processo</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bathServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#B47B8E]">
                      {srv.protocol}
                      <span className="block text-[10px] text-stone-400 font-sans font-normal">
                        {new Date(srv.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-[#221C1E]">{srv.customerName}</div>
                      <div className="text-[11px] text-stone-500">{srv.customerPhone}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-stone-800">{srv.pieceType}</div>
                      <div className="text-[11px] text-stone-500">{srv.quantity} unidade(s)</div>
                    </td>

                    <td className="p-3 text-stone-700 font-medium">{srv.bathType}</td>

                    <td className="p-3">
                      <select
                        value={srv.status}
                        onChange={(e) =>
                          handleUpdateBathStatus(srv.id, e.target.value as BathServiceStatus)
                        }
                        className="text-xs p-1.5 rounded-lg border border-stone-300 bg-stone-50 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="Solicitação recebida">Solicitação recebida</option>
                        <option value="Aguardando recebimento">Aguardando recebimento</option>
                        <option value="Peças recebidas">Peças recebidas</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Em processo de banho">Em processo de banho</option>
                        <option value="Serviço concluído">Serviço concluído</option>
                        <option value="Aguardando envio">Aguardando envio</option>
                        <option value="Devolvido">Devolvido</option>
                      </select>
                    </td>

                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => generateBathServicePdf(srv)}
                        className="inline-flex items-center gap-1.5 text-xs text-[#B47B8E] hover:text-[#975F72] bg-[#FAF7F8] px-3 py-1.5 rounded-lg border border-[#E8D9DF] font-semibold cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Imprimir Protocolo</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. STOCK MOVEMENTS TAB */}
      {activeTab === 'stock' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#221C1E]">
              Histórico de Movimentações de Estoque
            </h2>
            <p className="text-xs text-stone-500">
              Registro transacional de entradas, saídas confirmadas por pedidos, reservas e liberações.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F8] border-b border-[#E8D9DF] text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">Produto / SKU</th>
                  <th className="p-3">Tipo de Operação</th>
                  <th className="p-3">Quantidade</th>
                  <th className="p-3">Estoque Anterior / Novo</th>
                  <th className="p-3">Motivo / Vínculo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {stockMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(mov.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <strong className="text-stone-800">{mov.productName}</strong>
                      <span className="block text-[10px] text-stone-400 font-mono">{mov.sku}</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        mov.type === 'ENTRADA'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : mov.type === 'SAIDA_CONFIRMADA'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : mov.type === 'RESERVA'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {mov.type}
                      </span>
                    </td>
                    <td className="p-3 font-bold tabular-nums">{mov.quantity} un.</td>
                    <td className="p-3 tabular-nums text-stone-600">
                      {mov.previousStock} → <strong className="text-[#221C1E]">{mov.newStock}</strong>
                    </td>
                    <td className="p-3 text-stone-500 text-[11px] max-w-xs">{mov.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#221C1E]">
              Logs de Auditoria & Segurança
            </h2>
            <p className="text-xs text-stone-500">
              Rastreabilidade de todas as ações executadas no sistema para controle e conformidade LGPD.
            </p>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-bold text-[#221C1E]">{log.action}</span>
                  <span className="text-stone-400 ml-2 font-mono text-[10px]">
                    por {log.user}
                  </span>
                  <p className="text-stone-600 mt-0.5">{log.details}</p>
                </div>
                <span className="text-[10px] text-stone-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. ADMIN SECURITY & CREDENTIALS TAB */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-6 max-w-3xl">
          <div className="border-b border-[#E8D9DF] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h2 className="font-serif text-xl font-bold text-[#221C1E]">
                  Acesso & Segurança da Administradora
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Gerenciamento exclusivo da única conta administradora da plataforma Ourata Semijoias.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Conta Única Autorizada
            </span>
          </div>

          {/* Security policy note */}
          <div className="bg-[#FAF7F8] p-4 rounded-xl border border-[#E8D9DF] space-y-2 text-xs">
            <h4 className="font-bold text-[#221C1E] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#B47B8E]" />
              Regra de Segurança de Administrador Único
            </h4>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              O sistema foi configurado para que <strong>estritamente 1 pessoa</strong> tenha a conta de administradora com privilégios totais de edição de produtos, gestão de estoque, controle de pedidos e orçamentos de banho. Todas as outras pessoas que realizam cadastro na plataforma são registradas unicamente com o perfil de <strong>cliente</strong>.
            </p>
          </div>

          {securitySuccess && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{securitySuccess}</span>
            </div>
          )}

          {securityError && (
            <div className="p-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{securityError}</span>
            </div>
          )}

          <form onSubmit={handleSaveAdminSecurity} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Nome da Proprietária / Administradora *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Telefone / WhatsApp Oficial *
                </label>
                <input
                  type="text"
                  required
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                E-mail de Login da Administradora *
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Este e-mail é único e intransferível para autenticação no painel restrito.
              </span>
            </div>

            <div className="pt-4 border-t border-stone-200 space-y-3">
              <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-stone-500" />
                Alterar Senha de Acesso (Opcional)
              </h3>
              <p className="text-[11px] text-stone-500">
                Preencha apenas se desejar trocar a senha de acesso da administradora.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Senha Atual da Administradora
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite a senha atual"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Nova Senha (mínimo 6 caracteres)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha segura"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingSecurity}
                className="bg-[#221C1E] hover:bg-black text-amber-300 px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>{savingSecurity ? 'Salvando...' : 'Salvar Dados da Administradora'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. ASSISTENTE DE IA OURATA TAB */}
      {activeTab === 'ai' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E8D9DF]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF3F5] border border-[#E8D9DF] flex items-center justify-center text-[#B47B8E]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#221C1E]">
                  Assistente de Inteligência Artificial Ourata
                </h2>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full font-mono">
                  Gemini API Ativa
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500">
                Integração oficial via backend com o modelo Gemini. Redação comercial refinada e estratégias de vendas para a proprietária da Ourata Semijoias.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenAiAssistant()}
              className="inline-flex items-center gap-2 bg-[#B47B8E] hover:bg-[#975F72] text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Abrir Painel Interativo da IA</span>
            </button>
          </div>

          {/* Non-automatic publishing safety reminder */}
          <div className="bg-stone-50 border border-[#E8D9DF] p-4 rounded-xl flex items-start gap-3 text-xs text-stone-700">
            <Shield className="w-4 h-4 text-[#B47B8E] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Controle Manual Total:</strong> As sugestões geradas pela inteligência artificial são disponibilizadas para visualização, refinamento e cópia em 1 clique. <strong>Nenhum texto é publicado automaticamente</strong> na loja, nos produtos ou nas redes sociais.
            </p>
          </div>

          {/* Grid of the 6 requested AI functions */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              6 Ferramentas de Inteligência Artificial Integradas:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {/* 1. Criar descrições profissionais */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-[#FAF7F8] hover:border-[#B47B8E] transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D9DF] flex items-center justify-center text-[#B47B8E]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-[#221C1E]">
                    1. Descrições Profissionais
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Cria fichas técnicas completas destacando banho de 10 milésimos ouro 18k/ródio, verniz diamond hipoalergênico e 1 ano de garantia com apelo emocional de alta joalheria.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAiAssistant()}
                  className="w-full text-xs font-semibold text-[#B47B8E] hover:text-[#975F72] bg-white py-2 rounded-xl border border-[#E8D9DF] cursor-pointer hover:bg-[#FAF3F5] transition-colors"
                >
                  Usar Gerador de Descrição →
                </button>
              </div>

              {/* 2. Gerar títulos para produtos */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-[#FAF7F8] hover:border-[#B47B8E] transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D9DF] flex items-center justify-center text-[#B47B8E]">
                    <Type className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-[#221C1E]">
                    2. Títulos de Produtos & Coleções
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Gera títulos elegantes, sonoros e marcantes para peças do catálogo e sugere nomes sofisticados para linhas e coleções temáticas da marca.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAiAssistant()}
                  className="w-full text-xs font-semibold text-[#B47B8E] hover:text-[#975F72] bg-white py-2 rounded-xl border border-[#E8D9DF] cursor-pointer hover:bg-[#FAF3F5] transition-colors"
                >
                  Gerar Títulos Sofisticados →
                </button>
              </div>

              {/* 3. Criar legendas para Instagram */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-[#FAF7F8] hover:border-[#B47B8E] transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D9DF] flex items-center justify-center text-[#B47B8E]">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-[#221C1E]">
                    3. Legendas para Instagram
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Produz legendas prontas para Feed e Reels com gancho irresistível, narrativa de sofisticação, chamada direta para o WhatsApp oficial e 10 hashtags estratégicas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAiAssistant()}
                  className="w-full text-xs font-semibold text-[#B47B8E] hover:text-[#975F72] bg-white py-2 rounded-xl border border-[#E8D9DF] cursor-pointer hover:bg-[#FAF3F5] transition-colors"
                >
                  Criar Legenda para Redes →
                </button>
              </div>

              {/* 4. Elaborar textos promocionais */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-[#FAF7F8] hover:border-[#B47B8E] transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D9DF] flex items-center justify-center text-[#B47B8E]">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-[#221C1E]">
                    4. Textos Promocionais & Atacado
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Elabora ofertas persuasivas para o varejo e argumentos vendedores para atrair revendedoras de semijoias com margem de lucro de até 100%.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAiAssistant()}
                  className="w-full text-xs font-semibold text-[#B47B8E] hover:text-[#975F72] bg-white py-2 rounded-xl border border-[#E8D9DF] cursor-pointer hover:bg-[#FAF3F5] transition-colors"
                >
                  Criar Texto Promocional →
                </button>
              </div>

              {/* 5. Sugerir campanhas de divulgação */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-[#FAF7F8] hover:border-[#B47B8E] transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D9DF] flex items-center justify-center text-[#B47B8E]">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-[#221C1E]">
                    5. Campanhas de Divulgação
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Planeja campanhas completas de marketing com conceito, slogan, ideias de conteúdo diário e roteiros de disparo para lista de transmissão VIP no WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAiAssistant()}
                  className="w-full text-xs font-semibold text-[#B47B8E] hover:text-[#975F72] bg-white py-2 rounded-xl border border-[#E8D9DF] cursor-pointer hover:bg-[#FAF3F5] transition-colors"
                >
                  Planejar Campanha →
                </button>
              </div>

              {/* 6. Melhorar textos já existentes */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-[#FAF7F8] hover:border-[#B47B8E] transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D9DF] flex items-center justify-center text-[#B47B8E]">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-[#221C1E]">
                    6. Melhorar Textos Existentes
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Cole qualquer rascunho de texto e a IA reescreve com linguagem de joalheria de alto padrão, polindo a gramática e aumentando o poder de conversão.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAiAssistant()}
                  className="w-full text-xs font-semibold text-[#B47B8E] hover:text-[#975F72] bg-white py-2 rounded-xl border border-[#E8D9DF] cursor-pointer hover:bg-[#FAF3F5] transition-colors"
                >
                  Refinar Texto Original →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Create / Edit Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E8D9DF] space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D9DF]">
              <h3 className="font-serif text-lg font-bold text-[#221C1E]">
                {editingProduct ? 'Editar Semijoia' : 'Cadastrar Nova Semijoia'}
              </h3>
              <button
                onClick={() => setProductModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Código SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E] uppercase font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1 flex justify-between">
                    <span>Nome da Peça *</span>
                    <button
                      type="button"
                      onClick={() => onOpenAiAssistant(formName, formCategory)}
                      className="text-[#B47B8E] hover:underline text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Gerar com IA
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Brinco Argola Cravejada Ouro 18k"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1 flex justify-between">
                  <span>Descrição Completa</span>
                  <button
                    type="button"
                    onClick={() => onOpenAiAssistant(formName, formCategory)}
                    className="text-[#B47B8E] hover:underline text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Redigir Descrição com IA
                  </button>
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Descreva pedras, acabamentos, design..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E] cursor-pointer"
                  >
                    <option value="Brincos">Brincos</option>
                    <option value="Colares">Colares</option>
                    <option value="Pulseiras">Pulseiras</option>
                    <option value="Anéis">Anéis</option>
                    <option value="Conjuntos">Conjuntos</option>
                    <option value="Tornozeleiras">Tornozeleiras</option>
                    <option value="Pingentes">Pingentes</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Preço Varejo (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Preço Atacado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formWholesalePrice}
                    onChange={(e) => setFormWholesalePrice(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Estoque Físico Disponível *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Alerta de Estoque Baixo (unidades)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formLowStockAlert}
                    onChange={(e) => setFormLowStockAlert(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  Padrão de Banho & Acabamento
                </label>
                <input
                  type="text"
                  value={formPlating}
                  onChange={(e) => setFormPlating(e.target.value)}
                  placeholder="Ex: Banho Ouro 18k (10 milésimos) + Verniz Diamond"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>

              <div className="space-y-3 bg-[#FAF7F8] p-4 rounded-xl border border-[#E8D9DF]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-800 block">
                      Galeria de Fotos do Produto ({formImages.length})
                    </label>
                    <span className="text-[10px] text-stone-500">
                      Envie fotos do seu dispositivo ou informe uma URL. A primeira foto é a capa no catálogo.
                    </span>
                  </div>

                  <label className="inline-flex items-center gap-1.5 bg-[#B47B8E] hover:bg-[#975F72] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingFormImage ? 'Enviando...' : 'Enviar Foto(s)'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      disabled={uploadingFormImage}
                      onChange={(e) => handleUploadFormImages(e.target.files)}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Add URL inline */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formNewImageUrl}
                    onChange={(e) => setFormNewImageUrl(e.target.value)}
                    placeholder="Ou cole URL/caminho da foto (https://... ou /uploads/...)"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                  />
                  <button
                    type="button"
                    disabled={!formNewImageUrl.trim()}
                    onClick={() => {
                      const clean = formNewImageUrl.trim();
                      if (!clean) return;
                      setFormImages((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
                      setFormNewImageUrl('');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    + Adicionar URL
                  </button>
                </div>

                {/* Preview grid */}
                {formImages.length === 0 ? (
                  <p className="text-[11px] text-stone-500 text-center py-3">
                    Nenhuma foto selecionada para esta peça.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {formImages.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className={`rounded-lg border bg-white overflow-hidden flex flex-col ${
                          idx === 0 ? 'border-[#B47B8E] ring-1 ring-[#B47B8E]/30' : 'border-stone-200'
                        }`}
                      >
                        <div className="relative aspect-[4/3] bg-stone-100">
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute top-1.5 left-1.5 bg-[#221C1E]/90 text-amber-300 text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" /> Capa
                            </span>
                          )}
                        </div>
                        <div className="p-1.5 flex items-center justify-between gap-1 bg-stone-50 text-[10px]">
                          {idx !== 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setFormImages((prev) => {
                                  const next = [...prev];
                                  const [picked] = next.splice(idx, 1);
                                  next.unshift(picked);
                                  return next;
                                });
                              }}
                              className="text-[#B47B8E] font-semibold hover:underline cursor-pointer"
                            >
                              Principal
                            </button>
                          ) : (
                            <span className="text-stone-400">Principal</span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setFormImages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-rose-600 font-semibold hover:underline cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-3">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => setProductToDelete(editingProduct)}
                    className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Semijoia</span>
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setProductModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#B47B8E] hover:bg-[#975F72] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    {editingProduct ? 'Salvar Modificações' : 'Cadastrar Semijoia'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Quick Adjustment Modal */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8D9DF] space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8D9DF]">
              <h3 className="font-serif text-base font-bold text-[#221C1E]">
                Ajustar Estoque: {adjustModalProduct.name}
              </h3>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-500">Estoque atual: </span>
                <strong className="text-[#221C1E]">{adjustModalProduct.stock} unidades</strong>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Nova Quantidade Total *
                </label>
                <input
                  type="number"
                  min="0"
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Motivo da Alteração para Auditoria *
                </label>
                <input
                  type="text"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuickStockSave}
                className="bg-[#B47B8E] hover:bg-[#975F72] text-white px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Confirmar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border ${
              actionToast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-emerald-900 text-white border-emerald-700'
            }`}
          >
            {actionToast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-300" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-300" />
            )}
            <span>{actionToast.message}</span>
          </div>
        </div>
      )}

      {/* Product Deletion Confirmation Modal */}
      {productToDelete && (
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
                  Esta ação excluirá o produto permanentemente.
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-3">
              {productToDelete.images?.[0] ? (
                <img
                  src={productToDelete.images[0]}
                  alt={productToDelete.name}
                  className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-stone-200 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-stone-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#221C1E] truncate">
                  {productToDelete.name}
                </p>
                <p className="text-[10px] text-stone-500 font-mono">
                  SKU: {productToDelete.sku} • Estoque: {productToDelete.stock} un
                </p>
                <p className="text-[11px] font-semibold text-[#B47B8E]">
                  R$ {productToDelete.price.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Tem certeza que deseja remover o produto <strong>"{productToDelete.name}"</strong>? O item será removido da loja virtual e as clientes não poderão mais visualizá-lo ou comprá-lo.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteProduct}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Removendo...' : 'Sim, Remover Produto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Admin Photo Manager Modal */}
      {photoModalProduct && (
        <ProductPhotoManagerModal
          product={photoModalProduct}
          adminId={currentUser?.id || 'admin-01'}
          onClose={() => setPhotoModalProduct(null)}
          onProductUpdated={(updated) => {
            setPhotoModalProduct(updated);
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            onRefreshProducts();
          }}
          onRequestRemoveProduct={(prod) => {
            setPhotoModalProduct(null);
            setProductToDelete(prod);
          }}
        />
      )}
    </div>
  );
};
