-- Create schedule_configurations table
create table if not exists schedule_configurations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  config jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add RLS (Row Level Security) policies
alter table schedule_configurations enable row level security;

-- Users can only access their own configurations
create policy "Users can view their own schedule configurations" on schedule_configurations
  for select using (auth.uid() = user_id);

create policy "Users can insert their own schedule configurations" on schedule_configurations
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own schedule configurations" on schedule_configurations
  for update using (auth.uid() = user_id);

create policy "Users can delete their own schedule configurations" on schedule_configurations
  for delete using (auth.uid() = user_id);

-- Add index for better performance
create index if not exists idx_schedule_configurations_user_id on schedule_configurations(user_id);
create index if not exists idx_schedule_configurations_tenant_id on schedule_configurations(tenant_id);
create index if not exists idx_schedule_configurations_created_at on schedule_configurations(created_at desc);

-- Add trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_schedule_configurations_updated_at
  before update on schedule_configurations
  for each row execute procedure update_updated_at_column();