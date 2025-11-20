import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.create(createQuoteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('opportunityId') opportunityId?: string, @Query('status') status?: string) {
    return this.quoteService.findAll({ opportunityId, status });
  }

  @Get('public/:token')
  findByToken(@Param('token') token: string) {
    return this.quoteService.findByToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto) {
    return this.quoteService.update(id, updateQuoteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send')
  @HttpCode(200)
  sendQuote(@Param('id') id: string) {
    return this.quoteService.sendQuote(id);
  }
}



