import { IsNumber, IsNotEmpty, Min, Max, IsOptional, IsIn } from 'class-validator';

/**
 * 逆地理编码DTO
 */
export class ReverseGeocodeDto {
  @IsNumber({}, { message: '经度必须是数字' })
  @IsNotEmpty({ message: '经度不能为空' })
  @Min(-180, { message: '经度范围：-180 到 180' })
  @Max(180, { message: '经度范围：-180 到 180' })
  longitude: number; // 经度

  @IsNumber({}, { message: '纬度必须是数字' })
  @IsNotEmpty({ message: '纬度不能为空' })
  @Min(-90, { message: '纬度范围：-90 到 90' })
  @Max(90, { message: '纬度范围：-90 到 90' })
  latitude: number; // 纬度

  @IsOptional()
  @IsNumber({}, { message: '坐标类型必须是数字' })
  @IsIn([1, 2, 5], { message: '坐标类型：1=GPS(WGS84), 2=腾讯地图(GCJ02), 5=百度(BD09)' })
  coordType?: number; // 坐标类型：1=GPS坐标, 2=腾讯地图坐标(GCJ02), 5=百度坐标(BD09)。默认为2（微信小程序返回的是GCJ02）
}

