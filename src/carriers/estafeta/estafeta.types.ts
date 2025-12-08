/**
 * Estafeta API Type Definitions
 * 
 * These types map to Estafeta's API request/response structures.
 * Documentation: https://developers.estafeta.com (placeholder - will update with actual API docs)
 */

/**
 * Estafeta API Authentication
 */
export interface EstafetaAuthRequest {
    apiKey: string;
    apiSecret: string;
}

export interface EstafetaAuthResponse {
    token: string;
    expiresIn: number;
    tokenType: string;
}

/**
 * Estafeta Address Format
 */
export interface EstafetaAddress {
    nombre?: string; // Contact name
    empresa?: string; // Company name
    calle: string; // Street
    numeroExterior?: string; // Exterior number
    numeroInterior?: string; // Interior number
    colonia?: string; // Neighborhood
    ciudad: string; // City
    estado: string; // State
    codigoPostal: string; // Postal code
    pais: string; // Country (usually 'MX')
    telefono?: string; // Phone
    email?: string; // Email
    referencias?: string; // References/landmarks
}

/**
 * Estafeta Package/Parcel
 */
export interface EstafetaParcel {
    peso: number; // Weight in kg
    largo: number; // Length in cm
    ancho: number; // Width in cm
    alto: number; // Height in cm
    contenido?: string; // Package contents description
    valorDeclarado?: number; // Declared value
}

/**
 * Estafeta Rate Quote Request
 */
export interface EstafetaRateRequest {
    origen: {
        codigoPostal: string;
        ciudad?: string;
        estado?: string;
    };
    destino: {
        codigoPostal: string;
        ciudad?: string;
        estado?: string;
    };
    paquetes: EstafetaParcel[];
    tipoServicio?: string; // 'terrestre', 'express', 'dia_siguiente'
}

/**
 * Estafeta Rate Quote Response
 */
export interface EstafetaRateResponse {
    cotizaciones: EstafetaQuote[];
    error?: string;
    mensaje?: string;
}

export interface EstafetaQuote {
    servicio: string; // Service code
    nombreServicio: string; // Service name
    precio: number;
    moneda: string; // 'MXN'
    diasEstimados: number;
    fechaEntregaEstimada?: string; // ISO date string
    caracteristicas: string[]; // Features like 'rastreo', 'seguro'
    pesoVolumetrico?: number;
    detalles?: Record<string, any>;
}

/**
 * Estafeta Shipment Creation Request
 */
export interface EstafetaCreateShipmentRequest {
    origen: EstafetaAddress;
    destino: EstafetaAddress;
    paquetes: EstafetaParcel[];
    servicio: string; // Service code from quote
    referencia?: string; // Customer reference
    instrucciones?: string; // Delivery instructions
    seguro?: boolean; // Include insurance
    recoleccion?: {
        fecha: string; // Pickup date
        horaInicio: string; // Pickup time start
        horaFin: string; // Pickup time end
    };
}

/**
 * Estafeta Shipment Creation Response
 */
export interface EstafetaCreateShipmentResponse {
    numeroGuia: string; // Tracking number
    etiqueta: {
        url: string; // Label PDF URL
        formato: string; // 'PDF'
    };
    servicio: string;
    costo: number;
    moneda: string;
    fechaEntregaEstimada?: string;
    error?: string;
    mensaje?: string;
    detalles?: Record<string, any>;
}

/**
 * Estafeta Tracking Request
 */
export interface EstafetaTrackingRequest {
    numeroGuia: string; // Tracking number
    tipoGuia?: string; // Type: 'nacional', 'internacional'
}

/**
 * Estafeta Tracking Response
 */
export interface EstafetaTrackingResponse {
    numeroGuia: string;
    estatus: string; // Current status
    eventos: EstafetaTrackingEvent[];
    origen?: string;
    destino?: string;
    fechaEntregaEstimada?: string;
    fechaEntregaReal?: string;
    error?: string;
    mensaje?: string;
}

export interface EstafetaTrackingEvent {
    fecha: string; // ISO date string
    hora: string; // Time
    estatus: string; // Status code
    descripcion: string; // Status description
    ubicacion?: string; // Location
    ciudad?: string;
    estado?: string;
    comentarios?: string;
}

/**
 * Estafeta Cancellation Request
 */
export interface EstafetaCancelShipmentRequest {
    numeroGuia: string;
    motivo?: string; // Cancellation reason
}

/**
 * Estafeta Cancellation Response
 */
export interface EstafetaCancelShipmentResponse {
    cancelado: boolean;
    numeroGuia: string;
    mensaje?: string;
    error?: string;
}

/**
 * Estafeta API Error Response
 */
export interface EstafetaErrorResponse {
    error: string;
    mensaje: string;
    codigo?: string;
    detalles?: Record<string, any>;
}

/**
 * Estafeta Service Types
 */
export enum EstafetaServiceType {
    TERRESTRE = 'terrestre', // Ground shipping
    EXPRESS = 'express', // Express shipping
    DIA_SIGUIENTE = 'dia_siguiente', // Next day
    DOS_DIAS = 'dos_dias', // 2-day shipping
    ECONOMIA = 'economia', // Economy shipping
}

/**
 * Estafeta Status Codes (common ones)
 */
export enum EstafetaStatus {
    RECOLECTADO = 'recolectado', // Picked up
    EN_TRANSITO = 'en_transito', // In transit
    EN_REPARTO = 'en_reparto', // Out for delivery
    ENTREGADO = 'entregado', // Delivered
    DEVUELTO = 'devuelto', // Returned
    CANCELADO = 'cancelado', // Cancelled
    PENDIENTE = 'pendiente', // Pending
    EXCEPCION = 'excepcion', // Exception
}
