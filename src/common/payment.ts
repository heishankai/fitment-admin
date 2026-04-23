import Decimal from 'decimal.js';
import {
  WECHAT_CONFIG,
  WX_PAY_CONFIG,
  WX_PAY_CHARGE_RATIO,
} from './constants/app.constants';
import { getWxPaySignString, getPaySignString, yuanToFen } from './utils';
import axios from 'axios';

/** 业务应付（元）→ 微信下单金额（元）：按比例缩放，且不低于 0.01（微信最小支付单位） */
function resolveWxPayYuan(businessYuan: number): number {
  const ratio = WX_PAY_CHARGE_RATIO;
  if (!Number.isFinite(ratio) || ratio >= 1 - 1e-12) {
    return new Decimal(businessYuan).toDecimalPlaces(2).toNumber();
  }
  const biz = new Decimal(businessYuan);
  if (biz.lte(0)) {
    return biz.toDecimalPlaces(2).toNumber();
  }
  let scaled = biz
    .mul(ratio)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const minYuan = new Decimal('0.01');
  if (scaled.lt(minYuan)) {
    scaled = minYuan;
  }
  return scaled.toNumber();
}

/** 通用微信支付参数 */
export interface WxPayParams {
  out_trade_no: string;
  amount: number;
  openid: string;
  description: string;
  attach?: string;
}

/**
 * 通用微信支付调用（支持订单、辅材等业务）
 */
export const callWxPay = async (params: WxPayParams): Promise<any> => {
  const { out_trade_no, amount, openid, description, attach } = params;
  const chargeYuan = resolveWxPayYuan(Number(amount));

  const data = {
    appid: WECHAT_CONFIG.appid,
    mchid: WECHAT_CONFIG.mchid,
    description,
    out_trade_no,
    attach: attach || out_trade_no,
    amount: {
      total: yuanToFen(chargeYuan),
    },
    payer: { openid },
    notify_url: WX_PAY_CONFIG.notifyUrl,
  };

  const bodyStr = JSON.stringify(data);
  const urlPath = '/v3/pay/transactions/jsapi';
  const signData = getWxPaySignString(bodyStr, urlPath);

  const headers = {
    Authorization: signData,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    const res = await axios.post(WX_PAY_CONFIG.jsapiPayUrl, bodyStr, { headers });
    const paySign = getPaySignString(res.data.prepay_id);
    return { ...paySign, out_trade_no };
  } catch (error: any) {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.code ||
      '微信支付请求失败';
    throw new Error(msg);
  }
};

