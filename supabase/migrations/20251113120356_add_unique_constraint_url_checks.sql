/*
  # Add UNIQUE constraint to url_checks for upsert operations

  1. Changes
    - Add UNIQUE(audit_id, url) constraint to url_checks table
    - This enables upsert operations to work correctly
*/

ALTER TABLE url_checks ADD CONSTRAINT unique_audit_url UNIQUE(audit_id, url);
