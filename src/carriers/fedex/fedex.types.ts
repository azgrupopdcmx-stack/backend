/**
 * FedEx API Types
 * 
 * Based on FedEx RESTful APIs (FedEx Developer Portal)
 * Docs: https://developer.fedex.com/api/en-us/catalog/rate/docs.html
 */

/**
 * FedEx Rate Request
 */
export interface FedExRateRequest {
    accountNumber: {
        value: string;
    };
    requestedShipment: {
        shipper: {
            address: FedExAddress;
        };
        recipient: {
            address: FedExAddress;
        };
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION' | 'CONTACT_FEDEX_TO_SCHEDULE' | 'USE_SCHEDULED_PICKUP';
        rateRequestType: ['ACCOUNT' | 'LIST', 'PREFERRED'];
        requestedPackageLineItems: Array<{
            weight: {
                units: 'KG' | 'LB';
                value: number;
            };
            dimensions?: {
                length: number;
                width: number;
                height: number;
                units: 'CM' | 'IN';
            };
        }>;
    };
}

/**
 * FedEx Address
 */
export interface FedExAddress {
    streetLines?: string[];
    city?: string;
    stateOrProvinceCode?: string;
    postalCode: string;
    countryCode: string;
}

/**
 * FedEx Rate Response
 */
export interface FedExRateResponse {
    output: {
        rateReplyDetails: Array<{
            serviceType: string; // e.g., 'FEDEX_GROUND', 'FEDEX_EXPRESS_SAVER'
            serviceName: string;
            ratedShipmentDetails: Array<{
                rateType: string;
                totalNetCharge: number;
                currency: string;
                shipmentRateDetail: {
                    totalNetCharge: number;
                    totalNetChargeWithDutiesAndTaxes?: number;
                };
            }>;
            commit?: {
                dateDetail?: {
                    dayOfWeek?: string;
                };
            };
            transitTime?: string; // e.g., 'ONE_DAY', 'TWO_DAYS'
        }>;
    };
}

/**
 * FedEx Ship Request
 */
export interface FedExShipRequest {
    accountNumber: {
        value: string;
    };
    requestedShipment: {
        shipper: {
            contact: {
                personName: string;
                phoneNumber: string;
                companyName?: string;
            };
            address: FedExAddress;
        };
        recipients: Array<{
            contact: {
                personName: string;
                phoneNumber: string;
                companyName?: string;
            };
            address: FedExAddress;
        }>;
        shipDatestamp: string; // YYYY-MM-DD
        serviceType: string; // e.g., 'FEDEX_GROUND'
        packagingType: 'YOUR_PACKAGING' | 'FEDEX_BOX' | 'FEDEX_ENVELOPE';
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION' | 'CONTACT_FEDEX_TO_SCHEDULE';
        blockInsightVisibility?: boolean;
        shippingChargesPayment: {
            paymentType: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
        };
        labelSpecification: {
            labelFormatType: 'COMMON2D';
            imageType: 'PDF' | 'PNG';
            labelStockType: 'PAPER_4X6' | 'PAPER_7X4_75';
        };
        requestedPackageLineItems: Array<{
            weight: {
                units: 'KG' | 'LB';
                value: number;
            };
            dimensions?: {
                length: number;
                width: number;
                height: number;
                units: 'CM' | 'IN';
            };
        }>;
    };
}

/**
 * FedEx Ship Response
 */
export interface FedExShipResponse {
    output: {
        transactionShipments: Array<{
            masterTrackingNumber: string;
            serviceType: string;
            shipDatestamp: string;
            pieceResponses: Array<{
                trackingNumber: string;
                packageDocuments: Array<{
                    contentType: string; // 'LABEL'
                    docType: string; // 'PDF'
                    encodedLabel: string; // Base64
                    url?: string;
                }>;
            }>;
        }>;
    };
}

/**
 * FedEx Track Request
 */
export interface FedExTrackRequest {
    includeDetailedScans: boolean;
    trackingInfo: Array<{
        trackingNumberInfo: {
            trackingNumber: string;
        };
    }>;
}

/**
 * FedEx Track Response
 */
export interface FedExTrackResponse {
    output: {
        completeTrackResults: Array<{
            trackingNumber: string;
            trackResults: Array<{
                trackingNumberInfo: {
                    trackingNumber: string;
                };
                additionalTrackingInfo?: {
                    nickname?: string;
                };
                shipperInformation?: {
                    address?: FedExAddress;
                };
                recipientInformation?: {
                    address?: FedExAddress;
                };
                latestStatusDetail?: {
                    statusByLocale?: string;
                    description?: string;
                    scanLocation?: FedExAddress;
                };
                dateAndTimes?: Array<{
                    type: 'ACTUAL_DELIVERY' | 'ESTIMATED_DELIVERY' | 'SHIP_DATE';
                    dateTime: string;
                }>;
                scanEvents?: Array<{
                    date: string;
                    eventType: string;
                    eventDescription: string;
                    scanLocation?: FedExAddress;
                    derivedStatus?: string;
                }>;
            }>;
        }>;
    };
}

/**
 * FedEx OAuth Token Response
 */
export interface FedExOAuthTokenResponse {
    access_token: string;
    token_type: 'bearer';
    expires_in: number; // seconds
    scope: string;
}

/**
 * FedEx Error Response
 */
export interface FedExErrorResponse {
    errors: Array<{
        code: string;
        message: string;
        parameterList?: Array<{
            key: string;
            value: string;
        }>;
    }>;
}
