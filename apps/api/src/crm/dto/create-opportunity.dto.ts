import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { OpportunityStage, LeadSource } from '../../common/types/enums';

export class CreateOpportunityDto {
  @IsString()
  companyId: string;

  @IsString()
  @IsOptional()
  contactId?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  estimatedValue: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @IsEnum(OpportunityStage)
  @IsOptional()
  stage?: OpportunityStage;

  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsDateString()
  @IsOptional()
  expectedCloseDate?: string;

  @IsString()
  ownerId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

