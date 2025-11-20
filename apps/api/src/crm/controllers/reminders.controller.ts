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
} from '@nestjs/common';
import { CrmService } from '../crm.service';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { UpdateReminderDto } from '../dto/update-reminder.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  create(@Request() req, @Body() createReminderDto: CreateReminderDto) {
    return this.crmService.createReminder(createReminderDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('opportunityId') opportunityId?: string,
    @Query('companyId') companyId?: string,
    @Query('contactId') contactId?: string,
    @Query('userId') userId?: string,
    @Query('isCompleted') isCompleted?: string,
  ) {
    return this.crmService.findAllReminders({
      opportunityId,
      companyId,
      contactId,
      userId,
      isCompleted: isCompleted === 'true' ? true : isCompleted === 'false' ? false : undefined,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReminderDto: UpdateReminderDto) {
    return this.crmService.updateReminder(id, updateReminderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.deleteReminder(id);
  }
}


