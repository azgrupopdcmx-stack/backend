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
    UPSRateRequest,
    UPSRateResponse,
    UPSShipRequest,
    UPSShipResponse,
    UPSTrackResponse,
    UPSOAuthTokenResponse,
} from './ups.types';
import { mapUPSRatesToQuotes, mapUPSShipmentToResponse, mapUPSTrackingToInfo } from './ups.mapper';

@Injectable()
export class UPSService implements CarrierService {
    private readonly logger = new Logger(UPSService.name);
    private readonly config: CarrierConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(@Inject('UPS_CONFIG') config: CarrierConfig) {
        this.config = config;
        this.validateConfig();
    }

    private validateConfig() {
        if (!this.config.credentials.apiKey || !this.config.credentials.apiSecret) {
            this.logger.warn('UPS API credentials are not configured. Service will operate in mock mode.');
        }
    }

    /**
     * Authenticate with UPS OAuth2
     */
    private async authenticate(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
            return this.accessToken;
        }

        const authUrl = this.config.sandbox
            ? 'https://wwwcie.ups.com/security/v1/oauth/token'
            : 'https://onlinetools.ups.com/security/v1/oauth/token';

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');

        const auth = Buffer.from(`${this.config.credentials.apiKey}:${this.config.credentials.apiSecret}`).toString('base64');

        try {
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`,
                },
                body: params.toString(),
            });

            if (!response.ok) {
                throw new Error(`UPS OAuth failed: ${response.status}`);
            }

            const data: UPSOAuthTokenResponse = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);

            this.logger.log('✅ UPS authentication successful');
            return this.accessToken;
        } catch (error: any) {
            this.logger.error('UPS authentication failed:', error.message);
            throw new HttpException('UPS authentication failed', HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * Make authenticated API request
     */
    private async request<T>(endpoint: string, body: any = null, method: string = 'POST'): Promise<T> {
        const token = await this.authenticate();
        const baseUrl = this.config.sandbox
            ? 'https://wwwcie.ups.com/api'
            : 'https://onlinetools.ups.com/api';

        const headers: HeadersInit = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'transId': Date.now().toString(),
            'transactionSrc': 'Wupaq',
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
                const error = await response.json().catch(() => ({ response: { errors: [{ message: response.statusText }] } }));
                this.logger.error(`UPS API error: ${JSON.stringify(error)}`);
                throw new HttpException(
                    error.response?.errors?.[0]?.message || 'UPS API request failed',
                    response.status
                );
            }

            return response.json();
        } catch (error: any) {
            if (error instanceof HttpException) throw error;
            this.logger.error('UPS request failed:', error.message);
            throw new HttpException('UPS request failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get shipping rates
     */
    async getRates(origin: CarrierAddress, destination: CarrierAddress, packages: CarrierPackage[]): Promise<RateQuote[]> {
        this.logger.log('Fetching UPS rates...');

        const request: UPSRateRequest = {
            RateRequest: {
                Request: {
                    TransactionReference: {
                        CustomerContext: 'Rate Request',
                    },
                },
                Shipment: {
                    Shipper: {
                        Name: origin.contactName || 'Shipper',
                        ShipperNumber: this.config.credentials.accountNumber || '',
                        Address: this.mapToUPSAddress(origin),
                    },
                    ShipTo: {
                        Name: destination.contactName || 'Recipient',
                        Address: this.mapToUPSAddress(destination),
                    },
                    ShipFrom: {
                        Name: origin.contactName || 'Shipper',
                        Address: this.mapToUPSAddress(origin),
                    },
                    Package: packages.map(pkg => ({
                        Packaging: {
                            Code: '02', // Customer Supplied Package
                        },
                        Dimensions: pkg.length && pkg.width && pkg.height ? {
                            UnitOfMeasurement: {
                                Code: pkg.dimensionUnit === 'cm' ? 'CM' : 'IN',
                            },
                            Length: pkg.length.toString(),
                            Width: pkg.width.toString(),
                            Height: pkg.height.toString(),
                        } : undefined,
                        PackageWeight: {
                            UnitOfMeasurement: {
                                Code: pkg.weightUnit === 'kg' ? 'KGS' : 'LBS',
                            },
                            Weight: pkg.weight.toString(),
                        },
                    })),
                },
            },
        };

        const response = await this.request<UPSRateResponse>('/rating/v1/Shop', request);
        return mapUPSRatesToQuotes(response);
    }

    /**
     * Create shipment
     */
    async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
        this.logger.log('Creating UPS shipment...');

        const shipRequest: UPSShipRequest = {
            ShipmentRequest: {
                Shipment: {
                    Description: 'Shipment',
                    Shipper: {
                        Name: request.origin.contactName || 'Shipper',
                        ShipperNumber: this.config.credentials.accountNumber || '',
                        Address: this.mapToUPSAddress(request.origin),
                    },
                    ShipTo: {
                        Name: request.destination.contactName || 'Recipient',
                        Address: this.mapToUPSAddress(request.destination),
                    },
                    PaymentInformation: {
                        ShipmentCharge: {
                            Type: '01', // Transportation
                            BillShipper: {
                                AccountNumber: this.config.credentials.accountNumber || '',
                            },
                        },
                    },
                    Service: {
                        Code: request.service || '03', // Ground
                    },
                    Package: request.packages.map(pkg => ({
                        Packaging: {
                            Code: '02',
                        },
                        PackageWeight: {
                            UnitOfMeasurement: {
                                Code: pkg.weightUnit === 'kg' ? 'KGS' : 'LBS',
                            },
                            Weight: pkg.weight.toString(),
                        },
                    })),
                },
                LabelSpecification: {
                    LabelImageFormat: {
                        Code: 'GIF',
                    },
                },
            },
        };

        const response = await this.request<UPSShipResponse>('/shipments/v1/ship', shipRequest);
        return mapUPSShipmentToResponse(response);
    }

    /**
     * Get tracking information
     */
    async getTracking(trackingNumber: string): Promise<TrackingInfo> {
        this.logger.log(`Fetching UPS tracking for: ${trackingNumber}`);
        const response = await this.request<UPSTrackResponse>(`/track/v1/details/${trackingNumber}`, null, 'GET');
        return mapUPSTrackingToInfo(response);
    }

    /**
     * Cancel shipment
     */
    async cancelShipment(trackingNumber: string): Promise<boolean> {
        this.logger.warn(`UPS cancellation not implemented for: ${trackingNumber}`);
        throw new HttpException('UPS shipment cancellation not yet implemented', HttpStatus.NOT_IMPLEMENTED);
    }

    /**
     * Validate address
     */
    async validateAddress(address: CarrierAddress): Promise<CarrierAddress | null> {
        this.logger.warn('UPS address validation not implemented');
        return null;
    }

    /**
     * Map to UPS address format
     */
    private mapToUPSAddress(address: CarrierAddress) {
        return {
            AddressLine: [address.street],
            City: address.city,
            StateProvinceCode: address.state,
            PostalCode: address.postalCode,
            CountryCode: address.country === 'Mexico' || address.country === 'MX' ? 'MX' : address.country,
        };
    }
}
