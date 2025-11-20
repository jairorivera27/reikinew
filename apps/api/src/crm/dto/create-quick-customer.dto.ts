import { IsString, IsOptional } from 'class-validator';

export class CreateQuickCustomerDto {
  @IsString()
  companyName: string;

  @IsString()
  contactName: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}


