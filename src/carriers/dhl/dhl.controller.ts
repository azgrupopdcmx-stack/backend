import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DHLService } from './dhl.service';
import { CarrierAddress, CarrierPackage, CreateShipmentRequest } from '../carrier.interface';
import { CircuitBreaker } from '../../utils/circuit-breaker.util';

const breaker = new CircuitBreaker(3, 2000);

@Controller('api/dhl')
export class DHLController {
    constructor(private readonly dhl: DHLService) { }

    @Post('rates')
    async getRates(@Body() payload: { origin: CarrierAddress; destination: CarrierAddress; packages: CarrierPackage[] }) {
        return breaker.execute(() => this.dhl.getRates(payload.origin, payload.destination, payload.packages));
    }

    @Post('shipments')
    async createShipment(@Body() payload: {
        origin: CarrierAddress;
        destination: CarrierAddress;
        packages: CarrierPackage[];
        service?: string;
        reference?: string;
    }) {
        const request: CreateShipmentRequest = {
            origin: payload.origin,
            destination: payload.destination,
            packages: payload.packages,
            service: payload.service || 'EXPRESS',
            reference: payload.reference,
        };
        return breaker.execute(() => this.dhl.createShipment(request));
    }

    @Get('tracking/:trackingNumber')
    async getTracking(@Param('trackingNumber') trackingNumber: string) {
        return breaker.execute(() => this.dhl.getTracking(trackingNumber));
    }

    @Post('shipments/:trackingNumber/cancel')
    async cancelShipment(@Param('trackingNumber') trackingNumber: string) {
        return breaker.execute(() => this.dhl.cancelShipment(trackingNumber));
    }
}
