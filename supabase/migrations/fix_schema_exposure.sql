-- Fix PostgREST schema exposure
-- This migration exposes the public schema to PostgREST API

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage';
NOTIFY pgrst, 'reload schema';
