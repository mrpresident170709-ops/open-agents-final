# Simple script to update test mocks
$files = Get-ChildItem -Path "C:\Users\sumit\open-agents-final" -Filter "*.test.ts" -Recurse | 
    Where-Object { $_.FullName -notmatch "node_modules" }

$count = 0
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    
    if ($content -match 'mock\.module\(["\']@open-harness/sandbox["\']') {
        # Check if already updated
        if ($content -notmatch "connectDaytona") {
            # Add connectDaytona to the mock
            $newContent = $content -replace `
mock\.module\(["\']@open-harness/sandbox["\']\s*,\s*\(\s*\)\s*=>\s*\{`, '
mock.module("@open-harness/sandbox", () => ({'
            
            if ($newContent -ne $content) {
                Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
                Write-Host "Updated: $($file.Name)"
                $count++
            }
        }
    }
}

Write-Host "Done! Updated $count files."
