import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { PlatformIncomeRecordService } from './platform-income-record.service';
import { CreatePlatformIncomeRecordDto } from './dto/create-platform-income-record.dto';
import { PlatformIncomeRecord } from './platform-income-record.entity';

@Controller('platform-income-record')
export class PlatformIncomeRecordController {
  constructor(
    private readonly platformIncomeRecordService: PlatformIncomeRecordService,
  ) {}

  /**
   * 创建平台收支记录
   * @param body 收支记录信息
   * @returns 创建的收支记录
   */
  @Post()
  async create(
    @Body(ValidationPipe) body: CreatePlatformIncomeRecordDto,
  ): Promise<PlatformIncomeRecord> {
    try {
      return await this.platformIncomeRecordService.create(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据订单ID查询平台收支记录
   * @param orderId 订单ID
   * @returns 平台收支记录
   */
  @Get('order/:orderId')
  async findByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<PlatformIncomeRecord | null> {
    try {
      return await this.platformIncomeRecordService.findByOrderId(orderId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询所有平台收支记录
   * @returns 平台收支记录列表
   */
  @Get()
  async findAll(): Promise<PlatformIncomeRecord[]> {
    try {
      return await this.platformIncomeRecordService.findAll();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
