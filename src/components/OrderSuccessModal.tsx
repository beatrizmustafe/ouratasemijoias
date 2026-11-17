import React, { useState } from 'react';
import {
  CheckCircle,
  FileText,
  MessageCircle,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type { Order } from '../types/index.ts';
import { generateOrderPdf } from '../utils/pdfGenerator.ts';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
}) => {
  if (!order) return null;

  const [copied, setCopied] = useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(order.whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    generateOrderPdf(order);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E8D9DF] animate-in fade-in zoom-in-95 duration-200 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Celebration */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#221C1E]">
            Pedido Registrado com Sucesso!
          </h2>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            Seu pedido foi registrado no sistema da Ourata Semijoias e o estoque foi temporariamente reservado.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-[#FAF7F8] p-4 sm:p-5 rounded-xl border border-[#E8D9DF] space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8D9DF]/60">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-400 block">
                Número do Pedido
              </span>
              <span className="font-mono text-base font-bold text-[#B47B8E]">
                {order.id}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 block">
                Total do Pedido
              </span>
              <span className="text-base font-bold text-[#221C1E] tabular-nums">
                R$ {order.total.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          <div className="text-xs space-y-1 text-stone-600">
            <div>
              <strong className="text-[#221C1E]">Cliente:</strong> {order.customerName}
            </div>
            <div>
              <strong className="text-[#221C1E]">WhatsApp:</strong> {order.customerPhone}
            </div>
            <div>
              <strong className="text-[#221C1E]">Status inicial:</strong>{' '}
              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action: Open WhatsApp */}
        <div className="space-y-3">
          <a
            href={order.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white py-3.5 px-4 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            <MessageCircle className="w-5 h-5 fill-current text-white" />
            <span>Abrir WhatsApp da Ourata Agora</span>
            <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Download PDF button */}
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-[#221C1E] border border-[#E8D9DF] py-2.5 px-4 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#B47B8E]" />
              <span>Baixar Pedido em PDF</span>
            </button>

            {/* Copy message button */}
            <button
              onClick={handleCopyMessage}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 py-2.5 px-4 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Mensagem Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-400" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security / Reassurance Notice */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 text-[11px] text-[#594D52] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[#B47B8E] shrink-0 mt-0.5" />
          <span>
            <strong>Garantia Ourata:</strong> Se por algum motivo o WhatsApp fechar antes do envio da mensagem, seu pedido já está seguro em nosso banco de dados com suas peças reservadas. A proprietária também poderá consultá-lo pelo painel administrativo.
          </span>
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="text-xs text-stone-500 hover:text-[#B47B8E] underline cursor-pointer"
          >
            Continuar navegando pela loja
          </button>
        </div>
      </div>
    </div>
  );
};
