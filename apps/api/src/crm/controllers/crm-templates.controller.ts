import {
  Controller,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CrmTemplatesService } from '../crm-templates.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('crm/templates')
@UseGuards(JwtAuthGuard)
export class CrmTemplatesController {
  constructor(private readonly templatesService: CrmTemplatesService) {}

  @Post('customer-journey/:opportunityId')
  createCustomerJourneyTasks(@Request() req, @Param('opportunityId') opportunityId: string) {
    return this.templatesService.createCustomerJourneyTasks(opportunityId, req.user.userId);
  }

  @Post('secure-business/:opportunityId')
  createBusinessSecuringTasks(@Request() req, @Param('opportunityId') opportunityId: string) {
    return this.templatesService.createBusinessSecuringTasks(opportunityId, req.user.userId);
  }

  @Post('follow-up/:opportunityId')
  createFollowUpReminders(@Request() req, @Param('opportunityId') opportunityId: string) {
    return this.templatesService.createFollowUpReminders(opportunityId, req.user.userId);
  }
}


