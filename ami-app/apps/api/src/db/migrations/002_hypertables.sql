-- Ami Safety Platform — TimescaleDB Hypertables & Retention Policy
-- Migration 002: Hypertables for high-velocity and sensitive time-series logs

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    -- Convert time-series tables to hypertables
    PERFORM create_hypertable('distress_alert_events', 'created_at', if_not_exists => TRUE);
    PERFORM create_hypertable('emergency_action_logs', 'created_at', if_not_exists => TRUE);
    PERFORM create_hypertable('ai_call_sessions', 'started_at', if_not_exists => TRUE);

    -- Apply 90-day privacy retention policy for sensitive emergency & distress records
    PERFORM add_retention_policy('distress_alert_events', INTERVAL '90 days', if_not_exists => TRUE);
    PERFORM add_retention_policy('emergency_action_logs', INTERVAL '90 days', if_not_exists => TRUE);
    RAISE NOTICE 'TimescaleDB hypertables and retention policies configured successfully.';
  ELSE
    RAISE NOTICE 'TimescaleDB extension not active; skipping hypertable conversion.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Notice: Hypertables skipped or already exist: %', SQLERRM;
END $$;
