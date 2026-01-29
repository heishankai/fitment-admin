import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MaterialsPaymentWxpay } from './entities/materials-payment-wxpay.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WxPayService } from 'src/common/wx-pay/wx-pay.service';
import { Materials } from 'src/materials/materials.entity';
import { WechatUser } from 'src/wechat-user/wechat-user.entity';
import { CreateMaterialsPaymentSingleDto } from './dto/create-materials-payment-single.dto';
import { CreateWxPayDto } from 'src/common/wx-pay/dto/create-wx-pay.dto';
import {
  NOTIFY_URL,
  WX_PAY_CONFIG,
} from 'src/common/wx-pay/config/wxpay.config';
import { CreateMaterialsPaymentBatchDto } from './dto/create-materials-payment-batch.dto';

@Injectable()
export class MaterialsPaymentWxpayService {
  constructor(
    @InjectRepository(MaterialsPaymentWxpay)
    private readonly materialsPaymentWxpayRepository: Repository<MaterialsPaymentWxpay>,
    private readonly wxPayService: WxPayService,
    @InjectRepository(Materials)
    private readonly materialsRepository: Repository<Materials>,
  ) {}

  /**
   * 创建单个材料支付
   * @param user 用户
   * @param createMaterialsPaymentSingleDto 创建单个材料支付DTO
   * @returns 创建结果
   */
  async createMaterialsPaymentSingle(
    user: WechatUser,
    createMaterialsPaymentSingleDto: CreateMaterialsPaymentSingleDto,
  ) {
    // 查询材料价格单
    const materials = await this.materialsRepository.findOne({
      where: { id: createMaterialsPaymentSingleDto.materialsId },
    });
    if (!materials) {
      throw new HttpException('辅材不存在', HttpStatus.NOT_FOUND);
    }
    if (materials.is_paid === true) {
      throw new HttpException('辅材已支付过，请刷新', HttpStatus.BAD_REQUEST);
    }

    // 查询支付单
    const materialsPaymentWxpay = await this.findByMaterialsId(
      createMaterialsPaymentSingleDto.materialsId,
    );

    if (materialsPaymentWxpay) {
      // 支付单存在
      // 微信支付下单(获得prepay_id)
      const createWxPayDto = new CreateWxPayDto();
      createWxPayDto.openid = user.openid;
      createWxPayDto.amount = Math.floor(
        Number(materialsPaymentWxpay.amount) * 100,
      );
      createWxPayDto.description = materialsPaymentWxpay.description;
      createWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
      createWxPayDto.notify_url =
        NOTIFY_URL.materials_payment_single_notify_url;
      createWxPayDto.out_trade_no = materialsPaymentWxpay.order_no; //支付单号

      // 检查是否过期

      if (await this.isOrderExpired(materialsPaymentWxpay.id)) {
        // 过期情况
        console.log(
          `材料支付单过期，支付单号: ${materialsPaymentWxpay.order_no}`,
        );

        // 重新创建支付单
        createWxPayDto.out_trade_no = this.wxPayService.generateOrderNo(); // 新订单号
        const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id
        // 创建支付记录
        const oldMaterialsPaymentWxpay = new MaterialsPaymentWxpay();
        oldMaterialsPaymentWxpay.user_id = materialsPaymentWxpay.user_id;
        oldMaterialsPaymentWxpay.amount = materialsPaymentWxpay.amount;
        oldMaterialsPaymentWxpay.order_no = createWxPayDto.out_trade_no;
        oldMaterialsPaymentWxpay.materials_id =
          materialsPaymentWxpay.materials_id;
        oldMaterialsPaymentWxpay.description =
          materialsPaymentWxpay.description;
        oldMaterialsPaymentWxpay.is_array = materialsPaymentWxpay.is_array;
        const newMaterialsPaymentWxpay =
          this.materialsPaymentWxpayRepository.create(oldMaterialsPaymentWxpay);

        await this.materialsPaymentWxpayRepository.insert(
          newMaterialsPaymentWxpay,
        );

        // 返回小程序需要的paySign

        const paySign = this.wxPayService.paySignString(res.data.prepay_id);

        return {
          paySign: paySign,
        };
      } else {
        console.log(
          `材料支付单未过期，支付单号: ${materialsPaymentWxpay.order_no}`,
        );
        // 订单未过期，返回paySign

        createWxPayDto.out_trade_no = materialsPaymentWxpay.order_no; // 订单号

        let res;
        try {
          res = await this.wxPayService.createOrder(createWxPayDto);
        } catch (error) {
          if (error.response.code === 'ORDERPAID') {
            this.handlePaymentSingleCallback(materialsPaymentWxpay.order_no);
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

      const price = Math.floor(Number(materials.settlement_amount) * 100);

      // 微信支付下单(获得prepay_id)
      const createWxPayDto = new CreateWxPayDto();
      createWxPayDto.openid = user.openid;
      createWxPayDto.amount = price;
      createWxPayDto.description = `${materials.commodity_name},${materials.quantity}${materials.commodity_unit}`;
      createWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
      createWxPayDto.notify_url =
        NOTIFY_URL.materials_payment_single_notify_url;
      createWxPayDto.out_trade_no = this.wxPayService.generateOrderNo(); // 生成订单号

      const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id

      // 创建支付记录

      const materialsPaymentWxpay = new MaterialsPaymentWxpay();
      materialsPaymentWxpay.user_id = user.id;
      materialsPaymentWxpay.amount = (price / 100).toString();
      materialsPaymentWxpay.order_no = createWxPayDto.out_trade_no;
      materialsPaymentWxpay.materials_id = materials.id;
      materialsPaymentWxpay.description = createWxPayDto.description;
      materialsPaymentWxpay.is_array = 0;

      const newMaterialsPaymentWxpay =
        this.materialsPaymentWxpayRepository.create(materialsPaymentWxpay);
      await this.materialsPaymentWxpayRepository.insert(
        newMaterialsPaymentWxpay,
      );

      // 创建新的材料支付单
      console.log(`创建新的材料支付单,材料价格单id: ${materials.id}`);

      // 返回小程序需要的paySign
      const paySign = this.wxPayService.paySignString(res.data.prepay_id);
      return {
        paySign: paySign,
      };
    }
  }

  /**
   * 合并材料支付单
   * @param user 用户
   * @param createMaterialsPaymentBatchDto 批量创建材料支付单DTO
   * @returns 批量创建结果
   */

  async createMaterialsPaymentBatch(
    user: WechatUser,
    createMaterialsPaymentBatchDto: CreateMaterialsPaymentBatchDto,
  ) {
    // 查询材料价格单
    const materialsList = await this.materialsRepository.find({
      where: { id: In(createMaterialsPaymentBatchDto.materialsIds) },
    });

    if (
      !materialsList ||
      materialsList.length !==
        createMaterialsPaymentBatchDto.materialsIds.length
    ) {
      throw new HttpException('辅材不存在', HttpStatus.NOT_FOUND);
    }

    for (const materials of materialsList) {
      if (materials.is_paid === true) {
        throw new HttpException('辅材已支付过，请刷新', HttpStatus.BAD_REQUEST);
      }
    }

    // 查询支付单
    const materialsPaymentWxpay = await this.findByMaterialsIds(
      createMaterialsPaymentBatchDto.materialsIds,
    );

    if (materialsPaymentWxpay) {
      // 支付单存在
      // 微信支付下单(获得prepay_id)
      const createWxPayDto = new CreateWxPayDto();
      createWxPayDto.openid = user.openid;
      createWxPayDto.amount = Math.floor(
        Number(materialsPaymentWxpay.amount) * 100,
      );
      createWxPayDto.description = materialsPaymentWxpay.description;
      createWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
      createWxPayDto.notify_url = NOTIFY_URL.materials_payment_batch_notify_url;
      createWxPayDto.out_trade_no = materialsPaymentWxpay.order_no; //支付单号

      // 检查是否过期

      if (await this.isOrderExpired(materialsPaymentWxpay.id)) {
        // 过期情况
        console.log(
          `材料支付单过期，支付单号: ${materialsPaymentWxpay.order_no}`,
        );

        // 重新创建支付单
        createWxPayDto.out_trade_no = this.wxPayService.generateOrderNo(); // 新订单号
        const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id
        // 创建支付记录
        const oldMaterialsPaymentWxpay = new MaterialsPaymentWxpay();
        oldMaterialsPaymentWxpay.user_id = materialsPaymentWxpay.user_id;
        oldMaterialsPaymentWxpay.amount = materialsPaymentWxpay.amount;
        oldMaterialsPaymentWxpay.order_no = createWxPayDto.out_trade_no;
        oldMaterialsPaymentWxpay.materials_id =
          materialsPaymentWxpay.materials_id;
        oldMaterialsPaymentWxpay.description =
          materialsPaymentWxpay.description;
        oldMaterialsPaymentWxpay.is_array = materialsPaymentWxpay.is_array;
        const newMaterialsPaymentWxpay =
          this.materialsPaymentWxpayRepository.create(oldMaterialsPaymentWxpay);

        await this.materialsPaymentWxpayRepository.insert(
          newMaterialsPaymentWxpay,
        );

        // 返回小程序需要的paySign

        const paySign = this.wxPayService.paySignString(res.data.prepay_id);

        return {
          paySign: paySign,
        };
      } else {
        console.log(
          `材料支付单未过期，支付单号: ${materialsPaymentWxpay.order_no}`,
        );
        // 订单未过期，返回paySign

        createWxPayDto.out_trade_no = materialsPaymentWxpay.order_no; // 订单号

        let res;
        try {
          res = await this.wxPayService.createOrder(createWxPayDto);
        } catch (error) {
          if (error.response.code === 'ORDERPAID') {
            this.handlePaymentBatchCallback(materialsPaymentWxpay.order_no);
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

      let totalAmount = 0;
      for (const materials of materialsList) {
        // 转化为分
        totalAmount += Math.floor(Number(materials.settlement_amount) * 100);
      }
      const price = totalAmount;

      // 生成商品描述
      const materialsNames = materialsList
        .slice(0, 3) // 只取前3个材料
        .map((m) => m.commodity_name)
        .join('、');

      // 添加数量信息
      let description = materialsNames;
      if (materialsList.length > 3) {
        description += `等${materialsList.length}种材料`;
      } else if (materialsList.length > 1) {
        description += '等材料';
      } else {
        description = materialsNames; // 单个材料直接显示名称
      }

      // 确保不超过127字符
      if (description.length > 127) {
        description = description.substring(0, 124) + '...';
      }

      // 微信支付下单(获得prepay_id)
      const createWxPayDto = new CreateWxPayDto();
      createWxPayDto.openid = user.openid;
      createWxPayDto.amount = price;
      createWxPayDto.description = description;
      createWxPayDto.url = WX_PAY_CONFIG.jsapi_url;
      createWxPayDto.notify_url = NOTIFY_URL.materials_payment_batch_notify_url;
      createWxPayDto.out_trade_no = this.wxPayService.generateOrderNo(); // 生成订单号

      const res = await this.wxPayService.createOrder(createWxPayDto); // 获得prepay_id

      // 创建支付记录

      const materialsPaymentWxpay = new MaterialsPaymentWxpay();
      materialsPaymentWxpay.user_id = user.id;
      materialsPaymentWxpay.amount = (price / 100).toString();
      materialsPaymentWxpay.order_no = createWxPayDto.out_trade_no;
      materialsPaymentWxpay.materials_ids = JSON.stringify(
        createMaterialsPaymentBatchDto.materialsIds,
      );
      materialsPaymentWxpay.description = createWxPayDto.description;
      materialsPaymentWxpay.is_array = 1;

      const newMaterialsPaymentWxpay =
        this.materialsPaymentWxpayRepository.create(materialsPaymentWxpay);
      await this.materialsPaymentWxpayRepository.insert(
        newMaterialsPaymentWxpay,
      );

      // 创建新的材料支付单
      console.log(
        `创建新的整合材料支付单,材料价格单id: ${JSON.stringify(
          createMaterialsPaymentBatchDto.materialsIds,
        )}`,
      );

      // 返回小程序需要的paySign
      const paySign = this.wxPayService.paySignString(res.data.prepay_id);
      return {
        paySign: paySign,
      };
    }
  }

  /**
   * 处理支付单回调
   * @param order_no 支付单号
   */
  async handlePaymentSingleCallback(order_no: string) {
    console.log(`处理支付回调，材料支付单号: ${order_no}`);

    const materialsPaymentWxpay =
      await this.materialsPaymentWxpayRepository.findOne({
        where: { order_no },
      });

    if (!materialsPaymentWxpay) {
      throw new HttpException('支付单不存在', HttpStatus.NOT_FOUND);
    }
    // 存在，查询材料价格单
    const materials = await this.materialsRepository.findOne({
      where: { id: materialsPaymentWxpay.materials_id },
    });

    // 支付
    this.materialsRepository.update(materials.id, {
      is_paid: true,
    });
    console.log(`支付成功，材料价格单id: ${materials.id}`);

    // 支付单状态修改为已支付
    await this.materialsPaymentWxpayRepository.update(
      materialsPaymentWxpay.id,
      {
        status: 1,
      },
    );

    console.log(
      `支付单状态修改为已支付，支付单id: ${materialsPaymentWxpay.id}`,
    );
    console.log(`支付单处理完成，材料支付单号: ${order_no}`);
  }

  /**
   * 处理支付单回调(整合订单)
   * @param order_no 支付单号
   */
  async handlePaymentBatchCallback(order_no: string) {
    console.log(`处理支付回调，材料支付单号: ${order_no}`);

    const materialsPaymentWxpay =
      await this.materialsPaymentWxpayRepository.findOne({
        where: { order_no },
      });

    if (!materialsPaymentWxpay) {
      throw new HttpException('支付单不存在', HttpStatus.NOT_FOUND);
    }
    // 存在，查询材料价格单

    // 提取材料价格单ID
    // 解析材料ID数组
    let materialsIds: number[] = [];
    try {
      console.log('支付单数据:', materialsPaymentWxpay);
      console.log('materials_ids字段值:', materialsPaymentWxpay.materials_ids);
      console.log(
        'materials_ids字段类型:',
        typeof materialsPaymentWxpay.materials_ids,
      );

      materialsIds = materialsPaymentWxpay.materials_ids as any as number[];
    } catch (error) {
      throw new HttpException('支付单数据格式错误', HttpStatus.BAD_REQUEST);
    }

    // 查询材料价格单
    const materialsList = await this.materialsRepository.find({
      where: { id: In(materialsIds) },
    });

    if (!materialsList || materialsList.length !== materialsIds.length) {
      throw new HttpException('辅材不存在', HttpStatus.NOT_FOUND);
    }

    // 支付
    // 批量更新所有材料的支付状态
    await this.materialsRepository.update(
      { id: In(materialsIds) }, // 使用In操作符批量更新
      { is_paid: true },
    );
    console.log(`支付成功，材料价格单ids: ${JSON.stringify(materialsIds)}`);

    // 支付单状态修改为已支付
    await this.materialsPaymentWxpayRepository.update(
      materialsPaymentWxpay.id,
      {
        status: 1,
      },
    );

    console.log(
      `支付单状态修改为已支付，支付单id: ${materialsPaymentWxpay.id}`,
    );
    console.log(`支付单处理完成，材料支付单号: ${order_no}`);
  }

  /**
   * 检查订单是否过期
   * @param id 支付单ID
   */
  async isOrderExpired(id: number): Promise<boolean> {
    const materialsPayment = await this.materialsPaymentWxpayRepository.findOne(
      {
        where: { id },
      },
    );
    if (materialsPayment) {
      if (materialsPayment.is_expired === 1) {
        return true;
      }
      // 检查时间是否超过5天
      const now = new Date();
      const orderTime = new Date(materialsPayment.createdAt);
      const diff = now.getTime() - orderTime.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days > 5) {
        await this.materialsPaymentWxpayRepository.update(id, {
          is_expired: 1,
        });
        return true;
      }
    }
    return false;
  }

  /**
   * 根据材料价格单ID查找支付单(未过期，未支付),如果存在则返回，否则返回null
   * @param materialsId 材料价格单ID
   * @returns 支付单记录或null
   */
  async findByMaterialsId(
    materialsId: number,
  ): Promise<MaterialsPaymentWxpay | null> {
    return await this.materialsPaymentWxpayRepository.findOne({
      where: { materials_id: materialsId, is_expired: 0, status: 0 },
    });
  }

  async findByMaterialsIds(
    materialsIds: number[],
  ): Promise<MaterialsPaymentWxpay | null> {
    // materialsIds转化为json
    return await this.materialsPaymentWxpayRepository.findOne({
      where: {
        is_array: 1,
        materials_ids: JSON.stringify(materialsIds),
        is_expired: 0,
        status: 0,
      },
    });
  }
}
