import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Shipment } from '../../shipments/entities/shipment.entity';

export type AuthProvider = 'local' | 'google' | 'apple';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false, nullable: true }) // Nullable for OAuth users
    password: string;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ type: 'varchar', default: 'local' })
    authProvider: AuthProvider;

    @Column({ nullable: true, unique: true })
    googleId: string;

    @Column({ nullable: true, unique: true })
    appleId: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    type: string; // Enterprise, SME, etc.

    @Column({ default: 'Active' })
    status: string; // Active, Suspended, Pending

    @Column({ default: false })
    verified: boolean;

    @Column({ nullable: true })
    rfc: string;

    @Column({ nullable: true })
    legalName: string;

    @Column('jsonb', { nullable: true })
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };

    @Column({ nullable: true })
    industry: string;

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({ type: 'int', default: 100 })
    riskScore: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    walletBalance: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    creditLine: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    creditUsed: number;

    @OneToMany(() => Shipment, (shipment) => shipment.user)
    shipments: Shipment[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

