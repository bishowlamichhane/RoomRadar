import crypto from "crypto";

// Swappable payment provider. Two modes:
//   mock    — no network, instant success with a generated ref. Default so the
//             demo runs without external services.
//   sandbox — signs the payload and returns a redirect URL to eSewa's ePay v2
//             UAT endpoint. Requires ESEWA_MERCHANT_CODE + ESEWA_SECRET_KEY.
//             Verification is done in the callback route.
//
// Only mock is exercised by default. Sandbox is left implementable behind the
// PAYMENT_MODE flag so the app never fails to start in a dev/demo env.

export type PaymentMode = "mock" | "sandbox";

export function paymentMode(): PaymentMode {
  const raw = (process.env.PAYMENT_MODE || "mock").toLowerCase();
  return raw === "sandbox" ? "sandbox" : "mock";
}

export type InitiateInput = {
  amount: number;
  bookingId: string;
};

export type InitiateResult =
  | {
      ok: true;
      mode: "mock";
      paymentRef: string;
    }
  | {
      ok: true;
      mode: "sandbox";
      paymentRef: string;
      redirectUrl: string;
      form: Record<string, string>;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Kick off a payment. In mock mode returns instant success — the caller
 * should immediately mark the booking as PAID with the returned ref.
 * In sandbox mode returns the eSewa redirect URL + form fields; the caller
 * should hand the seeker off there and wait for the callback.
 */
export async function initiatePayment(
  input: InitiateInput,
): Promise<InitiateResult> {
  const mode = paymentMode();
  if (mode === "mock") {
    return {
      ok: true,
      mode,
      paymentRef: `mock_${Date.now()}_${input.bookingId.slice(0, 6)}`,
    };
  }
  // Sandbox — eSewa ePay v2 UAT.
  const merchant = process.env.ESEWA_MERCHANT_CODE;
  const secret = process.env.ESEWA_SECRET_KEY;
  const base =
    process.env.ESEWA_UAT_BASE ||
    "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
  if (!merchant || !secret) {
    return { ok: false, error: "esewa_not_configured" };
  }
  const transactionUuid = `${input.bookingId}-${Date.now()}`;
  const productCode = merchant;
  const totalAmount = input.amount.toFixed(2);
  const taxAmount = "0";
  const productServiceCharge = "0";
  const productDeliveryCharge = "0";
  const successUrl = `${process.env.APP_URL || ""}/api/payments/esewa/callback?ref=${encodeURIComponent(transactionUuid)}`;
  const failureUrl = `${process.env.APP_URL || ""}/bookings?paymentFailed=1`;

  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const dataToSign = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64");

  return {
    ok: true,
    mode,
    paymentRef: transactionUuid,
    redirectUrl: base,
    form: {
      amount: input.amount.toString(),
      tax_amount: taxAmount,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: productCode,
      product_service_charge: productServiceCharge,
      product_delivery_charge: productDeliveryCharge,
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

/**
 * Verify a payment came back successfully. In mock mode every ref beginning
 * with "mock_" is trusted. In sandbox mode we'd re-hit eSewa's status API
 * — left as a stub because it needs the merchant creds and adds a network
 * dependency the demo doesn't need.
 */
export async function verifyPayment(
  paymentRef: string,
): Promise<{ ok: boolean; error?: string }> {
  const mode = paymentMode();
  if (mode === "mock") {
    return paymentRef.startsWith("mock_")
      ? { ok: true }
      : { ok: false, error: "invalid_ref" };
  }
  // Sandbox verify — placeholder. Real implementation would call
  // https://rc.esewa.com.np/api/epay/transaction/status/ with merchant+uuid+amount
  // and check the returned status string is "COMPLETE".
  return { ok: true };
}
