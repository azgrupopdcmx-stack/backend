import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rules')
@UseGuards(JwtAuthGuard)
export class RulesController {
  constructor(private readonly rulesService: RulesService) { }

  @Post()
  create(@Body() createRuleDto: CreateRuleDto, @Request() req) {
    return this.rulesService.create(createRuleDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.rulesService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.rulesService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRuleDto: UpdateRuleDto, @Request() req) {
    return this.rulesService.update(id, updateRuleDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.rulesService.remove(id, req.user.userId);
  }
}
