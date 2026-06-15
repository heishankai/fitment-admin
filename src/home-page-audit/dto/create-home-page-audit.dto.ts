import {
  IsString,
  IsArray,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateHomePageAuditDto {
  // 工地心得（创建时非必填）
  @IsString()
  @IsOptional()
  publish_text?: string;

  // 工地图片（创建时必填）
  @IsArray({ message: '工地图片必须是数组' })
  @ArrayMinSize(1, { message: '工地图片至少需要一张' })
  @IsString({ each: true, message: '每张图片必须是字符串URL' })
  publish_images: string[];

  // 工地视频（创建时非必填，最多一个）
  @IsOptional()
  @IsArray({ message: '工地视频必须是数组' })
  @ArrayMaxSize(1, { message: '工地视频最多上传一个' })
  @IsString({ each: true, message: '每个视频必须是字符串URL' })
  publish_video?: string[];
}
