export interface DHLRateRequest {
    customerDetails: {
        shipperDetails: {
            postalCode: string;
            city: string;
            countryCode: string;
        };
        receiverDetails: {
            postalCode: string;
            city: string;
            countryCode: string;
        };
    };
    plannedShippingDateAndTime: string;
    unitOfMeasurement: 'SI' | 'SU';
    isCustomsDeclarable: boolean;
    monetaryAmount?: [
        {
            typeCode: 'declaredValue';
            value: number;
            currency: string;
        }
    ];
    packages: {
        weight: number;
        dimensions?: {
            length: number;
            width: number;
            height: number;
        };
    }[];
}

export interface DHLRateResponse {
    products: {
        productName: string;
        productCode: string;
        totalPrice: {
            currencyType: string;
            priceCurrency: string;
            price: number;
        }[];
        deliveryCapabilities: {
            deliveryTypeCode: string;
            estimatedDeliveryDateAndTime: string;
        };
    }[];
}

export interface DHLShipRequest {
    plannedShippingDateAndTime: string;
    pickup: {
        isRequested: boolean;
    };
    productCode: string;
    accounts: {
        typeCode: 'shipper';
        number: string;
    }[];
    customerDetails: {
        shipperDetails: {
            postalCode: string;
            city: string;
            countryCode: string;
            addressLine1: string;
            fullName: string;
            companyName: string;
            email?: string;
            phoneNumber: string;
        };
        receiverDetails: {
            postalCode: string;
            city: string;
            countryCode: string;
            addressLine1: string;
            fullName: string;
            companyName: string;
            email?: string;
            phoneNumber: string;
        };
    };
    content: {
        packages: {
            weight: number;
            dimensions?: {
                length: number;
                width: number;
                height: number;
            };
        }[];
        isCustomsDeclarable: boolean;
        description: string;
        incoterm: 'DAP' | 'DDP'; // Common incoterms
        unitOfMeasurement: 'SI' | 'SU';
    };
}

export interface DHLShipResponse {
    shipmentTrackingNumber: string;
    packages: {
        trackingNumber: string;
    }[];
    documents: {
        imageFormat: string;
        content: string; // Base64
        typeCode: string;
    }[];
}

export interface DHLTrackResponse {
    shipments: {
        shipmentTrackingNumber: string;
        status: {
            statusCode: string;
            status: string;
            timestamp: string;
            location: {
                address: {
                    addressLocality: string;
                };
            };
        };
        events: {
            date: string;
            time: string;
            typeCode: string;
            description: string;
            serviceArea: {
                code: string;
                description: string;
            };
        }[];
    }[];
}

export interface DHLOAuthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}
