import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  ValidationPipe,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { PaymentRecordService } from './payment-record.service';
import { QueryPaymentRecordDto } from './dto/query-payment-record.dto';

@Controller('payment-record')
export class PaymentRecordController {
  constructor(private readonly paymentRecordService: PaymentRecordService) {}

  @Post('page')
  async findAllByPage(
    @Body(new ValidationPipe({ transform: true }))
    body: QueryPaymentRecordDto,
  ): Promise<any> {
    return await this.paymentRecordService.findAllByPage(body);
  }

  @Post('export')
  async exportPaymentRecords(
    @Body(new ValidationPipe({ transform: true }))
    body: QueryPaymentRecordDto,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const buffer = await this.paymentRecordService.exportPaymentRecordsToExcel(
      body,
    );
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);
    const filename = `业主付款明细_${timestamp}.xlsx`;

    res
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );

    res.send(Buffer.from(buffer));
  }

  @Post('export-material-details')
  async exportMaterialPaymentDetails(
    @Body(new ValidationPipe({ transform: true }))
    body: QueryPaymentRecordDto,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const buffer =
      await this.paymentRecordService.exportMaterialPaymentDetailsToExcel(body);
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);
    const filename = `辅材付款明细_${timestamp}.xlsx`;

    res
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );

    res.send(Buffer.from(buffer));
  }

  @Get('my')
  async findMyRecords(
    @Request() request: any,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryPaymentRecordDto,
  ): Promise<any> {
    const userId = request.user?.userid || request.user?.userId;
    if (!userId) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }
    return await this.paymentRecordService.findMyRecords(userId, query);
  }

  @Get('order/:orderId')
  async findByOrderId(
    @Request() request: any,
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<any> {
    const userId = request.user?.userid || request.user?.userId;
    if (!userId) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }
    return await this.paymentRecordService.findByOrderId(orderId, userId);
  }
}
