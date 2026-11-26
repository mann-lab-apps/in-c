param(
    [Parameter(Mandatory)][string]$Title,
    [Parameter(Mandatory)][string]$File,
    [Parameter(Mandatory)][string]$FixtureDirectory
)
$ErrorActionPreference = 'Stop'
if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($File)) -ne [IO.Path]::GetFullPath($FixtureDirectory)) {
    throw 'The dialog must target a generated fixture or output.'
}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class FixtureDialog {
    public delegate bool WindowCallback(IntPtr window, IntPtr parameter);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string cls, string title);
    [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr window, int id);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr window, WindowCallback callback, IntPtr parameter);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr window, StringBuilder buffer, int capacity);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr window, uint message, IntPtr wParam, string text);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);

    public static IntPtr FindEdit(IntPtr container) {
        var result = IntPtr.Zero;
        EnumChildWindows(container, (window, unused) => {
            var name = new StringBuilder(64);
            GetClassName(window, name, name.Capacity);
            if (name.ToString() != "Edit" || !IsWindowVisible(window)) return true;
            result = window;
            return false;
        }, IntPtr.Zero);
        return result;
    }
}
'@

$deadline = [DateTime]::UtcNow.AddSeconds(10)
do {
    $window = [FixtureDialog]::FindWindow('#32770', $Title)
    if ($window -ne [IntPtr]::Zero -and [FixtureDialog]::IsWindowVisible($window)) { break }
    Start-Sleep -Milliseconds 100
} while ([DateTime]::UtcNow -lt $deadline)
if ($window -eq [IntPtr]::Zero) { throw "No native dialog: $Title" }

$fileName = [FixtureDialog]::GetDlgItem($window, 1148)
$edit = if ($fileName -ne [IntPtr]::Zero) { [FixtureDialog]::FindEdit($fileName) } else { [IntPtr]::Zero }
if ($edit -eq [IntPtr]::Zero) { $edit = [FixtureDialog]::FindEdit($window) }
$button = [FixtureDialog]::GetDlgItem($window, 1)
if ($edit -eq [IntPtr]::Zero -or $button -eq [IntPtr]::Zero) {
    throw "Could not find the native filename and OK controls: $Title"
}
if ([FixtureDialog]::SendMessage($edit, 0x000C, [IntPtr]::Zero, $File) -eq [IntPtr]::Zero) {
    throw "Could not set the native filename: $Title"
}
if (-not [FixtureDialog]::PostMessage($button, 0x00f5, [IntPtr]::Zero, [IntPtr]::Zero)) {
    throw "Could not confirm the native dialog: $Title"
}
Write-Output "Confirmed native dialog $Title for $([IO.Path]::GetFileName($File))"
