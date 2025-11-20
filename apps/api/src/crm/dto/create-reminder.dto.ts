import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  contactId?: string;
}


