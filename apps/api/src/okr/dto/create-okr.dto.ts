import { IsString, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';
import { AreaEnum, OKRPeriod } from '../../common/types/enums';

export class CreateOkrDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  description?: string;

  @IsEnum(AreaEnum)
  area: AreaEnum;

  @IsEnum(OKRPeriod)
  period: OKRPeriod;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;
}

