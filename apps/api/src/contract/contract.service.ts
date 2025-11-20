import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { EntityType, OpportunityStage } from '../common/types/enums';

@Injectable()
export class ContractService {
  constructor(
    private prisma: PrismaService,
    private googleDriveService: GoogleDriveService,
  ) {}

  async createFromOpportunity(opportunityId: string, createContractDto: CreateContractDto) {
    // Verificar que la oportunidad existe y está en estado GANADA
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        company: true,
        contact: true,
      },
    });

    if (!opportunity) {
      throw new NotFoundException(`Oportunidad con ID ${opportunityId} no encontrada`);
    }
    
    if (opportunity.stage !== OpportunityStage.GANADA) {
      throw new BadRequestException('La oportunidad debe estar en estado GANADA para crear un contrato');
    }

    // Verificar que no existe ya un contrato para esta oportunidad
    const existingContract = await this.prisma.contract.findUnique({
      where: { opportunityId },
    });

    if (existingContract) {
      throw new BadRequestException('Ya existe un contrato para esta oportunidad');
    }

    const contractNumber = `CT-${Date.now()}`;

    const contract = await this.prisma.contract.create({
      data: {
        ...createContractDto,
        opportunityId,
        contractNumber,
      },
      include: {
        opportunity: {
          include: {
            company: true,
            contact: true,
          },
        },
        creator: true,
      },
    });

    // Generar documento de contrato y subir a Google Drive
    await this.generateAndUploadContract(contract.id);

    // Crear tarea administrativa
    await this.prisma.adminTask.create({
      data: {
        contractId: contract.id,
        title: `Revisar contrato ${contractNumber}`,
        description: `Contrato generado desde oportunidad ${opportunity.name}`,
        assignedToId: createContractDto.createdById, // Por ahora al creador, luego se puede asignar a un admin
      },
    });

    return contract;
  }

  async findAll(filters?: { status?: string; paymentStatus?: string }) {
    return this.prisma.contract.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.paymentStatus && { paymentStatus: filters.paymentStatus as any }),
      },
      include: {
        opportunity: {
          include: {
            company: true,
          },
        },
        creator: true,
        adminTasks: {
          include: {
            assignee: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        opportunity: {
          include: {
            company: true,
            contact: true,
            quotes: true,
          },
        },
        creator: true,
        adminTasks: {
          include: {
            assignee: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contrato con ID ${id} no encontrado`);
    }

    return contract;
  }

  async update(id: string, updateContractDto: UpdateContractDto) {
    await this.findOne(id);
    return this.prisma.contract.update({
      where: { id },
      data: updateContractDto,
    });
  }

  async generateAndUploadContract(contractId: string) {
    const contract = await this.findOne(contractId);
    const opportunity = contract.opportunity;
    const company = opportunity.company;

    // Generar documento de contrato (simplificado)
    // En producción usar una plantilla más robusta con docx
    const contractContent = `
CONTRATO DE SERVICIOS
Número: ${contract.contractNumber}
Cliente: ${company.name}
Valor: $${contract.finalValue}
Alcance: ${contract.scope || 'Ver documento completo'}
    `;

    const buffer = Buffer.from(contractContent, 'utf-8');

    // Subir a Google Drive
    const folderPath = `/ADMINISTRATIVO/CONTRATOS/${new Date().getFullYear()}`;
    const fileName = `${company.name}_${contract.contractNumber}.txt`;

    await this.googleDriveService.uploadFile({
      fileName,
      mimeType: 'text/plain',
      fileBuffer: buffer,
      folderPath,
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
    });
  }
}

