import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  contactId?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}


