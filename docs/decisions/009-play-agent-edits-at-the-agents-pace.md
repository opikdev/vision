# 009. Play agent edits at the agent's pace

- **Status**: accepted
- **Context**: An AI writes a whole section per MCP tool call (about 80 elements) and takes 5–30 s to write it. Tool calls arrive complete, so the app got nothing for many seconds, then a block it revealed in 1.5 s: long still pauses, then a burst, with the cursor racing then stopping. Streaming partial tool input would need every AI client to stream and would change the protocol and the file.
- **Decision**: The app paces what it has already received. Each session's saves go into a queue that plays them element by element over the agent's recent edit-to-edit gap, and speeds up when the next save arrives early. The file, `vision-mcp` and the activity protocol don't change.
- **Consequences**:
  - Works for every AI client, since it needs nothing but the saves and activity messages the app already gets.
  - The canvas shows the design up to about one batch late. `done` and any pan, zoom or selection show the rest within 300 ms, so the screen catches up with the file whenever someone looks closely.
  - Gaps longer than 15 s still show as a pause: the app can't know how long the agent will take, and playing slower would lag more.
  - Pacing is pure logic over timestamps, so it's unit-tested with fake timers; `pnpm replay` and the playback benchmark replay a recorded session to judge it by eye and by numbers.
