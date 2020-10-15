import type { CIIntegration } from "../../lib/ci/ci_integration.ts";

export type CIFilter = { all: boolean; ci?: string[]; label?: string[] };

export function selectCIsFromFilter(allCIs: CIIntegration[], filter: CIFilter): CIIntegration[] {
  if (filter.all) {
    return allCIs;
  } else if (filter.ci !== undefined) {
    const notFoundCIs = filter.ci.filter((x) => allCIs.filter((y) => y.type == x).length == 0);
    if (notFoundCIs.length > 0) {
      throw new Error(`CI of type '${notFoundCIs[0]}' was not declared.`);
    }

    return allCIs.filter((x) => (filter.ci?.indexOf(x.type) ?? -1) !== -1);
  } else if (filter.label !== undefined) {
    const notFoundLabels = filter.label.filter((x) => allCIs.filter((y) => y.label == x).length == 0);
    if (notFoundLabels.length > 0) {
      throw new Error(`CI with label '${notFoundLabels[0]}' was not declared.`);
    }

    return allCIs.filter((x) => x.label !== undefined && (filter.label?.indexOf(x.label) ?? -1) !== -1);
  } else {
    throw new Error(`Expected one of these flags '--all', '--ci' or '--label'`);
  }
}
