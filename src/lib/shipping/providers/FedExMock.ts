import { ShippingProvider } from '../ShippingProvider';
import { QuoteRequest, QuoteResult } from '../../../types/shipping';

export class FedExMock extends ShippingProvider {
    readonly name = 'FedEx';

    async getQuote(request: QuoteRequest): Promise<QuoteResult[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        return [
            {
                carrier_name: 'FedEx',
                service_name: 'Standard Overnight',
                service_code: 'FEDEX_OVERNIGHT',
                total_price: 150.00,
                currency: 'MXN',
                estimated_days: 3,
                risk_score: 0.05,
                quote_id: `mock_fedex_${Date.now()}`
            }
        ];
    }

    async createLabel(quote_id: string): Promise<any> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            tracking_number: '794802840192',
            label_url: 'https://mock-labels.wupaq.com/fedex/label.pdf',
            status: 'created'
        };
    }

    protected normalizeError(error: any): string {
        return 'FEDEX_MOCK_ERROR';
    }
}
