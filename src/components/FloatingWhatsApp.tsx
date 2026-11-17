import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface FloatingWhatsAppProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber = '5519988064749',
  defaultMessage = 'Olá! Conheci a Ourata Semijoias pelo site e gostaria de mais informações sobre os produtos e pedidos.',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    defaultMessage
  )}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {showTooltip && (
        <div className="mb-2 bg-white text-[#221C1E] p-3 rounded-xl shadow-xl border border-[#E8D9DF] max-w-xs text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-start gap-2 mb-1">
            <span className="font-semibold text-[#B47B8E] text-sm">
              Atendimento Ourata
            </span>
            <button
              onClick={() => setShowTooltip(false)}
              className="text-stone-400 hover:text-stone-600"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-stone-600 leading-relaxed">
            Dúvidas sobre semijoias, atacado ou serviços de banho? Fale
            diretamente conosco pelo WhatsApp!
          </p>
        </div>
      )}

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        className="group relative flex items-center gap-3 bg-[#25D366] hover:bg-[#20BD5A] text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
        aria-label="Fale conosco pelo WhatsApp"
      >
        <MessageCircle className="w-6 h-6 fill-current text-white" />
        <span className="hidden sm:inline-block text-xs font-semibold tracking-wide pr-1">
          Atendimento WhatsApp
        </span>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-200"></span>
        </span>
      </a>
    </div>
  );
};
