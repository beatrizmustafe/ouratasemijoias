import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Heart,
  ImagePlus,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import type { Product } from '../types/index.ts';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onDirectWhatsAppOrder: (product: Product, quantity: number) => void;
  isAdmin?: boolean;
  onAdminManagePhotos?: (p: Product) => void;
  onAdminRemoveProduct?: (p: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
  onDirectWhatsAppOrder,
  isAdmin = false,
  onAdminManagePhotos,
  onAdminRemoveProduct,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setQuantity(1);
    setSelectedImageIndex(0);
    setBrokenImages({});
  }, [product?.id]);

  if (!product) return null;

  const images = Array.isArray(product.images) ? product.images : [];
  const safeImageIndex = images.length > 0 ? Math.min(selectedImageIndex, images.length - 1) : 0;
  const currentImage = images[safeImageIndex] || '';

  const availableStock = Math.max(0, product.stock - (product.reservedStock || 0));
  const isOutOfStock = availableStock <= 0;

  // Calculate price based on quantity tier
  let appliedUnitPrice = product.price;
  let isWholesale = false;

  if (product.tieredPricing && product.tieredPricing.length > 0) {
    const sortedTiers = [...product.tieredPricing].sort((a, b) => b.minQty - a.minQty);
    for (const tier of sortedTiers) {
      if (quantity >= tier.minQty) {
        appliedUnitPrice = tier.unitPrice;
        isWholesale = tier.minQty > 1;
        break;
      }
    }
  } else if (quantity >= product.minWholesaleQty) {
    appliedUnitPrice = product.wholesalePrice;
    isWholesale = true;
  }

  const subtotal = appliedUnitPrice * quantity;

  const handleIncrement = () => {
    if (quantity < availableStock) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E8D9DF] animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white text-stone-500 hover:text-stone-800 shadow-sm transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 lg:p-8">
          {/* Left Column: Image Gallery */}
          <div className="md:col-span-6 space-y-4">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 border border-[#E8D9DF]">
              {currentImage && !brokenImages[safeImageIndex] ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenImages((prev) => ({ ...prev, [safeImageIndex]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF7F8] to-[#EFE3E7] text-[#B47B8E] p-6 text-center">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-60" />
                  <span className="text-xs font-medium text-[#594D52]">
                    Nenhuma foto disponível para esta peça
                  </span>
                </div>
              )}

              <button
                onClick={() => onToggleFavorite(product.id)}
                className={`absolute top-3 left-3 p-2.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                  isFavorite
                    ? 'bg-white text-rose-600 shadow-md'
                    : 'bg-white/80 text-stone-500 hover:text-rose-600 shadow-sm'
                }`}
                aria-label="Favoritar"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      safeImageIndex === idx
                        ? 'border-[#B47B8E] shadow-sm'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Foto miniatura ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Admin-only quick photo & catalog removal controls */}
            {isAdmin && (
              <div className="bg-[#FAF3F5] p-3 rounded-xl border border-[#E8D9DF] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#221C1E]">
                  Controles da Administradora
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAdminManagePhotos?.(product)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#B47B8E] hover:bg-[#975F72] text-white transition-colors cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Adicionar / Remover Fotos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdminRemoveProduct?.(product)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Peça</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quality & Plating Highlights */}
            <div className="bg-[#FAF7F8] p-4 rounded-xl border border-[#E8D9DF] space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#221C1E] font-semibold">
                <Sparkles className="w-4 h-4 text-[#B47B8E]" />
                <span>Padrão de Acabamento & Galvanoplastia</span>
              </div>
              <ul className="space-y-1 text-stone-600 pl-6 list-disc">
                <li>{product.platingType || 'Banho Ouro 18k (10 milésimos)'}</li>
                <li>Dupla camada de Verniz Diamond Hipoalergênico</li>
                <li>{product.warranty || '1 ano de garantia no banho'}</li>
                <li>Níquel Free (antialérgica)</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Information & Purchase Module */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#594D52]">
                <span className="uppercase tracking-wider font-semibold text-[#B47B8E]">
                  {product.category}
                </span>
                <span className="font-mono text-stone-400">SKU: {product.sku}</span>
              </div>

              <h2 className="font-serif text-2xl font-bold text-[#221C1E] leading-snug">
                {product.name}
              </h2>

              <p className="text-sm text-stone-600 leading-relaxed">
                {product.description}
              </p>

              {/* Inventory status */}
              <div className="py-2 flex items-center gap-2 text-xs">
                {isOutOfStock ? (
                  <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Produto Esgotado no momento
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Em estoque ({availableStock} unidades prontas para envio)
                  </span>
                )}
              </div>

              {/* Wholesale Tier Pricing Table */}
              <div className="border border-[#E8D9DF] rounded-xl overflow-hidden text-xs">
                <div className="bg-[#F7EFF2] px-3 py-2 font-semibold text-[#221C1E] flex items-center justify-between">
                  <span>Tabela de Preços & Condições de Atacado</span>
                  <span className="text-[10px] text-[#B47B8E] uppercase tracking-wider font-bold">
                    Desconto Automático
                  </span>
                </div>
                <div className="divide-y divide-stone-100 bg-white">
                  {product.tieredPricing && product.tieredPricing.length > 0 ? (
                    product.tieredPricing.map((tier, idx) => {
                      const isCurrentTier =
                        quantity >= tier.minQty &&
                        (!product.tieredPricing![idx + 1] ||
                          quantity < product.tieredPricing![idx + 1].minQty);
                      return (
                        <div
                          key={idx}
                          className={`px-3 py-2 flex items-center justify-between transition-colors ${
                            isCurrentTier ? 'bg-[#FAF3F5] font-semibold text-[#B47B8E]' : 'text-stone-600'
                          }`}
                        >
                          <span>
                            {tier.minQty === 1
                              ? '1 unidade (Varejo)'
                              : `A partir de ${tier.minQty} unidades`}
                          </span>
                          <span className="tabular-nums font-bold">
                            R$ {tier.unitPrice.toFixed(2).replace('.', ',')} / un
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className="px-3 py-2 flex justify-between">
                        <span>1 unidade (Varejo)</span>
                        <span className="font-bold">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="px-3 py-2 flex justify-between bg-[#FAF3F5] text-[#B47B8E] font-semibold">
                        <span>A partir de {product.minWholesaleQty} un (Atacado)</span>
                        <span className="font-bold">R$ {product.wholesalePrice.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Stepper & Price Total */}
            <div className="space-y-4 pt-4 border-t border-stone-200">
              <div className="flex items-center justify-between bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <div className="space-y-0.5">
                  <span className="text-[11px] uppercase tracking-wider text-stone-500 font-medium block">
                    {isWholesale ? 'Preço Atacado Aplicado' : 'Preço Unitário Varejo'}
                  </span>
                  <div className="text-xl font-bold text-[#221C1E] tabular-nums">
                    R$ {subtotal.toFixed(2).replace('.', ',')}
                    <span className="text-xs font-normal text-stone-500 ml-1.5">
                      (R$ {appliedUnitPrice.toFixed(2).replace('.', ',')} un.)
                    </span>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center border border-stone-300 rounded-lg bg-white shadow-xs">
                  <button
                    onClick={handleDecrement}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="p-2 text-stone-600 hover:text-stone-900 disabled:opacity-40 cursor-pointer"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-sm font-bold text-[#221C1E] tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrement}
                    disabled={quantity >= availableStock || isOutOfStock}
                    className="p-2 text-stone-600 hover:text-stone-900 disabled:opacity-40 cursor-pointer"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    onAddToCart(product, quantity);
                    onClose();
                  }}
                  disabled={isOutOfStock}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#B47B8E] hover:bg-[#975F72] text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:bg-stone-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Adicionar ao Carrinho</span>
                </button>

                <button
                  onClick={() => onDirectWhatsAppOrder(product, quantity)}
                  className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white py-3 px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  title="Comprar direto pelo WhatsApp oficial"
                >
                  <MessageCircle className="w-4 h-4 fill-current text-white" />
                  <span className="hidden sm:inline">Negociar no WhatsApp</span>
                  <span className="sm:hidden">WhatsApp</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-stone-400">
                Pagamentos combinados no WhatsApp • Garantia de 1 ano • Envio seguro
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
