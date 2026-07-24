# Current Supabase Schema

Generated from the live Supabase REST/OpenAPI schema at 2026-07-24T15:54:09.109Z.

This file is intentionally generated from Supabase instead of copied from project docs, because the database can drift while the app is being built.

### practice_modes

Current row count: 3

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | string (uuid) | no | Note: This is a Primary Key.<pk/> |
| `code` | string (character varying) | no |  |
| `name` | string (character varying) | no |  |
| `description` | string (text) | yes |  |
| `is_active` | boolean (boolean) | no |  |
| `created_at` | string (timestamp with time zone) | no |  |
### question_types

Current row count: 8

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | string (uuid) | no | Note: This is a Primary Key.<pk/> |
| `mode_id` | string (uuid) | no | Note: This is a Foreign Key to `practice_modes.id`.<fk table='practice_modes' column='id'/> |
| `code` | string (character varying) | no |  |
| `name` | string (character varying) | no |  |
| `default_prep_seconds` | integer (smallint) | no |  |
| `default_answer_seconds` | integer (smallint) | no |  |
| `default_replay_limit` | integer (smallint) | no |  |
| `requires_stimulus` | boolean (boolean) | no |  |
| `required_asset_types` | array (text[]) | no |  |
| `config` | unknown (jsonb) | no |  |
| `sort_order` | integer (smallint) | no |  |
| `is_active` | boolean (boolean) | no |  |
| `created_at` | string (timestamp with time zone) | no |  |
| `updated_at` | string (timestamp with time zone) | no |  |
### topics

Current row count: 36

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | string (uuid) | no | Note: This is a Primary Key.<pk/> |
| `mode_id` | string (uuid) | yes | Note: This is a Foreign Key to `practice_modes.id`.<fk table='practice_modes' column='id'/> |
| `name` | string (character varying) | no |  |
| `slug` | string (character varying) | no |  |
| `description` | string (text) | yes |  |
| `is_active` | boolean (boolean) | no |  |
### question_groups

Current row count: 4

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | string (uuid) | no | Note: This is a Primary Key.<pk/> |
| `mode_id` | string (uuid) | no | Note: This is a Foreign Key to `practice_modes.id`.<fk table='practice_modes' column='id'/> |
| `topic_id` | string (uuid) | yes |  |
| `code` | string (character varying) | no |  |
| `group_type` | string (character varying) | no |  |
| `title` | string (character varying) | no |  |
| `shared_context` | string (text) | yes |  |
| `difficulty_level` | string (character varying) | no |  |
| `status` | string (character varying) | no |  |
| `metadata` | unknown (jsonb) | no |  |
| `created_at` | string (timestamp with time zone) | no |  |
| `updated_at` | string (timestamp with time zone) | no |  |
### questions

Current row count: 131

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | string (uuid) | no | Note: This is a Primary Key.<pk/> |
| `mode_id` | string (uuid) | no | Note: This is a Foreign Key to `practice_modes.id`.<fk table='practice_modes' column='id'/> |
| `question_type_id` | string (uuid) | no |  |
| `group_id` | string (uuid) | yes |  |
| `topic_id` | string (uuid) | yes |  |
| `code` | string (character varying) | no |  |
| `sequence_in_group` | integer (smallint) | yes |  |
| `prompt_text` | string (text) | no |  |
| `instruction_text` | string (text) | yes |  |
| `prep_seconds` | integer (smallint) | yes |  |
| `answer_seconds` | integer (smallint) | yes |  |
| `replay_limit` | integer (smallint) | yes |  |
| `difficulty_level` | string (character varying) | no |  |
| `status` | string (character varying) | no |  |
| `version` | integer (integer) | no |  |
| `config` | unknown (jsonb) | no |  |
| `created_at` | string (timestamp with time zone) | no |  |
| `updated_at` | string (timestamp with time zone) | no |  |
### question_prompt_items

Current row count: 32

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | string (uuid) | no | Note: This is a Primary Key.<pk/> |
| `question_id` | string (uuid) | no | Note: This is a Foreign Key to `questions.id`.<fk table='questions' column='id'/> |
| `item_type` | string (character varying) | no |  |
| `content` | string (text) | no |  |
| `sequence_no` | integer (smallint) | no |  |
| `is_required` | boolean (boolean) | no |  |
### question_assets

Current row count: 0

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | string (uuid) | no | Note: This is a Primary Key.<pk/> |
| `question_id` | string (uuid) | yes | Note: This is a Foreign Key to `questions.id`.<fk table='questions' column='id'/> |
| `group_id` | string (uuid) | yes | Note: This is a Foreign Key to `question_groups.id`.<fk table='question_groups' column='id'/> |
| `asset_type` | string (character varying) | no |  |
| `storage_bucket` | string (character varying) | yes |  |
| `storage_path` | string (text) | yes |  |
| `text_content` | string (text) | yes |  |
| `mime_type` | string (character varying) | yes |  |
| `alt_text` | string (text) | yes |  |
| `sequence_no` | integer (smallint) | no |  |
| `created_at` | string (timestamp with time zone) | no |  |
