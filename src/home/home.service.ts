import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { Order, OrderStatus } from '../order/order.entity';
import { Materials } from '../materials/materials.entity';

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(WechatUser)
    private readonly wechatUserRepository: Repository<WechatUser>,
    @InjectRepository(CraftsmanUser)
    private readonly craftsmanUserRepository: Repository<CraftsmanUser>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Materials)
    private readonly materialsRepository: Repository<Materials>,
  ) {}

  /**
   * 获取首页统计数据
   * @param month 月份，格式：2025-10
   * @returns 统计数据
   */
  async getHomeStatistics(month: string) {
    // 解析月份
    const [year, monthNum] = month.split('-').map(Number);
    
    // 计算本月开始和结束时间（使用本地时间，与数据库保持一致）
    // 本月第一天 00:00:00
    const currentMonthStart = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    // 本月最后一天 23:59:59.999
    const currentMonthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);
    
    // 计算上月开始和结束时间
    // 上个月第一天 00:00:00
    // monthNum - 2 是因为：monthNum=12 表示12月，monthNum-1=11（JS中11表示12月），monthNum-2=10（JS中10表示11月）
    const lastMonthStart = new Date(year, monthNum - 2, 1, 0, 0, 0, 0);
    // 上个月最后一天 23:59:59.999
    // new Date(year, month, 0) 返回上个月的最后一天
    // monthNum - 1 在JS中表示 monthNum 月，所以 new Date(year, monthNum - 1, 0) 返回 (monthNum - 1) 月的最后一天
    // 例如：monthNum=12，monthNum-1=11，new Date(2025, 11, 0) = 2025-11-30（11月的最后一天）
    const lastMonthEnd = new Date(year, monthNum - 1, 0, 23, 59, 59, 999);

    console.log('查询参数:', { month, year, monthNum });
    console.log('本月时间范围:', {
      start: currentMonthStart.toISOString(),
      end: currentMonthEnd.toISOString(),
      startLocal: currentMonthStart.toLocaleString('zh-CN'),
      endLocal: currentMonthEnd.toLocaleString('zh-CN'),
    });
    console.log('上月时间范围:', {
      start: lastMonthStart.toISOString(),
      end: lastMonthEnd.toISOString(),
      startLocal: lastMonthStart.toLocaleString('zh-CN'),
      endLocal: lastMonthEnd.toLocaleString('zh-CN'),
    });

    // 1. 本月新增用户数量
    const currentMonthWechatUserCount = await this.wechatUserRepository.count({
      where: {
        createdAt: Between(currentMonthStart, currentMonthEnd),
      },
    });

    console.log('本月新增用户数量:', currentMonthWechatUserCount);

    // 上月新增用户数量
    const lastMonthWechatUserCount = await this.wechatUserRepository.count({
      where: {
        createdAt: Between(lastMonthStart, lastMonthEnd),
      },
    });

    console.log('上月新增用户数量:', lastMonthWechatUserCount);

    // 计算用户数量变化百分比
    const wechatUserCountPercentage = this.calculatePercentage(
      currentMonthWechatUserCount,
      lastMonthWechatUserCount,
    );

    // 2. 本月新增师傅数量
    const currentMonthCraftsmanUserCount = await this.craftsmanUserRepository.count({
      where: {
        createdAt: Between(currentMonthStart, currentMonthEnd),
      },
    });

    console.log('本月新增师傅数量:', currentMonthCraftsmanUserCount);

    // 上月新增师傅数量
    const lastMonthCraftsmanUserCount = await this.craftsmanUserRepository.count({
      where: {
        createdAt: Between(lastMonthStart, lastMonthEnd),
      },
    });

    console.log('上月新增师傅数量:', lastMonthCraftsmanUserCount);

    // 计算师傅数量变化百分比
    const craftsmanUserCountPercentage = this.calculatePercentage(
      currentMonthCraftsmanUserCount,
      lastMonthCraftsmanUserCount,
    );

    // 3. 本月完成的订单数量和金额
    const currentMonthCompletedOrders = await this.orderRepository.find({
      where: {
        order_status: OrderStatus.COMPLETED,
        updatedAt: Between(currentMonthStart, currentMonthEnd),
      },
    });

    console.log('本月完成的订单数量:', currentMonthCompletedOrders.length);
    console.log('本月完成的订单详情:', currentMonthCompletedOrders.map(o => ({
      id: o.id,
      updatedAt: o.updatedAt,
      order_status: o.order_status,
    })));

    const currentMonthOrderCount = currentMonthCompletedOrders.length;
    const currentMonthOrderAmount = await this.calculateOrderAmount(currentMonthCompletedOrders);

    console.log('本月订单金额:', currentMonthOrderAmount);

    // 上月完成的订单数量和金额
    const lastMonthCompletedOrders = await this.orderRepository.find({
      where: {
        order_status: OrderStatus.COMPLETED,
        updatedAt: Between(lastMonthStart, lastMonthEnd),
      },
    });

    console.log('上月完成的订单数量:', lastMonthCompletedOrders.length);

    const lastMonthOrderCount = lastMonthCompletedOrders.length;
    const lastMonthOrderAmount = await this.calculateOrderAmount(lastMonthCompletedOrders);

    // 计算订单数量变化百分比
    const orderCountPercentage = this.calculatePercentage(
      currentMonthOrderCount,
      lastMonthOrderCount,
    );

    // 计算订单金额变化百分比
    const orderAmountPercentage = this.calculatePercentage(
      currentMonthOrderAmount,
      lastMonthOrderAmount,
    );

    // 4. 本月订单走势图（每天完成的订单数量）
    const orderDailyChart = this.getOrderDailyChart(
      currentMonthCompletedOrders,
      year,
      monthNum,
    );

    // 5. 本月订单统计图（饼状图：所有订单的状态分布）
    const orderPieChart = await this.getOrderPieChart(
      currentMonthStart,
      currentMonthEnd,
    );

    return {
      card: {
        wechat_user_count: currentMonthWechatUserCount,
        craftsman_user_count: currentMonthCraftsmanUserCount,
        order_count: currentMonthOrderCount,
        order_amount: currentMonthOrderAmount,
        wechat_user_count_percentage: wechatUserCountPercentage,
        craftsman_user_count_percentage: craftsmanUserCountPercentage,
        order_count_percentage: orderCountPercentage,
        order_amount_percentage: orderAmountPercentage,
        wechat_user_count_trend: this.calculateTrend(
          currentMonthWechatUserCount,
          lastMonthWechatUserCount,
        ),
        craftsman_user_count_trend: this.calculateTrend(
          currentMonthCraftsmanUserCount,
          lastMonthCraftsmanUserCount,
        ),
        order_count_trend: this.calculateTrend(
          currentMonthOrderCount,
          lastMonthOrderCount,
        ),
        order_amount_trend: this.calculateTrend(
          currentMonthOrderAmount,
          lastMonthOrderAmount,
        ),
      },
      order_daily_chart: orderDailyChart,
      order_pie_chart: orderPieChart,
    };
  }

  /**
   * 计算百分比变化
   * @param current 当前值
   * @param last 上期值
   * @returns 百分比变化（正数表示上升，负数表示下降）
   */
  private calculatePercentage(current: number, last: number): number {
    if (last === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number(((current - last) / last * 100).toFixed(2));
  }

  /**
   * 计算趋势
   * @param current 当前值
   * @param last 上期值
   * @returns 趋势（"up" 表示上升，"down" 表示下降）
   */
  private calculateTrend(current: number, last: number): string {
    return current >= last ? 'up' : 'down';
  }

  /**
   * 计算订单总金额
   * @param orders 订单列表
   * @returns 总金额
   */
  private async calculateOrderAmount(orders: Order[]): Promise<number> {
    let totalAmount = 0;

    // 获取所有订单ID
    const orderIds = orders.map(order => order.id);

    // 批量查询所有订单的辅材
    const materialsList = orderIds.length > 0
      ? await this.materialsRepository.find({
          where: {
            orderId: In(orderIds),
          },
        })
      : [];

    // 按订单ID分组辅材
    const materialsByOrderId: { [key: number]: Materials[] } = {};
    for (const material of materialsList) {
      if (!materialsByOrderId[material.orderId]) {
        materialsByOrderId[material.orderId] = [];
      }
      materialsByOrderId[material.orderId].push(material);
    }

    for (const order of orders) {
      // 计算主工价单金额
      if (order.work_prices && order.work_prices.length > 0) {
        for (const workPrice of order.work_prices) {
          // 施工费用
          totalAmount += Number(workPrice.total_price) || 0;
          // 工长费用
          totalAmount += Number(workPrice.gangmaster_cost) || 0;
        }
      }

      // 计算子工价单金额
      if (order.sub_work_prices && order.sub_work_prices.length > 0) {
        for (const subWorkPrice of order.sub_work_prices) {
          totalAmount += Number(subWorkPrice.total_price) || 0;
        }
      }

      // 计算辅材金额（从独立的 materials 表查询）
      const orderMaterials = materialsByOrderId[order.id] || [];
      for (const material of orderMaterials) {
        totalAmount += Number(material.settlement_amount) || 0;
      }
    }

    return Number(totalAmount.toFixed(2));
  }

  /**
   * 获取订单每日走势图数据
   * @param orders 订单列表
   * @param year 年份
   * @param month 月份
   * @returns 走势图数据
   */
  private getOrderDailyChart(
    orders: Order[],
    year: number,
    month: number,
  ): { x: string[]; y: number[] } {
    // 获取本月天数
    const daysInMonth = new Date(year, month, 0).getDate();

    // 初始化每日订单数量
    const dailyCounts: { [key: string]: number } = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyCounts[dateKey] = 0;
    }

    // 统计每日订单数量
    for (const order of orders) {
      const orderDate = new Date(order.updatedAt);
      const day = orderDate.getDate();
      const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dailyCounts.hasOwnProperty(dateKey)) {
        dailyCounts[dateKey]++;
      }
    }

    // 转换为数组格式
    const x: string[] = [];
    const y: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      x.push(dateKey);
      y.push(dailyCounts[dateKey]);
    }

    return { x, y };
  }

  /**
   * 获取订单饼状图数据（本月所有订单的状态分布）
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 饼状图数据
   */
  private async getOrderPieChart(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ value: number; name: string }>> {
    // 查询本月所有订单（按创建时间）
    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    // 统计各状态订单数量
    const statusCounts: { [key: number]: number } = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.ACCEPTED]: 0,
      [OrderStatus.COMPLETED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    for (const order of orders) {
      const status = order.order_status;
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    }

    // 转换为饼状图格式
    return [
      { value: statusCounts[OrderStatus.PENDING], name: '待接单' },
      { value: statusCounts[OrderStatus.ACCEPTED], name: '已接单' },
      { value: statusCounts[OrderStatus.COMPLETED], name: '已完成' },
      { value: statusCounts[OrderStatus.CANCELLED], name: '已取消' },
    ];
  }
}
