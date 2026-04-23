import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Decimal from 'decimal.js';
import { WECHAT_CONFIG } from './constants/app.constants';

/** 元转分，使用 decimal.js 避免浮点误差 */
export function yuanToFen(yuan: number | string): number {
  return new Decimal(yuan).times(100).round().toNumber();
}

/**
 * 生成微信支付商户订单号：{前缀}{时间戳}{随机数}，保证唯一
 * 微信要求：6-32字符，只能是数字、大小写字母、_-|*
 * @param prefix 业务前缀，如 OD(订单)、FM(辅材)
 */
export function generateOutTradeNo(prefix: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, '')
    .slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${timestamp}${random}`;
}

// 引入商户key（路径相对于项目根目录）
const privateKeyPath = path.join(process.cwd(), 'src', 'common', 'constants', 'apiclient_key.pem');
const privateKey = fs.readFileSync(privateKeyPath);

// 小程序下单生成的http头部签名
export function getWxPaySignString(body, url = '/v3/pay/transactions/jsapi'): string {
  // 生成时间戳
  const timestamp = Math.floor(Date.now() / 1000);

  // 随机串
  const nonceStr = crypto.randomBytes(16).toString('hex');

  // 构造待签名的字符串
  const signString = `POST\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;

  // 进行签名 - 创建签名对象
  const sign = crypto.createSign('RSA-SHA256');

  // 设置私钥-使用私钥进行签名
  sign.update(signString);

  // 获取私钥
  const signature = sign.sign(privateKey, 'base64');
  // 签名完成后，返回签名结果
  return `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_CONFIG.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${WECHAT_CONFIG.serial_no}"`;

}

/**
 * 生成小程序发起支付需要的paySign参数
 */
export const getPaySignString = (prepayId: string): { timeStamp: string, nonceStr: string, package: string, signType: string, paySign: string } => {

  // 生成时间戳
  const timestamp = Math.floor(Date.now() / 1000);
  // 随机串
  const nonceStr = crypto.randomBytes(16).toString('hex');
  // 构造待签名的字符串
  const signString = `${WECHAT_CONFIG.appid}\n${timestamp}\n${nonceStr}\nprepay_id=${prepayId}\n`;
  // 进行签名 - 创建签名对象
  const sign = crypto.createSign('RSA-SHA256');
  // 设置私钥-使用私钥进行签名
  sign.update(signString);
  // 获取私钥
  const signature = sign.sign(privateKey, 'base64');
  // 签名完成后，返回给前端签名结果
  return {
    timeStamp: JSON.stringify(timestamp),
    nonceStr,
    package: `prepay_id=${prepayId}`,
    signType: 'RSA',
    paySign: signature,
  };
}

/**
 * 解密微信支付回调数据
 */
export const decryptWxPayCallback = (resource, wxKey): any => {
  const key = Buffer.from(wxKey, 'utf8');
  const nonce = Buffer.from(resource.nonce, 'utf8');
  const associatedData = Buffer.from(resource.associated_data, 'utf8');
  const ciphertextBuffer = Buffer.from(resource.ciphertext, 'base64');

  // 创建AEAD_AES_256_GCM解密器对象
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);

  // 设置关联数据，与密文进行身份验证
  decipher.setAAD(associatedData);

  // associated_data长度小于16个字节，取最后16和字节作为认证标签
  const authTag = Buffer.from(ciphertextBuffer.subarray(ciphertextBuffer.length - 16));
  // 使用setAuthTag方法设置认证标签
  decipher.setAuthTag(authTag);

  // 取除去最后16个字节以外的所有字节作为加密数据
  const encryptedData = ciphertextBuffer.subarray(0, ciphertextBuffer.length - 16);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(decrypted);
}