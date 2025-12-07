import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
// constants
import {
  WECHAT_LOGIN_URL,
  WECHAT_PHONE_URL,
  WECHAT_CONFIG,
  JWT_CONFIG,
} from '../common/constants/app.constants';
// entity
import { WechatUser } from './wechat-user.entity';
import { UpdateWechatUserDto } from './dto/update-wechat-user.dto';

@Injectable()
export class WechatUserService {
  constructor(
    @InjectRepository(WechatUser)
    private readonly wechatUserRepository: Repository<WechatUser>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 微信用户登录（仅获取openid）
   * @param code 微信小程序登录code
   * @returns openid
   */
  async wechatLogin(code: string): Promise<{ openid: string }> {
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

      const { openid, errcode } = data ?? {};

      // 2. 检查微信API返回结果
      if (errcode) {
        throw new HttpException(
          `微信登录失败: ${data.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!openid) {
        throw new HttpException('获取openid失败', HttpStatus.BAD_REQUEST);
      }

      return { openid };
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

  /**
   * 获取微信用户手机号码并创建/更新用户信息
   * @param code 微信小程序获取手机号码的code
   * @param openid 用户openid
   * @returns 完整的用户信息（包含token）
   */
  async getPhoneNumberAndUpdateUser(
    code: string,
    openid: string,
  ): Promise<WechatUser> {
    try {
      // 1. 先获取access_token
      const accessToken = await this.getAccessToken();

      // 2. 调用微信API获取手机号码
      const { data } = await axios.post(
        WECHAT_PHONE_URL,
        {
          code: code,
        },
        {
          params: {
            access_token: accessToken,
          },
        },
      );

      // 3. 检查微信API返回结果
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

      // 4. 查找或创建用户，并更新手机号码
      let user = await this.wechatUserRepository.findOne({
        where: { openid },
      });

      if (!user) {
        // 如果用户不存在，创建新用户
        user = this.wechatUserRepository.create({
          openid,
          phone: phoneNumber,
          nickname: '叮当优+用户',
          avatar:
            'https://din-dang-zhi-zhuang.oss-cn-hangzhou.aliyuncs.com/uploads/1763214991038_s366qe_logo.png',
        });
        user = await this.wechatUserRepository.save(user);
      } else {
        // 如果用户存在，更新手机号码
        await this.wechatUserRepository.update(
          { openid },
          { phone: phoneNumber },
        );
        // 重新查询用户信息
        user = await this.wechatUserRepository.findOne({
          where: { openid },
        });
      }

      // 5. 确保用户存在
      if (!user) {
        throw new HttpException(
          '用户信息获取失败',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 6. 生成JWT token
      const payload = {
        userId: user.id,
        openid: user.openid,
        type: 'wechat',
      };

      const token = this.jwtService.sign(payload, {
        secret: JWT_CONFIG.secret,
        expiresIn: JWT_CONFIG.expiresIn,
      });

      // 7. 返回用户信息（包含token）
      return {
        ...user,
        token,
      } as WechatUser & { token: string };
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

  /**
   * 根据ID更新微信用户信息
   * @param id 用户ID
   * @param updateData 更新数据
   * @returns 更新后的用户信息
   */
  async updateWechatUser(
    id: number,
    updateData: UpdateWechatUserDto,
  ): Promise<WechatUser & { token: string }> {
    try {
      // 1. 检查用户是否存在
      const existingUser = await this.wechatUserRepository.findOne({
        where: { id },
      });

      if (!existingUser) {
        throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 过滤掉undefined的字段，只更新有值的字段
      const updateFields: Partial<WechatUser> = {};

      if (updateData.openid !== undefined) {
        updateFields.openid = updateData.openid;
      }
      if (updateData.phone !== undefined) {
        updateFields.phone = updateData.phone;
      }
      if (updateData.nickname !== undefined) {
        updateFields.nickname = updateData.nickname;
      }
      if (updateData.avatar !== undefined) {
        updateFields.avatar = updateData.avatar;
      }
      if (updateData.city !== undefined) {
        updateFields.city = updateData.city;
      }

      // 3. 执行更新
      await this.wechatUserRepository.update(id, updateFields);

      // 4. 返回更新后的用户信息
      const updatedUser = await this.wechatUserRepository.findOne({
        where: { id },
      });

      if (!updatedUser) {
        throw new HttpException(
          '用户信息获取失败',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 5. 生成新的JWT token
      const payload = {
        userId: updatedUser.id,
        openid: updatedUser.openid,
        type: 'wechat',
      };

      const token = this.jwtService.sign(payload, {
        secret: JWT_CONFIG.secret,
        expiresIn: JWT_CONFIG.expiresIn,
      });

      // 6. 返回用户信息（包含token）
      return {
        ...updatedUser,
        token,
      } as WechatUser & { token: string };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '更新用户信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取微信access_token
   * @returns access_token
   */
  private async getAccessToken(): Promise<string> {
    try {
      const { data } = await axios.get(
        'https://api.weixin.qq.com/cgi-bin/token',
        {
          params: {
            grant_type: 'client_credential',
            appid: WECHAT_CONFIG.appid,
            secret: WECHAT_CONFIG.secret,
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
