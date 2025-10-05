import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// entitly
import { Craftsman } from './craftsman.entitly';

/**
 * 工匠服务类
 * 负责处理工匠相关的业务逻辑和数据库操作
 */
@Injectable()
export class CraftsmanService {
  /**
   * 构造函数 - 依赖注入
   * @param craftsmanRepository 工匠实体的数据库操作仓库
   * 通过 @InjectRepository 装饰器注入 Craftsman 实体的 Repository
   * 这样就可以直接进行数据库的增删改查操作
   */
  constructor(
    @InjectRepository(Craftsman)
    private readonly craftsmanRepository: Repository<Craftsman>,
  ) {}

  /**
   * 获取所有工匠
   * @returns
   */
  async getAllCraftsmen(): Promise<Craftsman[]> {
    try {
      return await this.craftsmanRepository.find();
    } catch (error) {
      throw new HttpException(
        '获取工匠列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取单个工匠
   * @param id 工匠id
   * @returns
   */
  async getOneCraftsman(id: number): Promise<Craftsman | null> {
    try {
      const craftsman = await this.craftsmanRepository.findOneBy({ id });
      if (!craftsman) {
        throw new HttpException('工匠不存在', HttpStatus.NOT_FOUND);
      }
      return craftsman as Craftsman;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('获取工匠失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 创建工匠
   * @param body 工匠信息
   * @returns
   */
  async createCraftsman(body: Craftsman): Promise<Craftsman> {
    return await this.craftsmanRepository.save(body);
  }

  /**
   * 分页查询工匠列表 - 简化版
   * @param body 查询参数 {pageIndex, pageSize, craftsman_name, craftsman_phone}
   * @returns 分页结果
   */
  async getCraftsmenByPage(body: any): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 20,
        craftsman_name = '',
        craftsman_phone = '',
      } = body ?? {};

      // 创建查询构建器
      const query = this.craftsmanRepository.createQueryBuilder('craftsman');

      // 添加筛选条件
      if (craftsman_name) {
        query.andWhere('craftsman.craftsman_name LIKE :name', {
          name: `%${craftsman_name}%`,
        });
      }
      if (craftsman_phone) {
        query.andWhere('craftsman.craftsman_phone LIKE :phone', {
          phone: `%${craftsman_phone}%`,
        });
      }

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
        pageSize: 20,
        total: 0,
        pageTotal: 0,
      };
    }
  }
}
