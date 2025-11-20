import { IsString, IsEnum, IsDateString, IsNumber, IsOptional } from 'class-validator';
import { CampaignChannel } from '../../common/types/enums';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsEnum(CampaignChannel)
  channel: CampaignChannel;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  ownerId: string;
}

