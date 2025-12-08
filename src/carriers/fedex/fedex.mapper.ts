/**
 * FedEx API Response Mappers
 * 
 * Maps FedEx-specific API responses to Wupaq's unified carrier interface.
 */

import type { RateQuote, CreateShipmentResponse, TrackingInfo } from '../carrier.interface';
import type {
    FedExRateResponse,
    FedExShipResponse,
    FedExTrackResponse,
} from './fedex.types';

/**
 * Map FedEx service code to transit days
 */
const getTransitDays = (transitTime?: string): number => {
    if (!transitTime) return 3; // Default

    const map: Record<string, number> = {
        'ONE_DAY': 1,
        'TWO_DAYS': 2,
        'THREE_DAYS': 3,
        'FOUR_DAYS': 4,
        'FIVE_DAYS': 5,
    };

    return map[transitTime] || 3;
};

/**
 * Map FedEx rates API response to unified format
 */
export function mapFedExRatesToQuotes(response: FedExRateResponse): RateQuote[] {
    if (!response.output?.rateReplyDetails) {
        return [];
    }

    return response.output.rateReplyDetails.map((rate) => {
        const ratedDetail = rate.ratedShipmentDetails?.[0];
        const charge = ratedDetail?.shipmentRateDetail?.totalNetCharge || ratedDetail?.totalNetCharge || 0;

        return {
            carrier: 'FedEx',
            carrierName: 'FedEx',
            service: rate.serviceType,
            serviceName: rate.serviceName || rate.serviceType,
            price: charge,
            currency: ratedDetail?.currency || 'USD',
            estimatedDays: getTransitDays(rate.transitTime),
            features: [],
            metadata: {
                rateType: ratedDetail?.rateType,
                commitDate: rate.commit?.dateDetail?.dayOfWeek,
                transitTime: rate.transitTime,
            },
        };
    });
}

/**
 * Map FedEx shipment response to unified format
 */
export function mapFedExShipmentToResponse(response: FedExShipResponse): CreateShipmentResponse {
    const shipment = response.output?.transactionShipments?.[0];
    const piece = shipment?.pieceResponses?.[0];
    const labelDoc = piece?.packageDocuments?.find((doc) => doc.contentType === 'LABEL');

    return {
        carrier: 'FedEx',
        trackingNumber: piece?.trackingNumber || shipment?.masterTrackingNumber || '',
        labelUrl: labelDoc?.url || '',
        service: shipment?.serviceType || 'FEDEX_GROUND',
        cost: 0, // Not returned in ship response
        currency: 'USD',
        estimatedDelivery: undefined, // FedEx doesn't return this in ship response
        metadata: {
            masterTrackingNumber: shipment?.masterTrackingNumber,
            serviceType: shipment?.serviceType,
            shipDate: shipment?.shipDatestamp,
            labelFormat: labelDoc?.docType,
        },
    };
}

/**
 * Map FedEx tracking response to unified format
 */
export function mapFedExTrackingToInfo(response: FedExTrackResponse): TrackingInfo {
    const result = response.output?.completeTrackResults?.[0];
    const trackResult = result?.trackResults?.[0];

    // Map scan events
    const events = (trackResult?.scanEvents || []).map((event) => ({
        timestamp: new Date(event.date),
        status: event.derivedStatus || event.eventType,
        statusCode: event.eventType,
        description: event.eventDescription,
        location: event.scanLocation
            ? `${event.scanLocation.city || ''}, ${event.scanLocation.stateOrProvinceCode || ''}`.trim()
            : undefined,
    }));

    // Get estimated delivery
    const estimatedDelivery = trackResult?.dateAndTimes?.find(
        (dt) => dt.type === 'ESTIMATED_DELIVERY' || dt.type === 'ACTUAL_DELIVERY'
    )?.dateTime;

    return {
        trackingNumber: trackResult?.trackingNumberInfo?.trackingNumber || result?.trackingNumber || '',
        status: trackResult?.latestStatusDetail?.statusByLocale || 'Unknown',
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        events,
        carrier: 'FedEx',
    };
}
