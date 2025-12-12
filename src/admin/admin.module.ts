import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ShipmentsModule } from '../shipments/shipments.module';

@Module({
    imports: [UsersModule, AnalyticsModule, ShipmentsModule],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
