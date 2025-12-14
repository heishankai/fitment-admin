import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  HttpException,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialsDto } from './dto/create-materials.dto';
import { AcceptMaterialsDto } from './dto/accept-materials.dto';
import { ConfirmMaterialsPaymentDto } from './dto/confirm-payment.dto';
import { Materials } from './materials.entity';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  /**
   * 根据订单ID查询辅材列表
   * @param orderId 订单ID
   * @returns 辅材列表
   */
  @Get('order/:orderId')
  async findByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<Materials[]> {
    try {
      return await this.materialsService.findByOrderId(orderId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建辅材
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 辅材信息
   * @returns 创建的辅材
   */
  @Post()
  async create(
    @Request() request: any,
    @Body(ValidationPipe) body: CreateMaterialsDto,
  ): Promise<Materials> {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.materialsService.create(body, userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('创建辅材失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 验收辅材
   * @param body 验收信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('accept')
  async accept(
    @Body(ValidationPipe) body: AcceptMaterialsDto,
  ): Promise<null> {
    try {
      return await this.materialsService.accept(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('验收辅材失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 确认辅材支付
   * @param body 确认支付信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('confirm-payment')
  async confirmPayment(
    @Body(ValidationPipe) body: ConfirmMaterialsPaymentDto,
  ): Promise<null> {
    try {
      return await this.materialsService.confirmPayment(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '确认辅材支付失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
