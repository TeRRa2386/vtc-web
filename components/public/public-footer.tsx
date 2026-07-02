export function PublicFooter() {
  return (
    <footer className="border-t bg-card/70">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-black text-foreground">Vet Tech Companion</p>
          <p className="mt-1">© {new Date().getFullYear()} TeRRa Labs. Educational veterinary reference software.</p>
        </div>
      </div>
    </footer>
  );
}
