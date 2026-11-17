import React, { useState } from 'react';
import {
  ShoppingBag,
  Heart,
  User,
  ShieldCheck,
  Search,
  Menu,
  X,
  Phone,
} from 'lucide-react';
import type { UserProfile } from '../types/index.ts';

interface HeaderProps {
  cartCount: number;
  wishlistCount: number;
  currentUser: UserProfile | null;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onToggleAdmin: () => void;
  isAdminView: boolean;
  onNavigate: (sectionId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  wishlistCount,
  currentUser,
  onOpenCart,
  onOpenWishlist,
  onOpenAuth,
  onOpenProfile,
  onToggleAdmin,
  isAdminView,
  onNavigate,
  searchQuery,
  onSearchChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const officialLogo =
    '/assets/aistudio/WhatsApp_Image_2026-11-08_at_23.49.43_d9839c0b.jpeg';

  return (
    <header className="sticky top-0 z-30 bg-[#FAF7F8]/95 backdrop-blur-md border-b border-[#E8D9DF]">
      {/* Top Announcement Bar */}
      <div className="bg-[#B47B8E] text-white px-4 py-1.5 text-center text-xs tracking-wide font-medium flex items-center justify-center gap-2">
        <span>
          Vendas no Atacado & Varejo • Pagamento Facilitado no WhatsApp • Banho Ouro 18k 10 Milésimos
        </span>
        <span className="hidden md:inline text-rose-200">|</span>
        <a
          href="https://wa.me/5519988064749"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1 hover:underline text-rose-100 font-semibold"
        >
          <Phone className="w-3 h-3" /> (19) 98806-4749
        </a>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Zone 1: Brand Wordmark & Official Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('inicio')}
              className="flex items-center gap-3 text-left focus:outline-none group"
            >
              <img
                src={officialLogo}
                alt="Ourata Semijoias"
                className="h-13 w-13 rounded-full object-cover border border-[#E8D9DF] shadow-sm group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold tracking-tight text-[#221C1E] leading-tight">
                  Ourata
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#B47B8E] font-semibold -mt-1">
                  Semijóias
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-[#594D52]">
            <button
              onClick={() => onNavigate('catalogo')}
              className="hover:text-[#B47B8E] transition-colors whitespace-nowrap cursor-pointer"
            >
              Catálogo
            </button>
            <button
              onClick={() => onNavigate('atacado')}
              className="hover:text-[#B47B8E] transition-colors whitespace-nowrap cursor-pointer"
            >
              Atacado
            </button>
            <button
              onClick={() => onNavigate('banho')}
              className="hover:text-[#B47B8E] transition-colors whitespace-nowrap cursor-pointer"
            >
              Serviços de Banho
            </button>
            <button
              onClick={() => onNavigate('sobre')}
              className="hover:text-[#B47B8E] transition-colors whitespace-nowrap cursor-pointer"
            >
              Sobre a Marca
            </button>
            {currentUser && (
              <button
                onClick={onOpenProfile}
                className="hover:text-[#B47B8E] transition-colors whitespace-nowrap cursor-pointer"
              >
                Meus Pedidos
              </button>
            )}
          </nav>

          {/* Zone 3: Actions (Search, Wishlist, Cart, Profile, Admin Switch) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Search Input on Desktop */}
            <div className="relative hidden md:block w-48 xl:w-64">
              <input
                type="text"
                placeholder="Buscar semijoias, SKU..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full border border-[#E8D9DF] bg-white text-[#221C1E] focus:outline-none focus:border-[#B47B8E] focus:ring-1 focus:ring-[#B47B8E] transition-all"
              />
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Mobile search toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="md:hidden p-2 text-[#594D52] hover:text-[#B47B8E] rounded-full"
              aria-label="Buscar produtos"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Button */}
            <button
              onClick={onOpenWishlist}
              className="relative p-2 text-[#594D52] hover:text-[#B47B8E] rounded-full transition-colors"
              aria-label="Ver favoritos"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#B47B8E] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 p-2 bg-[#F7EFF2] hover:bg-[#EFE3E7] text-[#221C1E] rounded-full px-3 py-2 transition-colors cursor-pointer"
              aria-label="Abrir carrinho de compras"
            >
              <ShoppingBag className="w-5 h-5 text-[#B47B8E]" />
              <span className="text-xs font-semibold tabular-nums hidden sm:inline">
                {cartCount} {cartCount === 1 ? 'item' : 'itens'}
              </span>
              {cartCount > 0 && (
                <span className="sm:hidden absolute -top-1 -right-1 bg-[#B47B8E] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account Button */}
            {currentUser ? (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 p-2 text-xs font-medium text-[#594D52] hover:text-[#B47B8E] rounded-full transition-colors"
                title={`Conectado como ${currentUser.name}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#B47B8E]/20 text-[#B47B8E] font-semibold flex items-center justify-center text-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 text-xs font-medium text-[#594D52] hover:text-[#B47B8E] px-2.5 py-1.5 rounded-lg border border-[#E8D9DF] bg-white transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}

            {/* Owner / Admin Toggle Button (STRICTLY for authenticated Admin only) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={onToggleAdmin}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isAdminView
                    ? 'bg-[#221C1E] text-white hover:bg-black shadow-sm'
                    : 'bg-[#B47B8E] text-white hover:bg-[#975F72] shadow-sm'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline">
                  {isAdminView ? 'Ver Loja' : 'Painel da Proprietária'}
                </span>
                <span className="md:hidden">{isAdminView ? 'Loja' : 'Gestão'}</span>
              </button>
            )}

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#594D52] hover:text-[#B47B8E]"
              aria-label="Abrir menu de navegação"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {searchOpen && (
          <div className="md:hidden py-3 border-t border-[#E8D9DF]">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar semijoias, SKU..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#E8D9DF] bg-white text-[#221C1E] focus:outline-none focus:border-[#B47B8E]"
                autoFocus
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            </div>
          </div>
        )}

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#E8D9DF] space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                onNavigate('catalogo');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-[#221C1E] hover:bg-[#F7EFF2] rounded-lg"
            >
              Catálogo de Produtos
            </button>
            <button
              onClick={() => {
                onNavigate('atacado');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-[#221C1E] hover:bg-[#F7EFF2] rounded-lg"
            >
              Condições de Atacado
            </button>
            <button
              onClick={() => {
                onNavigate('banho');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-[#221C1E] hover:bg-[#F7EFF2] rounded-lg"
            >
              Serviços de Banho (Galvanoplastia)
            </button>
            <button
              onClick={() => {
                onNavigate('sobre');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-[#221C1E] hover:bg-[#F7EFF2] rounded-lg"
            >
              Sobre a Ourata Semijoias
            </button>
            {currentUser && (
              <button
                onClick={() => {
                  onOpenProfile();
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-[#B47B8E] hover:bg-[#F7EFF2] rounded-lg"
              >
                Meus Pedidos & Dados Pessoais
              </button>
            )}
            <div className="pt-2 border-t border-[#E8D9DF] px-3">
              <a
                href="https://wa.me/5519988064749"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-[#25D366]"
              >
                <Phone className="w-4 h-4" /> WhatsApp: (19) 98806-4749
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
