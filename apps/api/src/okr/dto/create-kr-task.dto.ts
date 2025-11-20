import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { TaskStatus } from '../../common/types/enums';

export class CreateKrTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsNumber()
  @IsOptional()
  order?: number;
}


