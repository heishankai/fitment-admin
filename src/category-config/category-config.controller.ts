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
import { CategoryConfigService } from './category-config.service';
import { CategoryConfig } from './category-config.entity';
import { CreateCategoryConfigDto } from './dto/create-category-config.dto';
import { QueryCategoryConfigDto } from './dto/query-category-config.dto';
import { UpdateCategoryConfigDto } from './dto/update-category-config.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('category-config')
export class CategoryConfigController {
  constructor(private readonly categoryConfigService: CategoryConfigService) {}

  /**
   * 获取所有类目配置
   * @returns 所有类目配置列表
   */
  @Get()
  async getAllCategoryConfigs(): Promise<CategoryConfig[]> {
    return await this.categoryConfigService.getAllCategoryConfigs();
  }

  /**
   * 分页查询类目配置
   * @param queryDto 查询参数 {pageIndex, pageSize, category_name}
   * @returns 分页结果
   */
  @Post('page')
  async getCategoryConfigsByPage(
    @Body(ValidationPipe) queryDto: QueryCategoryConfigDto,
  ): Promise<any> {
    return await this.categoryConfigService.getCategoryConfigsByPage(queryDto);
  }

  /**
   * 新增类目配置
   * @param createDto 类目配置信息
   * @param req 请求对象，包含用户信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateCategoryConfigDto,
    @Request() req: any,
  ): Promise<null> {
    return await this.categoryConfigService.create(createDto);
  }

  /**
   * 根据ID获取类目配置
   * @param id 类目配置ID
   * @returns 类目配置记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CategoryConfig> {
    return await this.categoryConfigService.findOne(id);
  }

  /**
   * 根据ID更新类目配置
   * @param id 类目配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateCategoryConfigDto,
  ): Promise<null> {
    return await this.categoryConfigService.update(id, updateDto);
  }

  /**
   * 根据ID删除类目配置
   * @param id 类目配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.categoryConfigService.delete(id);
  }
}
