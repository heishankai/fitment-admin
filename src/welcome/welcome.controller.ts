import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { WelcomeService } from './welcome.service';
import { Welcome } from './welcome.entity';
import { CreateWelcomeDto } from './dto/create-welcome.dto';
import { UpdateWelcomeDto } from './dto/update-welcome.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('welcome')
export class WelcomeController {
  constructor(private readonly welcomeService: WelcomeService) {}

  /**
   * 获取欢迎页配置（只会有一组数据）
   * @returns 欢迎页配置记录，如果不存在则返回 null
   */
  @Get()
  async getWelcome(): Promise<Welcome | null> {
    return await this.welcomeService.getWelcome();
  }

  /**
   * 创建欢迎页配置（只会有一组数据，如果已存在则不允许新增）
   * @param createDto 欢迎页配置信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateWelcomeDto,
  ): Promise<null> {
    return await this.welcomeService.create(createDto);
  }

  /**
   * 根据ID更新欢迎页配置
   * @param id 欢迎页配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateWelcomeDto,
  ): Promise<null> {
    return await this.welcomeService.update(id, updateDto);
  }
}
