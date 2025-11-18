import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import { SMS_CONFIG } from '../common/constants/app.constants';

interface VerificationCodeData {
  code: string;
  expiresAt: number; // 过期时间戳
}

@Injectable()
export class SmsService {
  private client: Dysmsapi20170525;
  // 使用内存存储验证码，key: phone, value: { code, expiresAt }
  private verificationCodes: Map<string, VerificationCodeData> = new Map();
  private readonly CODE_EXPIRY_TIME = 5 * 60 * 1000; // 5分钟 = 300000毫秒 = 300秒

  constructor() {
    // 初始化阿里云短信客户端
    const config = new $OpenApi.Config({
      accessKeyId: SMS_CONFIG.accessKeyId,
      accessKeySecret: SMS_CONFIG.accessKeySecret,
      endpoint: SMS_CONFIG.endpoint,
    });
    this.client = new Dysmsapi20170525(config);

    // 定期清理过期的验证码
    setInterval(() => {
      this.cleanExpiredCodes();
    }, 60 * 1000); // 每分钟清理一次
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
        throw new HttpException(
          '发送失败: 响应数据为空',
          HttpStatus.BAD_REQUEST,
        );
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

  /**
   * 存储验证码
   * @param phoneNumber 手机号码
   * @param code 验证码
   */
  storeVerificationCode(phoneNumber: string, code: string): void {
    const now = Date.now();
    const expiresAt = now + this.CODE_EXPIRY_TIME;
    const expiryMinutes = this.CODE_EXPIRY_TIME / (60 * 1000);
    const expirySeconds = this.CODE_EXPIRY_TIME / 1000;
    console.log(
      `验证码已存储: ${phoneNumber}, 验证码: ${code}, 当前时间: ${new Date(now).toLocaleString()}, 过期时间: ${expiryMinutes}分钟后 (${new Date(expiresAt).toLocaleString()}), 过期时间戳: ${expiresAt}`,
    );
    this.verificationCodes.set(phoneNumber, { code, expiresAt });
    console.log(`当前存储的验证码数量: ${this.verificationCodes.size}`);
  }

  /**
   * 验证验证码
   * @param phoneNumber 手机号码
   * @param code 验证码
   * @returns 是否验证通过
   */
  verifyCode(phoneNumber: string, code: string): boolean {
    const storedData = this.verificationCodes.get(phoneNumber);
    const now = Date.now();

    if (!storedData) {
      console.log(
        `验证码不存在: ${phoneNumber}, 当前时间: ${new Date(now).toLocaleString()}`,
      );
      return false; // 验证码不存在
    }

    const remainingTime = storedData.expiresAt - now;
    const remainingMinutes = Math.floor(remainingTime / (60 * 1000));
    const remainingSeconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

    console.log(
      `验证验证码: ${phoneNumber}, 输入验证码: ${code}, 存储验证码: ${storedData.code}, 当前时间: ${new Date(now).toLocaleString()}, 过期时间: ${new Date(storedData.expiresAt).toLocaleString()}, 剩余时间: ${remainingMinutes}分${remainingSeconds}秒 (${remainingTime}毫秒)`,
    );

    // 检查是否过期
    if (now > storedData.expiresAt) {
      const expiredTime = now - storedData.expiresAt;
      const expiredMinutes = expiredTime / (60 * 1000);
      console.log(
        `验证码已过期: ${phoneNumber}, 过期时间: ${new Date(storedData.expiresAt).toLocaleString()}, 已过期: ${expiredMinutes.toFixed(2)} 分钟`,
      );
      this.verificationCodes.delete(phoneNumber);
      return false; // 验证码已过期
    }

    // 验证码匹配
    if (storedData.code === code) {
      console.log(
        `验证码验证成功: ${phoneNumber}, 剩余时间: ${remainingMinutes}分${remainingSeconds}秒`,
      );
      // 验证成功后删除验证码（防止重复使用）
      // 注意：验证码在5分钟内可以多次使用，但验证成功后会被删除
      this.verificationCodes.delete(phoneNumber);
      return true;
    }

    console.log(
      `验证码不匹配: ${phoneNumber}, 输入: ${code}, 存储: ${storedData.code}, 剩余时间: ${remainingMinutes}分${remainingSeconds}秒`,
    );
    return false; // 验证码不匹配
  }

  /**
   * 清理过期的验证码
   */
  private cleanExpiredCodes(): void {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [phone, data] of this.verificationCodes.entries()) {
      if (now > data.expiresAt) {
        const expiredMinutes = (now - data.expiresAt) / (60 * 1000);
        console.log(
          `清理过期验证码: ${phone}, 已过期 ${expiredMinutes.toFixed(2)} 分钟`,
        );
        this.verificationCodes.delete(phone);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 个过期验证码`);
    }
  }
}
