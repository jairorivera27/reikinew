import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateCampaignMetricsDto } from './dto/create-campaign-metrics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('marketing')
@UseGuards(JwtAuthGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Post('campaigns')
  createCampaign(@Body() createCampaignDto: CreateCampaignDto) {
    return this.marketingService.createCampaign(createCampaignDto);
  }

  @Get('campaigns')
  findAllCampaigns() {
    return this.marketingService.findAllCampaigns();
  }

  @Get('campaigns/:id')
  findCampaignById(@Param('id') id: string) {
    return this.marketingService.findCampaignById(id);
  }

  @Get('campaigns/:id/roi')
  getCampaignROI(@Param('id') id: string) {
    return this.marketingService.getCampaignROI(id);
  }

  @Patch('campaigns/:id')
  updateCampaign(@Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
    return this.marketingService.updateCampaign(id, updateCampaignDto);
  }

  @Delete('campaigns/:id')
  deleteCampaign(@Param('id') id: string) {
    return this.marketingService.deleteCampaign(id);
  }

  @Post('metrics')
  createMetrics(@Body() createMetricsDto: CreateCampaignMetricsDto) {
    return this.marketingService.createMetrics(createMetricsDto);
  }

  @Get('dashboard')
  getDashboardMetrics() {
    return this.marketingService.getDashboardMetrics();
  }
}



