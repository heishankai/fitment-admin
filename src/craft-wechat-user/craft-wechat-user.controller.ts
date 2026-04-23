import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { CraftWechatUserService } from './craft-wechat-user.service';
import { Public } from '../auth/public.decorator';
import { CraftGetPhoneDto } from './dto/get-phone.dto';
import { QueryCraftWechatUserDto } from './dto/query-craft-wechat-user.dto';

@Public()
@Controller('craft-wechat-user')
export class CraftWechatUserController {
  constructor(
    private readonly craftWechatUserService: CraftWechatUserService,
  ) {}

  /** 微信 getPhoneNumber 的 code → 解密手机号并保存，is_contact 默认 false */
  @Post('phone')
  async savePhone(@Body() body: CraftGetPhoneDto) {
    return this.savePhonePayload(body);
  }

  /**
   * 与 POST `phone` 相同；兼容直接请求 `POST /craft-wechat-user`（仅 body 含 code 的场景）
   */
  @Post()
  async savePhoneAtRoot(@Body() body: CraftGetPhoneDto) {
    return this.savePhonePayload(body);
  }

  private async savePhonePayload(body: CraftGetPhoneDto) {
    const data = await this.craftWechatUserService.savePhoneNumberFromWechat(
      body.code,
    );
    return {
      success: true,
      data,
      code: 200,
      message: null,
    };
  }

  /** 分页；可选 phone 模糊查询 */
  @Post('page')
  async getCraftWechatUsersByPage(
    @Body(ValidationPipe) body: QueryCraftWechatUserDto,
  ) {
    return this.craftWechatUserService.getCraftWechatUsersByPage(body);
  }

  /** 将指定 id 的 is_contact 设为 true */
  @Patch(':id/contact')
  async setContact(@Param('id', ParseIntPipe) id: number) {
    const data = await this.craftWechatUserService.setContactTrue(id);
    return {
      success: true,
      data,
      code: 200,
      message: null,
    };
  }
}
