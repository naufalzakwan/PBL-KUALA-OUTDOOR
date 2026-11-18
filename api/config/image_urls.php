<?php
// Repair legacy local upload URLs at read time without changing stored data.
function normalizeLegacyLocalImageUrl($url) {
    if (!is_string($url) || $url === '') return $url;
    $parts = parse_url($url);
    $host = strtolower($parts['host'] ?? '');
    $requestHost = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
    $path = $parts['path'] ?? '';
    $oldPrefix = '/PBL-KELANA-OUTDOOR/';
    if (!in_array($host, ['localhost', '127.0.0.1'], true) || !in_array($requestHost, ['localhost', '127.0.0.1'], true) || stripos($path, $oldPrefix) !== 0) return $url;
    $suffix = substr($path, strlen($oldPrefix));
    if (strpos($suffix, 'uploads/') !== 0 && strpos($suffix, 'upload/') !== 0) return $url;
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $position = strpos($script, '/api/');
    if ($position === false) return $url;
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    return $protocol . $_SERVER['HTTP_HOST'] . substr($script, 0, $position) . '/' . $suffix . (isset($parts['query']) ? '?' . $parts['query'] : '') . (isset($parts['fragment']) ? '#' . $parts['fragment'] : '');
}
