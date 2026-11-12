# Kickoff prompt for Claude Code

Open a terminal in the project folder, run `claude`, and paste everything in the block
below as the first message.

```
I'm building a desktop "project creator" app. CLAUDE.md has the project rules. Read README.md and the code under src/
before anything else. It's about 25 files, so read them directly instead of using a subagent.

Why I'm building it: I'm sick of asking AI for project help and being handed every step. My real blocker is not knowing
how or where to start a project. Framing a project like a classroom assignment helps me start, and I want the app to do
that for other people.

What it should do:
1. Help the user decide on a project
2. Give boilerplate to start from
3. Let the user write the code themselves
4. Let them ask questions without being given the full solution

Open question, don't commit to it yet: having the AI write the code while the user makes the engineering decisions. On
its own that doesn't feel new.

Not now: showing what the user needs to study more, interview prep and mocks, and practice modules that scale from
LeetCode-style problems up to navigating a real codebase.

Work in this order:

1. Baseline. If the folder isn't a git repo, run git init and commit what's there, so every later step can be undone.
   Then run npm install, npm run typecheck and npm run build, and show me the output. The app was only ever run on
   Linux and I'm on Windows, so I want to know now if something is broken. Report problems, don't fix them yet.

2. Summarize what exists in a few lines, including anything in the code that disagrees with the README.

3. Interview me with the AskUserQuestion tool. Skip what the README already answers and dig into the hard parts: what
   a "classroom assignment" should contain, how the user picks a project, what the boilerplate is and where it comes
   from, where the line sits between a helpful answer and the full solution, and which AI provider and key storage to
   use.

4. Research with parallel subagents, so the reading stays out of this conversation. One subagent per question, each
   returning under 200 words plus links:
   - How do Frontend Mentor, Codecrafters and roadmap.sh projects frame a project brief (requirements, starter files,
     stages, how "done" is checked)?
   - What does research say about AI tutors that give hints versus ones that give full answers? Start with Bassner et
     al. 2026, "Less stress, better scores, same learning" (doi 10.1016/j.caeai.2025.100537).
   - What is the current recommended way to test an electron-vite app end to end (Playwright's _electron API) and to
     unit test it (Vitest)?

5. Propose a plan for the next milestone only and save it to docs/plan.md. Tell me which milestone you picked and why
   it comes first. The plan should name the files that change, say what is out of scope, break the work into steps
   small enough to commit one at a time, and end each step with a check you can run yourself (typecheck, a test, or a
   Playwright run with a screenshot). There are no tests in the repo yet, so say how you'd add the minimum needed.

Then stop and wait for me to approve the plan. Don't write feature code before that.

When we do build:
- Keep it simple. Build only what the plan asks for, with no extra features, abstractions or config for things we
  might want later.
- After each step, run its check and show me the real output instead of telling me it passed.
- Before calling the milestone done, have a subagent that hasn't seen our conversation review the diff against
  docs/plan.md. It should report only gaps that affect correctness or the plan's requirements, not style.
- Ask before anything hard to undo, like deleting files, changing the security model, or adding a large dependency.
- If you're unsure whether something is settled, check the README. Only the four core features are.
```

## Habits that help during the session

- **Clear between tasks.** Run `/clear` when you switch to something unrelated. Long sessions get worse as they fill up.
- **Two strikes.** If you've corrected the same mistake twice, run `/clear` and start over with a sharper prompt.
- **Stop and rewind.** `Esc` stops Claude mid-action. `Esc` twice opens the rewind menu to undo code and conversation.
- **Fresh session to build.** Once `docs/plan.md` is approved, start a new session and say "implement docs/plan.md".
  It begins with a clean context and the written plan.
- **Plan mode.** `Shift+Tab` switches to plan mode, where Claude can read but not change anything.
- **Subagents.** Worth it for parallel research and for a fresh review at the end. Not worth it for small or
  step-by-step work, where they only add cost.

## Where this comes from

- Claude Code best practices: https://code.claude.com/docs/en/best-practices
- How and when to use subagents: https://claude.com/blog/how-and-when-to-use-subagents-in-claude-code
- Prompting best practices for Claude: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Electron automated testing (Playwright): https://electronjs.org/docs/latest/tutorial/automated-testing
- TUM study on hint-based tutors vs. unrestricted AI: https://www.edtech.tum.de/?p=3520
