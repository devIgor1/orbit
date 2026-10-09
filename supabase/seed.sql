-- Run after supabase/provision-demo.mjs has provisioned actual Supabase Auth users.
-- Idempotent seed for a local creative studio. No passwords or service keys here.
do $$
declare
  owner_id uuid;
  member_ids uuid[];
  workspace uuid = 'a0b17000-0000-4000-8000-000000000001';
  project_ids uuid[] = array[
    'b0b17000-0000-4000-8000-000000000001'::uuid, 'b0b17000-0000-4000-8000-000000000002'::uuid,
    'b0b17000-0000-4000-8000-000000000003'::uuid, 'b0b17000-0000-4000-8000-000000000004'::uuid,
    'b0b17000-0000-4000-8000-000000000005'::uuid, 'b0b17000-0000-4000-8000-000000000006'::uuid
  ];
  titles text[] = array['Aurora — Identidade visual', 'Forma — Website institucional', 'Noma — Campanha de lançamento', 'Verde — Design de embalagem', 'Studio Alto — Social media', 'Lume — Estratégia de marca'];
  descriptions text[] = array[
    'Uma nova expressão para uma marca que acredita em novos começos. Estratégia, identidade e guia de aplicação.',
    'Uma experiência digital leve e editorial para o escritório de arquitetura Forma.',
    'Direção criativa e campanha integrada para apresentar a nova coleção ao mundo.',
    'Design que traduz a essência natural da marca em cada detalhe da embalagem.',
    'Conteúdo, direção de arte e presença digital com uma voz consistente.',
    'Posicionamento e narrativa para uma marca com muito a dizer.'
  ];
  task_titles text[] = array['Pesquisa e referências', 'Conceito criativo', 'Exploração visual', 'Apresentação da proposta', 'Ajustes e refinamentos', 'Produção dos materiais', 'Revisão com o cliente', 'Entrega final'];
  stages public.task_status[] = array['done', 'done', 'done', 'in_progress', 'in_progress', 'review', 'todo', 'todo'];
  priorities public.task_priority[] = array['medium', 'high', 'medium', 'high', 'medium', 'low', 'high', 'medium'];
  task_id uuid;
  stage public.task_status;
  p integer;
  t integer;
begin
  select id into owner_id from auth.users where email = 'marina@orbit.local';
  if owner_id is null then raise exception 'Provision Auth users first with node supabase/provision-demo.mjs'; end if;
  select array_agg(id order by email) into member_ids from auth.users where email in ('marina@orbit.local', 'rafael@orbit.local', 'beatriz@orbit.local', 'lucas@orbit.local');
  if cardinality(member_ids) <> 4 then raise exception 'Four provisioned Auth accounts are required'; end if;
  insert into public.workspaces(id, name) values(workspace, 'Estúdio Criativo') on conflict(id) do nothing;
  insert into public.workspace_members(workspace_id, user_id, role)
    select workspace, member_id, case when member_id = owner_id then 'admin'::public.member_role else 'member'::public.member_role end
    from unnest(member_ids) member_id on conflict(workspace_id, user_id) do nothing;
  update public.profiles set job_title = case
    when id = owner_id then 'Diretora criativa'
    when id = (select id from auth.users where email = 'rafael@orbit.local') then 'Designer de produto'
    when id = (select id from auth.users where email = 'beatriz@orbit.local') then 'Brand designer'
    else 'Diretor de arte' end where id = any(member_ids);

  for p in 1..6 loop
    insert into public.projects(id, workspace_id, title, description, status, due_date, created_by, created_at)
    values(project_ids[p], workspace, titles[p], descriptions[p],
      case when p = 6 then 'completed'::public.project_status when p = 5 then 'paused'::public.project_status else 'active'::public.project_status end,
      current_date + (p * 4), owner_id, now() - make_interval(days => 21 - p)) on conflict(id) do nothing;
    for t in 1..8 loop
      task_id = md5('orbit-seed-task-' || p || '-' || t)::uuid;
      stage = case when p = 6 then 'done'::public.task_status else stages[t] end;
      insert into public.tasks(id, workspace_id, project_id, title, description, status, priority, assignee_id, due_date, created_by, created_at, completed_at)
      values(task_id, workspace, project_ids[p], task_titles[t],
        'Alinhar os detalhes com a equipe e documentar as decisões para a próxima etapa do projeto.',
        stage, priorities[t], member_ids[1 + ((p + t) % 4)], current_date + t - 5 + (p % 3),
        owner_id, now() - make_interval(days => (p + t) % 7),
        case when stage = 'done' then now() - make_interval(days => (p + t) % 7) else null end)
      on conflict(id) do nothing;
    end loop;
  end loop;
  insert into public.task_comments(id, workspace_id, task_id, author_id, body)
  values('c0b17000-0000-4000-8000-000000000001', workspace, md5('orbit-seed-task-1-4')::uuid, owner_id,
    'Organizei as referências e os principais caminhos para a apresentação. Vamos alinhar os últimos detalhes na revisão.')
  on conflict(id) do nothing;
end;
$$;
