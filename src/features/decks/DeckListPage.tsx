export function DeckListPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <h1
        className="text-[23px] font-semibold"
        style={{
          color: "var(--color-charcoal-primary)",
          letterSpacing: "var(--tracking-heading)",
        }}
      >
        My Decks
      </h1>
      <p
        className="mt-4 text-[15px]"
        style={{ color: "var(--color-ash)" }}
      >
        Your flashcard decks will appear here.
      </p>
    </main>
  );
}
