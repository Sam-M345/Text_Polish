# Handoff Template

> **IMPORTANT INSTRUCTIONS (for human or AI generating a new handoff):**
>
> 1.  **Create a brand-new Markdown file directly within the `SOP/` folder.**
> 2.  **Use a clear, descriptive name for the new file** (e.g., `Handoff-LoginBug-MobileLayout.md`).
>     _Do NOT include dates or times in the filename._
> 3.  _Never overwrite or rename existing hand-off documents._
> 4.  **Ensure all file paths listed below are clickable relative markdown links** (e.g., `[filename.ext](../path/to/filename.ext)`).

---

## 1 · Affected Files

List every file another developer must read or touch. _(The first entry, referring to this handoff document, should be plain text. Ensure all other paths are clickable relative links, e.g., `[text_to_display](../relative/path/to/file.ext)`). Add more rows as needed._

| Path                                                                            | Purpose                     |
| ------------------------------------------------------------------------------- | --------------------------- |
| [Name of this new handoff file.md] (plain text, no link for this item)          | This handoff document       |
| [`[file_in_root1.ext]`](../[file_in_root1.ext])                                 | Brief role / responsibility |
| [`[file_in_root2.ext]`](../[file_in_root2.ext])                                 | Brief role / responsibility |
| [`[folder/other_file1.ext]`](../[folder/other_file1.ext])                       | Brief role / responsibility |
| [`[another_folder/subfolder/file.ext]`](../[another_folder/subfolder/file.ext]) | Brief role / responsibility |
| ...                                                                             | ...                         |

---

## 2 · Problem Statement

Describe **what's wrong** and **why it matters**. Include:

- **Symptoms / error messages**
- **Expected vs. actual behaviour**
- **Business or user impact (severity & priority)**

---

## 3 · Reproduction Steps

Step-by-step guide to make the issue appear:

1. …
2. …
3. …

---

## 4 · Attempted Solutions & Findings

| Attempt | Key Changes Made | Outcome / Remaining Issue |
| ------- | ---------------- | ------------------------- |
| #1      | …                | …                         |
| #2      | …                | …                         |

> **Current blockers / unknowns:**
>
> - Technical constraints
> - Knowledge gaps
> - Resource limitations

---

## 5 · Developer Instructions

**Goal:** Identify the root cause and implement a sustainable fix.

1. Review the _Affected Files_ above.
2. Trace the execution path leading to the failure.
3. Propose and implement a solution (attach code snippets or PR link).
4. Document rationale, trade-offs, and potential side-effects.
5. Update tests / add new tests as needed.
6. Once complete, ensure the filled-out handoff document is made available as a downloadable file.

---

_End of template – duplicate and fill in for each new hand-off._

**Upon completion:**

Ask the 2nd-opinion expert:

            "Please read all attached files and then provide me with necessary information.

            it would be great if you can create a downloadable markdown file .md

    		Provide me  with a download link.

            Example:     Download the analysis (markdown)"
