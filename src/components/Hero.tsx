import React from 'react';
import { Sparkles, Shield, ArrowRight, MessageCircle } from 'lucide-react';

interface HeroProps {
  onExploreCatalog: () => void;
  onExploreWholesale: () => void;
  onExploreBath: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onExploreCatalog,
  onExploreWholesale,
  onExploreBath,
}) => {
  const heroImage =
    '/src/assets/images/necklace_gold_choker_1794270256905.jpg';
  const officialLogo =
    '/assets/aistudio/WhatsApp_Image_2026-11-08_at_23.49.43_d9839c0b.jpeg';

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F7EFF2] via-[#FAF7F8] to-[#FAF7F8] border-b border-[#E8D9DF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#B47B8E]">
              <Sparkles className="w-3.5 h-3.5 text-[#B47B8E]" />
              <span>Alta Joalheria & Banhos Nobres</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#221C1E] leading-[1.15] text-balance">
              Semijoias finas que transformam beleza em{' '}
              <span className="italic font-normal text-[#B47B8E]">elegância e rentabilidade</span>.
            </h1>

            <p className="text-base sm:text-lg text-[#594D52] max-w-xl leading-relaxed">
              Peças minuciosamente produzidas com banho premium em Ouro 18k (10 milésimos) e Verniz Diamond antialérgico. Atacado exclusivo para revendedoras com margem de lucro de até 100% e serviços especializados de revitalização e banho de semijoias.
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExploreCatalog}
                className="inline-flex items-center gap-2 bg-[#B47B8E] hover:bg-[#975F72] text-white px-6 py-3.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>Ver Catálogo Completo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreWholesale}
                className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 text-[#221C1E] border border-[#E8D9DF] px-5 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <span>Tabela de Atacado</span>
              </button>

              <button
                onClick={onExploreBath}
                className="inline-flex items-center gap-2 text-[#B47B8E] hover:text-[#975F72] px-3 py-3.5 text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>Serviços de Banho</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Direct WhatsApp Callout */}
            <div className="pt-2 flex items-center gap-3 text-xs text-[#594D52]">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366]">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-[#221C1E]">
                  Pagamento combinado no WhatsApp:{' '}
                </span>
                <span>Negociação direta e humanizada no +55 (19) 98806-4749</span>
              </div>
            </div>
          </div>

          {/* Right Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Jewelry Showcase Frame */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#E8D9DF] bg-white aspect-[4/3] group">
                <img
                  src={heroImage}
                  alt="Semijoias finas Ourata"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                  <div className="text-white space-y-1">
                    <p className="text-xs uppercase tracking-widest text-rose-200 font-semibold">
                      Coleção Autoral
                    </p>
                    <p className="font-serif text-lg font-medium">
                      Ouro 18k com Zircônias Lapidação Brilhante
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Brand Badge with official logo */}
              <div className="absolute -bottom-5 -left-4 sm:-bottom-6 sm:-left-6 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-[#E8D9DF] flex items-center gap-3">
                <img
                  src={officialLogo}
                  alt="Logo Oficial Ourata Semijoias"
                  className="w-14 h-14 rounded-full object-cover border border-[#E8D9DF]"
                />
                <div>
                  <div className="font-serif font-bold text-sm text-[#221C1E]">
                    Ourata Semijóias
                  </div>
                  <div className="text-[11px] text-[#B47B8E] font-medium">
                    10 milésimos de ouro 18k
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Garantia & Acabamento de Joalheria
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Trust & Wholesale Value Props */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14 pt-8 border-t border-[#E8D9DF]">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-[#E8D9DF]/60">
            <Shield className="w-5 h-5 text-[#B47B8E] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                Banho de 10 Milésimos
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Alta camada de Ouro 18k e Verniz Diamond antialérgico
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-[#E8D9DF]/60">
            <Sparkles className="w-5 h-5 text-[#B47B8E] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                Atacado com Desconto
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Preços por volume a partir de poucas unidades para revendedoras
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-[#E8D9DF]/60">
            <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                Vendas pelo WhatsApp
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Reserva automática de estoque e pagamento combinado direto
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-[#E8D9DF]/60">
            <Shield className="w-5 h-5 text-[#B47B8E] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                Serviços de Banho
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Revitalização profissional de peças com rastreamento por protocolo
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
