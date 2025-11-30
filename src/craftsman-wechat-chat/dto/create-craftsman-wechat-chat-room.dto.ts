import { IsNumber, IsOptional } from 'class-validator';

export class CreateCraftsmanWechatChatRoomDto {
  // 工匠用户ID：工匠用户创建房间时从token获取，微信用户创建房间时从请求体获取
  @IsNumber({}, { message: '工匠用户ID必须是数字' })
  @IsOptional() // 如果从token获取，则可以为空
  craftsman_user_id?: number;

  // 微信用户ID：微信用户创建房间时从token获取，工匠用户创建房间时从请求体获取
  @IsNumber({}, { message: '微信用户ID必须是数字' })
  @IsOptional() // 如果从token获取，则可以为空
  wechat_user_id?: number;
}

