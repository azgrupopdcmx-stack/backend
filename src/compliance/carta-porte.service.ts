import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { PacService } from './pac.service';

/**
 * Carta Porte data structure (SAT 3.1 compliant - simplified)
 */
export interface CartaPorteData {
    // CFDI 4.0 Header Data
    serie: string;
    folio: string;
    fecha: string; // ISO date
    formaPago: string; // e.g., '99'
    subTotal: number;
    moneda: string; // 'MXN'
    total: number;
    tipoDeComprobante: 'I' | 'T'; // Ingreso or Traslado
    exportacion: '01'; // No aplica
    lugarExpedicion: string; // Postal code

    emisor: {
        rfc: string;
        nombre: string;
        regimenFiscal: string;
    };
    receptor: {
        rfc: string;
        nombre: string;
        domicilioFiscalReceptor: string; // Postal code
        regimenFiscalReceptor: string;
        usoCFDI: string;
    };
    conceptos: Array<{
        claveProdServ: string;
        cantidad: number;
        claveUnidad: string;
        descripcion: string;
        valorUnitario: number;
        importe: number;
        objetoImp: '01' | '02';
    }>;

    // Carta Porte 3.1 Complement
    cartaPorte: {
        idCCP: string; // UUID (generated if not provided)
        transporteInternacional: 'No' | 'Sí';
        totalDistRec: number;
        ubicaciones: Array<{
            tipoUbicacion: 'Origen' | 'Destino';
            idUbicacion: string; // OR000001, DE000001
            rfcRemitenteDestinatario: string;
            nombreRemitenteDestinatario: string;
            fechaHoraSalidaLlegada: string; // ISO
            distanciaRecorrida?: number; // Only for destination
            domicilio: {
                calle: string;
                numeroExterior?: string;
                colonia?: string;
                localidad?: string;
                municipio?: string;
                estado: string;
                pais: string;
                codigoPostal: string;
            };
        }>;
        mercancias: {
            pesoBrutoTotal: number;
            unidadPeso: string; // KGM
            pesoNetoTotal?: number;
            numTotalMercancias: number;
            mercancias: Array<{
                bienesTransp: string; // SAT code
                descripcion: string;
                cantidad: number;
                claveUnidad: string;
                unidad?: string;
                pesoEnKg: number;
                valorMercancia?: number;
                moneda?: string;
            }>;
            autotransporte: {
                permSCT: string;
                numPermSCT: string;
                identificacionVehicular: {
                    configVehicular: string;
                    placaVM: string;
                    anioModeloVM: number;
                };
                seguros: {
                    aseguraRespCivil: string;
                    polizaRespCivil: string;
                };
            };
        };
        figuraTransporte: Array<{
            tipoFigura: '01'; // Operador
            rfcFigura: string;
            nombreFigura: string;
            numeroLicencia: string;
        }>;
    };
}

export interface CartaPorteResult {
    xml: string;
    uuid?: string;
    pdfUrl?: string; // In a real app, this would be an S3 URL
    pdfBuffer?: Buffer; // For immediate download
}

@Injectable()
export class CartaPorteService {
    private readonly logger = new Logger(CartaPorteService.name);

    constructor(private readonly pacService: PacService) { }

    /**
     * Generate Carta Porte XML and PDF
     */
    async generateCartaPorte(data: CartaPorteData): Promise<CartaPorteResult> {
        this.logger.log('Generating Carta Porte 3.1 XML...');

        // 1. Generate unsigned XML
        const unsignedXml = this.buildXml(data);

        // 2. Send to PAC for timbrado (digital stamping)
        const pacResult = await this.pacService.timbrar({ xml: unsignedXml });

        if (!pacResult.success) {
            this.logger.error('PAC timbrado failed:', pacResult.error);
            throw new Error(`PAC Error: ${pacResult.error?.message || 'Unknown error'}`);
        }

        // 3. Generate PDF (using stamped XML)
        const pdfBuffer = await this.generatePDF(data);

        // 4. Return result with SAT UUID
        return {
            xml: pacResult.stampedXml || unsignedXml,
            uuid: pacResult.uuid,
            pdfBuffer,
            pdfUrl: `https://wupaq-compliance.s3.amazonaws.com/${pacResult.uuid}.pdf`,
        };
    }

    private buildXml(data: CartaPorteData): string {
        const doc = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('cfdi:Comprobante', {
                'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
                'xmlns:cartaporte31': 'http://www.sat.gob.mx/CartaPorte31',
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                'xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/CartaPorte31 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd',
                Version: '4.0',
                Serie: data.serie,
                Folio: data.folio,
                Fecha: data.fecha,
                Sello: 'MOCK_SELLO_DIGITAL_SAT...', // Would be generated by RSA SHA256 of chain
                FormaPago: data.formaPago,
                NoCertificado: '00001000000500000000', // Mock certificate number
                Certificado: 'MOCK_BASE64_CERTIFICATE...',
                SubTotal: data.subTotal.toFixed(2),
                Moneda: data.moneda,
                Total: data.total.toFixed(2),
                TipoDeComprobante: data.tipoDeComprobante,
                Exportacion: data.exportacion,
                LugarExpedicion: data.lugarExpedicion,
            });

        // Emisor
        doc.ele('cfdi:Emisor', {
            Rfc: data.emisor.rfc,
            Nombre: data.emisor.nombre,
            RegimenFiscal: data.emisor.regimenFiscal,
        });

        // Receptor
        doc.ele('cfdi:Receptor', {
            Rfc: data.receptor.rfc,
            Nombre: data.receptor.nombre,
            DomicilioFiscalReceptor: data.receptor.domicilioFiscalReceptor,
            RegimenFiscalReceptor: data.receptor.regimenFiscalReceptor,
            UsoCFDI: data.receptor.usoCFDI,
        });

        // Conceptos
        const conceptos = doc.ele('cfdi:Conceptos');
        for (const c of data.conceptos) {
            conceptos.ele('cfdi:Concepto', {
                ClaveProdServ: c.claveProdServ,
                Cantidad: c.cantidad,
                ClaveUnidad: c.claveUnidad,
                Descripcion: c.descripcion,
                ValorUnitario: c.valorUnitario.toFixed(2),
                Importe: c.importe.toFixed(2),
                ObjetoImp: c.objetoImp,
            });
        }

        // Complemento Carta Porte 3.1
        const complemento = doc.ele('cfdi:Complemento');
        const cp = complemento.ele('cartaporte31:CartaPorte', {
            Version: '3.1',
            IdCCP: data.cartaPorte.idCCP || `CCC${uuidv4()}`,
            TransporteInternacional: data.cartaPorte.transporteInternacional,
            TotalDistRec: data.cartaPorte.totalDistRec,
        });

        // Ubicaciones
        const ubicaciones = cp.ele('cartaporte31:Ubicaciones');
        for (const u of data.cartaPorte.ubicaciones) {
            const node = ubicaciones.ele('cartaporte31:Ubicacion', {
                TipoUbicacion: u.tipoUbicacion,
                IDUbicacion: u.idUbicacion,
                RFCRemitenteDestinatario: u.rfcRemitenteDestinatario,
                NombreRemitenteDestinatario: u.nombreRemitenteDestinatario,
                FechaHoraSalidaLlegada: u.fechaHoraSalidaLlegada,
            });
            if (u.distanciaRecorrida) {
                node.att('DistanciaRecorrida', u.distanciaRecorrida.toString());
            }
            node.ele('cartaporte31:Domicilio', {
                Calle: u.domicilio.calle,
                NumeroExterior: u.domicilio.numeroExterior,
                Colonia: u.domicilio.colonia,
                Localidad: u.domicilio.localidad,
                Municipio: u.domicilio.municipio,
                Estado: u.domicilio.estado,
                Pais: u.domicilio.pais,
                CodigoPostal: u.domicilio.codigoPostal,
            });
        }

        // Mercancias
        const mercancias = cp.ele('cartaporte31:Mercancias', {
            PesoBrutoTotal: data.cartaPorte.mercancias.pesoBrutoTotal,
            UnidadPeso: data.cartaPorte.mercancias.unidadPeso,
            NumTotalMercancias: data.cartaPorte.mercancias.numTotalMercancias,
        });

        for (const m of data.cartaPorte.mercancias.mercancias) {
            mercancias.ele('cartaporte31:Mercancia', {
                BienesTransp: m.bienesTransp,
                Descripcion: m.descripcion,
                Cantidad: m.cantidad,
                ClaveUnidad: m.claveUnidad,
                PesoEnKg: m.pesoEnKg,
            });
        }

        // Autotransporte
        const auto = mercancias.ele('cartaporte31:Autotransporte', {
            PermSCT: data.cartaPorte.mercancias.autotransporte.permSCT,
            NumPermSCT: data.cartaPorte.mercancias.autotransporte.numPermSCT,
        });
        auto.ele('cartaporte31:IdentificacionVehicular', {
            ConfigVehicular: data.cartaPorte.mercancias.autotransporte.identificacionVehicular.configVehicular,
            PlacaVM: data.cartaPorte.mercancias.autotransporte.identificacionVehicular.placaVM,
            AnioModeloVM: data.cartaPorte.mercancias.autotransporte.identificacionVehicular.anioModeloVM,
        });
        auto.ele('cartaporte31:Seguros', {
            AseguraRespCivil: data.cartaPorte.mercancias.autotransporte.seguros.aseguraRespCivil,
            PolizaRespCivil: data.cartaPorte.mercancias.autotransporte.seguros.polizaRespCivil,
        });

        // Figura Transporte
        const figuras = cp.ele('cartaporte31:FiguraTransporte');
        for (const f of data.cartaPorte.figuraTransporte) {
            figuras.ele('cartaporte31:TiposFigura', {
                TipoFigura: f.tipoFigura,
                RFCFigura: f.rfcFigura,
                NombreFigura: f.nombreFigura,
                NumeroLicencia: f.numeroLicencia,
            });
        }

        return doc.end({ prettyPrint: true });
    }

    async generatePDF(data: CartaPorteData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const buffers: Buffer[] = [];

            doc.on('data', (buffer) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Header
            doc.fontSize(18).text('Carta Porte (CFDI 4.0 + CP 3.1)', { align: 'center' });
            doc.moveDown();

            // Info
            doc.fontSize(12).text(`Serie/Folio: ${data.serie}-${data.folio}`);
            doc.text(`Fecha: ${data.fecha}`);
            doc.text(`IdCCP: ${data.cartaPorte.idCCP || 'PENDING'}`);
            doc.moveDown();

            // Emisor/Receptor
            doc.text(`Emisor: ${data.emisor.nombre} (${data.emisor.rfc})`);
            doc.text(`Receptor: ${data.receptor.nombre} (${data.receptor.rfc})`);
            doc.moveDown();

            // Ubicaciones
            doc.text('Ubicaciones:', { underline: true });
            data.cartaPorte.ubicaciones.forEach((u) => {
                doc.text(`- ${u.tipoUbicacion}: ${u.domicilio.calle}, ${u.domicilio.codigoPostal}`);
            });
            doc.moveDown();

            // Mercancias
            doc.text('Mercancías:', { underline: true });
            data.cartaPorte.mercancias.mercancias.forEach((m) => {
                doc.text(`- ${m.descripcion} (${m.cantidad} ${m.claveUnidad}) - ${m.pesoEnKg}kg`);
            });

            doc.end();
        });
    }
}
