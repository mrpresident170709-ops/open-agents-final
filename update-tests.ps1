# Script to update all test files that mock "@open-harness/sandbox"
# This adds Daytona mock support to all test files

$files = Get-ChildItem -Path "C:\Users\sumit\open-agents-final" -Filter "*.test.ts" -Recurse | 
    Where-Object { $_.FullName -notmatch "node_modules" }

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    
    if ($content -match 'mock\.module\("@open-harness/sandbox"') {
        # Check if already updated
        if ($content -notmatch "connectDaytona") {
            # Add connectDaytona to the mock
            $updated = $content -replace
                '(mock\.module\("@open-harness/sandbox",\s*\(\s*\)\s*=>\s*\(\s*\{)',
                '$1' -replace
                '(connectSandbox:\s*async\s*\(\s*[^)]*\s*\)\s*=>\s*\{[^}]*\}),)',
                '$1
  connectDaytona: async (...args: unknown[]) => {
    connectSandboxCalls.push(args);
    return connectSandboxResult;
  },'
            
            if ($updated -ne $content) {
                Set-Content -Path $file.FullName -Value $updated -Encoding UTF8
                Write-Host "Updated: $($file.Name)"
            }
        }
    }
}

Write-Host "Done updating test files!"
