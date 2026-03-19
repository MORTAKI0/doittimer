-- Remove legacy no-date queue RPC overloads so PostgREST resolves only the
-- date-aware queue contract introduced in 20260217.

drop function if exists public.task_queue_list();
drop function if exists public.task_queue_add(uuid);
drop function if exists public.task_queue_remove(uuid);
drop function if exists public.task_queue_move_up(uuid);
drop function if exists public.task_queue_move_down(uuid);
