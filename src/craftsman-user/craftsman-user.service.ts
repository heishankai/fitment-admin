import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
// constants
import { JWT_CONFIG } from '../common/constants/app.constants';
// entity
import { CraftsmanUser } from './craftsman-user.entity';
import { LoginDto } from './dto/login.dto';
import { UpdateCraftsmanUserDto } from './dto/update-craftsman-user.dto';
import { QueryCraftsmanUserDto } from './dto/query-craftsman-user.dto';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class CraftsmanUserService {
  constructor(
    @InjectRepository(CraftsmanUser)
    private readonly craftsmanUserRepository: Repository<CraftsmanUser>,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * 手机号验证码登录/注册
   * @param loginDto 登录信息（phone 和 code）
   * @returns 用户信息（包含token）
   */
  async loginOrRegister(loginDto: LoginDto): Promise<{
    phone: string;
    nickname: string;
    avatar: string;
    token: string;
  }> {
    try {
      const { phone, code } = loginDto;

      // 1. 验证验证码
      const isValidCode = this.smsService.verifyCode(phone, code);
      if (!isValidCode) {
        throw new HttpException('验证码无效或已过期', HttpStatus.BAD_REQUEST);
      }

      // 2. 查找用户是否存在
      let user = await this.craftsmanUserRepository.findOne({
        where: { phone },
      });

      // 3. 如果用户不存在，创建新用户
      if (!user) {
        user = this.craftsmanUserRepository.create({
          phone,
          nickname: '叮当优+师傅',
          avatar:
            'https://din-dang-zhi-zhuang.oss-cn-hangzhou.aliyuncs.com/uploads/1763214991038_s366qe_logo.png',
        });
        user = await this.craftsmanUserRepository.save(user);
      }

      // 4. 生成JWT token，payload包含phone和code
      const payload = {
        userId: user.id,
        phone: user.phone,
        code: code, // 将验证码包含在payload中
        type: 'craftsman',
      };

      const token = this.jwtService.sign(payload, {
        secret: JWT_CONFIG.secret,
        expiresIn: JWT_CONFIG.expiresIn,
      });

      // 5. 返回用户信息
      return {
        phone: user.phone,
        nickname: user.nickname || '叮当优+师傅',
        avatar:
          user.avatar ||
          'https://din-dang-zhi-zhuang.oss-cn-hangzhou.aliyuncs.com/uploads/1763214991038_s366qe_logo.png',
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
  }> {
    try {
      const user = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
      }

      return {
        phone: user.phone,
        nickname: user.nickname || '叮当优+师傅',
        avatar:
          user.avatar ||
          'https://din-dang-zhi-zhuang.oss-cn-hangzhou.aliyuncs.com/uploads/1763214991038_s366qe_logo.png',
        isVerified: user.isVerified || false,
        isSkillVerified: user.isSkillVerified || false,
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
   * 分页查询工匠用户
   * @param queryDto 查询参数 {pageIndex, pageSize, nickname, phone}
   * @returns 分页结果
   */
  async getCraftsmanUsersByPage(
    queryDto: QueryCraftsmanUserDto,
  ): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        nickname = '',
        phone = '',
      } = queryDto;

      // 创建查询构建器
      const query =
        this.craftsmanUserRepository.createQueryBuilder('craftsman_user');

      // 添加筛选条件
      if (nickname) {
        query.andWhere('craftsman_user.nickname LIKE :nickname', {
          nickname: `%${nickname}%`,
        });
      }
      if (phone) {
        query.andWhere('craftsman_user.phone LIKE :phone', {
          phone: `%${phone}%`,
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

      // 返回结果（包含分页信息的完整格式）
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
   * @returns 工匠用户信息
   */
  async findOne(id: number): Promise<CraftsmanUser> {
    const user = await this.craftsmanUserRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException('工匠用户不存在');
    }

    return user;
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
