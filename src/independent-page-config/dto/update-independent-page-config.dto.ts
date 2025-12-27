import { PartialType } from '@nestjs/mapped-types';
import { CreateIndependentPageConfigDto } from './create-independent-page-config.dto';

export class UpdateIndependentPageConfigDto extends PartialType(
  CreateIndependentPageConfigDto,
) {}
