import { IsString, IsNumber, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class VehicleIdentificationDto {
    @IsString()
    configVehicular: string;

    @IsString()
    placaVM: string;

    @IsNumber()
    @Min(1990)
    @Max(2030)
    anioModeloVM: number;
}

class InsuranceDto {
    @IsString()
    aseguraRespCivil: string;

    @IsString()
    polizaRespCivil: string;
}

class AutotransporteDto {
    @IsString()
    permSCT: string;

    @IsString()
    numPermSCT: string;

    @ValidateNested()
    @Type(() => VehicleIdentificationDto)
    identificacionVehicular: VehicleIdentificationDto;

    @ValidateNested()
    @Type(() => InsuranceDto)
    seguros: InsuranceDto;
}

class FiguraTransporteDto {
    @IsString()
    tipoFigura: string;

    @IsString()
    rfcFigura: string;

    @IsString()
    nombreFigura: string;

    @IsString()
    numeroLicencia: string;
}

export class CartaPorteAdditionalDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => AutotransporteDto)
    autotransporte?: AutotransporteDto;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => FiguraTransporteDto)
    figuraTransporte?: FiguraTransporteDto[];
}
