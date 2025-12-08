import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { FedExService } from './fedex.service';
import { CarrierAddress, CarrierPackage, CreateShipmentRequest } from '../carrier.interface';
import { CircuitBreaker } from '../../utils/circuit-breaker.util';

const breaker = new CircuitBreaker(3, 2000);

@Controller('api/fedex')
export class FedExController {
    constructor(private readonly fedex: FedExService) { }

    @Post('rates')
    async getRates(@Body() payload: { origin: CarrierAddress; destination: CarrierAddress; packages: CarrierPackage[] }) {
        return breaker.execute(() => this.fedex.getRates(payload.origin, payload.destination, payload.packages));
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
            service: payload.service || 'FEDEX_GROUND',
            reference: payload.reference,
        };
        return breaker.execute(() => this.fedex.createShipment(request));
    }

    @Get('tracking/:trackingNumber')
    async getTracking(@Param('trackingNumber') trackingNumber: string) {
        return breaker.execute(() => this.fedex.getTracking(trackingNumber));
    }

    @Post('shipments/:trackingNumber/cancel')
    async cancelShipment(@Param('trackingNumber') trackingNumber: string) {
        return breaker.execute(() => this.fedex.cancelShipment(trackingNumber));
    }
}
