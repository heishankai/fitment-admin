import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CraftsmanBankCard } from './craftsman-bank-card.entity';
import { CreateCraftsmanBankCardDto } from './dto/create-craftsman-bank-card.dto';
import { UpdateCraftsmanBankCardDto } from './dto/update-craftsman-bank-card.dto';

@Injectable()
export class CraftsmanBankCardService {
  constructor(
    @InjectRepository(CraftsmanBankCard)
    private readonly bankCardRepository: Repository<CraftsmanBankCard>,
  ) {}

  /**
   * 查询工匠的银行卡信息
   * @param craftsmanUserId 工匠用户ID
   * @returns 银行卡信息
   */
  async findByCraftsmanUserId(
    craftsmanUserId: number,
  ): Promise<CraftsmanBankCard | null> {
    return await this.bankCardRepository.findOne({
      where: { craftsman_user_id: craftsmanUserId },
      relations: ['craftsman_user'],
    });
  }

  /**
   * 创建银行卡信息
   * @param craftsmanUserId 工匠用户ID
   * @param createDto 银行卡信息
   * @returns 创建的银行卡信息
   */
  async create(
    craftsmanUserId: number,
    createDto: CreateCraftsmanBankCardDto,
  ): Promise<CraftsmanBankCard> {
    // 检查是否已存在银行卡信息
    const existing = await this.bankCardRepository.findOne({
      where: { craftsman_user_id: craftsmanUserId },
    });

    if (existing) {
      throw new HttpException(
        '银行卡信息已存在，请使用更新接口',
        HttpStatus.BAD_REQUEST,
      );
    }

    const bankCard = this.bankCardRepository.create({
      ...createDto,
      craftsman_user_id: craftsmanUserId,
    });

    return await this.bankCardRepository.save(bankCard);
  }

  /**
   * 更新银行卡信息
   * @param craftsmanUserId 工匠用户ID
   * @param updateDto 更新的银行卡信息
   * @returns 更新后的银行卡信息
   */
  async update(
    craftsmanUserId: number,
    updateDto: UpdateCraftsmanBankCardDto,
  ): Promise<CraftsmanBankCard> {
    const bankCard = await this.bankCardRepository.findOne({
      where: { craftsman_user_id: craftsmanUserId },
    });

    if (!bankCard) {
      throw new HttpException(
        '银行卡信息不存在，请先创建',
        HttpStatus.NOT_FOUND,
      );
    }

    // 更新字段
    Object.assign(bankCard, updateDto);

    return await this.bankCardRepository.save(bankCard);
  }
}
