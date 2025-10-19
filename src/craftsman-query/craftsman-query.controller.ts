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
import { CraftsmanQueryService } from './craftsman-query.service';
import { CraftsmanQuery } from './craftsman-query.entity';
import { CreateCraftsmanQueryDto } from './dto/create-craftsman-query.dto';
import { QueryCraftsmanQueryDto } from './dto/query-craftsman-query.dto';
import { UpdateCraftsmanQueryDto } from './dto/update-craftsman-query.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('craftsman-query')
export class CraftsmanQueryController {
  constructor(private readonly craftsmanQueryService: CraftsmanQueryService) {}

  /**
   * 分页查询工匠查询记录
   * @param queryDto 查询参数 {pageIndex, pageSize, craftsman_name, craftsman_skill, city_name, city_code}
   * @returns 分页结果
   */
  @Post('page')
  async getCraftsmanQueriesByPage(
    @Body(ValidationPipe) queryDto: QueryCraftsmanQueryDto,
  ): Promise<any> {
    return await this.craftsmanQueryService.getCraftsmanQueriesByPage(queryDto);
  }

  /**
   * 新增工匠查询记录
   * @param createCraftsmanQueryDto 工匠信息
   * @param req 请求对象，包含用户信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createCraftsmanQuery(
    @Body(ValidationPipe) createCraftsmanQueryDto: CreateCraftsmanQueryDto,
    @Request() req: any,
  ): Promise<null> {
    return await this.craftsmanQueryService.createCraftsmanQuery(createCraftsmanQueryDto);
  }

  /**
   * 根据ID获取工匠查询记录
   * @param id 工匠查询ID
   * @returns 工匠查询记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CraftsmanQuery> {
    return await this.craftsmanQueryService.findOne(id);
  }

  /**
   * 根据ID更新工匠查询记录
   * @param id 工匠查询ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async updateCraftsmanQuery(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateCraftsmanQueryDto,
  ): Promise<null> {
    return await this.craftsmanQueryService.updateCraftsmanQuery(id, updateDto);
  }

  /**
   * 根据ID删除工匠查询记录
   * @param id 工匠查询ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async deleteCraftsmanQuery(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.craftsmanQueryService.deleteCraftsmanQuery(id);
  }
}
