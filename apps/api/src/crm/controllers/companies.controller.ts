import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { CrmService } from '../crm.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CreateQuickCustomerDto } from '../dto/create-quick-customer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.crmService.createCompany(createCompanyDto);
  }

  @Post('quick')
  createQuick(@Body() createQuickCustomerDto: CreateQuickCustomerDto) {
    return this.crmService.createQuickCustomer(createQuickCustomerDto);
  }

  @Get()
  findAll() {
    return this.crmService.findAllCompanies();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crmService.findCompanyById(id);
  }

  @Get(':id/journey')
  getCustomerJourney(@Param('id') id: string) {
    return this.crmService.getCustomerJourney('COMPANY', id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.crmService.updateCompany(id, updateCompanyDto);
  }

  @Get('export/csv')
  async exportToCSV(@Res() res: Response) {
    const csv = await this.crmService.exportCompaniesToCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=companies-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.deleteCompany(id);
  }
}


