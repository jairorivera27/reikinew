import { PartialType } from '@nestjs/mapped-types';
import { CreateOkrDto } from './create-okr.dto';

export class UpdateOkrDto extends PartialType(CreateOkrDto) {}



