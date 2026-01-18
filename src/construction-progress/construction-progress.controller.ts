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
import { ConstructionProgressService } from './construction-progress.service';
import { CreateConstructionProgressDto } from './dto/create-construction-progress.dto';
import { ConstructionProgress } from './construction-progress.entity';

@Controller('construction-progress')
export class ConstructionProgressController {
  constructor(
    private readonly constructionProgressService: ConstructionProgressService,
  ) {}

  /**
   * 根据订单ID查询施工进度列表
   * @param orderId 订单ID
   * @returns 施工进度列表
   */
  @Get('order/:orderId')
  async findByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<ConstructionProgress[]> {
    try {
      return await this.constructionProgressService.findByOrderId(orderId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询施工进度失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建施工进度（打卡）
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 施工进度信息
   * @returns 创建的施工进度
   */
  @Post()
  async create(
    @Request() request: any,
    @Body(ValidationPipe) body: CreateConstructionProgressDto,
  ): Promise<ConstructionProgress> {
    try {
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.constructionProgressService.create(body, userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建施工进度失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据工价项ID和工匠ID查询对应分配订单的施工进度
   * @param workPriceItemId 工价项ID
   * @param craftsmanId 工匠ID
   * @returns 施工进度列表
   */
  @Get('work-price-item/:workPriceItemId/craftsman/:craftsmanId')
  async findByWorkPriceItemIdAndCraftsmanId(
    @Param('workPriceItemId', ParseIntPipe) workPriceItemId: number,
    @Param('craftsmanId', ParseIntPipe) craftsmanId: number,
  ): Promise<ConstructionProgress[]> {
    try {
      return await this.constructionProgressService.findByWorkPriceItemIdAndCraftsmanId(
        workPriceItemId,
        craftsmanId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询施工进度失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
