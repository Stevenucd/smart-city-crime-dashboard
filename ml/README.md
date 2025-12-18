# ML (Model Training)

这个目录用于离线训练/评估犯罪预测模型（例如：按月/按区域的案件数预测、某类案件概率等），训练产物可供后端/前端集成使用。

## 目录结构

- `ml/train.py`：训练入口脚本（读取 CSV，训练一个可用的 baseline 模型并输出产物）
- `ml/requirements.txt`：训练所需依赖（建议与后端分开安装）
- `ml/data/`：放训练数据（建议不要提交大文件）
- `ml/artifacts/`：训练输出（模型文件、指标、特征列表等；默认不提交）

## 快速开始

1) 创建虚拟环境并安装依赖

```bash
python -m venv .venv-ml
source .venv-ml/bin/activate
pip install -r ml/requirements.txt
```

2) 准备数据（CSV）

- 放到 `ml/data/`，例如 `ml/data/crime.csv`
- 至少包含一个目标列（例如 `target`），其他列将作为特征使用

3) 训练

```bash
python ml/train.py --data ml/data/crime.csv --target target
```

训练输出会写到 `ml/artifacts/<timestamp>/`。

## 约定

- 数据文件、训练产物默认都不提交（见根目录 `.gitignore`）。
- 后续如果要与后端对接，建议固定输出文件名（例如 `model.joblib` + `metadata.json`），并在后端加载。

