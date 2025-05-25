$content = Get-Content "components/profit-calculator.tsx" -Raw

# Corrigir o JSX malformado nas linhas problemáticas
$content = $content -replace 'className="border-orange-500 text-orange-400">\s*🐛 Debug Config\s*</Button>', 'className: "border-blue-500/50 bg-blue-900/20",
                      });
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>'

Set-Content "components/profit-calculator.tsx" $content 