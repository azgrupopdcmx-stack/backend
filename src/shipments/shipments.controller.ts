import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartaPorteAdditionalDto } from './dto/carta-porte-additional.dto';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) { }

  @Post('rates')
  getRates(@Body() createShipmentDto: CreateShipmentDto) {
    return this.shipmentsService.getRates(createShipmentDto);
  }

  @Post('bulk')
  createBulk(@Body() createShipmentDtos: CreateShipmentDto[], @Request() req) {
    return this.shipmentsService.createBulk(createShipmentDtos, req.user.userId);
  }

  @Post()
  create(@Body() createShipmentDto: CreateShipmentDto, @Request() req) {
    return this.shipmentsService.create(createShipmentDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.shipmentsService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.shipmentsService.findOne(id, req.user.userId);
  }

  @Post(':id/label')
  generateLabel(@Param('id') id: string, @Request() req) {
    return this.shipmentsService.generateLabel(id, req.user.userId);
  }

  @Get(':id/tracking')
  getTracking(@Param('id') id: string, @Request() req) {
    return this.shipmentsService.getTracking(id, req.user.userId);
  }

  @Post(':id/carta-porte')
  generateCartaPorte(@Param('id') id: string, @Body() additionalData: CartaPorteAdditionalDto, @Request() req) {
    return this.shipmentsService.generateCartaPorte(id, req.user.userId, additionalData);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShipmentDto: UpdateShipmentDto, @Request() req) {
    return this.shipmentsService.update(id, updateShipmentDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.shipmentsService.remove(id, req.user.userId);
  }
}
