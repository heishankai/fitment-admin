import { IsOptional, IsNumber, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPaymentRecordDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  @IsOptional()
  @IsString()
  payment_type?: string;

  @IsOptional()
  @IsString()
  order_no?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'start_date 格式必须为 YYYY-MM-DD',
  })
  start_date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'end_date 格式必须为 YYYY-MM-DD',
  })
  end_date?: string;
}
