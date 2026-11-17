import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { BathService } from '../types/index.ts';
import { generateBathServicePdf } from '../utils/pdfGenerator.ts';

interface BathServiceSectionProps {
  onSuccessToast?: (msg: string) => void;
}

export const BathServiceSection: React.FC<BathServiceSectionProps> = ({
  onSuccessToast,
}) => {
  const atelierBanner =
    '/src/assets/images/jewelry_plating_atelier_1794270259239.jpg';

  // Request form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pieceType, setPieceType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [bathType, setBathType] = useState('Ouro 18k (10 Milésimos)');
  const [observations, setObservations] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdService, setCreatedService] = useState<BathService | null>(null);

  // Protocol lookup state
  const [searchProtocol, setSearchProtocol] = useState('');
  const [trackedService, setTrackedService] = useState<BathService | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const bathOptions = [
    'Ouro 18k (10 Milésimos) — Padrão Alta Joalheria',
    'Ródio Branco Espelhado',
    'Ródio Negro Grafite',
    'Ouro Rosé Contemporâneo',
    'Banho Duplo Ouro 18k + Verniz Diamond Italiano',
  ];

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !pieceType) {
      alert('Por favor, informe seu nome, telefone e o tipo de peça.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bath-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          pieceType,
          quantity,
          bathType,
          observations,
          photoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar solicitação');

      setCreatedService(data.bathService);
      setTrackedService(data.bathService);
      if (onSuccessToast) {
        onSuccessToast(`Protocolo ${data.bathService.protocol} gerado com sucesso!`);
      }

      // Reset form
      setPieceType('');
      setObservations('');
      setPhotoUrl('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchProtocol.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/bath-services?protocol=${encodeURIComponent(searchProtocol.trim())}`);
      const data = await res.json();
      if (data.bathServices && data.bathServices.length > 0) {
        setTrackedService(data.bathServices[0]);
      } else {
        setSearchError(`Nenhum serviço encontrado com o protocolo "${searchProtocol.trim()}".`);
        setTrackedService(null);
      }
    } catch (err: any) {
      setSearchError('Erro ao consultar protocolo.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Status progress steps
  const allStages = [
    'Solicitação recebida',
    'Aguardando recebimento',
    'Peças recebidas',
    'Em análise',
    'Em processo de banho',
    'Serviço concluído',
    'Aguardando envio',
    'Devolvido',
  ];

  const getStageIndex = (status: string) => {
    const idx = allStages.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <section id="banho" className="py-16 bg-[#FAF7F8] border-b border-[#E8D9DF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#B47B8E]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Galvanoplastia & Revitalização de Semijoias</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#221C1E]">
            Serviços de Banho Especializados
          </h2>
          <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
            Dê vida nova às suas semijoias e peças especiais. O ateliê Ourata aplica banhos nobres de alta espessura (até 10 milésimos de ouro 18k) e vernizes de proteção diamond para devolver o brilho espelhado e a máxima durabilidade.
          </p>
        </div>

        {/* Banner with Atelier Visual */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl border border-[#E8D9DF] bg-stone-900 aspect-[21/9] sm:aspect-[16/7]">
          <img
            src={atelierBanner}
            alt="Ateliê de Banhos Ourata Semijoias"
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center p-6 sm:p-10">
            <div className="max-w-lg text-white space-y-2">
              <span className="text-[11px] uppercase tracking-widest text-rose-300 font-semibold">
                Processo Artesanal & Científico
              </span>
              <h3 className="font-serif text-xl sm:text-3xl font-medium">
                Banho de Ouro 18k, Ródio e Verniz Antialérgico
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed hidden sm:block">
                Cada peça passa por desengraxe ultrassônico, ativação ácida, deposição eletrolítica de camadas e cura térmica.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Left Protocol Tracker, Right Request Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Protocol Tracking & Educational Info */}
          <div className="lg:col-span-6 space-y-6">
            {/* Protocol Search Box */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-[#221C1E] flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#B47B8E]" />
                  <span>Rastrear Protocolo de Banho</span>
                </h3>
                <span className="text-xs text-stone-400">Tempo real</span>
              </div>

              <form onSubmit={handleSearchProtocol} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: SB-2026-0042"
                  value={searchProtocol}
                  onChange={(e) => setSearchProtocol(e.target.value)}
                  className="flex-1 text-xs p-3 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E] bg-stone-50 focus:bg-white transition-all uppercase font-mono"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="bg-[#B47B8E] hover:bg-[#975F72] text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {searchLoading ? 'Buscando...' : 'Consultar'}
                </button>
              </form>

              {searchError && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                  {searchError}
                </div>
              )}

              {/* Protocol Result Card */}
              {trackedService && (
                <div className="p-4 sm:p-5 rounded-xl bg-[#FAF7F8] border border-[#E8D9DF] space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8D9DF]">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
                        Protocolo
                      </span>
                      <span className="font-mono text-sm font-bold text-[#B47B8E]">
                        {trackedService.protocol}
                      </span>
                    </div>
                    <button
                      onClick={() => generateBathServicePdf(trackedService)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#B47B8E] hover:text-[#975F72] font-semibold bg-white px-3 py-1.5 rounded-lg border border-[#E8D9DF] shadow-xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Baixar PDF</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                    <div>
                      <strong className="text-[#221C1E]">Cliente:</strong> {trackedService.customerName}
                    </div>
                    <div>
                      <strong className="text-[#221C1E]">Peça(s):</strong> {trackedService.quantity}x {trackedService.pieceType}
                    </div>
                    <div>
                      <strong className="text-[#221C1E]">Tipo de Banho:</strong> {trackedService.bathType}
                    </div>
                    <div>
                      <strong className="text-[#221C1E]">Prazo Estimado:</strong> {trackedService.estimatedDays} dias úteis
                    </div>
                  </div>

                  {/* Stage Progress Visual */}
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-[#221C1E] block mb-2">
                      Estágio Atual:{' '}
                      <span className="text-[#B47B8E] font-bold">
                        {trackedService.status}
                      </span>
                    </span>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                      {allStages.map((stage, idx) => {
                        const currentIdx = getStageIndex(trackedService.status);
                        const isDone = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;

                        return (
                          <div
                            key={idx}
                            className={`p-1.5 rounded text-center text-[9px] transition-colors leading-tight ${
                              isCurrent
                                ? 'bg-[#B47B8E] text-white font-bold shadow-xs'
                                : isDone
                                ? 'bg-rose-100 text-[#B47B8E] font-medium'
                                : 'bg-stone-100 text-stone-400'
                            }`}
                            title={stage}
                          >
                            {stage.split(' ')[0]}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage History Log */}
                  {trackedService.history && trackedService.history.length > 0 && (
                    <div className="pt-2 border-t border-stone-200 space-y-1.5">
                      <span className="text-[11px] font-bold text-stone-700 block">
                        Histórico de Movimentações:
                      </span>
                      {trackedService.history.map((hist, i) => (
                        <div key={i} className="text-[11px] text-stone-500 flex justify-between">
                          <span>• {hist.status}{hist.notes ? ` (${hist.notes})` : ''}</span>
                          <span className="text-stone-400 font-mono">
                            {new Date(hist.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Educational Bath Quality Guide */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8D9DF] shadow-xs space-y-3">
              <h4 className="font-serif text-base font-bold text-[#221C1E] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#B47B8E]" />
                <span>Por que fazer banho na Ourata?</span>
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Utilizamos maquinário de última geração com eletrólise controlada e camadas verdadeiras de ouro 18k (10 milésimos para brincos, colares e pulseiras). Todas as peças recebem acabamento final com Verniz Diamond antialérgico, garantindo resistência ao suor, cosméticos e atrito diário.
              </p>
            </div>
          </div>

          {/* Right Column: Request Form */}
          <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-[#E8D9DF] shadow-sm space-y-5">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#221C1E]">
                Solicitar Orçamento de Banho
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Preencha o formulário abaixo para gerar seu protocolo instantâneo. A proprietária entrará em contato para alinhar o recebimento das peças.
              </p>
            </div>

            {createdService && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Protocolo {createdService.protocol} gerado com sucesso!</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Você já pode acompanhar o status ao lado ou baixar a Ordem de Serviço em PDF.
                </p>
                <button
                  onClick={() => generateBathServicePdf(createdService)}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold underline cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> Baixar Protocolo em PDF
                </button>
              </div>
            )}

            <form onSubmit={handleCreateService} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Mariana Duarte"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    WhatsApp para Contato *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(19) 98765-4321"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  E-mail para Acompanhamento
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="mariana@exemplo.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Tipo de Peça(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={pieceType}
                    onChange={(e) => setPieceType(e.target.value)}
                    placeholder="Ex: Corrente veneziana, 2 argolas, anel solitário"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  Tipo de Banho Desejado *
                </label>
                <select
                  value={bathType}
                  onChange={(e) => setBathType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E] bg-white cursor-pointer"
                >
                  {bathOptions.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  Observações & Estado Atual das Peças
                </label>
                <textarea
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Descreva se há oxidação, soldas necessárias, valor sentimental ou preferências especiais..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#B47B8E] hover:bg-[#975F72] text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Gerando Protocolo...' : 'Gerar Ordem de Serviço & Protocolo'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
