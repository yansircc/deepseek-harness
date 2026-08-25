/** Stable protocol revision helpers shared by Chrome peers. */
import { ChromeBuildId, ChromeOperationRevision } from './ids.ts'
import type { ChromeProtocolRevision } from './types.ts'

/** Construct the immutable revision tuple advertised by one Chrome build. */
export const chromeProtocolRevision = (
  kernelProtocolVersion: string,
  kernelBuildId: string,
  operationRevision: string,
): ChromeProtocolRevision => ({
  kernelProtocolVersion,
  kernelBuildId: ChromeBuildId(kernelBuildId),
  operationRevision: ChromeOperationRevision(operationRevision),
})

/** Return true when two peers can exchange the stable kernel envelope. */
export const compatibleKernel = (
  expected: ChromeProtocolRevision,
  actual: ChromeProtocolRevision,
): boolean => expected.kernelProtocolVersion === actual.kernelProtocolVersion
