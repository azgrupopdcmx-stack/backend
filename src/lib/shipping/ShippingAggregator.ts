import { getProvider } from './ShippingFactory';
import { QuoteRequest, QuoteResult } from '../../types/shipping';

export class ShippingAggregator {
    private static readonly ACTIVE_CARRIERS = ['fedex', 'dhl'];
    private static readonly MARGIN_MULTIPLIER = 1.15; // 15% Markup

    /**
     * Get best quotes from all active carriers in parallel.
     * Tolerates individual carrier failures.
     */
    public async getBestQuotes(request: QuoteRequest): Promise<QuoteResult[]> {
        // 1. Prepare promises for all carriers
        const quotePromises = ShippingAggregator.ACTIVE_CARRIERS.map(async (carrierName) => {
            try {
                const provider = getProvider(carrierName);
                return await provider.getQuote(request);
            } catch (error) {
                // We re-throw here so Promise.allSettled can mark it as rejected, 
                // or we could handle generic factory errors.
                throw error;
            }
        });

        // 2. Execute in parallel
        const results = await Promise.allSettled(quotePromises);

        // 3. Process results
        const validQuotes: QuoteResult[] = [];

        results.forEach((result, index) => {
            const carrierName = ShippingAggregator.ACTIVE_CARRIERS[index];

            if (result.status === 'fulfilled') {
                // A carrier might return multiple service options (Standard, Express)
                const carrierQuotes = result.value;

                // Apply Margin to eah quote
                const markedUpQuotes = carrierQuotes.map(quote => ({
                    ...quote,
                    total_price: this.applyMargin(quote.total_price),
                    // We can also add a flag here if we want to show backend processing metadata
                }));

                validQuotes.push(...markedUpQuotes);
            } else {
                // Log the error securely - do not expose to user, but allow system to know
                console.warn(`Shipping Aggregator: Failed to fetch quotes from ${carrierName}`, result.reason);
            }
        });

        // 4. Sort by cheapest total price
        return validQuotes.sort((a, b) => a.total_price - b.total_price);
    }

    /**
     * Applies the Wupaq business logic margin.
     * @param price Raw carrier price
     * @returns Price with 15% margin
     */
    private applyMargin(price: number): number {
        const margin = price * ShippingAggregator.MARGIN_MULTIPLIER;
        // Round to 2 decimal places for currency
        return Math.round(margin * 100) / 100;
    }
}
