import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

/**
 * 更新师傅用户信息DTO
 */
export class UpdateCraftsmanUserDto {
  /**
   * 昵称
   */
  @IsOptional()
  @IsString()
  nickname?: string;

  /**
   * 头像
   */
  @IsOptional()
  @IsString()
  avatar?: string;

  /**
   * 纬度（数字类型，范围：-90 到 90）
   */
  @IsOptional()
  @IsNumber({}, { message: '纬度必须是数字' })
  @Min(-90, { message: '纬度范围：-90 到 90' })
  @Max(90, { message: '纬度范围：-90 到 90' })
  latitude?: number;

  /**
   * 经度（数字类型，范围：-180 到 180）
   */
  @IsOptional()
  @IsNumber({}, { message: '经度必须是数字' })
  @Min(-180, { message: '经度范围：-180 到 180' })
  @Max(180, { message: '经度范围：-180 到 180' })
  longitude?: number;

  /**
   * 省份
   */
  @IsOptional()
  @IsString()
  province?: string;

  /**
   * 城市
   */
  @IsOptional()
  @IsString()
  city?: string;

  /**
   * 区县
   */
  @IsOptional()
  @IsString()
  district?: string;

  /**
   * 积分/评分（数字类型，默认300分）
   */
  @IsOptional()
  @IsNumber({}, { message: '积分必须是数字' })
  @Min(0, { message: '积分不能小于0' })
  score?: number;
}

