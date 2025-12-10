import { QuoteRequest, QuoteResult } from '../../types/shipping';

/**
 * Abstract Base Class for Shipping Providers.
 * Enforces a standardized interface for all carrier integrations (FedEx, DHL, Estafeta, etc.).
 */
export abstract class ShippingProvider {
    /**
     * The name of the carrier (e.g., 'FedEx', 'DHL')
     */
    abstract readonly name: string;

    /**
     * Get functionality to retrieve shipping quotes.
     * @param request Standardized quote request
     */
    abstract getQuote(request: QuoteRequest): Promise<QuoteResult[]>;

    /**
     * Create a shipping label from a quote.
     * @param quote_id The ID of the quote to book
     */
    abstract createLabel(quote_id: string): Promise<any>;

    /**
     * Converts carrier-specific error responses into a standardized Wupaq error string.
     * This is crucial for unified error handling across different carrier APIs.
     * 
     * @param error The raw error object from the carrier API
     * @returns A standardized string describing the error (e.g., "INVALID_ADDRESS_ZIP")
     */
    protected abstract normalizeError(error: any): string;
}
