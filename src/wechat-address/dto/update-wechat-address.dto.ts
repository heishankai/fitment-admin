import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';

export class UpdateWechatAddressDto {
  @IsOptional()
  @IsString()
  owner_name?: string;

  @IsOptional()
  @IsString()
  owner_phone?: string;

  @IsOptional()
  @IsString()
  city_name?: string;

  @IsOptional()
  @IsString()
  city_code?: string;

  @IsOptional()
  @IsString()
  detailed_address?: string;

  @IsOptional()
  @IsString()
  community_name?: string;

  @IsOptional()
  @IsString()
  building_number?: string;

  @IsOptional()
  @IsBoolean()
  default?: boolean;
}
