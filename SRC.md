# SRC.md - autoresearch

## Proyecto

- **Nombre:** autoresearch
- **Tipo:** Autonomous AI Research Framework
- **Descripción:** Framework de investigación autónoma de IA. Permite que un agente de IA modifique código de entrenamiento LLM de forma autónoma, entrena por 5 minutos, evalúa si mejoró, y repite.
- **Tech Stack:** Python, PyTorch, nanochat (basado en GPT)
- **Autor original:** Andrej Karpathy (@karpathy)
- **Repositorio:** github.com/karpathy/autoresearch
- **Fork:** southwest-ai-labs/autoresearch

## Estructura

```
autoresearch/
├── prepare.py          # Preparación de datos y tokenizer (no modificar)
├── train.py            # Modelo GPT, optimizador, training loop (agente modifica)
├── program.md          # Instrucciones para el agente autónomo
├── pyproject.toml      # Dependencias (uv)
├── uv.lock
├── .python-version
├── .gitignore
├── analysis.ipynb      # Notebook de análisis
└── progress.png        # Visualización de progreso
```

## Módulos / Componentes

| Archivo | Rol | Modificable |
|---------|-----|-------------|
| `prepare.py` | Datos, tokenizer, dataloader, evaluación | ❌ No |
| `train.py` | Modelo + optimizador + training loop | ✅ Sí (agente) |
| `program.md` | Instrucciones del agente autónomo | ✅ Sí (humano) |

## Métricas

- **Objetivo:** Minimizar `val_bpb` (validation bits per byte)
- **Budget:** 5 minutos por experimento (wall-clock fijo)
- **Esperado:** ~12 experimentos/hora, ~100 mientras duermes

## Diseño Clave

1. **Un solo archivo editable por el agente** (`train.py`) — difs manejables
2. **Time budget fijo** — resultados comparables entre cambios de arquitectura
3. **Self-contained** — sin dependencias externas complejas

## Integración SWAL

Este proyecto puede ser usado para:
- Finetuning autónomo de modelos
- Experimentación acelerada de arquitecturas
- Búsqueda de hiperparámetros automáticos

## Estado

- ✅ Fork activo de SWAL
- 🧪 Experimental

## Referencias

- Repo original: https://github.com/karpathy/autoresearch
- Forks notables: macOS, MLX, Windows RTX

*Última actualización: 2026-03-23*
