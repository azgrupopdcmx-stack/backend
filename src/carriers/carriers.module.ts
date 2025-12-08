import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrier } from './entities/carrier.entity';

/**
 * Carriers Module
 * 
 * Manages carrier integrations (Estafeta, FedEx, DHL, UPS, 99 Minutos).
 * Provides services for rate comparison, shipment creation, and tracking.
 */
@Module({
    imports: [TypeOrmModule.forFeature([Carrier])],
    providers: [],
    exports: [TypeOrmModule],
})
export class CarriersModule { }
