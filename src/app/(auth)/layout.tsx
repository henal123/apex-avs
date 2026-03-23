export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_oklch(0.15_0.02_270)_0%,_oklch(0.11_0.005_270)_70%)] flex items-center justify-center">
      <div className="fixed inset-0 bg-[linear-gradient(oklch(1_0_0/3%)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/3%)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extralight tracking-tight">
            Apex VisionX Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-Powered Ad Creative Generation
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
