import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import { SMS_CONFIG } from '../common/constants/app.constants';

@Injectable()
export class SmsService {
  private client: Dysmsapi20170525;

  constructor() {
    // 初始化阿里云短信客户端
    const config = new $OpenApi.Config({
      accessKeyId: SMS_CONFIG.accessKeyId,
      accessKeySecret: SMS_CONFIG.accessKeySecret,
      endpoint: SMS_CONFIG.endpoint,
    });
    this.client = new Dysmsapi20170525(config);
  }

  /**
   * 发送短信验证码
   * @param phoneNumber 手机号码
   * @param code 验证码
   * @returns 发送结果
   */
  async sendVerificationCode(
    phoneNumber: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 验证手机号格式
      if (!this.isValidPhoneNumber(phoneNumber)) {
        throw new HttpException('手机号格式不正确', HttpStatus.BAD_REQUEST);
      }

      // 验证验证码格式（通常是4-6位数字）
      if (!/^\d{4,6}$/.test(code)) {
        throw new HttpException('验证码格式不正确', HttpStatus.BAD_REQUEST);
      }

      // 构建发送短信请求
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phoneNumber,
        signName: SMS_CONFIG.signName,
        templateCode: SMS_CONFIG.templateCode,
        templateParam: JSON.stringify({ code }), // 模板参数，根据实际模板调整
      });

      // 发送短信
      const response = await this.client.sendSms(sendSmsRequest);

      // 检查响应
      if (!response.body) {
        throw new HttpException('发送失败: 响应数据为空', HttpStatus.BAD_REQUEST);
      }

      if (response.body.code === 'OK') {
        return {
          success: true,
          message: '验证码发送成功',
        };
      } else {
        throw new HttpException(
          `发送失败: ${response.body.message || '未知错误'}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      console.error('发送短信验证码失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '验证码发送失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 生成随机验证码
   * @param length 验证码长度，默认6位
   * @returns 验证码字符串
   */
  generateVerificationCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * 验证手机号格式
   * @param phoneNumber 手机号码
   * @returns 是否为有效手机号
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // 中国大陆手机号正则：11位数字，以1开头
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }
}

