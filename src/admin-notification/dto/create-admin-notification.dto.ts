import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsIn,
  IsDateString,
} from 'class-validator';

export class CreateAdminNotificationDto {
  @IsString()
  @IsNotEmpty({ message: '通知标题不能为空' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '通知内容不能为空' })
  content: string;

  @IsString()
  @IsNotEmpty({ message: '通知类型不能为空' })
  @IsIn(['get-price', 'chat-message', 'other'], {
    message: '通知类型必须是 get-price、chat-message 或 other',
  })
  notification_type: string;

  @IsDateString()
  @IsOptional()
  notification_time?: string;

  @IsOptional()
  @IsBoolean()
  is_read?: boolean;

  @IsOptional()
  extra_data?: any;
}

