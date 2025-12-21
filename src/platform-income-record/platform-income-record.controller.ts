import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PlatformIncomeRecordService } from './platform-income-record.service';
import { CreatePlatformIncomeRecordDto } from './dto/create-platform-income-record.dto';
import { QueryPlatformIncomeRecordDto } from './dto/query-platform-income-record.dto';
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
   * 根据订单ID查询平台收支记录列表
   * @param orderId 订单ID
   * @returns 平台收支记录列表
   */
  @Get('order/:orderId')
  async findByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<PlatformIncomeRecord[]> {
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

  /**
   * 获取平台收支总计（流水队长页面使用）
   * @param queryDto 查询参数（可选，用于筛选）
   * @returns 总计信息
   */
  @Get('summary')
  async getSummary(
    @Query() queryDto?: {
      order_no?: string;
      date_range?: string[];
    },
  ) {
    try {
      return await this.platformIncomeRecordService.getSummary(queryDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取平台收支总计失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 分页查询平台收支记录（流水队长页面使用）
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  @Post('page')
  async getIncomeRecordsByPage(
    @Body(ValidationPipe) queryDto: QueryPlatformIncomeRecordDto,
  ) {
    try {
      return await this.platformIncomeRecordService.getIncomeRecordsByPage(
        queryDto,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '分页查询平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 导出平台收支记录为 Excel
   * @param body 查询参数（可选，不传则导出全部）
   * @param res 响应对象
   */
  @Post('export')
  async exportIncomeRecords(
    @Body(ValidationPipe) body: Partial<QueryPlatformIncomeRecordDto>,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const buffer = await this.platformIncomeRecordService.exportIncomeRecordsToExcel(body);

      // 生成文件名（包含时间戳）
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);
      const filename = `平台收支记录_${timestamp}.xlsx`;

      // 设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      // 使用 RFC 5987 标准格式支持中文文件名
      // filename 用于兼容旧浏览器，filename* 用于支持 UTF-8 编码
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );

      // 发送文件（不返回任何值，避免响应拦截器干扰）
      res.send(Buffer.from(buffer));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '导出平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
