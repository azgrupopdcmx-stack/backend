export class CreateRuleDto {
    name: string;
    isActive?: boolean;
    priority: number;
    conditions?: {
        minWeight?: number;
        maxWeight?: number;
        destination?: {
            states?: string[];
            cities?: string[];
        };
        minCost?: number;
        maxCost?: number;
    };
    preferredCarrier: string;
}
