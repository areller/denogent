import type { GHAUsesCollection } from "../../ci/gh-actions/gh-actions.ts";
import type { Extension } from "../../core/extension.ts";
import type { Task } from "../../core/task.ts";
import docker from "../../docker/docker.ts";

export type NodeJSVersion = 'latest' | string;

class NodeJS {

    /**
     * Declares a dependency on NodeJS
     * @param version NodeJS version
     */
    setup(version?: NodeJSVersion): Extension {
        const dockerTag = !version || version == 'latest' ? 'alpine' : version + '-alpine';
        return {
            name: 'build-kits-nodejs',
            key: `build-kits-nodejs_${version}`,
            enrich: t => {
                t.dependsOn(docker.container({ image: `node:${dockerTag}` }));
                this.githubActionsInject(t, version);
            }
        }
    }

    private githubActionsInject(task: Task, version?: string): void {
        let uses = task.properties['gh-actions-uses'] as GHAUsesCollection;
        if (uses === undefined) {
            uses = {};
            task.properties['gh-actions-uses'] = uses;
        }

        const key = `nodejs-${version}`;

        uses[key] = {
            name: `Install NodeJS ${version}`,
            uses: 'actions/setup-node@v1'
        };

        if (version !== undefined && version !== 'latest') {
            uses[key].with = {
                'node-version': version
            };
        }
    }
}

const nodejs = new NodeJS();
export default nodejs;