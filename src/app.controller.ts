import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * 一个具有单个路由的基本控制器。
 * restful 风格的路由设计:
 * @get 用于获取数据
 * @post 用于创建数据
 * @put  用于更新数据
 * @delete 用于删除数据
 *
 * @param() restful 风格的路由参数  /users/:id
 * @Query GET: /users?age=25&name=John
 * @Body POST: { "age": 25, "name": "John" }
 *
 * @Controller 标记该类为控制器，并可以选择性地指定一个路由前缀
 * @Get() 和 @Post() 装饰器用于定义路由处理方法，分别处理 GET 和 POST 请求
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/test')
  getGoodbye(@Query() query): string {
    console.log('query', query);
    return `This is a GET request with query: ${JSON.stringify(query)}`;
  }

  @Post('/post')
  postHello(@Body() body): string {
    console.log('body', body);
    return 'ddd';
  }

  @Get('/:id')
  getHello(@Param() params): string {
    console.log('params', params);
    return this.appService.getHello();
  }
}
