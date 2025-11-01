import { IsNotEmpty, IsNumber } from 'class-validator';

/**
 * 创建聊天房间的 DTO
 */
export class CreateChatRoomDto {
  @IsNotEmpty()
  @IsNumber()
  wechat_user_id: number;
}

