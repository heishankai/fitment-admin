import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  ValidationPipe,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { WithdrawService } from './withdraw.service';
import { QueryWithdrawDto } from './dto/query-withdraw.dto';
import { AuditWithdrawDto } from './dto/audit-withdraw.dto';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';

@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  /**
   * 申请提现
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 申请提现信息
   * @returns 创建的提现申请
   */
  @Post('create')
  async createWithdraw(
    @Request() request: any,
    @Body(ValidationPipe) body: CreateWithdrawDto,
  ) {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.withdrawService.createWithdraw(userId, body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('申请提现失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 分页查询提现申请列表
   * @param body 查询参数
   * @returns 分页结果
   */
  @Post('query')
  async getWithdrawsByPage(@Body(ValidationPipe) body: QueryWithdrawDto) {
    try {
      return await this.withdrawService.getWithdrawsByPage(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询提现申请列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 审核提现申请
   * @param body 审核信息
   * @returns 更新后的提现申请
   */
  @Post('audit')
  async auditWithdraw(@Body(ValidationPipe) body: AuditWithdrawDto) {
    try {
      return await this.withdrawService.auditWithdraw(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '审核提现申请失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询当前用户的提现申请列表
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 提现申请列表
   */
  @Get('my')
  async getMyWithdraws(@Request() request: any) {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.withdrawService.getMyWithdraws(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询提现申请失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 导出提现申请列表为 Excel
   * @param body 查询参数（可选，不传则导出全部）
   * @param res 响应对象
   */
  @Post('export')
  async exportWithdraws(
    @Body(ValidationPipe) body: Partial<QueryWithdrawDto>,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const buffer = await this.withdrawService.exportWithdrawsToExcel(body);

      // 生成文件名（包含时间戳）
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);
      const filename = `提现申请列表_${timestamp}.xlsx`;

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
        '导出提现申请列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
