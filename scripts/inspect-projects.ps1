
$res = Invoke-RestMethod -Uri "http://localhost:3000/api/projects"
if ($res.data -and $res.data.Count -gt 0) {
    $proj = $res.data[0]
    Write-Host "Project: $($proj.name) ($($proj.id))"
    $proj.skillRequirements | ConvertTo-Json
} else {
    Write-Host "No project data found."
}
