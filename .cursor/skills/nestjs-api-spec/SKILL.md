---
name: nestjs-api-spec
description: Generate enterprise-grade Nest.js interfaces with strict unified response wrapping, pagination conventions, DTO validation, and layered responsibilities. Use when the user asks to create/update backend APIs, controllers, services, DTOs, or paginated endpoints in this Nest.js project.
---

# Nest.js API Spec

## Goal

Implement Nest.js interfaces that strictly follow this project's backend conventions:

- Controller returns raw data; paginated APIs return unified pagination envelope
- Success and error envelopes are handled globally
- Pagination uses `@Post('page')` and standard pagination envelope fields
- DTOs are typed and validated with `class-validator`

## Mandatory Global Conventions

These capabilities already exist globally and must not be reimplemented:

- `ResponseInterceptor` for success wrapping
- `GlobalExceptionFilter` for error wrapping
- `IgnoreWrap` decorator to skip wrapping
- Unified pagination response format for paginated endpoints

For non-paginated APIs, do not manually build response envelopes like:

- `return { success: true, ... }`
- `return { code: 200, message: 'ok', ... }`

## Interface Response Rules

### Success

Controllers must return raw data only. The global interceptor wraps the final output into:

```json
{
  "success": true,
  "data": "any",
  "code": 200,
  "message": null
}
```

### Failure

Services should throw `HttpException` (or subclasses). The global exception filter wraps errors into:

```json
{
  "success": false,
  "data": null,
  "code": "number",
  "message": "string"
}
```

## Pagination Rules (Strict)

For paginated endpoints, always use:

- `@Post('page')`
- Request fields: `pageIndex = 1`, `pageSize = 10`

Service must return unified pagination envelope:

```ts
return {
  success: true,
  data: list,
  code: 200,
  message: null,
  pageIndex,
  pageSize,
  total,
  pageTotal: Math.ceil(total / pageSize),
};
```

Paginated endpoints should return the above structure consistently.

## Layer Responsibilities

### Controller

- No `try/catch`
- No response envelope construction
- No complex business logic
- Return only:
  - domain data
  - unified pagination envelope (for `@Post('page')` endpoints)

### Service

- Owns business logic
- Throws `HttpException` for business or validation failures
- Keeps data access and orchestration clear and testable

### DTO

- Must use `class-validator`
- Must declare explicit types
- Use `class-transformer` where needed for type conversion

## Prohibited Behaviors

- Manual `success/code/message` response formatting
- Complex logic in controller methods
- APIs without DTOs
- Returning non-standard structures when conventions require raw data or unified pagination envelope

## Code Generation Output Contract

When generating a new API module, output complete runnable files with clear structure:

- `controller.ts`
- `service.ts`
- `dto.ts` (or multiple DTO files)
- `entity.ts` (optional, when needed)

Prefer best-practice Nest.js patterns:

- clear dependency injection
- thin controllers, rich services
- explicit types and validation
- consistent pagination implementation

## Output Style (Strict)

When the user asks to generate an interface/module, output in this order:

1. `xxx.controller.ts`
2. `xxx.service.ts`
3. `dto/*.dto.ts` (or `dto.ts` when user explicitly asks single file)
4. `xxx.entity.ts` (optional)

Each file must be directly runnable in Nest.js context and avoid pseudo code.

## Standard Templates

Use these templates as defaults unless the user gives stronger project-specific requirements.

### 1) Pagination DTO Template

```ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class QueryPageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageIndex: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 10;
}
```

### 2) Controller Template (No try/catch, No envelope)

```ts
import { Body, Controller, Post } from '@nestjs/common';
import { XxxService } from './xxx.service';
import { QueryXxxPageDto } from './dto/query-xxx-page.dto';

@Controller('xxx')
export class XxxController {
  constructor(private readonly xxxService: XxxService) {}

  @Post('page')
  async page(@Body() dto: QueryXxxPageDto) {
    return this.xxxService.page(dto);
  }
}
```

### 3) Service Pagination Template (Must return unified pagination envelope)

```ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { QueryXxxPageDto } from './dto/query-xxx-page.dto';

@Injectable()
export class XxxService {
  async page(dto: QueryXxxPageDto) {
    const { pageIndex = 1, pageSize = 10 } = dto;

    if (pageSize > 200) {
      throw new HttpException('pageSize exceeds limit', HttpStatus.BAD_REQUEST);
    }

    const [list, total] = await Promise.all([
      this.queryList(dto, pageIndex, pageSize),
      this.queryTotal(dto),
    ]);

    return {
      success: true,
      data: list,
      code: 200,
      message: null,
      pageIndex,
      pageSize,
      total,
      pageTotal: Math.ceil(total / pageSize),
    };
  }

  private async queryList(dto: QueryXxxPageDto, pageIndex: number, pageSize: number) {
    // replace with repository query
    return [];
  }

  private async queryTotal(dto: QueryXxxPageDto) {
    // replace with repository query
    return 0;
  }
}
```

### 4) Non-paginated Create DTO Template

```ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateXxxDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;
}
```

### 5) Non-paginated Controller Method Template

```ts
@Post()
async create(@Body() dto: CreateXxxDto) {
  return this.xxxService.create(dto);
}
```

### 6) Non-paginated Service Method Template

```ts
async create(dto: CreateXxxDto) {
  // business logic only
  // throw HttpException when business conditions fail
  return createdRecord;
}
```

## Generation Constraints

When producing code, enforce these constraints in every file:

- No `success/code/message` manual payload in non-paginated APIs
- No `try/catch` in controller
- No heavy branching/business orchestration in controller
- DTO fields must have explicit type annotations and validation decorators
- Service errors should use `HttpException`/Nest standard exceptions
- Paginated query endpoint must be `@Post('page')`
- Paginated result must include `success/data/code/message/pageIndex/pageSize/total/pageTotal`
- Public controller/service methods must include concise JSDoc functional comments in Chinese
- JSDoc should describe purpose, key params, and return value (for example: `@returns xxx`)

## Commenting Requirement (Production)

Generated production code must include functional comments similar to:

```ts
/**
 * 获取欢迎页配置（只会有一组数据）
 * @returns 欢迎页配置记录，如果不存在则返回 null
 */
```

Comment rules:

- Use JSDoc block comments (`/** ... */`) on exported classes and public methods
- Keep comments concise and business-oriented; avoid redundant low-value comments
- At minimum include:
  - one-line method purpose
  - `@returns` description
- Add `@param` descriptions when method arguments are not self-evident
- Controller and Service public APIs must follow this rule by default

### Entity Comment Rule (Mandatory)

Generated entities must include functional code comments:

- Add JSDoc on entity class to explain business meaning
- Add concise field comments for every persisted column
- `id`, business fields, and time fields (`createdAt`, `updatedAt`) all need comments
- Comments should describe business semantics, not repeat TypeScript syntax

Example:

```ts
/**
 * 学生实体
 * 对应 student 表
 */
@Entity('student')
export class Student {
  // 主键ID
  @PrimaryGeneratedColumn()
  id: number;

  // 学生姓名
  @Column({ type: 'varchar', length: 64 })
  name: string;

  // 学生年龄
  @Column({ type: 'int' })
  age: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Implementation Checklist

Before final output, verify:

- No manual response envelope objects in non-paginated APIs
- Paginated endpoints use `@Post('page')`
- Pagination return uses standard envelope:
  - `success: true`
  - `data: list`
  - `code: 200`
  - `message: null`
  - `pageIndex/pageSize/total/pageTotal`
- DTOs use `class-validator` and explicit types
- Controller has no `try/catch` and no heavy logic
- Service throws `HttpException` for failures

## Self-Check Before Responding

Before sending generated code, run this quick self-check mentally:

1. Did any controller method return wrapper fields (`success/code/message`)? If yes, rewrite.
2. Did any paginated endpoint not use `@Post('page')`? If yes, rewrite.
3. Did any paginated method miss `success/data/code/message/pageIndex/pageSize/total/pageTotal`? If yes, rewrite.
4. Are all DTO fields typed and validated? If no, complete decorators/types.
5. Is business logic concentrated in service rather than controller? If no, refactor.
6. Do exported classes/public methods include required JSDoc functional comments? If no, add them.
7. Does entity include class comment and field-level functional comments? If no, add them.
