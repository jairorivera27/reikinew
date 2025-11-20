'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { Target, Users, TrendingUp, FileText, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

export default function DashboardPage() {
  const { data: okrMetrics } = useQuery({
    queryKey: ['okr-dashboard'],
    queryFn: async () => {
      const res = await api.get('/okr/dashboard');
      return res.data;
    },
  });

  const { data: pipelineMetrics } = useQuery({
    queryKey: ['pipeline-metrics'],
    queryFn: async () => {
      const res = await api.get('/opportunities/pipeline/metrics');
      return res.data;
    },
  });

  const { data: marketingMetrics } = useQuery({
    queryKey: ['marketing-dashboard'],
    queryFn: async () => {
      const res = await api.get('/marketing/dashboard');
      return res.data;
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
          <p className="mt-1 text-sm text-gray-500">Vista general de métricas y KPIs</p>
        </div>

        {/* Métricas OKR */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total OKRs</CardTitle>
              <Target className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{okrMetrics?.totalOkrs || 0}</div>
              <p className="text-xs text-gray-500">OKRs activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{okrMetrics?.averageProgress || 0}%</div>
              <p className="text-xs text-gray-500">Avance general</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KRs Completados</CardTitle>
              <Target className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {okrMetrics?.completedKrs || 0} / {okrMetrics?.totalKrs || 0}
              </div>
              <p className="text-xs text-gray-500">Resultados clave</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Pipeline</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(pipelineMetrics?.totalValue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">Valor total estimado</p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline y Marketing */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Valor Total</span>
                  <span className="text-lg font-semibold">
                    ${(pipelineMetrics?.totalValue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Valor Ponderado</span>
                  <span className="text-lg font-semibold">
                    ${(pipelineMetrics?.weightedValue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Oportunidades</span>
                  <span className="text-lg font-semibold">{pipelineMetrics?.totalCount || 0}</span>
                </div>
                {pipelineMetrics?.byStage && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Por Etapa:</div>
                    {Object.entries(pipelineMetrics.byStage).map(([stage, value]: [string, any]) => (
                      <div key={stage} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{stage}</span>
                        <span className="font-medium">${value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Campañas</span>
                  <span className="text-lg font-semibold">
                    {marketingMetrics?.totalCampaigns || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Leads Generados</span>
                  <span className="text-lg font-semibold">
                    {marketingMetrics?.totalLeads || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tasa de Conversión</span>
                  <span className="text-lg font-semibold">
                    {marketingMetrics?.conversionRate?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Presupuesto Total</span>
                  <span className="text-lg font-semibold">
                    ${(marketingMetrics?.totalBudget || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

