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
import { WorkTypeService } from './work-type.service';
import { WorkType } from './work-type.entity';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { QueryWorkTypeDto } from './dto/query-work-type.dto';
import { UpdateWorkTypeDto } from './dto/update-work-type.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('work-type')
export class WorkTypeController {
  constructor(private readonly workTypeService: WorkTypeService) {}

  /**
   * 分页查询工种类型
   * @param queryDto 查询参数 {pageIndex, pageSize, work_title}
   * @returns 分页结果
   */
  @Post('page')
  async getWorkTypesByPage(
    @Body(ValidationPipe) queryDto: QueryWorkTypeDto,
  ): Promise<any> {
    return await this.workTypeService.getWorkTypesByPage(queryDto);
  }

  /**
   * 新增工种类型
   * @param createWorkTypeDto 工种类型信息
   * @param req 请求对象，包含用户信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createWorkType(
    @Body(ValidationPipe) createWorkTypeDto: CreateWorkTypeDto,
    @Request() req: any,
  ): Promise<null> {
    return await this.workTypeService.createWorkType(createWorkTypeDto);
  }

  /**
   * 根据工种ID查询所有工价数据
   * @param workKindId 工种ID
   * @returns 工价数据列表
   */
  @Get('work-kind/:workKindId')
  async getWorkTypesByWorkKindId(
    @Param('workKindId') workKindId: string,
  ): Promise<WorkType[]> {
    return await this.workTypeService.getWorkTypesByWorkKindId(workKindId);
  }

  /**
   * 根据ID获取工种类型
   * @param id 工种类型ID
   * @returns 工种类型记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<WorkType> {
    return await this.workTypeService.findOne(id);
  }

  /**
   * 根据ID更新工种类型
   * @param id 工种类型ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async updateWorkType(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateWorkTypeDto,
  ): Promise<null> {
    return await this.workTypeService.updateWorkType(id, updateDto);
  }

  /**
   * 根据ID删除工种类型
   * @param id 工种类型ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async deleteWorkType(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.workTypeService.deleteWorkType(id);
  }
}
