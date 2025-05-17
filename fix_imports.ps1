# Script para remover blocos de importação duplicados no meio do arquivo
$filePath = "components/profit-calculator.tsx"
Write-Host "Processando arquivo: $filePath"

# Ler o conteúdo do arquivo
$content = Get-Content -Path $filePath -Raw

# Procurar todas as ocorrências de blocos de importação
$pattern = '(?m)import\s+\{[^}]+\}\s+from\s+"react";[\r\n]+import\s+\{[^}]+\}[\r\n]+from\s+"lucide-react";[\r\n]+import[^;]+;[\r\n]+import[^;]+;[\r\n]+'

# Encontrar a primeira ocorrência (que queremos manter)
$firstImportBlock = [regex]::Match($content, $pattern)

if ($firstImportBlock.Success) {
    Write-Host "Encontrado bloco de importações principal"
    
    # Substituir todas as ocorrências subsequentes por uma string vazia
    $newContent = [regex]::Replace($content, $pattern, "", "Singleline", 1) # O 1 significa iniciar a partir do segundo match
    
    # Verificar se houve alterações
    if ($newContent -ne $content) {
        Write-Host "Blocos de importação duplicados encontrados e removidos"
        # Salvar o arquivo
        $newContent | Out-File -FilePath $filePath -Encoding utf8
        Write-Host "Arquivo salvo com sucesso"
    }
    else {
        Write-Host "Nenhum bloco de importação duplicado encontrado"
    }
}
else {
    Write-Host "Nenhum bloco de importação encontrado no arquivo"
}

# Verificar se ainda existem declarações import no meio do código
$contentAfterFix = Get-Content -Path $filePath -Raw
$middleImports = [regex]::Matches($contentAfterFix, '(?<!\A)(?<=[\r\n])import\s+')

if ($middleImports.Count -gt 0) {
    Write-Host "ALERTA: Ainda existem $($middleImports.Count) importações no meio do código!"
    
    # Leitura do arquivo linha por linha para identificar as linhas de importação
    $lines = Get-Content -Path $filePath
    $newLines = @()
    $inImportBlock = $false
    $skipLines = $false
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        
        # Se não for a primeira linha e encontrar uma importação, marcar para pular
        if ($i -gt 20 -and $line -match '^import\s+') {
            $skipLines = $true
            Write-Host "Encontrada importação para remover na linha $($i+1): $line"
            continue
        }
        
        # Se estiver pulando linhas e encontrar uma linha que não é importação,
        # parar de pular
        if ($skipLines -and -not $line -match '^import\s+') {
            $skipLines = $false
        }
        
        # Se não estiver pulando, adicionar a linha ao novo conteúdo
        if (-not $skipLines) {
            $newLines += $line
        }
    }
    
    # Salvar o arquivo com as linhas corretas
    $newLines | Out-File -FilePath $filePath -Encoding utf8
    Write-Host "Arquivo limpo com sucesso!"
}
else {
    Write-Host "Arquivo parece estar correto agora."
} 