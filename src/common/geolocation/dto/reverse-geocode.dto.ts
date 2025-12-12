import { IsNumber, IsNotEmpty, Min, Max, IsOptional, IsIn } from 'class-validator';

/**
 * 逆地理编码DTO
 * 兼容微信小程序：微信小程序返回的经纬度是GCJ02坐标系，默认值已设置为2（GCJ02），可直接使用
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
  @IsIn([1, 2, 5], { message: '坐标类型：1=GPS(WGS84), 2=GCJ02(微信小程序/腾讯地图), 5=百度(BD09)' })
  coordType?: number; // 坐标类型：1=GPS(WGS84), 2=GCJ02(微信小程序标准，默认值), 5=百度(BD09)
}

