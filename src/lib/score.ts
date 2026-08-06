import { formatMoodListLang, getSeason, seasonLabel, type MoodId } from '@/lib/moods';
import { genreLabel } from '@/lib/genres';
import type { Book, ScoredBook } from '@/lib/types';

export interface ScoreContext {
	moods: MoodId[];
	genre?: string | null;
	today?: Date;
	/** Your top Elo-ranked read books (src/lib/elo.ts, built from head-to-head
	 * comparisons in ComparePage.tsx) — a candidate that resembles one of
	 * these gets a "resembles X, one of your favorites" bonus. Independent of
	 * `moods`/`genre`: this is *implicit* taste signal, not something you
	 * explicitly asked for this search, so a match here never sets
	 * `hasSignal` on its own the way a real mood/genre match does. */
	favorites?: Book[];
}

interface Scored extends ScoredBook {
	hasSignal: boolean;
}

/** Best-matching favorite for a candidate, if any clears the bar — same-author
 * is treated as the strongest possible signal (a reader who loved one book by
 * someone is a very safe bet for another), otherwise 2+ shared moods.
 * Deliberately does NOT accept "1 shared mood + same genre" — this exact
 * shortcut was already tried and reverted once before (the old Open-Library-
 * era version of this feature), for the same reason it's wrong here: genre
 * is a coarse bucket, so 1 loosely-shared mood plus matching genre keeps
 * producing "resembles X" claims for books that plainly don't (confirmed
 * live: Solaris claimed to resemble Station Eleven off exactly this
 * combination — both "Sci-Fi", one shared mood, otherwise unrelated books).
 * Only the single best match counts, so a candidate can't stack bonuses from
 * several loosely-related favorites. */
function bestFavoriteMatch(book: Book, favorites: Book[]): { favorite: Book; bonus: number } | null {
	let best: { favorite: Book; bonus: number } | null = null;
	for (const favorite of favorites) {
		if (favorite.id === book.id) continue;
		const sharedMoods = book.moods.filter(m => favorite.moods.includes(m)).length;
		const sameAuthor = book.author.toLowerCase() === favorite.author.toLowerCase();

		let bonus = 0;
		if (sameAuthor) bonus = 20;
		else if (sharedMoods >= 2) bonus = 12;

		if (bonus > 0 && (!best || bonus > best.bonus)) best = { favorite, bonus };
	}
	return best;
}

function scoreBook(book: Book, ctx: ScoreContext): Scored {
	const today = ctx.today ?? new Date();
	const season = getSeason(today);
	let score = 42;
	const reasons: string[] = [];
	let hasSignal = false;

	const matchedMoods = ctx.moods.filter(m => book.moods.includes(m));
	if (matchedMoods.length > 0) {
		score += matchedMoods.length * 13;
		reasons.push(`You wanted something ${formatMoodListLang(matchedMoods, 'en')}`);
		hasSignal = true;
	}

	const favoriteMatch = ctx.favorites?.length ? bestFavoriteMatch(book, ctx.favorites) : null;
	if (favoriteMatch) {
		score += favoriteMatch.bonus;
		reasons.push(`Resembles "${favoriteMatch.favorite.title}", one of your favorites`);
	}

	const genreMatched = !!ctx.genre && book.genre === ctx.genre;
	if (genreMatched) {
		score += 18;
		reasons.push(`It's ${genreLabel(ctx.genre!, 'en').toLowerCase()}, as requested`);
		hasSignal = true;
	} else if (book.genre && book.genre !== 'Unclassified') {
		// Not a scoring bonus — the genre wasn't what was asked for, or nothing
		// was asked — but "why this" reading as a single bare mood match is
		// thin. Stating the genre as plain context costs nothing and gives the
		// panel something to say even when only one real signal fired.
		reasons.push(`It's ${genreLabel(book.genre, 'en').toLowerCase()}`);
	}

	if (book.season === season) {
		score += 15;
		reasons.push(`It's ${seasonLabel(season, 'en')}, based on today's date`);
	}

	// "Only X pages" only means something as a *bonus* if X is genuinely
	// short — but the page count itself is always worth stating as context.
	if (book.pages != null) {
		if (book.pages < 300) {
			score += 8;
			reasons.push(`Only ${book.pages} pages`);
		} else {
			reasons.push(`${book.pages} pages`);
		}
	}

	return { book, score: Math.max(20, Math.min(98, score)), reasons, hasSignal };
}

/**
 * Only strictly-unread books are ever candidates — "read" books exist
 * purely to supply the favorites/taste signal, never to be recommended
 * back to you. `books` may mix your own library with externally-discovered
 * titles (see src/lib/externalBooks.ts); both are scored identically.
 *
 * When the caller actually asked for something specific (a mood or a
 * genre), a book with none of those signals — score built entirely from the
 * flat baseline plus a page-count bonus — isn't really an answer to the
 * question, even if nothing else scored higher. Those get dropped unless
 * literally nothing has any signal at all, so "no candidates" beats "a
 * random unrelated book presented with full confidence."
 */
export function rankBooks(books: Book[], ctx: ScoreContext, limit = 3): ScoredBook[] {
	const candidates = books.filter(b => b.status === 'unread');

	const scored = candidates.map(b => scoreBook(b, ctx));

	const asked = ctx.moods.length > 0 || !!ctx.genre;
	const anySignal = scored.some(s => s.hasSignal);
	const pool = asked && anySignal ? scored.filter(s => s.hasSignal) : scored;

	// Nothing at all matched what was asked for — cap the score (used for
	// sorting only, not displayed) so a real match always outranks a
	// fallback pick if one exists elsewhere in the pool, without needing a
	// user-facing disclaimer to say so.
	if (asked && !anySignal) {
		for (const s of pool) {
			s.score = Math.min(s.score, 55)
		}
	}

	return pool.sort((a, b) => b.score - a.score).slice(0, limit);
}
