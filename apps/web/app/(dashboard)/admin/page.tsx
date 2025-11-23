'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { FileText, DollarSign, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const { data: contracts, isLoading, error } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const res = await api.get('/contracts');
      return res.data;
    },
    retry: 1,
  });

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

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">Error al cargar los contratos</p>
            <p className="mt-2 text-sm text-gray-500">
              Por favor, intenta recargar la página
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const statusLabels: Record<string, string> = {
    BORRADOR: 'Borrador',
    ENVIADO: 'Enviado',
    APROBADO: 'Aprobado',
    FIRMADO: 'Firmado',
    CANCELADO: 'Cancelado',
  };

  const paymentStatusLabels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    PARCIAL: 'Parcial',
    PAGADO: 'Pagado',
  };

  const statusColors: Record<string, string> = {
    BORRADOR: 'bg-gray-100 text-gray-800',
    ENVIADO: 'bg-blue-100 text-blue-800',
    APROBADO: 'bg-yellow-100 text-yellow-800',
    FIRMADO: 'bg-green-100 text-green-800',
    CANCELADO: 'bg-red-100 text-red-800',
  };

  const totalValue = contracts?.reduce((sum: number, c: any) => sum + c.finalValue, 0) || 0;
  const pendingValue = contracts?.filter((c: any) => c.paymentStatus === 'PENDIENTE')
    .reduce((sum: number, c: any) => sum + c.finalValue, 0) || 0;
  const paidValue = contracts?.filter((c: any) => c.paymentStatus === 'PAGADO')
    .reduce((sum: number, c: any) => sum + c.finalValue, 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
          <p className="mt-1 text-sm text-gray-500">Gestión de contratos y facturación</p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contratos</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${pendingValue.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagado</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${paidValue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Contratos */}
        <div className="space-y-4">
          {contracts?.map((contract: any) => (
            <Card
              key={contract.id}
              className="cursor-pointer hover:shadow-lg transition"
              onClick={() => (window.location.href = `/admin/contracts/${contract.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{contract.contractNumber}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {contract.opportunity?.company?.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${statusColors[contract.status]}`}
                    >
                      {statusLabels[contract.status]}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        contract.paymentStatus === 'PAGADO'
                          ? 'bg-green-100 text-green-800'
                          : contract.paymentStatus === 'PARCIAL'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {paymentStatusLabels[contract.paymentStatus]}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Valor</div>
                    <div className="text-lg font-semibold">
                      ${contract.finalValue.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Fecha Creación</div>
                    <div className="text-sm font-medium">
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Factura</div>
                    <div className="text-sm font-medium">
                      {contract.invoiceNumber || 'Sin factura'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Tareas</div>
                    <div className="text-sm font-medium">
                      {contract.adminTasks?.length || 0} tareas
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!contracts || contracts.length === 0) && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No hay contratos registrados. Los contratos se generan automáticamente cuando una
                oportunidad pasa a estado "Ganado".
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
