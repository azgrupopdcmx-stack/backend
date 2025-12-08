import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carrier } from '../../entities/carrier.entity';
import { ConfigService } from '@nestjs/config';

/**
 * Minimal seeder that upserts the Estafeta carrier record.
 * It runs on application bootstrap, so the carrier is present for the
 * ShipmentService when it looks up the carrier by code.
 */
@Injectable()
export class EstafetaSeeder implements OnApplicationBootstrap {
    private readonly logger = new Logger(EstafetaSeeder.name);

    constructor(
        @InjectRepository(Carrier)
        private readonly carrierRepo: Repository<Carrier>,
        private readonly config: ConfigService,
    ) { }

    async onApplicationBootstrap() {
        const code = 'estafeta';
        const existing = await this.carrierRepo.findOne({ where: { code } });
        if (existing) {
            this.logger.log('Estafeta carrier already exists – skipping seeder');
            return;
        }

        const carrier = this.carrierRepo.create({
            code,
            name: 'Estafeta',
            logoUrl: undefined,
            isActive: true,
            isSandbox: this.config.get<boolean>('ESTAFETA_SANDBOX') ?? true,
            credentials: {
                apiKey: this.config.get<string>('ESTAFETA_API_KEY'),
                apiSecret: this.config.get<string>('ESTAFETA_API_SECRET'),
            },
            config: {
                baseUrl: this.config.get<string>('ESTAFETA_BASE_URL'),
            },
            supportedServices: ['express', 'ground', 'next_day'],
            supportedCountries: ['MX'],
            priority: 1,
        });
        await this.carrierRepo.save(carrier);
        this.logger.log('✅ Estafeta carrier seeded');
    }
}
