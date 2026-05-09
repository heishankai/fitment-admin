import { WX_PAY_CONFIG } from '../common/constants/app.constants';
import { MaterialsService } from '../materials/materials.service';
import { WorkPriceItemService } from '../work-price-item/work-price-item.service';
import { OrderService } from '../order/order.service';
import { PaymentRecordService } from '../payment-record/payment-record.service';
import { PaymentRecordType } from '../payment-record/payment-record.entity';

/** 支付回调 attach 解析后的数据结构 */
export interface WxPayAttachData {
  type: string;
  order_no?: string;
  orderId?: number;
  materialId?: number;
  materialsIds?: number[];
  workPriceItemId?: number;
  workPriceItemIds?: number[];
  feeIndexes?: number[];
  orderAmount?: number;
}

/** 支付回调处理器依赖（新增模块时在此扩展） */
export interface WxPayCallbackDeps {
  materialsService: MaterialsService;
  workPriceItemService: WorkPriceItemService;
  orderService: OrderService;
  paymentRecordService: PaymentRecordService;
}

export interface WxPayCallbackMeta {
  out_trade_no?: string;
  transaction_id?: string;
  amount?: number;
  business_amount?: number;
}

/** 支付回调处理器：根据 type 执行对应的业务更新 */
export type WxPayCallbackHandler = (
  attachData: WxPayAttachData,
  deps: WxPayCallbackDeps,
  meta?: WxPayCallbackMeta,
) => Promise<void>;

/**
 * 支付回调处理器注册表
 * 新增业务模块时：在此添加 type 与 handler 的映射即可
 */
const callbackHandlers: Record<string, WxPayCallbackHandler> = {
  [WX_PAY_CONFIG.payType.MATERIAL_SINGLE]: async (
    attachData,
    { materialsService, paymentRecordService },
    meta,
  ) => {
    const { materialId } = attachData;
    if (!materialId) return;
    await materialsService.confirmPaymentById(materialId);
    await paymentRecordService.recordMaterialsPayment([materialId], {
      ...meta,
      attach: attachData,
    });
    console.log(`[微信支付回调] 辅材单个支付确认成功: materialId=${materialId}`);
  },

  [WX_PAY_CONFIG.payType.MATERIAL_BATCH]: async (
    attachData,
    { materialsService, paymentRecordService },
    meta,
  ) => {
    const { materialsIds } = attachData;
    if (!materialsIds?.length) return;
    await materialsService.batchConfirmPaymentByMaterialsIds(materialsIds);
    await paymentRecordService.recordMaterialsPayment(materialsIds, {
      ...meta,
      attach: attachData,
    });
    console.log(`[微信支付回调] 辅材批量支付确认成功: materialsIds=${materialsIds.join(', ')}`);
  },

  [WX_PAY_CONFIG.payType.WORK_PRICE_SINGLE]: async (
    attachData,
    { workPriceItemService, paymentRecordService },
    meta,
  ) => {
    const rawId = attachData.workPriceItemId;
    const workPriceItemId =
      typeof rawId === 'string' ? parseInt(rawId, 10) : Number(rawId);
    if (!Number.isFinite(workPriceItemId)) return;
    await workPriceItemService.confirmPaymentByWorkPriceItemId(workPriceItemId);
    await paymentRecordService.recordWorkPricePayment(
      [workPriceItemId],
      PaymentRecordType.WORK_PRICE,
      {
        ...meta,
        attach: attachData,
      },
    );
    console.log(
      `[微信支付回调] 工价项单个支付确认成功: workPriceItemId=${workPriceItemId}`,
    );
  },

  [WX_PAY_CONFIG.payType.WORK_PRICE_BATCH]: async (
    attachData,
    { workPriceItemService, paymentRecordService },
    meta,
  ) => {
    const raw = attachData.workPriceItemIds;
    if (!Array.isArray(raw) || raw.length === 0) return;
    const workPriceItemIds = raw
      .map((x) => (typeof x === 'string' ? parseInt(x, 10) : Number(x)))
      .filter((n) => Number.isFinite(n));
    if (workPriceItemIds.length === 0) return;
    await workPriceItemService.batchConfirmPaymentByWorkPriceItemIds(
      workPriceItemIds,
    );
    await paymentRecordService.recordWorkPricePayment(
      workPriceItemIds,
      PaymentRecordType.WORK_PRICE,
      {
        ...meta,
        attach: attachData,
      },
    );
    console.log(
      `[微信支付回调] 工价项批量支付确认成功: workPriceItemIds=${workPriceItemIds.join(', ')}`,
    );
  },

  [WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH]: async (
    attachData,
    { workPriceItemService, paymentRecordService },
    meta,
  ) => {
    const raw = attachData.workPriceItemIds;
    if (!Array.isArray(raw) || raw.length === 0) return;
    const workPriceItemIds = raw
      .map((x) => (typeof x === 'string' ? parseInt(x, 10) : Number(x)))
      .filter((n) => Number.isFinite(n));
    if (workPriceItemIds.length === 0) return;
    await workPriceItemService.batchConfirmSubWorkPriceServiceFeeByWorkPriceItemIds(
      workPriceItemIds,
    );
    await paymentRecordService.recordWorkPricePayment(
      workPriceItemIds,
      PaymentRecordType.PLATFORM_SERVICE_FEE,
      {
        ...meta,
        attach: attachData,
      },
    );
    console.log(
      `[微信支付回调] 子工价平台服务费确认成功: workPriceItemIds=${workPriceItemIds.join(', ')}`,
    );
  },

  [WX_PAY_CONFIG.payType.ORDER_PLATFORM_SERVICE_FEE]: async (
    attachData,
    { orderService, paymentRecordService },
    meta,
  ) => {
    const raw = attachData.orderId;
    const orderId =
      typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
    if (!Number.isFinite(orderId)) return;
    const businessAmount =
      await orderService.confirmOrderPlatformServiceFeeWxPay(
        orderId,
        attachData.feeIndexes,
      );
    await paymentRecordService.recordOrderFeePayment(
      orderId,
      PaymentRecordType.PLATFORM_SERVICE_FEE,
      {
        ...meta,
        business_amount:
          businessAmount || Number(attachData.orderAmount) || undefined,
        attach: attachData,
      },
    );
    console.log(
      `[微信支付回调] 订单平台服务费确认成功: orderId=${orderId}`,
    );
  },

  [WX_PAY_CONFIG.payType.ORDER_GANGMASTER_COST]: async (
    attachData,
    { orderService, paymentRecordService },
    meta,
  ) => {
    const raw = attachData.orderId;
    const orderId =
      typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
    if (!Number.isFinite(orderId)) return;
    const businessAmount =
      await orderService.confirmOrderGangmasterCostWxPay(
        orderId,
        attachData.feeIndexes,
      );
    await paymentRecordService.recordOrderFeePayment(
      orderId,
      PaymentRecordType.GANGMASTER_COST,
      {
        ...meta,
        business_amount:
          businessAmount || Number(attachData.orderAmount) || undefined,
        attach: attachData,
      },
    );
    console.log(`[微信支付回调] 订单工长费确认成功: orderId=${orderId}`);
  },

  [WX_PAY_CONFIG.payType.ORDER]: async (attachData) => {
    // 订单支付回调：可在此扩展，如更新订单支付状态、工价项支付状态等
    const { order_no } = attachData;
    console.log(`[微信支付回调] 订单支付成功: order_no=${order_no}，待扩展业务逻辑`);
  },
};

/**
 * 根据 attach 分发到对应处理器执行
 */
export async function dispatchWxPayCallback(
  attach: string,
  deps: WxPayCallbackDeps,
  meta?: WxPayCallbackMeta,
): Promise<void> {
  if (!attach?.trim()) return;

  let attachData: WxPayAttachData;
  try {
    attachData = JSON.parse(attach) as WxPayAttachData;
  } catch {
    console.error('[微信支付回调] 解析 attach 失败:', attach);
    return;
  }

  const { type } = attachData;
  const handler = callbackHandlers[type];

  if (!handler) {
    console.warn(`[微信支付回调] 未注册的支付类型: type=${type}`);
    return;
  }

  try {
    await handler(attachData, deps, meta);
  } catch (error) {
    console.error(`[微信支付回调] 处理失败 type=${type}:`, error);
    throw error;
  }
}
