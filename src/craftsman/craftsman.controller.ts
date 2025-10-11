import { Controller, Get, Param, Post, Body } from '@nestjs/common';
// entitly
import { Craftsman } from './craftsman.entity';
// service
import { CraftsmanService } from './craftsman.service';

@Controller('admin/craftsmen')
export class CraftsmanController {
  constructor(private readonly craftsmanService: CraftsmanService) {}

  /**
   * 分页查询
   * @param craftsman_name 工匠姓名(模糊匹配)
   * @param craftsman_phone 工匠电话(精准匹配)
   * @param pageIndex 页码(从1开始)
   * @param pageSize 页大小(默认10条/页)
   * @returns 分页结果
   */
  @Post('page')
  async getCraftsmenByPage(@Body() body): Promise<any> {
    return await this.craftsmanService.getCraftsmenByPage(body);
  }

  /**
   * 创建工匠
   * @param body 工匠信息
   * @returns
   */
  @Post()
  async createCraftsman(@Body() body: Craftsman): Promise<Craftsman> {
    return await this.craftsmanService.createCraftsman(body);
  }

  /**
   * 获取所有工匠
   * @returns
   */
  @Get()
  async getAllCraftsmen(): Promise<Craftsman[]> {
    return await this.craftsmanService.getAllCraftsmen();
  }

  /**
   * 获取单个工匠
   * @param id 工匠id
   * @returns
   */
  @Get(':id')
  async getOneCraftsman(@Param('id') id: string): Promise<Craftsman | null> {
    return await this.craftsmanService.getOneCraftsman(+id);
  }
}
