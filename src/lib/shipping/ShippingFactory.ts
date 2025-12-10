import { ShippingProvider } from './ShippingProvider';
import { FedExMock } from './providers/FedExMock';
import { DHLMock } from './providers/DHLMock';

export function getProvider(name: string): ShippingProvider {
    switch (name.toLowerCase()) {
        case 'fedex':
            return new FedExMock();
        case 'dhl':
            return new DHLMock();
        default:
            throw new Error(`Shipping provider '${name}' not found.`);
    }
}
