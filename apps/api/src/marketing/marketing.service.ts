import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateCampaignMetricsDto } from './dto/create-campaign-metrics.dto';
import { OpportunityStage } from '../common/types/enums';

@Injectable()
export class MarketingService {
  constructor(private prisma: PrismaService) {}

  async createCampaign(createCampaignDto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: createCampaignDto,
      include: {
        owner: true,
      },
    });
  }

  async findAllCampaigns() {
    return this.prisma.campaign.findMany({
      include: {
        owner: true,
        opportunities: true,
        metrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCampaignById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        owner: true,
        opportunities: {
          include: {
            company: true,
            owner: true,
          },
        },
        metrics: {
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaña con ID ${id} no encontrada`);
    }

    return campaign;
  }

  async updateCampaign(id: string, updateCampaignDto: UpdateCampaignDto) {
    await this.findCampaignById(id);
    return this.prisma.campaign.update({
      where: { id },
      data: updateCampaignDto,
    });
  }

  async deleteCampaign(id: string) {
    await this.findCampaignById(id);
    return this.prisma.campaign.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createMetrics(createMetricsDto: CreateCampaignMetricsDto) {
    return this.prisma.campaignMetrics.create({
      data: createMetricsDto,
      include: {
        campaign: true,
      },
    });
  }

  async getCampaignROI(campaignId: string) {
    const campaign = await this.findCampaignById(campaignId);
    
    const totalSpent = campaign.budget || 0;
    const totalValueWon = campaign.opportunities
      .filter((opp) => opp.stage === OpportunityStage.GANADA)
      .reduce((sum, opp) => sum + opp.estimatedValue, 0);

    const roi = totalSpent > 0 ? ((totalValueWon - totalSpent) / totalSpent) * 100 : 0;

    return {
      campaignId,
      totalSpent,
      totalValueWon,
      roi: Math.round(roi * 100) / 100,
      leadsGenerated: campaign.opportunities.length,
      opportunitiesWon: campaign.opportunities.filter((opp) => opp.stage === OpportunityStage.GANADA).length,
    };
  }

  async getDashboardMetrics() {
    const campaigns = await this.prisma.campaign.findMany({
      include: {
        opportunities: true,
      },
    });

    const totalCampaigns = campaigns.length;
    const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + c.opportunities.length, 0);
    const totalWon = campaigns.reduce(
      (sum, c) => sum + c.opportunities.filter((opp) => opp.stage === OpportunityStage.GANADA).length,
      0,
    );

    return {
      totalCampaigns,
      totalBudget,
      totalLeads,
      totalWon,
      conversionRate: totalLeads > 0 ? (totalWon / totalLeads) * 100 : 0,
    };
  }
}

