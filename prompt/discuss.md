# 探讨 agent 工程中的确定和开放

最近读到两篇内容：
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling
- https://github.com/refly-ai/refly

让我看到它们是在不同维度追求同一件事情：
在 agent 的执行过程中寻找确定性，来提高成功率

相比于制定确定的 workflow，由 agent 来做整体调度使得整体系统保持了开放，未来只要模型能力提升，整体效果就能自动提升。
同时 agent 的执行计划使用代码或者确定的 workflow 工具DSL，并交由它们来执行，使得确定性极大提升，同时又保持了语义上的可读，agent 能继续自己去改良。

你来深入阅读并且评论我的思考是否正确。你有没有更好的补充。

