import type { VercelRequest, VercelResponse } from '../../_lib/httpTypes.js';
import { requireAdmin } from '../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../_lib/auditLogger.js';
import { validateAcyclicDag } from '../../_lib/dagEngine.js';
import { createWorkflowSchema } from '../../_lib/schemas.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const [workflows, tasks, deps] = await Promise.all([
      supabase.from('ops_workflows').select('*').order('created_at', { ascending: false }),
      supabase.from('ops_tasks').select('*').order('seq', { ascending: false }).limit(120),
      supabase.from('ops_task_dependencies').select('*'),
    ]);
    return res.status(200).json({
      workflows: workflows.data ?? [],
      tasks: tasks.data ?? [],
      dependencies: deps.data ?? [],
    });
  }

  if (req.method === 'POST') {
    const parsed = createWorkflowSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });

    const dagCheck = validateAcyclicDag(
      parsed.data.tasks.map((t) => ({ temp_key: t.temp_key, depends_on_keys: t.depends_on_keys })),
    );
    if (!dagCheck.valid) {
      return res.status(422).json({ error: 'INVALID_DAG', message: dagCheck.error });
    }

    const { data: workflow, error: wfErr } = await supabase
      .from('ops_workflows')
      .insert({
        workspace_id: parsed.data.workspace_id,
        title: parsed.data.title,
        goal: parsed.data.goal,
        status: 'active',
      })
      .select('*')
      .single();

    if (wfErr || !workflow) return res.status(400).json({ error: 'DB_ERROR', message: wfErr?.message });

    const tempToRealId = new Map<string, string>();
    const createdTasks = [];

    for (const t of parsed.data.tasks) {
      const initialStatus =
        t.depends_on_keys.length > 0
          ? 'pending_dependencies'
          : t.requires_human_approval
          ? 'waiting_approval'
          : 'queued';

      const { data: insertedTask, error: tErr } = await supabase
        .from('ops_tasks')
        .insert({
          workspace_id: parsed.data.workspace_id,
          workflow_id: workflow.id,
          assigned_agent_id: t.assigned_agent_id,
          title: t.title,
          instructions: t.instructions,
          priority: t.priority,
          requires_human_approval: t.requires_human_approval,
          status: initialStatus,
        })
        .select('*')
        .single();

      if (tErr || !insertedTask) {
        return res.status(400).json({ error: 'TASK_INSERT_FAILED', message: tErr?.message });
      }
      tempToRealId.set(t.temp_key, insertedTask.id);
      createdTasks.push(insertedTask);
    }

    const depEdges: Array<{ task_id: string; depends_on_task_id: string }> = [];
    for (const t of parsed.data.tasks) {
      const childId = tempToRealId.get(t.temp_key)!;
      for (const depKey of t.depends_on_keys) {
        const parentId = tempToRealId.get(depKey)!;
        depEdges.push({ task_id: childId, depends_on_task_id: parentId });
      }
    }

    if (depEdges.length > 0) {
      await supabase.from('ops_task_dependencies').insert(depEdges);
    }

    await recordAuditAndEvent({
      actorType: 'admin',
      actorId: admin.email,
      action: 'workflow.created',
      resourceType: 'workflow',
      resourceId: workflow.id,
      workspaceId: workflow.workspace_id,
      summary: `Workflow "${workflow.title}" creado con ${createdTasks.length} tarea(s)`,
    });

    return res.status(201).json({ workflow, tasks: createdTasks, dependencies: depEdges });
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
