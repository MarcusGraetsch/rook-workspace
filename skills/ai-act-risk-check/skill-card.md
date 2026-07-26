## Description: <br>
Assesses an AI system description against EU AI Act Annex III high-risk categories and returns a preliminary HIGH-RISK or LOW-RISK classification. <br>

This skill is ready for commercial/non-commercial use. <br>

## Publisher: <br>
[bluesbell](https://clawhub.ai/user/bluesbell) <br>

### License/Terms of Use: <br>


## Use Case: <br>
Developers, compliance reviewers, and product teams use this skill for an initial screening of whether an AI system may fall into an EU AI Act Annex III high-risk category. Its output is preliminary guidance and does not replace legal review. <br>

### Deployment Geography for Use: <br>
Global <br>

## Known Risks and Mitigations: <br>
Risk: The skill sends the submitted AI-system description to the Gemini CLI for classification. <br>
Mitigation: Do not submit confidential business details, personal data, or regulated information unless the organization has approved Gemini and its data-handling terms. <br>
Risk: The classification is automated and preliminary, so it may be incomplete or unsuitable as legal advice. <br>
Mitigation: Use the result as an initial screening signal and have qualified reviewers confirm EU AI Act obligations before relying on it. <br>
Risk: The documentation says the skill uses oracle, while the script calls gemini. <br>
Mitigation: Review runtime dependencies before deployment and ensure the approved inference provider matches organizational policy. <br>


## Reference(s): <br>
- [ClawHub skill page](https://clawhub.ai/bluesbell/skills/ai-act-risk-check) <br>


## Skill Output: <br>
**Output Type(s):** [text, shell commands, guidance] <br>
**Output Format:** [Plain text classification with labelled sections] <br>
**Output Parameters:** [1D] <br>
**Other Properties Related to Output:** [Returns HIGH-RISK with category numbers or LOW-RISK for systems outside the listed categories; includes a preliminary-check disclaimer.] <br>

## Skill Version(s): <br>
1.0.0 (source: release evidence and package.json) <br>

## Ethical Considerations: <br>
Users should evaluate whether this skill is appropriate for their environment, review any generated or modified files before relying on them, and apply their organization's safety, security, and compliance requirements before deployment. <br>
