import RegisterForm from "./RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="max-w-lg mx-auto px-5 py-14">
      <div className="rounded-3xl bg-white border border-black/5 shadow-[0_16px_40px_rgba(23,26,28,0.1)] p-8 md:p-10">
        <h1 className="font-display text-2xl font-semibold">
          Create your account
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-6">
          Already have one?{" "}
          <Link
            href="/login"
            className="text-[color:var(--color-primary)] font-semibold"
          >
            Log in
          </Link>
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}
