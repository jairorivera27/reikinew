import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post('from-opportunity/:opportunityId')
  createFromOpportunity(
    @Param('opportunityId') opportunityId: string,
    @Body() createContractDto: CreateContractDto,
  ) {
    return this.contractService.createFromOpportunity(opportunityId, createContractDto);
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('paymentStatus') paymentStatus?: string) {
    return this.contractService.findAll({ status, paymentStatus });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto) {
    return this.contractService.update(id, updateContractDto);
  }
}



