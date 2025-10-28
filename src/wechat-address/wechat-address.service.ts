import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WechatAddress } from './wechat-address.entity';
import { CreateWechatAddressDto } from './dto/create-wechat-address.dto';
import { UpdateWechatAddressDto } from './dto/update-wechat-address.dto';
import { QueryWechatAddressDto } from './dto/query-wechat-address.dto';

@Injectable()
export class WechatAddressService {
  constructor(
    @InjectRepository(WechatAddress)
    private readonly wechatAddressRepository: Repository<WechatAddress>,
  ) {}

  /**
   * 创建微信地址
   * @param createWechatAddressDto 创建地址数据
   * @returns 创建的地址信息
   */
  async create(
    createWechatAddressDto: CreateWechatAddressDto,
  ): Promise<WechatAddress> {
    try {
      // 如果设置为默认地址，先将该用户的其他地址设为非默认
      if (createWechatAddressDto.default) {
        await this.wechatAddressRepository.update(
          { wechat_user_id: createWechatAddressDto.wechat_user_id },
          { default: false },
        );
      }

      const wechatAddress = this.wechatAddressRepository.create(
        createWechatAddressDto,
      );
      return await this.wechatAddressRepository.save(wechatAddress);
    } catch (error) {
      throw new HttpException('创建地址失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 分页查询微信地址列表
   * @param queryDto 查询参数 {pageIndex, pageSize, wechat_user_id}
   * @returns 分页结果
   */
  async findAll(queryDto: QueryWechatAddressDto): Promise<any> {
    try {
      // 获取参数
      const { pageIndex = 1, pageSize = 10, wechat_user_id } = queryDto;

      // 创建查询构建器
      const query =
        this.wechatAddressRepository.createQueryBuilder('wechat_address');

      // 添加关联查询
      query.leftJoinAndSelect('wechat_address.wechat_user', 'wechat_user');

      // 添加筛选条件
      if (wechat_user_id) {
        query.andWhere('wechat_address.wechat_user_id = :wechat_user_id', {
          wechat_user_id,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('wechat_address.createdAt', 'DESC');

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
   * 根据ID查询微信地址详情
   * @param id 地址ID
   * @returns 地址详情
   */
  async findOne(id: number): Promise<WechatAddress> {
    try {
      const wechatAddress = await this.wechatAddressRepository.findOne({
        where: { id },
        relations: ['wechat_user'],
      });

      if (!wechatAddress) {
        throw new HttpException('地址不存在', HttpStatus.NOT_FOUND);
      }

      return wechatAddress;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询地址详情失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新微信地址
   * @param id 地址ID
   * @param updateWechatAddressDto 更新数据
   * @returns 更新后的地址信息
   */
  async update(
    id: number,
    updateWechatAddressDto: UpdateWechatAddressDto,
  ): Promise<WechatAddress> {
    try {
      // 检查地址是否存在
      const existingAddress = await this.wechatAddressRepository.findOne({
        where: { id },
      });

      if (!existingAddress) {
        throw new HttpException('地址不存在', HttpStatus.NOT_FOUND);
      }

      // 如果设置为默认地址，先将该用户的其他地址设为非默认
      if (updateWechatAddressDto.default) {
        await this.wechatAddressRepository.update(
          { wechat_user_id: existingAddress.wechat_user_id },
          { default: false },
        );
      }

      // 执行更新
      await this.wechatAddressRepository.update(id, updateWechatAddressDto);

      // 返回更新后的地址信息
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('更新地址失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 删除微信地址
   * @param id 地址ID
   * @returns 删除结果
   */
  async remove(id: number): Promise<{ message: string }> {
    try {
      // 检查地址是否存在
      const existingAddress = await this.wechatAddressRepository.findOne({
        where: { id },
      });

      if (!existingAddress) {
        throw new HttpException('地址不存在', HttpStatus.NOT_FOUND);
      }

      await this.wechatAddressRepository.delete(id);

      return { message: '地址删除成功' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('删除地址失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
