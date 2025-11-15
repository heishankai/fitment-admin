import { IsOptional, IsString } from 'class-validator';

/**
 * 更新人工成本配置DTO
 */
export class UpdateLabourCostDto {
  /**
   * 人工成本名称
   */
  @IsOptional()
  @IsString({ message: '人工成本名称必须是字符串' })
  labour_cost_name?: string;
}

