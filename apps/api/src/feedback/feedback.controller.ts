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
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Request() req, @Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.create(createFeedbackDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    const userRoles = req.user?.roles || [];
    return this.feedbackService.findAll(req.user.userId, userRoles);
  }

  @Get('metrics')
  getMetrics(@Request() req, @Query('area') area?: string) {
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('ADMIN');

    // Solo admin puede ver métricas
    if (!isAdmin) {
      throw new ForbiddenException('Solo los administradores pueden ver las métricas de feedback');
    }

    return this.feedbackService.getFeedbackMetrics(area);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    const userRoles = req.user?.roles || [];
    return this.feedbackService.findOne(id, req.user.userId, userRoles);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
  ) {
    const userRoles = req.user?.roles || [];
    return this.feedbackService.update(id, updateFeedbackDto, req.user.userId, userRoles);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    const userRoles = req.user?.roles || [];
    return this.feedbackService.remove(id, req.user.userId, userRoles);
  }
}


