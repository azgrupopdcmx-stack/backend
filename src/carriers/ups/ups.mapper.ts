import { RateQuote, CreateShipmentResponse, TrackingInfo, TrackingEvent } from '../carrier.interface';
import { UPSRateResponse, UPSShipResponse, UPSTrackResponse } from './ups.types';

export function mapUPSRatesToQuotes(response: UPSRateResponse): RateQuote[] {
    if (!response.RateResponse?.RatedShipment) return [];

    const shipments = Array.isArray(response.RateResponse.RatedShipment)
        ? response.RateResponse.RatedShipment
        : [response.RateResponse.RatedShipment];

    return shipments.map((shipment) => ({
        carrier: 'UPS',
        carrierName: 'UPS',
        service: shipment.Service.Code,
        serviceName: `UPS Service ${shipment.Service.Code}`,
        price: parseFloat(shipment.TotalCharges.MonetaryValue),
        currency: shipment.TotalCharges.CurrencyCode,
        estimatedDays: shipment.GuaranteedDelivery?.BusinessDaysInTransit ? parseInt(shipment.GuaranteedDelivery.BusinessDaysInTransit) : 0,
        features: [],
    }));
}

export function mapUPSShipmentToResponse(response: UPSShipResponse): CreateShipmentResponse {
    const results = response.ShipmentResponse.ShipmentResults;
    const pkgResults: any = results.PackageResults;
    const pkgResult = Array.isArray(pkgResults) ? pkgResults[0] : pkgResults;

    return {
        trackingNumber: results.ShipmentIdentificationNumber,
        carrier: 'UPS',
        labelUrl: pkgResult.ShippingLabel?.GraphicImage
            ? `data:image/gif;base64,${pkgResult.ShippingLabel.GraphicImage}`
            : '',
        service: '03', // Default or extract from response if available
        cost: 0,
        currency: 'MXN',
    };
}

export function mapUPSTrackingToInfo(response: UPSTrackResponse): TrackingInfo {
    const shipment = response.TrackResponse.Shipment;
    const pkg = Array.isArray(shipment.Package) ? shipment.Package[0] : shipment.Package;

    if (!pkg) {
        throw new Error('No package tracking information found');
    }

    const activities = Array.isArray(pkg.Activity) ? pkg.Activity : [pkg.Activity];

    const events: TrackingEvent[] = activities.map(activity => ({
        status: activity.Status.Description,
        statusCode: activity.Status.Code,
        timestamp: new Date(`${activity.Date}T${activity.Time}`),
        location: `${activity.ActivityLocation?.Address?.City || ''}, ${activity.ActivityLocation?.Address?.CountryCode || ''}`,
        description: activity.Status.Description,
    }));

    return {
        trackingNumber: pkg.TrackingNumber,
        carrier: 'UPS',
        status: activities[0]?.Status?.Code || 'UNKNOWN',
        estimatedDelivery: undefined,
        events,
    };
}
