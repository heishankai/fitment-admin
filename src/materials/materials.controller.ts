import {
  Controller,
  Post,
  Put,
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
import { MaterialsResponseDto } from './dto/materials-response.dto';
import { BatchPaymentMaterialsDto } from './dto/batch-payment.dto';
import { BatchAcceptMaterialsDto } from './dto/batch-accept.dto';
import { Materials } from './materials.entity';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  /**
   * 根据订单ID查询辅材列表
   * @param orderId 订单ID
   * @returns 辅材响应数据（包含商品列表和总价）
   */
  @Get('order/:orderId')
  async findByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<MaterialsResponseDto> {
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
   * @returns 创建的辅材列表
   */
  @Post()
  async create(
    @Request() request: any,
    @Body(ValidationPipe) body: CreateMaterialsDto,
  ): Promise<Materials[]> {
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
   * 确认单个辅材支付（更新支付状态）
   * @param id 辅材ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id/confirm-payment')
  async confirmPayment(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<null> {
    try {
      return await this.materialsService.confirmPaymentById(id);
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

  /**
   * 一键支付：批量确认订单下所有未支付的辅材
   * @param body 批量支付信息（包含订单ID）
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('batch-payment')
  async batchPayment(
    @Body(ValidationPipe) body: BatchPaymentMaterialsDto,
  ): Promise<null> {
    try {
      return await this.materialsService.batchConfirmPaymentByOrderId(
        body.orderId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '一键支付辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 一键验收：批量验收指定的辅材（通过辅材ID列表）
   * @param body 批量验收信息（包含辅材ID列表）
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('batch-accept')
  async batchAccept(
    @Body(ValidationPipe) body: BatchAcceptMaterialsDto,
  ): Promise<null> {
    try {
      return await this.materialsService.batchAcceptByMaterialsIds(
        body.materialsIds,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '一键验收辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
