param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Baseline,
    [Parameter(Mandatory)][string]$Evidence
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ARCH -ne 'X64') {
    throw 'Use a disposable Windows x64 Actions runner.'
}
$Source = [IO.Path]::GetFullPath($Source)
$Baseline = [IO.Path]::GetFullPath($Baseline)
$Evidence = [IO.Path]::GetFullPath($Evidence)
$drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($Evidence))
if ($drive.DriveFormat -ne 'NTFS') { throw "Unexpected filesystem $($drive.DriveFormat)" }
$setup = @(Get-ChildItem -File -Path (Join-Path $Source 'release') -Filter '*-setup.exe')
if ($setup.Count -ne 1) { throw 'Expected one candidate Windows installer.' }
$install = Join-Path $env:RUNNER_TEMP 'studio-size-installed'
$app = Join-Path $install 'in-C.exe'
$registry = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\688deee1-5ba1-5c47-a4bc-a2f716bb9772'
$location = 'HKCU:\Software\688deee1-5ba1-5c47-a4bc-a2f716bb9772'
if ((Test-Path $install) -or (Test-Path $registry) -or (Test-Path $location)) {
    throw 'A clean Windows installation scope is required.'
}
New-Item -ItemType Directory -Path $Evidence -Force | Out-Null
$report = @{
    filesystem = $drive.DriveFormat
    installer = $setup[0].Name
    installerSha256 = (Get-FileHash $setup[0].FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    appId = 'com.mannlab.inc'
}
try {
    $process = Start-Process $setup[0].FullName -ArgumentList @('/S', '/currentuser', "/D=$install") -Wait -PassThru
    $report.installExit = $process.ExitCode
    if ($process.ExitCode -ne 0 -or !(Test-Path $app)) { throw 'NSIS installation failed.' }
    $entry = Get-ItemProperty $registry
    $actualLocation = (Get-ItemProperty $location).InstallLocation.TrimEnd('\')
    $report.installPath = $actualLocation
    $report.displayVersion = $entry.DisplayVersion
    $report.productVersion = (Get-Item $app).VersionInfo.ProductVersion
    if ($actualLocation -ne $install -or $entry.DisplayVersion -ne '0.1.0-alpha.45') {
        throw 'Unexpected installation path or display version.'
    }
    node (Join-Path $PSScriptRoot 'verify-delivery.mjs') $Source $Baseline $Evidence $app
    if ($LASTEXITCODE -ne 0) { throw "Windows desktop validation exited $LASTEXITCODE." }
} finally {
    $uninstall = @(Get-ChildItem -File -Path $install -Filter 'Uninstall*.exe' -ErrorAction SilentlyContinue)
    if ($uninstall.Count -eq 1) {
        $removed = Start-Process $uninstall[0].FullName -ArgumentList @('/S', '/currentuser') -Wait -PassThru
        $report.uninstallExit = $removed.ExitCode
    }
    $report.installationRemoved = !(Test-Path $app) -and !(Test-Path $registry)
    $report | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $Evidence 'windows-installation.json')
}
if (!$report.installationRemoved -or $report.uninstallExit -ne 0) { throw 'Isolated NSIS uninstall failed.' }
