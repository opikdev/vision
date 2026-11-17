# Release the macOS app

## Build

```sh
pnpm package
```

This builds the MCP server and the app, then runs electron-builder with [`apps/desktop/electron-builder.yml`](../apps/desktop/electron-builder.yml). The output is in `apps/desktop/release/` for the host architecture:

| Output                            | Use                                   |
| --------------------------------- | ------------------------------------- |
| `mac*/Vision.app`                 | The app, to copy to `/Applications`   |
| `Vision-<version>-<arch>.dmg`     | Disk image for people to install from |
| `Vision-<version>-<arch>-mac.zip` | Zipped app, for downloads             |

The MCP server is copied to `Vision.app/Contents/Resources/mcp/vision-mcp.mjs`, outside `app.asar`, where the [Connect an AI dialog](../README.md#design-with-any-ai) points clients. Delete `apps/desktop/release/` after use: it's about 500 MB.

## Sign and notarize

Local builds are ad-hoc signed (`identity: '-'`) without the hardened runtime, which is enough to run on the Mac that built them. A release for other Macs needs a Developer ID signature and notarization. This is an outline; no release has gone through it yet.

1. Install a **Developer ID Application** certificate in your login keychain, or export it as a `.p12` and set `CSC_LINK` and `CSC_KEY_PASSWORD`.
2. Create an App Store Connect API key and set `APPLE_API_KEY` (path to the `.p8`), `APPLE_API_KEY_ID` and `APPLE_API_ISSUER`. electron-builder notarizes when these are set.
3. Build, then sign with your identity and the hardened runtime (electron-builder's default entitlements allow JIT, which Electron needs):

   ```sh
   pnpm --filter @vision/mcp build
   pnpm --filter @vision/desktop build
   cd apps/desktop
   pnpm exec electron-builder --mac -c.mac.identity="<Developer ID Application: Name (TEAMID)>" -c.mac.hardenedRuntime=true
   ```

4. Check the result: `spctl --assess -vv release/mac*/Vision.app` should say `source=Notarized Developer ID`, and `xcrun stapler validate release/*.dmg` should pass.

## Fuses

electron-builder flips [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses) in the binary before signing. Read them with `pnpm dlx @electron/fuses read --app <path>/Vision.app`.

| Fuse                                    | Setting | Why                                                                            |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `runAsNode`                             | on      | The MCP command runs the app's binary with `ELECTRON_RUN_AS_NODE=1`.           |
| `enableCookieEncryption`                | on      | Encrypts the cookie store with the keychain.                                   |
| `enableNodeOptionsEnvironmentVariable`  | off     | `NODE_OPTIONS` can't inject code into the app.                                 |
| `enableNodeCliInspectArguments`         | off     | `--inspect` and `SIGUSR1` can't attach a debugger to the main process.         |
| `enableEmbeddedAsarIntegrityValidation` | on      | The app refuses to start if `app.asar` doesn't match the hash in `Info.plist`. |
| `onlyLoadAppFromAsar`                   | on      | The app loads only from `app.asar`, never from a planted `app` folder.         |
| `grantFileProtocolExtraPrivileges`      | off     | `file://` gets no extra privileges; the UI loads from the `app://` protocol.   |

`runAsNode` stays on because turning it off breaks every AI client's connection to Vision. The cost: anyone who can run the binary can run any script under Vision's code signature, which matters for apps that hold privacy permissions or entitlements. Vision holds none, so this gives nothing beyond the user's own `node`. The asar fuses don't affect it: run-as-node mode loads the given script, not the app, and the server sits outside `app.asar`.

## Update the icons

The icons are drawn in `apps/desktop/build/icon.svg` and `document-icon.svg`. After changing one, render it at 1024 px and rebuild its `.icns`:

```sh
cd apps/desktop/build
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --default-background-color=00000000 --window-size=1024,1024 --screenshot="$PWD/icon.png" "file://$PWD/icon.svg"
mkdir icon.iconset
for s in 16 32 128 256 512; do
  sips -z $s $s icon.png --out icon.iconset/icon_${s}x${s}.png
  sips -z $((s * 2)) $((s * 2)) icon.png --out icon.iconset/icon_${s}x${s}@2x.png
done
iconutil -c icns icon.iconset -o icon.icns
rm -r icon.png icon.iconset
```
