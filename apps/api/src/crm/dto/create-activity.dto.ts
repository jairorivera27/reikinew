import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ActivityType } from '../../common/types/enums';

export class CreateActivityDto {
  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  contactId?: string;

  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsDateString()
  @IsOptional()
  completedDate?: string;

  @IsString()
  @IsOptional()
  result?: string;

  @IsString()
  userId: string;
}

