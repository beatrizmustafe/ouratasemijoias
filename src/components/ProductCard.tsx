import React, { useState } from 'react';
import { Heart, ShoppingBag, Eye, AlertCircle, ImagePlus, Trash2, Image as ImageIcon } from 'lucide-react';
import type { Product } from '../types/index.ts';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectProduct: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
  isAdmin?: boolean;
  onAdminManagePhotos?: (p: Product) => void;
  onAdminRemoveProduct?: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onSelectProduct,
  onQuickAdd,
  isAdmin = false,
  onAdminManagePhotos,
  onAdminRemoveProduct,
}) => {
  const [imgError, setImgError] = useState(false);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockAlert;
  const images = Array.isArray(product.images) ? product.images : [];
  const mainImage = images[0] || '';

  return (
    <div className="group relative bg-white rounded-xl border border-[#E8D9DF] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      {/* Product Image Frame */}
      <div
        className="relative aspect-[4/3] bg-stone-100 overflow-hidden cursor-pointer"
        onClick={() => onSelectProduct(product)}
      >
        {mainImage && !imgError ? (
          <img
            src={mainImage}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF7F8] to-[#EFE3E7] text-[#B47B8E] p-4 text-center">
            <ImageIcon className="w-8 h-8 mb-1.5 opacity-60" />
            <span className="text-[11px] font-medium text-[#594D52]">Sem foto cadastrada</span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
            isFavorite
              ? 'bg-white text-rose-600 shadow-md'
              : 'bg-white/80 text-stone-500 hover:text-rose-600 hover:bg-white shadow-sm'
          }`}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Photo count indicator when multiple photos exist */}
        {images.length > 1 && (
          <span className="absolute bottom-2.5 right-2.5 text-[11px] font-medium text-white bg-[#221C1E]/75 backdrop-blur-xs px-2 py-0.5 rounded tabular-nums">
            {images.length} fotos
          </span>
        )}

        {/* Status flags (clean unboxed subtle indicators) */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
          {isOutOfStock ? (
            <span className="text-[11px] font-semibold text-rose-700 bg-white/95 px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Esgotado
            </span>
          ) : isLowStock ? (
            <span className="text-[11px] font-medium text-amber-800 bg-amber-50/95 border border-amber-200/80 px-2 py-0.5 rounded shadow-xs">
              Últimas {product.stock} un.
            </span>
          ) : product.isNewRelease ? (
            <span className="text-[11px] font-medium text-[#B47B8E] bg-white/95 px-2 py-0.5 rounded shadow-xs">
              Lançamento
            </span>
          ) : null}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#594D52]">
            <span className="uppercase tracking-wider font-semibold text-[#B47B8E] text-[10px]">
              {product.category}
            </span>
            <span className="text-stone-400 font-mono text-[11px]">{product.sku}</span>
          </div>

          <h3
            onClick={() => onSelectProduct(product)}
            className="font-serif text-base font-semibold text-[#221C1E] group-hover:text-[#B47B8E] transition-colors line-clamp-1 cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h3>

          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Pricing & Commercial Rules */}
        <div className="mt-4 pt-3 border-t border-stone-100 space-y-2">
          {/* Price display */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[11px] text-stone-400 block uppercase tracking-wider">
                Varejo
              </span>
              <span className="text-base font-bold text-[#221C1E] tabular-nums">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#B47B8E] font-semibold block uppercase tracking-wider">
                Atacado
              </span>
              <span className="text-sm font-bold text-[#B47B8E] tabular-nums">
                R$ {product.wholesalePrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Wholesale tier summary */}
          {product.tieredPricing && product.tieredPricing.length > 2 && (
            <div className="text-[10px] text-stone-500 bg-[#F7EFF2]/70 px-2 py-1 rounded border border-[#E8D9DF]/50">
              A partir de {product.tieredPricing[2].minQty} un.:{' '}
              <strong className="text-[#221C1E]">
                R$ {product.tieredPricing[2].unitPrice.toFixed(2).replace('.', ',')}
              </strong>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onSelectProduct(product)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 border border-[#E8D9DF] rounded-lg text-[#221C1E] hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Detalhes</span>
            </button>

            <button
              onClick={() => onQuickAdd(product)}
              disabled={isOutOfStock}
              className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                isOutOfStock
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-[#B47B8E] hover:bg-[#975F72] text-white'
              }`}
              title={isOutOfStock ? 'Produto Esgotado' : 'Adicionar ao carrinho'}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Comprar</span>
            </button>
          </div>

          {/* Admin-only catalog photo & removal controls */}
          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-dashed border-[#E8D9DF] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdminManagePhotos?.(product);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg bg-[#FAF3F5] hover:bg-[#EFE3E7] text-[#B47B8E] border border-[#E8D9DF] transition-colors cursor-pointer whitespace-nowrap"
                title="Adicionar ou remover fotos deste produto"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Fotos ({images.length})</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdminRemoveProduct?.(product);
                }}
                className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer whitespace-nowrap"
                title="Remover produto do catálogo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
