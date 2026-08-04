# Expense Category seed set and lifecycle

MVP ships a fixed flat seed list of Expense Categories (Russian UI names) plus user-defined Categories under one domain concept. Seed names are not user-renamable so automatic classification and UI stay stable; non-fallback seed may only be Hidden/Unhidden; «Прочее» is the System fallback Category (never renamed, hidden, or deleted). User-defined Categories support create, rename, Hide/Unhide, and hard-delete only when no committed Expense references them. Automatic mapping (photo/voice) chooses only among the user's visible Categories and otherwise assigns the System fallback — it never creates Categories. Display order: seed in the fixed list order below, then user-defined A–Я; no user reordering in MVP.

## Seed list (display names)

1. Продукты  
2. Кафе и рестораны  
3. Транспорт  
4. Жильё и ЖКХ  
5. Связь и интернет  
6. Здоровье  
7. Одежда и обувь  
8. Развлечения  
9. Подписки  
10. Образование  
11. Путешествия  
12. Подарки  
13. Прочее (System fallback)

## Considered options

- **Wider seed or food merged into one «Еда»** — rejected: medium list balances coverage and picker/LLM confusion; split groceries vs dining is useful for personal tracking.
- **LLM may create or suggest new Categories** — rejected for MVP: noise and duplicates; user creates labels deliberately.
- **Hard-delete seed / rename seed** — rejected: breaks stable seed contract and fallback semantics.
- **Hide reassigns Expenses to «Прочее»** — rejected: would destroy historical classification.
