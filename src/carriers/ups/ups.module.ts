import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrier } from '../entities/carrier.entity';
import { UPSService } from './ups.service';
import { UPSController } from './ups.controller';
import type { CarrierConfig } from '../carrier.interface';

@Global()
@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([Carrier])],
    controllers: [UPSController],
    providers: [
        {
            provide: 'UPS_CONFIG',
            useFactory: (configService: ConfigService): CarrierConfig => ({
                sandbox: configService.get<boolean>('UPS_SANDBOX', true),
                credentials: {
                    apiKey: configService.get<string>('UPS_API_KEY', ''),
                    apiSecret: configService.get<string>('UPS_API_SECRET', ''),
                    accountNumber: configService.get<string>('UPS_ACCOUNT_NUMBER', ''),
                },
            }),
            inject: [ConfigService],
        },
        UPSService,
    ],
    exports: [UPSService],
})
export class UPSModule { }
