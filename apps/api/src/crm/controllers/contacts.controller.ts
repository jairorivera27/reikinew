import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.deleteContact(id);
  }
}


