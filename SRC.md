# SRC.md — AutoResearch

> **Autonomous LLM training con nanochat - dejaba que un agente IA entrene modelos mientras dormís**

## 1. Concept & Vision

Basado en el proyecto de Andrej Karpathy. La idea: darle a un agente IA un setup de entrenamiento LLM simplificado (single-GPU) y dejarlo experimentar de forma autonoma toda la noche. Modifica el código, entrena 5 minutos, verifica si mejoró, y repite. Wake up con un log de experimentos y (esperemos) un mejor modelo.

Fork de [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

## 2. Project Identity

| Campo | Valor |
|-------|-------|
| **Tipo** | ML Research / Autonomous AI |
| **Stack** | Python (nanochat) + CUDA + uv |
| **Repo** | `E:\scripts-python\autoresearch` |
| **Origen** | Fork de karpathy/autoresearch |
| **Última actividad** | 25/03/2026 |

## 3. Archivos Principales

```
autoresearch/
├── prepare.py     # Data prep + tokenizer (NO modificar)
├── train.py       # GPT model + optimizer + training loop (EL AGENTE MODIFICA ESTE)
├── program.md     # Instrucciones base para el agente (HUMANO MODIFICA ESTE)
├── pyproject.toml # Dependencias
└── README.md
```

## 4. Ciclo de Entrenamiento

```
Agente_edita_train.py → entrena_5_minutos → evalua_val_bpb →
mejora? → guarda / descarta → repite
```

**Métrica:** `val_bpb` (validation bits per byte) — lower is better

**Budget:** 5 minutos exactos por corrida (comparable entre experimentos)

## 5. Stack Técnico

- **Modelo base:** nanochat (GPT simplificado)
- **Optimizer:** Muon + AdamW
- **Tokenizador:** BPE custom
- **Plataforma:** Single NVIDIA GPU (testeado en H100)
- **Gestor:** uv (Astral)

## 6. Parámetros Principales (train.py)

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `DEPTH` | 8 | Capas del transformer |
| `MAX_SEQ_LEN` | 1024 | Longitud de secuencia |
| `VOCAB_SIZE` | 8192 | Tamaño de vocabulario |
| `DEVICE_BATCH_SIZE` | — | Batch por dispositivo |
| `TOTAL_BATCH_SIZE` | 2^19 | Batch total |
| `WINDOW_PATTERN` | "SSSL" | Pattern de atención |

## 7.Estado

| Aspecto | Estado |
|---------|--------|
| Baseline nanochat | ✅ Funcional |
| Agente autónomo (Claude/Codex) | 🔜 Configurar |
| Plataforma GPU | ⚠️ Requiere NVIDIA GPU |
| Forks existentes | ✅ MacOS, MLX, Windows RTX |

## 8. Acciones Pendientes

- [ ] Configurar uv y dependencias
- [ ] Correr `prepare.py` (descarga datos + entrena tokenizer)
- [ ] Correr `train.py` manualmente para validar setup
- [ ] Configurar agente (Codex/Claude) con `program.md`
- [ ] Dejar corriendo overnight

## 9. TOGAF

- **Visión:** Pipeline de investigación autónoma para LLMs
- **Dominio:** ML Research / Autonomous AI
- **Arquitectura:** Single-file training loop + Markdown prompts
- **Stakeholder:** SWAL Labs (Bel)

---

*Actualizado: 2026-03-25 por GitCore Monitor*
