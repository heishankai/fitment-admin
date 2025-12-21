import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PlatformIncomeRecord, CostTypeText, CostType } from './platform-income-record.entity';
import { CreatePlatformIncomeRecordDto } from './dto/create-platform-income-record.dto';
import { QueryPlatformIncomeRecordDto } from './dto/query-platform-income-record.dto';
import { Order } from '../order/order.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class PlatformIncomeRecordService {
  constructor(
    @InjectRepository(PlatformIncomeRecord)
    private readonly platformIncomeRecordRepository: Repository<PlatformIncomeRecord>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * 创建平台收支记录（每次操作都创建新记录）
   * @param createDto 收支记录信息
   * @returns 创建的收支记录
   */
  async create(
    createDto: CreatePlatformIncomeRecordDto,
  ): Promise<PlatformIncomeRecord> {
    try {
      // 1. 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: createDto.orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 创建新记录（每次操作都创建新记录，不更新已有记录）
      const record = this.platformIncomeRecordRepository.create({
        orderId: createDto.orderId,
        order_no: createDto.order_no || order.order_no || null,
        cost_type: createDto.cost_type,
        cost_type_text: CostTypeText[createDto.cost_type] || null,
        cost_amount: Number(createDto.cost_amount),
      });

      const saved = await this.platformIncomeRecordRepository.save(record);

      return saved;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('创建平台收支记录失败:', error);
      throw new HttpException(
        '创建平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据订单ID查询平台收支记录列表
   * @param orderId 订单ID
   * @returns 平台收支记录列表
   */
  async findByOrderId(orderId: number): Promise<PlatformIncomeRecord[]> {
    try {
      // 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 查询该订单的所有平台收支记录
      return await this.platformIncomeRecordRepository.find({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('查询平台收支记录失败:', error);
      throw new HttpException(
        '查询平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询所有平台收支记录
   * @returns 平台收支记录列表
   */
  async findAll(): Promise<PlatformIncomeRecord[]> {
    try {
      return await this.platformIncomeRecordRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('查询平台收支记录失败:', error);
      throw new HttpException(
        '查询平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取平台收支总计
   * @param queryDto 查询参数（可选，用于筛选）
   * @returns 总计信息
   */
  async getSummary(queryDto?: {
    order_no?: string;
    date_range?: string[];
  }): Promise<{
    total_materials_cost: number;
    total_service_fee: number;
    total_income: number;
    total_count: number;
  }> {
    try {
      const query = this.platformIncomeRecordRepository.createQueryBuilder('record');

      // 添加筛选条件
      if (queryDto?.order_no) {
        query.andWhere('record.order_no LIKE :order_no', {
          order_no: `%${queryDto.order_no}%`,
        });
      }

      if (queryDto?.date_range && queryDto.date_range.length === 2) {
        const startDate = new Date(queryDto.date_range[0]);
        const endDate = new Date(queryDto.date_range[1]);
        // 设置结束日期为当天的23:59:59
        endDate.setHours(23, 59, 59, 999);
        query.andWhere('record.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      // 查询所有符合条件的记录
      const records = await query.getMany();

      // 根据 cost_type 分组计算总计
      const total_materials_cost = records
        .filter((record) => record.cost_type === 'materials')
        .reduce((sum, record) => sum + (Number(record.cost_amount) || 0), 0);
      
      const total_service_fee = records
        .filter((record) => record.cost_type === 'service_fee')
        .reduce((sum, record) => sum + (Number(record.cost_amount) || 0), 0);
      
      const total_income = total_materials_cost + total_service_fee;
      const total_count = records.length;

      return {
        total_materials_cost: Number(total_materials_cost.toFixed(2)),
        total_service_fee: Number(total_service_fee.toFixed(2)),
        total_income: Number(total_income.toFixed(2)),
        total_count,
      };
    } catch (error) {
      console.error('获取平台收支总计失败:', error);
      throw new HttpException(
        '获取平台收支总计失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 分页查询平台收支记录
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  async getIncomeRecordsByPage(
    queryDto: QueryPlatformIncomeRecordDto,
  ): Promise<any> {
    try {
      const {
        pageIndex = 1,
        pageSize = 10,
        order_no,
        income_time,
      } = queryDto;

      // 创建查询构建器
      const query = this.platformIncomeRecordRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.order', 'order')
        .leftJoinAndSelect('order.wechat_user', 'wechat_user')
        .leftJoinAndSelect('order.craftsman_user', 'craftsman_user');

      // 添加筛选条件：订单号查询（精确匹配）
      if (order_no && order_no.trim()) {
        query.andWhere('record.order_no = :order_no', {
          order_no: order_no.trim(),
        });
      }

      // 添加筛选条件：收入时间区间查询
      if (income_time && income_time.length === 2) {
        const startDate = new Date(income_time[0] + ' 00:00:00');
        const endDate = new Date(income_time[1] + ' 23:59:59');
        query.andWhere('record.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('record.createdAt', 'DESC');

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
      console.error('分页查询平台收支记录失败:', error);
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
   * 导出平台收支记录为 Excel
   * @param queryDto 查询参数（可选，不传则导出全部）
   * @returns Excel 文件流
   */
  async exportIncomeRecordsToExcel(
    queryDto?: Partial<QueryPlatformIncomeRecordDto>,
  ): Promise<ExcelJS.Buffer> {
    try {
      // 创建查询构建器（复用分页查询的查询逻辑）
      const query = this.platformIncomeRecordRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.order', 'order')
        .leftJoinAndSelect('order.wechat_user', 'wechat_user')
        .leftJoinAndSelect('order.craftsman_user', 'craftsman_user');

      // 添加筛选条件：订单号查询（精确匹配）
      if (queryDto?.order_no && queryDto.order_no.trim()) {
        query.andWhere('record.order_no = :order_no', {
          order_no: queryDto.order_no.trim(),
        });
      }

      // 添加筛选条件：收入时间区间查询
      if (queryDto?.income_time && queryDto.income_time.length === 2) {
        const startDate = new Date(queryDto.income_time[0] + ' 00:00:00');
        const endDate = new Date(queryDto.income_time[1] + ' 23:59:59');
        query.andWhere('record.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('record.createdAt', 'DESC');

      // 查询所有符合条件的数据（不分页）
      const records = await query.getMany();

      // 使用费用类型中文映射

      // 创建 Excel 工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('平台收支记录');

      // 设置列标题
      worksheet.columns = [
        { header: '平台收入', key: 'cost_amount', width: 15 },
        { header: '收入类型', key: 'cost_type', width: 15 },
        { header: '订单编号', key: 'order_no', width: 25 },
        { header: '创建时间', key: 'createdAt', width: 20 },
      ];

      // 设置表头样式
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

      // 添加数据行
      records.forEach((record) => {
        const row = worksheet.addRow({
          cost_amount: `¥${Number(record.cost_amount).toFixed(2)}`,
          cost_type: record.cost_type_text || CostTypeText[record.cost_type] || record.cost_type,
          order_no: record.order_no || '',
          createdAt: record.createdAt
            ? new Date(record.createdAt).toLocaleString('zh-CN')
            : '',
        });

        // 设置行样式
        row.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // 设置列宽自适应
      worksheet.columns.forEach((column) => {
        if (column.header) {
          column.width = Math.max(column.width || 10, column.header.length + 2);
        }
      });

      // 生成 Excel 文件缓冲区
      const buffer = await workbook.xlsx.writeBuffer();

      return buffer as ExcelJS.Buffer;
    } catch (error) {
      console.error('导出平台收支记录失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '导出平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
