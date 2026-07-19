// Simplified SM-2 spaced-repetition scheduler (Anki-style grading: Again/Hard/Good/Easy).

const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

function gradeCard(srs, grade) {
  let { ef = 2.5, interval = 0, reps = 0 } = srs || {};

  if (grade === GRADE.AGAIN) {
    reps = 0;
    interval = 0; // due again today, within-session relearning
    ef = Math.max(1.3, ef - 0.2);
  } else {
    reps += 1;
    if (grade === GRADE.HARD) {
      ef = Math.max(1.3, ef - 0.15);
      interval = reps === 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
    } else if (grade === GRADE.GOOD) {
      interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ef);
    } else if (grade === GRADE.EASY) {
      ef += 0.15;
      interval = reps === 1 ? 3 : reps === 2 ? 8 : Math.round(interval * ef * 1.3);
    }
  }

  const due = new Date();
  if (grade === GRADE.AGAIN) {
    due.setMinutes(due.getMinutes() + 10); // reappear soon in the same/next session
  } else {
    due.setDate(due.getDate() + interval);
  }

  return { ef, interval, reps, due: due.toISOString(), lastResult: grade };
}

function isDue(srs) {
  if (!srs || !srs.due) return true;
  return new Date(srs.due).getTime() <= Date.now();
}
