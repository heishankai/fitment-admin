import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SmsService } from './sms.service';
import { SendSmsCodeDto } from './dto/send-sms-code.dto';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  /**
   * 发送短信验证码
   * @method POST
   * @param body { phone: string }
   * @returns 发送结果
   */
  @Public()
  @Post('send-code')
  async sendSmsCode(@Body() body: SendSmsCodeDto) {
    try {
      // 生成4位随机验证码
      const code = this.smsService.generateVerificationCode(4);

      // 发送验证码
      const result = await this.smsService.sendVerificationCode(
        body.phone,
        code,
      );

      // 存储验证码，设置5分钟过期时间
      this.smsService.storeVerificationCode(body.phone, code);

      return {
        success: true,
        message: result.message,
        // 开发环境可以返回验证码，生产环境应该移除
        code: code, // 仅用于测试，生产环境请删除此行
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '验证码发送失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
