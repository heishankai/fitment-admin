import { Body, Controller, Get, Put, ValidationPipe } from '@nestjs/common';
import { SmsNotifyConfigService } from 'src/sms-notify-config/sms-notify-config.service';
import { UpdateSmsNotifyConfigDto } from './dto/update-sms-notify-config.dto';

@Controller('sms-notify-config')
export class SmsNotifyConfigController {
  constructor(private readonly smsNotifyConfigService: SmsNotifyConfigService) {}

  @Get()
  async getConfig() {
    return await this.smsNotifyConfigService.getConfig();
  }

  @Put()
  async updatePhones(
    @Body(ValidationPipe) body: UpdateSmsNotifyConfigDto,
  ): Promise<null> {
    await this.smsNotifyConfigService.savePhones(body);
    return null;
  }
}
