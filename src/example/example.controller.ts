import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiResponseDto } from '../common/dto/response.dto';

/**
 * 示例控制器 - 演示统一响应格式的使用
 */
@Controller('example')
export class ExampleController {
  /**
   * 成功响应示例
   * GET /example/success
   */
  @Get('success')
  getSuccessExample() {
    // 直接返回数据，响应拦截器会自动包装成统一格式
    return {
      message: '这是一个成功响应的示例',
      timestamp: new Date().toISOString(),
      data: {
        users: [
          { id: 1, name: '张三', email: 'zhangsan@example.com' },
          { id: 2, name: '李四', email: 'lisi@example.com' },
        ],
      },
    };
  }

  /**
   * 手动返回统一格式示例
   * GET /example/manual
   */
  @Get('manual')
  getManualResponseExample() {
    // 手动返回统一格式（可选，拦截器会自动处理）
    return ApiResponseDto.success(
      { message: '手动返回的统一格式示例' },
      200,
      '操作成功',
    );
  }

  /**
   * 错误响应示例
   * GET /example/error
   */
  @Get('error')
  getErrorExample() {
    // 抛出异常，异常过滤器会自动包装成统一格式
    throw new HttpException('这是一个错误响应的示例', HttpStatus.BAD_REQUEST);
  }

  /**
   * 验证错误示例
   * POST /example/validation
   */
  @Post('validation')
  getValidationErrorExample(@Body() body: any) {
    if (!body.email) {
      throw new HttpException(
        '邮箱字段是必填的',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return {
      message: '验证通过',
      user: body,
    };
  }
}
