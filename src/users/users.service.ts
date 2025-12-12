import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, AuthProvider } from './entities/user.entity';

export interface CreateOAuthUserDto {
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  authProvider: AuthProvider;
  googleId?: string;
  appleId?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      authProvider: 'local',
    });

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error.code === '23505') { // Postgres unique_violation
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }
  }

  async createOAuthUser(data: CreateOAuthUserDto): Promise<User> {
    const user = this.usersRepository.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      avatar: data.avatar,
      authProvider: data.authProvider,
      googleId: data.googleId,
      appleId: data.appleId,
      // OAuth users don't have passwords - field is nullable in entity
    });

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('User with this email or OAuth ID already exists');
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'avatar', 'authProvider', 'createdAt']
    });
  }

  async findByOAuthId(provider: AuthProvider, providerId: string): Promise<User | null> {
    if (provider === 'google') {
      return this.usersRepository.findOne({ where: { googleId: providerId } });
    } else if (provider === 'apple') {
      return this.usersRepository.findOne({ where: { appleId: providerId } });
    }
    return null;
  }

  async linkOAuthAccount(userId: string, provider: AuthProvider, providerId: string): Promise<void> {
    const updateData: Partial<User> = {};
    if (provider === 'google') {
      updateData.googleId = providerId;
    } else if (provider === 'apple') {
      updateData.appleId = providerId;
    }
    await this.usersRepository.update(userId, updateData);
  }

  findAll() {
    return this.usersRepository.find();
  }

  findOne(id: string) {
    return this.usersRepository.findOneBy({ id });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.usersRepository.update(id, updateUserDto);
  }

  remove(id: string) {
    return this.usersRepository.delete(id);
  }
  async findAllWithFilters(query: { skip?: number; take?: number; search?: string; status?: string; type?: string }) {
    const qb = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.shipments', 'shipment')
      .orderBy('user.createdAt', 'DESC')
      .skip(query.skip || 0)
      .take(query.take || 10);

    if (query.search) {
      qb.andWhere('(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.legalName ILIKE :search)', { search: `%${query.search}%` });
    }

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('user.type = :type', { type: query.type });
    }

    const [users, total] = await qb.getManyAndCount();

    // Calculate basic stats for each user (shipment count, etc.)
    // In a real app, this might be heavy, so we might want to select counts via subquery.
    const usersWithStats = users.map(u => ({
      ...u,
      shipmentsCount: u.shipments.length, // This is efficient only if pagination is small. Valid for <50 items.
      // Remove huge shipment array from response
      shipments: undefined,
      lastActive: u.updatedAt, // Mock last active
    }));

    return {
      data: usersWithStats,
      total,
      page: Math.floor((query.skip || 0) / (query.take || 10)) + 1,
      lastPage: Math.ceil(total / (query.take || 10)),
    };
  }

  async getUserOverviewStats() {
    const total = await this.usersRepository.count();
    const active = await this.usersRepository.count({ where: { status: 'Active' } });
    const pending = await this.usersRepository.count({ where: { status: 'Pending' } });
    const suspended = await this.usersRepository.count({ where: { status: 'Suspended' } });

    // Growth (Mock for now, or compare with last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const newUsers = await this.usersRepository.createQueryBuilder('user')
      .where('user.createdAt >= :lastMonth', { lastMonth })
      .getCount();

    return {
      total,
      active,
      pending,
      suspended,
      newThisMonth: newUsers,
    };
  }
}

