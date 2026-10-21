import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <div className="daymark text-[96px] text-paper-deep">404</div>
      <h1 className="mt-2 text-[28px]">This page does not exist.</h1>
      <p className="mt-2 text-[15px] text-muted">It may have moved. Head back to the plan.</p>
      <Link href="/plan" className="mt-6 inline-flex h-11 items-center rounded-[10px] bg-accent px-5 font-medium text-white hover:bg-accent-deep">See the plan</Link>
    </div>
  );
}