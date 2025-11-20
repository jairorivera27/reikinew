import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { FeedbackStatus, FeedbackProcess, AreaEnum } from '../../common/types/enums';

export class CreateFeedbackDto {
  @IsString()
  @IsEnum(FeedbackProcess)
  @IsNotEmpty()
  process: FeedbackProcess;

  @IsString()
  @IsEnum(AreaEnum)
  @IsOptional()
  area?: AreaEnum;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @IsString()
  @IsNotEmpty()
  recipientId: string; // Usuario destinatario
}


