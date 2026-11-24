export interface DagNodeInput {
  temp_key: string;
  depends_on_keys: string[];
}

export function validateAcyclicDag(nodes: DagNodeInput[]): { valid: boolean; error?: string } {
  const keys = new Set(nodes.map((n) => n.temp_key));

  for (const n of nodes) {
    for (const dep of n.depends_on_keys) {
      if (!keys.has(dep)) {
        return { valid: false, error: `Missing dependency key "${dep}" referenced by "${n.temp_key}"` };
      }
      if (dep === n.temp_key) {
        return { valid: false, error: `Self-dependency detected on "${n.temp_key}"` };
      }
    }
  }

  const state = new Map<string, 'visiting' | 'visited'>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.temp_key, n.depends_on_keys);

  function hasCycle(node: string): boolean {
    const current = state.get(node);
    if (current === 'visiting') return true;
    if (current === 'visited') return false;

    state.set(node, 'visiting');
    for (const dep of adj.get(node) ?? []) {
      if (hasCycle(dep)) return true;
    }
    state.set(node, 'visited');
    return false;
  }

  for (const n of nodes) {
    if (hasCycle(n.temp_key)) {
      return { valid: false, error: `Cycle detected involving task "${n.temp_key}"` };
    }
  }

  return { valid: true };
}

export function findNewlyUnblockedTasks(params: {
  tasks: Array<{ id: string; status: string }>;
  dependencies: Array<{ task_id: string; depends_on_task_id: string }>;
}): string[] {
  const statusById = new Map(params.tasks.map((t) => [t.id, t.status]));
  const depsByTask = new Map<string, string[]>();

  for (const edge of params.dependencies) {
    const list = depsByTask.get(edge.task_id) ?? [];
    list.push(edge.depends_on_task_id);
    depsByTask.set(edge.task_id, list);
  }

  const ready: string[] = [];
  for (const task of params.tasks) {
    if (task.status !== 'pending_dependencies') continue;
    const deps = depsByTask.get(task.id) ?? [];
    const allDone = deps.every((depId) => statusById.get(depId) === 'completed');
    if (allDone) ready.push(task.id);
  }

  return ready;
}
