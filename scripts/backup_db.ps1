<#
Simple PowerShell helper to run pg_dump using `SUPABASE_DB_URL` environment variable.
Requires `pg_dump` (Postgres client) available in PATH.
Usage:
  $env:SUPABASE_DB_URL = "postgres://user:pass@host:5432/dbname"
  .\scripts\backup_db.ps1
#>

if (-not $env:SUPABASE_DB_URL) {
    Write-Error "SUPABASE_DB_URL environment variable is not set."
    exit 1
}

$timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$outfile = "backup-$timestamp.dump"

Write-Host "Creating backup to $outfile ..."

try {
    # Using pg_dump with custom format
    pg_dump --format=custom --file=$outfile $env:SUPABASE_DB_URL
    if ($LASTEXITCODE -ne 0) {
        Write-Error "pg_dump failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    Write-Host "Backup complete: $outfile"
} catch {
    Write-Error "Backup failed: $_"
    exit 1
}
