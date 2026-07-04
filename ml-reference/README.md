# ML reference (verified working)

`train.py` here is the EXACT script from docs/06, already test-run successfully.
It produced these metrics on an 800-row synthetic Valley dataset (seed=42):

- Linear Regression: MAE ~Rs 2,267 · RMSE ~2,947 · R² 0.956
- Random Forest:     MAE ~Rs 2,064 · RMSE ~2,831 · R² 0.960
- Gradient Boosting: MAE ~Rs 1,807 · RMSE ~2,478 · R² 0.969  (best)

`model.json.sample` and `metrics.json.sample` are real outputs — you can use them
as a fallback if Python won't run in your environment (rename to model.json / metrics.json
and drop into src/lib/ml/). But prefer running `train.py` fresh.

Claude Code: place train.py at `ml/train.py` in the project (docs/06). Then copy the
generated model.json + metrics.json into `src/lib/ml/`.
