import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { CartaPorteService } from './carta-porte.service';
import { PacService } from './pac.service';

/**
 * Compliance Module
 * 
 * Handles Mexican tax compliance requirements:
 * - Carta Porte generation (SAT Complement 2.0)
 * - CFDI integration
 * - SAT validation
 */
@Module({
    controllers: [ComplianceController],
    providers: [CartaPorteService, PacService],
    exports: [CartaPorteService],
})
export class ComplianceModule { }
