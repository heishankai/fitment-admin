import { Controller, Post, Get, Put, Delete, Body, Param, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { WholeHouseConfigService } from './whole-house-config.service';
import { CreateWholeHouseConfigDto } from './dto/create-whole-house-config.dto';
import { QueryWholeHouseConfigDto } from './dto/query-whole-house-config.dto';
import { UpdateWholeHouseConfigDto } from './dto/update-whole-house-config.dto';
import { WholeHouseConfig } from './whole-house-config.entity';

@Controller('whole-house-config')
export class WholeHouseConfigController {
  constructor(
    private readonly wholeHouseConfigService: WholeHouseConfigService,
  ) {}

  /**
   * 分页查询全屋配置
   * @param queryDto 查询参数 {pageIndex, pageSize, category_name}
   * @returns 分页结果
   */
  @Post('page')
  async getWholeHouseConfigsByPage(
    @Body(ValidationPipe) queryDto: QueryWholeHouseConfigDto,
  ): Promise<any> {
    return await this.wholeHouseConfigService.getWholeHouseConfigsByPage(queryDto);
  }

  /**
   * 根据ID获取全屋配置
   * @param id 全屋配置ID
   * @returns 全屋配置记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<WholeHouseConfig> {
    return await this.wholeHouseConfigService.findOne(id);
  }

  /**
   * 根据ID更新全屋配置
   * @param id 全屋配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateWholeHouseConfigDto,
  ): Promise<null> {
    return await this.wholeHouseConfigService.update(id, updateDto);
  }

  /**
   * 根据ID删除全屋配置
   * @param id 全屋配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.wholeHouseConfigService.delete(id);
  }

  /**
   * 新增全屋配置
   * @param createDto 全屋配置数据
   * @returns 创建的配置
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateWholeHouseConfigDto,
  ): Promise<null> {
    return await this.wholeHouseConfigService.create(createDto);
  }
}
