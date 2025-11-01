import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

/**
 * 发送消息的 DTO
 */
export class SendMessageDto {
  @IsNotEmpty()
  @IsNumber()
  room_id: number;

  @IsNotEmpty()
  @IsString()
  content: string;
}

