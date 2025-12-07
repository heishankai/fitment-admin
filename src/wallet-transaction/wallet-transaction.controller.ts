import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpException,
  HttpStatus,
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { WalletTransactionService } from './wallet-transaction.service';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { QueryWalletTransactionDto } from './dto/query-wallet-transaction.dto';

@Controller('wallet-transaction')
export class WalletTransactionController {
  constructor(
    private readonly walletTransactionService: WalletTransactionService,
  ) {}

  /**
   * 创建账户明细
   * @param body 账户明细信息
   * @returns 创建的账户明细
   */
  @Post('create')
  async createTransaction(
    @Body(ValidationPipe) body: CreateWalletTransactionDto,
  ) {
    try {
      return await this.walletTransactionService.create(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建账户明细失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询账户明细列表
   * @param query 查询参数
   * @returns 查询结果
   */
  @Get('query')
  async getTransactions(
    @Query(ValidationPipe) query: QueryWalletTransactionDto,
  ) {
    try {
      return await this.walletTransactionService.getTransactions(query);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询账户明细列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询当前用户的账户明细列表
   * @param request 请求对象（包含从token解析的用户信息）
   * @param query 查询参数
   * @returns 账户明细列表
   */
  @Get('my')
  async getMyTransactions(
    @Request() request: any,
    @Query(ValidationPipe) query: QueryWalletTransactionDto,
  ) {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.walletTransactionService.getMyTransactions(
        userId,
        query,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询账户明细失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
