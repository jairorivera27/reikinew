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
  ForbiddenException,
} from '@nestjs/common';
import { OkrService } from './okr.service';
import { CreateOkrDto } from './dto/create-okr.dto';
import { UpdateOkrDto } from './dto/update-okr.dto';
import { CreateKeyResultDto } from './dto/create-key-result.dto';
import { UpdateKeyResultDto } from './dto/update-key-result.dto';
import { CreateOkrUpdateDto } from './dto/create-okr-update.dto';
import { CreateKrTaskDto } from './dto/create-kr-task.dto';
import { UpdateKrTaskDto } from './dto/update-kr-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AreaEnum } from '../common/types/enums';

@Controller('okr')
@UseGuards(JwtAuthGuard)
export class OkrController {
  constructor(private readonly okrService: OkrService) {}

  /**
   * Obtiene el área correspondiente al rol del usuario
   * ADMIN puede ver todo (retorna null)
   */
  private getUserArea(roles: string[]): string | null {
    // ADMIN puede ver todo
    if (roles.includes('ADMIN')) {
      return null;
    }

    // Mapeo de roles a áreas
    const roleToArea: Record<string, string> = {
      COMERCIAL: AreaEnum.COMERCIAL,
      MARKETING: AreaEnum.MARKETING,
      ADMINISTRATIVO: AreaEnum.ADMINISTRATIVO,
      DIRECCION: AreaEnum.DIRECCION,
    };

    // Buscar el primer rol que tenga un área asociada
    for (const role of roles) {
      if (roleToArea[role]) {
        return roleToArea[role];
      }
    }

    return null;
  }

  @Post()
  create(@Request() req, @Body() createOkrDto: CreateOkrDto) {
    const userRoles = req.user?.roles || [];
    const userArea = this.getUserArea(userRoles);

    // Si el usuario no es ADMIN, forzar que el OKR sea de su área
    if (userArea !== null) {
      createOkrDto.area = userArea as any;
    }

    return this.okrService.create(createOkrDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('area') area?: string,
    @Query('period') period?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    const userRoles = req.user?.roles || [];
    const userArea = this.getUserArea(userRoles);

    // Si el usuario no es ADMIN, forzar el filtro por su área
    // (a menos que el query param area sea explícitamente el mismo)
    const finalArea = userArea !== null ? userArea : area;

    return this.okrService.findAll({ area: finalArea, period, ownerId });
  }

  @Get('dashboard')
  getDashboardMetrics(@Request() req, @Query('area') area?: string) {
    const userRoles = req.user?.roles || [];
    const userArea = this.getUserArea(userRoles);

    // Si el usuario no es ADMIN, forzar el filtro por su área
    const finalArea = userArea !== null ? userArea : area;

    return this.okrService.getDashboardMetrics(finalArea);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const okr = await this.okrService.findOne(id);
    const userRoles = req.user?.roles || [];
    const userArea = this.getUserArea(userRoles);

    // Si el usuario no es ADMIN, verificar que el OKR pertenezca a su área
    if (userArea !== null && okr.area !== userArea) {
      throw new ForbiddenException('No tienes permiso para ver este OKR');
    }

    return okr;
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() updateOkrDto: UpdateOkrDto) {
    const okr = await this.okrService.findOne(id);
    const userRoles = req.user?.roles || [];
    const userArea = this.getUserArea(userRoles);

    // Si el usuario no es ADMIN, verificar que el OKR pertenezca a su área
    if (userArea !== null && okr.area !== userArea) {
      throw new ForbiddenException('No tienes permiso para modificar este OKR');
    }

    return this.okrService.update(id, updateOkrDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const okr = await this.okrService.findOne(id);
    const userRoles = req.user?.roles || [];
    const userArea = this.getUserArea(userRoles);

    // Si el usuario no es ADMIN, verificar que el OKR pertenezca a su área
    if (userArea !== null && okr.area !== userArea) {
      throw new ForbiddenException('No tienes permiso para eliminar este OKR');
    }

    return this.okrService.remove(id);
  }

  // Key Results
  @Post(':okrId/key-results')
  createKeyResult(@Param('okrId') okrId: string, @Body() createKeyResultDto: CreateKeyResultDto) {
    return this.okrService.createKeyResult(okrId, createKeyResultDto);
  }

  @Patch('key-results/:id')
  updateKeyResult(@Param('id') id: string, @Body() updateKeyResultDto: UpdateKeyResultDto) {
    return this.okrService.updateKeyResult(id, updateKeyResultDto);
  }

  @Delete('key-results/:id')
  deleteKeyResult(@Param('id') id: string) {
    return this.okrService.deleteKeyResult(id);
  }

  // Updates
  @Post('updates')
  createUpdate(@Body() createOkrUpdateDto: CreateOkrUpdateDto) {
    return this.okrService.createUpdate(createOkrUpdateDto);
  }

  // KR Tasks
  @Post('key-results/:krId/tasks')
  createKrTask(@Param('krId') krId: string, @Body() createKrTaskDto: CreateKrTaskDto) {
    return this.okrService.createKrTask(krId, createKrTaskDto);
  }

  @Patch('tasks/:id')
  updateKrTask(@Param('id') id: string, @Body() updateKrTaskDto: UpdateKrTaskDto) {
    return this.okrService.updateKrTask(id, updateKrTaskDto);
  }

  @Delete('tasks/:id')
  deleteKrTask(@Param('id') id: string) {
    return this.okrService.deleteKrTask(id);
  }
}


