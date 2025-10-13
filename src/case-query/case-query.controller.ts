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
import { CaseQueryService } from './case-query.service';
import { CaseQuery } from './case-query.entity';
import { CreateCaseQueryDto } from './dto/create-case-query.dto';
import { QueryCaseQueryDto } from './dto/query-case-query.dto';
import { UpdateCaseQueryDto } from './dto/update-case-query.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('case-query')
export class CaseQueryController {
  constructor(private readonly caseQueryService: CaseQueryService) {}

  /**
   * 分页查询案例查询记录
   * @param queryDto 查询参数 {pageIndex, pageSize, housing_name, city_code, housing_type, city_name}
   * @returns 分页结果
   */
  @Post('page')
  async getCaseQueriesByPage(
    @Body(ValidationPipe) queryDto: QueryCaseQueryDto,
  ): Promise<any> {
    return await this.caseQueryService.getCaseQueriesByPage(queryDto);
  }

  /**
   * 新增案例查询记录
   * @param createCaseQueryDto 案例信息
   * @param req 请求对象，包含用户信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createCaseQuery(
    @Body(ValidationPipe) createCaseQueryDto: CreateCaseQueryDto,
    @Request() req: any,
  ): Promise<null> {
    return await this.caseQueryService.createCaseQuery(createCaseQueryDto);
  }

  /**
   * 根据ID获取案例查询记录
   * @param id 案例查询ID
   * @returns 案例查询记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CaseQuery> {
    return await this.caseQueryService.findOne(id);
  }

  /**
   * 根据ID更新案例查询记录
   * @param id 案例查询ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async updateCaseQuery(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateCaseQueryDto,
  ): Promise<null> {
    return await this.caseQueryService.updateCaseQuery(id, updateDto);
  }

  /**
   * 根据ID删除案例查询记录
   * @param id 案例查询ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async deleteCaseQuery(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.caseQueryService.deleteCaseQuery(id);
  }
}
