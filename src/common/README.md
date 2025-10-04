# 统一响应格式

本项目实现了统一的 API 响应格式，确保所有接口返回的数据结构一致。

## 响应格式

### 成功响应格式
```json
{
  "success": true,
  "data": 查询到的数据,
  "code": 状态码,
  "message": null
}
```

### 失败响应格式
```json
{
  "success": false,
  "data": null,
  "code": 状态码,
  "message": 错误信息
}
```

## 实现方式

### 1. 响应 DTO (`ApiResponseDto`)

位置：`src/common/dto/response.dto.ts`

```typescript
// 成功响应
ApiResponseDto.success(data, code?, message?)

// 失败响应
ApiResponseDto.error(code, message, data?)
```

### 2. 响应拦截器 (`ResponseInterceptor`)

位置：`src/common/interceptors/response.interceptor.ts`

- 全局自动包装所有成功响应
- 无需手动处理，控制器直接返回数据即可

### 3. 异常过滤器 (`HttpExceptionFilter`)

位置：`src/exception/http-exception.filter.ts`

- 全局自动处理所有异常
- 将异常转换为统一的错误响应格式

## 使用示例

### 控制器中的使用

```typescript
@Controller('users')
export class UserController {
  @Get()
  getAllUsers() {
    // 直接返回数据，拦截器会自动包装
    return this.userService.getAllUsers();
  }

  @Get(':id')
  getOneUser(@Param('id') id: string) {
    // 直接返回数据
    return this.userService.getOneUser(+id);
  }

  @Post()
  createUser(@Body() body: any) {
    // 直接返回数据
    return this.userService.createUser(body);
  }
}
```

### 手动返回统一格式（可选）

```typescript
@Get('custom')
getCustomResponse() {
  // 手动返回统一格式
  return ApiResponseDto.success(
    { message: '自定义成功消息' },
    200,
    '操作成功'
  );
}
```

### 错误处理

```typescript
@Get('error')
getError() {
  // 抛出异常，过滤器会自动包装
  throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
}
```

## 测试接口

项目提供了示例控制器用于测试统一响应格式：

- `GET /example/success` - 成功响应示例
- `GET /example/manual` - 手动返回统一格式示例
- `GET /example/error` - 错误响应示例
- `POST /example/validation` - 验证错误示例

## 注意事项

1. **自动处理**：大部分情况下无需手动处理响应格式，拦截器和过滤器会自动处理
2. **异常处理**：使用 `HttpException` 抛出异常，过滤器会自动转换为统一格式
3. **状态码**：成功响应默认使用 200，错误响应使用异常的状态码
4. **数据格式**：`data` 字段可以是任何类型的数据（对象、数组、字符串等）
