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
import { MaterialsPaymentWxpayService } from './materials-payment-wxpay.service';
import { CreateMaterialsPaymentWxpayDto } from './dto/create-materials-payment-wxpay.dto';
import { UpdateMaterialsPaymentWxpayDto } from './dto/update-materials-payment-wxpay.dto';
import { WxPayService } from 'src/common/wx-pay/wx-pay.service';
import { InjectRepository } from '@nestjs/typeorm';
import { WechatUser } from 'src/wechat-user/wechat-user.entity';
import { Repository } from 'typeorm';
import { CreateMaterialsPaymentSingleDto } from './dto/create-materials-payment-single.dto';
import { Public } from 'src/auth/public.decorator';
import { CreateMaterialsPaymentBatchDto } from './dto/create-materials-payment-batch.dto';

@Controller('materials-payment-wxpay')
export class MaterialsPaymentWxpayController {
  constructor(
    private readonly materialsPaymentWxpayService: MaterialsPaymentWxpayService,
    private readonly wxPayService: WxPayService,
    @InjectRepository(WechatUser)
    private readonly wechatUserRepository: Repository<WechatUser>,
  ) {}

  /**
   * 创建单笔材料支付
   * @param request 请求对象
   * @param createMaterialsPaymentSingleDto 创建材料支付单笔DTO
   * @returns 支付结果
   */
  @Post('create-payment-single')
  async createPayment(
    @Request() request: any,
    @Body() createMaterialsPaymentSingleDto: CreateMaterialsPaymentSingleDto,
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
    return this.materialsPaymentWxpayService.createMaterialsPaymentSingle(
      user,
      createMaterialsPaymentSingleDto,
    );
  }

  /**
   * 创建批量材料支付
   * @param request 请求对象
   * @param createMaterialsPaymentBatchDto 创建材料支付批量DTO
   * @returns 支付结果
   */
  @Post('create-payment-batch')
  async createPaymentBatch(
    @Request() request: any,
    @Body() createMaterialsPaymentBatchDto: CreateMaterialsPaymentBatchDto,
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
    return this.materialsPaymentWxpayService.createMaterialsPaymentBatch(
      user,
      createMaterialsPaymentBatchDto,
    );
  }

  /**
   * 订单支付回调
   * @param request 请求对象
   * @returns 处理结果
   */
  @Public()
  @Post('callback-single')
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

        await this.materialsPaymentWxpayService.handlePaymentSingleCallback(
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

  /**
   * 订单支付回调（整合订单）
   * @param request 请求对象
   * @returns 处理结果
   */
  @Public()
  @Post('callback-batch')
  @HttpCode(200)
  async callbackBatch(@Request() request) {
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

        await this.materialsPaymentWxpayService.handlePaymentBatchCallback(
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
