// electron-builder afterSign hook — notarizes the .app via Apple's notarytool
// before electron-builder packages it into dmg/zip. We do this manually because
// electron-builder 24.13.x's built-in notarize step calls the legacy
// electron-notarize API with undefined options ("Cannot destructure property
// 'appBundleId' of 'options' as it is undefined") instead of the modern
// notarytool path. Disabling mac.notarize and invoking @electron/notarize here
// is the canonical workaround.

const { notarize } = require('@electron/notarize')

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') return

  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log('[notarize] APPLE_* env vars missing — skipping notarization')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`
  console.log(`[notarize] submitting ${appPath} via notarytool…`)

  await notarize({
    tool: 'notarytool',
    appPath,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
    teamId: APPLE_TEAM_ID,
  })

  console.log('[notarize] complete')
}
