import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import { IndependentPageConfigService } from './independent-page-config.service';
import { CreateIndependentPageConfigDto } from './dto/create-independent-page-config.dto';
import { UpdateIndependentPageConfigDto } from './dto/update-independent-page-config.dto';

@Controller('independent-page-config')
export class IndependentPageConfigController {
  constructor(
    private readonly independentPageConfigService: IndependentPageConfigService,
  ) {}

  /**
   * 创建独立页面配置
   * @param createIndependentPageConfigDto 创建独立页面配置的数据传输对象
   * @returns 创建的独立页面配置
   */
  @Post()
  create(
    @Body(new ValidationPipe({ whitelist: true }))
    createIndependentPageConfigDto: CreateIndependentPageConfigDto,
  ) {
    console.log(createIndependentPageConfigDto);
    return this.independentPageConfigService.create(
      createIndependentPageConfigDto,
    );
  }

  /**
   * 获取最新一条独立页面配置
   * @returns 独立页面配置
   */
  @Get()
  findLastOne() {
    return this.independentPageConfigService.findLastOne();
  }

  /**
   * 获取最新一条独立页面配置中的title
   * @returns 独立页面配置中的title
   */
  @Get('title')
  async findLastOneTitle() {
    const title = await this.independentPageConfigService.findLastOneTitle();
    return {
      title,
    };
  }

  /**
   * 更新独立页面配置
   * @param id 独立页面配置ID
   * @param updateIndependentPageConfigDto 更新独立页面配置的数据传输对象
   * @returns 更新后的独立页面配置
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIndependentPageConfigDto: UpdateIndependentPageConfigDto,
  ) {
    return this.independentPageConfigService.update(
      +id,
      updateIndependentPageConfigDto,
    );
  }
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.independentPageConfigService.findOne(+id);
  // }
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.independentPageConfigService.remove(+id);
  // }
}
