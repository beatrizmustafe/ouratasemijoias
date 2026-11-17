import React from 'react';
import { Sparkles, Shield, HeartHandshake, Award } from 'lucide-react';

export const AboutBrandSection: React.FC = () => {
  const officialLogo =
    '/assets/aistudio/WhatsApp_Image_2026-11-08_at_23.49.43_d9839c0b.jpeg';

  return (
    <section id="sobre" className="py-16 bg-[#FAF7F8] border-b border-[#E8D9DF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Official Logo Presentation Frame */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative p-6 sm:p-8 bg-white rounded-3xl shadow-xl border border-[#E8D9DF] max-w-sm w-full text-center space-y-4">
              <div className="relative mx-auto w-48 h-48 rounded-full overflow-hidden shadow-inner border-2 border-[#E8D9DF]">
                <img
                  src={officialLogo}
                  alt="Identidade Visual Ourata Semijoias"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-[#221C1E]">
                  Ourata Semijóias
                </h3>
                <p className="text-xs uppercase tracking-[0.2em] text-[#B47B8E] font-semibold">
                  Elegância & Durabilidade
                </p>
              </div>

              <div className="pt-2 text-xs text-stone-500 italic">
                “O símbolo floral de oito pétalas em contraste preto e branco representa equilíbrio, florescimento e autenticidade feminina.”
              </div>
            </div>
          </div>

          {/* Brand Philosophy & Story */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#B47B8E]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nossa Filosofia</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#221C1E] leading-tight">
              Semijoias pensadas para durar, encantar e gerar independência financeira.
            </h2>

            <div className="space-y-4 text-sm sm:text-base text-stone-600 leading-relaxed">
              <p>
                A <strong className="text-[#221C1E]">Ourata Semijoias</strong> nasceu da paixão pela joalheria clássica e do compromisso em entregar peças com banho nobre autêntico. Em um mercado comumente saturado de semijoias descartáveis, a Ourata se diferencia por aplicar espessura real de 10 milésimos de ouro 18k e banhos de ródio de alta densidade.
              </p>
              <p>
                Além de nosso catálogo de pronta entrega, mantemos um serviço especializado de galvanoplastia e revitalização para peças que carregam histórias e afeto, permitindo que nossos clientes restaurem seu brilho original com garantia comprovada.
              </p>
            </div>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E8D9DF]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                  <Award className="w-4 h-4 text-[#B47B8E]" />
                  <span>10 Milésimos</span>
                </div>
                <p className="text-xs text-stone-500">
                  Alta camada de ouro nobre com verniz diamond antialérgico.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-[#B47B8E]" />
                  <span>1 Ano de Garantia</span>
                </div>
                <p className="text-xs text-stone-500">
                  Segurança total para você e para as clientes da sua revenda.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#221C1E] uppercase tracking-wider">
                  <HeartHandshake className="w-4 h-4 text-[#B47B8E]" />
                  <span>Atendimento Pessoal</span>
                </div>
                <p className="text-xs text-stone-500">
                  Negociação direta no WhatsApp pelo número oficial +55 (19) 98806-4749.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
