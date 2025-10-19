import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Request,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { CommodityConfigService } from './commodity-config.service';
import { CommodityConfig } from './commodity-config.entity';
import { CreateCommodityConfigDto } from './dto/create-commodity-config.dto';
import { QueryCommodityConfigDto } from './dto/query-commodity-config.dto';
import { UpdateCommodityConfigDto } from './dto/update-commodity-config.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('commodity-config')
export class CommodityConfigController {
  constructor(private readonly commodityConfigService: CommodityConfigService) {}

  /**
   * 获取所有商品配置
   * @returns 所有商品配置列表
   */
  @Get()
  async getAllCommodityConfigs(): Promise<CommodityConfig[]> {
    return await this.commodityConfigService.getAllCommodityConfigs();
  }

  /**
   * 分页查询商品配置
   * @param queryDto 查询参数 {pageIndex, pageSize, commodity_name, category_id, category_name}
   * @returns 分页结果
   */
  @Post('page')
  async getCommodityConfigsByPage(
    @Body(ValidationPipe) queryDto: QueryCommodityConfigDto,
  ): Promise<any> {
    return await this.commodityConfigService.getCommodityConfigsByPage(queryDto);
  }

  /**
   * 新增商品配置
   * @param createDto 商品配置信息
   * @param req 请求对象，包含用户信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateCommodityConfigDto,
    @Request() req: any,
  ): Promise<null> {
    return await this.commodityConfigService.create(createDto);
  }

  /**
   * 根据ID获取商品配置
   * @param id 商品配置ID
   * @returns 商品配置记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CommodityConfig> {
    return await this.commodityConfigService.findOne(id);
  }

  /**
   * 根据ID更新商品配置
   * @param id 商品配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateCommodityConfigDto,
  ): Promise<null> {
    return await this.commodityConfigService.update(id, updateDto);
  }

  /**
   * 根据ID删除商品配置
   * @param id 商品配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.commodityConfigService.delete(id);
  }
}
