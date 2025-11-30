import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

/**
 * 创建订单DTO
 */
export class CreateOrderDto {
  @IsOptional()
  @IsString()
  area?: string; // 面积

  @IsOptional()
  @IsString()
  city?: string; // 城市

  @IsOptional()
  @IsString()
  district?: string; // 区县

  @IsOptional()
  @IsString()
  houseType?: string; // 房屋类型：new/old

  @IsOptional()
  @IsString()
  roomType?: string; // 户型：如"2居室"

  @IsOptional()
  @IsString()
  location?: string; // 详细地址

  @IsNotEmpty({ message: '纬度不能为空' })
  @IsNumber({}, { message: '纬度必须是数字' })
  @Min(-90, { message: '纬度范围：-90 到 90' })
  @Max(90, { message: '纬度范围：-90 到 90' })
  latitude: number; // 纬度

  @IsNotEmpty({ message: '经度不能为空' })
  @IsNumber({}, { message: '经度必须是数字' })
  @Min(-180, { message: '经度范围：-180 到 180' })
  @Max(180, { message: '经度范围：-180 到 180' })
  longitude: number; // 经度

  @IsOptional()
  @IsString()
  province?: string; // 省份

  @IsNotEmpty({ message: '工种名称不能为空' })
  @IsString()
  work_kind_name: string; // 工种名称

  @IsOptional()
  @IsString()
  work_kind_id?: string; // 工种ID
}

