import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  ValidationPipe,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WxPayService } from './wx-pay.service';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { OrderWxPayDto } from './dto/order';
import { WxPayMaterialsDto } from './dto/wx-pay-materials.dto';
import { WxPayWorkPriceItemsDto } from './dto/wx-pay-work-price-items.dto';
import { WxPayOrderFeesDto } from './dto/wx-pay-order-fees.dto';

@Controller('wx-pay')
export class WxPayController {
  constructor(private readonly wxPayService: WxPayService) {}

  /**
   * 订单微信支付下单（需登录，openid 从当前用户自动获取）
   */
  @Post('order')
  @UseGuards(AuthGuard)
  async orderWxPay(
    @Body(ValidationPipe) orderWxPayDto: OrderWxPayDto,
    @Req() req: Request,
  ): Promise<any> {
    const openid = (req as any).user?.openid;
    if (!openid) {
      throw new HttpException(
        '仅支持微信用户支付，请使用微信登录',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.wxPayService.orderWxPay(orderWxPayDto, openid);
  }

  /**
   * 辅材微信支付下单（单个或批量，需登录，openid 从当前用户自动获取）
   */
  @Post('materials')
  @UseGuards(AuthGuard)
  async materialsPrepay(
    @Body(ValidationPipe) body: WxPayMaterialsDto,
    @Req() req: Request,
  ): Promise<any> {
    const openid = (req as any).user?.openid;
    if (!openid) {
      throw new HttpException(
        '仅支持微信用户支付，请使用微信登录',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.wxPayService.materialsPrepay(body, openid);
  }

  /**
   * 工价项微信支付：pay_type = work_price_single | work_price_batch（工价款 is_paid）
   * 或 work_price_sub_service_fee_batch（子工价 total_service_fee / total_service_fee_is_paid）
   */
  @Post('work-price-items')
  @UseGuards(AuthGuard)
  async workPriceItemsPrepay(
    @Body(ValidationPipe) body: WxPayWorkPriceItemsDto,
    @Req() req: Request,
  ): Promise<any> {
    const openid = (req as any).user?.openid;
    if (!openid) {
      throw new HttpException(
        '仅支持微信用户支付，请使用微信登录',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.wxPayService.workPriceItemsPrepay(body, openid);
  }

  /**
   * 订单费用：平台服务费 或 工长费（body.pay_type 区分，需登录）
   */
  @Post('order-fees')
  @UseGuards(AuthGuard)
  async orderFeesPrepay(
    @Body(ValidationPipe) body: WxPayOrderFeesDto,
    @Req() req: Request,
  ): Promise<any> {
    const openid = (req as any).user?.openid;
    if (!openid) {
      throw new HttpException(
        '仅支持微信用户支付，请使用微信登录',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.wxPayService.orderFeesPrepay(body, openid);
  }

  /**
   * 微信支付回调：支付成功后微信会回调该接口
   * 必须直接返回 { code: 'SUCCESS', message: '成功' }，不能经过 ResponseInterceptor 包装
   */
  @Post('wx-pay-callback')
  @Public()
  async wxPayCallback(@Body() body: any, @Res() res: Response): Promise<void> {
    const result = await this.wxPayService.wxPayCallback(body);
    res.status(200).json(result);
  }
}

