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
    FedExRateRequest,
    FedExRateResponse,
    FedExShipRequest,
    FedExShipResponse,
    FedExTrackRequest,
    FedExTrackResponse,
    FedExOAuthTokenResponse,
} from './fedex.types';
import { mapFedExRatesToQuotes, mapFedExShipmentToResponse, mapFedExTrackingToInfo } from './fedex.mapper';

@Injectable()
export class FedExService implements CarrierService {
    private readonly logger = new Logger(FedExService.name);
    private readonly config: CarrierConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(@Inject('FEDEX_CONFIG') config: CarrierConfig) {
        this.config = config;
        this.validateConfig();
    }

    private validateConfig() {
        if (!this.config.credentials.apiKey || !this.config.credentials.apiSecret) {
            this.logger.warn('FedEx API credentials are not configured. Service will operate in mock mode.');
        }
    }

    /**
     * Authenticate with FedEx OAuth2
     */
    private async authenticate(): Promise<string> {
        // Check if token is still valid (with 5-minute buffer)
        if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
            return this.accessToken;
        }

        const authUrl = this.config.sandbox
            ? 'https://apis-sandbox.fedex.com/oauth/token'
            : 'https://apis.fedex.com/oauth/token';

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', this.config.credentials.apiKey);
        params.append('client_secret', this.config.credentials.apiSecret);

        try {
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });

            if (!response.ok) {
                throw new Error(`FedEx OAuth failed: ${response.status}`);
            }

            const data: FedExOAuthTokenResponse = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + data.expires_in * 1000;

            this.logger.log('✅ FedEx authentication successful');
            return this.accessToken;
        } catch (error: any) {
            this.logger.error('FedEx authentication failed:', error.message);
            throw new HttpException('FedEx authentication failed', HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * Make authenticated API request
     */
    private async request<T>(endpoint: string, body: any): Promise<T> {
        const token = await this.authenticate();
        const baseUrl = this.config.sandbox
            ? 'https://apis-sandbox.fedex.com'
            : 'https://apis.fedex.com';

        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-locale': 'en_US',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            this.logger.error(`FedEx API error: ${JSON.stringify(error)}`);
            throw new HttpException(
                error.errors?.[0]?.message || 'FedEx API request failed',
                response.status
            );
        }

        return response.json();
    }

    /**
     * Get shipping rates
     */
    async getRates(origin: CarrierAddress, destination: CarrierAddress, packages: CarrierPackage[]): Promise<RateQuote[]> {
        this.logger.log('Fetching FedEx rates...');

        const request: FedExRateRequest = {
            accountNumber: {
                value: this.config.credentials.accountNumber || '000000000',
            },
            requestedShipment: {
                shipper: {
                    address: this.mapToFedExAddress(origin),
                },
                recipient: {
                    address: this.mapToFedExAddress(destination),
                },
                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                rateRequestType: ['ACCOUNT', 'PREFERRED'],
                requestedPackageLineItems: packages.map((pkg) => ({
                    weight: {
                        units: pkg.weightUnit === 'kg' ? 'KG' : 'LB',
                        value: pkg.weight,
                    },
                    dimensions: pkg.length && pkg.width && pkg.height
                        ? {
                            length: pkg.length,
                            width: pkg.width,
                            height: pkg.height,
                            units: pkg.dimensionUnit === 'cm' ? 'CM' : 'IN',
                        }
                        : undefined,
                })),
            },
        };

        const response = await this.request<FedExRateResponse>('/rate/v1/rates/quotes', request);
        return mapFedExRatesToQuotes(response);
    }

    /**
     * Create shipment
     */
    async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
        this.logger.log('Creating FedEx shipment...');

        const shipRequest: FedExShipRequest = {
            accountNumber: {
                value: this.config.credentials.accountNumber || '000000000',
            },
            requestedShipment: {
                shipper: {
                    contact: {
                        personName: request.origin.contactName || 'Shipper',
                        phoneNumber: request.origin.phone || '0000000000',
                        companyName: request.origin.company,
                    },
                    address: this.mapToFedExAddress(request.origin),
                },
                recipients: [
                    {
                        contact: {
                            personName: request.destination.contactName || 'Recipient',
                            phoneNumber: request.destination.phone || '0000000000',
                            companyName: request.destination.company,
                        },
                        address: this.mapToFedExAddress(request.destination),
                    },
                ],
                shipDatestamp: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                serviceType: request.service || 'FEDEX_GROUND',
                packagingType: 'YOUR_PACKAGING',
                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                shippingChargesPayment: {
                    paymentType: 'SENDER',
                },
                labelSpecification: {
                    labelFormatType: 'COMMON2D',
                    imageType: 'PDF',
                    labelStockType: 'PAPER_4X6',
                },
                requestedPackageLineItems: request.packages.map((pkg) => ({
                    weight: {
                        units: pkg.weightUnit === 'kg' ? 'KG' : 'LB',
                        value: pkg.weight,
                    },
                    dimensions: pkg.length && pkg.width && pkg.height
                        ? {
                            length: pkg.length,
                            width: pkg.width,
                            height: pkg.height,
                            units: pkg.dimensionUnit === 'cm' ? 'CM' : 'IN',
                        }
                        : undefined,
                })),
            },
        };

        const response = await this.request<FedExShipResponse>('/ship/v1/shipments', shipRequest);
        return mapFedExShipmentToResponse(response);
    }

    /**
     * Get tracking information
     */
    async getTracking(trackingNumber: string): Promise<TrackingInfo> {
        this.logger.log(`Fetching FedEx tracking for: ${trackingNumber}`);

        const request: FedExTrackRequest = {
            includeDetailedScans: true,
            trackingInfo: [
                {
                    trackingNumberInfo: {
                        trackingNumber,
                    },
                },
            ],
        };

        const response = await this.request<FedExTrackResponse>('/track/v1/trackingnumbers', request);
        return mapFedExTrackingToInfo(response);
    }

    /**
     * Cancel shipment
     */
    async cancelShipment(trackingNumber: string): Promise<boolean> {
        this.logger.warn(`FedEx cancellation not implemented for: ${trackingNumber}`);
        throw new HttpException('FedEx shipment cancellation not yet implemented', HttpStatus.NOT_IMPLEMENTED);
    }

    /**
     * Validate address
     */
    async validateAddress(address: CarrierAddress): Promise<CarrierAddress | null> {
        this.logger.warn('FedEx address validation not implemented');
        // FedEx has a separate Address Validation API that can be implemented later
        return null;
    }

    /**
     * Map to FedEx address format
     */
    private mapToFedExAddress(address: CarrierAddress) {
        return {
            streetLines: [address.street],
            city: address.city,
            stateOrProvinceCode: address.state,
            postalCode: address.postalCode,
            countryCode: address.country === 'Mexico' || address.country === 'MX' ? 'MX' : address.country,
        };
    }
}
