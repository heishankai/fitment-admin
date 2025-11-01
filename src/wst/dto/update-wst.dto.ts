import { PartialType } from '@nestjs/mapped-types';
import { CreateWstDto } from './create-wst.dto';

/**
 * 更新WST的数据传输对象
 * 继承自CreateWstDto，使所有字段变为可选
 * 用于定义更新WST记录时所需的数据结构
 */
export class UpdateWstDto extends PartialType(CreateWstDto) {
  /**
   * WST记录的唯一标识符
   * 用于指定要更新的记录
   */
  id: number;
}
