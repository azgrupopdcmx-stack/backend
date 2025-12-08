import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { AutomationRule } from './entities/rule.entity';

@Injectable()
export class RulesService {
  constructor(
    @InjectRepository(AutomationRule)
    private rulesRepository: Repository<AutomationRule>,
  ) { }

  async create(createRuleDto: CreateRuleDto, userId: string): Promise<AutomationRule> {
    const rule = this.rulesRepository.create({
      ...createRuleDto,
      user: { id: userId } as any,
    });
    return this.rulesRepository.save(rule);
  }

  async findAllByUser(userId: string): Promise<AutomationRule[]> {
    return this.rulesRepository.find({
      where: { user: { id: userId } },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<AutomationRule | null> {
    return this.rulesRepository.findOne({
      where: { id, user: { id: userId } },
    });
  }

  async update(id: string, updateRuleDto: UpdateRuleDto, userId: string) {
    await this.rulesRepository.update(
      { id, user: { id: userId } },
      updateRuleDto,
    );
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    return this.rulesRepository.delete({ id, user: { id: userId } });
  }

  // Apply automation rules to select carrier
  async applyRules(userId: string, shipmentData: { weight: number; toAddress: any }, rates: any[]): Promise<string | null> {
    const rules = await this.rulesRepository.find({
      where: { user: { id: userId }, isActive: true },
      order: { priority: 'DESC' },
    });

    for (const rule of rules) {
      if (this.matchesConditions(rule, shipmentData, rates)) {
        // Handle special carriers
        if (rule.preferredCarrier === 'cheapest') {
          const cheapest = rates.reduce((min, rate) => rate.price < min.price ? rate : min);
          return cheapest.carrier;
        }
        if (rule.preferredCarrier === 'fastest') {
          const fastest = rates.reduce((min, rate) => rate.deliveryDays < min.deliveryDays ? rate : min);
          return fastest.carrier;
        }
        // Return specific carrier
        return rule.preferredCarrier;
      }
    }

    return null; // No matching rule
  }

  private matchesConditions(rule: AutomationRule, shipmentData: any, rates: any[]): boolean {
    const conditions = rule.conditions;
    if (!conditions) return true;

    // Check weight conditions
    if (conditions.minWeight !== undefined && shipmentData.weight < conditions.minWeight) {
      return false;
    }
    if (conditions.maxWeight !== undefined && shipmentData.weight > conditions.maxWeight) {
      return false;
    }

    // Check destination conditions
    if (conditions.destination) {
      if (conditions.destination.states && conditions.destination.states.length > 0) {
        if (!conditions.destination.states.includes(shipmentData.toAddress.state)) {
          return false;
        }
      }
      if (conditions.destination.cities && conditions.destination.cities.length > 0) {
        if (!conditions.destination.cities.includes(shipmentData.toAddress.city)) {
          return false;
        }
      }
    }

    // Check cost conditions (based on available rates)
    if (conditions.minCost !== undefined || conditions.maxCost !== undefined) {
      const avgPrice = rates.reduce((sum, rate) => sum + rate.price, 0) / rates.length;
      if (conditions.minCost !== undefined && avgPrice < conditions.minCost) {
        return false;
      }
      if (conditions.maxCost !== undefined && avgPrice > conditions.maxCost) {
        return false;
      }
    }

    return true;
  }
}
