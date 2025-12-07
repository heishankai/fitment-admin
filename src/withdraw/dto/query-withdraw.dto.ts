import {
  IsOptional,
  IsNumber,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 查询提现申请DTO
 */
export class QueryWithdrawDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '页码必须大于0' })
  pageIndex?: number = 1; // 页码，默认1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '每页数量必须大于0' })
  pageSize?: number = 10; // 每页数量，默认10

  @IsOptional()
  @IsString()
  craftsman_user_name?: string; // 工匠用户名（可选）

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number; // 状态筛选（可选）
}
