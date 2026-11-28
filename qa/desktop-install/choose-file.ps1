param(
    [Parameter(Mandatory)][string]$Title,
    [Parameter(Mandatory)][string]$File,
    [Parameter(Mandatory)][string]$FixtureDirectory
)
$ErrorActionPreference = 'Stop'
if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($File)) -ne [IO.Path]::GetFullPath($FixtureDirectory)) {
    throw 'The dialog must target a generated fixture or output.'
}
Add-Type -AssemblyName System.Windows.Forms
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
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, IntPtr process);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint source, uint destination, bool attach);
    [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr window);
    [DllImport("user32.dll")] public static extern IntPtr GetFocus();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);

    public static bool FocusEdit(IntPtr dialog, IntPtr edit) {
        uint own = GetCurrentThreadId();
        uint ui = GetWindowThreadProcessId(edit, IntPtr.Zero);
        if (!AttachThreadInput(own, ui, true)) return false;
        try {
            SetForegroundWindow(dialog);
            SetFocus(edit);
            return GetFocus() == edit;
        } finally {
            AttachThreadInput(own, ui, false);
        }
    }

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
if (Test-Path -LiteralPath $File) {
    if ([FixtureDialog]::SendMessage($edit, 0x000C, [IntPtr]::Zero, $File) -eq [IntPtr]::Zero) {
        throw "Could not set the native filename: $Title"
    }
    if (-not [FixtureDialog]::PostMessage($button, 0x00f5, [IntPtr]::Zero, [IntPtr]::Zero)) {
        throw "Could not confirm the native dialog: $Title"
    }
} else {
    # Use input notifications so the save dialog commits the edited name.
    [Windows.Forms.Clipboard]::SetText($File)
    if (-not [FixtureDialog]::FocusEdit($window, $edit)) { throw "Could not focus the native filename: $Title" }
    [Windows.Forms.SendKeys]::SendWait('^a')
    [Windows.Forms.SendKeys]::SendWait('^v')
    Start-Sleep -Milliseconds 300
    [Windows.Forms.SendKeys]::SendWait('{ENTER}')
}
Write-Output "Confirmed native dialog $Title for $([IO.Path]::GetFileName($File))"
