import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TestService } from './test.service';
import { UseFilters } from '@nestjs/common';
import { HttpExceptionFilter } from './exception/http-exception.filter';

@Controller('api')
export class TextController {
  constructor(private readonly testService: TestService) {}

  @Get('/textController/:id')
  @UseFilters(new HttpExceptionFilter())
  getHello(@Param() params): string {
    console.log('params', params);
    if (!params?.id) {
      throw new HttpException('参数错误,id是必填', HttpStatus.BAD_REQUEST);
    }

    if (!Number.isInteger(params?.id)) {
      throw new HttpException('参数错误,id必须是整数', HttpStatus.BAD_REQUEST);
    }
    return this.testService.getData();
  }
}
