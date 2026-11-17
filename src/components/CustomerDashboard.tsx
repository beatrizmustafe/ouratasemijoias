import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShoppingBag,
  Heart,
  FileText,
  MapPin,
  MessageCircle,
  LogOut,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import type { UserProfile, Order, Product } from '../types/index.ts';
import { generateOrderPdf } from '../utils/pdfGenerator.ts';
import { authFetch } from '../lib/apiClient.ts';

interface CustomerDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogout: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  allProducts: Product[];
  onAddToCart: (p: Product, qty: number) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onUpdateProfile,
  allProducts,
  onAddToCart,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'favorites'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile form state
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [cpf, setCpf] = useState(currentUser.cpf || '');
  const [street, setStreet] = useState(currentUser.address?.street || '');
  const [number, setNumber] = useState(currentUser.address?.number || '');
  const [complement, setComplement] = useState(currentUser.address?.complement || '');
  const [neighborhood, setNeighborhood] = useState(currentUser.address?.neighborhood || '');
  const [city, setCity] = useState(currentUser.address?.city || 'Limeira');
  const [state, setState] = useState(currentUser.address?.state || 'SP');
  const [cep, setCep] = useState(currentUser.address?.cep || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setName(currentUser.name || '');
    setPhone(currentUser.phone || '');
    setCpf(currentUser.cpf || '');
    setStreet(currentUser.address?.street || '');
    setNumber(currentUser.address?.number || '');
    setComplement(currentUser.address?.complement || '');
    setNeighborhood(currentUser.address?.neighborhood || '');
    setCity(currentUser.address?.city || 'Limeira');
    setState(currentUser.address?.state || 'SP');
    setCep(currentUser.address?.cep || '');
  }, [currentUser]);

  // Fetch orders for this authenticated customer via Supabase JWT
  useEffect(() => {
    setLoadingOrders(true);
    authFetch('/api/orders')
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => setOrders(d.orders || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingOrders(false));
  }, [currentUser.id]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      phone,
      cpf,
      address: {
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      },
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const favoriteProducts = allProducts.filter((p) =>
    currentUser.favorites?.includes(p.id)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[#E8D9DF] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E8D9DF] flex items-center justify-between bg-[#FAF7F8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#B47B8E]/20 text-[#B47B8E] font-bold flex items-center justify-center text-sm">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#221C1E]">
                {currentUser.name}
              </h2>
              <span className="text-xs text-stone-500">{currentUser.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="text-xs text-stone-500 hover:text-rose-600 p-2 rounded-lg hover:bg-stone-100 flex items-center gap-1 transition-colors cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-[#B47B8E] text-[#B47B8E] bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Meus Pedidos ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-[#B47B8E] text-[#B47B8E] bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Meus Dados & Endereço</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'favorites'
                ? 'border-[#B47B8E] text-[#B47B8E] bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Favoritos ({favoriteProducts.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* 1. Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-stone-400">
                  Carregando seus pedidos...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-stone-400">
                  <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-stone-300" />
                  <p className="text-sm font-serif text-stone-700">
                    Você ainda não realizou nenhum pedido.
                  </p>
                  <p className="text-xs text-stone-500">
                    Adicione semijoias ao carrinho e finalize pelo WhatsApp para gerar seu primeiro pedido!
                  </p>
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 sm:p-5 rounded-xl border border-stone-200 bg-white space-y-3 shadow-xs hover:border-[#E8D9DF] transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#B47B8E]">
                          {ord.id}
                        </span>
                        <span className="text-[11px] text-stone-400 ml-2">
                          {new Date(ord.createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(ord.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold bg-[#FAF3F5] text-[#B47B8E] px-2.5 py-1 rounded-md border border-[#E8D9DF]">
                          {ord.status}
                        </span>
                      </div>
                    </div>

                    {/* Order items brief */}
                    <div className="space-y-1.5 text-xs text-stone-700">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span>
                            {it.quantity}x {it.productName}{' '}
                            <span className="text-stone-400 font-mono text-[10px]">
                              ({it.sku})
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums">
                            R$ {it.subtotal.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                      <div>
                        <span className="text-stone-400">Total: </span>
                        <strong className="text-sm font-bold text-[#221C1E] tabular-nums">
                          R$ {ord.total.toFixed(2).replace('.', ',')}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => generateOrderPdf(ord)}
                          className="inline-flex items-center gap-1.5 text-xs text-[#B47B8E] hover:text-[#975F72] font-semibold bg-[#FAF7F8] px-3 py-1.5 rounded-lg border border-[#E8D9DF] cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Baixar PDF</span>
                        </button>

                        <a
                          href={ord.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#25D366] hover:text-[#20BD5A] font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. Profile & Address Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveSuccess && (
                <div className="p-3 text-xs bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4" /> Informações salvas com sucesso!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>

              <div className="pt-2 border-t border-stone-200 space-y-3">
                <span className="text-xs font-bold text-[#221C1E] uppercase tracking-wider block">
                  Endereço Cadastrado
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Rua / Avenida
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      maxLength={2}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#B47B8E] hover:bg-[#975F72] text-white py-3 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Salvar Alterações
              </button>
            </form>
          )}

          {/* 3. Favorites Tab */}
          {activeTab === 'favorites' && (
            <div className="space-y-3">
              {favoriteProducts.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Heart className="w-12 h-12 mx-auto stroke-1 text-stone-300" />
                  <p className="text-sm font-serif text-stone-700">
                    Sua lista de favoritos está vazia.
                  </p>
                  <p className="text-xs text-stone-500">
                    Clique no coração em qualquer semijoia para salvá-la aqui!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {favoriteProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex gap-3 p-3 rounded-xl border border-stone-200 bg-white items-center justify-between"
                    >
                      <img
                        src={p.images?.[0]}
                        alt={p.name}
                        className="w-14 h-14 rounded-lg object-cover bg-stone-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-[#221C1E] truncate">
                          {p.name}
                        </h4>
                        <span className="text-xs font-bold text-[#B47B8E] block tabular-nums">
                          R$ {p.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <button
                        onClick={() => onAddToCart(p, 1)}
                        className="text-xs bg-[#B47B8E] hover:bg-[#975F72] text-white px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer font-semibold"
                      >
                        Comprar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
