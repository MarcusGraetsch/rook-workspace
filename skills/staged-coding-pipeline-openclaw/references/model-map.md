# OpenClaw model map

Replace the placeholders with model identifiers that are already configured and usable in this OpenClaw installation.

Blank values mean: omit the per-spawn override and inherit the configured subagent default.

```yaml
explore_model:
explore_thinking: medium

implement_model:
implement_thinking: medium

review_model:
review_thinking: high
```

Recommended properties:

| Role | Model property |
|---|---|
| Explore | inexpensive, large-context, reliable code reading |
| Implement | strong coding and tool use |
| Review | strong and preferably different from implementer |
| Coordinator | strongest available planning and synthesis model |

Rules:

- Never guess a model identifier.
- Invalid overrides should be removed rather than retried repeatedly.
- Use `agents_list` or operator configuration to discover allowed agent profiles.
- A different review model is useful, but an independent test channel is more important.
- Do not send secrets or credential values in spawn tasks.
