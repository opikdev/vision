# 005. Agent activity travels over a local socket

- **Status**: accepted
- **Context**: To show which AI is working and where, `vision-mcp` has to tell the open app what each tool call did. The file can't carry it: writing activity beside the design would clutter the user's folder and turn every read into a save. The two programs must stay decoupled, and AI work must not fail or slow down when the app is closed.
- **Decision**: The app listens on a Unix socket at a fixed path, `~/Library/Application Support/Vision/activity.sock` (`VISION_ACTIVITY_SOCKET` overrides it). Each `vision-mcp` process connects lazily and writes one JSON line per tool call, defined and validated by `@vision/activity`. When nothing listens, the server drops the message and retries the connection 3 s later.
- **Consequences**:
  - Nothing is written beside the design, and neither program imports the other; only the message schema is shared.
  - A fixed path needs no discovery, so a server started before the app still reaches it on its next call. One app owns the socket; a second Vision that finds it answering leaves it alone.
  - Any process running as the same user can connect and show a fake cursor or status. The socket is `0600`, the app validates every line and drops lines over 64 KB, and messages only change what is displayed, never the design.
  - Activity is best effort: messages sent while the app is closed are lost, which is fine for a live view.
