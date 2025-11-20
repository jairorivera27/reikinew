import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ContractStatus, PaymentStatus } from '../../common/types/enums';

export class CreateContractDto {
  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @IsNumber()
  finalValue: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  createdById: string;
}

