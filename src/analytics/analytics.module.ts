import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Shipment } from '../shipments/entities/shipment.entity';

import { ActivityLog } from './entities/activity-log.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Shipment, ActivityLog])],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
