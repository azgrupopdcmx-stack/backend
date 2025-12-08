import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Carrier Entity
 * 
 * Stores information about shipping carriers (Estafeta, FedEx, DHL, UPS, 99 Minutos)
 * including their configuration and credentials.
 */
@Entity('carriers')
export class Carrier {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string; // e.g., 'estafeta', 'fedex', 'dhl', 'ups', '99minutos'

    @Column()
    name: string; // e.g., 'Estafeta', 'FedEx', 'DHL'

    @Column({ name: 'logo_url', nullable: true })
    logoUrl: string; // URL to carrier logo image

    @Column({ name: 'is_active', default: true })
    isActive: boolean; // Whether this carrier is enabled

    @Column({ name: 'is_sandbox', default: false })
    isSandbox: boolean; // Whether using sandbox/test environment

    @Column('jsonb', { nullable: true })
    credentials: {
        apiKey?: string;
        apiSecret?: string;
        accountNumber?: string;
        meterNumber?: string;
        [key: string]: any;
    };

    @Column('jsonb', { nullable: true })
    config: {
        baseUrl?: string;
        timeout?: number;
        retryAttempts?: number;
        [key: string]: any;
    };

    @Column('simple-array', { nullable: true })
    supportedServices: string[]; // e.g., ['express', 'ground', 'next_day']

    @Column('simple-array', { nullable: true })
    supportedCountries: string[]; // e.g., ['MX', 'US', 'CA']

    @Column({ type: 'int', default: 0 })
    priority: number; // Display order in UI (lower = higher priority)

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
