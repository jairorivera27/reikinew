import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { CrmService } from '../crm.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  create(@Body() createContactDto: CreateContactDto) {
    return this.crmService.createContact(createContactDto);
  }

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.crmService.findAllContacts(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crmService.findContactById(id);
  }

  @Get(':id/journey')
  getCustomerJourney(@Param('id') id: string) {
    return this.crmService.getCustomerJourney('CONTACT', id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.crmService.updateContact(id, updateContactDto);
  }

  @Get('export/csv')
  async exportToCSV(@Query('companyId') companyId: string | undefined, @Res() res: Response) {
    const csv = await this.crmService.exportContactsToCSV(companyId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=contacts-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.deleteContact(id);
  }
}


