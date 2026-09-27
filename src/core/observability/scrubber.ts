import { Platform } from 'react-native';
import { getAppVersion } from './config';
import { getCurrentRoute, redactRouteName } from './currentRoute';
import { isErrorCode, type ErrorCode } from './errorCodes';
import { getInstallId } from './installId';
import type { CrashEvent, CrashLevel } from './types';

const PATH_RE =
  /(?:file:\/\/)?(?:\/storage\/emulated\/0\/[^\s:)]+|\/home\/[^\s:)]+|[A-Z]:\\[^\s:)]+)/g;

export interface CrashContext {
  installId: string;
  appVersion: string;
  osVersion: string;
  deviceModel: string;
  routeName: string | null;
}

export interface ScrubOptions {
  safeMessage?: boolean;
}

function deviceModel(): string {
  const constants = Platform.constants as
    | { Model?: string; Manufacturer?: string; Brand?: string }
    | undefined;
  const parts = [constants?.Manufacturer ?? constants?.Brand, constants?.Model].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(' ') : 'unknown';
}

export function collectCrashContext(): CrashContext {
  return {
    installId: getInstallId(),
    appVersion: getAppVersion(),
    osVersion: String(Platform.Version ?? 'unknown'),
    deviceModel: deviceModel(),
    routeName: getCurrentRoute(),
  };
}

function asError(error: unknown): { name: string; message: string; stack: string | undefined } {
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: error.message, stack: error.stack };
  }
  return { name: 'Error', message: typeof error === 'string' ? error : '', stack: undefined };
}

function stackFrames(stack: string | undefined): string[] {
  if (!stack) return [];
  return stack
    .split('\n')
    .map((line) => line.replace(PATH_RE, '<path>').trim())
    .filter((line) => /^at\s+/.test(line))
    .slice(0, 20);
}

export function scrubCrashEvent(input: {
  error: unknown;
  errorCode: ErrorCode | string;
  context: CrashContext;
  level: CrashLevel;
  options?: ScrubOptions;
}): CrashEvent {
  const parsed = asError(input.error);
  const code = isErrorCode(input.errorCode) ? input.errorCode : 'UNHANDLED_JS_ERROR';
  return {
    installId: input.context.installId,
    appVersion: input.context.appVersion,
    osVersion: input.context.osVersion,
    deviceModel: input.context.deviceModel,
    routeName: redactRouteName(input.context.routeName),
    errorCode: code,
    errorName: parsed.name,
    stackFrames: stackFrames(parsed.stack),
    message: input.options?.safeMessage ? parsed.message || null : null,
    level: input.level,
  };
}
