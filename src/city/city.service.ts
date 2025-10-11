import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './city.entity';
import { CreateCityDto } from './dto/create-city.dto';
import { BatchCreateCityDto } from './dto/batch-create-city.dto';

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  /**
   * 创建单个城市
   * @param createCityDto 城市数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async createCity(createCityDto: CreateCityDto): Promise<null> {
    try {
      // 检查城市代码是否已存在
      const existingCity = await this.cityRepository.findOne({
        where: { city_code: createCityDto.city_code },
      });

      if (existingCity) {
        throw new BadRequestException('城市代码已存在');
      }

      // 创建城市记录
      const city = this.cityRepository.create(createCityDto);
      await this.cityRepository.save(city);

      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('创建城市失败: ' + error.message);
    }
  }

  /**
   * 批量创建城市
   * @param batchCreateDto 批量城市数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async batchCreateCities(batchCreateDto: BatchCreateCityDto): Promise<null> {
    try {
      const { cities } = batchCreateDto;

      // 检查是否有重复的城市代码
      const cityCodes = cities.map(city => city.city_code);
      const uniqueCityCodes = [...new Set(cityCodes)];
      
      if (cityCodes.length !== uniqueCityCodes.length) {
        throw new BadRequestException('城市代码不能重复');
      }

      // 检查数据库中是否已存在这些城市代码
      const existingCities = await this.cityRepository.find({
        where: cityCodes.map(code => ({ city_code: code })),
      });

      if (existingCities.length > 0) {
        const existingCodes = existingCities.map(city => city.city_code);
        throw new BadRequestException(`以下城市代码已存在: ${existingCodes.join(', ')}`);
      }

      // 批量创建城市记录
      const cityEntities = this.cityRepository.create(cities);
      await this.cityRepository.save(cityEntities);

      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('批量创建城市失败: ' + error.message);
    }
  }

  /**
   * 获取所有城市
   * @returns 城市列表
   */
  async getAllCities(): Promise<City[]> {
    try {
      return await this.cityRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new BadRequestException('获取城市列表失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取城市
   * @param id 城市ID
   * @returns 城市信息
   */
  async getCityById(id: number): Promise<City> {
    try {
      const city = await this.cityRepository.findOne({
        where: { id },
      });

      if (!city) {
        throw new BadRequestException('城市不存在');
      }

      return city;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('获取城市信息失败: ' + error.message);
    }
  }

  /**
   * 根据城市代码获取城市
   * @param cityCode 城市代码
   * @returns 城市信息
   */
  async getCityByCode(cityCode: string): Promise<City> {
    try {
      const city = await this.cityRepository.findOne({
        where: { city_code: cityCode },
      });

      if (!city) {
        throw new BadRequestException('城市不存在');
      }

      return city;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('获取城市信息失败: ' + error.message);
    }
  }
}
