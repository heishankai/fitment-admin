import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { OrderPaymentWxpayService } from './order-payment-wxpay.service';
import { CreatePaymentDto } from './dto/create-pyment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { Repository } from 'typeorm';
import { Public } from '../auth/public.decorator';
import { WxPayService } from '../common/wx-pay/wx-pay.service';

@Controller('order-payment-wxpay')
export class OrderPaymentWxpayController {
  constructor(
    private readonly orderPaymentWxpayService: OrderPaymentWxpayService,
    private readonly wxPayService: WxPayService,
    @InjectRepository(WechatUser)
    private readonly wechatUserRepository: Repository<WechatUser>,
  ) {}

  @Post('create-payment')
  async createPayment(
    @Request() request: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    // 从token中获取userId（微信用户）
    const userId: number = request.user?.userid || request.user?.userId;
    if (!userId) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }
    // 根据用户id获取openid
    const user = await this.wechatUserRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }
    return this.orderPaymentWxpayService.createPayment(user, createPaymentDto);
  }

  /**
   * 订单支付回调
   * @param request 请求对象
   * @returns 处理结果
   */
  @Public()
  @Post('callback')
  @HttpCode(200)
  async callback(@Request() request) {
    console.log('微信支付回调请求到达');

    console.log('微信支付回调请求头', request.headers);

    console.log('微信支付回调请求体', request.body);

    if (this.wxPayService.verifySign(request)) {
      // 解密微信支付回调请求体
      try {
        const res = this.wxPayService.decryptToString_v3(request.body.resource);
        console.log('解密成功', res);
        const payResult = JSON.parse(res);
        // 开始处理支付结果

        await this.orderPaymentWxpayService.handlePaymentCallback(
          payResult.out_trade_no,
        );

        return null;
      } catch (error) {
        console.log(error);
        throw new HttpException('解密失败', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
    throw new HttpException('验证签名失败', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
