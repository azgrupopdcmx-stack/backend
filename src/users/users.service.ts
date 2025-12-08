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
}

