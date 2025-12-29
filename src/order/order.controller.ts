import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Request,
  HttpException,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { OrderService } from './order.service';
import { OrderGateway } from './order.gateway';
import { WorkPriceItemService } from '../work-price-item/work-price-item.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAdminDto } from './dto/create-order-admin.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { QueryCraftsmanOrdersDto } from './dto/query-craftsman-orders.dto';
import { AddWorkPricesDto } from './dto/add-work-prices.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { AssignWorkPricesDto } from './dto/assign-work-prices.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { AcceptWorkPriceDto } from './dto/accept-work-price.dto';
import { AcceptSingleWorkPriceDto } from './dto/accept-single-work-price.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ConfirmWorkPriceServiceFeeDto } from './dto/confirm-work-price-service-fee.dto';

@Controller('order')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly orderGateway: OrderGateway,
    private readonly workPriceItemService: WorkPriceItemService,
  ) {}

  /**
   * 创建订单（HTTP接口，用于非Socket场景）
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 订单信息
   * @returns 创建的订单和匹配的工匠列表
   */
  @Post()
  async createOrder(
    @Request() request: any,
    @Body(ValidationPipe) body: CreateOrderDto,
  ) {
    try {
      // 从token中获取userId（微信用户）
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      // 解码 URL 编码的工种名称（如果存在）
      if (body.work_kind_name) {
        try {
          body.work_kind_name = decodeURIComponent(body.work_kind_name);
          this.logger.log(
            `订单工种名称已解码: ${body.work_kind_name}`,
          );
        } catch (e) {
          // 如果解码失败，使用原始值
          this.logger.log(
            `订单工种名称无需解码: ${body.work_kind_name}`,
          );
        }
      }

      // 创建订单并匹配工匠
      const { order, matchedCraftsmen } =
        await this.orderService.createOrder(body, userId);

      // 加载完整的订单信息（包含用户信息）
      const fullOrder = await this.orderService.findOne(order.id);

      if (!fullOrder) {
        this.logger.error(`订单 ${order.id} 创建成功但查询失败`);
        throw new HttpException(
          '订单创建成功但查询失败',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 通过 Socket.IO 通知匹配到的所有工匠用户（弹出订单详情）
      // 这样即使是通过 HTTP 接口创建的订单，工匠也能收到实时通知
      this.logger.log(
        `HTTP接口创建订单 ${fullOrder.id}，匹配到 ${matchedCraftsmen.length} 个工匠`,
      );
      
      try {
        await this.orderGateway.notifyMatchedCraftsmen(
          fullOrder,
          matchedCraftsmen,
        );
      } catch (notifyError) {
        // Socket 通知失败不影响订单创建
        this.logger.error('Socket 通知失败，但不影响订单创建:', notifyError);
      }

      return {
        order: fullOrder,
        matchedCraftsmen,
      };
    } catch (error) {
      this.logger.error('创建订单失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || '创建订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据订单ID查询所有子工价组
   * @param id 订单ID
   * @returns 子工价组列表，每个组包含统计信息
   */
  @Get(':id/sub-groups')
  async getSubWorkPriceGroups(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.workPriceItemService.findSubWorkPriceGroupsByOrderId(
        id,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询子工价组失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 标记订单的平台服务费为已支付
   * @param id 订单ID
   */
  @Put(':id/service-fee/pay')
  async markServiceFeeAsPaid(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.orderService.markServiceFeeAsPaid(id);
      return { success: true, message: '平台服务费已标记为已支付' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '标记平台服务费为已支付失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据ID获取订单
   * @param id 订单ID
   * @returns 订单信息
   */
  @Get(':id')
  async getOrder(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.orderService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('获取订单失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 获取用户的订单列表
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 订单列表
   */
  @Get('user/list')
  async getUserOrders(@Request() request: any) {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.orderService.getUserOrders(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取订单列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取工匠的订单列表（待接单订单）
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 订单列表
   */
  @Get('craftsman/list')
  async getCraftsmanOrders(@Request() request: any) {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.orderService.getCraftsmanOrders(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取订单列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取工匠订单列表（根据订单状态过滤）
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 查询条件（包含 order_status 数组）
   * @returns 订单列表
   */
  @Post('craftsman/orders')
  async getCraftsmanOrdersByStatus(
    @Request() request: any,
    @Body(ValidationPipe) body: QueryCraftsmanOrdersDto,
  ) {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.orderService.getCraftsmanOrdersByStatus(
        userId,
        body.order_status,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取订单列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 工匠接单（HTTP接口）
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 接单信息
   * @returns 更新后的订单
   */
  @Post('accept')
  async acceptOrder(
    @Request() request: any,
    @Body(ValidationPipe) body: AcceptOrderDto,
  ) {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.orderService.acceptOrder(body.orderId, userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('接单失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 指派订单给工匠（管理员操作）
   * @param body 指派信息（订单ID和工匠用户ID）
   * @returns 更新后的订单
   */
  @Post('assign')
  async assignOrder(@Body(ValidationPipe) body: AssignOrderDto) {
    try {
      return await this.orderService.assignOrder(
        body.orderId,
        body.craftsmanUserId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('指派订单失败:', error);
      throw new HttpException(
        '指派订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新订单状态（HTTP接口）
   * @param id 订单ID
   * @param body 订单状态更新信息
   * @returns 更新后的订单
   */
  @Put(':id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) body: UpdateOrderStatusDto,
  ) {
    try {
      return await this.orderService.updateOrderStatus(id, body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '更新订单状态失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  /**
   * 添加工价数据
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 工价数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('work-prices')
  async addWorkPrices(
    @Request() request: any,
    @Body(ValidationPipe) body: AddWorkPricesDto,
  ): Promise<null> {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.orderService.addWorkPrices(
        body.orderId,
        body.work_prices,
        userId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('添加工价失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 分页查询订单
   * @param body 查询参数
   * @returns 分页结果
   */
  @Post('query')
  async getOrdersByPage(@Body(ValidationPipe) body: QueryOrderDto) {
    try {
      return await this.orderService.getOrdersByPage(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('分页查询订单失败:', error);
      throw new HttpException(
        '分页查询订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 确认支付
   * @param body 确认支付信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('confirm-payment')
  async confirmPayment(@Body(ValidationPipe) body: ConfirmPaymentDto): Promise<null> {
    try {
      return await this.orderService.confirmPayment(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('确认支付失败:', error);
      throw new HttpException(
        '确认支付失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 验收工价
   * @param body 验收信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('accept-work-price')
  async acceptWorkPrice(@Body(ValidationPipe) body: AcceptWorkPriceDto): Promise<null> {
    try {
      return await this.orderService.acceptWorkPrice(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('验收工价失败:', error);
      throw new HttpException(
        '验收工价失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 单个工价验收
   * @param body 验收信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('accept-single-work-price')
  async acceptSingleWorkPrice(@Body(ValidationPipe) body: AcceptSingleWorkPriceDto): Promise<null> {
    try {
      return await this.orderService.acceptSingleWorkPrice(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('单个工价验收失败:', error);
      throw new HttpException(
        '单个工价验收失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  /**
   * 确认工价项平台服务费支付
   * @param body 确认支付信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('confirm-work-price-service-fee')
  async confirmWorkPriceServiceFee(
    @Body(ValidationPipe) body: ConfirmWorkPriceServiceFeeDto,
  ): Promise<null> {
    try {
      return await this.orderService.confirmWorkPriceServiceFee(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('确认工价项平台服务费支付失败:', error);
      throw new HttpException(
        '确认工价项平台服务费支付失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 取消订单
   * @param body 取消订单信息
   * @returns 更新后的订单
   */
  @Post('cancel')
  async cancelOrder(@Body(ValidationPipe) body: CancelOrderDto) {
    try {
      return await this.orderService.cancelOrder(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('取消订单失败:', error);
      throw new HttpException(
        '取消订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 将多个工价分配给某个工匠，生成工匠订单
   * @param body 分配工价参数
   * @returns 创建的工匠订单
   */
  @Post('assign-work-prices')
  async assignWorkPricesToCraftsman(
    @Body(ValidationPipe) body: AssignWorkPricesDto,
  ) {
    try {
      return await this.orderService.assignWorkPricesToCraftsman(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('分配工价给工匠失败:', error);
      throw new HttpException(
        '分配工价给工匠失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 调试接口：获取当前连接的工匠信息
   * @returns 当前连接的工匠列表
   */
  @Get('debug/connected-craftsmen')
  @Public()
  async getConnectedCraftsmen() {
    try {
      return {
        success: true,
        data: this.orderGateway.getConnectedCraftsmen(),
      };
    } catch (error) {
      this.logger.error('获取连接的工匠失败', error);
      throw new HttpException(
        '获取连接的工匠失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 管理员创建订单（可分配工长和工匠）
   * @param body 订单信息（包含wechatUserId）
   * @returns 创建的订单
   */
  @Post('admin')
  async createOrderAdmin(
    @Body(ValidationPipe) body: CreateOrderAdminDto,
  ) {
    try {
      const order = await this.orderService.createOrderAdmin(body);

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('管理员创建订单失败', error);
      throw new HttpException(
        '创建订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

