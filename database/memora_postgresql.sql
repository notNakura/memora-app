-- =====================================================================
-- Memora · Base de datos del servidor (PostgreSQL 15 o superior)
-- Grupo 8 · Sistemas de Información III · UNERG
-- Algoritmo de repetición espaciada: FSRS con parámetros por defecto
-- Nombres de tablas y campos en inglés; comentarios en español.
-- =====================================================================

DROP SCHEMA IF EXISTS memora CASCADE;
CREATE SCHEMA memora;
SET search_path TO memora;

-- ---------------------------------------------------------------------
-- 1. Usuarios, instituciones y organización académica
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
    user_id                SERIAL        PRIMARY KEY,
    national_id            VARCHAR(12)   UNIQUE,        -- cédula; NULL hasta completar el paso 3 del registro
    first_names            VARCHAR(60),                  -- NULL hasta completar el paso 3 del registro
    last_names             VARCHAR(60),                  -- NULL hasta completar el paso 3 del registro
    email                  VARCHAR(120)  NOT NULL UNIQUE,
    email_verified_at      TIMESTAMP,                     -- NULL hasta escribir el código enviado al correo
    password_hash          VARCHAR(255),                  -- NULL en cuentas cargadas por CSV hasta que la persona las reclame
    birth_date             DATE          CHECK (birth_date >= '1920-01-01'),
    sex                    VARCHAR(12)   CHECK (sex IN ('female','male','unspecified')),
                           -- opcional; adapta el género gramatical de los mensajes
    desired_retention      NUMERIC(3,2)  NOT NULL DEFAULT 0.90
                           CHECK (desired_retention BETWEEN 0.70 AND 0.97),
    time_factor            NUMERIC(3,2)  NOT NULL DEFAULT 1.00
                           CHECK (time_factor BETWEEN 1.00 AND 3.00),
    daily_new_limit        SMALLINT      NOT NULL DEFAULT 20 CHECK (daily_new_limit BETWEEN 0 AND 200),
    notifications_enabled  BOOLEAN       NOT NULL DEFAULT TRUE,
    vibration_enabled      BOOLEAN       NOT NULL DEFAULT TRUE,   -- vibración leve; la aplicación no usa efectos de sonido
    reminder_time          TIME          NOT NULL DEFAULT '19:00',
    show_name_publicly     BOOLEAN       NOT NULL DEFAULT TRUE,
    onboarding_completed   BOOLEAN       NOT NULL DEFAULT FALSE,
    is_platform_admin      BOOLEAN       NOT NULL DEFAULT FALSE,  -- equipo de Memora: solo suspende abusos
    is_active              BOOLEAN       NOT NULL DEFAULT TRUE,   -- solo lo cambia el equipo de Memora (cuenta bloqueada por abuso)
    created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (password_hash IS NOT NULL OR email_verified_at IS NULL),  -- una cuenta verificada siempre tiene contraseña
    CHECK ((national_id IS NULL) = (first_names IS NULL) AND (first_names IS NULL) = (last_names IS NULL))  -- los tres datos llegan juntos en el paso 3
);

CREATE TABLE institution (
    institution_id  SERIAL        PRIMARY KEY,
    name            VARCHAR(120)  NOT NULL,
    type            VARCHAR(12)   NOT NULL CHECK (type IN ('university','institute','course')),
    join_code       CHAR(8)       NOT NULL UNIQUE     -- código para unirse (también va en el enlace y el QR)
                    CHECK (join_code ~ '^[2-9A-HJ-NP-Z]{8}$'),  -- sin 0, 1, I ni O
    code_expires_at TIMESTAMP,                       -- NULL: el código no vence
    join_mode       VARCHAR(8)    NOT NULL DEFAULT 'approval'
                    CHECK (join_mode IN ('open','approval','roster')),
    status          VARCHAR(10)   NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_by      INT           NOT NULL REFERENCES app_user(user_id),
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE area (
    area_id         SERIAL        PRIMARY KEY,
    institution_id  INT           NOT NULL REFERENCES institution(institution_id) ON DELETE CASCADE,
    name            VARCHAR(100)  NOT NULL,         -- facultad, escuela, programa o carrera
    UNIQUE (institution_id, name)
);

CREATE TABLE membership (
    membership_id   SERIAL        PRIMARY KEY,
    user_id         INT           NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    institution_id  INT           NOT NULL REFERENCES institution(institution_id) ON DELETE CASCADE,
    area_id         INT           REFERENCES area(area_id) ON DELETE CASCADE,  -- solo para area_admin
    role            VARCHAR(18)   NOT NULL
                    CHECK (role IN ('student','teacher','area_admin','institution_admin')),
    status          VARCHAR(10)   NOT NULL DEFAULT 'active'
                    CHECK (status IN ('invited','pending','active','rejected','removed')),
    approved_by     INT           REFERENCES app_user(user_id),
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE NULLS NOT DISTINCT (user_id, institution_id, role, area_id),
    CHECK ((role = 'area_admin') = (area_id IS NOT NULL))
);

CREATE TABLE email_code (
    code_id      SERIAL        PRIMARY KEY,
    user_id      INT           NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    purpose      VARCHAR(16)   NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
    code_hash    VARCHAR(255)  NOT NULL,                     -- código de 6 dígitos cifrado
    requested_by INT           REFERENCES app_user(user_id),  -- NULL si lo pidió el propio usuario
    attempts     SMALLINT      NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at   TIMESTAMP     NOT NULL,                     -- 15 minutos después de enviarlo
    used_at      TIMESTAMP,
    CHECK (expires_at > created_at)
);

CREATE TABLE academic_term (
    term_id         SERIAL       PRIMARY KEY,
    institution_id  INT          NOT NULL REFERENCES institution(institution_id) ON DELETE CASCADE,
    name            VARCHAR(10)  NOT NULL,      -- p. ej. 2026-II
    starts_on   DATE         NOT NULL,
    ends_on     DATE         NOT NULL,
    status      VARCHAR(8)   NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    UNIQUE (institution_id, name),
    CHECK (ends_on > starts_on)
);

CREATE TABLE subject (
    subject_id  SERIAL        PRIMARY KEY,
    area_id     INT           NOT NULL REFERENCES area(area_id),
    code        VARCHAR(15)   NOT NULL,
    name        VARCHAR(100)  NOT NULL,
    UNIQUE (area_id, code)
);

CREATE TABLE unit (
    unit_id     SERIAL        PRIMARY KEY,
    subject_id  INT           NOT NULL REFERENCES subject(subject_id) ON DELETE CASCADE,
    number      SMALLINT      NOT NULL CHECK (number > 0),
    name        VARCHAR(100)  NOT NULL,
    UNIQUE (subject_id, number)
);

CREATE TABLE section (
    section_id   SERIAL       PRIMARY KEY,
    subject_id   INT          NOT NULL REFERENCES subject(subject_id),
    term_id      INT          NOT NULL REFERENCES academic_term(term_id),
    teacher_id   INT          REFERENCES app_user(user_id),   -- NULL mientras no se asigne
    name         VARCHAR(20)  NOT NULL,
    join_code    CHAR(6)      NOT NULL UNIQUE          -- también va en el enlace y el QR
                 CHECK (join_code ~ '^[2-9A-HJ-NP-Z]{6}$'),     -- sin 0, 1, I ni O
    code_expires_at TIMESTAMP,                        -- NULL: el código no vence
    join_mode    VARCHAR(8)   NOT NULL DEFAULT 'roster'
                 CHECK (join_mode IN ('open','approval','roster')),
    capacity     SMALLINT     CHECK (capacity > 0),   -- cupo; NULL sin límite
    is_archived  BOOLEAN      NOT NULL DEFAULT FALSE,
    UNIQUE (subject_id, term_id, name)
);

CREATE TABLE enrollment (
    section_id     INT          NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    student_id     INT          NOT NULL REFERENCES app_user(user_id),
    enrolled_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status         VARCHAR(10)  NOT NULL DEFAULT 'active'
                   CHECK (status IN ('invited','pending','active','rejected','left','removed')),
    reviewed_by    INT          REFERENCES app_user(user_id),   -- quien aprobó o rechazó la solicitud
    ended_at       TIMESTAMP,
    PRIMARY KEY (section_id, student_id),
    CHECK (status IN ('invited','pending','active','rejected') OR ended_at IS NOT NULL)
);

CREATE TABLE unit_unlock (
    student_id   INT           NOT NULL REFERENCES app_user(user_id),
    unit_id      INT           NOT NULL REFERENCES unit(unit_id) ON DELETE CASCADE,
    granted_by   INT           NOT NULL REFERENCES app_user(user_id),
    reason       VARCHAR(200)  NOT NULL,
    granted_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, unit_id)
);

-- ---------------------------------------------------------------------
-- 2. Mazos, tarjetas y colaboración
-- ---------------------------------------------------------------------
CREATE TABLE deck (
    deck_id         SERIAL        PRIMARY KEY,
    author_id       INT           NOT NULL REFERENCES app_user(user_id),
    subject_id      INT           NOT NULL REFERENCES subject(subject_id),
    source_deck_id  INT           REFERENCES deck(deck_id) ON DELETE SET NULL,  -- mazo del que se copió
    name            VARCHAR(100)  NOT NULL,
    description     VARCHAR(300),
    visibility      VARCHAR(12)   NOT NULL DEFAULT 'private'
                    CHECK (visibility IN ('private','section','institution')),
    is_hidden       BOOLEAN       NOT NULL DEFAULT FALSE,   -- ocultado por moderación
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,   -- eliminación lógica
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deck_endorsement (
    deck_id      INT           NOT NULL REFERENCES deck(deck_id) ON DELETE CASCADE,
    section_id   INT           NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    teacher_id   INT           REFERENCES app_user(user_id),
    status       VARCHAR(10)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    requested_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at  TIMESTAMP,
    comment      VARCHAR(300),
    PRIMARY KEY (deck_id, section_id),
    CHECK (status = 'pending' OR (teacher_id IS NOT NULL AND reviewed_at IS NOT NULL)),
    CHECK (status <> 'rejected' OR comment IS NOT NULL)
);

CREATE TABLE deck_assignment (
    deck_id      INT        NOT NULL REFERENCES deck(deck_id) ON DELETE CASCADE,
    section_id   INT        NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    assigned_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exam_date    DATE,      -- activa el modo examen para la sección
    PRIMARY KEY (deck_id, section_id)
);

CREATE TABLE deck_subscription (
    student_id     INT        NOT NULL REFERENCES app_user(user_id),
    deck_id        INT        NOT NULL REFERENCES deck(deck_id) ON DELETE CASCADE,
    subscribed_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exam_date      DATE,      -- fecha de examen personal (modo examen propio)
    PRIMARY KEY (student_id, deck_id)
);

CREATE TABLE card (
    card_id      SERIAL        PRIMARY KEY,
    deck_id      INT           NOT NULL REFERENCES deck(deck_id) ON DELETE CASCADE,
    unit_id      INT           REFERENCES unit(unit_id),
    type         VARCHAR(20)   NOT NULL DEFAULT 'basic'
                 CHECK (type IN ('basic','cloze','image_occlusion','ordering')),
    front        TEXT          NOT NULL,
    back         TEXT          NOT NULL,
    image_url    VARCHAR(255),
    version      INT           NOT NULL DEFAULT 1 CHECK (version >= 1),
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE card_option (
    option_id    SERIAL        PRIMARY KEY,
    card_id      INT           NOT NULL REFERENCES card(card_id) ON DELETE CASCADE,
    text         VARCHAR(255)  NOT NULL,
    is_correct   BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE TABLE error_report (
    report_id     SERIAL        PRIMARY KEY,
    card_id       INT           NOT NULL REFERENCES card(card_id) ON DELETE CASCADE,
    reporter_id   INT           NOT NULL REFERENCES app_user(user_id),
    reason        VARCHAR(16)   NOT NULL
                  CHECK (reason IN ('missing_answer','wrong_answer','confusing','inappropriate')),
    description   VARCHAR(500),
    status        VARCHAR(12)   NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','fixed','dismissed')),
    reported_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewer_id   INT           REFERENCES app_user(user_id),
    resolution    VARCHAR(300),
    resolved_at   TIMESTAMP,
    CHECK (status = 'open' OR (reviewer_id IS NOT NULL AND resolved_at IS NOT NULL))
);

-- ---------------------------------------------------------------------
-- 3. Repetición espaciada (FSRS)
-- ---------------------------------------------------------------------
CREATE TABLE card_state (
    student_id        INT           NOT NULL REFERENCES app_user(user_id),
    card_id           INT           NOT NULL REFERENCES card(card_id) ON DELETE CASCADE,
    status            VARCHAR(12)   NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','learning','review','mastered')),
    stability         NUMERIC(8,2)  CHECK (stability > 0),              -- días (FSRS)
    difficulty        NUMERIC(4,2)  CHECK (difficulty BETWEEN 1 AND 10), -- FSRS
    format            VARCHAR(10)   NOT NULL DEFAULT 'choice'
                      CHECK (format IN ('choice','typing')),
    last_review_at    TIMESTAMP,
    due_at            TIMESTAMP,
    lapses            INT           NOT NULL DEFAULT 0 CHECK (lapses >= 0),
    avg_response_ms   INT           CHECK (avg_response_ms > 0),
    is_leech          BOOLEAN       NOT NULL DEFAULT FALSE,
    PRIMARY KEY (student_id, card_id),
    CHECK (status = 'new' OR (stability IS NOT NULL AND difficulty IS NOT NULL))
);

CREATE TABLE challenge (
    challenge_id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id              INT        NOT NULL REFERENCES app_user(user_id),
    started_at              TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at             TIMESTAMP,
    total_time_sec          INT        NOT NULL DEFAULT 120 CHECK (total_time_sec > 0),
    time_per_question_sec   INT        NOT NULL DEFAULT 8   CHECK (time_per_question_sec > 0),
    extra_time_sec          INT        NOT NULL DEFAULT 0   CHECK (extra_time_sec >= 0),
    pauses                  SMALLINT   NOT NULL DEFAULT 0   CHECK (pauses >= 0)
);

CREATE TABLE challenge_card (
    challenge_id        UUID     NOT NULL REFERENCES challenge(challenge_id) ON DELETE CASCADE,
    card_id             INT      NOT NULL REFERENCES card(card_id),
    selected_option_id  INT      REFERENCES card_option(option_id),
    response_time_ms    INT      CHECK (response_time_ms >= 0),
    confirmed           BOOLEAN  NOT NULL,   -- acertó a tiempo: se confirma el dominio
    PRIMARY KEY (challenge_id, card_id)
);

-- ---------------------------------------------------------------------
-- 4. Evaluaciones con consecuencias
-- ---------------------------------------------------------------------
CREATE TABLE assessment (
    assessment_id           SERIAL        PRIMARY KEY,
    deck_id                 INT           NOT NULL REFERENCES deck(deck_id),
    section_id              INT           REFERENCES section(section_id),  -- NULL en la diagnóstica
    type                    VARCHAR(12)   NOT NULL CHECK (type IN ('diagnostic','teacher')),
    status                  VARCHAR(10)   NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','published','closed')),
    title                   VARCHAR(120)  NOT NULL,
    min_mastery             NUMERIC(3,2)  NOT NULL DEFAULT 0.80 CHECK (min_mastery BETWEEN 0.50 AND 1.00),
    total_time_min          SMALLINT      CHECK (total_time_min > 0),
    time_per_question_sec   SMALLINT      CHECK (time_per_question_sec > 0),
    show_grade              BOOLEAN       NOT NULL DEFAULT FALSE,
    updates_cards           BOOLEAN       NOT NULL DEFAULT TRUE,
    creates_plan            BOOLEAN       NOT NULL DEFAULT TRUE,
    allows_retake           BOOLEAN       NOT NULL DEFAULT TRUE,
    opens_at                TIMESTAMP,
    closes_at               TIMESTAMP,
    CHECK (type = 'diagnostic' OR section_id IS NOT NULL),
    CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at > opens_at)
);

CREATE TABLE question (
    question_id      SERIAL        PRIMARY KEY,
    assessment_id    INT           NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    card_id          INT           NOT NULL REFERENCES card(card_id),
    position         SMALLINT      NOT NULL CHECK (position > 0),
    prompt_override  TEXT,          -- enunciado editado por el profesor; NULL usa el de la tarjeta
    points           NUMERIC(4,2)  NOT NULL DEFAULT 1 CHECK (points > 0),
    UNIQUE (assessment_id, position),
    UNIQUE (assessment_id, card_id)
);

CREATE TABLE assessment_exception (
    assessment_id    INT           NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    student_id       INT           NOT NULL REFERENCES app_user(user_id),
    granted_by       INT           NOT NULL REFERENCES app_user(user_id),
    extra_time_sec   INT           NOT NULL DEFAULT 0 CHECK (extra_time_sec >= 0),
    new_closes_at    TIMESTAMP,     -- reapertura individual
    reason           VARCHAR(200)  NOT NULL,
    granted_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (assessment_id, student_id),
    CHECK (extra_time_sec > 0 OR new_closes_at IS NOT NULL)
);

CREATE TABLE attempt (
    attempt_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id    INT           NOT NULL REFERENCES assessment(assessment_id),
    student_id       INT           NOT NULL REFERENCES app_user(user_id),
    attempt_number   SMALLINT      NOT NULL DEFAULT 1 CHECK (attempt_number BETWEEN 1 AND 2),
    started_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at      TIMESTAMP,
    synced_at        TIMESTAMP,     -- llegada al servidor (presentado sin conexión)
    mastery_pct      NUMERIC(5,2)  CHECK (mastery_pct BETWEEN 0 AND 100),
    grade            NUMERIC(4,2)  CHECK (grade BETWEEN 0 AND 20),
    extra_time_sec   INT           NOT NULL DEFAULT 0 CHECK (extra_time_sec >= 0),
    UNIQUE (assessment_id, student_id, attempt_number)
);

CREATE TABLE answer (
    attempt_id          UUID      NOT NULL REFERENCES attempt(attempt_id) ON DELETE CASCADE,
    question_id         INT       NOT NULL REFERENCES question(question_id),
    selected_option_id  INT       REFERENCES card_option(option_id),  -- NULL: "No lo sé todavía" o sin tiempo
    is_correct          BOOLEAN   NOT NULL,
    response_time_ms    INT       CHECK (response_time_ms >= 0),
    PRIMARY KEY (attempt_id, question_id)
);

CREATE TABLE reinforcement_plan (
    plan_id        SERIAL     PRIMARY KEY,
    attempt_id     UUID       NOT NULL UNIQUE REFERENCES attempt(attempt_id) ON DELETE CASCADE,
    created_at     TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    days           SMALLINT   NOT NULL DEFAULT 3 CHECK (days BETWEEN 1 AND 14),
    is_completed   BOOLEAN    NOT NULL DEFAULT FALSE
);

CREATE TABLE plan_card (
    plan_id       INT       NOT NULL REFERENCES reinforcement_plan(plan_id) ON DELETE CASCADE,
    card_id       INT       NOT NULL REFERENCES card(card_id),
    day           SMALLINT  NOT NULL CHECK (day > 0),
    is_completed  BOOLEAN   NOT NULL DEFAULT FALSE,
    PRIMARY KEY (plan_id, card_id)
);

-- ---------------------------------------------------------------------
-- 5. Historial de respuestas (alimenta a FSRS; solo se agregan filas)
-- ---------------------------------------------------------------------
CREATE TABLE review_log (
    review_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id         INT           NOT NULL REFERENCES app_user(user_id),
    card_id            INT           NOT NULL REFERENCES card(card_id),
    occurred_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source             VARCHAR(14)   NOT NULL
                       CHECK (source IN ('review','diagnostic','challenge','assessment','reinforcement','practice')),
    rating             SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 4),
                       -- 1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil (la que marcó el estudiante)
    applied_rating     SMALLINT      NOT NULL CHECK (applied_rating BETWEEN 1 AND 4),
                       -- la que usó FSRS después de corregir por tiempo
    response_time_ms   INT           NOT NULL CHECK (response_time_ms >= 0),
    elapsed_days       NUMERIC(7,2)  NOT NULL DEFAULT 0 CHECK (elapsed_days >= 0),
    retrievability     NUMERIC(4,3)  CHECK (retrievability BETWEEN 0 AND 1),
    new_stability      NUMERIC(8,2)  CHECK (new_stability > 0),
    new_difficulty     NUMERIC(4,2)  CHECK (new_difficulty BETWEEN 1 AND 10),
    challenge_id       UUID          REFERENCES challenge(challenge_id),
    attempt_id         UUID          REFERENCES attempt(attempt_id),
    is_synced          BOOLEAN       NOT NULL DEFAULT TRUE,
    CHECK (NOT (challenge_id IS NOT NULL AND attempt_id IS NOT NULL)),
    -- la práctica libre no cambia la programación: no guarda nuevos valores FSRS
    CHECK ((source = 'practice') = (new_stability IS NULL AND new_difficulty IS NULL))
);

-- ---------------------------------------------------------------------
-- 6. Progreso, motivación y avisos
-- ---------------------------------------------------------------------
CREATE TABLE badge (
    badge_id     SERIAL        PRIMARY KEY,
    code         VARCHAR(30)   NOT NULL UNIQUE,
    name         VARCHAR(60)   NOT NULL,
    description  VARCHAR(200)  NOT NULL
);

CREATE TABLE user_badge (
    student_id   INT        NOT NULL REFERENCES app_user(user_id),
    badge_id     INT        NOT NULL REFERENCES badge(badge_id),
    earned_at    TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, badge_id)
);

CREATE TABLE streak (
    student_id          INT       PRIMARY KEY REFERENCES app_user(user_id),
    current_days        INT       NOT NULL DEFAULT 0 CHECK (current_days >= 0),
    best_streak         INT       NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
    last_activity_date  DATE,
    freezes_available   SMALLINT  NOT NULL DEFAULT 1 CHECK (freezes_available >= 0),
    last_freeze_date    DATE,
    CHECK (best_streak >= current_days)
);

CREATE TABLE notification (
    notification_id  SERIAL        PRIMARY KEY,
    user_id          INT           NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    type             VARCHAR(20)   NOT NULL
                     CHECK (type IN ('review_due','new_assessment','assessment_closing','plan_reminder',
                                     'grade_published','report_update','endorsement_update','leech_alert',
                                     'membership_update','join_request')),
    title            VARCHAR(80)   NOT NULL,
    body             VARCHAR(200)  NOT NULL,
    link             VARCHAR(120),  -- pantalla de destino dentro de la aplicación
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at          TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 7. Sincronización y bitácora
-- ---------------------------------------------------------------------
CREATE TABLE sync_log (
    sync_id           SERIAL       PRIMARY KEY,
    user_id           INT          NOT NULL REFERENCES app_user(user_id),
    device            VARCHAR(60)  NOT NULL,
    occurred_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    records_sent      INT          NOT NULL DEFAULT 0 CHECK (records_sent >= 0),
    records_received  INT          NOT NULL DEFAULT 0 CHECK (records_received >= 0),
    conflicts         INT          NOT NULL DEFAULT 0 CHECK (conflicts >= 0),
    result            VARCHAR(10)  NOT NULL CHECK (result IN ('success','partial','failed'))
);

CREATE TABLE audit_log (
    audit_id       BIGSERIAL     PRIMARY KEY,
    user_id        INT           NOT NULL REFERENCES app_user(user_id),
    institution_id INT           REFERENCES institution(institution_id),  -- NULL en acciones de plataforma
    action       VARCHAR(30)   NOT NULL,   -- p. ej. grade_changed, assessment_reopened, deck_hidden
    table_name   VARCHAR(40)   NOT NULL,
    record_id    VARCHAR(40)   NOT NULL,
    old_value    TEXT,          -- JSON con los valores anteriores
    new_value    TEXT,          -- JSON con los valores nuevos
    occurred_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para las consultas más frecuentes
CREATE INDEX ix_card_state_due      ON card_state (student_id, due_at);
CREATE INDEX ix_review_log_card     ON review_log (student_id, card_id, occurred_at);
CREATE INDEX ix_card_deck           ON card (deck_id);
CREATE INDEX ix_question_card       ON question (card_id);
CREATE INDEX ix_notification_unread ON notification (user_id, read_at);
CREATE INDEX ix_audit_record        ON audit_log (table_name, record_id);
CREATE INDEX ix_membership_user     ON membership (user_id, status);

-- Regla: una institución nunca se queda sin administrador activo
CREATE FUNCTION keep_one_institution_admin() RETURNS trigger AS $$
BEGIN
  IF OLD.role = 'institution_admin' AND OLD.status = 'active'
     AND (TG_OP = 'DELETE' OR NEW.role <> 'institution_admin' OR NEW.status <> 'active')
     AND NOT EXISTS (SELECT 1 FROM memora.membership m
                     WHERE m.institution_id = OLD.institution_id AND m.role = 'institution_admin'
                       AND m.status = 'active' AND m.membership_id <> OLD.membership_id) THEN
    RAISE EXCEPTION 'La institución debe conservar al menos un administrador activo';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tr_keep_one_institution_admin
BEFORE UPDATE OR DELETE ON membership
FOR EACH ROW EXECUTE FUNCTION keep_one_institution_admin();

-- Regla: una sección no admite más estudiantes activos que su cupo
CREATE FUNCTION check_section_capacity() RETURNS trigger AS $$
DECLARE cap SMALLINT;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT capacity INTO cap FROM memora.section WHERE section_id = NEW.section_id;
    IF cap IS NOT NULL AND (SELECT count(*) FROM memora.enrollment e
                            WHERE e.section_id = NEW.section_id AND e.status = 'active'
                              AND e.student_id <> NEW.student_id) >= cap THEN
      RAISE EXCEPTION 'La sección alcanzó su cupo de % estudiantes', cap;
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tr_check_section_capacity
BEFORE INSERT OR UPDATE OF status ON enrollment
FOR EACH ROW EXECUTE FUNCTION check_section_capacity();

-- =====================================================================
-- DATOS DE EJEMPLO (coherentes con las pantallas; nombres ficticios)
-- =====================================================================
INSERT INTO app_user (national_id, first_names, last_names, email, email_verified_at, password_hash, birth_date, sex, is_platform_admin, time_factor) VALUES
 ('V-10000001','Pedro','Gómez','pedro.gomez@gmail.com','2026-09-14 08:00','$2b$12$ejemploHashAdmin','1985-03-12','male',FALSE,1.00),
 ('V-10000002','María','Hernández','maria.hernandez@gmail.com','2026-09-14 08:00','$2b$12$ejemploHashProf','1979-07-04','female',FALSE,1.00),
 ('V-20000001','Luis','Pérez','luis.perez@gmail.com','2026-09-14 08:00','$2b$12$ejemploHashE1','2004-05-21','male',FALSE,1.00),
 ('V-20000002','Carla','Rojas','carla.rojas@gmail.com','2026-09-14 08:00','$2b$12$ejemploHashE2','2005-01-30','female',FALSE,1.50),  -- tiempo extendido
 ('V-10000003','José','Ramírez','jose.ramirez@gmail.com','2026-09-14 08:00','$2b$12$ejemploHashProf2',NULL,NULL,FALSE,1.00),
 ('V-10000004','Ana','Torres','ana.torres@gmail.com','2026-09-14 08:00','$2b$12$ejemploHashAdm2','1982-11-02','female',FALSE,1.00),
 ('V-10000005','Equipo','Memora','soporte@memora.app','2026-09-14 08:00','$2b$12$ejemploHashPlat',NULL,NULL,TRUE,1.00),
 ('V-31222333','Ricardo','Luna','ricardo.luna@gmail.com','2026-09-14 08:00','$2b$12$ejemploHashEst3',NULL,NULL,FALSE,1.00),
 ('V-30555777','Daniela','Suárez','daniela.suarez@gmail.com',NULL,NULL,NULL,NULL,FALSE,1.00);  -- precargada por CSV, sin reclamar

INSERT INTO institution (name, type, join_code, join_mode, created_by) VALUES
 ('Universidad Nacional Experimental Rómulo Gallegos (UNERG)','university','UNERGK26','approval',1),
 ('Curso de Inglés Nivel 1 – Academia Llanos','course','LLANS7K9','open',2);
INSERT INTO area (institution_id, name) VALUES
 (1,'Ingeniería de Sistemas'),(1,'Odontología'),(2,'Inglés');
INSERT INTO membership (user_id, institution_id, area_id, role, status, approved_by) VALUES
 (1,1,NULL,'institution_admin','active',NULL),   -- registró la UNERG
 (6,1,2,'area_admin','active',1),                -- administra Odontología
 (2,1,NULL,'teacher','active',1),
 (5,1,NULL,'teacher','pending',NULL),            -- se registró como profesor, por confirmar
 (3,1,NULL,'student','active',NULL),
 (4,1,NULL,'student','active',NULL),
 (2,2,NULL,'institution_admin','active',NULL),   -- María también dirige un curso externo
 (3,2,NULL,'student','active',NULL),            -- Luis está en dos instituciones
 (8,1,NULL,'student','pending',NULL),           -- usó el código de la sección sin estar en la lista
 (9,1,NULL,'student','invited',NULL);           -- cargada por CSV; aún no reclama su cuenta

INSERT INTO academic_term (institution_id, name, starts_on, ends_on) VALUES (1,'2026-II','2026-09-14','2027-01-29');
INSERT INTO subject (area_id, code, name) VALUES (1,'SI3','Sistemas de Información III'),(2,'ANAT1','Anatomía Dental');
INSERT INTO unit (subject_id, number, name) VALUES
 (1,1,'Fundamentos de bases de datos'),(1,2,'Modelo Entidad-Relación'),(1,3,'Normalización');

INSERT INTO section (subject_id, term_id, teacher_id, name, join_code, code_expires_at, join_mode, capacity)
VALUES (1, 1, 2, 'Sección 1', 'SK3A26', '2026-09-30 23:59', 'roster', 40);
-- Luis y Carla estaban en la lista de inscritos y entraron directo; Ricardo Luna no estaba y queda por confirmar
INSERT INTO enrollment (section_id, student_id, status) VALUES (1,3,'active'),(1,4,'active'),(1,8,'pending'),(1,9,'invited');
INSERT INTO unit_unlock (student_id, unit_id, granted_by, reason) VALUES (4,3,2,'Reposo médico justificado durante la Unidad 2');

INSERT INTO deck (author_id, subject_id, name, description, visibility) VALUES
 (2,1,'Modelo Entidad-Relación','Entidades, relaciones y cardinalidad','section'),
 (4,1,'Normalización – resumen','Mazo hecho por una estudiante','section');
INSERT INTO deck_endorsement (deck_id, section_id, teacher_id, status, reviewed_at, comment)
VALUES (2,1,2,'approved',CURRENT_TIMESTAMP,'Revisado: correcto');
INSERT INTO deck_assignment (deck_id, section_id, exam_date) VALUES (1,1, CURRENT_DATE + 12);
INSERT INTO deck_subscription (student_id, deck_id, exam_date) VALUES (3,2, CURRENT_DATE + 20);

INSERT INTO card (deck_id, unit_id, type, front, back) VALUES
 (1,2,'basic','¿Qué representa una entidad en el modelo ER?','Un objeto o concepto del que se guarda información'),
 (1,2,'basic','¿Qué indica la cardinalidad 1:N?','Que una ocurrencia se relaciona con muchas de la otra entidad'),
 (1,2,'cloze','Una clave ____ identifica de forma única cada fila.','primaria'),
 (2,3,'basic','¿Qué exige la tercera forma normal?','Que no haya dependencias transitivas de la clave');

INSERT INTO card_option (card_id, text, is_correct) VALUES
 (1,'Un objeto o concepto del que se guarda información',TRUE),(1,'Una acción entre dos tablas',FALSE),
 (1,'Un tipo de dato',FALSE),(1,'Una restricción de integridad',FALSE),
 (2,'Que una ocurrencia se relaciona con muchas de la otra entidad',TRUE),(2,'Que ambas entidades son opcionales',FALSE),
 (2,'Que la relación es recursiva',FALSE),(2,'Que hay una sola tabla',FALSE);

INSERT INTO card_state (student_id, card_id, status, stability, difficulty, last_review_at, due_at, lapses, avg_response_ms) VALUES
 (3,1,'mastered',  34.50,3.20, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP + INTERVAL '4 days', 0, 2100),
 (3,2,'review',     6.10,5.40, CURRENT_TIMESTAMP - INTERVAL '6 days',  CURRENT_TIMESTAMP,                     1, 4800),
 (3,3,'learning',   0.80,7.10, CURRENT_TIMESTAMP - INTERVAL '1 day',   CURRENT_TIMESTAMP,                     3, 7900),
 (3,4,'new',        NULL,NULL, NULL, NULL, 0, NULL);

INSERT INTO review_log (student_id, card_id, source, rating, applied_rating, response_time_ms, elapsed_days, retrievability, new_stability, new_difficulty)
VALUES (3,2,'review',3,2,9600,6.00,0.900,6.10,5.40);  -- marcó "Bien" pero tardó el doble: se aplicó "Difícil"
INSERT INTO review_log (student_id, card_id, source, rating, applied_rating, response_time_ms)
VALUES (3,4,'practice',3,3,5200);                   -- práctica libre: no cambia la programación

INSERT INTO challenge (student_id, finished_at) VALUES (3, CURRENT_TIMESTAMP + INTERVAL '2 minutes');
INSERT INTO challenge_card (challenge_id, card_id, selected_option_id, response_time_ms, confirmed)
SELECT challenge_id, 1, 1, 2300, TRUE FROM challenge LIMIT 1;

INSERT INTO assessment (deck_id, section_id, type, status, title, min_mastery, total_time_min, time_per_question_sec, show_grade, opens_at, closes_at)
VALUES (1,1,'teacher','published','Evaluación Unidad 2 – Modelo ER',0.80,20,45,TRUE, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '3 days');
INSERT INTO question (assessment_id, card_id, position, prompt_override) VALUES
 (1,1,1,NULL),(1,2,2,'En el modelo ER, ¿qué significa una cardinalidad 1:N?');
INSERT INTO assessment_exception (assessment_id, student_id, granted_by, extra_time_sec, reason)
VALUES (1,4,2,600,'Tiempo extendido autorizado por la coordinación');

INSERT INTO attempt (assessment_id, student_id, finished_at, synced_at, mastery_pct, grade)
VALUES (1,3, CURRENT_TIMESTAMP + INTERVAL '15 minutes', CURRENT_TIMESTAMP + INTERVAL '15 minutes', 50.00, 10.00);
INSERT INTO answer (attempt_id, question_id, selected_option_id, is_correct, response_time_ms)
SELECT attempt_id, 1, 1, TRUE, 12000 FROM attempt UNION ALL
SELECT attempt_id, 2, 6, FALSE, 30000 FROM attempt;
INSERT INTO reinforcement_plan (attempt_id, days) SELECT attempt_id, 3 FROM attempt;
INSERT INTO plan_card (plan_id, card_id, day) VALUES (1,2,1);

INSERT INTO badge (code, name, description) VALUES
 ('UNIT_MASTERED','Unidad dominada','Todas las tarjetas de una unidad en estado Dominada'),
 ('STREAK_7','Siete días','Repasó siete días seguidos');
INSERT INTO user_badge (student_id, badge_id) VALUES (3,2);
INSERT INTO streak (student_id, current_days, best_streak, last_activity_date) VALUES (3,6,9,CURRENT_DATE);

INSERT INTO error_report (card_id, reporter_id, reason, description) VALUES
 (3,4,'missing_answer','La respuesta debería aceptar también "clave principal"');

INSERT INTO notification (user_id, type, title, body, link) VALUES
 (3,'review_due','Tienes 25 tarjetas para hoy','Tu repaso toma unos 12 minutos.','repaso'),
 (3,'new_assessment','Nueva evaluación','Evaluación Unidad 2 – Modelo ER cierra en 3 días.','evaluar'),
 (2,'leech_alert','Tarjeta problemática','Una tarjeta del mazo Modelo ER se falla con frecuencia.','reportes');

INSERT INTO sync_log (user_id, device, records_sent, records_received, result)
VALUES (3,'Android – Expo',14,3,'success');
INSERT INTO audit_log (user_id, institution_id, action, table_name, record_id, old_value, new_value)
VALUES (2,1,'exception_granted','assessment_exception','1-4',NULL,'{"extra_time_sec":600}');
