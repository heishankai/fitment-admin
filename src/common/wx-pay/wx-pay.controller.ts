import { Controller, Get } from '@nestjs/common';
import { WX_PAY_CONFIG } from './config/wxpay.config';
import { WECHAT_CONFIG } from '../constants/app.constants';
import { WxPayService } from './wx-pay.service';
import axios from 'axios';
import { CreateWxPayDto } from './dto/create-wx-pay.dto';

@Controller('wx-pay')
export class WxPayController {
  constructor(private readonly wxPayService: WxPayService) {}
  // // 测试微信支付
  // @Get('/test1')
  // async wxPay() {
  //   const url = WX_PAY_CONFIG.server_url + WX_PAY_CONFIG.jsapi_url;
  //   const data = {
  //     appid: WECHAT_CONFIG.appid,
  //     mchid: WX_PAY_CONFIG.mchid,
  //     description: '商品描述',
  //     out_trade_no: '17660370370566248810515345180104',
  //     attach: '17660370370566248810515345180104',
  //     notify_url: WX_PAY_CONFIG.notify_url,
  //     amount: {
  //       total: 100,
  //     },
  //     payer: {
  //       openid: 'o3clf10Iw0b0SEO03z29BrHB4xFM',
  //     },
  //   };
  //   const signData = this.wxPayService.signString(
  //     JSON.stringify(data),
  //     WX_PAY_CONFIG.jsapi_url,
  //   );
  //   const header = {
  //     Authorization: signData,
  //     Accept: 'application/json',
  //     'Content-Type': 'application/json',
  //   };
  //   const res = await axios.post(url, data, { headers: header });

  //   console.log(res);
  //   return res.data;
  // }
  // // 测试微信支付
  // @Get('/test2')
  // async wxPay2() {
  //   const ccreateWxPayDto = new CreateWxPayDto();
  //   ccreateWxPayDto.amount = 100;
  //   ccreateWxPayDto.description = '商品描述';
  //   ccreateWxPayDto.openid = 'o3clf10Iw0b0SEO03z29BrHB4xFM';
  //   ccreateWxPayDto.notify_url = WX_PAY_CONFIG.notify_url;
  //   ccreateWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
  //   // ccreateWxPayDto.out_trade_no = this.wxPayService.generateOrderNo();
  //   ccreateWxPayDto.out_trade_no = '17661153680884408014060334324212';
  //   const res = await this.wxPayService.createOrder(ccreateWxPayDto);
  //   console.log(res.status);
  //   console.log(res.data);
  //   return {
  //     status: res.status,
  //     data: res.data,
  //   };
  // }
  // //
  // @Get('/test3')
  // async wxPay3() {
  //   const res = this.wxPayService.paySignString(
  //     'wx18170540543875c52c490f1bc60b8d0001',
  //   );
  //   return res;
  // }

  // @Get('/test')
  // test() {
  //   const order = this.wxPayService.generateOrderNo();
  //   console.log(order);
  //   return order;
  // }
}
