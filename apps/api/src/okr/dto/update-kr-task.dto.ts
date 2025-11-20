import { PartialType } from '@nestjs/mapped-types';
import { CreateKrTaskDto } from './create-kr-task.dto';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateKrTaskDto extends PartialType(CreateKrTaskDto) {
  @IsDateString()
  @IsOptional()
  completedAt?: string;
}


