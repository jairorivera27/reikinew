import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CrmService } from '../crm.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  globalSearch(@Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return { companies: [], contacts: [], opportunities: [], total: 0 };
    }
    return this.crmService.globalSearch(query);
  }
}



