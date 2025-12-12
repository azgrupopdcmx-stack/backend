import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('activity_logs')
export class ActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    action: string; // e.g., 'Shipment Created', 'Login'

    @Column({ nullable: true })
    description: string;

    @Column()
    type: string; // 'shipment', 'payment', 'auth', 'security', 'action'

    @Column({ nullable: true })
    device: string;

    @Column({ nullable: true })
    ip: string;

    @Column({ nullable: true })
    location: string;

    @CreateDateColumn()
    createdAt: Date;
}
