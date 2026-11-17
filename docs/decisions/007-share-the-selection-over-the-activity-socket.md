# 007. Share the selection over the activity socket

- **Status**: accepted
- **Context**: AIs should be able to act on "the selected layer". The selection lives only in the running app, `vision-mcp` is a separate process started by the AI client, and the file must not carry UI state. ADR 005 already gives both programs a private socket, but it only carried messages one way.
- **Decision**: The activity socket also takes a request line, `{ v: 1, id, request: "selection", file }`, which the app answers on the same connection with `{ v: 1, id, response }`, either `not-open` or `open` with `{ pageId, nodeIds }` from the window showing that file, matched by real path. `get_selection` opens a short-lived connection and gives up after one second.
- **Consequences**:
  - No new socket, path or permission: the request rides on the `0600` socket from ADR 005, and old apps simply never answer, which the tool reports as no answer.
  - The answer is only ids. The MCP server reads the file it was given, so a request can't read anything the app has open, and a file that isn't open looks the same as one that doesn't exist.
  - The selection is shaped as a list, so multiple selection needs no protocol change.
  - Any process of the same user can still ask which ids are selected, as it could already fake activity.
