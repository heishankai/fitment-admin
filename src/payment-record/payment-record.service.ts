import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import * as ExcelJS from 'exceljs';
import {
  PaymentRecord,
  PaymentRecordType,
  PaymentRecordTypeText,
} from './payment-record.entity';
import { QueryPaymentRecordDto } from './dto/query-payment-record.dto';
import { Order } from '../order/order.entity';
import { Materials } from '../materials/materials.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';

interface WxPaymentMeta {
  out_trade_no?: string;
  transaction_id?: string;
  amount?: number;
  business_amount?: number;
  attach?: any;
}

@Injectable()
export class PaymentRecordService {
  constructor(
    @InjectRepository(PaymentRecord)
    private readonly paymentRecordRepository: Repository<PaymentRecord>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Materials)
    private readonly materialsRepository: Repository<Materials>,
    @InjectRepository(WorkPriceItem)
    private readonly workPriceItemRepository: Repository<WorkPriceItem>,
  ) {}

  private toMoney(value: number | string | null | undefined): number {
    return new Decimal(value || 0).toDecimalPlaces(2).toNumber();
  }

  private getPageParams(query: QueryPaymentRecordDto = {}): {
    pageIndex: number;
    pageSize: number;
  } {
    return {
      pageIndex: Math.max(Number(query.pageIndex) || 1, 1),
      pageSize: Math.max(Number(query.pageSize) || 20, 1),
    };
  }

  private parseDateBoundary(
    value: string,
    fieldName: string,
    endOfDay = false,
  ): Date {
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!matched) {
      throw new HttpException(
        `${fieldName} 格式必须为 YYYY-MM-DD`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > maxDay) {
      throw new HttpException(
        `${fieldName} 不是有效日期`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
    return new Date(`${value}T${time}+08:00`);
  }

  private applyPageFilters(qb: any, query: QueryPaymentRecordDto = {}): void {
    const orderNo = query.order_no?.trim();
    if (orderNo) {
      qb.andWhere(
        '(record.order_no LIKE :orderNo OR order.order_no LIKE :orderNo)',
        { orderNo: `%${orderNo}%` },
      );
    }

    const paymentType = query.payment_type?.trim();
    if (paymentType) {
      if (
        !Object.values(PaymentRecordType).includes(
          paymentType as PaymentRecordType,
        )
      ) {
        throw new HttpException('付款类型不存在', HttpStatus.BAD_REQUEST);
      }
      qb.andWhere('record.payment_type = :paymentType', { paymentType });
    }

    const startDate = query.start_date
      ? this.parseDateBoundary(query.start_date, 'start_date')
      : null;
    const endDate = query.end_date
      ? this.parseDateBoundary(query.end_date, 'end_date', true)
      : null;

    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      throw new HttpException(
        'start_date 不能晚于 end_date',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (startDate) {
      qb.andWhere('record.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('record.createdAt <= :endDate', { endDate });
    }
  }

  private async paginateQuery(
    qb: any,
    query: QueryPaymentRecordDto = {},
  ): Promise<any> {
    const { pageIndex, pageSize } = this.getPageParams(query);
    qb.orderBy('record.createdAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((pageIndex - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      data,
      pageIndex,
      pageSize,
      total,
      pageTotal: Math.ceil(total / pageSize),
    };
  }

  private formatDateTime(value: Date | string | null | undefined): string {
    if (!value) return '';
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }

  private formatMoneyText(value: number | string | null | undefined): string {
    return `¥${this.toMoney(value).toFixed(2)}`;
  }

  private formatPaymentItemsText(record: PaymentRecord): string {
    if (Array.isArray(record.materials_snapshot) && record.materials_snapshot.length) {
      return record.materials_snapshot
        .map((item) => {
          const quantity = Number(item?.quantity) || 0;
          const unit = item?.commodity_unit || '';
          const amount = this.formatMoneyText(item?.settlement_amount);
          return `${item?.commodity_name || '辅材'} x${quantity}${unit} ${amount}`;
        })
        .join('\n');
    }

    if (
      Array.isArray(record.work_price_items_snapshot) &&
      record.work_price_items_snapshot.length
    ) {
      return record.work_price_items_snapshot
        .map((item) => {
          const quantity = Number(item?.quantity) || 0;
          const unit = item?.labour_cost_name || '';
          const amount = this.formatMoneyText(item?.settlement_amount);
          return `${item?.work_title || '工价'} x${quantity}${unit} ${amount}`;
        })
        .join('\n');
    }

    return record.description || '';
  }

  private formatMaterial(material: Materials): any {
    return {
      id: material.id,
      commodity_id: material.commodity_id,
      commodity_name: material.commodity_name,
      commodity_price: Number(material.commodity_price),
      commodity_unit: material.commodity_unit,
      quantity: material.quantity,
      commodity_cover: material.commodity_cover || [],
      settlement_amount: Number(material.settlement_amount),
      work_kind_name: material.work_kind_name || null,
      work_kind_code: material.work_kind_code || null,
    };
  }

  private formatWorkPriceItem(item: WorkPriceItem): any {
    return {
      id: item.id,
      work_price_id: item.work_price_id,
      work_price: Number(item.work_price),
      work_title: item.work_title,
      quantity: Number(item.quantity),
      work_kind_name: item.work_kind_name,
      work_kind_code: item.work_kind_code,
      labour_cost_name: item.labour_cost_name,
      settlement_amount: Number(item.settlement_amount),
    };
  }

  private async createRecord(params: {
    order: Order;
    payment_type: PaymentRecordType;
    payment_amount: number;
    description?: string;
    meta?: WxPaymentMeta;
    material_ids?: number[];
    materials_snapshot?: any[];
    work_price_item_ids?: number[];
    work_price_items_snapshot?: any[];
  }): Promise<PaymentRecord | null> {
    const { order, payment_type, meta } = params;
    if (!order.wechat_user_id) {
      return null;
    }

    if (meta?.out_trade_no) {
      const existed = await this.paymentRecordRepository.findOne({
        where: {
          out_trade_no: meta.out_trade_no,
          payment_type,
        },
      });
      if (existed) {
        return existed;
      }
    }

    const record = this.paymentRecordRepository.create({
      orderId: order.id,
      order_no: order.order_no || null,
      wechat_user_id: order.wechat_user_id,
      payment_type,
      payment_type_text: PaymentRecordTypeText[payment_type],
      payment_amount: this.toMoney(params.payment_amount),
      wx_payment_amount:
        meta?.amount != null ? this.toMoney(meta.amount) : null,
      payment_channel: 'wechat',
      out_trade_no: meta?.out_trade_no || null,
      transaction_id: meta?.transaction_id || null,
      description: params.description || PaymentRecordTypeText[payment_type],
      material_ids: params.material_ids || null,
      materials_snapshot: params.materials_snapshot || null,
      work_price_item_ids: params.work_price_item_ids || null,
      work_price_items_snapshot: params.work_price_items_snapshot || null,
      raw_attach: meta?.attach || null,
    });

    return await this.paymentRecordRepository.save(record);
  }

  async recordMaterialsPayment(
    materialIds: number[],
    meta?: WxPaymentMeta,
  ): Promise<PaymentRecord | null> {
    if (!materialIds?.length) {
      return null;
    }

    const materials = await this.materialsRepository.find({
      where: { id: In(materialIds) },
      relations: ['order'],
      order: { createdAt: 'ASC' },
    });
    if (!materials.length) {
      return null;
    }

    const orderIds = [...new Set(materials.map((item) => item.orderId))];
    if (orderIds.length !== 1) {
      throw new HttpException(
        '一笔付款记录的辅材必须属于同一订单',
        HttpStatus.BAD_REQUEST,
      );
    }

    const order = materials[0].order;
    const amount = materials
      .reduce(
        (sum, material) => sum.plus(material.settlement_amount),
        new Decimal(0),
      )
      .toDecimalPlaces(2)
      .toNumber();
    const snapshot = materials.map((material) => this.formatMaterial(material));

    return this.createRecord({
      order,
      payment_type: PaymentRecordType.MATERIALS,
      payment_amount: amount,
      description: `辅材付款-${materials.length}项`,
      meta,
      material_ids: materials.map((material) => material.id),
      materials_snapshot: snapshot,
    });
  }

  async recordOrderFeePayment(
    orderId: number,
    paymentType: PaymentRecordType.PLATFORM_SERVICE_FEE | PaymentRecordType.GANGMASTER_COST,
    meta?: WxPaymentMeta,
  ): Promise<PaymentRecord | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
    }

    const amount =
      meta?.business_amount != null
        ? Number(meta.business_amount) || 0
        : paymentType === PaymentRecordType.GANGMASTER_COST
          ? Number(order.gangmaster_cost) || 0
          : Number(order.total_service_fee) || 0;

    return this.createRecord({
      order,
      payment_type: paymentType,
      payment_amount: amount,
      description: `${order.order_no || order.id}-${PaymentRecordTypeText[paymentType]}`,
      meta,
    });
  }

  async recordWorkPricePayment(
    workPriceItemIds: number[],
    paymentType: PaymentRecordType.WORK_PRICE | PaymentRecordType.PLATFORM_SERVICE_FEE,
    meta?: WxPaymentMeta,
  ): Promise<PaymentRecord | null> {
    if (!workPriceItemIds?.length) {
      return null;
    }
    const items = await this.workPriceItemRepository.find({
      where: { id: In(workPriceItemIds) },
      relations: ['order'],
      order: { createdAt: 'ASC' },
    });
    if (!items.length) {
      return null;
    }
    const orderIds = [...new Set(items.map((item) => item.order_id))];
    if (orderIds.length !== 1) {
      throw new HttpException(
        '一笔付款记录的工价必须属于同一订单',
        HttpStatus.BAD_REQUEST,
      );
    }

    const amount = items
      .reduce((sum, item) => {
        const value =
          paymentType === PaymentRecordType.PLATFORM_SERVICE_FEE
            ? Number(item.total_service_fee) || item.calculateServiceFee()
            : Number(item.settlement_amount) || item.calculateSettlementAmount();
        return sum.plus(value || 0);
      }, new Decimal(0))
      .toDecimalPlaces(2)
      .toNumber();

    return this.createRecord({
      order: items[0].order,
      payment_type: paymentType,
      payment_amount: amount,
      description: `${PaymentRecordTypeText[paymentType]}-${items.length}项`,
      meta,
      work_price_item_ids: items.map((item) => item.id),
      work_price_items_snapshot: items.map((item) =>
        this.formatWorkPriceItem(item),
      ),
    });
  }

  async findAllByPage(query: QueryPaymentRecordDto = {}): Promise<any> {
    const qb = this.paymentRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.order', 'order')
      .leftJoinAndSelect('record.wechat_user', 'wechat_user');

    this.applyPageFilters(qb, query);
    return await this.paginateQuery(qb, query);
  }

  async exportPaymentRecordsToExcel(
    query: QueryPaymentRecordDto = {},
  ): Promise<ExcelJS.Buffer> {
    const qb = this.paymentRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.order', 'order')
      .leftJoinAndSelect('record.wechat_user', 'wechat_user');

    this.applyPageFilters(qb, query);
    qb.orderBy('record.createdAt', 'DESC');
    const records = await qb.getMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('业主付款明细');
    worksheet.columns = [
      { header: '付款类型', key: 'payment_type_text', width: 16 },
      { header: '业务金额', key: 'payment_amount', width: 15 },
      { header: '微信实付', key: 'wx_payment_amount', width: 15 },
      { header: '订单编号', key: 'order_no', width: 26 },
      { header: '业主昵称', key: 'wechat_nickname', width: 18 },
      { header: '业主手机号', key: 'wechat_phone', width: 18 },
      { header: '付款内容', key: 'payment_content', width: 42 },
      { header: '商户订单号', key: 'out_trade_no', width: 28 },
      { header: '微信交易号', key: 'transaction_id', width: 32 },
      { header: '付款时间', key: 'createdAt', width: 22 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    records.forEach((record) => {
      const row = worksheet.addRow({
        payment_type_text:
          record.payment_type_text ||
          PaymentRecordTypeText[record.payment_type] ||
          record.payment_type,
        payment_amount: this.formatMoneyText(record.payment_amount),
        wx_payment_amount:
          record.wx_payment_amount == null
            ? ''
            : this.formatMoneyText(record.wx_payment_amount),
        order_no: record.order_no || record.order?.order_no || '',
        wechat_nickname: record.wechat_user?.nickname || '',
        wechat_phone: record.wechat_user?.phone || '',
        payment_content: this.formatPaymentItemsText(record),
        out_trade_no: record.out_trade_no || '',
        transaction_id: record.transaction_id || '',
        createdAt: this.formatDateTime(record.createdAt),
      });
      row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
  }

  async exportMaterialPaymentDetailsToExcel(
    query: QueryPaymentRecordDto = {},
  ): Promise<ExcelJS.Buffer> {
    const qb = this.paymentRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.order', 'order')
      .leftJoinAndSelect('record.wechat_user', 'wechat_user');

    this.applyPageFilters(qb, {
      ...query,
      payment_type: PaymentRecordType.MATERIALS,
    });
    qb.orderBy('record.createdAt', 'DESC');
    const records = await qb.getMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('辅材付款明细');
    worksheet.columns = [
      { header: '订单编号', key: 'order_no', width: 26 },
      { header: '辅材名称', key: 'material_name', width: 30 },
      { header: '数量', key: 'quantity', width: 12 },
      { header: '单位', key: 'unit', width: 12 },
      { header: '付款金额', key: 'payment_amount', width: 15 },
      { header: '付款时间', key: 'payment_time', width: 22 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    for (const record of records) {
      const materials = Array.isArray(record.materials_snapshot)
        ? record.materials_snapshot
        : [];

      for (const material of materials) {
        const name = material?.commodity_name || '';
        const row = worksheet.addRow({
          order_no: record.order_no || record.order?.order_no || '',
          material_name: name,
          quantity: Number(material?.quantity) || 0,
          unit: material?.commodity_unit || '',
          payment_amount: this.formatMoneyText(
            material?.settlement_amount ?? record.payment_amount,
          ),
          payment_time: this.formatDateTime(record.createdAt),
        });
        row.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
  }

  async findMyRecords(
    wechatUserId: number,
    query: QueryPaymentRecordDto = {},
  ): Promise<any> {
    const qb = this.paymentRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.order', 'order')
      .leftJoinAndSelect('record.wechat_user', 'wechat_user')
      .where('record.wechat_user_id = :wechatUserId', { wechatUserId });

    this.applyPageFilters(qb, query);
    return await this.paginateQuery(qb, query);
  }

  async findByOrderId(orderId: number, wechatUserId?: number): Promise<PaymentRecord[]> {
    const where: any = { orderId };
    if (wechatUserId) {
      where.wechat_user_id = wechatUserId;
    }
    return await this.paymentRecordRepository.find({
      where,
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }
}
