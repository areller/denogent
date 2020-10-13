import type { Args } from '../deps.ts';
import type { Runtime } from '../internal/runtime.ts';
import type { Graph } from '../internal/graph/graph.ts';
import type { BuildContext } from '../lib/core/context.ts';
import type { CIIntegration } from '../lib/ci/ci_integration.ts';

export interface CLIContext {
  buildContext?: BuildContext;
  buildFile?: string;
  graph?: Graph;
  args: Args;
  runtime: Runtime;
  ciIntegration?: CIIntegration;
}
