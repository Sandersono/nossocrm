-- =============================================================================
-- MULTI-TENANT SAAS FOUNDATION
-- =============================================================================

-- Helper: current authenticated user's organization
CREATE OR REPLACE FUNCTION public.current_profile_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.organization_id IS NOT NULL
  LIMIT 1;
$$;

-- Helper: current authenticated user is admin inside current tenant
CREATE OR REPLACE FUNCTION public.current_profile_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = public.current_profile_organization_id()
      AND p.role = 'admin'
  );
$$;

-- Tenant-safe dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id uuid;
    result JSON;
BEGIN
    v_org_id := public.current_profile_organization_id();

    IF v_org_id IS NULL THEN
      RETURN json_build_object(
        'total_deals', 0,
        'pipeline_value', 0,
        'total_contacts', 0,
        'total_companies', 0,
        'won_deals', 0,
        'won_value', 0,
        'lost_deals', 0,
        'activities_today', 0
      );
    END IF;

    SELECT json_build_object(
        'total_deals', (SELECT COUNT(*) FROM public.deals WHERE deleted_at IS NULL AND organization_id = v_org_id),
        'pipeline_value', (SELECT COALESCE(SUM(value), 0) FROM public.deals WHERE is_won = FALSE AND is_lost = FALSE AND deleted_at IS NULL AND organization_id = v_org_id),
        'total_contacts', (SELECT COUNT(*) FROM public.contacts WHERE deleted_at IS NULL AND organization_id = v_org_id),
        'total_companies', (SELECT COUNT(*) FROM public.crm_companies WHERE deleted_at IS NULL AND organization_id = v_org_id),
        'won_deals', (SELECT COUNT(*) FROM public.deals WHERE is_won = TRUE AND deleted_at IS NULL AND organization_id = v_org_id),
        'won_value', (SELECT COALESCE(SUM(value), 0) FROM public.deals WHERE is_won = TRUE AND deleted_at IS NULL AND organization_id = v_org_id),
        'lost_deals', (SELECT COUNT(*) FROM public.deals WHERE is_lost = TRUE AND deleted_at IS NULL AND organization_id = v_org_id),
        'activities_today', (SELECT COUNT(*) FROM public.activities WHERE DATE(date) = CURRENT_DATE AND deleted_at IS NULL AND organization_id = v_org_id)
    ) INTO result;

    RETURN result;
END;
$$;

-- Tenant-safe contact stage counts
CREATE OR REPLACE FUNCTION public.get_contact_stage_counts()
RETURNS TABLE (
  stage TEXT,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    c.stage,
    COUNT(*)::BIGINT as count
  FROM public.contacts c
  WHERE c.deleted_at IS NULL
    AND c.organization_id = public.current_profile_organization_id()
  GROUP BY c.stage;
$$;

-- Tenant-safe audit logging
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_severity TEXT DEFAULT 'info'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_log_id UUID;
BEGIN
    v_user_id := auth.uid();
    v_org_id := public.current_profile_organization_id();

    INSERT INTO public.audit_logs (
        user_id, organization_id, action, resource_type, resource_id, details, severity
    ) VALUES (
        v_user_id, v_org_id, p_action, p_resource_type, p_resource_id, p_details, p_severity
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Multi-tenant-safe new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id uuid;
    v_role text;
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    v_org_id := NULLIF(NEW.raw_user_meta_data->>'organization_id', '')::uuid;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'organization_id is required for new users in multi-tenant mode';
    END IF;

    v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'vendedor');

    INSERT INTO public.profiles (id, email, name, avatar, role, organization_id, first_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        v_role,
        v_org_id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.profiles.name),
      avatar = COALESCE(EXCLUDED.avatar, public.profiles.avatar),
      role = COALESCE(EXCLUDED.role, public.profiles.role),
      organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
      first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
      updated_at = NOW();

    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations
DROP POLICY IF EXISTS "authenticated_access" ON public.organizations;
CREATE POLICY "organizations_select_current_tenant"
  ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_profile_organization_id() AND deleted_at IS NULL);

CREATE POLICY "organizations_update_current_tenant_admin"
  ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_profile_organization_id() AND public.current_profile_is_admin())
  WITH CHECK (id = public.current_profile_organization_id());

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select_same_tenant"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_profile_organization_id()
    AND (id = auth.uid() OR public.current_profile_is_admin())
  )
  WITH CHECK (organization_id = public.current_profile_organization_id());

-- Organization settings
DROP POLICY IF EXISTS "Admins can manage org settings" ON public.organization_settings;
CREATE POLICY "organization_settings_admin_manage"
  ON public.organization_settings
  FOR ALL TO authenticated
  USING (
    organization_id = public.current_profile_organization_id()
    AND public.current_profile_is_admin()
  )
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Members can view org settings" ON public.organization_settings;
CREATE POLICY "organization_settings_member_view"
  ON public.organization_settings
  FOR SELECT TO authenticated
  USING (organization_id = public.current_profile_organization_id());

-- Boards
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.boards;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.boards;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.boards;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.boards;
CREATE POLICY "boards_tenant_all"
  ON public.boards
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

-- Board stages
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.board_stages;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.board_stages;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.board_stages;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.board_stages;
CREATE POLICY "board_stages_tenant_all"
  ON public.board_stages
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (
    organization_id = public.current_profile_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.boards b
      WHERE b.id = board_stages.board_id
        AND b.organization_id = public.current_profile_organization_id()
    )
  );

-- Core CRM entities with organization_id
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.crm_companies;
CREATE POLICY "crm_companies_tenant_all"
  ON public.crm_companies
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.contacts;
CREATE POLICY "contacts_tenant_all"
  ON public.contacts
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.products;
CREATE POLICY "products_tenant_all"
  ON public.products
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.deals;
CREATE POLICY "deals_tenant_all"
  ON public.deals
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.deal_items;
CREATE POLICY "deal_items_tenant_all"
  ON public.deal_items
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (
    organization_id = public.current_profile_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_items.deal_id
        AND d.organization_id = public.current_profile_organization_id()
    )
  );

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.activities;
CREATE POLICY "activities_tenant_all"
  ON public.activities
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tags;
CREATE POLICY "tags_tenant_all"
  ON public.tags
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.custom_field_definitions;
CREATE POLICY "custom_field_definitions_tenant_all"
  ON public.custom_field_definitions
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.leads;
CREATE POLICY "leads_tenant_all"
  ON public.leads
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.system_notifications;
CREATE POLICY "system_notifications_tenant_all"
  ON public.system_notifications
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.audit_logs;
CREATE POLICY "audit_logs_tenant_select"
  ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    (public.current_profile_is_admin() AND organization_id = public.current_profile_organization_id())
    OR (user_id = auth.uid() AND organization_id = public.current_profile_organization_id())
  );

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_consents;
CREATE POLICY "user_consents_self_all"
  ON public.user_consents
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.rate_limits;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.security_alerts;
CREATE POLICY "security_alerts_tenant_all"
  ON public.security_alerts
  FOR ALL TO authenticated
  USING (organization_id = public.current_profile_organization_id())
  WITH CHECK (organization_id = public.current_profile_organization_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ai_conversations;
CREATE POLICY "ai_conversations_self_all"
  ON public.ai_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ai_decisions;
CREATE POLICY "ai_decisions_self_all"
  ON public.ai_decisions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ai_audio_notes;
CREATE POLICY "ai_audio_notes_self_all"
  ON public.ai_audio_notes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ai_suggestion_interactions;
CREATE POLICY "ai_suggestion_interactions_self_all"
  ON public.ai_suggestion_interactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Deal notes / files inherit access from deal
DROP POLICY IF EXISTS "deal_notes_access" ON public.deal_notes;
CREATE POLICY "deal_notes_tenant_all"
  ON public.deal_notes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_notes.deal_id
        AND d.organization_id = public.current_profile_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_notes.deal_id
        AND d.organization_id = public.current_profile_organization_id()
    )
  );

DROP POLICY IF EXISTS "deal_files_access" ON public.deal_files;
CREATE POLICY "deal_files_tenant_all"
  ON public.deal_files
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_files.deal_id
        AND d.organization_id = public.current_profile_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_files.deal_id
        AND d.organization_id = public.current_profile_organization_id()
    )
  );

-- Tenant-safe deal file storage access
DROP POLICY IF EXISTS "deal_files_upload" ON storage.objects;
CREATE POLICY "deal_files_upload"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deal-files'
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id::text = split_part(storage.objects.name, '/', 1)
        AND d.organization_id = public.current_profile_organization_id()
    )
  );

DROP POLICY IF EXISTS "deal_files_read" ON storage.objects;
CREATE POLICY "deal_files_read"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'deal-files'
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id::text = split_part(storage.objects.name, '/', 1)
        AND d.organization_id = public.current_profile_organization_id()
    )
  );

DROP POLICY IF EXISTS "deal_files_delete" ON storage.objects;
CREATE POLICY "deal_files_delete"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'deal-files'
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id::text = split_part(storage.objects.name, '/', 1)
        AND d.organization_id = public.current_profile_organization_id()
    )
  );

GRANT EXECUTE ON FUNCTION public.current_profile_organization_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_stage_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;
