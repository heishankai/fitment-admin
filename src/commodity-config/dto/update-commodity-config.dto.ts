import { 
  IsOptional, 
  IsString, 
  IsNumber, 
  IsArray, 
  MaxLength, 
  ArrayMaxSize, 
  ArrayMinSize, 
  Min 
} from 'class-validator';

/**
 * 更新商品配置DTO
 */
export class UpdateCommodityConfigDto {
  /**
   * 所属类目ID
   */
  @IsOptional()
  @IsNumber({}, { message: '所属类目ID必须是数字' })
  category_id?: number;

  /**
   * 所属类目名称
   */
  @IsOptional()
  @IsString({ message: '所属类目名称必须是字符串' })
  category_name?: string;

  /**
   * 商品名称
   */
  @IsOptional()
  @IsString({ message: '商品名称必须是字符串' })
  @MaxLength(100, { message: '商品名称最多100字' })
  commodity_name?: string;

  /**
   * 商品价格
   */
  @IsOptional()
  commodity_price?: any;

  /**
   * 商品描述
   */
  @IsOptional()
  @IsString({ message: '商品描述必须是字符串' })
  @MaxLength(200, { message: '商品描述最多200字' })
  commodity_description?: string;

  /**
   * 服务保障
   */
  @IsOptional()
  @IsString({ message: '服务保障必须是字符串' })
  @MaxLength(200, { message: '服务保障最多200字' })
  service_guarantee?: string;

  /**
   * 商品封面
   */
  @IsOptional()
  @IsArray({ message: '商品封面必须是数组' })
  @ArrayMinSize(1, { message: '商品封面至少需要1张' })
  @ArrayMaxSize(1, { message: '商品封面最多1张' })
  @IsString({ each: true, message: '商品封面必须是字符串数组' })
  commodity_cover?: string[];

  /**
   * 商品主图
   */
  @IsOptional()
  @IsArray({ message: '商品主图必须是数组' })
  @ArrayMaxSize(4, { message: '商品主图最多4张' })
  @IsString({ each: true, message: '商品主图必须是字符串数组' })
  commodity_images?: string[];

  /**
   * 商品详情图
   */
  @IsOptional()
  @IsArray({ message: '商品详情图必须是数组' })
  @ArrayMaxSize(10, { message: '商品详情图最多10张' })
  @IsString({ each: true, message: '商品详情图必须是字符串数组' })
  commodity_detail_images?: string[];
}
