import { RateQuote, CreateShipmentResponse, TrackingInfo, TrackingEvent } from '../carrier.interface';
import { DHLRateResponse, DHLShipResponse, DHLTrackResponse } from './dhl.types';

export function mapDHLRatesToQuotes(response: DHLRateResponse): RateQuote[] {
    if (!response.products) return [];

    return response.products.map((product) => {
        const priceInfo = product.totalPrice.find(p => p.currencyType === 'BILLC') || product.totalPrice[0];

        return {
            carrier: 'DHL',
            carrierName: 'DHL',
            service: product.productCode,
            serviceName: product.productName,
            price: priceInfo.price,
            currency: priceInfo.priceCurrency,
            estimatedDays: 0, // Calculate if possible
            features: [],
            // estimatedDeliveryDate: product.deliveryCapabilities.estimatedDeliveryDateAndTime, // Not in interface
        };
    });
}

export function mapDHLShipmentToResponse(response: DHLShipResponse): CreateShipmentResponse {
    const labelDoc = response.documents?.find(d => d.typeCode === 'label') || response.documents?.[0];

    return {
        trackingNumber: response.shipmentTrackingNumber,
        carrier: 'DHL',
        labelUrl: labelDoc ? `data:application/pdf;base64,${labelDoc.content}` : '',
        service: 'EXPRESS',
        cost: 0,
        currency: 'MXN',
    };
}

export function mapDHLTrackingToInfo(response: DHLTrackResponse): TrackingInfo {
    const shipment = response.shipments?.[0];
    if (!shipment) {
        throw new Error('No tracking information found');
    }

    const events: TrackingEvent[] = shipment.events.map(event => ({
        status: event.description,
        statusCode: event.typeCode,
        timestamp: new Date(`${event.date}T${event.time}`),
        location: event.serviceArea?.description || '',
        description: event.description,
    }));

    return {
        trackingNumber: shipment.shipmentTrackingNumber,
        carrier: 'DHL',
        status: shipment.status.statusCode, // Map to standard status if needed
        estimatedDelivery: undefined, // DHL tracking might not always have this in the same place
        events,
    };
}
