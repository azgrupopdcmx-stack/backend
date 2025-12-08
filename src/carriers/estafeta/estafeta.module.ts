import { Module, Global } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrier } from '../../carriers/entities/carrier.entity';
import { EstafetaService } from './estafeta.service';
import { EstafetaController } from './estafeta.controller';
import type { CarrierConfig } from '../carrier.interface';
import { EstafetaSeeder } from './seed/estafeta.seeder';

@Global()
@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([Carrier]),
    ],
    controllers: [EstafetaController],
    providers: [
        {
            provide: 'ESTAFETA_CONFIG',
            inject: [ConfigService],
            useFactory: (config: ConfigService): CarrierConfig => ({
                credentials: {
                    apiKey: config.get<string>('ESTAFETA_API_KEY') || '',
                    apiSecret: config.get<string>('ESTAFETA_API_SECRET') || '',
                },
                sandbox: config.get<boolean>('ESTAFETA_SANDBOX') ?? true,
                baseUrl: config.get<string>('ESTAFETA_BASE_URL'),
            }),
        },
        {
            provide: EstafetaService,
            inject: ['ESTAFETA_CONFIG'],
            useFactory: (cfg: CarrierConfig) => new EstafetaService(cfg),
        },
        EstafetaSeeder,
    ],
    exports: [EstafetaService],
})
export class EstafetaModule { }
