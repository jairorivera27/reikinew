import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CrmService } from '../crm.service';
import { CreateNoteDto } from '../dto/create-note.dto';
import { UpdateNoteDto } from '../dto/update-note.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  create(@Request() req, @Body() createNoteDto: CreateNoteDto) {
    return this.crmService.createNote(createNoteDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('opportunityId') opportunityId?: string,
    @Query('companyId') companyId?: string,
    @Query('contactId') contactId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.crmService.findAllNotes({ opportunityId, companyId, contactId, userId });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto) {
    return this.crmService.updateNote(id, updateNoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.deleteNote(id);
  }
}


