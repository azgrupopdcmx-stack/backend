import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { EstafetaService } from './estafeta.service';
import { CarrierAddress, CarrierPackage, CreateShipmentRequest } from '../carrier.interface';
import { CircuitBreaker } from '../../utils/circuit-breaker.util';

const breaker = new CircuitBreaker(3, 2000);

@Controller('api')
export class EstafetaController {
    constructor(private readonly estafeta: EstafetaService) { }

    @Post('rates')
    async getRates(@Body() payload: { origin: CarrierAddress; destination: CarrierAddress; packages: CarrierPackage[] }) {
        return breaker.execute(() => this.estafeta.getRates(payload.origin, payload.destination, payload.packages));
    }

    @Post('shipments')
    async createShipment(@Body() payload: {
        origin: CarrierAddress;
        destination: CarrierAddress;
        packages: CarrierPackage[];
        service: string;
        reference?: string;
        instructions?: string;
    }) {
        const request: CreateShipmentRequest = {
            origin: payload.origin,
            destination: payload.destination,
            packages: payload.packages,
            service: payload.service,
            reference: payload.reference,
            instructions: payload.instructions,
        };
        return breaker.execute(() => this.estafeta.createShipment(request));
    }

    @Get('shipments/:id/tracking')
    async getTracking(@Param('id') trackingNumber: string) {
        return breaker.execute(() => this.estafeta.getTracking(trackingNumber));
    }
}
