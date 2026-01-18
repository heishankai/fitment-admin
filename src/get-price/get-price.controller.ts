import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { GetPriceService } from './get-price.service';
import { GetPriceGateway } from './get-price.gateway';
import { GetPrice } from './get-price.entity';
import { CreateGetPriceDto } from './dto/create-get-price.dto';
import { QueryGetPriceDto } from './dto/query-get-price.dto';
import { UpdateGetPriceDto } from './dto/update-get-price.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('get-price')
export class GetPriceController {
  constructor(
    private readonly getPriceService: GetPriceService,
    private readonly getPriceGateway: GetPriceGateway,
  ) {}

  /**
   * 分页查询获取报价记录
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  @Post('page')
  async getGetPricesByPage(
    @Body(ValidationPipe) queryDto: QueryGetPriceDto,
  ): Promise<any> {
    return await this.getPriceService.getGetPricesByPage(queryDto);
  }

  /**
   * 新增获取报价记录
   * @param createGetPriceDto 获取报价信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createGetPrice(
    @Body(ValidationPipe) createGetPriceDto: CreateGetPriceDto,
  ): Promise<null> {
    // 创建记录（服务内部会自动创建通知）
    await this.getPriceService.createGetPrice(createGetPriceDto);
    
    return null;
  }

  /**
   * 根据ID获取获取报价记录
   * @param id 获取报价ID
   * @returns 获取报价记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<GetPrice> {
    return await this.getPriceService.findOne(id);
  }

  /**
   * 根据ID更新获取报价记录
   * @param id 获取报价ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async updateGetPrice(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateGetPriceDto,
  ): Promise<null> {
    return await this.getPriceService.updateGetPrice(id, updateDto);
  }

  /**
   * 根据ID删除获取报价记录
   * @param id 获取报价ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async deleteGetPrice(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.getPriceService.deleteGetPrice(id);
  }
}

