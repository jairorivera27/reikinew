import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { EntityType, QuoteStatus } from '../common/types/enums';
import { v4 as uuidv4 } from 'uuid';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class QuoteService {
  constructor(
    private prisma: PrismaService,
    private googleDriveService: GoogleDriveService,
  ) {}

  async create(createQuoteDto: CreateQuoteDto) {
    const quoteNumber = `COT-${Date.now()}`;
    const publicToken = uuidv4();

    const { items, ...quoteData } = createQuoteDto;

    const quote = await this.prisma.quote.create({
      data: {
        ...quoteData,
        quoteNumber,
        publicToken,
        items: {
          create: items.map((item, index) => ({
            ...item,
            order: index,
          })),
        },
      },
      include: {
        opportunity: {
          include: {
            company: true,
            contact: true,
          },
        },
        items: true,
      },
    });

    // Generar PDF y subir a Google Drive
    await this.generateAndUploadPDF(quote.id);

    return quote;
  }

  async findAll(filters?: { opportunityId?: string; status?: string }) {
    return this.prisma.quote.findMany({
      where: {
        ...(filters?.opportunityId && { opportunityId: filters.opportunityId }),
        ...(filters?.status && { status: filters.status as any }),
      },
      include: {
        opportunity: {
          include: {
            company: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        opportunity: {
          include: {
            company: true,
            contact: true,
          },
        },
        items: true,
        viewLogs: {
          orderBy: { viewedAt: 'desc' },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    return quote;
  }

  async findByToken(token: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { publicToken: token },
      include: {
        opportunity: {
          include: {
            company: true,
            contact: true,
          },
        },
        items: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Cotización no encontrada');
    }

    // Registrar visualización
    await this.prisma.quoteViewLog.create({
      data: {
        quoteId: quote.id,
      },
    });

    // Actualizar fecha de visualización si es la primera vez
    if (!quote.viewedAt) {
      await this.prisma.quote.update({
        where: { id: quote.id },
        data: { viewedAt: new Date() },
      });
    }

    return quote;
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto) {
    await this.findOne(id);
    
    // Excluir campos que no se pueden actualizar directamente
    const { opportunityId, createdById, items, ...updateData } = updateQuoteDto;
    
    return this.prisma.quote.update({
      where: { id },
      data: updateData,
    });
  }

  async sendQuote(id: string) {
    const quote = await this.findOne(id);
    // Aquí se implementaría el envío por email
    return this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.ENVIADA,
        sentAt: new Date(),
      },
    });
  }

  async generateAndUploadPDF(quoteId: string) {
    const quote = await this.findOne(quoteId);
    const opportunity = quote.opportunity;
    const company = opportunity.company;

    // Generar PDF (simplificado - en producción usar una librería más robusta)
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks);

      // Subir a Google Drive
      const folderPath = `/CRM/CLIENTES/${company.name}/COTIZACIONES/${new Date().getFullYear()}`;
      const fileName = `${quote.quoteNumber}.pdf`;

      await this.googleDriveService.uploadFile({
        fileName,
        mimeType: 'application/pdf',
        fileBuffer: pdfBuffer,
        folderPath,
        entityType: EntityType.QUOTE,
        entityId: quote.id,
      });
    });

    // Contenido del PDF
    doc.fontSize(20).text('COTIZACIÓN', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Número: ${quote.quoteNumber}`);
    doc.text(`Cliente: ${company.name}`);
    doc.text(`Fecha: ${quote.createdAt.toLocaleDateString()}`);
    doc.moveDown();

    // Items
    doc.fontSize(14).text('Ítems:', { underline: true });
    quote.items.forEach((item) => {
      doc.fontSize(10).text(`${item.description} - Cant: ${item.quantity} - $${item.unitPrice}`);
    });

    doc.moveDown();
    doc.fontSize(12).text(`Subtotal: $${quote.subtotal}`);
    doc.text(`Impuestos: $${quote.tax}`);
    doc.text(`Descuento: $${quote.discount}`);
    doc.fontSize(14).text(`Total: $${quote.total}`, { underline: true });

    doc.end();
  }
}

