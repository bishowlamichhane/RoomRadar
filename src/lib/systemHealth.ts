import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import metrics from "@/lib/ml/metrics.json";

export type ModelHealth = {
  served: string;
  best: string;
  r2: number;
  mae: number;
  rmse: number;
  nTrain: number;
  nTest: number;
  lastTrainedAt: string | null;
  daysSinceTrained: number | null;
  comparison: { model: string; mae: number; rmse: number; r2: number }[];
  featureImportance: { feature: string; importance: number }[];
};

export type SystemHealth = {
  db: {
    status: "up" | "degraded" | "down";
    latencyMs: number;
    error?: string;
  };
  process: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  timestamps: {
    now: string;
  };
};

export async function getModelHealth(): Promise<ModelHealth> {
  const comparison = (metrics.comparison ?? []) as ModelHealth["comparison"];
  const best = comparison.reduce<ModelHealth["comparison"][number] | null>(
    (a, b) => (!a || b.r2 > a.r2 ? b : a),
    null,
  );

  // mtime of model.json = last trained timestamp
  let lastTrainedAt: string | null = null;
  let daysSinceTrained: number | null = null;
  try {
    const p = path.join(process.cwd(), "src", "lib", "ml", "model.json");
    const stat = fs.statSync(p);
    lastTrainedAt = stat.mtime.toISOString();
    const days = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    daysSinceTrained = Math.max(0, Math.round(days * 10) / 10);
  } catch {
    // model file missing — leave null
  }

  return {
    served: "Linear Regression",
    best: best?.model ?? "Gradient Boosting",
    r2: best?.r2 ?? 0.969,
    mae: best?.mae ?? 1807,
    rmse: best?.rmse ?? 2478,
    nTrain: (metrics as { n_train?: number }).n_train ?? 640,
    nTest: (metrics as { n_test?: number }).n_test ?? 160,
    lastTrainedAt,
    daysSinceTrained,
    comparison,
    featureImportance: (metrics.featureImportance ?? []).slice(0, 8),
  };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const start = performance.now();
  let dbStatus: SystemHealth["db"]["status"] = "up";
  let dbError: string | undefined;
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
  } catch (e) {
    dbStatus = "down";
    dbError = e instanceof Error ? e.message : "unknown";
  }
  const latencyMs = Math.round(performance.now() - start);
  if (dbStatus === "up" && latencyMs > 400) dbStatus = "degraded";

  const mem = process.memoryUsage();
  return {
    db: { status: dbStatus, latencyMs, error: dbError },
    process: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: `${process.platform} · ${process.arch}`,
      heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
      rssMB: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
    },
    timestamps: { now: new Date().toISOString() },
  };
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!d && !h) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}
