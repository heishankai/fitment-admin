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
import { LabourCostService } from './labour-cost.service';
import { LabourCost } from './labour-cost.entity';
import { CreateLabourCostDto } from './dto/create-labour-cost.dto';
import { QueryLabourCostDto } from './dto/query-labour-cost.dto';
import { UpdateLabourCostDto } from './dto/update-labour-cost.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('labour-cost')
export class LabourCostController {
  constructor(private readonly labourCostService: LabourCostService) {}

  /**
   * 获取所有人工成本配置
   * @returns 所有人工成本配置列表
   */
  @Get()
  async getAllLabourCosts(): Promise<LabourCost[]> {
    return await this.labourCostService.getAllLabourCosts();
  }

  /**
   * 分页查询人工成本配置
   * @param queryDto 查询参数 {pageIndex, pageSize, labour_cost_name}
   * @returns 分页结果
   */
  @Post('page')
  async getLabourCostsByPage(
    @Body(ValidationPipe) queryDto: QueryLabourCostDto,
  ): Promise<any> {
    return await this.labourCostService.getLabourCostsByPage(queryDto);
  }

  /**
   * 新增人工成本配置
   * @param createDto 人工成本配置信息
   * @param req 请求对象，包含用户信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateLabourCostDto,
    @Request() req: any,
  ): Promise<null> {
    return await this.labourCostService.create(createDto);
  }

  /**
   * 根据ID获取人工成本配置
   * @param id 人工成本配置ID
   * @returns 人工成本配置记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<LabourCost> {
    return await this.labourCostService.findOne(id);
  }

  /**
   * 根据ID更新人工成本配置
   * @param id 人工成本配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateLabourCostDto,
  ): Promise<null> {
    return await this.labourCostService.update(id, updateDto);
  }

  /**
   * 根据ID删除人工成本配置
   * @param id 人工成本配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.labourCostService.delete(id);
  }
}

