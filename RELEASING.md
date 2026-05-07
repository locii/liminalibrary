# Releasing

Tags matching `v*` trigger the GitHub Actions workflow at
`.github/workflows/release.yml`, which signs + notarizes the Mac build,
packages dmg + zip + `latest-mac.yml`, builds the Windows installer, and
publishes everything to a GitHub Release.

The same syntax works for **liminalibrary** (`v0.5.x`) and **liminastudio /
Limina Mix** (`v0.7.x`) — only the version numbers and repo URLs differ.

---

## 1. Normal release (new version)

Bump the version in `package.json`, commit, tag at `HEAD`, push both:

```sh
# After editing package.json's "version" field and committing:
git tag v0.5.4
git push origin main
git push origin v0.5.4
```

The workflow runs once. Watch it at:
- https://github.com/locii/liminalibrary/actions
- https://github.com/locii/liminastudio/actions

Done when the release at `/releases/tag/v0.5.4` is no longer a draft and has
all artifacts attached (dmg, zip, blockmaps, `latest-mac.yml`, `.exe`,
`latest.yml`).

---

## 2. Retry release (workflow failed, fix is on a new commit)

**Only use this when a tag has already been pushed AND the workflow failed.**
Using it for a brand-new tag triggers two workflow runs that collide and
strip the artifacts off the release.

Required prep — do this **first**, in the GitHub UI:

> Go to `/releases`, find the failed (likely draft) release, click **Delete**.
> The release must be gone before re-pushing the tag, otherwise the next
> workflow run will upsert into the broken one.

Then move the tag and re-push:

```sh
git tag -f v0.5.4 <new-commit-sha>      # move tag locally
git push origin :refs/tags/v0.5.4       # delete tag on origin
git push origin v0.5.4                  # re-push triggers workflow
```

---

## 3. How to tell which scenario you're in

| Situation | Use |
|---|---|
| Brand-new tag, never pushed before | §1 |
| Tag pushed, workflow succeeded, release looks good | nothing — done |
| Tag pushed, workflow failed, want to retry without bumping version | §2 |
| Tag pushed, workflow succeeded, but you want to ship a different commit | bump to next patch version (§1), don't reuse the tag |

If a tag is already on origin and you run the §2 commands without first
deleting the release, the workflow will run again and end up with an empty
release (assets get stripped during the upsert). The fix in that case is
either to bump to the next patch version or follow §2 properly: **delete
the release in the UI, then re-push the tag**.

### Stuck release: workflow says success, release has zero assets

If a release ends up published (un-drafted) with no assets attached, the
tag is in an unrecoverable state — electron-builder's GitHub publisher
silently skips uploads when the target release is already published
(it expects a draft). Subsequent workflow runs will keep reporting
"success" without uploading anything.

**Don't try to fix the same tag.** Delete the broken release in the UI
(optional, just for tidiness), bump to the next patch version, and ship
that. The skipped version number is harmless — auto-update only cares
about whichever version is highest.

---

## What the workflow does (at a glance)

1. `prepare-release` — creates a draft release on GitHub for the tag.
2. `build-mac` — `npm run publish -- --mac` signs (`CSC_*`), runs
   notarytool via `build/notarize.js` (Library) or `afterSign.js`
   (Mix) using `APPLE_*`, builds dmg + zip + `latest-mac.yml`,
   uploads to the draft.
3. `build-windows` — `npm run publish -- --win` builds the NSIS
   installer + `latest.yml` and uploads.
4. `publish-release` — un-drafts the release once both builds succeed.
5. `revalidate-changelog` — pings getliminastudio's revalidate endpoint.

Required secrets (already set per repo): `CSC_LINK`, `CSC_KEY_PASSWORD`,
`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`,
`REVALIDATE_TOKEN`. `GITHUB_TOKEN` is provided automatically.
