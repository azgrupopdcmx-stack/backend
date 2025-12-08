import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './entities/address.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private addressesRepository: Repository<Address>,
  ) { }

  async create(createAddressDto: CreateAddressDto, userId: string): Promise<Address> {
    const coords = this.mockGeocode(createAddressDto.postalCode);

    const address = this.addressesRepository.create({
      ...createAddressDto,
      latitude: coords.lat,
      longitude: coords.lng,
      user: { id: userId } as any,
    });
    return this.addressesRepository.save(address);
  }

  private mockGeocode(postalCode: string): { lat: number; lng: number } {
    // Mock geocoding based on postal code (simplified)
    // Center of Mexico City
    const baseLat = 19.4326;
    const baseLng = -99.1332;

    // Add slight random variation to simulate different locations
    return {
      lat: baseLat + (Math.random() - 0.5) * 0.1,
      lng: baseLng + (Math.random() - 0.5) * 0.1
    };
  }

  async findAllByUser(userId: string): Promise<Address[]> {
    return this.addressesRepository.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByIds(ids: string[], userId: string): Promise<Address[]> {
    if (ids.length === 0) return [];
    return this.addressesRepository.find({
      where: {
        id: In(ids),
        user: { id: userId }
      }
    });
  }

  async findOne(id: string, userId: string): Promise<Address | null> {
    return this.addressesRepository.findOne({
      where: { id, user: { id: userId } },
    });
  }

  async update(id: string, updateAddressDto: UpdateAddressDto, userId: string) {
    await this.addressesRepository.update(
      { id, user: { id: userId } },
      updateAddressDto,
    );
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    return this.addressesRepository.delete({ id, user: { id: userId } });
  }
}
