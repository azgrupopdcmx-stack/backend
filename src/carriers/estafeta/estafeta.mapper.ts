/**
 * Estafeta Data Mapper
 * 
 * Converts between Estafeta's API format and our unified CarrierService interface.
 * Handles normalization of addresses, rates, shipments, and tracking data.
 */

import {
    CarrierAddress,
    CarrierPackage,
    CarrierRate,
    ShipmentResult,
    TrackingInfo,
    TrackingEvent,
} from '../carrier.interface';
import {
    EstafetaAddress,
    EstafetaParcel,
    EstafetaQuote,
    EstafetaCreateShipmentResponse,
    EstafetaTrackingResponse,
    EstafetaTrackingEvent,
    EstafetaStatus,
} from './estafeta.types';

/**
 * Map our unified address format to Estafeta's format
 */
export function mapToEstafetaAddress(address: CarrierAddress): EstafetaAddress {
    return {
        calle: address.street,
        ciudad: address.city,
        estado: address.state,
        codigoPostal: address.postalCode,
        pais: address.country || 'MX',
        empresa: address.company,
        nombre: address.contactName,
        telefono: address.phone,
        email: address.email,
    };
}

/**
 * Map our unified package format to Estafeta's format
 */
export function mapToEstafetaParcel(pkg: CarrierPackage): EstafetaParcel {
    // Convert to kg and cm if needed
    const weightInKg = pkg.weightUnit === 'lb' ? pkg.weight * 0.453592 : pkg.weight;
    const lengthInCm = pkg.dimensionUnit === 'in' ? pkg.length * 2.54 : pkg.length;
    const widthInCm = pkg.dimensionUnit === 'in' ? pkg.width * 2.54 : pkg.width;
    const heightInCm = pkg.dimensionUnit === 'in' ? pkg.height * 2.54 : pkg.height;

    return {
        peso: Number(weightInKg.toFixed(2)),
        largo: Number(lengthInCm.toFixed(2)),
        ancho: Number(widthInCm.toFixed(2)),
        alto: Number(heightInCm.toFixed(2)),
        contenido: pkg.description,
        valorDeclarado: pkg.value,
    };
}

/**
 * Map Estafeta quote to our unified rate format
 */
export function mapEstafetaQuoteToRate(quote: EstafetaQuote): CarrierRate {
    return {
        carrier: 'estafeta',
        carrierName: 'Estafeta',
        service: quote.servicio,
        serviceName: quote.nombreServicio,
        price: quote.precio,
        currency: quote.moneda || 'MXN',
        estimatedDays: quote.diasEstimados,
        features: quote.caracteristicas || [],
        metadata: {
            pesoVolumetrico: quote.pesoVolumetrico,
            fechaEntregaEstimada: quote.fechaEntregaEstimada,
            detalles: quote.detalles,
        },
    };
}

/**
 * Map Estafeta shipment response to our unified result format
 */
export function mapEstafetaShipmentToResult(
    response: EstafetaCreateShipmentResponse,
): ShipmentResult {
    return {
        trackingNumber: response.numeroGuia,
        labelUrl: response.etiqueta.url,
        carrier: 'estafeta',
        service: response.servicio,
        estimatedDelivery: response.fechaEntregaEstimada
            ? new Date(response.fechaEntregaEstimada)
            : undefined,
        cost: response.costo,
        currency: response.moneda || 'MXN',
        metadata: {
            formato: response.etiqueta.formato,
            detalles: response.detalles,
        },
    };
}

/**
 * Normalize Estafeta status to our unified status codes
 */
export function normalizeEstafetaStatus(estafetaStatus: string): string {
    const statusMap: Record<string, string> = {
        [EstafetaStatus.PENDIENTE]: 'pending',
        [EstafetaStatus.RECOLECTADO]: 'in_transit',
        [EstafetaStatus.EN_TRANSITO]: 'in_transit',
        [EstafetaStatus.EN_REPARTO]: 'out_for_delivery',
        [EstafetaStatus.ENTREGADO]: 'delivered',
        [EstafetaStatus.DEVUELTO]: 'returned',
        [EstafetaStatus.CANCELADO]: 'cancelled',
        [EstafetaStatus.EXCEPCION]: 'exception',
    };

    return statusMap[estafetaStatus.toLowerCase()] || 'unknown';
}

/**
 * Map Estafeta tracking event to our unified format
 */
export function mapEstafetaTrackingEvent(event: EstafetaTrackingEvent): TrackingEvent {
    // Combine date and time into a single timestamp
    const timestamp = new Date(`${event.fecha}T${event.hora}`);

    return {
        timestamp,
        status: normalizeEstafetaStatus(event.estatus),
        statusCode: event.estatus,
        location: event.ubicacion || [event.ciudad, event.estado].filter(Boolean).join(', '),
        description: event.descripcion,
        metadata: {
            comentarios: event.comentarios,
            ciudad: event.ciudad,
            estado: event.estado,
        },
    };
}

/**
 * Map Estafeta tracking response to our unified format
 */
export function mapEstafetaTrackingToInfo(
    response: EstafetaTrackingResponse,
): TrackingInfo {
    return {
        trackingNumber: response.numeroGuia,
        carrier: 'estafeta',
        status: normalizeEstafetaStatus(response.estatus),
        estimatedDelivery: response.fechaEntregaEstimada
            ? new Date(response.fechaEntregaEstimada)
            : undefined,
        events: response.eventos.map(mapEstafetaTrackingEvent),
        metadata: {
            origen: response.origen,
            destino: response.destino,
            fechaEntregaReal: response.fechaEntregaReal,
        },
    };
}
