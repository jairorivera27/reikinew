'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import { Plus, TrendingUp, DollarSign, Users } from 'lucide-react';
import Link from 'next/link';

export default function MarketingPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get('/marketing/campaigns');
      return res.data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ['marketing-dashboard'],
    queryFn: async () => {
      const res = await api.get('/marketing/dashboard');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/marketing/campaigns', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCreateForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    createMutation.mutate({
      name: formData.get('name'),
      channel: formData.get('channel'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate') || null,
      objective: formData.get('objective') || null,
      budget: formData.get('budget') ? parseFloat(formData.get('budget') as string) : null,
      ownerId: user.id,
    });
  };

  if (isLoading) {
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketing</h1>
            <p className="mt-1 text-sm text-gray-500">Gestión de campañas y métricas</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Campaña
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campañas</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalCampaigns || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(metrics?.totalBudget || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Generados</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalLeads || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa Conversión</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.conversionRate?.toFixed(1) || 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulario de creación */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Campaña</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre de la Campaña</Label>
                  <Input id="name" name="name" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="channel">Canal</Label>
                    <Select id="channel" name="channel" required>
                      <option value="">Seleccionar...</option>
                      <option value="EMAIL">Email</option>
                      <option value="REDES_SOCIALES">Redes Sociales</option>
                      <option value="EVENTO">Evento</option>
                      <option value="REFERIDOS">Referidos</option>
                      <option value="WEB">Web</option>
                      <option value="GOOGLE_ADS">Google Ads</option>
                      <option value="FACEBOOK_ADS">Facebook Ads</option>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="budget">Presupuesto</Label>
                    <Input id="budget" name="budget" type="number" step="0.01" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Fecha Inicio</Label>
                    <Input id="startDate" name="startDate" type="date" required />
                  </div>

                  <div>
                    <Label htmlFor="endDate">Fecha Fin</Label>
                    <Input id="endDate" name="endDate" type="date" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="objective">Objetivo</Label>
                  <Input id="objective" name="objective" />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creando...' : 'Crear Campaña'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Campañas */}
        <div className="space-y-4">
          {campaigns?.map((campaign: any) => {
            const leads = campaign.opportunities?.length || 0;
            const won = campaign.opportunities?.filter((opp: any) => opp.stage === 'GANADO')
              .length || 0;
            const totalValue = campaign.opportunities
              ?.filter((opp: any) => opp.stage === 'GANADO')
              .reduce((sum: number, opp: any) => sum + opp.estimatedValue, 0) || 0;
            const roi =
              campaign.budget && campaign.budget > 0
                ? ((totalValue - campaign.budget) / campaign.budget) * 100
                : 0;

            return (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{campaign.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{campaign.objective}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                        {campaign.channel}
                      </span>
                      {campaign.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Presupuesto</div>
                      <div className="text-lg font-semibold">
                        ${(campaign.budget || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Leads</div>
                      <div className="text-lg font-semibold">{leads}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Ganados</div>
                      <div className="text-lg font-semibold">{won}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">ROI</div>
                      <div
                        className={`text-lg font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {roi.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(!campaigns || campaigns.length === 0) && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No hay campañas creadas. Crea tu primera campaña para comenzar.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
