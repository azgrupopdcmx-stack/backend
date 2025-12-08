import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('addresses')
export class Address {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    name: string; // e.g., "Home", "Warehouse", "Office"

    @Column()
    street: string;

    @Column()
    city: string;

    @Column()
    state: string;

    @Column({ name: 'postal_code' })
    postalCode: string;

    @Column()
    country: string;

    @Column({ nullable: true })
    company: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ default: false })
    isDefault: boolean;

    @Column({ type: 'float', nullable: true })
    latitude: number;

    @Column({ type: 'float', nullable: true })
    longitude: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
