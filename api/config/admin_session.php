<?php
function adminBearerToken(): ?string {
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($authorization === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) { $authorization = $value; break; }
        }
    }
    return preg_match('/^Bearer ([a-f0-9]{64})$/i', trim($authorization), $matches) ? $matches[1] : null;
}

function hasValidAdminSession(PDO $pdo): bool {
    $token = adminBearerToken();
    if ($token === null) return false;
    $stmt = $pdo->prepare('SELECT 1 FROM admin_sessions WHERE token_hash = ? AND expires_at > NOW()');
    $stmt->execute([hash('sha256', $token)]);
    return (bool) $stmt->fetchColumn();
}
