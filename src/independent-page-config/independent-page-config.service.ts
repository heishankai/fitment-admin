import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateIndependentPageConfigDto } from './dto/create-independent-page-config.dto';
import { UpdateIndependentPageConfigDto } from './dto/update-independent-page-config.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IndependentPageConfig } from './entities/independent-page-config.entity';
import { Repository } from 'typeorm';

@Injectable()
export class IndependentPageConfigService {
  constructor(
    @InjectRepository(IndependentPageConfig)
    private readonly independentPageConfigRepository: Repository<IndependentPageConfig>,
  ) {}

  /**
   * 创建独立页面配置
   * @param createIndependentPageConfigDto 创建独立页面配置的数据传输对象
   * @returns 创建的独立页面配置
   */
  async create(
    createIndependentPageConfigDto: CreateIndependentPageConfigDto,
  ): Promise<null> {
    // 测试用
    // return null;
    const config = this.independentPageConfigRepository.create(
      createIndependentPageConfigDto,
    );
    console.log(config);
    await this.independentPageConfigRepository.save(config);
    return null;
  }

  /**
   * 获取最新一条独立页面配置
   * @return 最新的一条独立页面配置
   */
  async findLastOne() {
    try {
      const configs = await this.independentPageConfigRepository.find({
        order: {
          createdAt: 'DESC',
        },
        take: 1,
      });
      return configs.length > 0 ? configs[0] : null;
    } catch (error) {
      throw new BadRequestException('获取独立页面配置失败: ' + error.message);
    }
  }

  /**
   * 获取最新一条独立页面配置中的title
   * @returns 最新一条独立页面配置的title
   */
  async findLastOneTitle() {
    const config = await this.findLastOne();
    return config ? config.title : null;
  }

  findAll() {
    return `This action returns all independentPageConfig`;
  }

  findOne(id: number) {
    return `This action returns a #${id} independentPageConfig`;
  }

  /**
   * 更新独立页面配置
   * @param id 独立页面配置ID
   * @param updateIndependentPageConfigDto 更新独立页面配置的数据传输对象
   * @returns 更新后的独立页面配置
   */
  async update(
    id: number,
    updateIndependentPageConfigDto: UpdateIndependentPageConfigDto,
  ) {
    //检查是否存在
    const config = await this.independentPageConfigRepository.findOne({
      where: { id },
    });
    if (!config) {
      throw new BadRequestException('独立页面配置不存在');
    }

    await this.independentPageConfigRepository.update(
      id,
      updateIndependentPageConfigDto,
    );
    return null;
  }

  remove(id: number) {
    return `This action removes a #${id} independentPageConfig`;
  }
}
