import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 创建城市DTO
 */
export class CreateCityDto {
  /**
   * 城市名称
   */
  @IsString({ message: '城市名称必须是字符串' })
  @IsNotEmpty({ message: '城市名称不能为空' })
  city_name: string;

  /**
   * 城市代码
   */
  @IsString({ message: '城市代码必须是字符串' })
  @IsNotEmpty({ message: '城市代码不能为空' })
  city_code: string;
}
