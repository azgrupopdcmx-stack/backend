import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carrier } from '../../entities/carrier.entity';
import { ConfigService } from '@nestjs/config';

/**
 * FedEx Carrier Seeder
 * 
 * Automatically seeds FedEx carrier configuration on application bootstrap.
 */
@Injectable()
export class FedExSeeder implements OnApplicationBootstrap {
    private readonly logger = new Logger(FedExSeeder.name);

    constructor(
        @InjectRepository(Carrier)
        private readonly carrierRepo: Repository<Carrier>,
        private readonly config: ConfigService,
    ) { }

    async onApplicationBootstrap() {
        try {
            const code = 'fedex';
            const existing = await this.carrierRepo.findOne({ where: { code } });

            if (existing) {
                this.logger.log('FedEx carrier already exists – skipping seeder');
                return;
            }

            const carrier = this.carrierRepo.create({
                code,
                name: 'FedEx',
                logoUrl: undefined,
                isActive: true,
                isSandbox: this.config.get<boolean>('FEDEX_SANDBOX') ?? true,
                credentials: {
                    apiKey: this.config.get('FEDEX_API_KEY'),
                    apiSecret: this.config.get('FEDEX_API_SECRET'),
                    accountNumber: this.config.get('FEDEX_ACCOUNT_NUMBER'),
                },
                config: {
                    baseUrl: this.config.get<boolean>('FEDEX_SANDBOX')
                        ? 'https://apis-sandbox.fedex.com'
                        : 'https://apis.fedex.com',
                    supportedServices: [
                        'FEDEX_GROUND',
                        'FEDEX_EXPRESS_SAVER',
                        'FEDEX_2_DAY',
                        'FEDEX_2_DAY_AM',
                        'STANDARD_OVERNIGHT',
                        'PRIORITY_OVERNIGHT',
                        'FIRST_OVERNIGHT',
                        'INTERNATIONAL_ECONOMY',
                        'INTERNATIONAL_PRIORITY',
                    ],
                },
            });

            await this.carrierRepo.save(carrier);
            this.logger.log('✅ FedEx carrier seeded');
        } catch (error) {
            this.logger.error('Failed to seed FedEx carrier:', error);
        }
    }
}
