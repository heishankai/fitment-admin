import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Put,
} from '@nestjs/common';
import { WechatAddressService } from './wechat-address.service';
import { CreateWechatAddressDto } from './dto/create-wechat-address.dto';
import { UpdateWechatAddressDto } from './dto/update-wechat-address.dto';
import { QueryWechatAddressDto } from './dto/query-wechat-address.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('wechat-address')
@UseGuards(AuthGuard)
export class WechatAddressController {
  constructor(private readonly wechatAddressService: WechatAddressService) {}

  /**
   * 分页查询微信地址列表
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  @Get()
  findAll(@Query() queryDto: QueryWechatAddressDto) {
    return this.wechatAddressService.findAll(queryDto);
  }

  /**
   * 根据ID查询微信地址详情
   * @param id 地址ID
   * @returns 地址详情
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.wechatAddressService.findOne(id);
  }

  /**
   * 创建微信地址
   * @param createWechatAddressDto 创建地址数据
   * @returns 创建的地址信息
   */
  @Post()
  create(@Body() createWechatAddressDto: CreateWechatAddressDto) {
    return this.wechatAddressService.create(createWechatAddressDto);
  }

  /**
   * 根据微信用户ID分页查询地址列表
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  @Post('page')
  findByWechatUserId(@Body() queryDto: QueryWechatAddressDto) {
    return this.wechatAddressService.findAll(queryDto);
  }

  /**
   * 更新微信地址
   * @param id 地址ID
   * @param updateWechatAddressDto 更新数据
   * @returns 更新后的地址信息
   */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWechatAddressDto: UpdateWechatAddressDto,
  ) {
    return this.wechatAddressService.update(id, updateWechatAddressDto);
  }

  /**
   * 删除微信地址
   * @param id 地址ID
   * @returns 删除结果
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.wechatAddressService.remove(id);
  }
}
