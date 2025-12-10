export interface Dimensions {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
}

export interface Address {
    street: string;
    external_number: string; // Crucial for accurate geolocation in Mexico
    internal_number?: string;
    colonia: string; // Neighborhood - Critical for Mexican zip codes
    municipality?: string; // Delegación/Municipio
    city: string;
    state: string;
    zip: string;
    country: string; // ISO Code (e.g., MX)
    is_residential?: boolean;
    reference?: string; // "Between street X and Y" - Critical for delivery success
    rfc?: string; // Tax ID - Required for commercial invoices
    contact_name?: string;
    phone?: string;
    email?: string;
}

export interface QuoteRequest {
    origin: Address;
    destination: Address;
    dimensions: Dimensions;
    weight: number;
    weight_unit: 'kg' | 'lb';
    insurance_value?: number;
    insurance_currency?: string;
}

export interface QuoteResult {
    carrier_name: string;
    service_name: string;
    service_code?: string;
    total_price: number;
    currency: string;
    estimated_days: number;
    risk_score?: number; // 0-1 score indicating delivery success probability
    quote_id?: string;
}
