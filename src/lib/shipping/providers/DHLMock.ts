import { ShippingProvider } from '../ShippingProvider';
import { QuoteRequest, QuoteResult } from '../../../types/shipping';

export class DHLMock extends ShippingProvider {
    readonly name = 'DHL';

    async getQuote(request: QuoteRequest): Promise<QuoteResult[]> {
        // Simulate faster network delay
        await new Promise(resolve => setTimeout(resolve, 400));

        return [
            {
                carrier_name: 'DHL',
                service_name: 'Express Worldwide',
                service_code: 'DHL_EXPRESS',
                total_price: 185.50,
                currency: 'MXN',
                estimated_days: 1,
                risk_score: 0.02,
                quote_id: `mock_dhl_${Date.now()}`
            }
        ];
    }

    async createLabel(quote_id: string): Promise<any> {
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
            tracking_number: '1234567890',
            label_url: 'https://mock-labels.wupaq.com/dhl/label.pdf',
            status: 'created'
        };
    }

    protected normalizeError(error: any): string {
        return 'DHL_MOCK_ERROR';
    }
}
