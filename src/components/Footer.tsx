import React from 'react';
import { Phone, Mail, MapPin, Shield, MessageCircle } from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const officialLogo =
    '/assets/aistudio/WhatsApp_Image_2026-11-08_at_23.49.43_d9839c0b.jpeg';

  return (
    <footer className="bg-[#221C1E] text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Mission Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={officialLogo}
                alt="Ourata Semijoias"
                className="w-14 h-14 rounded-full object-cover border border-rose-900/60"
              />
              <div>
                <span className="font-serif text-2xl font-bold tracking-tight text-white block">
                  Ourata
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#B47B8E] font-semibold">
                  Semijóias
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Alta semijoia com galvanoplastia nobre, 10 milésimos de ouro 18k e dupla camada de verniz hipoalergênico. Pronta entrega e condições especiais para revendedoras de atacado.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('inicio')}
                  className="hover:text-[#B47B8E] transition-colors cursor-pointer"
                >
                  Página Inicial
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalogo')}
                  className="hover:text-[#B47B8E] transition-colors cursor-pointer"
                >
                  Catálogo Completo
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('atacado')}
                  className="hover:text-[#B47B8E] transition-colors cursor-pointer"
                >
                  Condições de Atacado
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('banho')}
                  className="hover:text-[#B47B8E] transition-colors cursor-pointer"
                >
                  Serviços de Banho (Galvanoplastia)
                </button>
              </li>
            </ul>
          </div>

          {/* Official WhatsApp & Service */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
              Atendimento Oficial
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                <a
                  href="https://wa.me/5519988064749"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors font-medium text-emerald-400"
                >
                  +55 (19) 98806-4749 (WhatsApp)
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#B47B8E] shrink-0" />
                <a
                  href="mailto:ouratasemijoias@gmail.com"
                  className="hover:text-white transition-colors"
                >
                  ouratasemijoias@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#B47B8E] shrink-0 mt-0.5" />
                <span>Ateliê em Limeira / SP — Capital da Joia Folheada — Envio para todo o Brasil</span>
              </li>
            </ul>

            <a
              href="https://wa.me/5519988064749?text=Ol%C3%A1!%20Conheci%20a%20Ourata%20Semijoias%20pelo%20site%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20os%20produtos%20e%20pedidos."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-current text-white" />
              <span>Chamar no WhatsApp</span>
            </a>
          </div>

          {/* Quality and Security Guarantees */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
              Garantia & Confiança
            </h4>
            <div className="space-y-2 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#B47B8E]" />
                <span>1 Ano de Garantia no Banho</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-400">
                Transações combinadas diretamente com a proprietária. Pedidos registrados em banco de dados seguro, com emissão instantânea de comprovante em PDF e total conformidade com a LGPD.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500">
          <div>
            © {new Date().getFullYear()} OURATA SEMIJOIAS. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4">
            <span>Privacidade & LGPD</span>
            <span>·</span>
            <span>Termos Comerciais</span>
            <span>·</span>
            <span>Galvanoplastia Fina</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
