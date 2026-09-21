$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$data = Get-Content -Raw -Encoding utf8 -LiteralPath (Join-Path $root 'data/g5/reading.json') | ConvertFrom-Json
$questions = @($data.questions)
if ($questions.Count -ne 25) { throw "Expected 25 questions, found $($questions.Count)." }
if ($questions | Group-Object id | Where-Object Count -gt 1) { throw 'Duplicate question IDs found.' }
$fields = 'id','grade','skill','part','questionType','prompt','choices','correctChoiceId','explanation','difficulty','tags','sourceType','sourceReference'
foreach ($q in $questions) {
  foreach ($field in $fields) { if ($null -eq $q.PSObject.Properties[$field]) { throw "Missing $field on $($q.id)." } }
  if ($q.id -notmatch '^G5-R-(P1|P2|P3|LEGACY)-\d{4}$') { throw "Invalid ID: $($q.id)" }
  if ($q.grade -ne 'g5' -or $q.skill -ne 'reading') { throw "Wrong grade or skill: $($q.id)" }
  if (@($q.choices).Count -lt 2 -or -not (@($q.choices.id) -contains $q.correctChoiceId)) { throw "Invalid choices: $($q.id)" }
}
$parts = $questions | Group-Object part -AsHashTable -AsString
if ($parts['P1'].Count -ne 16 -or $parts['P2'].Count -ne 9 -or $parts.ContainsKey('P3')) { throw 'Unexpected Part counts.' }
function Invoke-FisherYatesShuffle($items) {
  $result = [System.Collections.ArrayList]::new(@($items))
  for ($i = $result.Count - 1; $i -gt 0; $i--) {
    $j = Get-Random -Minimum 0 -Maximum ($i + 1)
    $temporary = $result[$i]; $result[$i] = $result[$j]; $result[$j] = $temporary
  }
  return @($result)
}
1..50 | ForEach-Object { foreach ($q in @($questions | Where-Object part -eq 'P1')) { if (-not (@(Invoke-FisherYatesShuffle $q.choices).id -contains $q.correctChoiceId)) { throw "Correct choice lost: $($q.id)" } } }
Write-Output "Validated 25 questions: P1=16, P2=9, P3=0, UNCLASSIFIED=0."
