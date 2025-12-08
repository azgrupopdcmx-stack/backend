export class CreateAddressDto {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    company?: string;
    phone?: string;
    isDefault?: boolean;
}
