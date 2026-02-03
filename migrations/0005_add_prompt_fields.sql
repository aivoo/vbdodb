-- Add prompt fields to request_logs table for logging user messages
-- system_prompt: the system prompt from the request
-- user_prompt: the user prompt (last user message) from the request

ALTER TABLE request_logs ADD COLUMN system_prompt TEXT DEFAULT NULL;
ALTER TABLE request_logs ADD COLUMN user_prompt TEXT DEFAULT NULL;
