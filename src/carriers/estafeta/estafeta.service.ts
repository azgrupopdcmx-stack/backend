/**
 * Estafeta Carrier Service Implementation
 * 
 * Implements the CarrierService interface for Estafeta shipping carrier.
 * Handles authentication, rate quotes, shipment creation, tracking, and cancellation.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import type { CarrierConfig } from '../carrier.interface';
import {
    CarrierService,
    CarrierAddress,
    CarrierPackage,
    CarrierRate,
    CreateShipmentRequest,
    ShipmentResult,
    TrackingInfo,
} from '../carrier.interface';
import type {
    EstafetaErrorResponse,
} from './estafeta.types';
import {
    EstafetaRateRequest,
    EstafetaRateResponse,
    EstafetaCreateShipmentRequest,
    EstafetaCreateShipmentResponse,
    EstafetaTrackingRequest,
    EstafetaTrackingResponse,
    EstafetaCancelShipmentRequest,
    EstafetaCancelShipmentResponse,
    EstafetaAuthResponse,
    EstafetaAddress,
} from './estafeta.types';
import {
    mapToEstafetaAddress,
    mapToEstafetaParcel,
    mapEstafetaQuoteToRate,
    mapEstafetaShipmentToResult,
    mapEstafetaTrackingToInfo,
} from './estafeta.mapper';

@Injectable()
export class EstafetaService implements CarrierService {
    private readonly logger = new Logger(EstafetaService.name);
    private authToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor(private readonly config: CarrierConfig) {
        this.validateConfig();
    }

    /**
     * Validate that required configuration is present
     */
    private validateConfig(): void {
        if (!this.config.credentials.apiKey || !this.config.credentials.apiSecret) {
            throw new Error('Estafeta API credentials are required');
        }
    }

    /**
     * Get base URL for API requests (sandbox or production)
     */
    private getBaseUrl(): string {
        if (this.config.sandbox) {
            return this.config.baseUrl || 'https://api-sandbox.estafeta.com/v1';
        }
        return this.config.baseUrl || 'https://api.estafeta.com/v1';
    }

    /**
     * Authenticate with Estafeta API and get access token
     */
    private async authenticate(): Promise<string> {
        // Return cached token if still valid
        if (this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.authToken;
        }

        try {
            this.logger.log('Authenticating with Estafeta API...');

            const response = await fetch(`${this.getBaseUrl()}/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: this.config.credentials.apiKey,
                    apiSecret: this.config.credentials.apiSecret,
                }),
            });

            if (!response.ok) {
                const error: EstafetaErrorResponse = await response.json();
                this.logger.error('Estafeta authentication failed', { error: error.mensaje });
                throw new HttpException(
                    'Carrier authentication failed. Please try again later.',
                    HttpStatus.SERVICE_UNAVAILABLE,
                );
            }

            const data: EstafetaAuthResponse = await response.json();
            this.authToken = data.token;

            // Set expiry to 5 minutes before actual expiry for safety
            const expiryMs = (data.expiresIn - 300) * 1000;
            this.tokenExpiry = new Date(Date.now() + expiryMs);

            this.logger.log('Successfully authenticated with Estafeta');
            return this.authToken;
        } catch (error) {
            this.logger.error('Estafeta authentication error:', error);
            throw new HttpException(
                'Failed to authenticate with Estafeta',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Make authenticated API request to Estafeta
     */
    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: any,
    ): Promise<T> {
        const token = await this.authenticate();
        const url = `${this.getBaseUrl()}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            const data = await response.json();

            if (!response.ok) {
                const error = data as EstafetaErrorResponse;
                this.logger.error(`Estafeta API error: ${error.mensaje}`, error);
                throw new HttpException(
                    error.mensaje || 'Estafeta API request failed',
                    response.status,
                );
            }

            return data as T;
        } catch (error) {
            this.logger.error(`Estafeta API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Get shipping rates from Estafeta
     */
    async getRates(
        origin: CarrierAddress,
        destination: CarrierAddress,
        packages: CarrierPackage[],
    ): Promise<CarrierRate[]> {
        this.logger.log('Fetching rates from Estafeta...');

        const request: EstafetaRateRequest = {
            origen: {
                codigoPostal: origin.postalCode,
                ciudad: origin.city,
                estado: origin.state,
            },
            destino: {
                codigoPostal: destination.postalCode,
                ciudad: destination.city,
                estado: destination.state,
            },
            paquetes: packages.map(mapToEstafetaParcel),
        };

        try {
            const response = await this.makeRequest<EstafetaRateResponse>(
                '/cotizaciones',
                'POST',
                request,
            );

            if (!response.cotizaciones || response.cotizaciones.length === 0) {
                this.logger.warn('No rates available from Estafeta');
                return [];
            }

            const rates = response.cotizaciones.map(mapEstafetaQuoteToRate);
            this.logger.log(`Retrieved ${rates.length} rates from Estafeta`);
            return rates;
        } catch (error) {
            this.logger.error('Failed to get rates from Estafeta', error);
            throw new HttpException(
                'Failed to retrieve shipping rates from Estafeta',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Create a shipment with Estafeta
     */
    async createShipment(request: CreateShipmentRequest): Promise<ShipmentResult> {
        this.logger.log(`Creating Estafeta shipment with service: ${request.service}`);

        const estafetaRequest: EstafetaCreateShipmentRequest = {
            origen: mapToEstafetaAddress(request.origin),
            destino: mapToEstafetaAddress(request.destination),
            paquetes: request.packages.map(mapToEstafetaParcel),
            servicio: request.service,
            referencia: request.reference,
            instrucciones: request.instructions,
        };

        try {
            const response = await this.makeRequest<EstafetaCreateShipmentResponse>(
                '/guias',
                'POST',
                estafetaRequest,
            );

            const result = mapEstafetaShipmentToResult(response);
            this.logger.log(`Shipment created successfully: ${result.trackingNumber}`);
            return result;
        } catch (error) {
            this.logger.error('Failed to create Estafeta shipment', error);
            throw new HttpException(
                'Failed to create shipment with Estafeta',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get tracking information from Estafeta
     */
    async getTracking(trackingNumber: string): Promise<TrackingInfo> {
        this.logger.log(`Fetching tracking info for: ${trackingNumber}`);

        const request: EstafetaTrackingRequest = {
            numeroGuia: trackingNumber,
        };

        try {
            const response = await this.makeRequest<EstafetaTrackingResponse>(
                `/rastreo/${trackingNumber}`,
                'GET',
            );

            const trackingInfo = mapEstafetaTrackingToInfo(response);
            this.logger.log(`Retrieved ${trackingInfo.events.length} tracking events`);
            return trackingInfo;
        } catch (error) {
            this.logger.error(`Failed to get tracking info for ${trackingNumber}`, error);
            throw new HttpException(
                'Failed to retrieve tracking information from Estafeta',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Cancel a shipment with Estafeta
     */
    async cancelShipment(trackingNumber: string): Promise<boolean> {
        this.logger.log(`Cancelling Estafeta shipment: ${trackingNumber}`);

        const request: EstafetaCancelShipmentRequest = {
            numeroGuia: trackingNumber,
            motivo: 'Cancelación solicitada por el cliente',
        };

        try {
            const response = await this.makeRequest<EstafetaCancelShipmentResponse>(
                `/guias/${trackingNumber}/cancelar`,
                'POST',
                request,
            );

            if (response.cancelado) {
                this.logger.log(`Shipment ${trackingNumber} cancelled successfully`);
                return true;
            } else {
                this.logger.warn(`Failed to cancel shipment ${trackingNumber}: ${response.mensaje}`);
                return false;
            }
        } catch (error) {
            this.logger.error(`Failed to cancel shipment ${trackingNumber}`, error);
            throw new HttpException(
                'Failed to cancel shipment with Estafeta',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Validate address with Estafeta (optional implementation)
     */
    async validateAddress(address: CarrierAddress): Promise<CarrierAddress | null> {
        this.logger.log('Validating address with Estafeta...');

        try {
            const estafetaAddress = mapToEstafetaAddress(address);

            const response = await this.makeRequest<{ valida: boolean; direccion?: EstafetaAddress }>(
                '/validar-direccion',
                'POST',
                estafetaAddress,
            );

            if (response.valida && response.direccion) {
                // Map validated address back to our format
                return {
                    street: response.direccion.calle,
                    city: response.direccion.ciudad,
                    state: response.direccion.estado,
                    postalCode: response.direccion.codigoPostal,
                    country: response.direccion.pais,
                    company: response.direccion.empresa,
                    contactName: response.direccion.nombre,
                    phone: response.direccion.telefono,
                    email: response.direccion.email,
                };
            }

            return null;
        } catch (error) {
            this.logger.error('Address validation failed', error);
            return null; // Return null instead of throwing to allow graceful degradation
        }
    }
}
