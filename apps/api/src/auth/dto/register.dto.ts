import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  roleIds?: string[];
}



