import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Instagram,
  Megaphone,
  Type,
  TrendingUp,
  Wand2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export type AiMode =
  | 'description'
  | 'title'
  | 'instagram'
  | 'promo'
  | 'campaign'
  | 'improve';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToProduct?: (text: string, field: 'name' | 'description') => void;
  initialProductName?: string;
  initialCategory?: string;
  adminId?: string;
}

const AI_FUNCTIONS: {
  id: AiMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  promptPlaceholder: string;
}[] = [
  {
    id: 'description',
    label: '1. Descrição Profissional',
    shortLabel: 'Descrição de Semijoia',
    description: 'Descrições de alta conversão com especificações técnicas (banho 10 milésimos, verniz diamond, 1 ano garantia).',
    icon: FileText,
    promptPlaceholder:
      'Ex: Destaque o brilho para noivas, o acabamento com micro-zircônias gota e a durabilidade para ocasiões especiais...',
  },
  {
    id: 'title',
    label: '2. Títulos de Produtos',
    shortLabel: 'Títulos & Coleções',
    description: 'Sugestões de títulos comerciais de luxo e nomes magnéticos para coleções exclusivas.',
    icon: Type,
    promptPlaceholder:
      'Ex: Sugira títulos modernos e elegantes para uma linha de gargantilhas chocker com pedras verdes esmeralda...',
  },
  {
    id: 'instagram',
    label: '3. Legenda para Instagram',
    shortLabel: 'Legenda Instagram',
    description: 'Legendas prontas para Feed e Reels com gancho irresistível, CTA WhatsApp e 10 hashtags.',
    icon: Instagram,
    promptPlaceholder:
      'Ex: Foco em mulheres elegantes que amam joalheria fina para o dia a dia. Chame para o WhatsApp...',
  },
  {
    id: 'promo',
    label: '4. Textos Promocionais',
    shortLabel: 'Textos Promocionais',
    description: 'Pitches de venda para varejo e atacado (revendedoras com até 100% de margem de lucro).',
    icon: Megaphone,
    promptPlaceholder:
      'Ex: Promoção especial para revendedoras adquirirem lote a partir de 5 peças com frete rápido de Limeira...',
  },
  {
    id: 'campaign',
    label: '5. Campanhas de Divulgação',
    shortLabel: 'Campanha de Marketing',
    description: 'Conceito, cronograma de postagens e roteiro VIP para listas de transmissão do WhatsApp.',
    icon: TrendingUp,
    promptPlaceholder:
      'Ex: Campanha de Lançamento de Primavera ou Dia das Mães para reativação de clientes e revendedoras...',
  },
  {
    id: 'improve',
    label: '6. Melhorar Texto Existente',
    shortLabel: 'Aprimorar Texto',
    description: 'Refine e eleve a linguagem de qualquer texto já escrito, tornando-o sofisticado e comercial.',
    icon: Wand2,
    promptPlaceholder:
      'Ex: Torne o texto mais poético, luxuoso, direto e sem clichês, mantendo as informações de garantia...',
  },
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyToProduct,
  initialProductName = '',
  initialCategory = 'Colares',
  adminId = 'admin-01',
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<AiMode>('description');
  const [productName, setProductName] = useState(initialProductName);
  const [category, setCategory] = useState(initialCategory);
  const [userPrompt, setUserPrompt] = useState('');
  const [existingText, setExistingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeFunction = AI_FUNCTIONS.find((f) => f.id === mode) || AI_FUNCTIONS[0];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId || 'admin-01',
        },
        body: JSON.stringify({
          mode,
          productName: productName.trim() || 'Semijoia Ourata',
          category,
          prompt: userPrompt.trim(),
          existingText: existingText.trim(),
        }),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          response.status === 504 || response.status === 502
            ? 'O servidor demorou para responder. Tente novamente em instantes.'
            : `Resposta inesperada do servidor (${response.status}): ${rawText.replace(/<[^>]*>?/gm, '').slice(0, 150).trim()}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Erro na comunicação com a API do Gemini (${response.status}: ${response.statusText}).`
        );
      }

      if (!data.result) {
        throw new Error('A API retornou uma resposta sem conteúdo. Tente novamente.');
      }

      setGeneratedResult(data.result);
    } catch (err: any) {
      console.error('AI assistant error:', err);
      setErrorMessage(
        err.message || 'Ocorreu um erro ao consultar a inteligência artificial do Gemini.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E8D9DF] p-5 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E8D9DF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF3F5] border border-[#E8D9DF] text-[#B47B8E] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#B47B8E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#221C1E]">
                  Assistente de IA Ourata
                </h2>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full font-mono">
                  Gemini API Real
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Copywriting comercial, descrições técnicas, títulos de luxo e estratégias de vendas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer transition-colors"
            aria-label="Fechar assistente de IA"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6 Functions Tabs */}
        <div>
          <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-2">
            Selecione a Função do Assistente:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AI_FUNCTIONS.map((fn) => {
              const Icon = fn.icon;
              const isSelected = mode === fn.id;
              return (
                <button
                  key={fn.id}
                  type="button"
                  onClick={() => {
                    setMode(fn.id);
                    setErrorMessage('');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#B47B8E] bg-[#FAF3F5] text-[#221C1E] shadow-xs'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-[#B47B8E]' : 'text-stone-400'
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-[#B47B8E]' : 'text-stone-700'
                      }`}
                    >
                      {fn.shortLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 line-clamp-1">
                    {fn.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Input Form */}
        <div className="space-y-3.5 bg-[#FAF7F8] p-4 sm:p-5 rounded-2xl border border-[#E8D9DF]">
          <div className="flex items-center justify-between text-xs text-stone-600 pb-1 border-b border-[#E8D9DF]/60">
            <span className="font-semibold text-[#221C1E]">
              {activeFunction.label}
            </span>
            <span className="text-[11px] text-[#B47B8E]">
              Limeira • Ouro 18k & Ródio • Atacado e Varejo
            </span>
          </div>

          {/* Context Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Nome da Peça ou Referência
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Brinco Gota Zircônias Cravejadas Ouro 18k"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E] transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Categoria da Peça
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E] cursor-pointer"
              >
                <option value="Brincos">Brincos</option>
                <option value="Colares">Colares</option>
                <option value="Pulseiras">Pulseiras</option>
                <option value="Anéis">Anéis</option>
                <option value="Conjuntos">Conjuntos</option>
                <option value="Tornozeleiras">Tornozeleiras</option>
                <option value="Pingentes">Pingentes</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          {/* If mode is improve, display dedicated input for existing text */}
          {mode === 'improve' && (
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Texto Original a ser Aprimorado:
              </label>
              <textarea
                rows={3}
                value={existingText}
                onChange={(e) => setExistingText(e.target.value)}
                placeholder="Cole aqui o texto ou descrição que você deseja que a IA reescreva com mais sofisticação..."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E] transition-colors"
              />
            </div>
          )}

          {/* Campo para Escrever Solicitações (Requested Requirement) */}
          <div>
            <label className="text-[11px] font-semibold text-stone-700 flex items-center justify-between mb-1">
              <span>Campo para Escrever Solicitações / Instruções Adicionais:</span>
              <span className="text-[10px] text-stone-400 font-normal">
                (Opcional, mas recomendado)
              </span>
            </label>
            <textarea
              rows={2}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={activeFunction.promptPlaceholder}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E] transition-colors"
            />
          </div>

          {/* Botão para Gerar Conteúdo */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#B47B8E] hover:bg-[#975F72] text-white py-3 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Gerando Conteúdo com a API Real do Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Gerar Conteúdo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Error Message Display (Requirement) */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Falha na Operação da API do Gemini:</span>
            </div>
            <p className="font-mono text-[11px] break-words bg-white/70 p-2 rounded-lg border border-rose-200">
              {errorMessage}
            </p>
            <p className="text-[11px] text-rose-700">
              A resposta acima foi retornada pelo servidor. Nenhuma resposta simulada foi gerada.
            </p>
          </div>
        )}

        {/* Notice: Não publicar nada automaticamente (Requirement) */}
        <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl text-amber-900 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Aviso de Segurança:</strong> O assistente gera sugestões para sua conferência e cópia. <strong>Nenhum conteúdo é publicado automaticamente</strong> na loja, no catálogo ou no Instagram. Você mantém o controle total para revisar antes de aplicar.
          </p>
        </div>

        {/* Área para Visualizar e Copiar o Resultado (Requirement) */}
        {generatedResult && (
          <div className="space-y-3 pt-1 border-t border-[#E8D9DF]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#221C1E] uppercase tracking-wider flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Resultado Gerado pela IA:
              </span>

              <div className="flex items-center gap-2">
                {/* Opção de Gerar Novamente (Requirement) */}
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-700 hover:text-black font-semibold bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg border border-stone-300 cursor-pointer transition-colors disabled:opacity-50"
                  title="Gerar uma nova variação com a IA"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Gerar Novamente</span>
                </button>

                {/* Botão Copiar */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs text-white bg-[#B47B8E] hover:bg-[#975F72] font-semibold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>

                {/* Optional: Apply directly to product form if opened from product modal */}
                {onApplyToProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyToProduct(
                        generatedResult,
                        mode === 'title' ? 'name' : 'description'
                      );
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-white bg-[#221C1E] hover:bg-black font-semibold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
                  >
                    <span>Inserir no Cadastro</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E8D9DF] bg-stone-50/50 text-xs text-[#221C1E] leading-relaxed whitespace-pre-wrap font-sans max-h-72 overflow-y-auto selection:bg-[#B47B8E]/20">
              {generatedResult}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
