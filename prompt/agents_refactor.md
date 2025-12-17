# agents 重构

## 任务一 将 agents 需要的文档全部迁移到 .claude/agents 下。
我们的 agents 有一些依赖的外部文档现在 `agentspace/knowledge/generator` 下面，现在需要全部移动到 `.claude/agents` 下，这样工程结构更内聚。
你来帮我检查所有 `.claude/agents` 下所有的 agents，执行这个重构。

## 任务二 task 1-4 中的所有输出都迁移到 agentspace 中
我们的 agents 中的 task 1 到 task 4 是完成的是线性的任务，现在他们的输出有的在 requirements 下，有的在 docs，我们需要全部让他们都放到 agentspace 下，这样更加同意。
注意：
1. scripts 下有些脚本也使用了原本的路径下的文档作为输入，并且有输出，脚本中的路径也要改。改完之后你可以重新执行脚本确保脚本正确。
2. 改完之后除了 task 1 的 agent 在最初读的需求文档外，应该没有 agents 往 requirements/docs 中读写文件了。

## 任务三 agents 中需要的脚本迁移
agents 中需要的脚本应该迁移到 `.claude/agents/scripts` 目录下，并且在 agents 中执行的命令换成使用 `tsx` 去执行，不再使用 npm 命令来执行。你来帮我完成迁移，完成之后直接尝试执行这些命令，验证脚本没有因为路径迁移产生的问题。