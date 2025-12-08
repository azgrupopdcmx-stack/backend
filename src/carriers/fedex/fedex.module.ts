import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrier } from '../entities/carrier.entity';
import { FedExService } from './fedex.service';
import { FedExController } from './fedex.controller';
import type { CarrierConfig } from '../carrier.interface';
import { FedExSeeder } from './seed/fedex.seeder';

@Global()
@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([Carrier])],
    controllers: [FedExController],
    providers: [
        {
            provide: 'FEDEX_CONFIG',
            useFactory: (configService: ConfigService): CarrierConfig => ({
                sandbox: configService.get<boolean>('FEDEX_SANDBOX', true),
                credentials: {
                    apiKey: configService.get<string>('FEDEX_API_KEY', ''),
                    apiSecret: configService.get<string>('FEDEX_API_SECRET', ''),
                    accountNumber: configService.get<string>('FEDEX_ACCOUNT_NUMBER', ''),
                },
            }),
            inject: [ConfigService],
        },
        FedExService,
        FedExSeeder,
    ],
    exports: [FedExService],
})
export class FedExModule { }
