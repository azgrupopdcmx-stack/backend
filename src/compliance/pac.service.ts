import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * PAC (Proveedor Autorizado de Certificación) Service
 * 
 * Integrates with Facturama for SAT CFDI timbrado (digital stamping).
 * 
 * Facturama API Docs: https://apisandbox.facturama.mx/guias
 */

export interface PacTimbradoRequest {
    xml: string; // CFDI XML to stamp
    extras?: {
        nameId?: string; // Optional custom identifier
    };
}

export interface PacTimbradoResponse {
    success: boolean;
    uuid?: string; // SAT UUID (Folio Fiscal)
    stampedXml?: string; // XML with digital seal and SAT UUID
    satSeal?: string; // SAT digital seal (Sello SAT)
    satCertNumber?: string; // SAT certificate number
    stampDate?: string; // Fecha de timbrado
    cfdiSign?: string; // Original CFDI signature
    qrCode?: string; // QR code for validation
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

export interface PacValidationError {
    field: string;
    message: string;
    code?: string;
}

@Injectable()
export class PacService {
    private readonly logger = new Logger(PacService.name);
    private readonly baseUrl: string;
    private readonly username: string;
    private readonly password: string;
    private readonly isSandbox: boolean;

    constructor(private config: ConfigService) {
        this.isSandbox = this.config.get<boolean>('PAC_SANDBOX', true);
        this.baseUrl = this.isSandbox
            ? 'https://apisandbox.facturama.mx'
            : 'https://api.facturama.mx';
        this.username = this.config.get<string>('PAC_USERNAME') || '';
        this.password = this.config.get<string>('PAC_PASSWORD') || '';

        if (!this.username || !this.password) {
            this.logger.warn('PAC credentials not configured - timbrado will use mock mode');
        }
    }

    /**
     * Send CFDI XML to Facturama for timbrado (digital stamping)
     * 
     * @param request CFDI XML and optional metadata
     * @returns Stamped XML with SAT UUID and digital seal
     */
    async timbrar(request: PacTimbradoRequest): Promise<PacTimbradoResponse> {
        if (!this.username || !this.password) {
            this.logger.warn('PAC not configured - returning mock timbrado');
            return this.mockTimbrado(request.xml);
        }

        try {
            this.logger.log('Sending CFDI to Facturama for timbrado...');

            const response = await fetch(`${this.baseUrl}/3/cfdis`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
                    'Content-Type': 'text/xml',
                },
                body: request.xml,
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Facturama API error: ${response.status} - ${errorText}`);

                let errorData: any;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { Message: errorText };
                }

                return {
                    success: false,
                    error: {
                        code: `PAC_ERROR_${response.status}`,
                        message: errorData.Message || errorData.message || 'Unknown PAC error',
                        details: errorData,
                    },
                };
            }

            const data = await response.json();

            this.logger.log(`✅ CFDI timbrado successful - UUID: ${data.Complement?.TaxStamp?.Uuid || 'N/A'}`);

            // Facturama returns the stamped CFDI with complemento (including UUID)
            return {
                success: true,
                uuid: data.Complement?.TaxStamp?.Uuid,
                stampedXml: data.OriginalString || request.xml, // Facturama may return original string
                satSeal: data.Complement?.TaxStamp?.SatSeal,
                satCertNumber: data.Complement?.TaxStamp?.SatCertNumber,
                stampDate: data.Complement?.TaxStamp?.StampDate,
                cfdiSign: data.Complement?.TaxStamp?.CfdiSign,
                qrCode: this.generateQrCode(data.Complement?.TaxStamp?.Uuid || ''),
            };
        } catch (error: any) {
            this.logger.error('Error calling Facturama API:', error);
            return {
                success: false,
                error: {
                    code: 'PAC_CONNECTION_ERROR',
                    message: error.message || 'Failed to connect to PAC',
                    details: error,
                },
            };
        }
    }

    /**
     * Cancel a previously stamped CFDI
     * 
     * @param uuid SAT UUID to cancel
     * @param motive Cancellation motive (SAT catalog)
     * @param replacementUuid Optional UUID of replacement CFDI
     */
    async cancelarCfdi(uuid: string, motive: string, replacementUuid?: string): Promise<{ success: boolean; message?: string }> {
        if (!this.username || !this.password) {
            this.logger.warn('PAC not configured - cannot cancel CFDI');
            return { success: false, message: 'PAC not configured' };
        }

        try {
            const body: any = {
                Uuid: uuid,
                Motive: motive,
            };
            if (replacementUuid) {
                body.UuidReplacement = replacementUuid;
            }

            const response = await fetch(`${this.baseUrl}/cfdi`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Failed to cancel CFDI: ${errorText}`);
                return { success: false, message: errorText };
            }

            this.logger.log(`✅ CFDI ${uuid} cancelled successfully`);
            return { success: true };
        } catch (error: any) {
            this.logger.error('Error cancelling CFDI:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Validate CFDI XML against SAT schemas before sending to PAC
     * (Client-side validation to catch errors early)
     */
    async validateXml(xml: string): Promise<{ valid: boolean; errors: PacValidationError[] }> {
        const errors: PacValidationError[] = [];

        // Basic XML structure validation
        if (!xml.includes('<?xml')) {
            errors.push({ field: 'xml', message: 'Invalid XML declaration' });
        }

        if (!xml.includes('cfdi:Comprobante')) {
            errors.push({ field: 'cfdi:Comprobante', message: 'Missing CFDI root element' });
        }

        // Check for required CFDI 4.0 attributes
        const requiredAttrs = ['Version="4.0"', 'Fecha', 'Sello', 'NoCertificado', 'Certificado'];
        for (const attr of requiredAttrs) {
            if (!xml.includes(attr)) {
                errors.push({ field: 'cfdi:Comprobante', message: `Missing required attribute: ${attr}` });
            }
        }

        // Check for Carta Porte complement (if applicable)
        if (xml.includes('CartaPorte')) {
            if (!xml.includes('cartaporte31:CartaPorte')) {
                errors.push({ field: 'cartaporte', message: 'Invalid Carta Porte namespace' });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Generate QR code string for SAT verification
     */
    private generateQrCode(uuid: string): string {
        // QR code format: https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id={UUID}&re={RFC_EMISOR}&rr={RFC_RECEPTOR}&tt={TOTAL}
        // For now, return base URL (full implementation would include all params)
        return `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}`;
    }

    /**
     * Mock timbrado for testing without PAC credentials
     */
    private mockTimbrado(xml: string): PacTimbradoResponse {
        const mockUuid = `XXXXXXXX-XXXX-XXXX-XXXX-${Date.now().toString().slice(-12)}`;

        this.logger.warn(`⚠️  Using MOCK timbrado - UUID: ${mockUuid}`);

        // Add mock SAT complement to XML
        const mockStamp = `
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" 
      Version="1.1"
      UUID="${mockUuid}"
      FechaTimbrado="${new Date().toISOString()}"
      SelloCFD="MOCK_SELLO_CFDI_BASE64..."
      NoCertificadoSAT="00001000000500003416"
      SelloSAT="MOCK_SELLO_SAT_BASE64..."
      RfcProvCertif="DIM8701081A5"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

        const stampedXml = xml.replace('</cfdi:Comprobante>', mockStamp);

        return {
            success: true,
            uuid: mockUuid,
            stampedXml,
            satSeal: 'MOCK_SAT_SEAL',
            satCertNumber: '00001000000500003416',
            stampDate: new Date().toISOString(),
            cfdiSign: 'MOCK_CFDI_SIGN',
            qrCode: this.generateQrCode(mockUuid),
        };
    }

    /**
     * Check PAC service status
     */
    async healthCheck(): Promise<{ available: boolean; message: string }> {
        if (!this.username || !this.password) {
            return { available: false, message: 'PAC credentials not configured' };
        }

        try {
            // Facturama health check - try to list catalogs (lightweight operation)
            const response = await fetch(`${this.baseUrl}/catalogs/ProductsOrServices`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
                },
            });

            if (response.ok) {
                return { available: true, message: 'PAC service is available' };
            } else {
                return { available: false, message: `PAC returned status ${response.status}` };
            }
        } catch (error: any) {
            return { available: false, message: error.message };
        }
    }
}
