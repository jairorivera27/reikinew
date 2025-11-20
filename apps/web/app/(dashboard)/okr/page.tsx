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
import { Plus, Target, TrendingUp } from 'lucide-react';

export default function OKRPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: okrs, isLoading } = useQuery({
    queryKey: ['okrs'],
    queryFn: async () => {
      const res = await api.get('/okr');
      return res.data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ['okr-dashboard'],
    queryFn: async () => {
      const res = await api.get('/okr/dashboard');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/okr', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okrs'] });
      setShowCreateForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    createMutation.mutate({
      title: formData.get('title'),
      description: formData.get('description'),
      area: formData.get('area'),
      period: formData.get('period'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      ownerId: user.id,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-700 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Cargando OKRs...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">OKR</h1>
            <p className="mt-1 text-sm text-gray-500">Objetivos y Resultados Clave</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo OKR
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total OKRs</CardTitle>
              <Target className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalOkrs || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.averageProgress || 0}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KRs Completados</CardTitle>
              <Target className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.completedKrs || 0} / {metrics?.totalKrs || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulario de creación */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo OKR</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título del Objetivo</Label>
                  <Input id="title" name="title" required />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Input id="description" name="description" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="area">Área</Label>
                    <Select id="area" name="area" required>
                      <option value="">Seleccionar...</option>
                      <option value="COMERCIAL">Comercial</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="ADMINISTRATIVA">Administrativa</option>
                      <option value="DIRECCION">Dirección</option>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="period">Período</Label>
                    <Select id="period" name="period" required>
                      <option value="">Seleccionar...</option>
                      <option value="ANUAL">Anual</option>
                      <option value="TRIMESTRAL">Trimestral</option>
                      <option value="MENSUAL">Mensual</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Fecha Inicio</Label>
                    <Input id="startDate" name="startDate" type="date" required />
                  </div>

                  <div>
                    <Label htmlFor="endDate">Fecha Fin</Label>
                    <Input id="endDate" name="endDate" type="date" required />
                  </div>
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
                    {createMutation.isPending ? 'Creando...' : 'Crear OKR'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de OKRs */}
        <div className="space-y-4">
          {okrs?.map((okr: any) => (
            <Card key={okr.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{okr.title}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{okr.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                      {okr.area}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      {okr.period}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {okr.keyResults?.map((kr: any) => {
                    const progress =
                      kr.targetValue && kr.currentValue
                        ? (kr.currentValue / kr.targetValue) * 100
                        : 0;
                    return (
                      <div key={kr.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{kr.title}</span>
                          <span className="font-medium">
                            {kr.currentValue || 0} / {kr.targetValue || 0} {kr.unit || ''}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {(!okrs || okrs.length === 0) && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No hay OKRs creados. Crea tu primer OKR para comenzar.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

