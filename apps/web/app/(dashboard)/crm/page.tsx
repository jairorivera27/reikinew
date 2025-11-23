'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { Plus, Building2, Users, Briefcase, Search, Download } from 'lucide-react';
import Link from 'next/link';

const stages = [
  'LEAD',
  'CONTACTADO',
  'DIAGNOSTICO',
  'PROPUESTA_ENVIADA',
  'NEGOCIACION',
  'GANADO',
  'PERDIDO',
];

const stageLabels: Record<string, string> = {
  LEAD: 'Lead',
  CONTACTADO: 'Contactado',
  DIAGNOSTICO: 'Diagnóstico',
  PROPUESTA_ENVIADA: 'Propuesta Enviada',
  NEGOCIACION: 'Negociación',
  GANADO: 'Ganado',
  PERDIDO: 'Perdido',
};

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'companies' | 'contacts'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: opportunities, isLoading: loadingOpps } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await api.get('/opportunities');
      return res.data;
    },
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get('/companies');
      return res.data;
    },
  });

  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await api.get('/contacts');
      return res.data;
    },
  });


  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await api.patch(`/opportunities/${id}`, { stage });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });

  // Búsqueda global
  const { data: searchResults } = useQuery({
    queryKey: ['crm-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
      return res.data;
    },
    enabled: searchQuery.trim().length > 0,
  });

  // Filtrar datos según búsqueda
  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return [];
    if (!searchQuery.trim()) return opportunities;
    const query = searchQuery.toLowerCase();
    return opportunities.filter(
      (opp: any) =>
        opp.name.toLowerCase().includes(query) ||
        opp.company?.name?.toLowerCase().includes(query) ||
        opp.description?.toLowerCase().includes(query),
    );
  }, [opportunities, searchQuery]);

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter(
      (company: any) =>
        company.name.toLowerCase().includes(query) ||
        company.nit?.toLowerCase().includes(query) ||
        company.email?.toLowerCase().includes(query),
    );
  }, [companies, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact: any) =>
        contact.firstName.toLowerCase().includes(query) ||
        contact.lastName.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query),
    );
  }, [contacts, searchQuery]);

  const opportunitiesByStage = useMemo(() => {
    return stages.reduce((acc, stage) => {
      acc[stage] = filteredOpportunities?.filter((opp: any) => opp.stage === stage) || [];
      return acc;
    }, {} as Record<string, any[]>);
  }, [filteredOpportunities]);

  // Exportar a CSV
  const handleExport = async (type: 'opportunities' | 'companies' | 'contacts') => {
    try {
      const endpoint = type === 'opportunities' 
        ? '/opportunities/export/csv'
        : type === 'companies'
        ? '/companies/export/csv'
        : '/contacts/export/csv';
      
      const res = await api.get(endpoint, { 
        responseType: 'blob',
        headers: {
          Accept: 'text/csv',
        },
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error al exportar:', error);
      alert(error.response?.data?.message || 'Error al exportar los datos');
    }
  };

  const { data: pipelineMetrics, error: metricsError } = useQuery({
    queryKey: ['pipeline-metrics'],
    queryFn: async () => {
      const res = await api.get('/opportunities/pipeline/metrics');
      return res.data;
    },
    retry: 1,
  });

  if (loadingOpps || loadingCompanies || loadingContacts) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-700 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Cargando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (metricsError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">Error al cargar las métricas</p>
            <p className="mt-2 text-sm text-gray-500">
              Por favor, intenta recargar la página
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
            <p className="mt-1 text-sm text-gray-500">Gestión de clientes y oportunidades</p>
          </div>
          <div className="flex space-x-2">
            <Link href="/crm/opportunities/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Oportunidad
              </Button>
            </Link>
            <Link href="/crm/companies/new">
              <Button variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                Nueva Empresa
              </Button>
            </Link>
          </div>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar empresas, contactos, oportunidades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Métricas */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total Pipeline</CardTitle>
              <Briefcase className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(pipelineMetrics?.totalValue || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Ponderado</CardTitle>
              <Briefcase className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(pipelineMetrics?.weightedValue || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Oportunidades</CardTitle>
              <Briefcase className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pipelineMetrics?.totalCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pipeline'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'companies'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Empresas ({filteredCompanies?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'contacts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Contactos ({filteredContacts?.length || 0})
              </button>
            </nav>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'pipeline') handleExport('opportunities');
                else if (activeTab === 'companies') handleExport('companies');
                else handleExport('contacts');
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Pipeline Kanban */}
        {activeTab === 'pipeline' && (
          <div className="overflow-x-auto">
            <div className="flex space-x-4 min-w-max pb-4">
              {stages.map((stage) => (
                <div key={stage} className="flex-shrink-0 w-80">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        {stageLabels[stage]} ({opportunitiesByStage[stage]?.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                      {opportunitiesByStage[stage]?.map((opp: any) => {
                        const progress = opp.probability || 0;
                        return (
                        <div
                          key={opp.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition cursor-pointer"
                          onClick={() => (window.location.href = `/crm/opportunities/${opp.id}`)}
                        >
                          <div className="font-medium text-sm">{opp.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{opp.company?.name}</div>
                          <div className="text-sm font-semibold text-primary-600 mt-2">
                            ${opp.estimatedValue.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Probabilidad: {opp.probability}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                            <div
                              className="bg-primary-600 h-1 rounded-full transition-all"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                      })}
                      {(!opportunitiesByStage[stage] || opportunitiesByStage[stage].length === 0) && (
                        <div className="text-center text-sm text-gray-400 py-8">
                          Sin oportunidades
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Empresas */}
        {activeTab === 'companies' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies?.map((company: any) => (
              <Card
                key={company.id}
                className="cursor-pointer hover:shadow-lg transition"
                onClick={() => (window.location.href = `/crm/companies/${company.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-gray-600">
                    {company.nit && <div>NIT: {company.nit}</div>}
                    {company.sector && <div>Sector: {company.sector}</div>}
                    {company.city && <div>Ciudad: {company.city}</div>}
                    <div className="mt-2 text-xs text-gray-500">
                      {company.contacts?.length || 0} contactos
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!filteredCompanies || filteredCompanies.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-gray-500">
                  No hay empresas registradas. Crea tu primera empresa para comenzar.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Lista de Contactos */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            {filteredContacts?.map((contact: any) => (
              <Card
                key={contact.id}
                className="cursor-pointer hover:shadow-lg transition"
                onClick={() => (window.location.href = `/crm/contacts/${contact.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{contact.company?.name}</div>
                      {contact.position && (
                        <div className="text-sm text-gray-500">{contact.position}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contact.email && <div>{contact.email}</div>}
                      {contact.phone && <div>{contact.phone}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!filteredContacts || filteredContacts.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No hay contactos registrados.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
