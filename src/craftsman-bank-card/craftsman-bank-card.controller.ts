import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Request,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { CraftsmanBankCardService } from './craftsman-bank-card.service';
import { CreateCraftsmanBankCardDto } from './dto/create-craftsman-bank-card.dto';
import { UpdateCraftsmanBankCardDto } from './dto/update-craftsman-bank-card.dto';

@Controller('craftsman-bank-card')
export class CraftsmanBankCardController {
  constructor(private readonly bankCardService: CraftsmanBankCardService) {}

  /**
   * 查询当前用户的银行卡信息
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 银行卡信息
   */
  @Get()
  async getBankCard(@Request() request: any) {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      const bankCard = await this.bankCardService.findByCraftsmanUserId(userId);
      return bankCard || null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询银行卡信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建银行卡信息
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 银行卡信息
   * @returns 创建的银行卡信息
   */
  @Post()
  async createBankCard(
    @Request() request: any,
    @Body(ValidationPipe) body: CreateCraftsmanBankCardDto,
  ) {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.bankCardService.create(userId, body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建银行卡信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新银行卡信息
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 更新的银行卡信息
   * @returns 更新后的银行卡信息
   */
  @Put()
  async updateBankCard(
    @Request() request: any,
    @Body(ValidationPipe) body: UpdateCraftsmanBankCardDto,
  ) {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.bankCardService.update(userId, body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '更新银行卡信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
