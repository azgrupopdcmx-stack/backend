export interface UPSRateRequest {
    RateRequest: {
        Request: {
            TransactionReference?: {
                CustomerContext: string;
            };
        };
        Shipment: {
            Shipper: {
                Name: string;
                ShipperNumber: string;
                Address: {
                    AddressLine: string[];
                    City: string;
                    StateProvinceCode: string;
                    PostalCode: string;
                    CountryCode: string;
                };
            };
            ShipTo: {
                Name: string;
                Address: {
                    AddressLine: string[];
                    City: string;
                    StateProvinceCode: string;
                    PostalCode: string;
                    CountryCode: string;
                };
            };
            ShipFrom: {
                Name: string;
                Address: {
                    AddressLine: string[];
                    City: string;
                    StateProvinceCode: string;
                    PostalCode: string;
                    CountryCode: string;
                };
            };
            Package: {
                Packaging: {
                    Code: string;
                };
                Dimensions?: {
                    UnitOfMeasurement: {
                        Code: string;
                    };
                    Length: string;
                    Width: string;
                    Height: string;
                };
                PackageWeight: {
                    UnitOfMeasurement: {
                        Code: string;
                    };
                    Weight: string;
                };
            }[];
        };
    };
}

export interface UPSRateResponse {
    RateResponse: {
        RatedShipment: {
            Service: {
                Code: string;
            };
            TotalCharges: {
                CurrencyCode: string;
                MonetaryValue: string;
            };
            GuaranteedDelivery?: {
                BusinessDaysInTransit: string;
            };
        }[];
    };
}

export interface UPSShipRequest {
    ShipmentRequest: {
        Shipment: {
            Description: string;
            Shipper: {
                Name: string;
                ShipperNumber: string;
                Address: {
                    AddressLine: string[];
                    City: string;
                    StateProvinceCode: string;
                    PostalCode: string;
                    CountryCode: string;
                };
            };
            ShipTo: {
                Name: string;
                Address: {
                    AddressLine: string[];
                    City: string;
                    StateProvinceCode: string;
                    PostalCode: string;
                    CountryCode: string;
                };
            };
            PaymentInformation: {
                ShipmentCharge: {
                    Type: string;
                    BillShipper: {
                        AccountNumber: string;
                    };
                };
            };
            Service: {
                Code: string;
            };
            Package: {
                Packaging: {
                    Code: string;
                };
                PackageWeight: {
                    UnitOfMeasurement: {
                        Code: string;
                    };
                    Weight: string;
                };
            }[];
        };
        LabelSpecification: {
            LabelImageFormat: {
                Code: string;
            };
        };
    };
}

export interface UPSShipResponse {
    ShipmentResponse: {
        ShipmentResults: {
            ShipmentIdentificationNumber: string;
            PackageResults: {
                TrackingNumber: string;
                ShippingLabel: {
                    GraphicImage: string; // Base64
                };
            }[];
        };
    };
}

export interface UPSTrackResponse {
    TrackResponse: {
        Shipment: {
            InquiryNumber: {
                Value: string;
            };
            Package: {
                TrackingNumber: string;
                Activity: {
                    Status: {
                        Type: string;
                        Description: string;
                        Code: string;
                    };
                    Date: string;
                    Time: string;
                    ActivityLocation: {
                        Address: {
                            City: string;
                            StateProvinceCode: string;
                            CountryCode: string;
                        };
                    };
                }[];
            }[];
        };
    };
}

export interface UPSOAuthTokenResponse {
    access_token: string;
    expires_in: number;
    status: string;
    token_type: string;
}
