# Status Lifecycle

## Opportunity Status

- `new`：新机会或用户手动添加链接，尚未核验。
- `recommended`：已进入中文推荐列表，等待用户选择是否申请。
- `selected_by_user`：用户选择申请；这是准备真实申请包的入口。
- `not_selected`：用户暂不申请；自动化不得为它准备真实申请包。
- `confirmed`：已核验官网来源、截止日期、资格、费用、资助、材料要求和提交方式。
- `preparing`：正在制作申请包或等待材料补齐。
- `quality_blocked`：申请包已生成但未通过内部质量检查，不可提交。
- `package_ready_for_final_review`：申请包通过自动检查，等待用户第二节点审核。
- `approved_for_submission`：用户明确批准最终提交包，可进入提交动作；付款、登录、验证码等仍需暂停。
- `ready_to_submit`：申请包已完成，checklist 已过，等待所选审核模式允许的提交步骤。
- `submitted`：已按用户确认完成投递。
- `waiting`：已投递，等待结果。
- `shortlisted`：进入 shortlist、面试、二轮或进一步沟通。
- `rejected`：不符合资格、风险过高、过期、用户决定放弃或已被拒。

## Allowed Transitions

- `new` -> `recommended`：完成核验并进入中文推荐列表。
- `recommended` -> `selected_by_user`：用户选择申请。
- `recommended` -> `not_selected`：用户暂不申请。
- `selected_by_user` -> `preparing`：开始制作申请包。
- `new` -> `confirmed`：完成核验但尚未进入推荐列表。
- `new` -> `rejected`：发现硬性不合格、过期或明显风险。
- `preparing` -> `quality_blocked`：生成后未通过内部质量检查。
- `preparing` -> `package_ready_for_final_review`：材料齐全且通过质量检查。
- `quality_blocked` -> `preparing`：自动返工或补充材料后重新准备。
- `package_ready_for_final_review` -> `approved_for_submission`：用户确认最终提交包。
- `package_ready_for_final_review` -> `quality_blocked`：用户在最终审核节点要求返工。
- `approved_for_submission` -> `ready_to_submit`：提交前最后环境检查通过。
- `ready_to_submit` -> `submitted`：必须有用户明确确认；`direct_apply` 不跳过最终外部提交确认。
- `submitted` -> `waiting`：投递完成并进入等待期。
- `waiting` -> `shortlisted`：收到入围或下一步通知。
- `waiting` -> `rejected`：收到拒绝或项目结束。

任何涉及付款、验证码、登录、敏感授权或最终提交的状态变化，都需要用户确认或用户介入。
