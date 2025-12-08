import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UPSService } from './ups.service';
import { CarrierAddress, CarrierPackage, CreateShipmentRequest } from '../carrier.interface';
import { CircuitBreaker } from '../../utils/circuit-breaker.util';

const breaker = new CircuitBreaker(3, 2000);

@Controller('api/ups')
export class UPSController {
    constructor(private readonly ups: UPSService) { }

    @Post('rates')
    async getRates(@Body() payload: { origin: CarrierAddress; destination: CarrierAddress; packages: CarrierPackage[] }) {
        return breaker.execute(() => this.ups.getRates(payload.origin, payload.destination, payload.packages));
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
            service: payload.service || '03',
            reference: payload.reference,
        };
        return breaker.execute(() => this.ups.createShipment(request));
    }

    @Get('tracking/:trackingNumber')
    async getTracking(@Param('trackingNumber') trackingNumber: string) {
        return breaker.execute(() => this.ups.getTracking(trackingNumber));
    }

    @Post('shipments/:trackingNumber/cancel')
    async cancelShipment(@Param('trackingNumber') trackingNumber: string) {
        return breaker.execute(() => this.ups.cancelShipment(trackingNumber));
    }
}
