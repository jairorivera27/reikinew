import { IsString, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuoteItemDto {
  @IsString()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  subtotal: number;
}

export class CreateQuoteDto {
  @IsString()
  opportunityId: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  @IsOptional()
  tax?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  total: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  createdById: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items: CreateQuoteItemDto[];
}



