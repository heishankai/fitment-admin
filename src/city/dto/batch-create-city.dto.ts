import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCityDto } from './create-city.dto';

/**
 * 批量创建城市DTO
 */
export class BatchCreateCityDto {
  /**
   * 城市数据数组
   */
  @IsArray({ message: '城市数据必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => CreateCityDto)
  cities: CreateCityDto[];
}
