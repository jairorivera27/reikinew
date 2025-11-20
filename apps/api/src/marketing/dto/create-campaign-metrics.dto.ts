import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateCampaignMetricsDto {
  @IsString()
  campaignId: string;

  @IsNumber()
  @IsOptional()
  leadsGenerated?: number;

  @IsNumber()
  @IsOptional()
  opportunitiesGenerated?: number;

  @IsNumber()
  @IsOptional()
  opportunitiesWon?: number;

  @IsNumber()
  @IsOptional()
  totalValueWon?: number;
}



