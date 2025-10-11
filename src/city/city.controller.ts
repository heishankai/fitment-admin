import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CityService } from './city.service';
import { City } from './city.entity';
import { CreateCityDto } from './dto/create-city.dto';
import { BatchCreateCityDto } from './dto/batch-create-city.dto';

@Controller('city')
@Public() // 整个控制器都不需要权限验证
export class CityController {
  constructor(private readonly cityService: CityService) {}

  /**
   * 创建单个城市
   * @param createCityDto 城市数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createCity(
    @Body(ValidationPipe) createCityDto: CreateCityDto,
  ): Promise<null> {
    return await this.cityService.createCity(createCityDto);
  }

  /**
   * 批量创建城市
   * @param batchCreateDto 批量城市数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post('batch')
  async batchCreateCities(
    @Body(ValidationPipe) batchCreateDto: BatchCreateCityDto,
  ): Promise<null> {
    return await this.cityService.batchCreateCities(batchCreateDto);
  }

  /**
   * 获取所有城市
   * @returns 城市列表
   */
  @Get()
  async getAllCities(): Promise<City[]> {
    return await this.cityService.getAllCities();
  }

  /**
   * 根据ID获取城市
   * @param id 城市ID
   * @returns 城市信息
   */
  @Get(':id')
  async getCityById(@Param('id', ParseIntPipe) id: number): Promise<City> {
    return await this.cityService.getCityById(id);
  }

  /**
   * 根据城市代码获取城市
   * @param cityCode 城市代码
   * @returns 城市信息
   */
  @Get('code/:cityCode')
  async getCityByCode(@Param('cityCode') cityCode: string): Promise<City> {
    return await this.cityService.getCityByCode(cityCode);
  }
}
