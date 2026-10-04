CREATE TABLE IF NOT EXISTS quizzes (
 id text PRIMARY KEY, name varchar(40) NOT NULL, answers smallint[] NOT NULL,
 version integer NOT NULL DEFAULT 1, owner_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (cardinality(answers)=15), CHECK (answers <@ ARRAY[0,1,2,3]::smallint[])
);
CREATE TABLE IF NOT EXISTS attempts (
 id text PRIMARY KEY, quiz_id text NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
 name varchar(40) NOT NULL, answers smallint[] NOT NULL, score smallint NOT NULL CHECK(score BETWEEN 0 AND 15),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(cardinality(answers)=15),
 CHECK (answers <@ ARRAY[0,1,2,3]::smallint[])
);
CREATE INDEX IF NOT EXISTS attempts_quiz_date ON attempts(quiz_id,created_at DESC);
CREATE INDEX IF NOT EXISTS quizzes_date ON quizzes(created_at DESC);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);


-- AI migration: safe to run again; existing tests are preserved.
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions jsonb;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'classic';
CREATE TABLE IF NOT EXISTS app_settings (key text PRIMARY KEY, value jsonb NOT NULL);
