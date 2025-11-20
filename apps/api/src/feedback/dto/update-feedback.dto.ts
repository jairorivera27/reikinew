import { PartialType } from '@nestjs/mapped-types';
import { CreateFeedbackDto } from './create-feedback.dto';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { FeedbackStatus } from '../../common/types/enums';

export class UpdateFeedbackDto extends PartialType(CreateFeedbackDto) {
  @IsString()
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @IsString()
  @IsOptional()
  response?: string;
}


