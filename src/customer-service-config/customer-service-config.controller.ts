import { Body, Controller, Get, Put, ValidationPipe } from '@nestjs/common';
import { CustomerServiceConfigService } from './customer-service-config.service';
import { UpdateCustomerServiceConfigDto } from './dto/update-customer-service-config.dto';

@Controller('customer-service-config')
export class CustomerServiceConfigController {
  constructor(
    private readonly customerServiceConfigService: CustomerServiceConfigService,
  ) {}

  @Get()
  async getConfig() {
    return await this.customerServiceConfigService.getConfig();
  }

  @Put()
  async updateConfig(
    @Body(ValidationPipe) body: UpdateCustomerServiceConfigDto,
  ): Promise<null> {
    await this.customerServiceConfigService.saveConfig(body);
    return null;
  }
}
