import { IsString, IsNotEmpty, IsIn, IsNumber } from 'class-validator';

export class SendMessageDto {
  @IsNumber({}, { message: '房间ID必须是数字' })
  @IsNotEmpty({ message: '房间ID不能为空' })
  roomId: number;

  @IsString({ message: '消息内容必须是字符串' })
  @IsNotEmpty({ message: '消息内容不能为空' })
  content: string;

  @IsString({ message: '消息类型必须是字符串' })
  @IsIn(['text', 'image'], { message: '消息类型必须是 text 或 image' })
  message_type: string;
}

