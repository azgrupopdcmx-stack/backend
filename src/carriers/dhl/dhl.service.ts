import { Injectable, Logger, Inject, HttpException, HttpStatus } from '@nestjs/common';
import type {
    CarrierService,
    CarrierAddress,
    CarrierPackage,
    RateQuote,
    CreateShipmentRequest,
    CreateShipmentResponse,
    TrackingInfo,
    CarrierConfig,
} from '../carrier.interface';
import type {
    DHLRateRequest,
    DHLRateResponse,
    DHLShipRequest,
    DHLShipResponse,
    DHLTrackResponse,
} from './dhl.types';
import { mapDHLRatesToQuotes, mapDHLShipmentToResponse, mapDHLTrackingToInfo } from './dhl.mapper';

@Injectable()
export class DHLService implements CarrierService {
    private readonly logger = new Logger(DHLService.name);
    private readonly config: CarrierConfig;

    constructor(@Inject('DHL_CONFIG') config: CarrierConfig) {
        this.config = config;
        this.validateConfig();
    }

    private validateConfig() {
        if (!this.config.credentials.apiKey || !this.config.credentials.apiSecret) {
            this.logger.warn('DHL API credentials are not configured. Service will operate in mock mode.');
        }
    }

    /**
     * Authenticate with DHL (Basic Auth for MyDHL API)
     * Returns the Authorization header value
     */
    private getAuthHeader(): string {
        const { apiKey, apiSecret } = this.config.credentials;
        return 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    }

    /**
     * Make authenticated API request
     */
    private async request<T>(endpoint: string, body: any = null, method: string = 'POST'): Promise<T> {
        const baseUrl = this.config.sandbox
            ? 'https://express.api.dhl.com/mydhlapi/test'
            : 'https://express.api.dhl.com/mydhlapi';

        const headers: HeadersInit = {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Message-Reference': Date.now().toString(),
            'Message-Reference-Date': new Date().toISOString(),
        };

        const config: RequestInit = {
            method,
            headers,
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${baseUrl}${endpoint}`, config);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: response.statusText }));
                this.logger.error(`DHL API error: ${JSON.stringify(error)}`);
                throw new HttpException(
                    error.detail || 'DHL API request failed',
                    response.status
                );
            }

            return response.json();
        } catch (error: any) {
            if (error instanceof HttpException) throw error;
            this.logger.error('DHL request failed:', error.message);
            throw new HttpException('DHL request failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get shipping rates
     */
    async getRates(origin: CarrierAddress, destination: CarrierAddress, packages: CarrierPackage[]): Promise<RateQuote[]> {
        this.logger.log('Fetching DHL rates...');

        const request: DHLRateRequest = {
            customerDetails: {
                shipperDetails: this.mapToDHLAddress(origin),
                receiverDetails: this.mapToDHLAddress(destination),
            },
            plannedShippingDateAndTime: new Date().toISOString(),
            unitOfMeasurement: 'SI',
            isCustomsDeclarable: false,
            packages: packages.map((pkg, index) => ({
                weight: pkg.weight,
                dimensions: pkg.length && pkg.width && pkg.height
                    ? {
                        length: pkg.length,
                        width: pkg.width,
                        height: pkg.height,
                    }
                    : undefined,
            })),
        };

        const response = await this.request<DHLRateResponse>('/rates', request);
        return mapDHLRatesToQuotes(response);
    }

    /**
     * Create shipment
     */
    async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
        this.logger.log('Creating DHL shipment...');

        const shipRequest: DHLShipRequest = {
            plannedShippingDateAndTime: new Date().toISOString(),
            pickup: { isRequested: false },
            productCode: request.service || 'P', // Default to Express Worldwide
            accounts: [
                {
                    typeCode: 'shipper',
                    number: this.config.credentials.accountNumber || '000000000',
                }
            ],
            customerDetails: {
                shipperDetails: {
                    ...this.mapToDHLAddress(request.origin),
                    addressLine1: request.origin.street,
                    fullName: request.origin.contactName || 'Shipper',
                    companyName: request.origin.company || '',
                    phoneNumber: request.origin.phone || '0000000000',
                    email: request.origin.email,
                },
                receiverDetails: {
                    ...this.mapToDHLAddress(request.destination),
                    addressLine1: request.destination.street,
                    fullName: request.destination.contactName || 'Recipient',
                    companyName: request.destination.company || '',
                    phoneNumber: request.destination.phone || '0000000000',
                    email: request.destination.email,
                },
            },
            content: {
                packages: request.packages.map(pkg => ({
                    weight: pkg.weight,
                    dimensions: pkg.length && pkg.width && pkg.height
                        ? { length: pkg.length, width: pkg.width, height: pkg.height }
                        : undefined,
                })),
                isCustomsDeclarable: true,
                description: 'Shipment',
                incoterm: 'DAP',
                unitOfMeasurement: 'SI',
            },
        };

        const response = await this.request<DHLShipResponse>('/shipments', shipRequest);
        return mapDHLShipmentToResponse(response);
    }

    /**
     * Get tracking information
     */
    async getTracking(trackingNumber: string): Promise<TrackingInfo> {
        this.logger.log(`Fetching DHL tracking for: ${trackingNumber}`);
        const response = await this.request<DHLTrackResponse>(`/shipments/${trackingNumber}/tracking`, null, 'GET');
        return mapDHLTrackingToInfo(response);
    }

    /**
     * Cancel shipment
     */
    async cancelShipment(trackingNumber: string): Promise<boolean> {
        this.logger.warn(`DHL cancellation not implemented for: ${trackingNumber}`);
        throw new HttpException('DHL shipment cancellation not yet implemented', HttpStatus.NOT_IMPLEMENTED);
    }

    /**
     * Validate address
     */
    async validateAddress(address: CarrierAddress): Promise<CarrierAddress | null> {
        this.logger.warn('DHL address validation not implemented');
        return null;
    }

    /**
     * Map to DHL address format
     */
    private mapToDHLAddress(address: CarrierAddress) {
        return {
            postalCode: address.postalCode,
            city: address.city,
            countryCode: address.country === 'Mexico' || address.country === 'MX' ? 'MX' : address.country,
        };
    }
}
