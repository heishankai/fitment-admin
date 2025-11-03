import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CommodityDetailDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  desc?: string;

  @IsArray({ message: '图片必须是数组' })
  @IsNotEmpty({ message: '图片不能为空' })
  @ArrayMinSize(1, { message: '图片至少需要1张' })
  @IsString({ each: true, message: '图片必须是字符串数组' })
  image: string[];
}

export class CreateCommodityConfigDto {
  @IsNumber({}, { message: '所属类目ID必须是数字' })
  @IsNotEmpty({ message: '所属类目ID不能为空' })
  category_id: number; // 所属类目ID（数字类型）

  @IsString()
  @IsNotEmpty({ message: '所属类目名称不能为空' })
  category_name: string; // 所属类目名称

  @IsString()
  @IsNotEmpty({ message: '商品名称不能为空' })
  @MaxLength(100, { message: '商品名称最多100字' })
  commodity_name: string; // 商品名称（最多100字）

  @IsNotEmpty({ message: '商品价格不能为空' })
  commodity_price: any; // 商品价格（支持数字和字符串类型）

  @IsString()
  @IsNotEmpty({ message: '商品描述不能为空' })
  @MaxLength(200, { message: '商品描述最多200字' })
  commodity_description: string; // 商品描述（最多200字）

  @IsString()
  @IsNotEmpty({ message: '服务保障不能为空' })
  @MaxLength(200, { message: '服务保障最多200字' })
  service_guarantee: string; // 服务保障（最多200字）

  @IsArray({ message: '商品封面必须是数组' })
  @ArrayMinSize(1, { message: '商品封面至少需要1张' })
  @ArrayMaxSize(1, { message: '商品封面最多1张' })
  @IsString({ each: true, message: '商品封面必须是字符串数组' })
  commodity_cover: string[]; // 商品封面（1张 数组类型）

  @IsArray({ message: '商品主图必须是数组' })
  @ArrayMaxSize(4, { message: '商品主图最多4张' })
  @IsString({ each: true, message: '商品主图必须是字符串数组' })
  commodity_images: string[]; // 商品主图（最多4张 数组类型）

  @IsArray({ message: '商品详情必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => CommodityDetailDto)
  commodity_details: CommodityDetailDto[]; // 商品详情
}
