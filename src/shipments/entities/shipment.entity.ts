import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Carrier } from '../../carriers/entities/carrier.entity';

@Entity('shipments')
export class Shipment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.shipments)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Carrier, { nullable: true })
    @JoinColumn({ name: 'carrier_id' })
    carrier: Carrier;

    @Column('jsonb')
    from_address: Record<string, any>;

    @Column('jsonb')
    to_address: Record<string, any>;

    @Column('decimal', { precision: 10, scale: 2 })
    weight: number;

    @Column('jsonb')
    dimensions: {
        length: number;
        width: number;
        height: number;
        unit: string;
    };

    @Column('jsonb', { nullable: true })
    rate_selected: Record<string, any>;

    @Column({ name: 'tracking_number', nullable: true })
    trackingNumber: string;

    @Column({ name: 'carta_porte_xml', type: 'text', nullable: true })
    cartaPorteXml: string;

    @Column({ name: 'carta_porte_pdf_url', nullable: true })
    cartaPortePdfUrl: string;

    @Column({ nullable: true })
    label_url: string;

    @Column({ default: 'pending' })
    status: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
