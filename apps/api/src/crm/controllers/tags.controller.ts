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
} from '@nestjs/common';
import { CrmService } from '../crm.service';
import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  create(@Body() createTagDto: CreateTagDto) {
    return this.crmService.createTag(createTagDto);
  }

  @Get()
  findAll() {
    return this.crmService.findAllTags();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crmService.findTagById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.crmService.updateTag(id, updateTagDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.deleteTag(id);
  }

  @Post(':id/assign/opportunity/:opportunityId')
  assignToOpportunity(@Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.crmService.assignTagToOpportunity(id, opportunityId);
  }

  @Post(':id/assign/company/:companyId')
  assignToCompany(@Param('id') id: string, @Param('companyId') companyId: string) {
    return this.crmService.assignTagToCompany(id, companyId);
  }

  @Post(':id/assign/contact/:contactId')
  assignToContact(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.crmService.assignTagToContact(id, contactId);
  }

  @Delete(':id/unassign/opportunity/:opportunityId')
  unassignFromOpportunity(@Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.crmService.unassignTagFromOpportunity(id, opportunityId);
  }

  @Delete(':id/unassign/company/:companyId')
  unassignFromCompany(@Param('id') id: string, @Param('companyId') companyId: string) {
    return this.crmService.unassignTagFromCompany(id, companyId);
  }

  @Delete(':id/unassign/contact/:contactId')
  unassignFromContact(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.crmService.unassignTagFromContact(id, contactId);
  }
}



