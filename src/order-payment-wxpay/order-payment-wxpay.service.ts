import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderPaymentWxpayDto } from './dto/create-order-payment-wxpay.dto';
import { UpdateOrderPaymentWxpayDto } from './dto/update-order-payment-wxpay.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderPaymentWxpay } from './entities/order-payment-wxpay.entity';
import { Repository } from 'typeorm';
import { WxPayService } from 'src/common/wx-pay/wx-pay.service';
import { WorkPriceItem } from 'src/work-price-item/work-price-item.entity';
import { Order } from 'src/order/order.entity';
import {
  NOTIFY_URL,
  WX_PAY_CONFIG,
} from 'src/common/wx-pay/config/wxpay.config';
import { CreatePaymentDto } from './dto/create-pyment.dto';
import { CreateWxPayDto } from 'src/common/wx-pay/dto/create-wx-pay.dto';

@Injectable()
export class OrderPaymentWxpayService {
  constructor(
    @InjectRepository(OrderPaymentWxpay)
    private readonly orderPaymentWxpayRepository: Repository<OrderPaymentWxpay>,
    private readonly wxPayService: WxPayService,
    @InjectRepository(WorkPriceItem)
    private readonly workPriceItemRepository: Repository<WorkPriceItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * 创建支付
   * @param user_id 用户ID
   * @param createPaymentDto 创建支付DTO
   * @returns 小程序发起支付需要的paySign
   */
  async createPayment(user: any, createPaymentDto: CreatePaymentDto) {
    // 查询工价单
    const workPriceItem = await this.workPriceItemRepository.findOne({
      where: { id: createPaymentDto.work_price_item_id },
    });
    if (!workPriceItem) {
      throw new HttpException('工价单不存在', HttpStatus.NOT_FOUND);
    }
    if (workPriceItem.is_paid === true) {
      throw new HttpException('工价单已支付过，请刷新', HttpStatus.BAD_REQUEST);
    }

    // 查询支付单
    const orderPaymentWxpay = await this.findByMainOrderId(
      createPaymentDto.work_price_item_id,
    );

    if (orderPaymentWxpay) {
      // 微信支付下单(获得prepay_id)
      const createWxPayDto = new CreateWxPayDto();
      createWxPayDto.openid = user.openid;
      createWxPayDto.amount = Math.floor(
        Number(orderPaymentWxpay.amount) * 100,
      );
      createWxPayDto.description = orderPaymentWxpay.description; // 使用title作为商品描述
      createWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
      createWxPayDto.notify_url = NOTIFY_URL.order_payment_notify_url;
      createWxPayDto.out_trade_no = orderPaymentWxpay.order_no; // 订单号

      console.log(createWxPayDto.description);

      // 订单存在的情况，检查是否过期，因为存在过期未标记情况
      if (await this.isOrderExpired(orderPaymentWxpay.id)) {
        // 订单过期情况
        console.log(`支付单已过期，支付单号: ${orderPaymentWxpay.order_no}`);

        // 重新创建支付单
        createWxPayDto.out_trade_no = this.wxPayService.generateOrderNo(); // 订单号
        const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id
        // 创建支付记录
        const oldOrderPaymentWxpay = new OrderPaymentWxpay();
        oldOrderPaymentWxpay.user_id = orderPaymentWxpay.user_id;
        oldOrderPaymentWxpay.amount = orderPaymentWxpay.amount;
        oldOrderPaymentWxpay.order_no = createWxPayDto.out_trade_no; // 生成新的支付号
        oldOrderPaymentWxpay.main_order_id = orderPaymentWxpay.main_order_id;
        oldOrderPaymentWxpay.main_order_no = orderPaymentWxpay.main_order_no;
        const newOrderPaymentWxpay =
          this.orderPaymentWxpayRepository.create(oldOrderPaymentWxpay);
        await this.orderPaymentWxpayRepository.insert(newOrderPaymentWxpay);

        // 返回小程序需要的paySign
        const paySign = this.wxPayService.paySignString(res.data.prepay_id);

        return {
          paySign: paySign,
        };
      } else {
        console.log(`支付单未过期，支付单号: ${orderPaymentWxpay.order_no}`);
        // 订单未过期，返回paySign
        createWxPayDto.out_trade_no = orderPaymentWxpay.order_no; // 订单号

        let res;
        try {
          res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id
        } catch (error) {
          console.log(error.response);
          if (error.response.code === 'ORDERPAID') {
            await this.handlePaymentCallback(orderPaymentWxpay.order_no);
            throw new HttpException('订单已支付', 200);
          }
          throw new HttpException(
            error.response.message,
            HttpStatus.BAD_REQUEST,
          );
        }
        const paySign = this.wxPayService.paySignString(res.data.prepay_id);

        return {
          paySign: paySign,
        };
      }
    } else {
      // 支付单不存在，或已经过期，创建新订单
      console.log(`支付单不存在，或已经过期，创建新订单`);

      // 查询父级订单
      const order = await this.orderRepository.findOne({
        where: { id: workPriceItem.order_id },
      });
      if (workPriceItem.work_kind_id === 7) {
        // 处理特定工作种类的逻辑

        if (!order) {
          throw new HttpException('父级订单不存在', HttpStatus.NOT_FOUND);
        }
        const a = Math.floor(Number(order.gangmaster_cost) * 100);
        const b = Math.floor(Number(order.total_service_fee) * 100);
        const price = a + b;

        // 微信支付下单(获得prepay_id)
        const createWxPayDto = new CreateWxPayDto();
        createWxPayDto.openid = user.openid;
        createWxPayDto.amount = price;
        createWxPayDto.description = `工长费（含平台服务费）`; // 使用title作为商品描述
        createWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
        createWxPayDto.notify_url = NOTIFY_URL.order_payment_notify_url;
        createWxPayDto.out_trade_no = this.wxPayService.generateOrderNo(); // 生成订单号

        const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id
        console.log(createWxPayDto.description);

        // 创建支付记录
        const orderPaymentWxpay = new OrderPaymentWxpay();
        orderPaymentWxpay.user_id = user.id;
        // 价格除以100，转换为string类型
        orderPaymentWxpay.amount = (price / 100).toString();
        orderPaymentWxpay.order_no = createWxPayDto.out_trade_no;
        orderPaymentWxpay.main_order_id = workPriceItem.id;
        orderPaymentWxpay.main_order_no = order.order_no;
        orderPaymentWxpay.description = createWxPayDto.description;
        const newOrderPaymentWxpay =
          this.orderPaymentWxpayRepository.create(orderPaymentWxpay);
        await this.orderPaymentWxpayRepository.insert(newOrderPaymentWxpay);

        // 创建新订单
        console.log(`创建新订单,订单号: ${order.order_no}`);

        // 返回小程序需要的paySign
        const paySign = this.wxPayService.paySignString(res.data.prepay_id);

        return {
          paySign: paySign,
        };
      } else {
        // 普通工作种类
        const a = Math.floor(Number(workPriceItem.settlement_amount) * 100);
        const b = Math.floor(Number(workPriceItem.total_service_fee) * 100);
        const price = a + b;
        // 微信支付下单(获得prepay_id)
        const createWxPayDto = new CreateWxPayDto();
        createWxPayDto.openid = user.openid;
        createWxPayDto.amount = price;
        createWxPayDto.description = `${workPriceItem.work_title}费用（含平台服务费）`; // 使用title作为商品描述
        createWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
        createWxPayDto.notify_url = NOTIFY_URL.order_payment_notify_url;
        createWxPayDto.out_trade_no = this.wxPayService.generateOrderNo(); // 生成订单号

        const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id
        console.log(createWxPayDto.description);

        // 创建支付记录
        const orderPaymentWxpay = new OrderPaymentWxpay();
        orderPaymentWxpay.user_id = user.id;
        // 价格除以100，转换为string类型
        orderPaymentWxpay.amount = (price / 100).toString();
        orderPaymentWxpay.order_no = createWxPayDto.out_trade_no;
        orderPaymentWxpay.main_order_id = workPriceItem.id;
        orderPaymentWxpay.main_order_no = order.order_no;
        orderPaymentWxpay.description = createWxPayDto.description;
        const newOrderPaymentWxpay =
          this.orderPaymentWxpayRepository.create(orderPaymentWxpay);
        await this.orderPaymentWxpayRepository.insert(newOrderPaymentWxpay);

        // 创建新订单
        console.log(`创建新订单,订单号: ${order.order_no}`);

        // 返回小程序需要的paySign
        const paySign = this.wxPayService.paySignString(res.data.prepay_id);

        return {
          paySign: paySign,
        };
      }
    }
  }

  /**
   * 处理支付回调
   * @param order_no 订单号
   */
  async handlePaymentCallback(order_no: string) {
    console.log(`处理支付回调，支付单号: ${order_no}`);

    // TODO: 实现支付回调处理逻辑

    const orderPaymentWxpay = await this.orderPaymentWxpayRepository.findOne({
      where: { order_no },
    });
    if (!orderPaymentWxpay) {
      throw new HttpException('支付单不存在', HttpStatus.NOT_FOUND);
    }

    const workPriceItem = await this.workPriceItemRepository.findOne({
      where: { id: orderPaymentWxpay.main_order_id },
    });
    const order = await this.orderRepository.findOne({
      where: { id: workPriceItem.order_id },
    });

    // 工价费支付
    await this.workPriceItemRepository.update(workPriceItem.id, {
      is_paid: true,
    });
    console.log(
      `已修改workPriceItem的is_paid为true，workPriceItemID: ${workPriceItem.id}`,
    );

    // 服务费支付
    if (workPriceItem.work_group_id === 1) {
      await this.orderRepository.update(order.id, {
        total_service_fee_is_paid: true,
      });
      console.log(
        `已修改order的total_service_fee_is_paid为true，orderID: ${order.id}`,
      );
    } else {
      await this.workPriceItemRepository.update(workPriceItem.id, {
        total_service_fee_is_paid: true,
      });
      console.log(
        `已修改workPriceItem的total_service_fee_is_paid为true，workPriceItemID: ${workPriceItem.id}`,
      );
    }

    // 支付单修改状态为已支付
    await this.orderPaymentWxpayRepository.update(orderPaymentWxpay.id, {
      status: 1,
    });
    console.log('回调处理完成');
  }
  /**
   * 判断订单是否过期
   * @param id 订单ID
   * @returns 是否过期
   */
  async isOrderExpired(id: number): Promise<boolean> {
    // TODO: 实现订单过期检查逻辑
    const orderPayment = await this.orderPaymentWxpayRepository.findOne({
      where: { id },
    });
    if (orderPayment) {
      if (orderPayment.is_expired === 1) {
        return true;
      }
      // 检查时间是否超过5天
      const now = new Date();
      const orderTime = new Date(orderPayment.createdAt);
      const diff = now.getTime() - orderTime.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days > 5) {
        await this.orderPaymentWxpayRepository.update(id, { is_expired: 1 });
        return true;
      }
    }
    return false;
  }
  /**
   * 根据main_order_id查询(未过期，未支付)订单支付记录，如果存在则返回，否则返回null
   * @param main_order_id 主订单ID
   * @returns 订单支付记录或null
   */
  async findByMainOrderId(
    main_order_id: number,
  ): Promise<OrderPaymentWxpay | null> {
    return await this.orderPaymentWxpayRepository.findOne({
      where: { main_order_id, is_expired: 0, status: 0 },
    });
  }
}
