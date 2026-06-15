import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询工匠用户DTO
 */
export class QueryCraftsmanUserDto {
  /**
   * 页码，从1开始
   */
  @IsNumber({}, { message: '页码必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '页码不能小于1' })
  pageIndex: number;

  /**
   * 每页大小
   */
  @IsNumber({}, { message: '每页大小必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '每页大小不能小于1' })
  @Max(100, { message: '每页大小不能超过100' })
  pageSize: number;

  /**
   * 用户昵称（模糊匹配）
   */
  @IsOptional()
  @IsString({ message: '用户昵称必须是字符串' })
  nickname?: string;

  /**
   * 手机号（精准匹配）
   */
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  phone?: string;

  /**
   * 工种编码（精准匹配：`is_skill_verified.work_kind_code` 与入参全等 `=`，非模糊查询）；
   * 须为 `work_kind` 表中已配置的编码，可参考 `CraftsmanUserPageWorkKindCode` 枚举）
   */
  @IsOptional()
  @IsString({ message: '工种编码必须是字符串' })
  work_kind_code?: string;
}
