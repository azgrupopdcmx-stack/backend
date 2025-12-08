import {
    IsUUID,
    IsString,
    IsNumber,
    IsOptional,
    ValidateNested,
    Min,
    Max,
    IsIn,
    Length
} from 'class-validator';
import { Type } from 'class-transformer';

export class ToAddressDto {
    @IsString()
    @Length(1, 255)
    street: string;

    @IsString()
    @Length(1, 100)
    city: string;

    @IsString()
    @Length(2, 50)
    state: string;

    @IsString()
    @Length(5, 10)
    postalCode: string;

    @IsString()
    @Length(2, 3)
    country: string;

    @IsOptional()
    @IsString()
    @Length(0, 100)
    company?: string;

    @IsOptional()
    @IsString()
    @Length(0, 20)
    phone?: string;
}

export class DimensionsDto {
    @IsNumber()
    @Min(0.1)
    @Max(500)
    length: number;

    @IsNumber()
    @Min(0.1)
    @Max(500)
    width: number;

    @IsNumber()
    @Min(0.1)
    @Max(500)
    height: number;

    @IsString()
    @IsIn(['cm', 'in'])
    unit: string;
}

export class CreateShipmentDto {
    @IsUUID()
    fromAddressId: string;

    @ValidateNested()
    @Type(() => ToAddressDto)
    toAddress: ToAddressDto;

    @IsNumber()
    @Min(0.01)
    @Max(1000) // Max 1000 kg
    weight: number;

    @ValidateNested()
    @Type(() => DimensionsDto)
    dimensions: DimensionsDto;

    @IsOptional()
    @IsString()
    @IsIn(['estafeta', 'fedex', 'dhl', 'ups', '99minutos', 'paquetexpress'])
    carrierCode?: string;

    @IsOptional()
    @IsString()
    serviceType?: string;
}
