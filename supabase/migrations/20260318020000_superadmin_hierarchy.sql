-- =============================================================================
-- SUPERADMIN HIERARCHY
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_profile_is_superadmin()
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
      AND p.role = 'superadmin'
  );
$$;

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
      AND p.role IN ('admin', 'superadmin')
  );
$$;

DO $$
DECLARE
  v_existing_superadmin uuid;
  v_promoted_profile uuid;
BEGIN
  SELECT p.id
  INTO v_existing_superadmin
  FROM public.profiles p
  WHERE p.role = 'superadmin'
  LIMIT 1;

  IF v_existing_superadmin IS NULL THEN
    SELECT p.id
    INTO v_promoted_profile
    FROM public.profiles p
    JOIN public.organizations o ON o.id = p.organization_id
    WHERE p.role = 'admin'
    ORDER BY o.created_at ASC NULLS LAST, p.created_at ASC NULLS LAST, p.id ASC
    LIMIT 1;

    IF v_promoted_profile IS NOT NULL THEN
      UPDATE public.profiles
      SET role = 'superadmin',
          updated_at = NOW()
      WHERE id = v_promoted_profile;

      UPDATE auth.users
      SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'superadmin')
      WHERE id = v_promoted_profile;
    END IF;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Admins can manage organization invites" ON public.organization_invites;
CREATE POLICY "Admins can manage organization invites"
  ON public.organization_invites
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = organization_invites.organization_id
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = organization_invites.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage api keys" ON public.api_keys;
CREATE POLICY "Admins can manage api keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = api_keys.organization_id
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = api_keys.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

CREATE OR REPLACE FUNCTION public.create_api_key(p_name TEXT DEFAULT NULL)
RETURNS TABLE (
  api_key_id UUID,
  token TEXT,
  key_prefix TEXT,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
  org_id UUID;
  t TEXT;
  prefix TEXT;
  h TEXT;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.organization_id INTO org_id
  FROM public.profiles p
  WHERE p.id = uid;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found for user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid
      AND p.organization_id = org_id
      AND p.role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  t := public._api_key_make_token();
  prefix := left(t, 12);
  h := public._api_key_sha256_hex(t);

  INSERT INTO public.api_keys (organization_id, name, key_prefix, key_hash, created_by, updated_at)
  VALUES (org_id, COALESCE(NULLIF(btrim(p_name), ''), 'Integracao'), prefix, h, uid, NOW())
  RETURNING id INTO api_key_id;

  token := t;
  key_prefix := prefix;
  organization_id := org_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_api_key(p_api_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
  org_id UUID;
  key_org UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.organization_id INTO org_id
  FROM public.profiles p
  WHERE p.id = uid;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found for user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid
      AND p.organization_id = org_id
      AND p.role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT k.organization_id INTO key_org
  FROM public.api_keys k
  WHERE k.id = p_api_key_id;

  IF key_org IS NULL THEN
    RAISE EXCEPTION 'API key not found';
  END IF;

  IF key_org <> org_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.api_keys
  SET revoked_at = NOW(),
      updated_at = NOW()
  WHERE id = p_api_key_id;
END;
$$;

DROP POLICY IF EXISTS "Admins can manage inbound sources" ON public.integration_inbound_sources;
CREATE POLICY "Admins can manage inbound sources"
  ON public.integration_inbound_sources
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = integration_inbound_sources.organization_id
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = integration_inbound_sources.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage outbound endpoints" ON public.integration_outbound_endpoints;
CREATE POLICY "Admins can manage outbound endpoints"
  ON public.integration_outbound_endpoints
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = integration_outbound_endpoints.organization_id
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = integration_outbound_endpoints.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can view inbound webhook events" ON public.webhook_events_in;
CREATE POLICY "Admins can view inbound webhook events"
  ON public.webhook_events_in
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = webhook_events_in.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can view outbound webhook events" ON public.webhook_events_out;
CREATE POLICY "Admins can view outbound webhook events"
  ON public.webhook_events_out
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = webhook_events_out.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can view deliveries" ON public.webhook_deliveries;
CREATE POLICY "Admins can view deliveries"
  ON public.webhook_deliveries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = webhook_deliveries.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage chatwoot integrations" ON public.chatwoot_integrations;
CREATE POLICY "Admins can manage chatwoot integrations"
  ON public.chatwoot_integrations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_integrations.organization_id
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_integrations.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage chatwoot label mappings" ON public.chatwoot_label_mappings;
CREATE POLICY "Admins can manage chatwoot label mappings"
  ON public.chatwoot_label_mappings
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_label_mappings.organization_id
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_label_mappings.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can view chatwoot event logs" ON public.chatwoot_event_logs;
CREATE POLICY "Admins can view chatwoot event logs"
  ON public.chatwoot_event_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_event_logs.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

GRANT EXECUTE ON FUNCTION public.current_profile_is_superadmin TO authenticated;
