import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { GetPrice } from './get-price.entity';
import { CreateGetPriceDto } from './dto/create-get-price.dto';
import { QueryGetPriceDto } from './dto/query-get-price.dto';
import { UpdateGetPriceDto } from './dto/update-get-price.dto';

@Injectable()
export class GetPriceService {
  constructor(
    @InjectRepository(GetPrice)
    private readonly getPriceRepository: Repository<GetPrice>,
  ) {}

  /**
   * 分页查询获取报价记录
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  async getGetPricesByPage(queryDto: QueryGetPriceDto): Promise<any> {
    try {
      const {
        pageIndex = 1,
        pageSize = 10,
        city = '',
        phone = '',
        houseType = '',
      } = queryDto;

      // 构建查询条件
      const where: any = {};

      // city: 模糊匹配 location
      if (city && city.trim()) {
        where.location = Like(`%${city.trim()}%`);
      }

      // phone: 精确匹配
      if (phone && phone.trim()) {
        where.phone = phone.trim();
      }

      // houseType: 精确匹配
      if (houseType && houseType.trim()) {
        where.houseType = houseType.trim();
      }

      // 查询总数
      const total = await this.getPriceRepository.count({ where });

      // 查询数据（分页）
      const data = await this.getPriceRepository.find({
        where,
        skip: (pageIndex - 1) * pageSize,
        take: pageSize,
        order: { createdAt: 'DESC' },
      });

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
      console.error('分页查询获取报价错误:', error);
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
   * 创建获取报价记录
   * @param createGetPriceDto 创建获取报价DTO
   * @returns 创建的记录
   */
  async createGetPrice(createGetPriceDto: CreateGetPriceDto): Promise<GetPrice> {
    try {
      // 如果 houseTypeName 未提供，根据 houseType 自动生成
      if (!createGetPriceDto.houseTypeName && createGetPriceDto.houseType) {
        createGetPriceDto.houseTypeName =
          createGetPriceDto.houseType === 'new' ? '新房' : '老房';
      }

      // 创建新的获取报价记录
      const getPrice = this.getPriceRepository.create(createGetPriceDto);

      // 保存到数据库并返回
      return await this.getPriceRepository.save(getPrice);
    } catch (error) {
      throw new BadRequestException('创建获取报价失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取获取报价记录
   * @param id 获取报价ID
   * @returns 获取报价记录
   */
  async findOne(id: number): Promise<GetPrice> {
    const getPrice = await this.getPriceRepository.findOne({
      where: { id },
    });

    if (!getPrice) {
      throw new BadRequestException('获取报价记录不存在');
    }

    return getPrice;
  }

  /**
   * 根据ID更新获取报价记录
   * @param id 获取报价ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateGetPrice(
    id: number,
    updateDto: UpdateGetPriceDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const getPrice = await this.getPriceRepository.findOne({
        where: { id },
      });

      if (!getPrice) {
        throw new BadRequestException('获取报价记录不存在');
      }

      // 更新记录
      await this.getPriceRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新获取报价记录失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除获取报价记录
   * @param id 获取报价ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async deleteGetPrice(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const getPrice = await this.getPriceRepository.findOne({
        where: { id },
      });

      if (!getPrice) {
        throw new BadRequestException('获取报价记录不存在');
      }

      // 删除记录
      await this.getPriceRepository.remove(getPrice);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除获取报价记录失败: ' + error.message);
    }
  }
}

