import { IsNotEmpty, IsNumber } from 'class-validator';

/**
 * 创建工匠聊天房间的 DTO
 */
export class CreateCraftsmanChatRoomDto {
  @IsNotEmpty()
  @IsNumber()
  craftsman_user_id: number;
}

