# ADR-0001: Crash handler coexistence (Sentry + Crashlytics)

**Date**: 2026-09-22
**Status**: accepted
**Deciders**: Health OS maintainers

## Context

Health OS ships both `@sentry/react-native` (metered free tier, better JS symbolication) and Firebase Crashlytics (unlimited free fallback). Both products install handlers at three layers: JS `ErrorUtils`, JVM `Thread.UncaughtExceptionHandler`, and NDK POSIX signal handlers.

Two vendor defaults would silently break reporting:

1. Crashlytics docs recommend `crashlytics_javascript_exception_handler_chaining_enabled: false` to avoid duplicate JS fatals. That flag makes Crashlytics' handler return without calling the previous handler, so Sentry would never see JS fatals.
2. `sentry-native` and Crashlytics breakpad both claim `SIGSEGV` / `SIGABRT`. Signal-handler chaining is unreliable; neither vendor documents coexistence. Shipping both NDK layers also costs ~2 MB of uncompressed arm64 `.so` files.

## Decision

1. Keep `crashlytics_javascript_exception_handler_chaining_enabled: true` so Crashlytics chains to Sentry. Suppress Crashlytics auto-recording of JS fatals with `crashlytics_is_error_generation_on_js_crash_enabled: false`. JS events are routed explicitly through `reportError` / `reportFatal`.
2. Run **exactly one NDK handler**: Crashlytics. Sentry is initialized with `enableNdk: false`, and Gradle excludes `sentry-android-ndk` / `sentry-native-ndk` so the native libs are not packaged. JVM + JS capture remains in both tools.

## Alternatives Considered

### Alternative 1: Disable Crashlytics JS chaining
- **Pros**: Matches Crashlytics-only docs; fewer duplicate issues
- **Cons**: Drops every JS fatal from Sentry
- **Why not**: We need Sentry as the primary JS reporter

### Alternative 2: Keep both NDK handlers
- **Pros**: Native crashes might appear in both dashboards
- **Cons**: Undocumented; one handler may swallow the other; ~2 MB extra
- **Why not**: Size and reliability. Crashlytics is the always-on free provider, so it owns native crashes.

### Alternative 3: Sentry-only NDK
- **Pros**: Better native symbolication in Sentry
- **Cons**: Native crashes disappear if Sentry quota is exhausted or DSN is blanked remotely
- **Why not**: Crashlytics is the unlimited safety net

## Consequences

### Positive
- JS fatals reach Sentry via handler chaining
- Native crashes have a single reliable owner (Crashlytics)
- Smaller APK than shipping both NDK stacks

### Negative
- Native crashes do not appear in Sentry
- Unhandled promise rejections under Hermes may reach Sentry but not Crashlytics

### Risks
- Future Crashlytics docs or SDK defaults may flip chaining off. `firebase.json` must keep chaining enabled. Do not "fix" it to match Crashlytics-only tutorials.
