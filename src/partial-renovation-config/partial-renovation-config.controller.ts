import { Controller, Post, Get, Put, Delete, Body, Param, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { PartialRenovationConfigService } from './partial-renovation-config.service';
import { CreatePartialRenovationConfigDto } from './dto/create-partial-renovation-config.dto';
import { QueryPartialRenovationConfigDto } from './dto/query-partial-renovation-config.dto';
import { UpdatePartialRenovationConfigDto } from './dto/update-partial-renovation-config.dto';
import { PartialRenovationConfig } from './partial-renovation-config.entity';

@Controller('partial-renovation-config')
export class PartialRenovationConfigController {
  constructor(
    private readonly partialRenovationConfigService: PartialRenovationConfigService,
  ) {}

  /**
   * 分页查询局部装修配置
   * @param queryDto 查询参数 {pageIndex, pageSize, category_name}
   * @returns 分页结果
   */
  @Post('page')
  async getPartialRenovationConfigsByPage(
    @Body(ValidationPipe) queryDto: QueryPartialRenovationConfigDto,
  ): Promise<any> {
    return await this.partialRenovationConfigService.getPartialRenovationConfigsByPage(queryDto);
  }

  /**
   * 根据ID获取局部装修配置
   * @param id 局部装修配置ID
   * @returns 局部装修配置记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PartialRenovationConfig> {
    return await this.partialRenovationConfigService.findOne(id);
  }

  /**
   * 根据ID更新局部装修配置
   * @param id 局部装修配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdatePartialRenovationConfigDto,
  ): Promise<null> {
    return await this.partialRenovationConfigService.update(id, updateDto);
  }

  /**
   * 根据ID删除局部装修配置
   * @param id 局部装修配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.partialRenovationConfigService.delete(id);
  }

  /**
   * 新增局部装修配置
   * @param createDto 局部装修配置数据
   * @returns 创建的配置
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreatePartialRenovationConfigDto,
  ): Promise<null> {
    return await this.partialRenovationConfigService.create(createDto);
  }
}
