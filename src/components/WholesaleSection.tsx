import React from 'react';
import { Sparkles, TrendingUp, DollarSign, CheckCircle2, MessageCircle, ArrowRight } from 'lucide-react';

interface WholesaleSectionProps {
  onExploreCatalog: () => void;
}

export const WholesaleSection: React.FC<WholesaleSectionProps> = ({
  onExploreCatalog,
}) => {
  return (
    <section id="atacado" className="py-16 bg-white border-b border-[#E8D9DF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#B47B8E]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Oportunidade para Revendedoras & Lojistas</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#221C1E]">
            Vendas no Atacado com Descontos Progressivos
          </h2>
          <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
            A Ourata Semijoias foi estruturada para impulsionar empreendedoras. Oferecemos peças de alto giro, acabamento de joalheria, banho de 10 milésimos e margem de revenda de até 100%.
          </p>
        </div>

        {/* 3 Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier 1 */}
          <div className="bg-[#FAF7F8] p-6 sm:p-8 rounded-2xl border border-[#E8D9DF] flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Atacado Inicial
              </span>
              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-[#221C1E]">
                  A partir de 5 unidades
                </h3>
                <p className="text-xs text-[#B47B8E] font-semibold">
                  Média de 40% a 45% de Desconto
                </p>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Ideal para quem está iniciando na revenda de semijoias. Preço de atacado liberado a partir de apenas 5 peças.
              </p>
              <ul className="space-y-2 text-xs text-stone-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Desconto aplicado automaticamente</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Garantia de 1 ano no banho</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Material fotográfico para divulgação</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onExploreCatalog}
              className="w-full bg-white hover:bg-stone-50 text-[#221C1E] border border-[#E8D9DF] py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Comprar no Atacado Inicial
            </button>
          </div>

          {/* Tier 2 (Highlighted) */}
          <div className="bg-gradient-to-b from-[#F7EFF2] to-white p-6 sm:p-8 rounded-2xl border-2 border-[#B47B8E] flex flex-col justify-between space-y-6 shadow-md relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B47B8E] text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
              Mais Escolhido por Revendedoras
            </div>

            <div className="space-y-4 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B47B8E]">
                Atacado Especial
              </span>
              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-[#221C1E]">
                  A partir de 10 unidades
                </h3>
                <p className="text-xs text-[#B47B8E] font-semibold">
                  Média de 50% a 55% de Desconto
                </p>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Nível perfeito para compor mostruário variado com alta lucratividade imediata e margem superior.
              </p>
              <ul className="space-y-2 text-xs text-stone-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Frete grátis para compras acima de R$ 300</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Embalagens personalizadas de brinde</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Suporte prioritário da proprietária via WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onExploreCatalog}
              className="w-full bg-[#B47B8E] hover:bg-[#975F72] text-white py-3 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              Aproveitar Atacado Especial
            </button>
          </div>

          {/* Tier 3 */}
          <div className="bg-[#FAF7F8] p-6 sm:p-8 rounded-2xl border border-[#E8D9DF] flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Atacado Distribuidor
              </span>
              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-[#221C1E]">
                  A partir de 30 unidades
                </h3>
                <p className="text-xs text-[#B47B8E] font-semibold">
                  Média de 60% de Desconto (Preço de Fábrica)
                </p>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Preços de custo ateliê para lojistas e revendedoras consolidadas que operam com volume frequente.
              </p>
              <ul className="space-y-2 text-xs text-stone-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Menor preço unitário garantido</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Reserva prioritária de lançamentos</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B47B8E] shrink-0" />
                  <span>Condições personalizadas de negociação</span>
                </li>
              </ul>
            </div>

            <a
              href="https://wa.me/5519988064749?text=Ol%C3%A1!%20Gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20pedidos%20de%20grande%20volume%20no%20Atacado%20Distribuidor."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-white hover:bg-stone-50 text-[#25D366] border border-[#25D366]/40 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Negociar Volume no WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
