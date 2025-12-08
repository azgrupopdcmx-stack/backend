import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CartaPorteService } from './carta-porte.service';
import type { CartaPorteData } from './carta-porte.service';

@Controller('api/compliance')
export class ComplianceController {
    constructor(private readonly cartaPorteService: CartaPorteService) { }

    @Post('carta-porte')
    async generate(@Body() data: CartaPorteData) {
        const result = await this.cartaPorteService.generateCartaPorte(data);
        // Remove buffer from JSON response to avoid huge payload
        const { pdfBuffer, ...rest } = result;
        return rest;
    }

    @Post('carta-porte/pdf')
    async generatePdf(@Body() data: CartaPorteData, @Res() res: Response) {
        const result = await this.cartaPorteService.generateCartaPorte(data);
        if (result.pdfBuffer) {
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=carta-porte-${result.uuid}.pdf`,
                'Content-Length': result.pdfBuffer.length,
            });
            res.end(result.pdfBuffer);
        } else {
            res.status(500).send('PDF generation failed');
        }
    }
}
