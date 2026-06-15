import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerServiceConfig } from './customer-service-config.entity';
import { UpdateCustomerServiceConfigDto } from './dto/update-customer-service-config.dto';

const SINGLETON_ID = 1;
const DEFAULT_WELCOME_TEXT = '欢迎使用智惠装，请问有什么可以帮助您的吗？';

@Injectable()
export class CustomerServiceConfigService {
  constructor(
    @InjectRepository(CustomerServiceConfig)
    private readonly configRepository: Repository<CustomerServiceConfig>,
  ) {}

  async getConfig(): Promise<CustomerServiceConfig> {
    let config = await this.configRepository.findOne({
      where: { id: SINGLETON_ID },
    });

    if (!config) {
      config = this.configRepository.create({
        id: SINGLETON_ID,
        avatar: '',
        welcome_text: DEFAULT_WELCOME_TEXT,
        welcome_image: '',
      });
      config = await this.configRepository.save(config);
    }

    if (!config.welcome_text) {
      config.welcome_text = DEFAULT_WELCOME_TEXT;
    }

    return config;
  }

  async saveConfig(dto: UpdateCustomerServiceConfigDto): Promise<void> {
    const current = await this.getConfig();
    current.avatar = dto.avatar?.trim() || '';
    current.welcome_text = dto.welcome_text?.trim() || DEFAULT_WELCOME_TEXT;
    current.welcome_image = dto.welcome_image?.trim() || '';
    await this.configRepository.save(current);
  }

  async getWelcomeText(): Promise<string> {
    const config = await this.getConfig();
    return config.welcome_text || DEFAULT_WELCOME_TEXT;
  }
}
