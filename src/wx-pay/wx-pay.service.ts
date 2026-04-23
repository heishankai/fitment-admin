import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import Decimal from 'decimal.js';
import { OrderWxPayDto } from './dto/order';
import { WxPayMaterialsDto } from './dto/wx-pay-materials.dto';
import { WxPayWorkPriceItemsDto } from './dto/wx-pay-work-price-items.dto';
import { WxPayOrderFeesDto } from './dto/wx-pay-order-fees.dto';
import { callWxPay } from '../common/payment';
import { decryptWxPayCallback, generateOutTradeNo } from '../common/utils';
import { WECHAT_CONFIG, WX_PAY_CONFIG } from '../common/constants/app.constants';
import { MaterialsService } from '../materials/materials.service';
import { WorkPriceItemService } from '../work-price-item/work-price-item.service';
import { OrderService } from '../order/order.service';
import { dispatchWxPayCallback } from './wx-pay-callback.handler';

@Injectable()
export class WxPayService {
  constructor(
    @Inject(forwardRef(() => MaterialsService))
    private readonly materialsService: MaterialsService,
    @Inject(forwardRef(() => WorkPriceItemService))
    private readonly workPriceItemService: WorkPriceItemService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  /**
   * 订单微信支付下单
   * @param openid 从当前登录用户获取，由 controller 传入
   */
  async orderWxPay(orderWxPayDto: OrderWxPayDto, openid: string): Promise<any> {
    try {
      const { order_no, order_amount } = orderWxPayDto;
      const data = await callWxPay({
        out_trade_no: order_no,
        amount: order_amount,
        openid,
        description: '智慧装订单支付',
        attach: JSON.stringify({
          type: WX_PAY_CONFIG.payType.ORDER,
          order_no,
        }),
      });
      return { ...data, order_no };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 辅材微信支付下单（单个或批量）
   * @param openid 从当前登录用户获取，由 controller 传入
   */
  async materialsPrepay(dto: WxPayMaterialsDto, openid: string): Promise<any> {
    try {
      const { materials, totalAmount, description, orderId } =
        await this.materialsService.getMaterialsPaymentPreview({
          pay_type: dto.pay_type,
          materialId: dto.materialId,
          materialsIds: dto.materialsIds,
        });

      const frontend = new Decimal(dto.order_amount).toDecimalPlaces(2);
      const backend = new Decimal(totalAmount).toDecimalPlaces(2);
      if (!frontend.equals(backend)) {
        throw new BadRequestException(
          `支付金额不一致：传入${dto.order_amount}元，计算金额${totalAmount}元`,
        );
      }

      const out_trade_no = generateOutTradeNo('FM');
      const attach =
        dto.pay_type === WX_PAY_CONFIG.payType.MATERIAL_SINGLE
          ? JSON.stringify({
              type: WX_PAY_CONFIG.payType.MATERIAL_SINGLE,
              orderId,
              materialId: dto.materialId,
            })
          : JSON.stringify({
              type: WX_PAY_CONFIG.payType.MATERIAL_BATCH,
              orderId,
              materialsIds: materials.map((m) => m.id),
            });

      const data = await callWxPay({
        out_trade_no,
        amount: totalAmount,
        openid,
        description,
        attach,
      });
      return { ...data, out_trade_no };
    } catch (error) {
      throw new BadRequestException(
        error?.message || error?.response?.message || '辅材支付下单失败',
      );
    }
  }

  /**
   * 工价项微信支付下单（单个或批量）
   */
  async workPriceItemsPrepay(
    dto: WxPayWorkPriceItemsDto,
    openid: string,
  ): Promise<any> {
    try {
      let items: { id: number }[];
      let description: string;
      let orderId: number;
      let wxPayAmount: number;

      if (
        dto.pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH
      ) {
        const p =
          await this.workPriceItemService.getSubWorkPriceServiceFeePaymentPreview(
            dto.workPriceItemIds!,
          );
        items = p.items;
        description = p.description;
        orderId = p.orderId;
        // 子工价服务费：不校验金额，微信下单金额以前端为准
        wxPayAmount = Number(dto.order_amount);

        if (wxPayAmount < 0.01) {
          await this.workPriceItemService.batchConfirmSubWorkPriceServiceFeeByWorkPriceItemIds(
            dto.workPriceItemIds!,
          );
          return {
            skip_wx_pay: true,
            out_trade_no: null,
            message: '子工价平台服务费已更新（无需在线支付）',
          };
        }
      } else {
        const p = await this.workPriceItemService.getWorkPricePaymentPreview({
          pay_type: dto.pay_type,
          workPriceItemId: dto.workPriceItemId,
          workPriceItemIds: dto.workPriceItemIds,
        });
        items = p.items;
        description = p.description;
        orderId = p.orderId;
        const totalAmount = p.totalAmount;
        const frontend = new Decimal(dto.order_amount).toDecimalPlaces(2);
        const backend = new Decimal(totalAmount).toDecimalPlaces(2);
        if (!frontend.equals(backend)) {
          throw new BadRequestException(
            `支付金额不一致：传入${dto.order_amount}元，计算金额${totalAmount}元`,
          );
        }
        wxPayAmount = totalAmount;
      }

      const prefix =
        dto.pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH
          ? 'FS'
          : 'FW';
      const out_trade_no = generateOutTradeNo(prefix);

      let attach: string;
      if (dto.pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SINGLE) {
        attach = JSON.stringify({
          type: WX_PAY_CONFIG.payType.WORK_PRICE_SINGLE,
          orderId,
          workPriceItemId: dto.workPriceItemId,
        });
      } else if (
        dto.pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH
      ) {
        attach = JSON.stringify({
          type: WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH,
          orderId,
          workPriceItemIds: items.map((i) => i.id),
        });
      } else {
        attach = JSON.stringify({
          type: WX_PAY_CONFIG.payType.WORK_PRICE_BATCH,
          orderId,
          workPriceItemIds: items.map((i) => i.id),
        });
      }

      const data = await callWxPay({
        out_trade_no,
        amount: wxPayAmount,
        openid,
        description,
        attach,
      });
      return { ...data, out_trade_no };
    } catch (error) {
      throw new BadRequestException(
        error?.message || error?.response?.message || '工价项支付下单失败',
      );
    }
  }

  /**
   * 订单维度：平台服务费 或 工长费（pay_type 区分）
   */
  async orderFeesPrepay(dto: WxPayOrderFeesDto, openid: string): Promise<any> {
    try {
      const { orderId, totalAmount, description } =
        await this.orderService.getOrderFeeWxPayPreview({
          pay_type: dto.pay_type,
          order_id: dto.order_id,
        });

      const frontend = new Decimal(dto.order_amount).toDecimalPlaces(2);
      const backend = new Decimal(totalAmount).toDecimalPlaces(2);
      if (!frontend.equals(backend)) {
        throw new BadRequestException(
          `支付金额不一致：传入${dto.order_amount}元，应付${totalAmount}元`,
        );
      }

      const prefix =
        dto.pay_type === WX_PAY_CONFIG.payType.ORDER_GANGMASTER_COST
          ? 'OG'
          : 'OS';
      const out_trade_no = generateOutTradeNo(prefix);
      const attach = JSON.stringify({
        type: dto.pay_type,
        orderId,
      });

      const data = await callWxPay({
        out_trade_no,
        amount: totalAmount,
        openid,
        description,
        attach,
      });
      return { ...data, out_trade_no };
    } catch (error) {
      throw new BadRequestException(
        error?.message || error?.response?.message || '订单费用支付下单失败',
      );
    }
  }

  /**
   * 微信支付回调：支付成功后根据 attach.type 分发到对应业务处理器
   * 必须返回 { code: 'SUCCESS', message: '成功' }，否则微信会反复重试
   */
  async wxPayCallback(body: any): Promise<{ code: string; message: string }> {
    try {
      const { event_type, resource } = body;
      const normalizedEvent =
        typeof event_type === 'string' ? event_type.toUpperCase() : '';

      if (normalizedEvent === 'TRANSACTION.SUCCESS') {
        const decryptedData = decryptWxPayCallback(
          resource,
          WECHAT_CONFIG.wxKeyV3,
        );
        console.log('[微信支付回调] 解密数据', decryptedData);

        const rawAttach = decryptedData?.attach;
        const attachForDispatch =
          typeof rawAttach === 'string'
            ? rawAttach
            : rawAttach != null && typeof rawAttach === 'object'
              ? JSON.stringify(rawAttach)
              : '';

        await dispatchWxPayCallback(attachForDispatch, {
          materialsService: this.materialsService,
          workPriceItemService: this.workPriceItemService,
          orderService: this.orderService,
        });
      } else if (event_type) {
        console.warn(
          '[微信支付回调] 忽略非支付成功事件 event_type=',
          event_type,
        );
      }
    } catch (error) {
      console.error('[微信支付回调] 处理失败:', error);
      // 仍返回成功，避免微信反复重试
    }
    return { code: 'SUCCESS', message: '成功' };
  }
}
