import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import axios from 'axios';
import { WECHAT_PHONE_URL, CRAFT_WECHAT_CONFIG } from '../common/constants/app.constants';
import { CraftWechatUser } from './craft-wechat-user.entity';
import { QueryCraftWechatUserDto } from './dto/query-craft-wechat-user.dto';

@Injectable()
export class CraftWechatUserService {
  constructor(
    @InjectRepository(CraftWechatUser)
    private readonly craftWechatUserRepository: Repository<CraftWechatUser>,
  ) {}

  /**
   * 用微信返回的 phone code 换手机号并落库；已存在相同手机号则直接返回该行。
   * is_contact 新建时为 false。
   */
  async savePhoneNumberFromWechat(code: string): Promise<CraftWechatUser> {
    try {
      const accessToken = await this.getAccessToken();

      const { data } = await axios.post(
        WECHAT_PHONE_URL,
        { code },
        { params: { access_token: accessToken } },
      );

      if (data.errcode && data.errcode !== 0) {
        throw new HttpException(
          `获取手机号码失败: ${data.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const phoneNumber = data.phone_info?.phoneNumber;

      if (!phoneNumber) {
        throw new HttpException('获取手机号码失败', HttpStatus.BAD_REQUEST);
      }

      let row = await this.craftWechatUserRepository.findOne({
        where: { phone: phoneNumber },
      });

      if (!row) {
        row = this.craftWechatUserRepository.create({
          phone: phoneNumber,
          is_contact: false,
        });
        row = await this.craftWechatUserRepository.save(row);
      }

      return row;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取手机号码失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setContactTrue(id: number): Promise<CraftWechatUser> {
    const row = await this.craftWechatUserRepository.findOne({
      where: { id },
    });

    if (!row) {
      throw new HttpException('记录不存在', HttpStatus.NOT_FOUND);
    }

    await this.craftWechatUserRepository.update({ id }, { is_contact: true });
    const updated = await this.craftWechatUserRepository.findOne({
      where: { id },
    });

    if (!updated) {
      throw new HttpException(
        '更新失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return updated;
  }

  async getCraftWechatUsersByPage(queryDto: QueryCraftWechatUserDto) {
    try {
      const { pageIndex = 1, pageSize = 10, phone = '' } = queryDto;

      const where: any = {};

      if (phone && phone.trim()) {
        where.phone = Like(`%${phone.trim()}%`);
      }

      const total = await this.craftWechatUserRepository.count({ where });

      const data = await this.craftWechatUserRepository.find({
        where,
        skip: (pageIndex - 1) * pageSize,
        take: pageSize,
        order: { id: 'DESC' },
      });

      return {
        success: true,
        data,
        code: 200,
        message: null,
        pageIndex,
        pageSize,
        total,
        pageTotal: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('分页查询工匠端微信用户错误:', error);
      return {
        success: false,
        data: null,
        code: 500,
        message: '分页查询失败: ' + (error as Error).message,
        pageIndex: 1,
        pageSize: 10,
        total: 0,
        pageTotal: 0,
      };
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const { data } = await axios.get(
        'https://api.weixin.qq.com/cgi-bin/token',
        {
          params: {
            grant_type: 'client_credential',
            appid: CRAFT_WECHAT_CONFIG.appid,
            secret: CRAFT_WECHAT_CONFIG.secret,
          },
        },
      );

      if (data.errcode) {
        throw new HttpException(
          `获取access_token失败: ${data.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return data.access_token;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取access_token失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
