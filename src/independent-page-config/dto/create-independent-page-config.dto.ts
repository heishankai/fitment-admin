import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateIndependentPageConfigDto {
  @IsString()
  @MaxLength(10, { message: '标题长度不能超过10个字符' })
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  price?: string;
}
