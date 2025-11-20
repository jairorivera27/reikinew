import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CrmService } from '../crm.service';
import { CreateActivityDto } from '../dto/create-activity.dto';
import { UpdateActivityDto } from '../dto/update-activity.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.crmService.createActivity(createActivityDto);
  }

  @Get()
  findAll(
    @Query('opportunityId') opportunityId?: string,
    @Query('userId') userId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.crmService.findAllActivities({ opportunityId, userId, companyId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crmService.findActivityById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActivityDto: UpdateActivityDto) {
    return this.crmService.updateActivity(id, updateActivityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.deleteActivity(id);
  }
}



