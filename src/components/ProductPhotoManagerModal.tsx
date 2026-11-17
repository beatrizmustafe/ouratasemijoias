import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  ImagePlus,
  Trash2,
  Star,
  Link as LinkIcon,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import type { Product } from '../types/index.ts';
import { authFetch } from '../lib/apiClient.ts';

interface ProductPhotoManagerModalProps {
  product: Product | null;
  onClose: () => void;
  onProductUpdated: (updated: Product) => void;
  onRequestRemoveProduct?: (product: Product) => void;
}

export const ProductPhotoManagerModal: React.FC<ProductPhotoManagerModalProps> = ({
  product,
  onClose,
  onProductUpdated,
  onRequestRemoveProduct,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [asPrimary, setAsPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!product) return null;

  const images = Array.isArray(product.images) ? product.images : [];

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Não foi possível ler o arquivo "${file.name}".`));
      reader.readAsDataURL(file);
    });

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      let latestProduct = product;
      const files = Array.from(fileList);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          throw new Error(`O arquivo "${file.name}" não é uma imagem válida.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`A imagem "${file.name}" excede o limite de 5 MB.`);
        }

        const dataUrl = await readFileAsDataUrl(file);
        const res = await authFetch(`/api/products/${product.id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl,
            fileName: file.name,
            asPrimary: asPrimary && i === 0,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao enviar foto para o catálogo.');
        }
        latestProduct = data.product;
      }

      onProductUpdated(latestProduct);
      setSuccess(
        files.length === 1
          ? 'Foto adicionada ao catálogo com sucesso.'
          : `${files.length} fotos adicionadas ao catálogo com sucesso.`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar foto.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/products/${product.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: cleanUrl,
          asPrimary,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível adicionar a URL da imagem.');
      }

      onProductUpdated(data.product);
      setUrlInput('');
      setSuccess('Foto adicionada ao produto.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao adicionar URL.');
    } finally {
      setBusy(false);
    }
  };

  const handleSetPrimary = async (index: number) => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/products/${product.id}/images/primary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao definir foto principal.');
      }
      onProductUpdated(data.product);
      setSuccess('Foto principal atualizada.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar foto principal.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/products/${product.id}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao remover foto.');
      }
      onProductUpdated(data.product);
      setSuccess('Foto removida do catálogo.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao remover foto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E8D9DF] space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#E8D9DF]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B47B8E] block">
              Gerenciamento Exclusivo da Administradora
            </span>
            <h3 className="font-serif text-xl font-bold text-[#221C1E] mt-0.5">
              Fotos do Produto no Catálogo
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {product.name} · <span className="font-mono">{product.sku}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
            aria-label="Fechar gerenciador de fotos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Upload Dropzone */}
        <div className="bg-[#FAF7F8] border border-dashed border-[#B47B8E]/50 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#221C1E] flex items-center gap-1.5">
                <ImagePlus className="w-4 h-4 text-[#B47B8E]" />
                <span>Adicionar Novas Fotos</span>
              </h4>
              <p className="text-[11px] text-stone-500">
                Envie fotos do computador ou celular (JPG, PNG, WEBP ou AVIF até 5 MB).
              </p>
            </div>

            <label className="inline-flex items-center gap-2 bg-[#B47B8E] hover:bg-[#975F72] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0">
              <Upload className="w-4 h-4" />
              <span>{busy ? 'Enviando...' : 'Escolher Foto(s)'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                disabled={busy}
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="sr-only"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-[11px] text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={asPrimary}
              onChange={(e) => setAsPrimary(e.target.checked)}
              className="rounded border-stone-300 text-[#B47B8E] focus:ring-[#B47B8E]"
            />
            <span>Definir a próxima foto adicionada como imagem principal do catálogo</span>
          </label>

          {/* Add by URL */}
          <form onSubmit={handleAddByUrl} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#E8D9DF]/70">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Ou cole o link / caminho da imagem (https://... ou /assets/...)"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#B47B8E]"
              />
              <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
            </div>
            <button
              type="submit"
              disabled={busy || !urlInput.trim()}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#E8D9DF] bg-white hover:bg-stone-50 text-[#221C1E] disabled:opacity-40 cursor-pointer whitespace-nowrap"
            >
              Adicionar URL
            </button>
          </form>
        </div>

        {/* Existing Photos Gallery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Galeria Atual ({images.length} {images.length === 1 ? 'foto' : 'fotos'})
            </h4>
            <span className="text-[11px] text-stone-400">
              A primeira foto aparece como capa no catálogo
            </span>
          </div>

          {images.length === 0 ? (
            <div className="py-10 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-stone-300" />
              <p className="text-xs text-stone-500">
                Este produto está sem fotos no momento. Envie uma imagem acima para exibi-la no catálogo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((imgUrl, idx) => (
                <div
                  key={`${imgUrl}-${idx}`}
                  className={`rounded-xl border overflow-hidden bg-white flex flex-col justify-between ${
                    idx === 0 ? 'border-[#B47B8E] ring-1 ring-[#B47B8E]/30' : 'border-stone-200'
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-stone-100">
                    {brokenUrls[imgUrl] ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-2 text-center">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <span className="text-[10px]">Imagem indisponível</span>
                      </div>
                    ) : (
                      <img
                        src={imgUrl}
                        alt={`${product.name} - Foto ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenUrls((prev) => ({ ...prev, [imgUrl]: true }))}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 bg-[#221C1E]/90 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Principal
                      </span>
                    )}
                  </div>

                  <div className="p-2 flex items-center justify-between gap-1 bg-[#FAF7F8] border-t border-stone-100">
                    {idx !== 0 ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSetPrimary(idx)}
                        className="text-[11px] font-semibold text-[#B47B8E] hover:text-[#975F72] px-2 py-1 rounded hover:bg-white cursor-pointer disabled:opacity-40 whitespace-nowrap"
                      >
                        Tornar principal
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400 px-1.5">Capa</span>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRemoveImage(idx)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer disabled:opacity-40 whitespace-nowrap"
                      title="Remover esta foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-[#E8D9DF] flex flex-col sm:flex-row items-center justify-between gap-3">
          {onRequestRemoveProduct ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRequestRemoveProduct(product)}
              className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remover Produto do Catálogo</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="bg-[#221C1E] hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
