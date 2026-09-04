-- Re-key conversations from per-listing to per-person (Instagram-style DMs).
--
-- Until now a conversation was UNIQUE(car_id, buyer_id, seller_id): one thread
-- per CAR. A buyer messaging the same seller about three cars produced three
-- separate threads, which read as three duplicate "people" in the list. The
-- product is one private 1:1 thread per buyer<->seller pair, so this re-keys to
-- UNIQUE(buyer_id, seller_id) and merges the existing per-car threads between
-- the same two people into a single survivor, losing no message and no report.
--
-- Direction is preserved on purpose: the pair is (buyer = the one who reached
-- out, seller = the car's owner). A reverse-direction thread — the same two
-- humans with roles swapped on another car — stays its own thread, matching how
-- first contact is gated (a buyer opens a thread with an approved seller about a
-- live, inspected car; a seller cannot cold-open one). car_id stays on the row
-- as the "first discussed" listing context, no longer part of the key.
--
-- The migration runner wraps this file in a single transaction, so the temp
-- table and the re-key either all land or none do.

-- 1. For every (buyer_id, seller_id) pair, the earliest-created conversation is
--    the survivor; map each of the pair's other rows to it.
CREATE TEMP TABLE conv_merge ON COMMIT DROP AS
SELECT c.id AS loser_id, s.survivor_id
FROM conversations c
JOIN (
  SELECT DISTINCT ON (buyer_id, seller_id)
         buyer_id, seller_id, id AS survivor_id
  FROM conversations
  ORDER BY buyer_id, seller_id, created_at, id
) s ON s.buyer_id = c.buyer_id AND s.seller_id = c.seller_id
WHERE c.id <> s.survivor_id;

-- 2. Move every message and every moderation report off the losers onto their
--    survivor (before any delete, so no FK is ever dangling).
UPDATE messages m
   SET conversation_id = cm.survivor_id
  FROM conv_merge cm
 WHERE m.conversation_id = cm.loser_id;

UPDATE message_reports r
   SET conversation_id = cm.survivor_id
  FROM conv_merge cm
 WHERE r.conversation_id = cm.loser_id;

-- 3. The losers are now empty — remove them.
DELETE FROM conversations c
 USING conv_merge cm
 WHERE c.id = cm.loser_id;

-- 4. Recompute each survivor's last-message summary from its merged history, so
--    the list orders and previews correctly right after the merge.
UPDATE conversations c
   SET last_message = lm.text,
       last_message_at = lm.created_at
  FROM (
    SELECT DISTINCT ON (conversation_id)
           conversation_id, text, created_at
    FROM messages
    ORDER BY conversation_id, created_at DESC, id DESC
  ) lm
 WHERE lm.conversation_id = c.id;

-- 5. Swap the uniqueness rule: one thread per person pair, not per car.
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_car_id_buyer_id_seller_id_key;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_buyer_id_seller_id_key UNIQUE (buyer_id, seller_id);

-- 6. Participant lookups (either side of a pair) now drive the list and the
--    find-or-create, so index both directions.
CREATE INDEX IF NOT EXISTS idx_conversations_buyer  ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id);
