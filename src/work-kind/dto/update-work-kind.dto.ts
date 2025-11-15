import { IsOptional, IsString } from 'class-validator';

/**
 * 更新工种配置DTO
 */
export class UpdateWorkKindDto {
  /**
   * 工种名称
   */
  @IsOptional()
  @IsString({ message: '工种名称必须是字符串' })
  work_kind_name?: string;
}

