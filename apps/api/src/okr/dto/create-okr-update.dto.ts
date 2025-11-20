import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateOkrUpdateDto {
  @IsString()
  okrId: string;

  @IsString()
  @IsOptional()
  krId?: string;

  @IsString()
  userId: string;

  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}



