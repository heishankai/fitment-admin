import {
  Controller,
  Get,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * 获取当前用户的钱包信息
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 钱包信息
   */
  @Get()
  async getWallet(@Request() request: any) {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.walletService.getWallet(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取钱包信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
