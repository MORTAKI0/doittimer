# =========================
# DOITTIMER US-05 API SMOKE TEST
# =========================

$ErrorActionPreference = "Continue"

# -------------------------
# Config
# -------------------------
$BaseUrl = "http://localhost:3000"
$AgentToken = "ditm_5sCLr_VIhF0TNulfxDSgW63tJs7fdVzU"
$TimeZone = "Africa/Casablanca"
$Today = (Get-Date).ToString("yyyy-MM-dd")

# Optional
$TestPatchRoute = $true
$TestManualRoute = $true

# -------------------------
# Headers
# -------------------------
$JsonHeaders = @{
  "Authorization" = "Bearer $AgentToken"
  "Content-Type"  = "application/json"
  "Accept"        = "application/json"
}

$GetHeaders = @{
  "Authorization" = "Bearer $AgentToken"
  "Accept"        = "application/json"
}

# -------------------------
# State
# -------------------------
$Results = @()
$script:SessionId = $null

# -------------------------
# Helpers
# -------------------------
function Add-Result {
  param(
    [string]$Name,
    [bool]$Passed,
    [int]$StatusCode,
    [string]$Message,
    $Body = $null
  )

  $bodyText = ""
  if ($null -ne $Body) {
    try {
      $bodyText = $Body | ConvertTo-Json -Depth 10 -Compress
    }
    catch {
      $bodyText = [string]$Body
    }
  }

  $script:Results += [pscustomobject]@{
    Test       = $Name
    Passed     = $Passed
    StatusCode = $StatusCode
    Message    = $Message
    Body       = $bodyText
  }
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("GET","POST","PATCH")]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Url,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers,

    $Body = $null
  )

  try {
    if ($Method -eq "GET") {
      $response = Invoke-WebRequest -Method GET -Uri $Url -Headers $Headers -UseBasicParsing
    }
    elseif ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 10
      $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -Body $json -UseBasicParsing
    }
    else {
      $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
    }

    $parsed = $null
    try {
      $parsed = $response.Content | ConvertFrom-Json
    }
    catch {
      $parsed = $response.Content
    }

    return [pscustomobject]@{
      StatusCode = [int]$response.StatusCode
      Body       = $parsed
      Raw        = $response.Content
    }
  }
  catch {
    $resp = $_.Exception.Response

    if ($null -ne $resp) {
      try {
        $statusCode = [int]$resp.StatusCode
      }
      catch {
        $statusCode = 0
      }

      $raw = ""
      try {
        if ($resp -is [System.Net.Http.HttpResponseMessage]) {
          if ($null -ne $resp.Content) {
            $raw = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
          }
        }
        elseif ($resp.PSObject.Methods.Name -contains "GetResponseStream") {
          $stream = $resp.GetResponseStream()
          if ($null -ne $stream) {
            $reader = New-Object System.IO.StreamReader($stream)
            try {
              $raw = $reader.ReadToEnd()
            }
            finally {
              $reader.Close()
              $stream.Close()
            }
          }
        }
        elseif ($resp.PSObject.Properties.Name -contains "Content") {
          $raw = [string]$resp.Content
        }
      }
      catch {
        $raw = $_.Exception.Message
      }

      $parsed = $null
      try {
        $parsed = $raw | ConvertFrom-Json
      }
      catch {
        $parsed = $raw
      }

      return [pscustomobject]@{
        StatusCode = $statusCode
        Body       = $parsed
        Raw        = $raw
      }
    }

    return [pscustomobject]@{
      StatusCode = 0
      Body       = $_.Exception.Message
      Raw        = $_.Exception.ToString()
    }
  }
}

function Assert-True {
  param(
    [string]$Name,
    [bool]$Condition,
    [int]$StatusCode,
    [string]$SuccessMessage,
    [string]$FailMessage,
    $Body = $null
  )

  if ($Condition) {
    Add-Result -Name $Name -Passed $true -StatusCode $StatusCode -Message $SuccessMessage -Body $Body
  }
  else {
    Add-Result -Name $Name -Passed $false -StatusCode $StatusCode -Message $FailMessage -Body $Body
  }
}

function Get-SessionIdFromBody {
  param($Body)

  if ($null -eq $Body) { return $null }

  try {
    if ($null -ne $Body.data -and $null -ne $Body.data.id) { return $Body.data.id }
  } catch {}

  try {
    if ($null -ne $Body.id) { return $Body.id }
  } catch {}

  return $null
}

# -------------------------
# Test 0: app reachable
# -------------------------
Write-Host ""
Write-Host "== Checking app availability ==" -ForegroundColor Cyan

$homeResp = Invoke-Api -Method GET -Url $BaseUrl -Headers @{ "Accept" = "text/html" }

if ($homeResp.StatusCode -ge 200 -and $homeResp.StatusCode -lt 500) {
  Add-Result -Name "App reachable" -Passed $true -StatusCode $homeResp.StatusCode -Message "App is reachable at $BaseUrl" -Body $null
}
else {
  Add-Result -Name "App reachable" -Passed $false -StatusCode $homeResp.StatusCode -Message "Could not reach app at $BaseUrl" -Body $homeResp.Body
  $Results | Format-Table -Wrap -AutoSize
  return
}

# -------------------------
# Test 1: GET active before start
# -------------------------
Write-Host "== GET /api/agent/sessions/active before start ==" -ForegroundColor Cyan
$activeBefore = Invoke-Api -Method GET -Url "$BaseUrl/api/agent/sessions/active" -Headers $GetHeaders

Assert-True `
  -Name "GET active before start returns 200" `
  -Condition ($activeBefore.StatusCode -eq 200) `
  -StatusCode $activeBefore.StatusCode `
  -SuccessMessage "Active endpoint reachable" `
  -FailMessage "Expected 200 from active endpoint" `
  -Body $activeBefore.Body

# -------------------------
# Test 2: POST start session
# -------------------------
Write-Host "== POST /api/agent/sessions/start ==" -ForegroundColor Cyan
$startResp = Invoke-Api -Method POST -Url "$BaseUrl/api/agent/sessions/start" -Headers $JsonHeaders -Body @{}
$script:SessionId = Get-SessionIdFromBody -Body $startResp.Body

Assert-True `
  -Name "POST start returns 201" `
  -Condition ($startResp.StatusCode -eq 201) `
  -StatusCode $startResp.StatusCode `
  -SuccessMessage "Session started" `
  -FailMessage "Expected 201 when starting session" `
  -Body $startResp.Body

Assert-True `
  -Name "POST start returns session id" `
  -Condition (-not [string]::IsNullOrWhiteSpace($script:SessionId)) `
  -StatusCode $startResp.StatusCode `
  -SuccessMessage "Session id returned: $script:SessionId" `
  -FailMessage "No session id returned from start" `
  -Body $startResp.Body

# -------------------------
# Continue only if session started
# -------------------------
if (-not [string]::IsNullOrWhiteSpace($script:SessionId)) {

  # -------------------------
  # Test 3: duplicate start
  # -------------------------
  Write-Host "== POST /api/agent/sessions/start duplicate ==" -ForegroundColor Cyan
  $dupStartResp = Invoke-Api -Method POST -Url "$BaseUrl/api/agent/sessions/start" -Headers $JsonHeaders -Body @{}

  Assert-True `
    -Name "Duplicate start returns 409" `
    -Condition ($dupStartResp.StatusCode -eq 409) `
    -StatusCode $dupStartResp.StatusCode `
    -SuccessMessage "Duplicate active session correctly blocked" `
    -FailMessage "Expected 409 when starting with an already active session" `
    -Body $dupStartResp.Body

  # -------------------------
  # Test 4: GET active after start
  # -------------------------
  Write-Host "== GET /api/agent/sessions/active after start ==" -ForegroundColor Cyan
  $activeAfterStart = Invoke-Api -Method GET -Url "$BaseUrl/api/agent/sessions/active" -Headers $GetHeaders
  $activeSessionId = Get-SessionIdFromBody -Body $activeAfterStart.Body

  Assert-True `
    -Name "GET active after start returns 200" `
    -Condition ($activeAfterStart.StatusCode -eq 200) `
    -StatusCode $activeAfterStart.StatusCode `
    -SuccessMessage "Active session returned" `
    -FailMessage "Expected 200 after start" `
    -Body $activeAfterStart.Body

  Assert-True `
    -Name "GET active after start returns started session" `
    -Condition ($activeSessionId -eq $script:SessionId) `
    -StatusCode $activeAfterStart.StatusCode `
    -SuccessMessage "Active session id matches started session" `
    -FailMessage "Active session id does not match started session" `
    -Body $activeAfterStart.Body

  # -------------------------
  # Test 5: GET sessions list
  # -------------------------
  Write-Host "== GET /api/agent/sessions ==" -ForegroundColor Cyan
  $listUrl = "$BaseUrl/api/agent/sessions?day=$Today&tz=$([uri]::EscapeDataString($TimeZone))"
  $listResp = Invoke-Api -Method GET -Url $listUrl -Headers $GetHeaders

  Assert-True `
    -Name "GET sessions returns 200" `
    -Condition ($listResp.StatusCode -eq 200) `
    -StatusCode $listResp.StatusCode `
    -SuccessMessage "Session list returned" `
    -FailMessage "Expected 200 from sessions list" `
    -Body $listResp.Body

  # -------------------------
  # Test 6-10: Pomodoro
  # -------------------------
  $pomodoroRoutes = @(
    @{ Name = "Pomodoro init";          Path = "/api/agent/pomodoro/init" },
    @{ Name = "Pomodoro pause";         Path = "/api/agent/pomodoro/pause" },
    @{ Name = "Pomodoro resume";        Path = "/api/agent/pomodoro/resume" },
    @{ Name = "Pomodoro skip-phase";    Path = "/api/agent/pomodoro/skip-phase" },
    @{ Name = "Pomodoro restart-phase"; Path = "/api/agent/pomodoro/restart-phase" }
  )

  foreach ($route in $pomodoroRoutes) {
    Write-Host "== POST $($route.Path) ==" -ForegroundColor Cyan
    $resp = Invoke-Api -Method POST -Url "$BaseUrl$($route.Path)" -Headers $JsonHeaders -Body @{ sessionId = $script:SessionId }

    $returnedId = Get-SessionIdFromBody -Body $resp.Body
    $ok = (($resp.StatusCode -eq 200) -or ($resp.StatusCode -eq 201)) -and (-not [string]::IsNullOrWhiteSpace($returnedId))

    Assert-True `
      -Name $route.Name `
      -Condition $ok `
      -StatusCode $resp.StatusCode `
      -SuccessMessage "$($route.Name) succeeded and returned refreshed session state" `
      -FailMessage "$($route.Name) failed or did not return refreshed session state" `
      -Body $resp.Body
  }

  # -------------------------
  # Test 11: STOP session
  # -------------------------
  Write-Host "== POST /api/agent/sessions/stop ==" -ForegroundColor Cyan
  $stopResp = Invoke-Api -Method POST -Url "$BaseUrl/api/agent/sessions/stop" -Headers $JsonHeaders -Body @{ sessionId = $script:SessionId }

  Assert-True `
    -Name "POST stop returns success" `
    -Condition (($stopResp.StatusCode -eq 200) -or ($stopResp.StatusCode -eq 201)) `
    -StatusCode $stopResp.StatusCode `
    -SuccessMessage "Session stopped" `
    -FailMessage "Expected stop session to succeed" `
    -Body $stopResp.Body

  # -------------------------
  # Test 12: PATCH session
  # -------------------------
  if ($TestPatchRoute) {
    Write-Host "== PATCH /api/agent/sessions/[id] ==" -ForegroundColor Cyan

    $patchBody = @{
      editReason = "US-05 smoke test patch verification"
    }

    $patchResp = Invoke-Api -Method PATCH -Url "$BaseUrl/api/agent/sessions/$script:SessionId" -Headers $JsonHeaders -Body $patchBody
    $patchReturnedId = Get-SessionIdFromBody -Body $patchResp.Body
    $patchEditReason = $null
    try {
      $patchEditReason = $patchResp.Body.data.edit_reason
    } catch {}

    Assert-True `
      -Name "PATCH session route works" `
      -Condition (($patchResp.StatusCode -eq 200) -and ($patchReturnedId -eq $script:SessionId) -and ($patchEditReason -eq $patchBody.editReason)) `
      -StatusCode $patchResp.StatusCode `
      -SuccessMessage "PATCH session succeeded" `
      -FailMessage "PATCH session failed; check payload shape for your implementation" `
      -Body $patchResp.Body
  }

  # -------------------------
  # Test 13: active is null after stop
  # -------------------------
  Write-Host "== GET /api/agent/sessions/active after stop ==" -ForegroundColor Cyan
  $activeAfterStop = Invoke-Api -Method GET -Url "$BaseUrl/api/agent/sessions/active" -Headers $GetHeaders

  $activeIsNull = $false
  try {
    if ($null -ne $activeAfterStop.Body -and $activeAfterStop.Body.PSObject.Properties.Name -contains "data") {
      $activeIsNull = ($null -eq $activeAfterStop.Body.data)
    }
  } catch {}

  Assert-True `
    -Name "GET active after stop returns null data" `
    -Condition (($activeAfterStop.StatusCode -eq 200) -and $activeIsNull) `
    -StatusCode $activeAfterStop.StatusCode `
    -SuccessMessage "No active session after stop" `
    -FailMessage "Expected data:null after stop" `
    -Body $activeAfterStop.Body

  # -------------------------
  # Test 14: manual session
  # -------------------------
  if ($TestManualRoute) {
    Write-Host "== POST /api/agent/sessions/manual ==" -ForegroundColor Cyan

    $startAt = (Get-Date).AddMinutes(-50).ToUniversalTime().ToString("o")
    $endAt   = (Get-Date).AddMinutes(-20).ToUniversalTime().ToString("o")

    $manualBody = @{
      startedAt = $startAt
      endedAt   = $endAt
    }

    $manualResp = Invoke-Api -Method POST -Url "$BaseUrl/api/agent/sessions/manual" -Headers $JsonHeaders -Body $manualBody
    $manualId = Get-SessionIdFromBody -Body $manualResp.Body

    Assert-True `
      -Name "POST manual returns 201" `
      -Condition (($manualResp.StatusCode -eq 201) -and (-not [string]::IsNullOrWhiteSpace($manualId))) `
      -StatusCode $manualResp.StatusCode `
      -SuccessMessage "Manual session created" `
      -FailMessage "Manual session failed; adjust payload if your route expects different fields" `
      -Body $manualResp.Body
  }
}
else {
  Add-Result -Name "Downstream tests skipped" -Passed $false -StatusCode $startResp.StatusCode -Message "Start session did not return a session id, so later tests were skipped." -Body $startResp.Body
}

# -------------------------
# Test 15: unauthorized
# -------------------------
Write-Host "== Unauthorized check ==" -ForegroundColor Cyan
$badHeaders = @{
  "Authorization" = "Bearer invalid_token_value"
  "Accept"        = "application/json"
}

$unauthResp = Invoke-Api -Method GET -Url "$BaseUrl/api/agent/sessions/active" -Headers $badHeaders

Assert-True `
  -Name "Unauthorized token is rejected" `
  -Condition ($unauthResp.StatusCode -eq 401) `
  -StatusCode $unauthResp.StatusCode `
  -SuccessMessage "Unauthorized access correctly rejected" `
  -FailMessage "Expected 401 for invalid token" `
  -Body $unauthResp.Body

# -------------------------
# Summary
# -------------------------
Write-Host ""
Write-Host "=========================" -ForegroundColor Yellow
Write-Host "US-05 TEST SUMMARY" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
$Results | Format-Table -Wrap -AutoSize

$failed = $Results | Where-Object { -not $_.Passed }
$passed = $Results | Where-Object { $_.Passed }

Write-Host ""
Write-Host ("Passed: " + $passed.Count) -ForegroundColor Green
Write-Host ("Failed: " + $failed.Count) -ForegroundColor Red

if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "Failed checks details:" -ForegroundColor Red
  $failed | ForEach-Object {
    Write-Host ""
    Write-Host ("Test: " + $_.Test) -ForegroundColor Red
    Write-Host ("Status: " + $_.StatusCode)
    Write-Host ("Message: " + $_.Message)
    if ($_.Body) {
      Write-Host ("Body: " + $_.Body)
    }
  }
}

