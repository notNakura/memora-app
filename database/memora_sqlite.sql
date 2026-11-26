-- =====================================================================
-- Memora · Base local en el teléfono (SQLite, expo-sqlite)
-- Réplica de los datos del usuario para el modo sin conexión.
-- Diferencias con PostgreSQL:
--   * No incluye email_code, audit_log ni app_user.password_hash (datos
--     sensibles que solo viven en el servidor).
--   * No tiene los disparadores (último administrador, cupo de la sección)
--     ni la validación del alfabeto de los códigos: los aplica el servidor.
--   * Tipos simplificados (TEXT para fechas y UUID, INTEGER para booleanos).
--   * Agrega pending_change, la cola de cambios por enviar.
-- Los UUID se generan en el teléfono (expo-crypto) para que no choquen.
-- =====================================================================
PRAGMA foreign_keys = ON;

CREATE TABLE app_user (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    national_id            VARCHAR(12)   UNIQUE,        
    first_names            VARCHAR(60),                  
    last_names             VARCHAR(60),                  
    email                  VARCHAR(120)  NOT NULL UNIQUE,
    email_verified_at      TEXT,                     
    birth_date             TEXT          CHECK (birth_date >= '1920-01-01'),
    sex                    VARCHAR(12)   CHECK (sex IN ('female','male','unspecified')),
                           
    desired_retention      NUMERIC(3,2)  NOT NULL DEFAULT 0.90
                           CHECK (desired_retention BETWEEN 0.70 AND 0.97),
    time_factor            NUMERIC(3,2)  NOT NULL DEFAULT 1.00
                           CHECK (time_factor BETWEEN 1.00 AND 3.00),
    daily_new_limit        SMALLINT      NOT NULL DEFAULT 20 CHECK (daily_new_limit BETWEEN 0 AND 200),
    notifications_enabled  INTEGER       NOT NULL DEFAULT 1,
    vibration_enabled      INTEGER       NOT NULL DEFAULT 1,   
    reminder_time          TEXT          NOT NULL DEFAULT '19:00',
    show_name_publicly     INTEGER       NOT NULL DEFAULT 1,
    onboarding_completed   INTEGER       NOT NULL DEFAULT 0,
    is_platform_admin      INTEGER       NOT NULL DEFAULT 0,  
    is_active              INTEGER       NOT NULL DEFAULT 1,   
    created_at             TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP
    CHECK ((national_id IS NULL) = (first_names IS NULL) AND (first_names IS NULL) = (last_names IS NULL))  
);

CREATE TABLE institution (
    institution_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name            VARCHAR(120)  NOT NULL,
    type            VARCHAR(12)   NOT NULL CHECK (type IN ('university','institute','course')),
    join_code       CHAR(8)       NOT NULL UNIQUE     ,  
    code_expires_at TEXT,                       
    join_mode       VARCHAR(8)    NOT NULL DEFAULT 'approval'
                    CHECK (join_mode IN ('open','approval','roster')),
    status          VARCHAR(10)   NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_by      INT           NOT NULL REFERENCES app_user(user_id),
    created_at      TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE area (
    area_id INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id  INT           NOT NULL REFERENCES institution(institution_id) ON DELETE CASCADE,
    name            VARCHAR(100)  NOT NULL,         
    UNIQUE (institution_id, name)
);

CREATE TABLE membership (
    membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INT           NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    institution_id  INT           NOT NULL REFERENCES institution(institution_id) ON DELETE CASCADE,
    area_id         INT           REFERENCES area(area_id) ON DELETE CASCADE,  
    role            VARCHAR(18)   NOT NULL
                    CHECK (role IN ('student','teacher','area_admin','institution_admin')),
    status          VARCHAR(10)   NOT NULL DEFAULT 'active'
                    CHECK (status IN ('invited','pending','active','rejected','removed')),
    approved_by     INT           REFERENCES app_user(user_id),
    created_at      TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((role = 'area_admin') = (area_id IS NOT NULL))
);

CREATE TABLE academic_term (
    term_id INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id  INT          NOT NULL REFERENCES institution(institution_id) ON DELETE CASCADE,
    name            VARCHAR(10)  NOT NULL,      
    starts_on   TEXT         NOT NULL,
    ends_on     TEXT         NOT NULL,
    status      VARCHAR(8)   NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    UNIQUE (institution_id, name),
    CHECK (ends_on > starts_on)
);

CREATE TABLE subject (
    subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id     INT           NOT NULL REFERENCES area(area_id),
    code        VARCHAR(15)   NOT NULL,
    name        VARCHAR(100)  NOT NULL,
    UNIQUE (area_id, code)
);

CREATE TABLE unit (
    unit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id  INT           NOT NULL REFERENCES subject(subject_id) ON DELETE CASCADE,
    number      SMALLINT      NOT NULL CHECK (number > 0),
    name        VARCHAR(100)  NOT NULL,
    UNIQUE (subject_id, number)
);

CREATE TABLE section (
    section_id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id   INT          NOT NULL REFERENCES subject(subject_id),
    term_id      INT          NOT NULL REFERENCES academic_term(term_id),
    teacher_id   INT          REFERENCES app_user(user_id),   
    name         VARCHAR(20)  NOT NULL,
    join_code    CHAR(6)      NOT NULL UNIQUE          ,     
    code_expires_at TEXT,                        
    join_mode    VARCHAR(8)   NOT NULL DEFAULT 'roster'
                 CHECK (join_mode IN ('open','approval','roster')),
    capacity     SMALLINT     CHECK (capacity > 0),   
    is_archived  INTEGER      NOT NULL DEFAULT 0,
    UNIQUE (subject_id, term_id, name)
);

CREATE TABLE enrollment (
    section_id     INT          NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    student_id     INT          NOT NULL REFERENCES app_user(user_id),
    enrolled_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status         VARCHAR(10)  NOT NULL DEFAULT 'active'
                   CHECK (status IN ('invited','pending','active','rejected','left','removed')),
    reviewed_by    INT          REFERENCES app_user(user_id),   
    ended_at       TEXT,
    PRIMARY KEY (section_id, student_id),
    CHECK (status IN ('invited','pending','active','rejected') OR ended_at IS NOT NULL)
);

CREATE TABLE unit_unlock (
    student_id   INT           NOT NULL REFERENCES app_user(user_id),
    unit_id      INT           NOT NULL REFERENCES unit(unit_id) ON DELETE CASCADE,
    granted_by   INT           NOT NULL REFERENCES app_user(user_id),
    reason       VARCHAR(200)  NOT NULL,
    granted_at   TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, unit_id)
);




CREATE TABLE deck (
    deck_id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id       INT           NOT NULL REFERENCES app_user(user_id),
    subject_id      INT           NOT NULL REFERENCES subject(subject_id),
    source_deck_id  INT           REFERENCES deck(deck_id) ON DELETE SET NULL,  
    name            VARCHAR(100)  NOT NULL,
    description     VARCHAR(300),
    visibility      VARCHAR(12)   NOT NULL DEFAULT 'private'
                    CHECK (visibility IN ('private','section','institution')),
    is_hidden       INTEGER       NOT NULL DEFAULT 0,   
    is_deleted      INTEGER       NOT NULL DEFAULT 0,   
    created_at      TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deck_endorsement (
    deck_id      INT           NOT NULL REFERENCES deck(deck_id) ON DELETE CASCADE,
    section_id   INT           NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    teacher_id   INT           REFERENCES app_user(user_id),
    status       VARCHAR(10)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    requested_at TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at  TEXT,
    comment      VARCHAR(300),
    PRIMARY KEY (deck_id, section_id),
    CHECK (status = 'pending' OR (teacher_id IS NOT NULL AND reviewed_at IS NOT NULL)),
    CHECK (status <> 'rejected' OR comment IS NOT NULL)
);

CREATE TABLE deck_assignment (
    deck_id      INT        NOT NULL REFERENCES deck(deck_id) ON DELETE CASCADE,
    section_id   INT        NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    assigned_at  TEXT  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exam_date    TEXT,      
    PRIMARY KEY (deck_id, section_id)
);

CREATE TABLE deck_subscription (
    student_id     INT        NOT NULL REFERENCES app_user(user_id),
    deck_id        INT        NOT NULL REFERENCES deck(deck_id) ON DELETE CASCADE,
    subscribed_at  TEXT  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exam_date      TEXT,      
    PRIMARY KEY (student_id, deck_id)
);

CREATE TABLE card (
    card_id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id      INT           NOT NULL REFERENCES deck(deck_id) ON DELETE CASCADE,
    unit_id      INT           REFERENCES unit(unit_id),
    type         VARCHAR(20)   NOT NULL DEFAULT 'basic'
                 CHECK (type IN ('basic','cloze','image_occlusion','ordering')),
    front        TEXT          NOT NULL,
    back         TEXT          NOT NULL,
    image_url    VARCHAR(255),
    version      INT           NOT NULL DEFAULT 1 CHECK (version >= 1),
    is_active    INTEGER       NOT NULL DEFAULT 1,
    updated_at   TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE card_option (
    option_id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id      INT           NOT NULL REFERENCES card(card_id) ON DELETE CASCADE,
    text         VARCHAR(255)  NOT NULL,
    is_correct   INTEGER       NOT NULL DEFAULT 0
);

CREATE TABLE error_report (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id       INT           NOT NULL REFERENCES card(card_id) ON DELETE CASCADE,
    reporter_id   INT           NOT NULL REFERENCES app_user(user_id),
    reason        VARCHAR(16)   NOT NULL
                  CHECK (reason IN ('missing_answer','wrong_answer','confusing','inappropriate')),
    description   VARCHAR(500),
    status        VARCHAR(12)   NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','fixed','dismissed')),
    reported_at   TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewer_id   INT           REFERENCES app_user(user_id),
    resolution    VARCHAR(300),
    resolved_at   TEXT,
    CHECK (status = 'open' OR (reviewer_id IS NOT NULL AND resolved_at IS NOT NULL))
);




CREATE TABLE card_state (
    student_id        INT           NOT NULL REFERENCES app_user(user_id),
    card_id           INT           NOT NULL REFERENCES card(card_id) ON DELETE CASCADE,
    status            VARCHAR(12)   NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','learning','review','mastered')),
    stability         NUMERIC(8,2)  CHECK (stability > 0),              
    difficulty        NUMERIC(4,2)  CHECK (difficulty BETWEEN 1 AND 10), 
    format            VARCHAR(10)   NOT NULL DEFAULT 'choice'
                      CHECK (format IN ('choice','typing')),
    last_review_at    TEXT,
    due_at            TEXT,
    lapses            INT           NOT NULL DEFAULT 0 CHECK (lapses >= 0),
    avg_response_ms   INT           CHECK (avg_response_ms > 0),
    is_leech          INTEGER       NOT NULL DEFAULT 0,
    PRIMARY KEY (student_id, card_id),
    CHECK (status = 'new' OR (stability IS NOT NULL AND difficulty IS NOT NULL))
);

CREATE TABLE challenge (
    challenge_id            TEXT       PRIMARY KEY,
    student_id              INT        NOT NULL REFERENCES app_user(user_id),
    started_at              TEXT  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at             TEXT,
    total_time_sec          INT        NOT NULL DEFAULT 120 CHECK (total_time_sec > 0),
    time_per_question_sec   INT        NOT NULL DEFAULT 8   CHECK (time_per_question_sec > 0),
    extra_time_sec          INT        NOT NULL DEFAULT 0   CHECK (extra_time_sec >= 0),
    pauses                  SMALLINT   NOT NULL DEFAULT 0   CHECK (pauses >= 0)
);

CREATE TABLE challenge_card (
    challenge_id        TEXT     NOT NULL REFERENCES challenge(challenge_id) ON DELETE CASCADE,
    card_id             INT      NOT NULL REFERENCES card(card_id),
    selected_option_id  INT      REFERENCES card_option(option_id),
    response_time_ms    INT      CHECK (response_time_ms >= 0),
    confirmed           INTEGER  NOT NULL,   
    PRIMARY KEY (challenge_id, card_id)
);




CREATE TABLE assessment (
    assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id                 INT           NOT NULL REFERENCES deck(deck_id),
    section_id              INT           REFERENCES section(section_id),  
    type                    VARCHAR(12)   NOT NULL CHECK (type IN ('diagnostic','teacher')),
    status                  VARCHAR(10)   NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','published','closed')),
    title                   VARCHAR(120)  NOT NULL,
    min_mastery             NUMERIC(3,2)  NOT NULL DEFAULT 0.80 CHECK (min_mastery BETWEEN 0.50 AND 1.00),
    total_time_min          SMALLINT      CHECK (total_time_min > 0),
    time_per_question_sec   SMALLINT      CHECK (time_per_question_sec > 0),
    show_grade              INTEGER       NOT NULL DEFAULT 0,
    updates_cards           INTEGER       NOT NULL DEFAULT 1,
    creates_plan            INTEGER       NOT NULL DEFAULT 1,
    allows_retake           INTEGER       NOT NULL DEFAULT 1,
    opens_at                TEXT,
    closes_at               TEXT,
    CHECK (type = 'diagnostic' OR section_id IS NOT NULL),
    CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at > opens_at)
);

CREATE TABLE question (
    question_id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id    INT           NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    card_id          INT           NOT NULL REFERENCES card(card_id),
    position         SMALLINT      NOT NULL CHECK (position > 0),
    prompt_override  TEXT,          
    points           NUMERIC(4,2)  NOT NULL DEFAULT 1 CHECK (points > 0),
    UNIQUE (assessment_id, position),
    UNIQUE (assessment_id, card_id)
);

CREATE TABLE assessment_exception (
    assessment_id    INT           NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    student_id       INT           NOT NULL REFERENCES app_user(user_id),
    granted_by       INT           NOT NULL REFERENCES app_user(user_id),
    extra_time_sec   INT           NOT NULL DEFAULT 0 CHECK (extra_time_sec >= 0),
    new_closes_at    TEXT,     
    reason           VARCHAR(200)  NOT NULL,
    granted_at       TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (assessment_id, student_id),
    CHECK (extra_time_sec > 0 OR new_closes_at IS NOT NULL)
);

CREATE TABLE attempt (
    attempt_id       TEXT          PRIMARY KEY,
    assessment_id    INT           NOT NULL REFERENCES assessment(assessment_id),
    student_id       INT           NOT NULL REFERENCES app_user(user_id),
    attempt_number   SMALLINT      NOT NULL DEFAULT 1 CHECK (attempt_number BETWEEN 1 AND 2),
    started_at       TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at      TEXT,
    synced_at        TEXT,     
    mastery_pct      NUMERIC(5,2)  CHECK (mastery_pct BETWEEN 0 AND 100),
    grade            NUMERIC(4,2)  CHECK (grade BETWEEN 0 AND 20),
    extra_time_sec   INT           NOT NULL DEFAULT 0 CHECK (extra_time_sec >= 0),
    UNIQUE (assessment_id, student_id, attempt_number)
);

CREATE TABLE answer (
    attempt_id          TEXT      NOT NULL REFERENCES attempt(attempt_id) ON DELETE CASCADE,
    question_id         INT       NOT NULL REFERENCES question(question_id),
    selected_option_id  INT       REFERENCES card_option(option_id),  
    is_correct          INTEGER   NOT NULL,
    response_time_ms    INT       CHECK (response_time_ms >= 0),
    PRIMARY KEY (attempt_id, question_id)
);

CREATE TABLE reinforcement_plan (
    plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id     TEXT       NOT NULL UNIQUE REFERENCES attempt(attempt_id) ON DELETE CASCADE,
    created_at     TEXT  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    days           SMALLINT   NOT NULL DEFAULT 3 CHECK (days BETWEEN 1 AND 14),
    is_completed   INTEGER    NOT NULL DEFAULT 0
);

CREATE TABLE plan_card (
    plan_id       INT       NOT NULL REFERENCES reinforcement_plan(plan_id) ON DELETE CASCADE,
    card_id       INT       NOT NULL REFERENCES card(card_id),
    day           SMALLINT  NOT NULL CHECK (day > 0),
    is_completed  INTEGER   NOT NULL DEFAULT 0,
    PRIMARY KEY (plan_id, card_id)
);




CREATE TABLE review_log (
    review_id          TEXT          PRIMARY KEY,
    student_id         INT           NOT NULL REFERENCES app_user(user_id),
    card_id            INT           NOT NULL REFERENCES card(card_id),
    occurred_at        TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source             VARCHAR(14)   NOT NULL
                       CHECK (source IN ('review','diagnostic','challenge','assessment','reinforcement','practice')),
    rating             SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 4),
                       
    applied_rating     SMALLINT      NOT NULL CHECK (applied_rating BETWEEN 1 AND 4),
                       
    response_time_ms   INT           NOT NULL CHECK (response_time_ms >= 0),
    elapsed_days       NUMERIC(7,2)  NOT NULL DEFAULT 0 CHECK (elapsed_days >= 0),
    retrievability     NUMERIC(4,3)  CHECK (retrievability BETWEEN 0 AND 1),
    new_stability      NUMERIC(8,2)  CHECK (new_stability > 0),
    new_difficulty     NUMERIC(4,2)  CHECK (new_difficulty BETWEEN 1 AND 10),
    challenge_id       TEXT          REFERENCES challenge(challenge_id),
    attempt_id         TEXT          REFERENCES attempt(attempt_id),
    is_synced          INTEGER       NOT NULL DEFAULT 1,
    CHECK (NOT (challenge_id IS NOT NULL AND attempt_id IS NOT NULL)),
    
    CHECK ((source = 'practice') = (new_stability IS NULL AND new_difficulty IS NULL))
);




CREATE TABLE badge (
    badge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    code         VARCHAR(30)   NOT NULL UNIQUE,
    name         VARCHAR(60)   NOT NULL,
    description  VARCHAR(200)  NOT NULL
);

CREATE TABLE user_badge (
    student_id   INT        NOT NULL REFERENCES app_user(user_id),
    badge_id     INT        NOT NULL REFERENCES badge(badge_id),
    earned_at    TEXT  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, badge_id)
);

CREATE TABLE streak (
    student_id          INT       PRIMARY KEY REFERENCES app_user(user_id),
    current_days        INT       NOT NULL DEFAULT 0 CHECK (current_days >= 0),
    best_streak         INT       NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
    last_activity_date  TEXT,
    freezes_available   SMALLINT  NOT NULL DEFAULT 1 CHECK (freezes_available >= 0),
    last_freeze_date    TEXT,
    CHECK (best_streak >= current_days)
);

CREATE TABLE notification (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INT           NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    type             VARCHAR(20)   NOT NULL
                     CHECK (type IN ('review_due','new_assessment','assessment_closing','plan_reminder',
                                     'grade_published','report_update','endorsement_update','leech_alert',
                                     'membership_update','join_request')),
    title            VARCHAR(80)   NOT NULL,
    body             VARCHAR(200)  NOT NULL,
    link             VARCHAR(120),  
    created_at       TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at          TEXT
);




CREATE TABLE sync_log (
    sync_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INT          NOT NULL REFERENCES app_user(user_id),
    device            VARCHAR(60)  NOT NULL,
    occurred_at       TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    records_sent      INT          NOT NULL DEFAULT 0 CHECK (records_sent >= 0),
    records_received  INT          NOT NULL DEFAULT 0 CHECK (records_received >= 0),
    conflicts         INT          NOT NULL DEFAULT 0 CHECK (conflicts >= 0),
    result            VARCHAR(10)  NOT NULL CHECK (result IN ('success','partial','failed'))
);

-- Cola de cambios pendientes de enviar al servidor
CREATE TABLE pending_change (
    change_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name    TEXT    NOT NULL,
    record_id     TEXT    NOT NULL,
    operation     TEXT    NOT NULL CHECK (operation IN ('insert','update','delete')),
    payload_json  TEXT    NOT NULL,
    occurred_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_card_state_due ON card_state (student_id, due_at);
CREATE INDEX ix_review_log_card ON review_log (student_id, card_id, occurred_at);
CREATE INDEX ix_notification_unread ON notification (user_id, read_at);
CREATE INDEX ix_membership_user ON membership (user_id, status);
CREATE UNIQUE INDEX ux_membership ON membership (user_id, institution_id, role, COALESCE(area_id, 0));
