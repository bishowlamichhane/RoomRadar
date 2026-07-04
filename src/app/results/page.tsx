import metrics from "@/lib/ml/metrics.json";
import ActualVsPredicted from "@/components/charts/ActualVsPredicted";
import FeatureImportance from "@/components/charts/FeatureImportance";
import { npr } from "@/lib/format";

export default function ResultsPage() {
  const comparison = metrics.comparison as {
    model: string;
    mae: number;
    rmse: number;
    r2: number;
  }[];
  const best = comparison.reduce((a, b) => (b.r2 > a.r2 ? b : a));

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="mb-8 max-w-3xl">
        <div className="mono">Result analysis</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold mt-1">
          Model comparison & feature drivers
        </h1>
        <p className="text-[color:var(--color-muted)] mt-2 leading-relaxed">
          We benchmarked three regressors on a held-out test split of the seeded
          Valley dataset. <strong>{best.model}</strong> reported the best test
          MAE at {npr(best.mae)}. Our web app serves the linear model for
          deterministic, dependency-free inference.
        </p>
      </div>

      {/* Comparison table */}
      <div className="card overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--color-canvas)] text-left">
            <tr>
              <Th>Model</Th>
              <Th>R²</Th>
              <Th>MAE (NPR)</Th>
              <Th>RMSE (NPR)</Th>
              <Th>Served?</Th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((c) => {
              const isBest = c.model === best.model;
              const isServed = c.model === "Linear Regression";
              return (
                <tr
                  key={c.model}
                  className={`border-t border-black/5 ${
                    isBest ? "bg-[color:var(--color-primary-tint)]/60" : ""
                  }`}
                >
                  <td className="p-4 font-medium">
                    {c.model} {isBest && <span className="text-[color:var(--color-primary)]">★</span>}
                  </td>
                  <td className="p-4">{c.r2}</td>
                  <td className="p-4">{npr(c.mae)}</td>
                  <td className="p-4">{npr(c.rmse)}</td>
                  <td className="p-4 text-xs text-[color:var(--color-muted)]">
                    {isServed ? "Yes (deterministic TS inference)" : "Reported"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold">
            Actual vs predicted rent
          </h2>
          <p className="text-xs text-[color:var(--color-muted)] mb-3">
            Each point is a test listing · dashed line = perfect prediction
          </p>
          <ActualVsPredicted data={metrics.actualVsPredicted} />
        </div>
        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold">
            Feature importance
          </h2>
          <p className="text-xs text-[color:var(--color-muted)] mb-3">
            What drives the predicted rent · top 10 features
          </p>
          <FeatureImportance data={metrics.featureImportance} />
        </div>
      </div>

      {/* Interpretation */}
      <div className="card p-6 mt-8 max-w-4xl">
        <div className="mono">Interpretation</div>
        <p className="text-[color:var(--color-ink)]/80 text-sm mt-2 leading-relaxed">
          Size (sqft) and room type dominate rent prediction, followed by
          location signals — city one-hots and the target-based{" "}
          <code>area_price_index</code> computed on the training split to avoid
          leakage. Amenity toggles (parking, attached bath, furnished) contribute
          smaller but stable effects. The linear served model reproduces the
          same feature importances in coefficient form, making the app&apos;s
          predictions fully deterministic and easy to audit.
        </p>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="p-4 text-[11px] uppercase tracking-wider text-[color:var(--color-muted)] font-medium">
      {children}
    </th>
  );
}
