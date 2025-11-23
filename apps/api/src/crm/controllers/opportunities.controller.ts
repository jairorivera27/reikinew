import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CrmService } from '../crm.service';
import { CreateOpportunityDto } from '../dto/create-opportunity.dto';
import { UpdateOpportunityDto } from '../dto/update-opportunity.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  create(@Body() createOpportunityDto: CreateOpportunityDto) {
    return this.crmService.createOpportunity(createOpportunityDto);
  }

  @Get()
  findAll(
    @Query('stage') stage?: string,
    @Query('ownerId') ownerId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.crmService.findAllOpportunities({ stage, ownerId, companyId });
  }

  @Get('pipeline/metrics')
  getPipelineMetrics() {
    return this.crmService.getPipelineMetrics();
  }

  @Get('forecast')
  getForecast(@Query('period') period?: 'MONTHLY' | 'QUARTERLY') {
    return this.crmService.getForecast(period || 'MONTHLY');
  }

  @Get('sales-cycle/analysis')
  getSalesCycleAnalysis() {
    return this.crmService.getSalesCycleAnalysis();
  }

  @Get('metrics/quotes')
  getQuoteMetrics() {
    return this.crmService.getQuoteMetrics();
  }

  @Get('metrics/emails')
  getEmailMetrics() {
    return this.crmService.getEmailMetrics();
  }

  @Get('metrics/prospects')
  getProspectMetrics() {
    return this.crmService.getProspectMetrics();
  }

  @Get('metrics/customers')
  getCustomerMetrics() {
    return this.crmService.getCustomerMetrics();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crmService.findOpportunityById(id);
  }

  @Get(':id/journey')
  getCustomerJourney(@Param('id') id: string) {
    return this.crmService.getCustomerJourney('OPPORTUNITY', id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateOpportunityDto: UpdateOpportunityDto) {
    return this.crmService.updateOpportunity(id, updateOpportunityDto, req.user?.userId);
  }

  @Get(':id/audit-log')
  getAuditLog(@Param('id') id: string) {
    return this.crmService.getAuditLog('OPPORTUNITY', id);
  }

  @Get('export/csv')
  async exportToCSV(
    @Query('stage') stage?: string,
    @Query('ownerId') ownerId?: string,
    @Query('companyId') companyId?: string,
    @Res() res: Response,
  ) {
    const csv = await this.crmService.exportOpportunitiesToCSV({ stage, ownerId, companyId });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=opportunities-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.deleteOpportunity(id);
  }
}


