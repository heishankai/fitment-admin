import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
// constants
import {
  CRAFT_WECHAT_CONFIG,
  JWT_CONFIG,
  WECHAT_LOGIN_URL,
  WECHAT_PHONE_URL,
} from '../common/constants/app.constants';
// entity
import { CraftsmanUser } from './craftsman-user.entity';
import { IsSkillVerified } from '../is-skill-verified/is-skill-verified.entity';
import { Order, OrderStatus } from '../order/order.entity';
import { WorkKind } from '../work-kind/work-kind.entity';
import { LoginDto } from './dto/login.dto';
import { UpdateCraftsmanUserDto } from './dto/update-craftsman-user.dto';
import { QueryCraftsmanUserDto } from './dto/query-craftsman-user.dto';
import { GetPhoneDto } from './dto/get-phone.dto';

@Injectable()
export class CraftsmanUserService {
  private readonly defaultNickname = '智惠装师傅';
  private readonly defaultAvatar =
    'https://din-dang-zhi-zhuang.oss-cn-hangzhou.aliyuncs.com/uploads/1780231126950_qyilqt_XXJCYNCHV6BF35a2091a33e4132c7c92a6ae41053a4c.png';

  constructor(
    @InjectRepository(CraftsmanUser)
    private readonly craftsmanUserRepository: Repository<CraftsmanUser>,
    @InjectRepository(IsSkillVerified)
    private readonly isSkillVerifiedRepository: Repository<IsSkillVerified>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(WorkKind)
    private readonly workKindRepository: Repository<WorkKind>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 工匠端微信登录/注册
   * @param loginDto 登录信息（wx.login 返回的 code）
   * @returns 用户信息（包含token）
   */
  async loginOrRegister(loginDto: LoginDto): Promise<{
    phone: string;
    openid: string;
    nickname: string;
    avatar: string;
    token: string;
  }> {
    try {
      const { openid } = await this.getCraftWechatOpenid(loginDto.code);

      // 先按 openid 找已迁移到微信登录的工匠账号。
      let user = await this.craftsmanUserRepository.findOne({
        where: { openid },
      });

      if (!user) {
        user = this.craftsmanUserRepository.create({
          openid,
          phone: this.buildWechatPlaceholderPhone(openid),
          nickname: this.defaultNickname,
          avatar: this.defaultAvatar,
        });
        user = await this.craftsmanUserRepository.save(user);
      }

      const payload = {
        userId: user.id,
        openid: user.openid,
        phone: user.phone,
        type: 'craftsman',
      };

      const token = this.jwtService.sign(payload, {
        secret: JWT_CONFIG.secret,
        expiresIn: JWT_CONFIG.expiresIn,
      });

      return {
        phone: user.phone,
        openid: user.openid,
        nickname: user.nickname || this.defaultNickname,
        avatar: user.avatar || this.defaultAvatar,
        token,
      };
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
   * 用微信手机号授权 code 绑定当前工匠账号手机号。
   * 如果手机号对应旧短信账号，则把 openid 绑定到旧账号，完成平滑迁移。
   */
  async getPhoneNumberAndUpdateUser(phoneDto: GetPhoneDto): Promise<
    CraftsmanUser & {
      token: string;
    }
  > {
    try {
      const phone = await this.getPhoneNumberFromWechat(phoneDto.code);

      const openidUser = await this.craftsmanUserRepository.findOne({
        where: { openid: phoneDto.openid },
      });
      let phoneUser = await this.craftsmanUserRepository.findOne({
        where: { phone },
      });

      if (phoneUser && openidUser && phoneUser.id !== openidUser.id) {
        // 释放临时微信账号上的 openid，再迁移到原手机号账号。
        await this.craftsmanUserRepository.update(openidUser.id, {
          openid: null,
        });
      }

      if (phoneUser) {
        phoneUser.openid = phoneDto.openid;
        phoneUser = await this.craftsmanUserRepository.save(phoneUser);
        return this.withCraftsmanToken(phoneUser);
      }

      if (openidUser) {
        openidUser.phone = phone;
        const updatedUser = await this.craftsmanUserRepository.save(openidUser);
        return this.withCraftsmanToken(updatedUser);
      }

      const newUser = this.craftsmanUserRepository.create({
        openid: phoneDto.openid,
        phone,
        nickname: this.defaultNickname,
        avatar: this.defaultAvatar,
      });

      return this.withCraftsmanToken(
        await this.craftsmanUserRepository.save(newUser),
      );
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

  private async getCraftWechatOpenid(code: string): Promise<{ openid: string }> {
    const { data } = await axios.get(WECHAT_LOGIN_URL, {
      params: {
        appid: CRAFT_WECHAT_CONFIG.appid,
        secret: CRAFT_WECHAT_CONFIG.secret,
        js_code: code,
        grant_type: 'authorization_code',
      },
    });

    if (data?.errcode) {
      throw new HttpException(
        `微信登录失败: ${data.errmsg || '未知错误'}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!data?.openid) {
      throw new HttpException('获取openid失败', HttpStatus.BAD_REQUEST);
    }

    return { openid: data.openid };
  }

  private buildWechatPlaceholderPhone(openid: string): string {
    return `wx_${openid}`;
  }

  private async getPhoneNumberFromWechat(code: string): Promise<string> {
    const accessToken = await this.getCraftWechatAccessToken();
    const { data } = await axios.post(
      WECHAT_PHONE_URL,
      { code },
      { params: { access_token: accessToken } },
    );

    if (data?.errcode && data.errcode !== 0) {
      throw new HttpException(
        `获取手机号码失败: ${data.errmsg || '未知错误'}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const phone = data?.phone_info?.phoneNumber;
    if (!phone) {
      throw new HttpException('获取手机号码失败', HttpStatus.BAD_REQUEST);
    }

    return phone;
  }

  private async getCraftWechatAccessToken(): Promise<string> {
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

    if (data?.errcode) {
      throw new HttpException(
        `获取access_token失败: ${data.errmsg || '未知错误'}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!data?.access_token) {
      throw new HttpException('获取access_token失败', HttpStatus.BAD_REQUEST);
    }

    return data.access_token;
  }

  private withCraftsmanToken<T extends CraftsmanUser>(
    user: T,
  ): T & { token: string } {
    const token = this.jwtService.sign(
      {
        userId: user.id,
        openid: user.openid,
        phone: user.phone,
        type: 'craftsman',
      },
      {
        secret: JWT_CONFIG.secret,
        expiresIn: JWT_CONFIG.expiresIn,
      },
    );

    return {
      ...user,
      token,
    };
  }

  /**
   * 根据token获取用户信息
   * @param userId 用户ID（从token中解析）
   * @returns 用户信息
   */
  async getUserInfo(userId: number): Promise<{
    phone: string;
    nickname: string;
    avatar: string;
    isVerified: boolean;
    isSkillVerified: boolean;
    skillInfo: IsSkillVerified | null;
    latitude: number | null;
    longitude: number | null;
    province: string | null;
    city: string | null;
    district: string | null;
    score: number | null;
    completedOrdersCount: number;
  }> {
    try {
      const user = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
      }

      // 获取技能信息
      const skillInfo = await this.isSkillVerifiedRepository.findOne({
        where: { userId },
      });

      // 获取已完成订单数量
      const completedOrdersCount = await this.orderRepository.count({
        where: {
          craftsman_user_id: userId,
          order_status: OrderStatus.COMPLETED,
        },
      });

      return {
        phone: user.phone,
        nickname: user.nickname || '智惠装师傅',
        avatar:
          user.avatar ||
          this.defaultAvatar,
        isVerified: user.isVerified || false,
        // isSkillVerified 动态返回：只有当用户真正通过认证时才为 true
        isSkillVerified: user.isSkillVerified === true,
        skillInfo: skillInfo || null,
        latitude: user.latitude || null,
        longitude: user.longitude || null,
        province: user.province || null,
        city: user.city || null,
        district: user.district || null,
        score: user.score ?? 300, // 积分/评分，默认300分
        completedOrdersCount: completedOrdersCount || 0, // 已完成订单数量，没有则返回0
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取用户信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新用户信息
   * @param userId 用户ID（从token中解析）
   * @param updateData 更新数据
   * @returns 更新成功消息
   */
  async updateUserInfo(
    userId: number,
    updateData: UpdateCraftsmanUserDto,
  ): Promise<{ message: string }> {
    try {
      // 1. 检查用户是否存在
      const existingUser = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 过滤掉undefined的字段，只更新有值的字段
      const updateFields: Partial<CraftsmanUser> = {};

      if (updateData.nickname !== undefined) {
        updateFields.nickname = updateData.nickname;
      }
      if (updateData.avatar !== undefined) {
        updateFields.avatar = updateData.avatar;
      }
      if (updateData.latitude !== undefined) {
        updateFields.latitude = updateData.latitude;
      }
      if (updateData.longitude !== undefined) {
        updateFields.longitude = updateData.longitude;
      }
      if (updateData.province !== undefined) {
        updateFields.province = updateData.province;
      }
      if (updateData.city !== undefined) {
        updateFields.city = updateData.city;
      }
      if (updateData.district !== undefined) {
        updateFields.district = updateData.district;
      }

      // 3. 执行更新
      await this.craftsmanUserRepository.update(userId, updateFields);

      // 4. 返回成功消息
      return { message: '更新成功' };
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
   * 获取所有工匠用户
   * @returns 所有工匠用户列表（包含技能信息）
   */
  async getAllCraftsmanUsers(): Promise<
    Array<CraftsmanUser & { skillInfo: IsSkillVerified | null }>
  > {
    try {
      // 查询所有工匠用户
      const users = await this.craftsmanUserRepository.find({
        order: { createdAt: 'DESC' },
      });

      // 获取所有用户的ID
      const userIds = users.map((user) => user.id);

      // 批量查询技能信息
      const skillInfos = await this.isSkillVerifiedRepository.find({
        where: userIds.map((id) => ({ userId: id })),
      });

      // 创建 userId -> skillInfo 的映射
      const skillInfoMap = new Map(
        skillInfos.map((skill) => [skill.userId, skill]),
      );

      // 为每个用户添加技能信息
      const dataWithSkillInfo = users.map((user) => ({
        ...user,
        isSkillVerified: user.isSkillVerified === true,
        skillInfo: skillInfoMap.get(user.id) || null,
      }));

      return dataWithSkillInfo;
    } catch (error) {
      console.error('获取所有工匠用户错误:', error);
      throw new HttpException(
        '获取所有工匠用户失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 分页查询工匠用户
   * @param queryDto 查询参数 {pageIndex, pageSize, nickname, phone, work_kind_code?}
   * @returns 分页结果
   */
  async getCraftsmanUsersByPage(queryDto: QueryCraftsmanUserDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        nickname = '',
        phone = '',
      } = queryDto;
      const phoneTrimmed = phone.trim();
      const workKindCodeTrimmed = queryDto.work_kind_code?.trim() || '';

      if (workKindCodeTrimmed) {
        const workKindExists = await this.workKindRepository.exist({
          where: { work_kind_code: workKindCodeTrimmed }, // work_kind 表精准匹配
        });
        if (!workKindExists) {
          throw new BadRequestException('工种编码不存在或未启用');
        }
      }

      // 创建查询构建器
      const query =
        this.craftsmanUserRepository.createQueryBuilder('craftsman_user');

      if (workKindCodeTrimmed) {
        // work_kind_code：与技能表字段全等（精准匹配），不使用 LIKE
        const subQ = this.isSkillVerifiedRepository
          .createQueryBuilder('vs_sub')
          .select('vs_sub.userId')
          .where('vs_sub.work_kind_code = :wkPageFilter', {
            wkPageFilter: workKindCodeTrimmed,
          });
        query.andWhere(`craftsman_user.id IN (${subQ.getQuery()})`);
        query.setParameters({
          ...query.getParameters(),
          ...subQ.getParameters(),
        });
      }

      // 添加筛选条件
      if (nickname) {
        query.andWhere('craftsman_user.nickname LIKE :nickname', {
          nickname: `%${nickname}%`,
        });
      }
      if (phoneTrimmed) {
        query.andWhere('craftsman_user.phone = :phone', {
          phone: phoneTrimmed,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('craftsman_user.createdAt', 'DESC');

      // 查询总数
      const total = await query.getCount();

      // 查询数据（分页）
      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // 获取所有用户的ID
      const userIds = data.map((user) => user.id);

      // 批量查询技能信息
      const skillInfos = await this.isSkillVerifiedRepository.find({
        where: userIds.map((id) => ({ userId: id })),
      });

      // 创建 userId -> skillInfo 的映射
      const skillInfoMap = new Map(
        skillInfos.map((skill) => [skill.userId, skill]),
      );

      // 为每个用户添加技能信息
      const dataWithSkillInfo = data.map((user) => ({
        ...user,
        isSkillVerified: user.isSkillVerified === true,
        skillInfo: skillInfoMap.get(user.id) || null,
      }));

      // 返回结果（包含分页信息的完整格式）
      return {
        success: true,
        data: dataWithSkillInfo,
        code: 200,
        message: null,
        pageIndex,
        pageSize,
        total,
        pageTotal: Math.ceil(total / pageSize),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('分页查询错误:', error);
      return {
        success: false,
        data: null,
        code: 500,
        message: '分页查询失败: ' + error.message,
        pageIndex: 1,
        pageSize: 10,
        total: 0,
        pageTotal: 0,
      };
    }
  }

  /**
   * 根据ID获取工匠用户
   * @param id 工匠用户ID
   * @returns 工匠用户信息（包含技能信息）
   */
  async findOne(
    id: number,
  ): Promise<CraftsmanUser & { skillInfo: IsSkillVerified | null }> {
    const user = await this.craftsmanUserRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException('工匠用户不存在');
    }

    // 获取技能信息
    const skillInfo = await this.isSkillVerifiedRepository.findOne({
      where: { userId: id },
    });

    return {
      ...user,
      isSkillVerified: user.isSkillVerified === true,
      skillInfo: skillInfo || null,
    };
  }

  /**
   * 根据ID删除工匠用户
   * @param id 工匠用户ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async deleteCraftsmanUser(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const user = await this.craftsmanUserRepository.findOne({
        where: { id },
      });

      if (!user) {
        throw new BadRequestException('工匠用户不存在');
      }

      // 删除记录
      await this.craftsmanUserRepository.remove(user);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除工匠用户失败: ' + error.message);
    }
  }
}
