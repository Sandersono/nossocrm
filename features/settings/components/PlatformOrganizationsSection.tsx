import React, { useEffect, useState } from 'react';
import { Building2, Loader2, Shield, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { isSuperAdminRole } from '@/lib/auth/roles';

type OrganizationRow = {
  id: string;
  name: string;
  createdAt: string;
  deletedAt: string | null;
  userCount: number;
  adminCount: number;
};

const INITIAL_FORM = {
  companyName: '',
  name: '',
  email: '',
  password: '',
};

export const PlatformOrganizationsSection: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const canManagePlatform = isSuperAdminRole(profile?.role);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/organizations', {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'include',
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Falha ao carregar tenants (HTTP ${res.status})`);
      }

      setOrganizations(data?.organizations || []);
    } catch (error: any) {
      addToast(error?.message || 'Falha ao carregar tenants', 'error');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canManagePlatform) {
      setLoading(false);
      return;
    }
    void loadOrganizations();
  }, [canManagePlatform]);

  const handleChange = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/platform/organizations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Falha ao criar tenant (HTTP ${res.status})`);
      }

      setForm(INITIAL_FORM);
      addToast('Workspace criado com sucesso.', 'success');
      await loadOrganizations();
    } catch (error: any) {
      addToast(error?.message || 'Falha ao criar workspace', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (!canManagePlatform) {
    return (
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Acesso restrito</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              A administracao multi-tenant da plataforma fica disponivel apenas para perfis com papel <strong>superadmin</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-600 dark:text-primary-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
              Plataforma Multi-tenant
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Aqui fica a configuracao operacional do SaaS: criacao de tenants e visao consolidada dos workspaces.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Empresa
            </label>
            <input
              value={form.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white"
              placeholder="Ex: Cliente Exemplo"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Responsavel inicial
            </label>
            <input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white"
              placeholder="Ex: Maria Silva"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email inicial
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white"
              placeholder="cliente@empresa.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Senha temporaria
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white"
              placeholder="Minimo 6 caracteres"
              required
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar workspace
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tenants cadastrados</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Visao consolidada dos workspaces provisionados na plataforma.
            </p>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        </div>

        {organizations.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
            Nenhum workspace provisionado ainda.
          </div>
        ) : (
          <div className="grid gap-3">
            {organizations.map((organization) => (
              <div
                key={organization.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-slate-950/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{organization.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Criado em {new Date(organization.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {organization.userCount} usuarios
                    </span>
                    <span className="px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      {organization.adminCount} admins
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
