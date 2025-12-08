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

    @OneToMany(() => Shipment, (shipment) => shipment.user)
    shipments: Shipment[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

