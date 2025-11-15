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
import { WorkKindService } from './work-kind.service';
import { WorkKind } from './work-kind.entity';
import { CreateWorkKindDto } from './dto/create-work-kind.dto';
import { QueryWorkKindDto } from './dto/query-work-kind.dto';
import { UpdateWorkKindDto } from './dto/update-work-kind.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('work-kind')
export class WorkKindController {
  constructor(private readonly workKindService: WorkKindService) {}

  /**
   * 获取所有工种配置
   * @returns 所有工种配置列表
   */
  @Get()
  async getAllWorkKinds(): Promise<WorkKind[]> {
    return await this.workKindService.getAllWorkKinds();
  }

  /**
   * 分页查询工种配置
   * @param queryDto 查询参数 {pageIndex, pageSize, work_kind_name}
   * @returns 分页结果
   */
  @Post('page')
  async getWorkKindsByPage(
    @Body(ValidationPipe) queryDto: QueryWorkKindDto,
  ): Promise<any> {
    return await this.workKindService.getWorkKindsByPage(queryDto);
  }

  /**
   * 新增工种配置
   * @param createDto 工种配置信息
   * @param req 请求对象，包含用户信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateWorkKindDto,
    @Request() req: any,
  ): Promise<null> {
    return await this.workKindService.create(createDto);
  }

  /**
   * 根据ID获取工种配置
   * @param id 工种配置ID
   * @returns 工种配置记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<WorkKind> {
    return await this.workKindService.findOne(id);
  }

  /**
   * 根据ID更新工种配置
   * @param id 工种配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateWorkKindDto,
  ): Promise<null> {
    return await this.workKindService.update(id, updateDto);
  }

  /**
   * 根据ID删除工种配置
   * @param id 工种配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.workKindService.delete(id);
  }
}

