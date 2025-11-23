import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCraftsmanWechatChatRoomDto {
  @IsNumber({}, { message: '工匠用户ID必须是数字' })
  @IsNotEmpty({ message: '工匠用户ID不能为空' })
  craftsman_user_id: number;

  @IsNumber({}, { message: '微信用户ID必须是数字' })
  @IsOptional() // 如果从token获取，则可以为空
  wechat_user_id?: number;
}

