import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { NoteEditor } from "./NoteEditor";
import type { NoteModel } from "@shared/api/types";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

function renderEditor(
  props: Partial<Parameters<typeof NoteEditor>[0]> = {},
) {
  const onSubmit = vi.fn();
  render(
    <NoteEditor
      deckId="deck-001"
      onSubmit={onSubmit}
      {...props}
    />,
    { wrapper: createWrapper() },
  );
  return { onSubmit };
}

describe("NoteEditor — basic type", () => {
  it("renders front and back fields for basic type", () => {
    renderEditor({ initialNoteType: "basic" });
    expect(screen.getByLabelText(/front/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/back/i)).toBeInTheDocument();
  });

  it("shows validation error when front is empty", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "basic" });

    // type something in back, leave front empty
    await user.type(screen.getByLabelText(/back/i), "Answer");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/front is required/i)).toBeInTheDocument(),
    );
  });

  it("shows validation error when back is empty", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "basic" });

    await user.type(screen.getByLabelText(/front/i), "Question");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/back is required/i)).toBeInTheDocument(),
    );
  });

  it("calls onSubmit with correct payload for basic", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor({ initialNoteType: "basic" });

    await user.type(screen.getByLabelText(/front/i), "What is mitosis?");
    await user.type(screen.getByLabelText(/back/i), "Cell division");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        noteType: "basic",
        content: { front: "What is mitosis?", back: "Cell division" },
      }),
    );
  });
});

describe("NoteEditor — reversed type", () => {
  it("renders front and back fields for reversed type", () => {
    renderEditor({ initialNoteType: "reversed" });
    expect(screen.getByLabelText(/front/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/back/i)).toBeInTheDocument();
  });
});

describe("NoteEditor — cloze type", () => {
  it("renders a text field for cloze", () => {
    renderEditor({ initialNoteType: "cloze" });
    expect(screen.getByLabelText(/cloze text/i)).toBeInTheDocument();
  });

  it("shows hint text for cloze syntax", () => {
    renderEditor({ initialNoteType: "cloze" });
    expect(screen.getByText(/\{\{c1::/i)).toBeInTheDocument();
  });

  it("shows validation error when cloze text has no deletion marker", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "cloze" });

    fireEvent.change(screen.getByLabelText(/cloze text/i), {
      target: { value: "No cloze deletions here" },
    });
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/must contain at least one cloze deletion/i),
      ).toBeInTheDocument(),
    );
  });

  it("accepts valid cloze text", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor({ initialNoteType: "cloze" });

    // Use fireEvent.change to avoid userEvent special handling of { } characters
    fireEvent.change(screen.getByLabelText(/cloze text/i), {
      target: { value: "The {{c1::mitochondria}} is the powerhouse" },
    });

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        noteType: "cloze",
        content: { text: "The {{c1::mitochondria}} is the powerhouse" },
      }),
    );
  });
});

describe("NoteEditor — multiple-choice type", () => {
  it("renders question field and 4 initial options", () => {
    renderEditor({ initialNoteType: "multiple-choice" });
    expect(screen.getByLabelText(/question/i)).toBeInTheDocument();
    // There should be 4 option text inputs initially
    const optionInputs = screen.getAllByPlaceholderText(/option text/i);
    expect(optionInputs).toHaveLength(4);
  });

  it("allows adding a 5th option", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "multiple-choice" });

    const addBtn = screen.getByRole("button", { name: /add option/i });
    await user.click(addBtn);

    const optionInputs = screen.getAllByPlaceholderText(/option text/i);
    expect(optionInputs).toHaveLength(5);
  });

  it("disables adding a 6th option when at 5", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "multiple-choice" });

    const addBtn = screen.getByRole("button", { name: /add option/i });
    await user.click(addBtn);

    // Button should be disabled now
    expect(addBtn).toBeDisabled();
  });

  it("allows removing an option down to 4", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "multiple-choice" });

    // First add one so we can remove
    await user.click(screen.getByRole("button", { name: /add option/i }));

    const removeBtns = screen.getAllByRole("button", { name: /remove option/i });
    await user.click(removeBtns[0]);

    const optionInputs = screen.getAllByPlaceholderText(/option text/i);
    expect(optionInputs).toHaveLength(4);
  });

  it("disables remove button when at 4 options", () => {
    renderEditor({ initialNoteType: "multiple-choice" });
    const removeBtns = screen.getAllByRole("button", { name: /remove option/i });
    removeBtns.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("shows error when no correct option is selected", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "multiple-choice" });

    await user.type(screen.getByLabelText(/question/i), "What is 2+2?");
    const optionInputs = screen.getAllByPlaceholderText(/option text/i);
    await user.type(optionInputs[0], "3");
    await user.type(optionInputs[1], "4");
    await user.type(optionInputs[2], "5");
    await user.type(optionInputs[3], "6");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/at least one correct option/i),
      ).toBeInTheDocument(),
    );
  });

  it("calls onSubmit with correct MCQ payload when valid", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor({ initialNoteType: "multiple-choice" });

    await user.type(screen.getByLabelText(/question/i), "What is 2+2?");
    const optionInputs = screen.getAllByPlaceholderText(/option text/i);
    await user.type(optionInputs[0], "3");
    await user.type(optionInputs[1], "4");
    await user.type(optionInputs[2], "5");
    await user.type(optionInputs[3], "6");

    // Mark second option (index 1) as correct
    const correctCheckboxes = screen.getAllByRole("checkbox", { name: /mark as correct/i });
    await user.click(correctCheckboxes[1]);

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const call = onSubmit.mock.calls[0][0] as {
      noteType: string;
      content: {
        question: string;
        options: { key: string; text: string }[];
        correctOptionKeys: string[];
      };
    };
    expect(call.noteType).toBe("multiple-choice");
    expect(call.content.question).toBe("What is 2+2?");
    expect(call.content.options).toHaveLength(4);
    expect(call.content.correctOptionKeys).toHaveLength(1);
  });
});

describe("NoteEditor — free-text type", () => {
  it("renders prompt and expectedAnswer fields", () => {
    renderEditor({ initialNoteType: "free-text" });
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expected answer/i)).toBeInTheDocument();
  });

  it("shows validation error when prompt is empty", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "free-text" });

    await user.type(screen.getByLabelText(/expected answer/i), "Some answer");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/prompt is required/i)).toBeInTheDocument(),
    );
  });
});

describe("NoteEditor — type switching", () => {
  it("switches fields when note type selector changes", async () => {
    const user = userEvent.setup();
    renderEditor({ initialNoteType: "basic" });

    // Initially shows basic fields
    expect(screen.getByLabelText(/front/i)).toBeInTheDocument();

    // Switch to cloze
    const typeSelect = screen.getByRole("combobox", { name: /note type/i });
    await user.selectOptions(typeSelect, "cloze");

    expect(screen.queryByLabelText(/front/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/cloze text/i)).toBeInTheDocument();
  });
});

describe("NoteEditor — edit mode (initialNote provided)", () => {
  const existingNote: NoteModel = {
    id: "note-001",
    deckId: "deck-001",
    noteType: "basic",
    tags: ["bio"],
    content: { front: "Existing Q", back: "Existing A" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  it("pre-fills front and back from existing note", () => {
    renderEditor({ initialNote: existingNote });
    expect(screen.getByDisplayValue("Existing Q")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing A")).toBeInTheDocument();
  });
});
