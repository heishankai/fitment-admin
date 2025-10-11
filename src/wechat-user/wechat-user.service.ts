import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
// constants
import {
  WECHAT_LOGIN_URL,
  WECHAT_CONFIG,
  JWT_CONFIG,
} from '../common/constants/app.constants';
// entity
import { WechatUser } from './wechat-user.entity';

@Injectable()
export class WechatUserService {
  constructor(
    @InjectRepository(WechatUser)
    private readonly wechatUserRepository: Repository<WechatUser>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 微信用户登录
   * @param code 微信小程序登录code
   * @returns 用户信息和token
   */
  async wechatLogin(code: string): Promise<WechatUser> {
    try {
      // 1. 调用微信API获取openid
      const { data } = await axios.get(WECHAT_LOGIN_URL, {
        params: {
          appid: WECHAT_CONFIG.appid,
          secret: WECHAT_CONFIG.secret,
          js_code: code,
          grant_type: 'authorization_code',
        },
      });

      // 2. 检查微信API返回结果
      if (data.errcode) {
        throw new HttpException(
          `微信登录失败: ${data.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const { openid } = data ?? {};

      // 3. 查找用户，如果没有就创建
      let user: any = await this.wechatUserRepository.findOne({
        where: { openid },
      });

      if (!user) {
        // 创建新用户，直接设置默认昵称和头像
        user = this.wechatUserRepository.create({
          openid,
          nickname: '叮当智装用户',
          avatar: 'https://via.placeholder.com/100x100/007bff/ffffff?text=用户',
        });
        user = await this.wechatUserRepository.save(user);
      }

      // 4. 生成JWT token
      const payload = {
        userId: user.id,
        openid: user.openid,
        type: 'wechat',
      };

      const token = this.jwtService.sign(payload, {
        secret: JWT_CONFIG.secret,
        expiresIn: JWT_CONFIG.expiresIn,
      });

      user.token = token;

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '登录失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
