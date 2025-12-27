import { Injectable } from '@nestjs/common';
import {
  createDecipheriv,
  createSign,
  createVerify,
  randomBytes,
} from 'crypto';
import { WX_PAY_CONFIG } from './config/wxpay.config';
import { CreateWxPayDto } from './dto/create-wx-pay.dto';
import { WECHAT_CONFIG } from '../constants/app.constants';
import axios from 'axios';
import { error, timeStamp } from 'console';

@Injectable()
export class WxPayService {
  /**
   * 创建微信支付订单
   * @param createWxPayDto 创建微信支付的数据传输对象
   * @returns 响应的数据
   */
  async createOrder(createWxPayDto: CreateWxPayDto) {
    // const url = WX_PAY_CONFIG.server_url + WX_PAY_CONFIG.jsapi_url;
    const url = WX_PAY_CONFIG.server_url + createWxPayDto.url;
    // 创建微信支付请求体
    const data: WeChatPayRequestData = {
      appid: WECHAT_CONFIG.appid,
      mchid: WX_PAY_CONFIG.mchid,
      description: createWxPayDto.description, // 商品描述
      out_trade_no: createWxPayDto.out_trade_no, // 支付订单号
      attach: createWxPayDto.out_trade_no, // 附加数据,回调时会原样返回
      notify_url: createWxPayDto.notify_url, // 支付结果通知地址
      amount: {
        total: createWxPayDto.amount, // 金额单位为分
      },
      payer: {
        openid: createWxPayDto.openid, // 用户openid
      },
    };
    // 请求体签名
    const signData = this.signString(JSON.stringify(data), createWxPayDto.url);
    // 设置请求头
    const header = {
      Authorization: signData,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    let res;
    try {
      // 发送请求
      res = await axios.post(url, data, { headers: header });
    } catch (error) {
      console.error('微信支付下单失败:');
      return error.response;
    }
    return res;
  }

  // 微信验签
  verifySign(request: any): boolean {
    const headers = request.headers;
    const body = request.body;
    // 构造应答的验签名串
    const signString =
      `${headers['wechatpay-timestamp']}\n` +
      `${headers['wechatpay-nonce']}\n` +
      `${JSON.stringify(body)}\n`;

    // 获取应答签名
    const signature = headers['wechatpay-signature'];

    // 使用 base64 解码应答签名
    const decodedSignature = Buffer.from(signature, 'base64');
    // 使用微信支付平台公钥验证签名
    const verify = createVerify('RSA-SHA256');
    verify.update(signString);
    const isValid = verify.verify(WX_PAY_CONFIG.publicKey, decodedSignature);

    if (isValid) {
      console.log('微信支付验签成功');
      return true;
    } else {
      console.log('微信支付验签失败');
      return false;
    }
  }
  // V3解密
  decryptToString_v3(resource: any): string {
    // 获取密钥
    const key = Buffer.from(WX_PAY_CONFIG.wxKeyV3, 'utf8');
    const associated_data = Buffer.from(resource.associated_data, 'utf8');
    const nonce = Buffer.from(resource.nonce, 'utf8');
    const ciphertext = Buffer.from(resource.ciphertext, 'base64');
    // 创建AEAD_AES_256_GCM解密器
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    // 设置关联数据
    decipher.setAAD(associated_data);

    // 分离认证标签（密文最后16字节是认证标签）
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const encryptedData = ciphertext.subarray(0, ciphertext.length - 16);
    // 设置认证标签
    decipher.setAuthTag(authTag);

    // 解密密文
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  //生成小程序支付需要的paySign
  paySignString(prepay_id: string) {
    // 生成时间戳
    const timestamp = Math.floor(Date.now() / 1000);
    // 生成随机字符串
    const nonceStr = randomBytes(16).toString('hex');
    // 拼接签名字符串
    const signString = `${WECHAT_CONFIG.appid}\n${timestamp}\n${nonceStr}\nprepay_id=${prepay_id}\n`;
    // 生成签名
    const sign = createSign('RSA-SHA256');
    sign.update(signString);
    const signature = sign.sign(WX_PAY_CONFIG.privateKey, 'base64');

    return {
      timeStamp: JSON.stringify(timestamp),
      nonceStr,
      package: `prepay_id=${prepay_id}`,
      signType: 'RSA',
      paySign: signature,
    };
  }
  /**
   * 生成订单号
   * @returns 32位订单号
   */
  generateOrderNo(): string {
    // 添加时间戳
    const timestamp = Date.now().toString(); // 13位

    // 随机数长度
    const randomBytesBuffer = randomBytes(10); // 10字节

    // 转换为十进制
    const hexString = randomBytesBuffer.toString('hex');
    const bigIntValue = BigInt('0x' + hexString);
    const randomStr = bigIntValue.toString().padStart(19, '0').slice(-19);

    // 13位时间戳 + 19位随机数 = 32位
    return timestamp + randomStr;
  }
  //小程序下单http头签名
  signString(body: any, url: string) {
    // 生成时间戳
    const timestamp = Math.floor(Date.now() / 1000);
    // 生成随机字符串
    const nonceStr = randomBytes(16).toString('hex');
    // 拼接签名字符串
    const signString = `POST\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    // 生成签名
    const sign = createSign('RSA-SHA256');
    sign.update(signString);
    const signature = sign.sign(WX_PAY_CONFIG.privateKey, 'base64');

    return (
      `WECHATPAY2-SHA256-RSA2048 ` +
      `mchid="${WX_PAY_CONFIG.mchid}",` +
      `nonce_str="${nonceStr}",` +
      `signature="${signature}",` +
      `timestamp="${timestamp}",` +
      `serial_no="${WX_PAY_CONFIG.serial_no}"`
    );
  }
}

// 微信支付请求数据类型
export interface WeChatPayAmount {
  total: number;
  currency?: string; // 可选，默认为CNY
}
export interface WeChatPayPayer {
  openid: string;
}
export interface WeChatPayRequestData {
  appid: string;
  mchid: string;
  description: string;
  out_trade_no: string;
  attach: string;
  notify_url: string;
  amount: WeChatPayAmount;
  payer: WeChatPayPayer;
  goods_tag?: string;
  time_expire?: string; // 可选，订单过期时间
  detail?: any;
  scene_info?: any;
}
