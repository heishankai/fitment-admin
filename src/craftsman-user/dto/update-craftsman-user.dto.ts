import { IsOptional, IsString } from 'class-validator';

/**
 * 更新师傅用户信息DTO
 */
export class UpdateCraftsmanUserDto {
  /**
   * 昵称
   */
  @IsOptional()
  @IsString()
  nickname?: string;

  /**
   * 头像
   */
  @IsOptional()
  @IsString()
  avatar?: string;
}

