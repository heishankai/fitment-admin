import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { LessThanOrEqual, Repository } from 'typeorm';
import { SmsNotifyConfig } from 'src/sms-notify-config/sms-notify-config.entity';
import { UpdateSmsNotifyConfigDto } from 'src/sms-notify-config/dto/update-sms-notify-config.dto';
import { SmsService } from 'src/sms/sms.service';
import { Order, OrderStatus } from 'src/order/order.entity';
import {
  SMS_CS_NOTIFY_TEMPLATES,
} from 'src/common/constants/app.constants';

const SINGLETON_ID = 1;
const ORDER_TIMEOUT_MS = 10 * 60 * 1000;
const SCAN_INTERVAL_MS = 60 * 1000;
const WECOM_WEBHOOK_TIMEOUT_MS = 5000;

@Injectable()
export class SmsNotifyConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsNotifyConfigService.name);
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private scanning = false;

  constructor(
    @InjectRepository(SmsNotifyConfig)
    private readonly configRepository: Repository<SmsNotifyConfig>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly smsService: SmsService,
  ) {}

  onModuleInit(): void {
    this.scanTimer = setInterval(() => {
      this.scanPendingOrdersForTimeoutNotify().catch((e) =>
        this.logger.error('扫描超时未接单订单失败', e),
      );
    }, SCAN_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  async getConfig(): Promise<{ id: number; phones: Array<{ phone: string }> }> {
    const row = await this.configRepository.findOne({
      where: { id: SINGLETON_ID },
    });
    if (!row) {
      return { id: SINGLETON_ID, phones: [] };
    }
    return { id: row.id, phones: row.phones ?? [] };
  }

  async savePhones(dto: UpdateSmsNotifyConfigDto): Promise<void> {
    const seen = new Set<string>();
    const phones = dto.phones
      .map((p) => p.phone.trim())
      .filter((p) => {
        if (seen.has(p)) return false;
        seen.add(p);
        return true;
      })
      .map((phone) => ({ phone }));

    let entity = await this.configRepository.findOne({
      where: { id: SINGLETON_ID },
    });
    if (!entity) {
      entity = this.configRepository.create({
        id: SINGLETON_ID,
        phones,
      });
    } else {
      entity.phones = phones;
    }
    await this.configRepository.save(entity);
  }

  private async getNotifyPhones(): Promise<string[]> {
    const { phones } = await this.getConfig();
    return phones.map((p) => p.phone).filter(Boolean);
  }

  /**
   * 若阿里云模板含变量，请在此按模板变量名补充（当前默认无变量 {}）
   */
  private orderTemplateParams(orderNo: string, workKindName?: string | null) {
    return {
      order_no: orderNo || '',
      work_kind_name: workKindName || '',
    };
  }

  private async sendToAllConfigured(
    templateCode: string,
    templateParam: Record<string, string>,
  ): Promise<void> {
    const targets = await this.getNotifyPhones();
    if (targets.length === 0) {
      this.logger.debug('未配置客服通知号码，跳过短信');
      return;
    }
    for (const phone of targets) {
      const result = await this.smsService.sendTemplateSms(
        phone,
        templateCode,
        templateParam,
      );
      if (!result.success) {
        this.logger.warn(`客服短信失败 ${phone}: ${result.message}`);
      }
    }
  }

  private getWecomWebhookUrls(): string[] {
    const raw =
      process.env.WECOM_GROUP_BOT_WEBHOOK_URLS ||
      process.env.WECOM_GROUP_BOT_WEBHOOK_URL ||
      '';

    return raw
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
  }

  private async sendWecomGroupText(content: string): Promise<void> {
    const webhookUrls = this.getWecomWebhookUrls();
    if (webhookUrls.length === 0) {
      this.logger.debug('未配置企业微信群机器人 Webhook，跳过群提醒');
      return;
    }

    for (const webhookUrl of webhookUrls) {
      try {
        const { data } = await axios.post(
          webhookUrl,
          {
            msgtype: 'text',
            text: { content },
          },
          { timeout: WECOM_WEBHOOK_TIMEOUT_MS },
        );

        if (data?.errcode && data.errcode !== 0) {
          this.logger.warn(
            `企业微信群提醒失败: ${data.errmsg || data.errcode}`,
          );
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`企业微信群提醒异常: ${message}`);
      }
    }
  }

  private buildOrderWecomContent(
    title: string,
    orderNo: string,
    userPhone?: string | null,
    workKindName?: string | null,
  ): string {
    const lines = [title, `订单号：${orderNo || '-'}`];
    if (userPhone) {
      lines.push(`手机号：${userPhone}`);
    }
    if (workKindName) {
      lines.push(`工种：${workKindName}`);
    }
    return lines.join('\n');
  }

  /** 用户发出订单后通知客服 */
  notifyOrderPlaced(
    orderNo: string,
    workKindName?: string | null,
    userPhone?: string | null,
  ): void {
    this.sendToAllConfigured(
      SMS_CS_NOTIFY_TEMPLATES.ORDER_PLACED,
      this.orderTemplateParams(orderNo, workKindName),
    ).catch((e) => this.logger.error('发送下单客服短信失败', e));
    this.sendWecomGroupText(
      this.buildOrderWecomContent(
        '有用户发出订单，请关注。',
        orderNo,
        userPhone,
        workKindName,
      ),
    ).catch((e) => this.logger.error('发送下单企业微信群提醒失败', e));
  }

  /** 超过 10 分钟无人接单（内部可 await，保证发完再落库） */
  private async notifyOrderTimeoutNoAcceptAwait(
    orderNo: string,
    workKindName?: string | null,
    userPhone?: string | null,
  ): Promise<void> {
    await this.sendToAllConfigured(
      SMS_CS_NOTIFY_TEMPLATES.ORDER_TIMEOUT_NO_ACCEPT,
      this.orderTemplateParams(orderNo, workKindName),
    );
    await this.sendWecomGroupText(
      this.buildOrderWecomContent(
        '用户发出订单超时，请关注。',
        orderNo,
        userPhone,
        workKindName,
      ),
    );
  }

  /** 小程序新用户注册（首次建档） */
  notifyWechatUserRegistered(nickname: string): void {
    this.sendToAllConfigured(SMS_CS_NOTIFY_TEMPLATES.WECHAT_USER_REGISTERED, {
      nickname: nickname || '新用户',
    }).catch((e) => this.logger.error('发送新用户注册客服短信失败', e));
    this.sendWecomGroupText(
      ['小程序有新用户注册，请关注。', `昵称：${nickname || '新用户'}`].join(
        '\n',
      ),
    ).catch((e) => this.logger.error('发送新用户注册企业微信群提醒失败', e));
  }

  private async scanPendingOrdersForTimeoutNotify(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const deadline = new Date(Date.now() - ORDER_TIMEOUT_MS);
      const orders = await this.orderRepository.find({
        where: {
          order_status: OrderStatus.PENDING,
          cs_timeout_sms_sent: false,
          createdAt: LessThanOrEqual(deadline),
        },
        relations: ['wechat_user'],
        take: 100,
        order: { createdAt: 'ASC' },
      });

      for (const order of orders) {
        if (!order.order_no) continue;

        const live = await this.orderRepository.findOne({
          where: { id: order.id },
        });
        if (
          !live ||
          live.order_status !== OrderStatus.PENDING ||
          live.cs_timeout_sms_sent
        ) {
          continue;
        }

        try {
          await this.notifyOrderTimeoutNoAcceptAwait(
            order.order_no,
            order.work_kind_name,
            order.wechat_user?.phone,
          );
        } catch (e) {
          this.logger.error(
            `超时客服短信异常 订单 ${order.order_no}`,
            e as Error,
          );
        }

        await this.orderRepository.update(
          { id: order.id, cs_timeout_sms_sent: false },
          { cs_timeout_sms_sent: true },
        );
      }
    } finally {
      this.scanning = false;
    }
  }
}
