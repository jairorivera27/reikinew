import { IsString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { KRType } from '../../common/types/enums';

export class CreateKeyResultDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(KRType)
  type: KRType;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @IsString()
  @IsOptional()
  unit?: string;
}

