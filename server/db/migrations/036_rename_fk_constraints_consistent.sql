-- Migration: 036_rename_fk_constraints_consistent
-- Description: Standardize all foreign key names to:
--              fk_<from_table>_<from_column>
--              Postgres default names (..._fkey) are renamed; one legacy
--              custom name (fk_user_profiles_auth_user) is aligned too.
-- Rollback: reverse RENAME CONSTRAINT pairs if needed.

DO $$
DECLARE
  renames TEXT[][] := ARRAY[
    -- Postgres default style → project style
    ARRAY['ledger_entries_order_id_fkey', 'fk_ledger_entries_order_id', 'ledger_entries'],
    ARRAY['loyalty_points_ledger_user_id_fkey', 'fk_loyalty_points_ledger_user_id', 'loyalty_points_ledger'],
    ARRAY['order_items_order_id_fkey', 'fk_order_items_order_id', 'order_items'],
    ARRAY['organization_memberships_organization_id_fkey', 'fk_organization_memberships_organization_id', 'organization_memberships'],
    ARRAY['organization_memberships_user_id_fkey', 'fk_organization_memberships_user_id', 'organization_memberships'],
    ARRAY['payment_attempts_order_id_fkey', 'fk_payment_attempts_order_id', 'payment_attempts'],
    ARRAY['role_permissions_permission_id_fkey', 'fk_role_permissions_permission_id', 'role_permissions'],
    ARRAY['role_permissions_role_id_fkey', 'fk_role_permissions_role_id', 'role_permissions'],
    ARRAY['seat_holds_event_id_fkey', 'fk_seat_holds_event_id', 'seat_holds'],
    ARRAY['seat_holds_seat_id_fkey', 'fk_seat_holds_seat_id', 'seat_holds'],
    ARRAY['seat_sections_seat_map_id_fkey', 'fk_seat_sections_seat_map_id', 'seat_sections'],
    ARRAY['seats_seat_section_id_fkey', 'fk_seats_seat_section_id', 'seats'],
    ARRAY['sessions_user_id_fkey', 'fk_sessions_user_id', 'sessions'],
    ARRAY['user_memberships_tier_id_fkey', 'fk_user_memberships_tier_id', 'user_memberships'],
    ARRAY['user_memberships_user_id_fkey', 'fk_user_memberships_user_id', 'user_memberships'],
    ARRAY['vouchers_event_id_fkey', 'fk_vouchers_event_id', 'vouchers'],
    -- Align one-off custom name (FK is on user_profiles.id)
    ARRAY['fk_user_profiles_auth_user', 'fk_user_profiles_id', 'user_profiles']
  ];
  r TEXT[];
  old_name TEXT;
  new_name TEXT;
  tbl TEXT;
BEGIN
  FOREACH r SLICE 1 IN ARRAY renames
  LOOP
    old_name := r[1];
    new_name := r[2];
    tbl := r[3];

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = old_name)
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = new_name)
    THEN
      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', tbl, old_name, new_name);
    END IF;
  END LOOP;
END $$;
