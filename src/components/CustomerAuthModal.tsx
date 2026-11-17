import React, { useState } from 'react';
import {
  X,
  Mail,
  User,
  Phone,
  Lock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { UserProfile, Address } from '../types/index.ts';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  if (!isOpen) return null;

  // Primary tab: 'customer' or 'admin'
  const [authType, setAuthType] = useState<'customer' | 'admin'>('customer');

  // Customer submode: 'login' | 'register' | 'magic'
  const [customerMode, setCustomerMode] = useState<'login' | 'register' | 'magic'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Limeira');
  const [state, setState] = useState('SP');

  // Admin specific form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkInfo, setMagicLinkInfo] = useState<{ token: string; link: string } | null>(null);

  // Customer Login
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar login.');

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Customer Register
  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Preencha os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError('');

    const address: Address = {
      cep: cep.trim() || '13480-000',
      street: street.trim() || 'Rua Principal',
      number: number.trim() || '100',
      neighborhood: neighborhood.trim() || 'Centro',
      city: city.trim() || 'Limeira',
      state: state.trim() || 'SP',
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          phone: phone.trim(),
          cpf: cpf.trim(),
          address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar.');

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin Login (Single Administrator)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setError('E-mail e senha da administradora são obrigatórios.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: adminPassword.trim(),
          isAdminLogin: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na autenticação da administradora.');

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Magic Link Request
  const handleRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Informe seu e-mail cadastrado.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar magic link.');

      setMagicLinkInfo({ token: data.token, link: data.magicLink });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateMagicLink = async () => {
    if (!magicLinkInfo) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: magicLinkInfo.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao validar link.');

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E8D9DF] animate-in fade-in zoom-in-95 duration-200 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full border mb-2 ${
              authType === 'admin'
                ? 'bg-stone-900 border-stone-800 text-amber-300'
                : 'bg-[#FAF7F8] border-[#E8D9DF] text-[#B47B8E]'
            }`}
          >
            {authType === 'admin' ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#221C1E]">
            {authType === 'admin'
              ? 'Área da Administradora'
              : customerMode === 'login'
              ? 'Área da Cliente'
              : customerMode === 'register'
              ? 'Cadastro de Cliente'
              : 'Acesso com Link Mágico'}
          </h2>
          <p className="text-xs text-stone-500">
            {authType === 'admin'
              ? 'Digite suas credenciais para gerenciar a plataforma.'
              : customerMode === 'login'
              ? 'Acesse seus pedidos, endereços e acompanhe suas compras.'
              : customerMode === 'register'
              ? 'Cadastre-se para comprar no atacado ou varejo com entrega rápida.'
              : 'Receba um link de acesso direto com segurança no seu e-mail.'}
          </p>
        </div>

        {/* Primary Role Switcher: Cliente vs Administradora */}
        <div className="flex p-1 bg-stone-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => {
              setAuthType('customer');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              authType === 'customer'
                ? 'bg-white text-[#221C1E] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Área da Cliente</span>
          </button>
          <button
            onClick={() => {
              setAuthType('admin');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              authType === 'admin'
                ? 'bg-stone-900 text-amber-300 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administradora</span>
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        {/* -------------------- CUSTOMER FLOW -------------------- */}
        {authType === 'customer' && (
          <div className="space-y-4">
            {/* Customer Submode Tabs */}
            <div className="flex border-b border-stone-200 text-xs">
              <button
                onClick={() => {
                  setCustomerMode('login');
                  setError('');
                }}
                className={`flex-1 pb-2 font-semibold text-center border-b-2 cursor-pointer transition-colors ${
                  customerMode === 'login'
                    ? 'border-[#B47B8E] text-[#B47B8E]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  setCustomerMode('register');
                  setError('');
                }}
                className={`flex-1 pb-2 font-semibold text-center border-b-2 cursor-pointer transition-colors ${
                  customerMode === 'register'
                    ? 'border-[#B47B8E] text-[#B47B8E]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Cadastrar-se
              </button>
              <button
                onClick={() => {
                  setCustomerMode('magic');
                  setError('');
                }}
                className={`flex-1 pb-2 font-semibold text-center border-b-2 cursor-pointer transition-colors ${
                  customerMode === 'magic'
                    ? 'border-[#B47B8E] text-[#B47B8E]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Link Mágico
              </button>
            </div>

            {/* Customer Login Form */}
            {customerMode === 'login' && (
              <form onSubmit={handleCustomerLogin} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    E-mail Cadastrado *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@exemplo.com.br"
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-stone-700">
                      Senha (Opcional se não cadastrou senha)
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha de cliente"
                      className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#B47B8E] hover:bg-[#975F72] text-white py-3 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Acessando...' : 'Entrar como Cliente'}
                </button>
              </form>
            )}

            {/* Customer Register Form */}
            {customerMode === 'register' && (
              <form onSubmit={handleCustomerRegister} className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Rafaela Silva Santos"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(19) 99999-9999"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Senha de Acesso
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crie uma senha"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      CPF (Opcional)
                    </label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="13480-000"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Rua / Avenida
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua das Acácias"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="120"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      maxLength={2}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#B47B8E] hover:bg-[#975F72] text-white py-3 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? 'Cadastrando...' : 'Criar Conta de Cliente'}
                </button>
              </form>
            )}

            {/* Customer Magic Link Flow */}
            {customerMode === 'magic' && (
              <div className="space-y-4">
                {!magicLinkInfo ? (
                  <form onSubmit={handleRequestMagicLink} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                        Seu E-mail Cadastrado
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#B47B8E]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#B47B8E] hover:bg-[#975F72] text-white py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Enviando...' : 'Enviar Link de Acesso'}
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Link Mágico gerado para seu e-mail!</span>
                    </div>
                    <button
                      onClick={handleActivateMagicLink}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      Acessar Conta Agora
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* -------------------- ADMIN FLOW -------------------- */}
        {authType === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                E-mail da Administradora *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-800"
                />
                <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-stone-700">
                  Senha da Administradora *
                </label>
              </div>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-800"
                />
                <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#221C1E] hover:bg-black text-amber-300 py-3 rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>{loading ? 'Verificando...' : 'Entrar no Painel Administrativo'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
