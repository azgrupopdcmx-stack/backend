import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from '../shipments/entities/shipment.entity';
import { ActivityLog } from './entities/activity-log.entity';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(Shipment)
        private shipmentsRepository: Repository<Shipment>,
        @InjectRepository(ActivityLog)
        private activityLogRepository: Repository<ActivityLog>,
    ) { }

    async logActivity(userId: string, action: string, type: string, description?: string, meta?: { device?: string, ip?: string, location?: string }) {
        // In a real app, user might be partial if not found, but we store ID usually or link entity.
        // Assuming userId relates to a valid User entity.
        const log = this.activityLogRepository.create({
            user: { id: userId }, // TypeORM allows partial relation object for ID
            action,
            type,
            description,
            device: meta?.device,
            ip: meta?.ip,
            location: meta?.location,
        });
        return this.activityLogRepository.save(log);
    }

    async getGlobalActivityLogs(limit = 50, filters?: { type?: string; startDate?: Date; endDate?: Date; search?: string }) {
        const query = this.activityLogRepository.createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .orderBy('log.createdAt', 'DESC')
            .take(limit);

        if (filters?.type && filters.type !== 'all') {
            query.andWhere('log.type = :type', { type: filters.type });
        }

        if (filters?.search) {
            query.andWhere('(log.action ILIKE :search OR log.description ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)', { search: `%${filters.search}%` });
        }

        // Add date filtering logic if needed

        return query.getMany();
    }


    async getOverview(userId: string) {
        const shipments = await this.shipmentsRepository.find({
            where: { user: { id: userId } },
        });

        const total = shipments.length;
        const pending = shipments.filter((s) => s.status === 'pending').length;
        const created = shipments.filter((s) => s.status === 'created').length;
        const inTransit = shipments.filter((s) => s.status === 'in_transit').length;
        const delivered = shipments.filter((s) => s.status === 'delivered').length;

        return {
            total,
            pending,
            created,
            inTransit,
            delivered,
        };
    }

    async getByCarrier(userId: string) {
        const shipments = await this.shipmentsRepository.find({
            where: { user: { id: userId } },
        });

        const carrierCounts = shipments.reduce((acc, shipment) => {
            const carrierName = shipment.carrier?.name || 'Unknown';
            acc[carrierName] = (acc[carrierName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(carrierCounts).map(([carrier, count]) => ({
            carrier,
            count,
        }));
    }

    async getRecentActivity(userId: string, limit = 10) {
        const shipments = await this.shipmentsRepository.find({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
            take: limit,
        });

        return shipments.map((shipment) => ({
            id: shipment.id,
            carrier: shipment.carrier?.name || 'Unknown',
            status: shipment.status,
            createdAt: shipment.createdAt,
            from: shipment.from_address.city,
            to: shipment.to_address.city,
        }));
    }

    async getShipmentsByMonth(userId: string, months = 6) {
        const shipments = await this.shipmentsRepository.find({
            where: { user: { id: userId } },
            order: { createdAt: 'ASC' },
        });

        const monthlyData: Record<string, number> = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = 0;
        }

        // Count shipments per month
        shipments.forEach((shipment) => {
            const date = new Date(shipment.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData.hasOwnProperty(key)) {
                monthlyData[key]++;
            }
        });

        return Object.entries(monthlyData).map(([month, count]) => ({
            month,
            count,
        }));
    }

    async getCostAnalytics(userId: string) {
        const shipments = await this.shipmentsRepository.find({
            where: { user: { id: userId } },
        });

        // Mock cost calculation - in production, this would use actual rate_selected data
        const totalCost = shipments.reduce((sum, shipment) => {
            const baseCost = shipment.weight * 15 + 50;
            return sum + baseCost;
        }, 0);

        const avgCost = shipments.length > 0 ? totalCost / shipments.length : 0;

        return {
            totalCost: Math.round(totalCost * 100) / 100,
            avgCost: Math.round(avgCost * 100) / 100,
            shipmentCount: shipments.length,
        };
    }
}
