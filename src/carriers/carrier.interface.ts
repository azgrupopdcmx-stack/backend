/**
 * Carrier Service Interface
 * 
 * This interface defines the contract that all carrier integrations must implement.
 * It provides a unified abstraction layer for interacting with different shipping carriers
 * (Estafeta, FedEx, DHL, UPS, 99 Minutos, etc.)
 */

/**
 * Address structure for carrier API requests
 */
export interface CarrierAddress {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    company?: string;
    contactName?: string;
    phone?: string;
    email?: string;
}

/**
 * Package dimensions and weight
 */
export interface CarrierPackage {
    weight: number; // in kg
    weightUnit: 'kg' | 'lb';
    length: number; // in cm
    width: number;
    height: number;
    dimensionUnit: 'cm' | 'in';
    description?: string;
    value?: number; // declared value for insurance
    currency?: string;
}

/**
 * Unified rate response from any carrier
 */
export interface CarrierRate {
    carrier: string; // e.g., 'estafeta', 'fedex', 'dhl'
    carrierName: string; // e.g., 'Estafeta', 'FedEx', 'DHL'
    service: string; // Service code (e.g., 'express', 'ground')
    serviceName: string; // Human-readable service name
    price: number;
    currency: string; // 'MXN', 'USD'
    estimatedDays: number;
    features: string[]; // e.g., ['tracking', 'insurance', 'signature']
    metadata?: Record<string, any>; // Carrier-specific data
}

/**
 * Shipment creation request
 */
export interface CreateShipmentRequest {
    origin: CarrierAddress;
    destination: CarrierAddress;
    packages: CarrierPackage[];
    service: string; // Service code selected from rates
    reference?: string; // Customer reference number
    instructions?: string; // Special delivery instructions
}

/**
 * Shipment creation result
 */
export interface ShipmentResult {
    trackingNumber: string;
    labelUrl: string; // URL to download shipping label PDF
    carrier: string;
    service: string;
    estimatedDelivery?: Date;
    cost: number;
    currency: string;
    metadata?: Record<string, any>; // Carrier-specific response data
}

/**
 * Tracking event from carrier
 */
export interface TrackingEvent {
    timestamp: Date;
    status: string; // Normalized status: 'pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception'
    statusCode: string; // Carrier-specific status code
    location?: string;
    description: string;
    metadata?: Record<string, any>;
}

/**
 * Tracking information
 */
export interface TrackingInfo {
    trackingNumber: string;
    carrier: string;
    status: string; // Current normalized status
    estimatedDelivery?: Date;
    events: TrackingEvent[];
    metadata?: Record<string, any>;
}

/**
 * Carrier Service Interface
 * 
 * All carrier implementations (Estafeta, FedEx, DHL, etc.) must implement this interface
 */
export interface CarrierService {
    /**
     * Get shipping rates for a shipment
     * 
     * @param origin Origin address
     * @param destination Destination address
     * @param packages Array of packages to ship
     * @returns Array of available rates from this carrier
     */
    getRates(
        origin: CarrierAddress,
        destination: CarrierAddress,
        packages: CarrierPackage[],
    ): Promise<CarrierRate[]>;

    /**
     * Create a shipment with the carrier
     * 
     * @param request Shipment creation request
     * @returns Shipment result with tracking number and label
     */
    createShipment(request: CreateShipmentRequest): Promise<ShipmentResult>;

    /**
     * Get tracking information for a shipment
     * 
     * @param trackingNumber Tracking number from carrier
     * @returns Tracking information with events
     */
    getTracking(trackingNumber: string): Promise<TrackingInfo>;

    /**
     * Cancel a shipment
     * 
     * @param trackingNumber Tracking number to cancel
     * @returns True if cancellation was successful
     */
    cancelShipment(trackingNumber: string): Promise<boolean>;

    /**
     * Validate an address with the carrier's API
     * 
     * @param address Address to validate
     * @returns Validated/corrected address or null if invalid
     */
    validateAddress?(address: CarrierAddress): Promise<CarrierAddress | null>;
}

export type RateQuote = CarrierRate;
export type CreateShipmentResponse = ShipmentResult;

/**
 * Carrier configuration stored in database
 */
export interface CarrierConfig {
    sandbox?: boolean;
    credentials: {
        apiKey: string;
        apiSecret: string;
        accountNumber?: string;
        meterNumber?: string;
        [key: string]: any;
    };
    baseUrl?: string;
    [key: string]: any; // Allow carrier-specific config
}
