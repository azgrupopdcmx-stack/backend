import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrier } from '../entities/carrier.entity';
import { DHLService } from './dhl.service';
import { DHLController } from './dhl.controller';
import type { CarrierConfig } from '../carrier.interface';

@Global()
@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([Carrier])],
    controllers: [DHLController],
    providers: [
        {
            provide: 'DHL_CONFIG',
            useFactory: (configService: ConfigService): CarrierConfig => ({
                sandbox: configService.get<boolean>('DHL_SANDBOX', true),
                credentials: {
                    apiKey: configService.get<string>('DHL_API_KEY', ''),
                    apiSecret: configService.get<string>('DHL_API_SECRET', ''),
                    accountNumber: configService.get<string>('DHL_ACCOUNT_NUMBER', ''),
                },
            }),
            inject: [ConfigService],
        },
        DHLService,
    ],
    exports: [DHLService],
})
export class DHLModule { }
