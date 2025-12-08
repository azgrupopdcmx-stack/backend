import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('overview')
    getOverview(@Request() req) {
        return this.analyticsService.getOverview(req.user.userId);
    }

    @Get('by-carrier')
    getByCarrier(@Request() req) {
        return this.analyticsService.getByCarrier(req.user.userId);
    }

    @Get('recent')
    getRecentActivity(@Request() req) {
        return this.analyticsService.getRecentActivity(req.user.userId);
    }

    @Get('by-month')
    getByMonth(@Request() req) {
        return this.analyticsService.getShipmentsByMonth(req.user.userId);
    }

    @Get('cost')
    getCostAnalytics(@Request() req) {
        return this.analyticsService.getCostAnalytics(req.user.userId);
    }
}
