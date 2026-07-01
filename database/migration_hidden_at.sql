-- Migration: Add hidden_at timestamps for per-user message visibility after deletion
-- When a user deletes a conversation, messages before hidden_at are hidden for them only

ALTER TABLE conversations 
    ADD COLUMN hidden_at_owner DATETIME DEFAULT NULL AFTER hidden_by_owner,
    ADD COLUMN hidden_at_requester DATETIME DEFAULT NULL AFTER hidden_by_requester;
