import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  Truck,
  Sparkles,
  ArrowRight,
  User,
  MapPin,
} from 'lucide-react';
import type { CartItem, UserProfile, Address } from '../types/index.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  currentUser: UserProfile | null;
  onCheckout: (checkoutData: {
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
  }) => Promise<void>;
  isSubmittingOrder: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  currentUser,
  onCheckout,
  isSubmittingOrder,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'cart' | 'shipping'>('cart');
  const [orderNotes, setOrderNotes] = useState('');

  // Customer form state
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [cpf, setCpf] = useState(currentUser?.cpf || '');
  const [cep, setCep] = useState(currentUser?.address?.cep || '');
  const [street, setStreet] = useState(currentUser?.address?.street || '');
  const [number, setNumber] = useState(currentUser?.address?.number || '');
  const [complement, setComplement] = useState(currentUser?.address?.complement || '');
  const [neighborhood, setNeighborhood] = useState(currentUser?.address?.neighborhood || '');
  const [city, setCity] = useState(currentUser?.address?.city || 'Limeira');
  const [state, setState] = useState(currentUser?.address?.state || 'SP');
  const [formError, setFormError] = useState('');

  // Calculate pricing per item based on tiered wholesale rules
  const calculatedItems = items.map((item) => {
    let unitPrice = item.product.price;
    let isWholesale = false;

    if (item.product.tieredPricing && item.product.tieredPricing.length > 0) {
      const sortedTiers = [...item.product.tieredPricing].sort((a, b) => b.minQty - a.minQty);
      for (const tier of sortedTiers) {
        if (item.quantity >= tier.minQty) {
          unitPrice = tier.unitPrice;
          isWholesale = tier.minQty > 1;
          break;
        }
      }
    } else if (item.quantity >= item.product.minWholesaleQty) {
      unitPrice = item.product.wholesalePrice;
      isWholesale = true;
    }

    const subtotal = unitPrice * item.quantity;
    const regularTotal = item.product.price * item.quantity;
    const itemDiscount = Math.max(0, regularTotal - subtotal);

    return {
      ...item,
      unitPrice,
      subtotal,
      isWholesale,
      itemDiscount,
    };
  });

  const subtotal = calculatedItems.reduce((acc, it) => acc + it.subtotal, 0);
  const totalDiscount = calculatedItems.reduce((acc, it) => acc + it.itemDiscount, 0);
  const isWholesaleOverall = calculatedItems.some((i) => i.isWholesale);
  // Free shipping threshold for wholesale orders >= R$ 300 or R$ 20 flat
  const shippingFee = subtotal >= 300 || subtotal === 0 ? 0 : 20.0;
  const grandTotal = subtotal + shippingFee;

  const handleProceedToShipping = () => {
    if (items.length === 0) return;
    setStep('shipping');
  };

  const handleFinalizeWhatsApp = async () => {
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setFormError('Por favor preencha Nome, Telefone e E-mail.');
      return;
    }
    if (!street.trim() || !number.trim() || !city.trim() || !state.trim()) {
      setFormError('Por favor informe o endereço de entrega completo.');
      return;
    }

    setFormError('');

    const shippingAddress: Address = {
      cep: cep.trim() || '13000-000',
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim() || undefined,
      neighborhood: neighborhood.trim() || 'Centro',
      city: city.trim(),
      state: state.trim(),
    };

    await onCheckout({
      customer: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cpf: cpf.trim(),
        shippingAddress,
      },
      discount: totalDiscount,
      shippingFee,
      notes: orderNotes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#E8D9DF] animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8D9DF] flex items-center justify-between bg-[#FAF7F8]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#B47B8E]" />
            <h2 className="font-serif text-lg font-bold text-[#221C1E]">
              {step === 'cart' ? 'Carrinho de Compras' : 'Dados para Entrega & WhatsApp'}
            </h2>
            <span className="text-xs text-stone-500 tabular-nums">
              ({items.length} {items.length === 1 ? 'item' : 'itens'})
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            aria-label="Fechar carrinho"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wholesale alert indicator */}
        {isWholesaleOverall && (
          <div className="bg-[#F7EFF2] px-4 py-2 border-b border-[#E8D9DF] flex items-center gap-2 text-xs text-[#B47B8E] font-medium">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Condição de Atacado aplicada automaticamente aos produtos!</span>
          </div>
        )}

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-stone-400">
              <ShoppingBag className="w-16 h-16 stroke-1 text-stone-300" />
              <div className="space-y-1">
                <p className="font-serif text-lg font-medium text-stone-700">
                  Seu carrinho está vazio
                </p>
                <p className="text-xs text-stone-500 max-w-xs">
                  Navegue pelo nosso catálogo de semijoias finas e aproveite os preços especiais de atacado.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 text-xs font-semibold text-white bg-[#B47B8E] px-4 py-2.5 rounded-lg hover:bg-[#975F72] transition-colors cursor-pointer"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : step === 'cart' ? (
            /* Step 1: Itemized Cart List */
            <div className="space-y-4">
              {calculatedItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-3 p-3 rounded-xl border border-stone-200 bg-white hover:border-[#E8D9DF] transition-all"
                >
                  <img
                    src={
                      item.product.images?.[0] ||
                      '/assets/images/earrings_gold_zirconia_1794270256870.jpg'
                    }
                    alt={item.product.name}
                    className="w-20 h-20 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-100"
                  />

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-[#221C1E] line-clamp-1 font-serif">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-stone-400 hover:text-rose-600 transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                        SKU: {item.product.sku}
                      </div>

                      {item.isWholesale && (
                        <span className="text-[10px] text-[#B47B8E] font-semibold">
                          ★ Preço atacado ativo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-stone-200 rounded-md bg-stone-50">
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))
                          }
                          className="p-1 text-stone-500 hover:text-stone-800"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="p-1 text-stone-500 hover:text-stone-800"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Item Subtotal */}
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#221C1E] tabular-nums">
                          R$ {item.subtotal.toFixed(2).replace('.', ',')}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          R$ {item.unitPrice.toFixed(2).replace('.', ',')} / un
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Step 2: Customer Data & Address Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('cart')}
                  className="text-xs text-[#B47B8E] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  ← Voltar aos produtos
                </button>
                <span className="text-xs text-stone-400">Etapa 2 de 2</span>
              </div>

              {formError && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                  {formError}
                </div>
              )}

              <div className="space-y-3 bg-[#FAF7F8] p-4 rounded-xl border border-[#E8D9DF]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                  <User className="w-4 h-4 text-[#B47B8E]" />
                  <span>Dados para o Pedido</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Camila Ferreira"
                    className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(19) 98800-0000"
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      CPF (Opcional)
                    </label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3 bg-[#FAF7F8] p-4 rounded-xl border border-[#E8D9DF]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-[#B47B8E]" />
                  <span>Endereço de Entrega</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      CEP *
                    </label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="13000-000"
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Rua / Avenida *
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Av. Francisco Glicério"
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Número *
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="120"
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Complemento / Apto
                    </label>
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto 42, Bloco B"
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Centro"
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Limeira"
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Estado *
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="SP"
                      maxLength={2}
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Observações do Pedido (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Instruções para entrega, preferência de embalagem..."
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer / Checkout Button */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#E8D9DF] bg-[#FAF7F8] space-y-3">
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} itens)</span>
                <span className="font-semibold tabular-nums">
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-[#B47B8E]">
                  <span>Economia Atacado</span>
                  <span className="font-semibold tabular-nums">
                    - R$ {totalDiscount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-stone-400" />
                  Frete
                </span>
                <span className="font-semibold">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-700">Grátis</span>
                  ) : (
                    `R$ ${shippingFee.toFixed(2).replace('.', ',')}`
                  )}
                </span>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline text-sm font-bold text-[#221C1E]">
                <span>Total Estimado</span>
                <span className="text-lg text-[#B47B8E] tabular-nums">
                  R$ {grandTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                onClick={handleProceedToShipping}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#B47B8E] hover:bg-[#975F72] text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>Avançar para Dados de Entrega</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinalizeWhatsApp}
                disabled={isSubmittingOrder}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white py-3.5 px-4 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-current text-white" />
                <span>
                  {isSubmittingOrder
                    ? 'Registrando Pedido...'
                    : 'Finalizar Pedido pelo WhatsApp'}
                </span>
              </button>
            )}

            <p className="text-[10px] text-center text-stone-500">
              O pedido é registrado no sistema, o estoque é reservado e o pagamento é combinado diretamente com a Ourata no WhatsApp.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
