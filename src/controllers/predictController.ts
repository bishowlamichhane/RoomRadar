import { predictRent, type PredictInput } from "@/lib/ml/predict";

export function predict(input: PredictInput) {
  return { predictedRent: predictRent(input) };
}
