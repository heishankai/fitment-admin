---
description: 按 nestjs-api-spec 规范生成/重构 Nest.js 接口代码
---

使用项目技能 `.cursor/skills/nestjs-api-spec/SKILL.md` 作为最高优先级约束，严格遵守其中全部规则完成任务。

用户需求如下：

{{args}}

执行要求：

1. 生成或修改代码时，禁止手动返回 `success/code/message`。
2. 分页接口统一使用 `@Post('page')`，并返回 `new PageResult({ list, total, pageIndex, pageSize })`。
3. Controller 不写 `try/catch`，不写复杂业务逻辑。
4. Service 负责业务逻辑，错误用 `HttpException`。
5. DTO 必须带 `class-validator` 且类型完整。
6. 输出完整可运行文件（controller/service/dto/可选 entity）。
