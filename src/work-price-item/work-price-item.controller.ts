import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { WorkPriceItemService } from './work-price-item.service';
import { WorkPriceItem } from './work-price-item.entity';
import { CreateWorkPriceItemsDto } from './dto/create-work-price-items.dto';
import { MaterialsResponseDto } from '../materials/dto/materials-response.dto';
import { ConstructionProgressService } from '../construction-progress/construction-progress.service';
import { ConstructionProgress } from '../construction-progress/construction-progress.entity';

@Controller('work-price-item')
export class WorkPriceItemController {
  constructor(
    private readonly workPriceItemService: WorkPriceItemService,
    private readonly constructionProgressService: ConstructionProgressService,
  ) {}

  /**
   * 根据订单ID查询工价项列表
   * @param orderId 订单ID
   * @returns 工价项列表
   */
  @Get('order/:orderId')
  async findByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<WorkPriceItem[]> {
    try {
      return await this.workPriceItemService.findByOrderId(orderId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据ID查询工价项
   * @param id 工价项ID
   * @returns 工价项
   */
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WorkPriceItem> {
    try {
      return await this.workPriceItemService.findById(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建工价项
   * @param body 工价项数据
   * @returns 创建的工价项
   */
  @Post()
  async create(
    @Body(ValidationPipe) body: Partial<WorkPriceItem>,
  ): Promise<WorkPriceItem> {
    try {
      return await this.workPriceItemService.create(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 批量创建工价项
   * @param body 工价项数据数组
   * @returns 创建的工价项列表
   */
  @Post('batch')
  async createBatch(
    @Body(ValidationPipe) body: { items: Partial<WorkPriceItem>[] },
  ): Promise<WorkPriceItem[]> {
    try {
      return await this.workPriceItemService.createBatch(body.items);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '批量创建工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据前端数据格式创建工价项（主工价）
   * @param body 前端传递的工价数据
   * @returns 创建的工价项列表
   */
  @Post('create')
  async createFromFrontendData(
    @Body(ValidationPipe) body: CreateWorkPriceItemsDto,
  ): Promise<WorkPriceItem[]> {
    try {
      return await this.workPriceItemService.createFromFrontendData(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新工价项
   * @param id 工价项ID
   * @param body 更新数据
   * @returns 更新后的工价项
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) body: Partial<WorkPriceItem>,
  ): Promise<WorkPriceItem> {
    try {
      return await this.workPriceItemService.update(id, body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '更新工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据工价ID将工价变为支付状态
   * @param id 工价项ID
   * @returns 更新后的工价项
   */
  @Put(':id/pay')
  async markAsPaid(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WorkPriceItem> {
    try {
      return await this.workPriceItemService.markAsPaid(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '更新工价支付状态失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除工价项
   * @param id 工价项ID
   * @returns null
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    try {
      return await this.workPriceItemService.delete(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '删除工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询主工价项
   * @param orderId 订单ID
   * @returns 主工价项列表
   */
  @Get('order/:orderId/main')
  async findMainWorkPriceItems(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<WorkPriceItem[]> {
    try {
      return await this.workPriceItemService.findMainWorkPriceItems(orderId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询主工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询子工价项
   * @param parentId 主工价项ID
   * @returns 子工价项列表
   */
  @Get('parent/:parentId/sub')
  async findSubWorkPriceItems(
    @Param('parentId', ParseIntPipe) parentId: number,
  ): Promise<WorkPriceItem[]> {
    try {
      return await this.workPriceItemService.findSubWorkPriceItems(parentId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '查询子工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据订单ID查询所有子工价组
   * @param orderId 订单ID
   * @returns 子工价组列表，每个组包含统计信息
   */
  @Get('order/:orderId/sub-groups')
  async findSubWorkPriceGroupsByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<any[]> {
    try {
      return await this.workPriceItemService.findSubWorkPriceGroupsByOrderId(
        orderId,
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
   * 根据工价项ID和工匠ID查询辅材列表
   * @param workPriceItemId 工价项ID
   * @param craftsmanId 工匠ID
   * @returns 辅材响应数据（包含商品列表和总价）
   */
  @Get(':workPriceItemId/materials/craftsman/:craftsmanId')
  async getMaterialsByWorkPriceItemIdAndCraftsmanId(
    @Param('workPriceItemId', ParseIntPipe) workPriceItemId: number,
    @Param('craftsmanId', ParseIntPipe) craftsmanId: number,
  ): Promise<MaterialsResponseDto> {
    try {
      return await this.workPriceItemService.getMaterialsByWorkPriceItemIdAndCraftsmanId(
        workPriceItemId,
        craftsmanId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('查询辅材失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 根据工价项ID和工匠ID查询对应分配订单的施工进度
   * @param workPriceItemId 工价项ID
   * @param craftsmanId 工匠ID
   * @returns 施工进度列表
   */
  @Get(':workPriceItemId/construction-progress/craftsman/:craftsmanId')
  async getConstructionProgressByWorkPriceItemIdAndCraftsmanId(
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
