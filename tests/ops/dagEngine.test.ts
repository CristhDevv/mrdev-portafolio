import assert from 'node:assert/strict';
import test from 'node:test';
import { findNewlyUnblockedTasks, validateAcyclicDag } from '../../api/ops/_lib/dagEngine.js';

test('validateAcyclicDag accepts valid linear and parallel DAG', () => {
  const res = validateAcyclicDag([
    { temp_key: 'research', depends_on_keys: [] },
    { temp_key: 'arch', depends_on_keys: ['research'] },
    { temp_key: 'dev', depends_on_keys: ['arch'] },
    { temp_key: 'qa', depends_on_keys: ['arch'] },
    { temp_key: 'review', depends_on_keys: ['dev', 'qa'] },
  ]);
  assert.equal(res.valid, true);
});

test('validateAcyclicDag rejects cycles and self-dependencies', () => {
  const cycle = validateAcyclicDag([
    { temp_key: 'a', depends_on_keys: ['b'] },
    { temp_key: 'b', depends_on_keys: ['a'] },
  ]);
  assert.equal(cycle.valid, false);

  const selfDep = validateAcyclicDag([{ temp_key: 'a', depends_on_keys: ['a'] }]);
  assert.equal(selfDep.valid, false);
});

test('findNewlyUnblockedTasks only unlocks tasks whose all parents completed', () => {
  const ready = findNewlyUnblockedTasks({
    tasks: [
      { id: 't1', status: 'completed' },
      { id: 't2', status: 'running' },
      { id: 't3', status: 'pending_dependencies' },
      { id: 't4', status: 'pending_dependencies' },
    ],
    dependencies: [
      { task_id: 't3', depends_on_task_id: 't1' },
      { task_id: 't4', depends_on_task_id: 't1' },
      { task_id: 't4', depends_on_task_id: 't2' },
    ],
  });
  assert.deepEqual(ready, ['t3']);
});
