import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('automation_rules')
export class AutomationRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    name: string; // e.g., "Lightweight packages to Estafeta"

    @Column({ default: true })
    isActive: boolean;

    @Column()
    priority: number; // Higher priority rules are checked first

    // Conditions
    @Column('jsonb', { nullable: true })
    conditions: {
        minWeight?: number;
        maxWeight?: number;
        destination?: {
            states?: string[];
            cities?: string[];
        };
        minCost?: number;
        maxCost?: number;
    };

    // Action
    @Column()
    preferredCarrier: string; // e.g., "Estafeta", "DHL", "cheapest", "fastest"

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
