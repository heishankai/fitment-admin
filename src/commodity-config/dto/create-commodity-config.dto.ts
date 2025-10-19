import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  Min,
} from 'class-validator';

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

  @IsArray({ message: '商品详情图必须是数组' })
  @ArrayMaxSize(10, { message: '商品详情图最多10张' })
  @IsString({ each: true, message: '商品详情图必须是字符串数组' })
  commodity_detail_images: string[]; // 商品详情图（最多10张 数组类型）
}
