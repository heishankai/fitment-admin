import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  HttpException,
  HttpStatus,
  Body,
  HttpCode,
} from '@nestjs/common';
import { OrderAccessFeeService } from './order-access-fee.service';
import { WxPayService } from '../common/wx-pay/wx-pay.service';
import { IndependentPageConfigService } from '../independent-page-config/independent-page-config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { Repository } from 'typeorm';
import { CreateWxPayDto } from '../common/wx-pay/dto/create-wx-pay.dto';
import {
  NOTIFY_URL,
  WX_PAY_CONFIG,
} from '../common/wx-pay/config/wxpay.config';
import { CreateOrderAccessFeeDto } from './dto/create-order-access-fee.dto';
import { Public } from '../auth/public.decorator';
import { JWT_CONFIG } from 'src/common/constants/app.constants';
import { JwtService } from '@nestjs/jwt';

@Controller('order-access-fee')
export class OrderAccessFeeController {
  constructor(
    private readonly orderAccessFeeService: OrderAccessFeeService,
    private readonly wxPayService: WxPayService,
    private readonly independentPageConfigService: IndependentPageConfigService,
    @InjectRepository(WechatUser)
    private readonly wechatUserRepository: Repository<WechatUser>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 创建支付订单或获取已支付的订单
   * @param request 请求对象(获取用户id)
   * @returns 小程序发起支付需要的paySign
   */
  @Post('/createPayOrder')
  async create(@Request() request: any) {
    console.log('开始');
    try {
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

      // 获取price和titile
      const config = await this.independentPageConfigService.findLastOne();

      // 微信支付下单(获得prepay_id)
      const createWxPayDto = new CreateWxPayDto();
      createWxPayDto.openid = user.openid;
      createWxPayDto.amount = Math.floor(Number(config.price) * 100); // 转换为分
      createWxPayDto.description = `${config.title}`; // 使用title作为商品描述
      createWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
      createWxPayDto.notify_url = NOTIFY_URL.order_access_notify_url;

      // 检查order-access-fee订单是否存在,时间是否超过6天
      const order =
        await this.orderAccessFeeService.findByUserIdNotPayNotExpired(userId);
      if (order) {
        // 检查时间是否超过5天
        const now = new Date();
        const orderTime = new Date(order.createdAt);
        const diff = now.getTime() - orderTime.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days > 6) {
          // 订单设置过期
          await this.orderAccessFeeService.setExpired(order.id);
        } else {
          // 直接获取paySign
          createWxPayDto.out_trade_no = order.order_no;
          const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id
          if (res.status !== 200) {
            console.log('微信支付下单失败', res.data);
            if (res.data.code === 'ORDERPAID') {
              console.log('订单已支付');
              await this.orderAccessFeeService.setPaidByOrderNo(order.order_no);
              return {
                success: false,
                data: { order_no: order.order_no },
                message: '已支付过，本次无需支付',
                code: 10001, // 10001: 专门用于前端判断是否有未使用的订单
              };
            }
            throw new HttpException(
              res.data.message,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
          return {
            paySign: this.wxPayService.paySignString(res.data.prepay_id),
            order_no: order.order_no,
          };
        }
      }

      // order-access-fee订单不存在或者过期，开始生成新的订单号，后续创建新的order-access-fee订单
      createWxPayDto.out_trade_no = this.wxPayService.generateOrderNo();
      const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id

      if (res.status !== 200) {
        throw new HttpException(
          '微信支付下单失败',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // 创建order-access-fee订单
      const createOrderAccessFeeDto = new CreateOrderAccessFeeDto();
      createOrderAccessFeeDto.user_id = userId;
      createOrderAccessFeeDto.amount = config.price;
      createOrderAccessFeeDto.order_no = createWxPayDto.out_trade_no;
      await this.orderAccessFeeService.create(createOrderAccessFeeDto);

      // 返回小程序需要的paySign
      const paySign = this.wxPayService.paySignString(res.data.prepay_id);

      return {
        paySign,
        order_no: createWxPayDto.out_trade_no,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        error?.message || '创建订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 回调处理，设置订单已支付
   * @param request 请求对象
   * @returns 处理结果
   */
  @Public()
  @Post('callback')
  @HttpCode(200)
  async callback(@Request() request) {
    console.log('微信支付回调请求头', request.headers);

    console.log('微信支付回调请求体', request.body);

    if (this.wxPayService.verifySign(request)) {
      // 解密微信支付回调请求体
      try {
        const res = this.wxPayService.decryptToString_v3(request.body.resource);
        console.log('解密成功', res);
        const payResult = JSON.parse(res);
        // 设置订单已支付
        await this.orderAccessFeeService.setPaidByOrderNo(payResult.attach);
        return null;
      } catch (error) {
        console.log(error);
        throw new HttpException('解密失败', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
    throw new HttpException('验证签名失败', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * 根据用户id查询是否有已支付未使用的订单
   * @param request 请求对象
   * @returns true:有未使用的订单 false:没有未使用的订单
   */
  @Get('if-unused')
  async findUnusedOrderByUserId(@Request() request) {
    const userId = request.user.id;
    const order =
      await this.orderAccessFeeService.findByUserIdPayNotUsed(userId);

    if (order) {
      return {
        flag: true,
        order_no: order.order_no,
      };
    }
    return {
      flag: false,
    };
  }
  /**
   * 设置订单已使用
   * @param body 订单号
   * @returns 成功返回true
   */
  @Post('set-is-used')
  async setIsUsed(@Body() body) {
    await this.orderAccessFeeService.setUsedByOrderNo(body.order_no,body.main_order_id);
    return true;
  }
}
