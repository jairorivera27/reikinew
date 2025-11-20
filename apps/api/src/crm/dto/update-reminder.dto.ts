import { PartialType } from '@nestjs/mapped-types';
import { CreateReminderDto } from './create-reminder.dto';
import { IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class UpdateReminderDto extends PartialType(CreateReminderDto) {
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @IsDateString()
  @IsOptional()
  completedAt?: string;
}


