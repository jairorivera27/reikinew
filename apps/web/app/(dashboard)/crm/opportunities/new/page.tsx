'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';

export default function NewOpportunityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get('/companies');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/opportunities', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      router.push('/crm');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    createMutation.mutate({
      companyId: formData.get('companyId'),
      contactId: formData.get('contactId') || null,
      name: formData.get('name'),
      description: formData.get('description'),
      estimatedValue: parseFloat(formData.get('estimatedValue') as string),
      probability: parseInt(formData.get('probability') as string) || 0,
      stage: formData.get('stage') || 'LEAD',
      source: formData.get('source') || null,
      expectedCloseDate: formData.get('expectedCloseDate') || null,
      ownerId: user.id,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Oportunidad</h1>
          <p className="mt-1 text-sm text-gray-500">Crea una nueva oportunidad de venta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información de la Oportunidad</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="companyId">Empresa *</Label>
                <Select id="companyId" name="companyId" required>
                  <option value="">Seleccionar empresa...</option>
                  {companies?.map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Nombre de la Oportunidad *</Label>
                <Input id="name" name="name" required />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input id="description" name="description" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedValue">Valor Estimado *</Label>
                  <Input
                    id="estimatedValue"
                    name="estimatedValue"
                    type="number"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="probability">Probabilidad (%)</Label>
                  <Input
                    id="probability"
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stage">Etapa</Label>
                  <Select id="stage" name="stage">
                    <option value="LEAD">Lead</option>
                    <option value="CONTACTADO">Contactado</option>
                    <option value="DIAGNOSTICO">Diagnóstico</option>
                    <option value="PROPUESTA_ENVIADA">Propuesta Enviada</option>
                    <option value="NEGOCIACION">Negociación</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="source">Origen</Label>
                  <Select id="source" name="source">
                    <option value="">Seleccionar...</option>
                    <option value="WEB">Web</option>
                    <option value="REFERIDO">Referido</option>
                    <option value="CAMPAÑA">Campaña</option>
                    <option value="EVENTO">Evento</option>
                    <option value="REDES_SOCIALES">Redes Sociales</option>
                    <option value="LLAMADA_DIRECTA">Llamada Directa</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="expectedCloseDate">Fecha Estimada de Cierre</Label>
                <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creando...' : 'Crear Oportunidad'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}



