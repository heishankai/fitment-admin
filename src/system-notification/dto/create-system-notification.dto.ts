import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateSystemNotificationDto {
  @IsNumber()
  @IsNotEmpty({ message: '用户ID不能为空' })
  userId: number;

  @IsString()
  @IsNotEmpty({ message: '通知类型不能为空' })
  @IsIn(['is-verified', 'is-skill-verified', 'home-page-audit'], {
    message: '通知类型必须是 is-verified、is-skill-verified 或 home-page-audit',
  })
  notification_type: string;

  @IsString()
  @IsNotEmpty({ message: '通知标题不能为空' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '通知内容不能为空' })
  content: string;

  @IsOptional()
  @IsBoolean()
  is_read?: boolean;
}

