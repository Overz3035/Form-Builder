import type { FormSchema } from "@/types";
import { resolveColumns } from "@/lib/generator/columns";

function escapeForJs(json: string): string {
  return json.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
}

export interface SmsExportDefaults {
  apiKey: string;
  lineNumber: string;
}

const FALLBACK_SMS: SmsExportDefaults = { apiKey: "", lineNumber: "" };

export function generatePhp(form: FormSchema, smsDefaults: SmsExportDefaults = FALLBACK_SMS): string {
  const columns = resolveColumns(form);
  const settings = form.settings;
  const dark = settings.theme !== "light";
  const phoneField = columns.find((c) => c.field.type === "phone");
  const smsEnabled = form.sms.enabled && !!phoneField;

  const clientSchema = {
    fields: form.fields.map((f) => ({
      id: f.id,
      column: resolveColumns(form).find((c) => c.field.id === f.id)?.name ?? f.column,
      type: f.type,
      label: f.label,
      required: f.required,
      placeholder: f.placeholder || "",
      description: f.description || "",
      width: f.width,
      options: f.options,
      config: f.config,
      validation: f.validation,
      logic: f.logic,
      disabled: f.disabled,
      readOnly: f.readOnly,
    })),
    settings: { theme: settings.theme, submitText: settings.submitText },
  };

  const schemaJson = escapeForJs(JSON.stringify(clientSchema, null, 0));

  const phpEscape = (s: string): string => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const RULE_TYPES = new Set(["min", "max", "minLength", "maxLength", "pattern", "email", "phone"]);

  const phpColumns = columns
    .map((c) => {
      const rules = (c.field.validation || [])
        .filter((r) => RULE_TYPES.has(r.type))
        .map((r) => {
          const v = typeof r.value === "number" ? String(r.value) : `'${phpEscape(String(r.value ?? ""))}'`;
          return `['t' => '${r.type}', 'v' => ${v}, 'm' => '${phpEscape(r.message)}']`;
        })
        .join(", ");
      return `        '${c.name}' => ['type' => '${c.field.type}', 'sql' => '${c.sqlType}', 'required' => ${c.field.required ? "true" : "false"}, 'rules' => [${rules}]],`;
    })
    .join("\n");

  const smsParamsPhp =
    form.sms.enabled && form.sms.mode === "verify"
      ? form.sms.parameters
          .filter((p) => p.name && p.fieldId)
          .map((p) => {
            const col = columns.find((c) => c.field.id === p.fieldId);
            return `                ['name' => '${p.name.replace(/[^A-Za-z0-9_]/g, "").toUpperCase()}', 'field' => '${col?.name ?? ""}'],`;
          })
          .join("\n")
      : "";

  const smsMessagePhp = form.sms.enabled && form.sms.mode === "bulk" ? form.sms.message : "";

  return `<?php
/**
 * Vira Forms — generated form (self-contained)
 * Form: ${form.name}
 * Table: ${form.table}
 * Generated: ${new Date().toISOString()}
 *
 * Upload this file to your web server (e.g. /signupform/index.php)
 */

declare(strict_types=1);

const DB_HOST = 'localhost';
const DB_PORT = '3307';
const DB_USER = 'root';
const DB_PASS = '';
const DB_NAME = 'Forms';
const TABLE   = '${form.table}';

const SMS_ENABLED = ${smsEnabled ? "true" : "false"};
const SMS_MODE    = '${form.sms.mode}';
const SMS_API_KEY = '${form.sms.apiKey || smsDefaults.apiKey}';
const SMS_LINE    = '${form.sms.lineNumber || smsDefaults.lineNumber}';
const SMS_TEMPLATE = '${form.sms.templateId || ""}';
const SMS_MESSAGE = '${smsMessagePhp.replace(/'/g, "\\'")}';

$COLUMNS = [
${phpColumns}
];
$SMS_VERIFY_PARAMS = [
${smsParamsPhp}
];

// ---------- helpers ----------
function e(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function field_value(array $post, string $key, string $type) {
    $v = $post[$key] ?? '';
    if (is_array($v)) { $v = implode(',', array_map('strval', $v)); }
    if ($type === 'toggle') return isset($post[$key]) && $post[$key] ? 1 : 0;
    if ($type === 'number' || $type === 'rating' || $type === 'slider') {
        return $v === '' ? null : (float)str_replace([',', '۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'], ['.','0','1','2','3','4','5','6','7','8','9'], (string)$v);
    }
    return trim((string)$v) === '' ? null : trim((string)$v);
}

function validate(array $post, array $columns): array {
    $errors = [];
    foreach ($columns as $name => $c) {
        $raw = $post[$name] ?? '';
        if (is_array($raw)) $raw = implode(',', $raw);
        $val = trim((string)$raw);
        if ($c['required'] && $val === '') {
            $errors[$name] = 'این فیلد الزامی است.';
            continue;
        }
        if ($val === '') continue;
        $enVal = str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'], ['0','1','2','3','4','5','6','7','8','9'], $val);
        if ($c['type'] === 'email' && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
            $errors[$name] = 'ایمیل معتبر وارد کنید.';
            continue;
        }
        if ($c['type'] === 'phone' && !preg_match('/^(\\+98|0098|98|0)?9\\d{9}$/', $enVal)) {
            $errors[$name] = 'شماره موبایل معتبر وارد کنید.';
            continue;
        }
        if (!empty($c['rules']) && is_array($c['rules'])) {
            foreach ($c['rules'] as $r) {
                $t = $r['t'] ?? '';
                $rv = $r['v'] ?? null;
                $msg = $r['m'] ?? 'مقدار وارد شده معتبر نیست.';
                if ($t === 'minLength' && mb_strlen($val, 'UTF-8') < (int)$rv) { $errors[$name] = $msg; break; }
                if ($t === 'maxLength' && mb_strlen($val, 'UTF-8') > (int)$rv) { $errors[$name] = $msg; break; }
                if ($t === 'min' && (float)$enVal < (float)$rv) { $errors[$name] = $msg; break; }
                if ($t === 'max' && (float)$enVal > (float)$rv) { $errors[$name] = $msg; break; }
                if ($t === 'email' && !filter_var($val, FILTER_VALIDATE_EMAIL)) { $errors[$name] = $msg; break; }
                if ($t === 'phone' && !preg_match('/^(\\+98|0098|98|0)?9\\d{9}$/', $enVal)) { $errors[$name] = $msg; break; }
                if ($t === 'pattern' && is_string($rv) && $rv !== '') {
                    $pat = '~' . str_replace('~', '\\~', $rv) . '~u';
                    if (@preg_match($pat, $val) !== 1) { $errors[$name] = $msg; break; }
                }
            }
        }
    }
    return $errors;
}

function insert_row(array $data, string $ip): bool {
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        $cols = ['submitted_at', 'ip'];
        $marks = ['NOW()', '?'];
        $params = [$ip];
        foreach ($data as $k => $v) {
            $cols[] = '\`' . $k . '\`';
            $marks[] = '?';
            $params[] = $v;
        }
        $sql = 'INSERT INTO \`' . TABLE . '\` (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $marks) . ')';
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    } catch (Throwable $ex) {
        error_log('ViraForms insert error: ' . $ex->getMessage());
        return false;
    }
}

function safe_ident(string $name): ?string {
    return preg_match('/^[A-Za-z0-9_]{1,60}$/', $name) ? $name : null;
}

function ensure_table(array $columns): bool {
    try {
        $table = safe_ident(TABLE);
        if ($table === null) return false;
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $pdo->exec('CREATE DATABASE IF NOT EXISTS \`' . DB_NAME . '\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $defs = ['\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY'];
        foreach ($columns as $name => $c) {
            $col = safe_ident($name);
            if ($col === null) continue;
            $defs[] = '\`' . $col . '\` ' . $c['sql'] . ' NULL';
        }
        $defs[] = '\`submitted_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP';
        $defs[] = '\`ip\` VARCHAR(64) NULL';
        $pdo->exec('CREATE TABLE IF NOT EXISTS \`' . DB_NAME . '\`.\`' . $table . '\` (' . implode(', ', $defs) . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        return true;
    } catch (Throwable $ex) {
        error_log('ViraForms ensure_table error: ' . $ex->getMessage());
        return false;
    }
}

function save_upload(array $file, string $prefix): ?string {
    if (empty($file) || !isset($file['tmp_name']) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return null;
    if ($file['size'] > 10 * 1024 * 1024) return null;
    $allowed = ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx','zip','txt'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed, true)) return null;
    $dir = __DIR__ . '/uploads';
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
    $name = $prefix . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
        return 'uploads/' . $name;
    }
    return null;
}

function sendSmsBulk(string $to, string $message): bool {
    $data = [
        'lineNumber' => SMS_LINE,
        'messageText' => $message,
        'mobiles' => [$to],
        'sendDateTime' => null,
    ];
    return sms_request('https://api.sms.ir/v1/send/bulk', $data);
}

function sendSmsVerify(string $to, string $templateId, array $parameters): bool {
    $data = [
        'mobile' => $to,
        'templateId' => $templateId,
        'parameters' => $parameters,
    ];
    return sms_request('https://api.sms.ir/v1/send/verify', $data);
}

function sms_request(string $url, array $data): bool {
    if (!function_exists('curl_init')) return false;
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => json_encode($data, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-API-KEY: ' . SMS_API_KEY,
        ],
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $body = json_decode((string)$response, true);
    return $status >= 200 && $status < 300 && isset($body['status']) && $body['status'] == 1;
}

// ---------- request handling ----------
$errors = [];
$success = false;
$serverError = false;
$serverErrorMsg = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!empty($_POST['website'])) { // honeypot
        $success = true; // silently drop bots
    } else {
      try {
        $errors = validate($_POST, $COLUMNS);
        $row = [];
        foreach ($COLUMNS as $name => $c) {
            if ($c['type'] === 'file' || $c['type'] === 'image') {
                $row[$name] = save_upload($_FILES[$name] ?? [], $name);
            } else {
                $row[$name] = field_value($_POST, $name, $c['type']);
            }
        }
        if (empty($errors)) {
            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
            if (!ensure_table($COLUMNS)) {
                $serverError = true;
                $serverErrorMsg = 'خطا در آماده‌سازی جدول دیتابیس. لطفاً با مدیر فرم تماس بگیرید.';
            } elseif (insert_row($row, $ip)) {
                $success = true;
                if (SMS_ENABLED) {
                    $phoneCol = null;
                    foreach ($COLUMNS as $name => $c) { if ($c['type'] === 'phone') { $phoneCol = $name; break; } }
                    if ($phoneCol && !empty($row[$phoneCol])) {
                        $to = str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'], ['0','1','2','3','4','5','6','7','8','9'], (string)$row[$phoneCol]);
                        if (SMS_MODE === 'verify' && SMS_TEMPLATE !== '') {
                            $params = [];
                            foreach ($SMS_VERIFY_PARAMS as $p) {
                                $params[] = ['name' => $p['name'], 'value' => (string)($row[$p['field']] ?? '')];
                            }
                            sendSmsVerify($to, SMS_TEMPLATE, $params);
                        } elseif (SMS_MODE === 'bulk') {
                            $msg = SMS_MESSAGE;
                            foreach ($COLUMNS as $name => $c) {
                                $msg = str_replace('{' . $name . '}', (string)($row[$name] ?? ''), $msg);
                            }
                            sendSmsBulk($to, $msg);
                        }
                    }
                }
            } else {
                $serverError = true;
                $serverErrorMsg = 'خطا در ثبت اطلاعات در دیتابیس. لطفاً با مدیر فرم تماس بگیرید.';
            }
        }
      } catch (Throwable $ex) {
        $serverError = true;
        $serverErrorMsg = 'خطای غیرمنتظره: ' . $ex->getMessage();
        error_log('ViraForms POST error: ' . $ex->getMessage());
      }
    }
}

$isDark = ${dark ? "true" : "false"};
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${form.name.replace(/</g, "&lt;")}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<style>
  :root { color-scheme: ${dark ? "dark" : "light"}; --bg: ${dark ? "#09090b" : "#f7f7f9"}; --fg: ${dark ? "#fafafa" : "#18181b"}; --muted: ${dark ? "#a1a1aa" : "#71717a"}; --card: ${dark ? "rgba(255,255,255,.04)" : "#ffffff"}; --card-solid: ${dark ? "#131316" : "#ffffff"}; --border: ${dark ? "rgba(255,255,255,.09)" : "rgba(24,24,27,.1)"}; --primary: #8b5cf6; --error: #f43f5e; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Vazirmatn, Tahoma, sans-serif; background: var(--bg); color: var(--fg); min-height: 100vh; padding: 40px 16px; line-height: 1.8; }
  .wrap { max-width: 640px; margin: 0 auto; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 36px 32px; ${dark ? "backdrop-filter: blur(20px);" : "box-shadow: 0 20px 60px rgba(0,0,0,.08);"} }
  h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; text-align: center; }
  .desc { color: var(--muted); text-align: center; font-size: 14px; margin-top: 8px; }
  .field { margin-top: 22px; width: 100%; }
  .field.w50 { width: calc(50% - 8px); display: inline-block; vertical-align: top; }
  .field.w33 { width: calc(33.333% - 11px); display: inline-block; vertical-align: top; }
  .field.w25 { width: calc(25% - 12px); display: inline-block; vertical-align: top; }
  .field.w75 { width: calc(75% - 4px); display: inline-block; vertical-align: top; }
  .row { display: flex; flex-wrap: wrap; gap: 16px; }
  label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px; }
  label .req { color: var(--error); }
  .hint { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  input[type=text], input[type=email], input[type=tel], input[type=number], input[type=password], input[type=url], input[type=date], input[type=time], select, textarea {
    width: 100%; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border);
    background: ${dark ? "rgba(255,255,255,.03)" : "#fff"}; color: var(--fg); font-family: inherit; font-size: 14px; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(139,92,246,.22); }
  input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"] { border-color: var(--error); }
  textarea { min-height: 110px; resize: vertical; }
  select option, select optgroup { background: var(--card-solid); color: var(--fg); }
  input[type=tel] { direction: ltr; text-align: left; }
  .tel-wrap { position: relative; }
  .tel-wrap .tel-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
  .tel-wrap input[type=tel] { padding-left: 40px; }
  .upload { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 16px; border: 1.5px dashed var(--border); border-radius: 14px; cursor: pointer; text-align: center; transition: all .2s; background: ${dark ? "rgba(255,255,255,.02)" : "#fff"}; }
  .upload:hover { border-color: var(--primary); background: rgba(139,92,246,.05); }
  .upload .ic { width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,.12); display: flex; align-items: center; justify-content: center; }
  .upload .ic svg { width: 22px; height: 22px; stroke: var(--primary); }
  .upload .t1 { font-size: 14px; font-weight: 600; color: var(--fg); }
  .upload .t2 { font-size: 12px; color: var(--muted); }
  .upload input[type=file] { display: none; }
  .filechip { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 9px 14px; border: 1px solid rgba(139,92,246,.35); background: rgba(139,92,246,.08); border-radius: 12px; font-size: 12px; color: var(--fg); direction: ltr; }
  .filechip .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 11px; text-align: left; }
  .filechip button { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 15px; padding: 0 4px; }
  .filechip button:hover { color: var(--error); }
  .date-wrap { position: relative; }
  .date-wrap input[type=text] { cursor: pointer; }
  .date-wrap .cal-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
  .jalcal { position: absolute; top: calc(100% + 8px); left: 0; z-index: 30; width: 280px; background: var(--card-solid); border: 1px solid var(--border); border-radius: 16px; padding: 12px; box-shadow: 0 20px 50px rgba(0,0,0,.35); display: none; }
  .jalcal.open { display: block; }
  .jalcal .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .jalcal .head .title { font-size: 14px; font-weight: 700; color: var(--fg); }
  .jalcal .head button { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; padding: 4px 10px; border-radius: 8px; }
  .jalcal .head button:hover { background: var(--border); color: var(--fg); }
  .jalcal .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
  .jalcal .dow { font-size: 10px; color: var(--muted); text-align: center; padding: 4px 0; }
  .jalcal .day { border: none; background: none; color: var(--fg); font-family: inherit; font-size: 12px; height: 34px; border-radius: 9px; cursor: pointer; }
  .jalcal .day:hover { background: ${dark ? "rgba(255,255,255,.07)" : "rgba(24,24,27,.06)"}; }
  .jalcal .day.sel { background: var(--primary); color: #fff; font-weight: 700; }
  .jalcal .day.today { box-shadow: inset 0 0 0 1px var(--primary); color: var(--primary); }
  .jalcal .todaybtn { width: 100%; margin-top: 8px; background: none; border: none; color: var(--primary); font-family: inherit; font-size: 12px; cursor: pointer; padding: 7px; border-radius: 9px; }
  .jalcal .todaybtn:hover { background: rgba(139,92,246,.1); }
  .jalcal .caltabs { display: flex; gap: 4px; background: ${dark ? "rgba(255,255,255,.05)" : "rgba(24,24,27,.05)"}; border-radius: 10px; padding: 3px; margin-bottom: 8px; }
  .jalcal .caltabs button { flex: 1; border: none; background: none; color: var(--muted); font-family: inherit; font-size: 12px; font-weight: 600; padding: 6px; border-radius: 8px; cursor: pointer; }
  .jalcal .caltabs button.on { background: rgba(139,92,246,.15); color: var(--primary); }
  .opt { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 12px; margin-top: 8px; cursor: pointer; font-size: 14px; transition: all .2s; }
  .opt:hover { border-color: var(--primary); }
  .err { color: var(--error); font-size: 12px; margin-top: 5px; display: none; }
  .err.show { display: block; }
  button.submit {
    width: 100%; margin-top: 30px; padding: 14px; border: none; border-radius: 14px; cursor: pointer;
    background: var(--primary); color: #fff; font-family: inherit; font-size: 16px; font-weight: 700;
    transition: all .2s; box-shadow: 0 8px 24px rgba(139,92,246,.35);
  }
  button.submit:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .success { text-align: center; padding: 40px 0; }
  .success .icon { width: 64px; height: 64px; margin: 0 auto 18px; border-radius: 50%; background: rgba(52,211,153,.15); display: flex; align-items: center; justify-content: center; }
  .alert { border: 1px solid rgba(244,63,94,.3); background: rgba(244,63,94,.08); color: #fb7185; padding: 14px 18px; border-radius: 12px; font-size: 14px; margin-bottom: 20px; }
  .stars { display: flex; gap: 4px; }
  .stars button { background: none; border: none; cursor: pointer; font-size: 26px; color: var(--muted); opacity: .5; transition: all .15s; padding: 2px; }
  .stars button.on { color: #fbbf24; opacity: 1; }
  .hidden { display: none !important; }
  @media (max-width: 640px) { .field.w50, .field.w33, .field.w75, .field.w25 { width: 100%; } }
</style>
</head>
<body>
<div class="wrap">
<?php if ($success): ?>
  <div class="card">
    <div class="success">
      <div class="icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <h1>${settings.successMessage.replace(/</g, "&lt;")}</h1>
    </div>
  </div>
<?php else: ?>
  <div class="card">
    <h1>${form.name.replace(/</g, "&lt;")}</h1>
    <?php if ($formDesc = ${form.description ? "'" + form.description.replace(/'/g, "\\'").replace(/\n/g, " ") + "'" : "null"}): ?>
      <p class="desc"><?= e($formDesc) ?></p>
    <?php endif; ?>
    <?php if ($serverError): ?><div class="alert"><?= e($serverErrorMsg !== '' ? $serverErrorMsg : 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.') ?></div><?php endif; ?>
    <form method="post" enctype="multipart/form-data" id="vform" novalidate>
      <input type="text" name="website" value="" style="position:absolute;left:-9999px" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div id="fields"></div>
      <button type="submit" class="submit">${settings.submitText.replace(/</g, "&lt;")}</button>
    </form>
  </div>
<?php endif; ?>
</div>

<script>
const SCHEMA = ${schemaJson};
const SERVER_ERRORS = <?= json_encode($errors, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?: '{}' ?>;

(function () {
  const container = document.getElementById('fields');
  if (!container) return;
  const values = {};
  const els = {};

  function visibleField(f) {
    if (!f.logic || !f.logic.conditions || !f.logic.conditions.length) return true;
    const results = f.logic.conditions.map(function (c) {
      const v = values[c.fieldId];
      const s = v === undefined || v === null ? '' : (Array.isArray(v) ? v.join(',') : String(v));
      const t = c.value || '';
      switch (c.operator) {
        case 'equals': return s === t;
        case 'notEquals': return s !== t;
        case 'contains': return s.indexOf(t) !== -1;
        case 'notContains': return s.indexOf(t) === -1;
        case 'empty': return s.trim() === '';
        case 'notEmpty': return s.trim() !== '';
        case 'gt': return parseFloat(s) > parseFloat(t);
        case 'lt': return parseFloat(s) < parseFloat(t);
        default: return true;
      }
    });
    return f.logic.match === 'all' ? results.every(Boolean) : results.some(Boolean);
  }

  function setValue(id, v) {
    values[id] = v;
    render();
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function buildField(f) {
    const w = ['25','33','50','66','75'].includes(String(f.width)) ? 'w' + f.width : '';
    const wrap = document.createElement('div');
    wrap.className = 'field ' + w;
    wrap.id = 'fw-' + f.id;
    let html = '';
    const layout = ['section','divider','spacer'].indexOf(f.type) !== -1;
    if (layout) {
      if (f.type === 'section') html += '<h2 style="font-size:17px;font-weight:800;margin-top:10px">' + esc(f.label) + '</h2><hr style="border:none;border-top:1px solid var(--border);margin-top:10px">';
      if (f.type === 'divider') html += '<hr style="border:none;border-top:1px solid var(--border);margin:8px 0">';
      if (f.type === 'spacer') html += '<div style="height:' + (f.config.height || 32) + 'px"></div>';
      wrap.innerHTML = html;
      return wrap;
    }
    html += '<label>' + esc(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</label>';
    if (f.description) html += '<div class="hint">' + esc(f.description) + '</div>';
    const id = 'fld-' + f.id;
    const inv = SERVER_ERRORS[f.column] ? 'true' : 'false';
    if (f.type === 'textarea') {
      html += '<textarea id="' + id + '" name="' + esc(f.column) + '" placeholder="' + esc(f.placeholder) + '"' + (f.readOnly ? ' readonly' : '') + (f.disabled ? ' disabled' : '') + ' aria-invalid="' + inv + '">' + esc(values[f.id] || '') + '</textarea>';
    } else if (f.type === 'select') {
      if (f.config.multiple) {
        f.options.forEach(function (o) {
          const checked = Array.isArray(values[f.id]) && values[f.id].indexOf(o.value) !== -1;
          html += '<label class="opt"><input type="checkbox" name="' + esc(f.column) + '[]" value="' + esc(o.value) + '"' + (checked ? ' checked' : '') + '> ' + esc(o.label) + '</label>';
        });
      } else {
        html += '<select id="' + id + '" name="' + esc(f.column) + '" aria-invalid="' + inv + '"><option value="">انتخاب کنید...</option>';
        f.options.forEach(function (o) {
          html += '<option value="' + esc(o.value) + '"' + (values[f.id] === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
        });
        html += '</select>';
      }
    } else if (f.type === 'radio') {
      f.options.forEach(function (o) {
        html += '<label class="opt"><input type="radio" name="' + esc(f.column) + '" value="' + esc(o.value) + '"' + (values[f.id] === o.value ? ' checked' : '') + '> ' + esc(o.label) + '</label>';
      });
    } else if (f.type === 'checkbox') {
      f.options.forEach(function (o) {
        const checked = Array.isArray(values[f.id]) && values[f.id].indexOf(o.value) !== -1;
        html += '<label class="opt"><input type="checkbox" name="' + esc(f.column) + '[]" value="' + esc(o.value) + '"' + (checked ? ' checked' : '') + '> ' + esc(o.label) + '</label>';
      });
    } else if (f.type === 'toggle') {
      html += '<label class="opt"><input type="checkbox" name="' + esc(f.column) + '" value="1"' + (values[f.id] ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
    } else if (f.type === 'rating') {
      const max = f.config.maxStars || 5;
      const cur = parseInt(values[f.id], 10) || 0;
      html += '<div class="stars" role="radiogroup" data-field="' + f.id + '">';
      for (let i = 1; i <= max; i++) {
        html += '<button type="button" data-star="' + i + '" class="' + (cur >= i ? 'on' : '') + '" aria-label="' + i + ' ستاره">&#9733;</button>';
      }
      html += '</div>';
    } else if (f.type === 'file' || f.type === 'image') {
      const acc = f.type === 'image' ? 'image/*' : '';
      const label1 = f.type === 'image' ? 'انتخاب تصویر' : 'انتخاب فایل';
      const label2 = f.type === 'image' ? 'JPG، PNG، SVG یا WEBP' : 'یا فایل را اینجا رها کنید';
      html += '<label class="upload"' + (f.disabled ? ' style="pointer-events:none;opacity:.5"' : '') + '>';
      html += '<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg></span>';
      html += '<span class="t1">' + label1 + '</span><span class="t2">' + label2 + '</span>';
      html += '<input type="file" id="' + id + '" name="' + esc(f.column) + '"' + (acc ? ' accept="' + acc + '"' : '') + (f.disabled ? ' disabled' : '') + '>';
      html += '</label>';
      html += '<div class="filechip" id="chip-' + f.id + '" style="display:none"><span class="name"></span><button type="button" data-clear="' + f.id + '" aria-label="حذف فایل">&times;</button></div>';
    } else if (f.type === 'slider') {
      html += '<input type="range" id="' + id + '" name="' + esc(f.column) + '" min="' + (f.config.min || 0) + '" max="' + (f.config.max || 100) + '" step="' + (f.config.step || 1) + '" value="' + (values[f.id] || f.config.min || 0) + '" oninput="this.nextElementSibling.textContent=this.value"><span style="font-size:13px;color:var(--muted)">' + (values[f.id] || f.config.min || 0) + '</span>';
    } else if (f.type === 'date') {
      html += '<div class="date-wrap">';
      html += '<input type="text" id="' + id + '" readonly placeholder="' + esc(f.placeholder || 'انتخاب تاریخ...') + '"' + (f.disabled ? ' disabled' : '') + (f.required ? ' data-req="1"' : '') + ' aria-invalid="' + inv + '" data-jdate="' + f.id + '" value="' + esc(values[f.id] ? jalDisplay(values[f.id]) : '') + '">';
      html += '<input type="hidden" name="' + esc(f.column) + '" id="hd-' + f.id + '" value="' + esc(values[f.id] || '') + '">';
      html += '<span class="cal-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>';
      html += '<div class="jalcal" id="cal-' + f.id + '"></div></div>';
    } else if (f.type === 'phone') {
      html += '<div class="tel-wrap"><input type="tel" id="' + id + '" name="' + esc(f.column) + '" placeholder="' + esc(f.placeholder || '0912 345 6789') + '"' + (f.readOnly ? ' readonly' : '') + (f.disabled ? ' disabled' : '') + (f.required ? ' data-req="1"' : '') + ' aria-invalid="' + inv + '" value="' + esc(values[f.id] || '') + '"><span class="tel-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span></div>';
    } else {
      const t = f.type === 'number' ? 'number' : f.type;
      html += '<input type="' + t + '" id="' + id + '" name="' + esc(f.column) + '" placeholder="' + esc(f.placeholder) + '"' + (f.readOnly ? ' readonly' : '') + (f.disabled ? ' disabled' : '') + (f.required ? ' data-req="1"' : '') + ' aria-invalid="' + inv + '" value="' + esc(values[f.id] || '') + '">';
    }
    html += '<div class="err' + (SERVER_ERRORS[f.column] ? ' show' : '') + '" id="err-' + f.id + '">' + esc(SERVER_ERRORS[f.column] || '') + '</div>';
    wrap.innerHTML = html;
    return wrap;
  }

  function bind(f, wrap) {
    const el = wrap.querySelector('#fld-' + f.id);
    els[f.id] = wrap;
    if (el) {
      const ev = (f.type === 'select' || f.type === 'file' || f.type === 'date' || f.type === 'time') ? 'change' : 'input';
      el.addEventListener(ev, function () {
        if (f.type === 'checkbox' && el.name.indexOf('[]') !== -1) return;
        setValue(f.id, el.type === 'checkbox' ? el.checked : el.value);
      });
    }
    if (f.type === 'file' || f.type === 'image') {
      const fileInput = wrap.querySelector('#fld-' + f.id);
      const chip = wrap.querySelector('#chip-' + f.id);
      if (fileInput && chip) {
        fileInput.addEventListener('change', function () {
          const name = fileInput.files && fileInput.files[0] ? fileInput.files[0].name : '';
          chip.style.display = name ? 'flex' : 'none';
          chip.querySelector('.name').textContent = name;
        });
        chip.querySelector('button').addEventListener('click', function () {
          fileInput.value = '';
          chip.style.display = 'none';
        });
      }
    }
    wrap.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
        if (cb.name.indexOf('[]') === -1) return;
      cb.addEventListener('change', function () {
        const list = [];
        wrap.querySelectorAll('input[type=checkbox]:checked').forEach(function (c) { list.push(c.value); });
        setValue(f.id, list);
      });
    });
    wrap.querySelectorAll('input[type=radio]').forEach(function (r) {
      r.addEventListener('change', function () { setValue(f.id, r.value); });
    });
    if (f.type === 'rating') {
      const starsWrap = wrap.querySelector('.stars');
      if (starsWrap) {
        starsWrap.querySelectorAll('button').forEach(function (b) {
          b.addEventListener('click', function () {
            const star = parseInt(b.getAttribute('data-star'), 10);
            const next = (parseInt(values[f.id], 10) || 0) === star ? 0 : star;
            setValue(f.id, next);
            starsWrap.querySelectorAll('button').forEach(function (x) {
              x.className = parseInt(x.getAttribute('data-star'), 10) <= next ? 'on' : '';
            });
          });
        });
      }
    }
    if (f.type === 'date') {
      attachJalali(f, wrap);
    }
  }

  // ---------- Jalali date picker ----------
  var JAL_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  function jdiv(a, b) { return ~~(a / b); }
  function jmod(a, b) { return a - ~~(a / b) * b; }
  function jalCal(jy) {
    var breaks = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
    var bl = breaks.length, gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump = 0, i;
    for (i = 1; i < bl; i++) { jm = breaks[i]; jump = jm - jp; if (jy < jm) break; leapJ += jdiv(jump, 33) * 8 + jdiv(jmod(jump, 33), 4); jp = jm; }
    var n = jy - jp;
    leapJ += jdiv(n, 33) * 8 + jdiv(jmod(n, 33) + 3, 4);
    if (jmod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    var leapG = jdiv(gy, 4) - jdiv((jdiv(gy, 100) + 1) * 3, 4) - 150;
    var march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + jdiv(jump + 4, 33) * 33;
    var leap = jmod(jmod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }
  function g2d(gy, gm, gd) {
    var d = jdiv((gy + jdiv(gm - 8, 6) + 100100) * 1461, 4) + jdiv(153 * jmod(gm + 9, 12) + 2, 5) + gd - 34840408;
    return d - jdiv(jdiv(gy + 100100 + jdiv(gm - 8, 6), 100) * 3, 4) + 752;
  }
  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + jdiv(jdiv(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = jdiv(jmod(j, 1461), 4) * 5 + 308;
    var gd = jdiv(jmod(i, 153), 5) + 1;
    var gm = jmod(jdiv(i, 153), 12) + 1;
    var gy = jdiv(j, 1461) - 100100 + jdiv(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }
  function j2d(jy, jm, jd) { var r = jalCal(jy); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - jdiv(jm, 7) * (jm - 7) + jd - 1; }
  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy), jdn1f = g2d(gy, 3, r.march), k = jdn - jdn1f, jm, jd;
    if (k >= 0) {
      if (k <= 185) { return { jy: jy, jm: 1 + jdiv(k, 31), jd: jmod(k, 31) + 1 }; }
      k -= 186;
    } else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
    return { jy: jy, jm: 7 + jdiv(k, 30), jd: jmod(k, 30) + 1 };
  }
  function isoToJal(iso) {
    var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(iso || '');
    if (!m) return null;
    return d2j(g2d(+m[1], +m[2], +m[3]));
  }
  function jalToIso(jy, jm, jd) {
    var g = d2g(j2d(jy, jm, jd));
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return g.gy + '-' + p(g.gm) + '-' + p(g.gd);
  }
  function jalDisplay(iso) {
    var p = isoToJal(iso);
    if (!p) return iso;
    return p.jy + '/' + (p.jm < 10 ? '0' : '') + p.jm + '/' + (p.jd < 10 ? '0' : '') + p.jd;
  }
  function monthLen(jy, jm) { return jm <= 6 ? 31 : (jm <= 11 ? 30 : (jalCal(jy).leap === 0 ? 30 : 29)); }
  var GREG_MONTHS = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
  function gregLen(gy, gm) { return new Date(gy, gm, 0).getDate(); }
  function parseIso(iso) {
    var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(iso || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function gregDisplay(iso) {
    var p = parseIso(iso);
    if (!p) return iso;
    return p.y + '/' + (p.m < 10 ? '0' : '') + p.m + '/' + (p.d < 10 ? '0' : '') + p.d;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function attachJalali(f, wrap) {
    var txt = wrap.querySelector('#fld-' + f.id);
    var hidden = wrap.querySelector('#hd-' + f.id);
    var box = wrap.querySelector('#cal-' + f.id);
    if (!txt || !hidden || !box) return;
    var view = null;
    var pcal = 'j';
    var nowD = new Date();
    var todayJ = d2j(g2d(nowD.getFullYear(), nowD.getMonth() + 1, nowD.getDate()));

    function syncView() {
      var iso = hidden.value;
      if (pcal === 'j') {
        var sel = isoToJal(iso);
        view = sel ? { y: sel.jy, m: sel.jm } : { y: todayJ.jy, m: todayJ.jm };
      } else {
        var g = parseIso(iso);
        view = g ? { y: g.y, m: g.m } : { y: nowD.getFullYear(), m: nowD.getMonth() + 1 };
      }
    }

    function dayIso(d) {
      if (pcal === 'j') return jalToIso(view.y, view.m, d);
      return view.y + '-' + pad2(view.m) + '-' + pad2(d);
    }

    function draw() {
      var iso = hidden.value;
      var len, leading, title;
      if (pcal === 'j') {
        len = monthLen(view.y, view.m);
        var firstG = d2g(j2d(view.y, view.m, 1));
        leading = (new Date(firstG.gy, firstG.gm - 1, firstG.gd).getDay() + 1) % 7;
        title = JAL_MONTHS[view.m - 1] + ' ' + view.y;
      } else {
        len = gregLen(view.y, view.m);
        leading = (new Date(view.y, view.m - 1, 1).getDay() + 1) % 7;
        title = GREG_MONTHS[view.m - 1] + ' ' + view.y;
      }
      var html = '<div class="caltabs"><button type="button" data-cal="j" class="' + (pcal === 'j' ? 'on' : '') + '">شمسی</button><button type="button" data-cal="g" class="' + (pcal === 'g' ? 'on' : '') + '">میلادی</button></div>';
      html += '<div class="head"><button type="button" data-nav="-1" aria-label="ماه قبل">&rsaquo;</button><span class="title">' + title + '</span><button type="button" data-nav="1" aria-label="ماه بعد">&lsaquo;</button></div><div class="grid">';
      ['ش','ی','د','س','چ','پ','ج'].forEach(function (w) { html += '<span class="dow">' + w + '</span>'; });
      for (var e = 0; e < leading; e++) html += '<span></span>';
      for (var d = 1; d <= len; d++) {
        var cls = 'day';
        if (iso && dayIso(d) === iso) cls += ' sel';
        var tIso = pcal === 'j'
          ? jalToIso(todayJ.jy, todayJ.jm, todayJ.jd)
          : nowD.getFullYear() + '-' + pad2(nowD.getMonth() + 1) + '-' + pad2(nowD.getDate());
        if (dayIso(d) === tIso) cls += ' today';
        html += '<button type="button" class="' + cls + '" data-day="' + d + '">' + d + '</button>';
      }
      html += '</div><button type="button" class="todaybtn" data-today="1">امروز</button>';
      box.innerHTML = html;
      box.querySelectorAll('[data-cal]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var next = b.getAttribute('data-cal');
          if (next === pcal) return;
          if (next === 'g') {
            var g = d2g(j2d(view.y, view.m, 1));
            view = { y: g.gy, m: g.gm };
          } else {
            var j = d2j(g2d(view.y, view.m, 1));
            view = { y: j.jy, m: j.jm };
          }
          pcal = next;
          draw();
        });
      });
      box.querySelectorAll('[data-nav]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var m = view.m + parseInt(b.getAttribute('data-nav'), 10);
          var y = view.y;
          if (m > 12) { m = 1; y++; }
          if (m < 1) { m = 12; y--; }
          view = { y: y, m: m };
          draw();
        });
      });
      box.querySelectorAll('[data-day]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var v = dayIso(parseInt(b.getAttribute('data-day'), 10));
          hidden.value = v;
          txt.value = pcal === 'j' ? jalDisplay(v) : gregDisplay(v);
          values[f.id] = v;
          box.classList.remove('open');
          var err = document.getElementById('err-' + f.id);
          if (err) err.classList.remove('show');
        });
      });
      var tb = box.querySelector('[data-today]');
      if (tb) tb.addEventListener('click', function (e) {
        e.stopPropagation();
        var v = nowD.getFullYear() + '-' + pad2(nowD.getMonth() + 1) + '-' + pad2(nowD.getDate());
        hidden.value = v;
        txt.value = pcal === 'j' ? jalDisplay(v) : gregDisplay(v);
        values[f.id] = v;
        if (pcal === 'j') view = { y: todayJ.jy, m: todayJ.jm };
        else view = { y: nowD.getFullYear(), m: nowD.getMonth() + 1 };
        box.classList.remove('open');
      });
    }

    txt.addEventListener('click', function () {
      if (f.disabled) return;
      var wasOpen = box.classList.contains('open');
      document.querySelectorAll('.jalcal.open').forEach(function (c) { c.classList.remove('open'); });
      if (!wasOpen) { syncView(); draw(); box.classList.add('open'); }
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest || (!e.target.closest('.date-wrap'))) {
      document.querySelectorAll('.jalcal.open').forEach(function (c) { c.classList.remove('open'); });
    }
  });

  function render() {
    SCHEMA.fields.forEach(function (f) {
      const wrap = els[f.id];
      if (wrap) wrap.classList.toggle('hidden', !visibleField(f));
      const err = document.getElementById('err-' + f.id);
      if (err && visibleField(f)) { /* keep server error visible */ }
    });
  }

  SCHEMA.fields.forEach(function (f) {
    const wrap = buildField(f);
    container.appendChild(wrap);
    bind(f, wrap);
  });

  render();

  document.getElementById('vform').addEventListener('submit', function (e) {
    let ok = true;
    let firstBad = null;
    SCHEMA.fields.forEach(function (f) {
      const err = document.getElementById('err-' + f.id);
      if (!err) return;
      err.classList.remove('show');
      const v = values[f.id];
      const s = v === undefined || v === null ? '' : (Array.isArray(v) ? v.join(',') : String(v)).trim();
      if (!visibleField(f)) return;
      let msg = '';
      if (f.required && s === '') msg = 'این فیلد الزامی است.';
      if (s !== '' && f.type === 'email' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s)) msg = 'ایمیل معتبر وارد کنید.';
      if (s !== '' && f.type === 'phone' && !/^(\\+98|0098|98|0)?9\\d{9}$/.test(s.replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }))) msg = 'شماره موبایل معتبر وارد کنید.';
      (f.validation || []).forEach(function (r) {
        if (s === '') return;
        if (r.type === 'minLength' && s.length < r.value) msg = r.message || msg;
        if (r.type === 'maxLength' && s.length > r.value) msg = r.message || msg;
        if (r.type === 'pattern') { try { if (!new RegExp(r.value).test(s)) msg = r.message || msg; } catch (ex) {} }
      });
      if (msg) {
        ok = false;
        err.textContent = msg;
        err.classList.add('show');
        if (!firstBad) firstBad = document.getElementById('fw-' + f.id);
      }
    });
    if (!ok) {
      e.preventDefault();
      if (firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
})();
</script>
</body>
</html>
`;
}
