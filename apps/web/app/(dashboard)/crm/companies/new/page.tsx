'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

export default function NewCompanyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/companies', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      router.push('/crm');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      name: formData.get('name'),
      nit: formData.get('nit') || null,
      sector: formData.get('sector') || null,
      industry: formData.get('industry') || null,
      address: formData.get('address') || null,
      city: formData.get('city') || null,
      country: formData.get('country') || 'Colombia',
      phone: formData.get('phone') || null,
      email: formData.get('email') || null,
      website: formData.get('website') || null,
      notes: formData.get('notes') || null,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Empresa</h1>
          <p className="mt-1 text-sm text-gray-500">Registra una nueva empresa cliente</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información de la Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input id="name" name="name" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nit">NIT</Label>
                  <Input id="nit" name="nit" />
                </div>

                <div>
                  <Label htmlFor="sector">Sector</Label>
                  <Input id="sector" name="sector" />
                </div>
              </div>

              <div>
                <Label htmlFor="industry">Industria</Label>
                <Input id="industry" name="industry" />
              </div>

              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" name="address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" name="city" />
                </div>

                <div>
                  <Label htmlFor="country">País</Label>
                  <Input id="country" name="country" defaultValue="Colombia" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Sitio Web</Label>
                <Input id="website" name="website" type="url" />
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Input id="notes" name="notes" />
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
                  {createMutation.isPending ? 'Creando...' : 'Crear Empresa'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}



