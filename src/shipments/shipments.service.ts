import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Carrier } from '../carriers/entities/carrier.entity';
import { Shipment } from './entities/shipment.entity';
import { AddressesService } from '../addresses/addresses.service';
import { CartaPorteService, CartaPorteData } from '../compliance/carta-porte.service';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private shipmentsRepository: Repository<Shipment>,
    @InjectRepository(Carrier)
    private carrierRepo: Repository<Carrier>,
    private addressesService: AddressesService,
    private cartaPorteService: CartaPorteService,
    private configService: ConfigService,
  ) { }

  async create(createShipmentDto: CreateShipmentDto, userId: string): Promise<Shipment> {
    // Get the from address
    const fromAddress = await this.addressesService.findOne(
      createShipmentDto.fromAddressId,
      userId,
    );

    if (!fromAddress) {
      throw new Error('From address not found');
    }

    // Convert address to JSONB format
    const fromAddressJson = {
      street: fromAddress.street,
      city: fromAddress.city,
      state: fromAddress.state,
      postalCode: fromAddress.postalCode,
      country: fromAddress.country,
      company: fromAddress.company,
      phone: fromAddress.phone,
    };

    // Resolve carrier entity from code (default to 'estafeta')
    const carrierEntity = await this.carrierRepo.findOne({ where: { code: createShipmentDto.carrierCode || 'estafeta' } });
    if (!carrierEntity) {
      throw new Error(`Carrier not found: ${createShipmentDto.carrierCode}`);
    }

    const shipment = this.shipmentsRepository.create({
      user: { id: userId } as any,
      from_address: fromAddressJson,
      to_address: createShipmentDto.toAddress,
      weight: createShipmentDto.weight,
      dimensions: createShipmentDto.dimensions,
      carrier: carrierEntity,
      status: 'pending',
    });

    return this.shipmentsRepository.save(shipment);
  }

  async createBulk(shipments: CreateShipmentDto[], userId: string): Promise<{ created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;

    // Pre-fetch all unique addresses in one query
    const addressIds = [...new Set(shipments.map(s => s.fromAddressId))];
    const addresses = await this.addressesService.findByIds(addressIds, userId);
    const addressMap = new Map(addresses.map(a => [a.id, a]));

    // Pre-fetch default carrier
    const defaultCarrier = await this.carrierRepo.findOne({ where: { code: 'estafeta' } });

    // Prepare entities for batch insert
    const validShipments: Shipment[] = [];

    for (let i = 0; i < shipments.length; i++) {
      const dto = shipments[i];
      const fromAddress = addressMap.get(dto.fromAddressId);

      if (!fromAddress) {
        errors.push(`Row ${i + 1}: From address not found`);
        continue;
      }

      try {
        const carrierEntity = dto.carrierCode
          ? await this.carrierRepo.findOne({ where: { code: dto.carrierCode } })
          : defaultCarrier;

        if (!carrierEntity) {
          errors.push(`Row ${i + 1}: Carrier not found: ${dto.carrierCode}`);
          continue;
        }

        const shipment = this.shipmentsRepository.create({
          user: { id: userId } as any,
          from_address: {
            street: fromAddress.street,
            city: fromAddress.city,
            state: fromAddress.state,
            postalCode: fromAddress.postalCode,
            country: fromAddress.country,
            company: fromAddress.company,
            phone: fromAddress.phone,
          },
          to_address: dto.toAddress,
          weight: dto.weight,
          dimensions: dto.dimensions,
          carrier: carrierEntity,
          status: 'pending',
        });

        validShipments.push(shipment);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Batch insert all valid shipments
    if (validShipments.length > 0) {
      await this.shipmentsRepository.save(validShipments);
      created = validShipments.length;
    }

    return { created, errors };
  }

  async findAllByUser(userId: string): Promise<Shipment[]> {
    return this.shipmentsRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Shipment | null> {
    return this.shipmentsRepository.findOne({
      where: { id, user: { id: userId } },
    });
  }

  async update(id: string, updateShipmentDto: UpdateShipmentDto, userId: string) {
    const updateData: any = { ...updateShipmentDto };

    if (updateShipmentDto.carrierCode) {
      const carrier = await this.carrierRepo.findOne({ where: { code: updateShipmentDto.carrierCode } });
      if (!carrier) throw new Error('Carrier not found');
      updateData.carrier = carrier;
      delete updateData.carrierCode;
    }

    await this.shipmentsRepository.update(
      { id, user: { id: userId } },
      updateData,
    );
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    return this.shipmentsRepository.delete({ id, user: { id: userId } });
  }

  // Mock rate comparison - in production, this would call actual carrier APIs
  async getRates(createShipmentDto: CreateShipmentDto): Promise<any[]> {
    const useMockRates = this.configService.get<string>('USE_MOCK_RATES') === 'true';

    if (useMockRates) {
      return this.getMockRates(createShipmentDto);
    }

    // TODO: Implement real carrier API calls
    // This should aggregate rates from all active carriers
    return this.getRealRates(createShipmentDto);
  }

  private async getRealRates(createShipmentDto: CreateShipmentDto): Promise<any[]> {
    // Aggregate from carrier services
    // For now returning empty until implemented
    return [];
  }

  private async getMockRates(createShipmentDto: CreateShipmentDto) {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock rates from different carriers
    const baseRate = createShipmentDto.weight * 15 + 50;
    const today = new Date();

    const rawRates = [
      {
        carrier: 'Estafeta',
        serviceName: 'Día Siguiente',
        price: baseRate * 1.2,
        currency: 'MXN',
        deliveryDays: 1,
        logoUrl: '/logos/estafeta.png',
      },
      {
        carrier: 'PaquetExpress',
        serviceName: 'Terrestre',
        price: baseRate * 0.8,
        currency: 'MXN',
        deliveryDays: 3,
        logoUrl: '/logos/paquetexpress.png',
      },
      {
        carrier: 'DHL',
        serviceName: 'Express',
        price: baseRate * 1.5,
        currency: 'MXN',
        deliveryDays: 1,
        logoUrl: '/logos/dhl.png',
      },
      {
        carrier: '99Minutos',
        serviceName: 'Same Day',
        price: baseRate * 2,
        currency: 'MXN',
        deliveryDays: 0,
        logoUrl: '/logos/99minutos.png',
      },
      {
        carrier: 'FedEx',
        serviceName: 'Standard',
        price: baseRate * 1.1,
        currency: 'MXN',
        deliveryDays: 2,
        logoUrl: '/logos/fedex.png',
      }
    ];

    // Find min price and min days for flags
    const minPrice = Math.min(...rawRates.map(r => r.price));
    const minDays = Math.min(...rawRates.map(r => r.deliveryDays));

    return rawRates.map(rate => {
      const deliveryDate = new Date(today);
      deliveryDate.setDate(today.getDate() + rate.deliveryDays);

      return {
        ...rate,
        bestValue: rate.price === minPrice,
        fastest: rate.deliveryDays === minDays,
        deliveryDate: deliveryDate.toISOString(),
        recommended: rate.price === minPrice || (rate.deliveryDays === minDays && rate.price < minPrice * 1.5),
      };
    });
  }

  // Generate shipping label
  async generateLabel(id: string, userId: string) {
    const shipment = await this.findOne(id, userId);

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    // In production, this would call the carrier's API to generate a real label
    // For now, we'll generate a mock label URL
    const mockLabelUrl = `https://wupaq-labels.s3.amazonaws.com/label-${id}.pdf`;

    // Update shipment with label URL and change status
    await this.shipmentsRepository.update(
      { id, user: { id: userId } },
      {
        label_url: mockLabelUrl,
        status: 'created',
      },
    );

    return {
      labelUrl: mockLabelUrl,
      trackingNumber: `WPQ${Date.now()}`,
      shipmentId: id,
    };
  }

  // Get tracking info
  async getTracking(id: string, userId: string) {
    const shipment = await this.findOne(id, userId);

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    // Mock tracking events
    const trackingEvents = [
      {
        status: 'Label Created',
        description: 'Shipping label has been created',
        timestamp: new Date(shipment.createdAt).toISOString(),
        location: shipment.from_address.city,
      },
    ];

    if (shipment.status !== 'pending') {
      trackingEvents.push({
        status: 'In Transit',
        description: 'Package is in transit',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        location: 'Distribution Center',
      });
    }

    if (shipment.status === 'delivered') {
      trackingEvents.push({
        status: 'Delivered',
        description: 'Package has been delivered',
        timestamp: new Date().toISOString(),
        location: shipment.to_address.city,
      });
    }

    return {
      trackingNumber: `WPQ${shipment.id.substring(0, 8)}`,
      status: shipment.status,
      carrier: shipment.carrier,
      events: trackingEvents,
      estimatedDelivery: new Date(Date.now() + 172800000).toISOString(),
    };
  }

  async generateCartaPorte(id: string, userId: string, additionalData: any) {
    const shipment = await this.findOne(id, userId);
    if (!shipment) throw new Error('Shipment not found');

    // Map shipment data to Carta Porte structure
    // NOTE: In a real app, we would need rigorous mapping and validation here
    // This is a simplified mapping for the MVP
    const cartaPorteData: CartaPorteData = {
      serie: 'CP',
      folio: shipment.id.substring(0, 8),
      fecha: new Date().toISOString(),
      formaPago: '99',
      subTotal: 0, // Traslado type has 0 subtotal
      moneda: 'XXX',
      total: 0,
      tipoDeComprobante: 'T', // Traslado
      exportacion: '01',
      lugarExpedicion: shipment.from_address.postalCode,
      emisor: {
        rfc: 'EKU9003173C9', // Mock RFC
        nombre: 'ESCUELA KEMPER URGATE',
        regimenFiscal: '601',
      },
      receptor: {
        rfc: 'XAXX010101000',
        nombre: 'PUBLICO EN GENERAL',
        domicilioFiscalReceptor: shipment.to_address.postalCode,
        regimenFiscalReceptor: '616',
        usoCFDI: 'S01',
      },
      conceptos: [{
        claveProdServ: '78101802',
        cantidad: 1,
        claveUnidad: 'E48',
        descripcion: 'TRANSPORTE DE CARGA',
        valorUnitario: 0,
        importe: 0,
        objetoImp: '01',
      }],
      cartaPorte: {
        idCCP: `CCC${uuidv4()}`,
        transporteInternacional: 'No',
        totalDistRec: 100, // Mock distance
        ubicaciones: [
          {
            tipoUbicacion: 'Origen',
            idUbicacion: 'OR000001',
            rfcRemitenteDestinatario: 'EKU9003173C9',
            nombreRemitenteDestinatario: 'SENDER NAME',
            fechaHoraSalidaLlegada: new Date().toISOString(),
            domicilio: {
              calle: shipment.from_address.street,
              estado: shipment.from_address.state,
              pais: shipment.from_address.country,
              codigoPostal: shipment.from_address.postalCode,
              municipio: shipment.from_address.city,
            }
          },
          {
            tipoUbicacion: 'Destino',
            idUbicacion: 'DE000001',
            rfcRemitenteDestinatario: 'XAXX010101000',
            nombreRemitenteDestinatario: 'RECEIVER NAME',
            fechaHoraSalidaLlegada: new Date(Date.now() + 86400000).toISOString(),
            distanciaRecorrida: 100,
            domicilio: {
              calle: shipment.to_address.street,
              estado: shipment.to_address.state,
              pais: shipment.to_address.country,
              codigoPostal: shipment.to_address.postalCode,
              municipio: shipment.to_address.city,
            }
          }
        ],
        mercancias: {
          pesoBrutoTotal: shipment.weight,
          unidadPeso: 'KGM',
          numTotalMercancias: 1,
          mercancias: [{
            bienesTransp: '12345678', // Generic code
            descripcion: 'GENERAL CARGO',
            cantidad: 1,
            claveUnidad: 'H87',
            pesoEnKg: shipment.weight,
          }],
          autotransporte: additionalData.autotransporte || {
            permSCT: 'TPAF01',
            numPermSCT: '000000',
            identificacionVehicular: {
              configVehicular: 'VL',
              placaVM: 'XX0000',
              anioModeloVM: 2020,
            },
            seguros: {
              aseguraRespCivil: 'QUALITAS',
              polizaRespCivil: '00000000',
            }
          }
        },
        figuraTransporte: additionalData.figuraTransporte || [{
          tipoFigura: '01',
          rfcFigura: 'XAXX010101000',
          nombreFigura: 'OPERADOR GENERICO',
          numeroLicencia: '000000',
        }]
      }
    };

    const result = await this.cartaPorteService.generateCartaPorte(cartaPorteData);

    // Update shipment with Carta Porte info
    await this.shipmentsRepository.update(
      { id, user: { id: userId } },
      {
        cartaPorteXml: result.xml,
        cartaPortePdfUrl: result.pdfUrl,
      }
    );

    return result;
  }
}
