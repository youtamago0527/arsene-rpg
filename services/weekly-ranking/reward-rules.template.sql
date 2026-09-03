-- Copy this file to a NEW numbered migration after every value is approved.
-- Do not edit an already-applied migration. Keep enabled=0 during staging input.
INSERT INTO reward_rules
  (active_from_week,min_rank,max_rank,reward_key,item_id,quantity,label,enabled)
VALUES
  ('YYYY-MM-DD', 1, 1, 'APPROVED_UNIQUE_KEY', 'APPROVED_ITEM_ID', 1, 'APPROVED_LABEL', 0);

-- After staging tests and product approval, a later migration may enable only
-- the reviewed version. REWARDS_CONFIGURED must remain false until then.
-- UPDATE reward_rules SET enabled=1 WHERE active_from_week='YYYY-MM-DD';
