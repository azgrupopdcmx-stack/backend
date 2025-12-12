import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ShipmentsService } from '../shipments/shipments.service';

@Injectable()
export class AdminService {
    constructor(
        private readonly usersService: UsersService,
        private readonly analyticsService: AnalyticsService,
        private readonly shipmentsService: ShipmentsService,
    ) { }

    async getUsers(query: any) {
        return this.usersService.findAllWithFilters(query);
    }

    async getUserStats() {
        return this.usersService.getUserOverviewStats();
    }

    async getUserDetail(userId: string) {
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Parallel fetch for potential performance, but sequential is fine for now
        const overview = await this.analyticsService.getOverview(userId);
        const shipmentHistory = await this.analyticsService.getShipmentsByMonth(userId);
        const recentShipments = await this.analyticsService.getRecentActivity(userId, 5); // Using getRecentActivity which returns shipments
        // Note: We might need a proper getRecentShipments in AnalyticsService if getRecentActivity is ambiguous

        // Credit history, invoices, etc. would come from other services (e.g. BillingService) if they existed.
        // For now, we return what we have and mock the rest in frontend if needed, or implement mock methods here.

        return {
            ...user,
            stats: {
                shipments: overview,
                trends: shipmentHistory,
            },
            recentShipments,
            // Mock wallet data as we don't have a wallet service yet
            wallet: {
                balance: user.walletBalance || 0,
                creditLine: user.creditLine || 0,
                creditUsed: user.creditUsed || 0,
                availableCredit: (user.creditLine || 0) - (user.creditUsed || 0),
            }
        };
    }

    async getActivityLogs(query: any) {
        return this.analyticsService.getGlobalActivityLogs(query.limit || 50, query);
    }
}
