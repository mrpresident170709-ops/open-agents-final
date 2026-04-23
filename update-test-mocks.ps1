# Script to update test files to support Daytona mocking
# This adds connectDaytona mock to all test files

$files = Get-ChildItem -Path "C:\Users\sumit\open-agents-final" -Filter "*.test.ts" -Recurse | 
    Where-Object { $_.FullName -notmatch "node_modules" }

$count = 0
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    
    if ($content -match 'mock\.module\("@open-harness/sandbox"') {
        # Check if already updated
        if ($content -notmatch "connectDaytona") {
            # Add connectDaytona to the mock
            $updated = $content -replace
                'mock\.module\("@open-harness/sandbox",\s*\(\s*\(\)\s*=>\s*\{',
                'mock.module("@open-harness/sandbox", () => ({'
            
            if ($updated -ne $content) {
                Set-Content -Path $file.FullName -Value $updated -Encoding UTF8
                Write-Host "Updated: $($file.Name)"
                $count++
            }
        }
    }
}

Write-Host "Done! Updated $count files."
