<#
Sube por SFTP los archivos del repo que cambiaron desde el último deploy,
usando curl (ya trae soporte SFTP via libssh2). Reemplaza el paso manual
de arrastrar archivos en FileZilla descrito en README.md → Despliegue.

Primer uso:
  1. Copiar scripts/deploy.local.json.example a scripts/deploy.local.json
     y completar con los mismos datos que usas en el Administrador de
     sitios de FileZilla.
  2. Correr con -Full una vez (sube todo el árbol versionado en git).
  3. De ahí en más, correr sin parámetros: sube solo lo que cambió desde
     el commit que quedó marcado como "ya desplegado".

Parámetros:
  -DryRun   Muestra qué se subiría/borraría sin conectarse al servidor.
  -Full     Ignora la marca de último deploy y sube TODO el árbol
            (git ls-files). Necesario la primera vez.
  -Since    Usar un commit puntual como base de comparación en vez de
            la marca guardada (ej. para arrancar el tracking incremental
            sin hacer un -Full).
#>

param(
    [switch]$DryRun,
    [switch]$Full,
    [string]$Since
)

$ErrorActionPreference = 'Stop'

$repoRoot   = (git rev-parse --show-toplevel).Trim()
$scriptsDir = Join-Path $repoRoot 'scripts'
$configPath = Join-Path $scriptsDir 'deploy.local.json'
$markerPath = Join-Path $scriptsDir '.last-deploy-commit'

if (-not (Test-Path $configPath)) {
    Write-Error "Falta $configPath. Copiá scripts/deploy.local.json.example y completá tus datos de conexión."
    exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json

foreach ($field in @('Host', 'User', 'Password', 'RemotePath')) {
    $value = $config.$field
    if ([string]::IsNullOrWhiteSpace($value) -or $value -eq 'cambia-esto') {
        Write-Error "scripts/deploy.local.json: falta completar el campo '$field'."
        exit 1
    }
}

$port = 22
if ($config.Port) { $port = [int]$config.Port }

$remoteBase = $config.RemotePath.Trim('/')

$headSha = (git -C $repoRoot rev-parse HEAD).Trim()

$statusPorcelain = git -C $repoRoot status --porcelain
if ($statusPorcelain) {
    Write-Warning "Hay cambios sin commitear — no se van a subir (el deploy sube el estado de HEAD, no el working tree)."
}

# --- Determinar el conjunto de archivos a subir/borrar ---------------------

$uploads = New-Object System.Collections.Generic.List[string]
$deletes = New-Object System.Collections.Generic.List[string]

if ($Full) {
    Write-Host "Modo -Full: se sube todo el árbol versionado en git."
    git -C $repoRoot ls-files | ForEach-Object { $uploads.Add($_) }
}
else {
    $baseSha = $Since
    if (-not $baseSha) {
        if (-not (Test-Path $markerPath)) {
            Write-Error "No hay marca de último deploy ($markerPath). Corré primero con -Full, o con -Since <commit> si ya sabés qué commit está en producción."
            exit 1
        }
        $baseSha = (Get-Content $markerPath -Raw).Trim()
    }

    Write-Host "Comparando $baseSha..$headSha"
    $diffLines = git -C $repoRoot diff --name-status -M $baseSha $headSha

    if (-not $diffLines) {
        Write-Host "Sin cambios desde el último deploy. Nada para subir."
        exit 0
    }

    foreach ($line in $diffLines) {
        $parts = $line -split "`t"
        $status = $parts[0]

        if ($status.StartsWith('R')) {
            # Rename: parts[1] = old path, parts[2] = new path
            $deletes.Add($parts[1])
            $uploads.Add($parts[2])
        }
        elseif ($status -eq 'D') {
            $deletes.Add($parts[1])
        }
        else {
            # A, M, C, T...
            $uploads.Add($parts[1])
        }
    }
}

Write-Host "Archivos a subir: $($uploads.Count) — a borrar: $($deletes.Count)"

if ($DryRun) {
    Write-Host "`n--- DRY RUN: no se conecta al servidor ---"
    $uploads | ForEach-Object { Write-Host "  SUBIR   $_ -> $remoteBase/$_" }
    $deletes | ForEach-Object { Write-Host "  BORRAR  $remoteBase/$_" }
    exit 0
}

if ($uploads.Count -eq 0 -and $deletes.Count -eq 0) {
    Write-Host "Nada para subir ni borrar."
    exit 0
}

# --- Config temporal de curl (evita que la contraseña quede en el historial
#     de comandos o en la lista de procesos) ---------------------------------

$curlConfigPath = Join-Path ([System.IO.Path]::GetTempPath()) "deploy-ftp-$([guid]::NewGuid()).curlconfig"
$curlConfigLines = @(
    "user = `"$($config.User):$($config.Password)`""
)
if ($config.HostPubKeySha256) {
    $curlConfigLines += "hostpubsha256 = `"$($config.HostPubKeySha256)`""
}
Set-Content -Path $curlConfigPath -Value $curlConfigLines -Encoding ASCII -NoNewline:$false

function Invoke-Curl {
    param([string[]]$CurlArgs)
    & curl.exe -K $curlConfigPath --silent --show-error @CurlArgs
    if ($LASTEXITCODE -ne 0) {
        throw "curl salió con código $LASTEXITCODE (args: $($CurlArgs -join ' '))"
    }
}

try {
    $baseUrl = "sftp://$($config.Host):$port/"

    # 1) Crear (idempotente) todos los directorios remotos necesarios,
    #    de menor a mayor profundidad, en un solo intento por lote.
    $dirsNeeded = New-Object System.Collections.Generic.HashSet[string]
    foreach ($file in $uploads) {
        $dir = Split-Path ($remoteBase + '/' + $file) -Parent
        $dir = $dir -replace '\\', '/'
        $segments = $dir -split '/'
        $acc = ''
        foreach ($seg in $segments) {
            if ($seg -eq '') { continue }
            if ($acc -eq '') { $acc = $seg } else { $acc = "$acc/$seg" }
            [void]$dirsNeeded.Add($acc)
        }
    }

    $sortedDirs = $dirsNeeded | Sort-Object { ($_ -split '/').Count }
    if ($sortedDirs.Count -gt 0) {
        Write-Host "Creando $($sortedDirs.Count) directorio(s) remoto(s) (se ignoran los que ya existen)..."
        for ($i = 0; $i -lt $sortedDirs.Count; $i += 40) {
            $batch = $sortedDirs[$i..([Math]::Min($i + 39, $sortedDirs.Count - 1))]
            $args = @()
            foreach ($d in $batch) { $args += '-Q'; $args += "-mkdir $d" }
            $args += $baseUrl
            Invoke-Curl -CurlArgs $args
        }
    }

    # 2) Subir archivos, en lotes para no pasarnos del largo de línea de comando.
    if ($uploads.Count -gt 0) {
        Write-Host "Subiendo $($uploads.Count) archivo(s)..."
        for ($i = 0; $i -lt $uploads.Count; $i += 15) {
            $batch = $uploads[$i..([Math]::Min($i + 14, $uploads.Count - 1))]
            $args = @()
            foreach ($f in $batch) {
                $localPath = Join-Path $repoRoot $f
                $remoteUrl = "sftp://$($config.Host):$port/$remoteBase/$f"
                $args += '-T'; $args += $localPath; $args += $remoteUrl
                Write-Host "  -> $f"
            }
            Invoke-Curl -CurlArgs $args
        }
    }

    # 3) Borrar archivos que ya no existen en el repo.
    if ($deletes.Count -gt 0) {
        Write-Host "Borrando $($deletes.Count) archivo(s) remoto(s)..."
        for ($i = 0; $i -lt $deletes.Count; $i += 40) {
            $batch = $deletes[$i..([Math]::Min($i + 39, $deletes.Count - 1))]
            $args = @()
            foreach ($f in $batch) {
                $args += '-Q'; $args += "-rm $remoteBase/$f"
                Write-Host "  x  $f"
            }
            $args += $baseUrl
            Invoke-Curl -CurlArgs $args
        }
    }

    Set-Content -Path $markerPath -Value $headSha -NoNewline
    Write-Host "`nListo. Marca de último deploy actualizada a $headSha."
}
finally {
    Remove-Item -Path $curlConfigPath -Force -ErrorAction SilentlyContinue
}
