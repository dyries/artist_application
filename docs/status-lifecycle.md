# Status Lifecycle

## Opportunity Status

- `new`：新机会或用户手动添加链接，尚未核验。
- `confirmed`：已核验官网来源、截止日期、资格、费用、资助、材料要求和提交方式。
- `preparing`：正在制作申请包或等待材料补齐。
- `ready_to_submit`：申请包已完成，checklist 已过，等待所选审核模式允许的提交步骤。
- `submitted`：已按用户确认完成投递。
- `waiting`：已投递，等待结果。
- `shortlisted`：进入 shortlist、面试、二轮或进一步沟通。
- `rejected`：不符合资格、风险过高、过期、用户决定放弃或已被拒。

## Allowed Transitions

- `new` -> `confirmed`：完成核验。
- `new` -> `rejected`：发现硬性不合格、过期或明显风险。
- `confirmed` -> `preparing`：开始制作申请包。
- `preparing` -> `ready_to_submit`：材料齐全且已生成审核/最终文件。
- `ready_to_submit` -> `submitted`：按提交审核模式执行；默认需要用户明确确认，`direct_apply` 模式下可在当前批次预授权范围内执行。
- `submitted` -> `waiting`：投递完成并进入等待期。
- `waiting` -> `shortlisted`：收到入围或下一步通知。
- `waiting` -> `rejected`：收到拒绝或项目结束。

任何涉及付款、验证码、登录、敏感授权或最终提交的状态变化，都需要用户确认或用户介入。
