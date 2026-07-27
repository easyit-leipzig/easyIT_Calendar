<?php
declare(strict_types=1);

session_start();
require __DIR__ . '/db.php';

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        json_response(['ok' => false, 'error' => 'Der Kalender-Handler akzeptiert ausschließlich POST-Anfragen.'], 405);
    }

    validate_csrf_token();
    $input = request_json();
    $action = strtolower(trim((string)($input['action'] ?? '')));
    $pdo = db();

    switch ($action) {
        case 'list':
            list_events($pdo, $input);
            break;
        case 'create':
            save_event($pdo, $input, false);
            break;
        case 'update':
            save_event($pdo, $input, true);
            break;
        case 'delete':
            delete_event($pdo, $input);
            break;
        default:
            throw new InvalidArgumentException('Unbekannte Kalenderaktion. Zulässig sind list, create, update und delete.');
    }
} catch (InvalidArgumentException $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], 400);
} catch (RuntimeException $e) {
    $status = in_array($e->getCode(), [403, 404, 409], true) ? $e->getCode() : 409;
    json_response(['ok' => false, 'error' => $e->getMessage()], $status);
} catch (Throwable $e) {
    error_log($e->__toString());
    json_response(['ok' => false, 'error' => 'Datenbank- oder Serverfehler. Details stehen im PHP-Fehlerprotokoll.'], 500);
}

function validate_csrf_token(): void
{
    $sessionToken = (string)($_SESSION['easyit_calendar_csrf'] ?? '');
    $headerToken = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($sessionToken === '' || $headerToken === '' || !hash_equals($sessionToken, $headerToken)) {
        throw new RuntimeException('Die Sitzung ist abgelaufen oder das Sicherheitstoken ist ungültig.', 403);
    }
}

function list_events(PDO $pdo, array $input): never
{
    $start = (string)($input['start'] ?? '');
    $end = (string)($input['end'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
        throw new InvalidArgumentException('start und end müssen das Format YYYY-MM-DD haben.');
    }
    if ($end <= $start) {
        throw new InvalidArgumentException('Das Ende des Ladebereichs muss nach dem Beginn liegen.');
    }

    $stmt = $pdo->prepare(
        "SELECT e.id, e.start, e.end, e.activ, e.thema,
                COALESCE(e.description, '') AS description,
                e.version_no,
                COALESCE((
                    SELECT ep.role_id
                    FROM event_participants ep
                    JOIN roles r ON r.id = ep.role_id
                    WHERE ep.event_id = e.id AND r.role_key = 'student'
                    ORDER BY ep.is_primary DESC, ep.id
                    LIMIT 1
                ), 3) AS to_role,
                COALESCE((
                    SELECT ep.person_id
                    FROM event_participants ep
                    JOIN roles r ON r.id = ep.role_id
                    WHERE ep.event_id = e.id AND r.role_key = 'tutor'
                    ORDER BY ep.is_primary DESC, ep.id
                    LIMIT 1
                ), 0) AS to_tutor,
                COALESCE((
                    SELECT ep.person_id
                    FROM event_participants ep
                    JOIN roles r ON r.id = ep.role_id
                    WHERE ep.event_id = e.id AND r.role_key = 'student'
                    ORDER BY ep.is_primary DESC, ep.id
                    LIMIT 1
                ), 0) AS to_student
         FROM events e
         WHERE e.activ = 1
           AND e.start < :range_end
           AND e.end >= :range_start
         ORDER BY e.start, e.id"
    );
    $stmt->execute([
        'range_start' => $start . ' 00:00:00',
        'range_end' => $end . ' 00:00:00'
    ]);

    $events = $stmt->fetchAll();
    $attachments = $pdo->prepare(
        'SELECT original_name FROM event_attachments WHERE event_id = ? AND activ = 1 ORDER BY id'
    );

    foreach ($events as &$event) {
        $attachments->execute([$event['id']]);
        $event['appendizies'] = array_column($attachments->fetchAll(), 'original_name');
        $event['id'] = (int)$event['id'];
        $event['to_role'] = (int)$event['to_role'];
        $event['to_tutor'] = (int)$event['to_tutor'];
        $event['to_student'] = (int)$event['to_student'];
        $event['activ'] = (bool)$event['activ'];
        $event['version_no'] = (int)$event['version_no'];
        $event['start'] = str_replace(' ', 'T', (string)$event['start']);
        $event['end'] = str_replace(' ', 'T', (string)$event['end']);
    }
    unset($event);

    json_response(['ok' => true, 'action' => 'list', 'events' => $events]);
}

function save_event(PDO $pdo, array $input, bool $isUpdate): never
{
    $event = validate_event_input($input);
    $id = 0;

    if ($isUpdate) {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT) ?: 0;
        if ($id < 1) throw new InvalidArgumentException('Ungültige Termin-ID.');
    }

    $pdo->beginTransaction();
    try {
        if ($isUpdate) {
            $stmt = $pdo->prepare(
                'UPDATE events
                 SET `start` = ?, `end` = ?, activ = ?, thema = ?, description = ?,
                     updated_by = ?, version_no = version_no + 1
                 WHERE id = ?'
            );
            $stmt->execute([
                $event['start'], $event['end'], $event['activ'], $event['thema'],
                $event['description'], app_config()['default_user_id'], $id
            ]);
            if ($stmt->rowCount() === 0) {
                $exists = $pdo->prepare('SELECT 1 FROM events WHERE id = ?');
                $exists->execute([$id]);
                if (!$exists->fetchColumn()) throw new RuntimeException('Termin nicht gefunden.', 404);
            }
            $pdo->prepare('DELETE FROM event_participants WHERE event_id = ?')->execute([$id]);
            $pdo->prepare('DELETE FROM event_attachments WHERE event_id = ?')->execute([$id]);
        } else {
            $stmt = $pdo->prepare(
                "INSERT INTO events
                    (`start`, `end`, activ, thema, description, event_status, created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, 'planned', ?, ?)"
            );
            $stmt->execute([
                $event['start'], $event['end'], $event['activ'], $event['thema'],
                $event['description'], app_config()['default_user_id'], app_config()['default_user_id']
            ]);
            $id = (int)$pdo->lastInsertId();
        }

        save_participants($pdo, $id, $event);
        save_attachments($pdo, $id, $event['appendizies']);
        $pdo->commit();

        json_response([
            'ok' => true,
            'action' => $isUpdate ? 'update' : 'create',
            'id' => $id
        ], $isUpdate ? 200 : 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function delete_event(PDO $pdo, array $input): never
{
    $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT) ?: 0;
    if ($id < 1) throw new InvalidArgumentException('Ungültige Termin-ID.');

    $stmt = $pdo->prepare(
        'UPDATE events SET activ = 0, version_no = version_no + 1, updated_by = :user WHERE id = :id AND activ = 1'
    );
    $stmt->execute(['id' => $id, 'user' => app_config()['default_user_id']]);
    if ($stmt->rowCount() === 0) {
        $exists = $pdo->prepare('SELECT 1 FROM events WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetchColumn()) throw new RuntimeException('Termin nicht gefunden.', 404);
    }

    json_response(['ok' => true, 'action' => 'delete', 'id' => $id]);
}

function validate_event_input(array $input): array
{
    foreach (['start', 'end'] as $field) {
        if (!isset($input[$field]) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/', (string)$input[$field])) {
            throw new InvalidArgumentException($field . ' ist ungültig.');
        }
    }

    $start = new DateTimeImmutable((string)$input['start']);
    $end = new DateTimeImmutable((string)$input['end']);
    if ($end <= $start) throw new InvalidArgumentException('Das Ende muss nach dem Beginn liegen.');

    return [
        'start' => $start->format('Y-m-d H:i:s'),
        'end' => $end->format('Y-m-d H:i:s'),
        'activ' => !empty($input['activ']) ? 1 : 0,
        'thema' => mb_substr(trim((string)($input['thema'] ?? '')), 0, 255),
        'description' => trim((string)($input['description'] ?? '')),
        'to_tutor' => max(0, (int)($input['to_tutor'] ?? 0)),
        'to_student' => max(0, (int)($input['to_student'] ?? 0)),
        'to_role' => max(1, (int)($input['to_role'] ?? 3)),
        'appendizies' => array_values(array_unique(array_filter(array_map(
            static fn($value): string => trim((string)$value),
            is_array($input['appendizies'] ?? null) ? $input['appendizies'] : []
        ))))
    ];
}

function save_participants(PDO $pdo, int $eventId, array $event): void
{
    $stmt = $pdo->prepare(
        "INSERT INTO event_participants
            (event_id, person_id, role_id, participation_status, is_primary)
         VALUES (?, ?, ?, 'accepted', 1)"
    );

    if ($event['to_tutor'] > 0) {
        $roleStmt = $pdo->query("SELECT id FROM roles WHERE role_key = 'tutor' LIMIT 1");
        $roleId = (int)$roleStmt->fetchColumn();
        $stmt->execute([$eventId, $event['to_tutor'], $roleId ?: 2]);
    }
    if ($event['to_student'] > 0) {
        $stmt->execute([$eventId, $event['to_student'], $event['to_role']]);
    }
}

function save_attachments(PDO $pdo, int $eventId, array $files): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO event_attachments
            (event_id, original_name, stored_name, storage_path, activ)
         VALUES (?, ?, ?, ?, 1)'
    );

    foreach ($files as $index => $name) {
        $safe = preg_replace('/[^A-Za-z0-9._-]+/u', '_', basename((string)$name)) ?: 'anlage';
        $stored = sprintf('event_%d_%d_%s', $eventId, $index + 1, $safe);
        $stmt->execute([
            $eventId,
            $name,
            $stored,
            rtrim((string)app_config()['attachments_path'], '/') . '/' . $stored
        ]);
    }
}
