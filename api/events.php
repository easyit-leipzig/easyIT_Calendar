<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $pdo = db();

    if ($method === 'GET') {
        $start = (string)($_GET['start'] ?? '');
        $end = (string)($_GET['end'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
            throw new InvalidArgumentException('start und end müssen das Format YYYY-MM-DD haben.');
        }
        $stmt = $pdo->prepare(
            "SELECT e.id, e.start, e.end, e.activ, e.thema, COALESCE(e.description, '') description,
                    e.version_no,
                    COALESCE((SELECT ep.role_id FROM event_participants ep JOIN roles r ON r.id=ep.role_id WHERE ep.event_id=e.id AND r.role_key='student' ORDER BY ep.is_primary DESC, ep.id LIMIT 1), 3) to_role,
                    COALESCE((SELECT ep.person_id FROM event_participants ep JOIN roles r ON r.id=ep.role_id WHERE ep.event_id=e.id AND r.role_key='tutor' ORDER BY ep.is_primary DESC, ep.id LIMIT 1), 0) to_tutor,
                    COALESCE((SELECT ep.person_id FROM event_participants ep JOIN roles r ON r.id=ep.role_id WHERE ep.event_id=e.id AND r.role_key='student' ORDER BY ep.is_primary DESC, ep.id LIMIT 1), 0) to_student
             FROM events e
             WHERE e.activ=1 AND e.start < :range_end AND e.end >= :range_start
             ORDER BY e.start, e.id"
        );
        $stmt->execute(['range_start' => $start . ' 00:00:00', 'range_end' => $end . ' 00:00:00']);
        $events = $stmt->fetchAll();
        $attStmt = $pdo->prepare('SELECT original_name FROM event_attachments WHERE event_id=? AND activ=1 ORDER BY id');
        foreach ($events as &$event) {
            $attStmt->execute([$event['id']]);
            $event['appendizies'] = array_column($attStmt->fetchAll(), 'original_name');
            $event['id'] = (int)$event['id'];
            $event['to_role'] = (int)$event['to_role'];
            $event['to_tutor'] = (int)$event['to_tutor'];
            $event['to_student'] = (int)$event['to_student'];
            $event['activ'] = (bool)$event['activ'];
            $event['version_no'] = (int)$event['version_no'];
            $event['start'] = str_replace(' ', 'T', $event['start']);
            $event['end'] = str_replace(' ', 'T', $event['end']);
        }
        json_response(['ok' => true, 'events' => $events]);
    }

    if (!in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
        json_response(['ok' => false, 'error' => 'Methode nicht erlaubt.'], 405);
    }

    $input = request_json();
    if ($method === 'DELETE') {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) throw new InvalidArgumentException('Ungültige Termin-ID.');
        $stmt = $pdo->prepare('UPDATE events SET activ=0, version_no=version_no+1, updated_by=:user WHERE id=:id');
        $stmt->execute(['id' => $id, 'user' => app_config()['default_user_id']]);
        if ($stmt->rowCount() === 0) json_response(['ok' => false, 'error' => 'Termin nicht gefunden.'], 404);
        json_response(['ok' => true, 'id' => $id]);
    }

    $event = validate_event($input);
    $pdo->beginTransaction();
    try {
        if ($method === 'POST') {
            $stmt = $pdo->prepare('INSERT INTO events (`start`,`end`,activ,thema,description,event_status,created_by,updated_by) VALUES (?,?,?,?,?,\'planned\',?,?)');
            $stmt->execute([$event['start'], $event['end'], $event['activ'], $event['thema'], $event['description'], app_config()['default_user_id'], app_config()['default_user_id']]);
            $id = (int)$pdo->lastInsertId();
        } else {
            $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id) throw new InvalidArgumentException('Ungültige Termin-ID.');
            $stmt = $pdo->prepare('UPDATE events SET `start`=?,`end`=?,activ=?,thema=?,description=?,updated_by=?,version_no=version_no+1 WHERE id=?');
            $stmt->execute([$event['start'], $event['end'], $event['activ'], $event['thema'], $event['description'], app_config()['default_user_id'], $id]);
            if ($stmt->rowCount() === 0) {
                $exists = $pdo->prepare('SELECT 1 FROM events WHERE id=?'); $exists->execute([$id]);
                if (!$exists->fetchColumn()) throw new RuntimeException('Termin nicht gefunden.', 404);
            }
            $pdo->prepare('DELETE FROM event_participants WHERE event_id=?')->execute([$id]);
            $pdo->prepare('DELETE FROM event_attachments WHERE event_id=?')->execute([$id]);
        }
        save_participants($pdo, $id, $event);
        save_attachments($pdo, $id, $event['appendizies']);
        $pdo->commit();
        json_response(['ok' => true, 'id' => $id], $method === 'POST' ? 201 : 200);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
} catch (InvalidArgumentException $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], 400);
} catch (RuntimeException $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], $e->getCode() === 404 ? 404 : 409);
} catch (Throwable $e) {
    error_log($e->__toString());
    json_response(['ok' => false, 'error' => 'Datenbank- oder Serverfehler. Details stehen im PHP-Fehlerprotokoll.'], 500);
}

function validate_event(array $input): array
{
    foreach (['start','end'] as $field) {
        if (!isset($input[$field]) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/', (string)$input[$field])) {
            throw new InvalidArgumentException("$field ist ungültig.");
        }
    }
    $start = new DateTimeImmutable((string)$input['start']);
    $end = new DateTimeImmutable((string)$input['end']);
    if ($end <= $start) throw new InvalidArgumentException('Das Ende muss nach dem Beginn liegen.');
    $toTutor = max(0, (int)($input['to_tutor'] ?? 0));
    $toStudent = max(0, (int)($input['to_student'] ?? 0));
    $toRole = max(1, (int)($input['to_role'] ?? 3));
    return [
        'start' => $start->format('Y-m-d H:i:s'), 'end' => $end->format('Y-m-d H:i:s'),
        'activ' => !empty($input['activ']) ? 1 : 0,
        'thema' => mb_substr(trim((string)($input['thema'] ?? '')), 0, 255),
        'description' => trim((string)($input['description'] ?? '')),
        'to_tutor' => $toTutor, 'to_student' => $toStudent, 'to_role' => $toRole,
        'appendizies' => array_values(array_unique(array_filter(array_map('trim', is_array($input['appendizies'] ?? null) ? $input['appendizies'] : []))))
    ];
}

function save_participants(PDO $pdo, int $eventId, array $event): void
{
    $stmt = $pdo->prepare('INSERT INTO event_participants (event_id,person_id,role_id,participation_status,is_primary) VALUES (?,?,?,\'accepted\',1)');
    if ($event['to_tutor'] > 0) {
        $role = (int)$pdo->query("SELECT id FROM roles WHERE role_key='tutor' LIMIT 1")->fetchColumn();
        $stmt->execute([$eventId, $event['to_tutor'], $role ?: 2]);
    }
    if ($event['to_student'] > 0) {
        $stmt->execute([$eventId, $event['to_student'], $event['to_role']]);
    }
}

function save_attachments(PDO $pdo, int $eventId, array $files): void
{
    $stmt = $pdo->prepare('INSERT INTO event_attachments (event_id,original_name,stored_name,storage_path,activ) VALUES (?,?,?,?,1)');
    foreach ($files as $index => $name) {
        $safe = preg_replace('/[^A-Za-z0-9._-]+/u', '_', basename((string)$name)) ?: 'anlage';
        $stored = sprintf('event_%d_%d_%s', $eventId, $index + 1, $safe);
        $stmt->execute([$eventId, $name, $stored, app_config()['attachments_path'] . '/' . $stored]);
    }
}
